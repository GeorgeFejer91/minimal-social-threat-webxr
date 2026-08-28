import type { AudioCue, SceneSnapshot } from "./scenario";

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

function cueHeight(cue: AudioCue) {
  return cue.sourceId === "threat" ? 1.55 : 1.42;
}

export class SpatialAudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private active = new Map<string, PannerNode>();
  private seen = new Set<string>();
  private lastSession = "";
  private lastElapsedMs = 0;

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
      for (const panner of this.active.values()) panner.disconnect();
      this.active.clear();
      this.seen.clear();
      this.lastSession = snapshot.sessionId;
    }
    this.lastElapsedMs = snapshot.elapsedMs;

    for (const cue of snapshot.audioCues) {
      const panner = this.active.get(cue.id);
      if (panner) setPannerPosition(panner, cue.x, cueHeight(cue), cue.z);
      else if (!snapshot.paused && !this.seen.has(cue.id)) this.play(cue, snapshot.elapsedMs);
    }
  }

  private play(cue: AudioCue, elapsedMs: number) {
    const context = this.context!;
    const master = this.master!;
    const remainingSeconds = Math.max(0.12, (cue.durationMs - Math.max(0, elapsedMs - cue.startedAtMs)) / 1_000);
    const now = context.currentTime;
    const stopAt = now + remainingSeconds;
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1.15;
    panner.maxDistance = 24;
    panner.rolloffFactor = 0.78;
    panner.coneInnerAngle = 130;
    panner.coneOuterAngle = 260;
    panner.coneOuterGain = 0.35;
    setPannerPosition(panner, cue.x, cueHeight(cue), cue.z);
    panner.connect(master);

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.015, cue.gain), now + Math.min(0.09, remainingSeconds * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, Math.max(now + 0.11, stopAt - 0.025));
    envelope.connect(panner);

    if (cue.kind === "roughness" || cue.kind === "spider-menace") this.makeMenacingThreat(envelope, cue, elapsedMs, now, stopAt);
    else if (cue.kind === "friendly") this.makeFriendlyCue(envelope, cue, now, stopAt);
    else this.makeVocalCue(envelope, cue, now, stopAt);

    this.seen.add(cue.id);
    this.active.set(cue.id, panner);
    window.setTimeout(() => {
      try { panner.disconnect(); } catch { /* already disconnected by reset/session change */ }
      this.active.delete(cue.id);
    }, Math.ceil((remainingSeconds + 0.08) * 1_000));
  }

  private makeFriendlyCue(destination: AudioNode, cue: AudioCue, start: number, stop: number) {
    const context = this.context!;
    const alternate = cue.sourceId.charCodeAt(cue.sourceId.length - 1) % 2 === 0;
    const root = alternate ? 240 : 220;

    // Smooth attacks, moderate pitch, and simple harmonic ratios are an explicit
    // study-motivated operationalization of positive/low-tension affect. They are
    // not treated as a universal or already validated "friendliness" label.
    for (const [ratio, amount] of [[1, 0.48], [5 / 4, 0.27], [3 / 2, 0.18]] as const) {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = ratio === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(root * ratio, start);
      oscillator.frequency.linearRampToValueAtTime(root * ratio * 1.045, stop);
      voiceGain.gain.value = amount;
      oscillator.connect(voiceGain).connect(destination);
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

  private makeMenacingThreat(destination: AudioNode, cue: AudioCue, elapsedMs: number, start: number, stop: number) {
    const context = this.context!;
    const amplitude = context.createGain();
    amplitude.gain.value = 0.48;
    amplitude.connect(destination);

    // Rough amplitude modulation sits inside the 30–150 Hz regime reported for
    // screams and alarm signals by Arnal et al. (2015). The inharmonic carriers,
    // slow pulse acceleration, and source-level HRTF motion are hypotheses to
    // pilot, not a claim that this composite is already a validated stimulus.
    for (const [rate, depth] of [[47, 0.17], [83, 0.12]] as const) {
      const modulator = context.createOscillator();
      const modulationDepth = context.createGain();
      modulator.frequency.value = rate;
      modulationDepth.gain.value = depth;
      modulator.connect(modulationDepth).connect(amplitude.gain);
      modulator.start(start);
      modulator.stop(stop);
    }

    for (const [frequency, amount] of [[61, 0.34], [97, 0.20], [151, 0.12], [233, 0.07]] as const) {
      const carrier = context.createOscillator();
      const carrierGain = context.createGain();
      carrier.type = frequency === 61 ? "sawtooth" : "triangle";
      carrier.frequency.setValueAtTime(frequency, start);
      carrier.frequency.exponentialRampToValueAtTime(frequency * 0.86, stop);
      carrierGain.gain.value = amount;
      carrier.connect(carrierGain).connect(amplitude);
      carrier.start(start);
      carrier.stop(stop);
    }

    const noiseLength = Math.max(1, Math.round(context.sampleRate * 0.73));
    const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    let seed = cue.kind === "spider-menace" ? 0x51f15e : 0x7a11d;
    for (let index = 0; index < noise.length; index += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      noise[index] = (seed / 0xffffffff) * 2 - 1;
    }
    const noiseSource = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = cue.kind === "spider-menace" ? 1_950 : 330;
    noiseFilter.Q.value = cue.kind === "spider-menace" ? 1.8 : 0.72;
    noiseGain.gain.value = cue.kind === "spider-menace" ? 0.075 : 0.045;
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(amplitude);
    noiseSource.start(start);
    noiseSource.stop(stop);

    const totalSeconds = Math.max(0.5, cue.durationMs / 1_000);
    const offsetSeconds = Math.max(0, (elapsedMs - cue.startedAtMs) / 1_000);
    let localTime = 0;
    while (start + localTime < stop - 0.08) {
      const progress = Math.min(1, (offsetSeconds + localTime) / totalSeconds);
      const pulseStart = start + localTime;
      const pulseEnd = Math.min(stop, pulseStart + 0.42);
      const pulseGain = context.createGain();
      pulseGain.gain.setValueAtTime(0.0001, pulseStart);
      pulseGain.gain.exponentialRampToValueAtTime(0.16 + progress * 0.11, pulseStart + 0.018);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, pulseEnd);
      pulseGain.connect(destination);
      const pulse = context.createOscillator();
      pulse.type = "sine";
      pulse.frequency.setValueAtTime(cue.kind === "spider-menace" ? 57 : 49, pulseStart);
      pulse.frequency.exponentialRampToValueAtTime(29, pulseEnd);
      pulse.connect(pulseGain);
      pulse.start(pulseStart);
      pulse.stop(pulseEnd);

      if (cue.kind === "spider-menace") {
        for (let click = 0; click < 3; click += 1) {
          const clickStart = pulseStart + 0.055 + click * 0.047;
          if (clickStart >= stop - 0.02) break;
          const clickGain = context.createGain();
          clickGain.gain.setValueAtTime(0.0001, clickStart);
          clickGain.gain.exponentialRampToValueAtTime(0.035 + progress * 0.025, clickStart + 0.004);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, clickStart + 0.032);
          clickGain.connect(destination);
          const clickOscillator = context.createOscillator();
          clickOscillator.type = "square";
          clickOscillator.frequency.value = 760 + click * 287;
          clickOscillator.connect(clickGain);
          clickOscillator.start(clickStart);
          clickOscillator.stop(clickStart + 0.035);
        }
      }
      localTime += 1.72 - progress * 1.16;
    }
  }

  async dispose() {
    const context = this.context;
    this.active.clear();
    this.seen.clear();
    this.context = undefined;
    this.master = undefined;
    if (context && context.state !== "closed") await context.close();
  }
}
