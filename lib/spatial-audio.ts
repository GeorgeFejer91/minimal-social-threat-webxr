import type { AudioCue, SceneSnapshot } from "./scenario";
import {
  TAFFOU_ROUGHNESS_PROFILE,
  dbToLinear,
  ppsBurstEnvelopeAt,
  propagationDelaySeconds,
  threatDistanceGain,
} from "./threat-audio-protocol.ts";

type LegacyAudioParam = AudioParam & { setValueAtTime(value: number, startTime: number): AudioParam };
type LegacyAudioListener = AudioListener & {
  setPosition?(x: number, y: number, z: number): void;
  setOrientation?(forwardX: number, forwardY: number, forwardZ: number, upX: number, upY: number, upZ: number): void;
};

function setParam(param: AudioParam | undefined, value: number, at: number) {
  (param as LegacyAudioParam | undefined)?.setValueAtTime(value, at);
}

function setPannerPosition(panner: PannerNode, x: number, y: number, z: number) {
  if (panner.positionX) {
    const at = panner.context.currentTime;
    setParam(panner.positionX, x, at);
    setParam(panner.positionY, y, at);
    setParam(panner.positionZ, z, at);
  } else panner.setPosition(x, y, z);
}

interface ActiveCueGraph {
  panner: PannerNode;
  distanceGain?: GainNode;
  propagationDelay?: DelayNode;
  disconnect: AudioNode[];
}

function deterministicGaussian(sampleIndex: number, seed: number) {
  const uniform = (index: number, salt: number) => {
    let value = Math.imul(index ^ salt, 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value ^= value >>> 16;
    return ((value >>> 0) + 1) / 0x1_0000_0001;
  };
  const first = uniform(sampleIndex, seed);
  const second = uniform(sampleIndex, seed ^ 0x9e3779b9);
  return Math.max(-1, Math.min(1, Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second) / 3));
}

