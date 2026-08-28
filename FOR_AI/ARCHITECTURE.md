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
                         ⇅
              PC operator state viewport
              + allowlisted commands/receipts
```

## Runtime planes

- **Stimulus plane:** `lib/scenario.ts` returns schema-v4 snapshots from configuration, elapsed time, and session state.
- **Visual plane:** `ParticipantScene2D.tsx`, `XrScene.tsx`, and `TopdownScene.tsx` render only snapshot fields. `lib/facial-expression.ts` is renderer-neutral visual geometry: it projects authoritative `expression` and continuous `fear` into shared SVG paths without inventing scenario timing.
- **Audio plane:** `lib/spatial-audio.ts` can consume snapshot audio cues and create HRTF panners at authoritative source positions only after an explicit 2D opt-in. The application does not attach that engine to an active immersive session.
- **Control plane:** `StudyApp.tsx` owns direct 2D/immersive start, pause/reset/configuration, the authoritative clock accumulator, audio opt-in, bounded logging, and application of operator commands. Window animation frames advance time outside XR; while an immersive session is presenting, `XrScene.tsx` supplies XR animation-frame timestamps to the same accumulator so a suspended browser-window loop cannot freeze the scenario. WebXR entry starts or continues the trial from a trusted local click; right-controller A restarts/resumes and either trigger pauses.
- **Asset plane:** On an XR-capable browser—or after an explicit browser-preview request—`XrScene.tsx` loads the local Cesium Man and Huntsman Spider GLBs in the background, retaining procedural agents/spider as immediate fallbacks. A non-WebGL 2D browser never has to mount the renderer. `agentStyle` and threat identity remain snapshot state rather than renderer-private choices. The project-authored face library is source geometry, not an external raster/model asset.
- **Transport plane:** `lib/scene-sync.ts` carries schema-v4 scene state inside a version-2 envelope with host runtime readback, bounded receipts, and a strict command allowlist via the vendored VDO.Ninja SDK. Normal participant start begins broadcast; the dedicated `?view=headset` role begins hosting on entry; PC operator mode auto-starts discovery.

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

- Snapshot schema: `4`, including twelve agents, avatar style, three threat kinds, and threat visibility.
- VDO envelope/commands: version `2`, newest-state semantics, at most 20 Hz plus heartbeat. The transport version can evolve independently without changing the scenario schema.
- Discovery room/channel: v2 transport-specific names, separating incompatible v1 peers.
- Operator commands: start, pause, resume, reset, set threat, set avatar style, set intensity, set visual mode, set loop, request VR/MR, and exit XR. IDs, modes, values, versions, and object keys are strictly validated.
- Each host frame includes page visibility, participant/headset role, XR support and engine readiness, XR lifecycle phase, active/requested mode, aggregate XR frame count, and at most 16 command receipts. Receipt status is pending, confirmed, rejected, or failed and is keyed to the exact request ID/action.
- A timeout in the PC UI marks a command late; it does not convert an absent receipt into success or discard the request before later reconciliation. A returned historical command ID is not an authoritative acknowledgement.
- The PC top-down/3D views reconstruct only the latest accepted authoritative snapshot. They are not framebuffer, video, controller-pose, or headset-pose mirrors.
- No microphone, camera, media track, controller pose, headset pose, participant name, or physiology is transmitted.

## WebXR lifecycle contract

- Direct headset entry calls `requestSession()` synchronously from the local control's trusted activation. A remote `request-xr` command can only move runtime phase to `awaiting-local-confirmation` and display headset **Confirm**/**Dismiss** controls; the confirm click performs session entry. Rejection and failure return explicit receipts.
- Session setup requires `local-floor`. It requests `layers` optionally for browsers/compositors that expose projection layers, and requests `dom-overlay` optionally for passthrough MR. Failure after session creation ends the orphaned session before surfacing an error.
- An in-flight guard prevents concurrent entry requests. Runtime phases distinguish inline, awaiting local confirmation, entering, active, exiting, and error.
- When immersive presentation begins, XR animation frames become clock authority and increment the aggregate frame readback. On session end, the window loop resumes from the shared last-frame timestamp without resetting elapsed scenario time.

## Audio contract

- Audio is off by default and never starts without a participant click. No persisted or operator-controlled audio preference exists.
- Every VR/MR entry clears the enabled state and closes any existing Web Audio graph synchronously before `requestSession()`; immersive operation remains silent even when the same Quest Browser tab previously enabled 2D audio.
- Panning model is Web Audio `HRTF`; distance model is inverse.
- The optional audio listener is fixed at the scene origin in 2D. It is not updated from or attached to the immersive camera.
- Dialogue semantics are fixed captions. Baseline friendly cues use gentle envelopes, moderate roots, and project-authored tones at 1:1, 5:4, and 3:2 ratios. This operationalization is motivated by acoustic-affect and consonance research but is not a universal or independently validated friendliness code.
- Threat synthesis uses 47 and 83 Hz amplitude modulation within the roughness regime described by Arnal et al., low inharmonic carriers, deterministic band-limited noise, and accelerating low pulses. The spider adds brief synthetic clicks. Distance attenuation is owned by the HRTF panner, so source salience increases with approach.
- A master gain and compressor limit digital output, but the application cannot guarantee sound-pressure level; physical calibration is mandatory.

## Facial-expression contract

- `lib/facial-expression.ts` owns normalized facial geometry only. `lib/scenario.ts` remains the owner of facial state through each agent's categorical `expression` and continuous `fear` value.
- The base library contains neutral, happiness, sadness, fear, anger, surprise, and disgust. Every eyebrow, eye, pupil, nose, and mouth path has identical cubic-Bézier topology across states, so any state pair can interpolate without path re-segmentation; normalized weighted blends support exploratory compound geometry.
- Scenario rendering uses continuous stages: low-intensity neutral→happiness for `calm`, that calm geometry→surprise for `alert`, surprise→fear for `afraid`, and the anger end state for `angry`. Transition progress is derived deterministically from authoritative fear rather than renderer-local clocks.
- Canvas 2D draws the interpolated SVG paths directly. Three.js paints the same paths into a transparent equirectangular `CanvasTexture` on a radius-0.344 spherical shell over the radius-0.34 head. The mapping uses longitude/latitude, with local +Z centered at Three.js `SphereGeometry` coordinate `u = 0.25`; no face plane remains.
- FACS action-unit patterns and recognition studies motivate feature directions and region emphasis. They do not validate the exact stylization, intensity, transition path, cultural interpretation, crowd viewing distance, or 2D/XR implementation.

## Extension seams

- Other human GLB assets can replace Cesium Man without changing scenario behavior, but asset identity must remain fixed per condition and documented.
- Recorded speech can replace synthesis while preserving cue IDs, timing, text, and source coordinates.
- An institution-operated authenticated signaling adapter can replace the public VDO.Ninja discovery boundary.
- Conditions can be added only by extending the versioned configuration and updating transport validation, logs, tests, and this folder together.
