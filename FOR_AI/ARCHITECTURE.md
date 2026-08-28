# Architecture

## Authority

`lib/scenario.ts` is the only owner of experimental time, phase, threat distance, social links, audio cue schedule, agent position/orientation, behavior, fear, and detection. Renderers and transports project that state; they do not invent experimental behavior.

```text
deterministic scenario evaluator
          │
          ├── 2D participant Canvas
          ├── Three.js/WebXR projection
          ├── HRTF audio synthesizer
          ├── bounded CSV logger
          └── VDO.Ninja scene broadcaster
                         │
                         └── top-down companion + bounded commands
```

## Runtime planes

- **Stimulus plane:** `lib/scenario.ts` returns schema-v3 snapshots from configuration, elapsed time, and session state.
- **Visual plane:** `ParticipantScene2D.tsx`, `XrScene.tsx`, and `TopdownScene.tsx` render only snapshot fields.
- **Audio plane:** `lib/spatial-audio.ts` consumes snapshot audio cues, creates HRTF panners at authoritative source positions, and updates the listener from the XR camera during immersion.
- **Control plane:** `StudyApp.tsx` owns start/pause/reset/configuration, the local clock, content acknowledgement, audio opt-in, bounded logging, and application of companion commands. In immersive WebXR, entry stages an idle scene; the right controller's A button starts or resumes, while either trigger pauses.
- **Transport plane:** `lib/scene-sync.ts` carries schema-v3 state and a small command allowlist via the vendored VDO.Ninja SDK.

## Scenario sequence

| Phase | Standard | Gentle | Behavior |
| --- | ---: | ---: | --- |
| Baseline | 0–8 s | 0–8 s | Six front-facing dyads meander, alternate talking/listening, and exchange friendly spatial tones; the 16 m shadow is participant-invisible. |
| Detected | 8–11 s | 8–11 s | Agents detect at different delays; alarm crosses dyads. |
| Approach | 11–23 s | 11–29 s | Threat looms and fades in monotonically with proximity; agents startle and take varied avoidance paths. |
| Hold | 23–27 s | 29–33 s | Threat remains at 1.8 m; agents freeze at displaced positions. |
| Complete | 27 s onward | 33 s onward | Trial can reset or loop. |

The 1.8 m threat constraint is authoritative but intentionally invisible in the immersive renderer: VR contains neither a boundary ring nor an instructional warning billboard.

## Synchronization contract

- Snapshot schema: `3`, including twelve agents and threat visibility.
- VDO envelope: version `1`, newest-state semantics, at most 20 Hz plus heartbeat.
- Discovery room/channel: v3 names, separating incompatible earlier clients.
- Companion commands: start, pause, resume, reset, set threat, and set intensity.
- A command is acknowledged only when its ID returns in a host-authored snapshot.
- No microphone, camera, media track, headset pose, participant name, or physiology is transmitted.

## Audio contract

- Audio never starts without a participant/operator click.
- Panning model is Web Audio `HRTF`; distance model is inverse.
- The listener is fixed at the scene origin in 2D and updated from the immersive camera in XR.
- Dialogue semantics are fixed captions. Baseline friendly cues use gentle envelopes, moderate roots, and project-authored tones at 1:1, 5:4, and 3:2 ratios. This operationalization is motivated by acoustic-affect and consonance research but is not a universal or independently validated friendliness code.
- Threat roughness uses a 70 Hz amplitude modulator over low audible carriers. Distance attenuation is owned by the panner, so approach changes the perceived source consistently with position.
- A master gain and compressor limit digital output, but the application cannot guarantee sound-pressure level; physical calibration is mandatory.

## Extension seams

- Human GLB assets can replace procedural meshes without changing scenario state.
- Recorded speech can replace synthesis while preserving cue IDs, timing, text, and source coordinates.
- An institution-operated authenticated signaling adapter can replace the public VDO.Ninja discovery boundary.
- Conditions can be added only by extending the versioned configuration and updating transport validation, logs, tests, and this folder together.