export class SpatialAudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private active = new Map<string, ActiveCueGraph>();
  private seen = new Set<string>();
  private lastSession = "";
  private lastElapsedMs = 0;
  private paused = false;

  get enabled() {
    return Boolean(this.context && this.context.state !== "closed");
  }

  async enable() {
    if (!this.context) {
      const AudioContextType = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextType) throw new Error("Spatial audio is not available in this browser.");
      const context = new AudioContextType({ latencyHint: "interactive" });
      const master = context.createGain();
      master.gain.value = 0.24;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.knee.value = 8;
      limiter.ratio.value = 10;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.18;
      master.connect(limiter).connect(context.destination);
      this.context = context;
      this.master = master;
      this.setListenerPose(0, 1.6, 0, 0, 0, -1, 0, 1, 0);
    }
    await this.context.resume();
  }

  setListenerPose(
    x: number,
    y: number,
    z: number,
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX: number,
    upY: number,
    upZ: number,
  ) {
    const context = this.context;
    if (!context) return;
    const listener = context.listener as LegacyAudioListener;
    if (listener.positionX) {
      const at = context.currentTime;
      setParam(listener.positionX, x, at);
      setParam(listener.positionY, y, at);
      setParam(listener.positionZ, z, at);
      setParam(listener.forwardX, forwardX, at);
      setParam(listener.forwardY, forwardY, at);
      setParam(listener.forwardZ, forwardZ, at);
      setParam(listener.upX, upX, at);
      setParam(listener.upY, upY, at);
      setParam(listener.upZ, upZ, at);
    } else {
      listener.setPosition?.(x, y, z);
      listener.setOrientation?.(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }

  update(snapshot: SceneSnapshot) {
    const context = this.context;
    if (!context || !this.master || context.state !== "running") return;
    this.master.gain.setTargetAtTime(snapshot.paused || !snapshot.running ? 0.0001 : 0.24, context.currentTime, 0.018);
    if (snapshot.sessionId !== this.lastSession || snapshot.elapsedMs + 100 < this.lastElapsedMs) {
      this.clearActiveCues();
      this.seen.clear();
      this.lastSession = snapshot.sessionId;
    }
    if (snapshot.paused && !this.paused) {
      const interruptedCueIds = [...this.active.keys()];
      this.clearActiveCues();
      interruptedCueIds.forEach((id) => this.seen.delete(id));
    }
    this.paused = snapshot.paused;
    this.lastElapsedMs = snapshot.elapsedMs;

    for (const cue of snapshot.audioCues) {
      const active = this.active.get(cue.id);
      if (active) {
        setPannerPosition(active.panner, cue.x, cue.y, cue.z);
        if (cue.sourceId === "threat") this.updateThreatDistance(active, snapshot.threat.distance);
      } else if (!snapshot.paused && !this.seen.has(cue.id)) {
        this.play(cue, snapshot.elapsedMs, snapshot.threat.distance);
      }
    }
  }

  private updateThreatDistance(active: ActiveCueGraph, distanceM: number) {
    const context = this.context!;
    const at = context.currentTime;
    active.distanceGain?.gain.setTargetAtTime(threatDistanceGain(distanceM), at, 0.025);
    active.propagationDelay?.delayTime.setTargetAtTime(propagationDelaySeconds(distanceM), at, 0.025);
  }

  private clearActiveCues() {
    for (const active of this.active.values()) {
      for (const node of active.disconnect) {
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
    }
    this.active.clear();
  }

  private play(cue: AudioCue, elapsedMs: number, threatDistanceM: number) {
    const context = this.context!;
    const master = this.master!;
    const remainingSeconds = Math.max(0.12, (cue.durationMs - Math.max(0, elapsedMs - cue.startedAtMs)) / 1_000);
    const now = context.currentTime;
    const stopAt = now + remainingSeconds;
    const isThreat = cue.sourceId === "threat";
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = isThreat ? "linear" : "inverse";
    panner.refDistance = 1.15;
    panner.maxDistance = isThreat ? 32 : 24;
    panner.rolloffFactor = isThreat ? 0 : 0.78;
    panner.coneInnerAngle = isThreat ? 360 : 130;
    panner.coneOuterAngle = isThreat ? 360 : 260;
    panner.coneOuterGain = isThreat ? 1 : 0.35;
    setPannerPosition(panner, cue.x, cue.y, cue.z);
    panner.connect(master);

    const envelope = context.createGain();
    const attackSeconds = isThreat ? 0.018 : Math.min(0.09, remainingSeconds * 0.2);
    const releaseAt = Math.max(now + attackSeconds, stopAt - 0.025);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.015, cue.gain), now + attackSeconds);
    envelope.gain.setValueAtTime(Math.max(0.015, cue.gain), releaseAt);
    envelope.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    const active: ActiveCueGraph = { panner, disconnect: [panner, envelope] };
    if (isThreat) {
      const distanceGain = context.createGain();
      const propagationDelay = context.createDelay(0.08);
      distanceGain.gain.value = threatDistanceGain(threatDistanceM);
      propagationDelay.delayTime.value = propagationDelaySeconds(threatDistanceM);
      envelope.connect(distanceGain).connect(propagationDelay).connect(panner);
      active.distanceGain = distanceGain;
      active.propagationDelay = propagationDelay;
      active.disconnect.push(distanceGain, propagationDelay);
    } else {
      envelope.connect(panner);
    }

    if (cue.kind === "pps-looming-bursts") this.makePpsBurstTrain(envelope, cue, elapsedMs, now, stopAt);
    else if (cue.kind === "roughness" || cue.kind === "spider-menace") this.makeRoughThreat(envelope, now, stopAt);
    else if (cue.kind === "friendly" || cue.kind === "murmur" || cue.kind === "acknowledge") {
      this.makeFriendlyCue(envelope, cue, now, stopAt);
    }
    else this.makeVocalCue(envelope, cue, now, stopAt);

    this.seen.add(cue.id);
    this.active.set(cue.id, active);
    window.setTimeout(() => {
      if (this.active.get(cue.id) !== active) return;
      for (const node of active.disconnect) {
        try { node.disconnect(); } catch { /* already disconnected by reset/session change */ }
      }
      this.active.delete(cue.id);
    }, Math.ceil((remainingSeconds + 0.08) * 1_000));
  }

  private makeFriendlyCue(destination: AudioNode, cue: AudioCue, start: number, stop: number) {
    const context = this.context!;
    const alternate = cue.sourceId.charCodeAt(cue.sourceId.length - 1) % 2 === 0;
    const root = (alternate ? 232 : 214) * (cue.kind === "murmur" ? 0.9 : cue.kind === "acknowledge" ? 0.97 : 1);
    const contour = cue.kind === "murmur"
      ? [1, 1.018, 0.985]
      : cue.kind === "acknowledge"
        ? [1.035, 0.982, 1.002]
        : [1, 1.065, 1.026];
    const duration = Math.max(0.12, stop - start);
    const phraseGain = context.createGain();
    phraseGain.gain.setValueAtTime(0.0001, start);
    for (let syllable = 0; syllable < 3; syllable += 1) {
      const syllableStart = start + duration * (syllable * 0.31);
      const peak = Math.min(stop - 0.025, syllableStart + duration * 0.12);
      const release = Math.min(stop - 0.012, syllableStart + duration * 0.26);
      phraseGain.gain.linearRampToValueAtTime(syllable === 1 ? 0.82 : 0.7, peak);
      phraseGain.gain.linearRampToValueAtTime(0.22, release);
    }
    phraseGain.gain.linearRampToValueAtTime(0.0001, stop);
    phraseGain.connect(destination);

    // Smooth attacks, moderate pitch, consonant ratios, and speech-like pitch
    // contours are an explicit study-motivated low-tension prototype. They are
    // not treated as universal or already validated "friendliness" cues.
    for (const [ratio, amount] of [[1, 0.48], [5 / 4, 0.27], [3 / 2, 0.18]] as const) {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = ratio === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(root * ratio * contour[0], start);
      oscillator.frequency.linearRampToValueAtTime(root * ratio * contour[1], start + duration * 0.46);
      oscillator.frequency.linearRampToValueAtTime(root * ratio * contour[2], stop);
      voiceGain.gain.value = amount;
      oscillator.connect(voiceGain).connect(phraseGain);
      oscillator.start(start);
      oscillator.stop(stop);
    }
  }

  private makeVocalCue(destination: AudioNode, cue: AudioCue, start: number, stop: number) {
    const context = this.context!;
    const urgent = cue.kind === "warning" || cue.kind === "gasp";
    const base = cue.kind === "acknowledge" ? 142 : urgent ? 205 : 168;
    for (const [ratio, amount] of [[1, 0.52], [1.92, 0.23], [2.77, 0.12]] as const) {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = ratio === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(base * ratio, start);
      oscillator.frequency.linearRampToValueAtTime(base * ratio * (urgent ? 1.18 : 0.93), stop);
      voiceGain.gain.value = amount;
      oscillator.connect(voiceGain).connect(destination);
      oscillator.start(start);
      oscillator.stop(stop);
    }
  }

  private makePpsBurstTrain(destination: AudioNode, cue: AudioCue, elapsedMs: number, start: number, stop: number) {
    const context = this.context!;
    const duration = Math.max(0.001, stop - start);
    const sampleCount = Math.max(1, Math.ceil(duration * context.sampleRate));
    const offsetSeconds = Math.max(0, (elapsedMs - cue.startedAtMs) / 1_000);
    const offsetSamples = Math.round(offsetSeconds * context.sampleRate);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const timeFromCueStart = offsetSeconds + index / context.sampleRate;
      const burstEnvelope = ppsBurstEnvelopeAt(timeFromCueStart);
      channel[index] = deterministicGaussian(offsetSamples + index, 0x505053) * burstEnvelope;
    }
    const noiseSource = context.createBufferSource();
    const sourceGain = context.createGain();
    noiseSource.buffer = buffer;
    sourceGain.gain.value = 0.32;
    noiseSource.connect(sourceGain).connect(destination);
    noiseSource.start(start);
    noiseSource.stop(stop);
  }

  private makeRoughThreat(destination: AudioNode, start: number, stop: number) {
    const context = this.context!;
    const modulationGain = context.createGain();
    const levelAdjustment = dbToLinear(TAFFOU_ROUGHNESS_PROFILE.roughLevelAdjustmentDb);
    modulationGain.gain.value = levelAdjustment * 0.5;
    modulationGain.connect(destination);

    // Methods-derived reconstruction of the published three-second defensive
    // roughness stimulus. The paper reports the upper partials only as "around"
    // 0.25, so this remains a reconstruction requiring validation, not the
    // authors' original waveform.
    const modulator = context.createOscillator();
    const modulationDepth = context.createGain();
    modulator.type = "sine";
    modulator.frequency.value = TAFFOU_ROUGHNESS_PROFILE.modulationHz;
    modulationDepth.gain.value = levelAdjustment * 0.5 * TAFFOU_ROUGHNESS_PROFILE.modulationDepth;
    modulator.connect(modulationDepth).connect(modulationGain.gain);
    modulator.start(start);
    modulator.stop(stop);

    const amplitudeTotal = TAFFOU_ROUGHNESS_PROFILE.relativeAmplitudes.reduce((sum, value) => sum + value, 0);
    TAFFOU_ROUGHNESS_PROFILE.harmonicFrequenciesHz.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const partialGain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      partialGain.gain.value = TAFFOU_ROUGHNESS_PROFILE.relativeAmplitudes[index] / amplitudeTotal;
      oscillator.connect(partialGain).connect(modulationGain);
      oscillator.start(start);
      oscillator.stop(stop);
    });
  }

  async dispose() {
    const context = this.context;
    this.clearActiveCues();
    this.seen.clear();
    this.paused = false;
    this.context = undefined;
    this.master = undefined;
    if (context && context.state !== "closed") await context.close();
  }
}
