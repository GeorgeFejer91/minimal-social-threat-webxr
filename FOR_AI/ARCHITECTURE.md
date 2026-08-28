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

- **Stimulus plane:** `lib/scenario.ts` returns schema-v5 snapshots from configuration, elapsed time, and session state. `lib/threat-audio-protocol.ts` owns the immutable dry-source, level, delay, renderer, and reference-revision parameters reported in each snapshot.
- **Visual plane:** `ParticipantScene2D.tsx`, `XrScene.tsx`, and `TopdownScene.tsx` render only snapshot fields. The main Three.js renderer may prewarm in a 2×2 hidden host; when the 3D tab becomes visible, an explicit visibility transition resizes its camera and drawing buffer to the full stage immediately instead of relying only on a throttled `ResizeObserver`. `lib/facial-expression.ts` is renderer-neutral visual geometry: it projects authoritative `expression` and continuous `fear` into shared SVG paths without inventing scenario timing. `lib/forest-layout.ts` is shared deterministic scenery geometry; both participant renderers consume the same tree positions/species and preserve the tested threat corridor.
- **Audio plane:** `lib/spatial-audio.ts` constructs generated dry sources and places HRTF panners at authoritative 3D source positions. Threat height follows the visible kind (1.55 m shadow/angry agent; 0.42 m spider). A trusted local **Start preview** action starts the complete cue schedule for both main browser renderers with a fixed observer pose; reset/completion disposes it. Trusted local VR/MR entry starts Web Audio alongside the WebXR request, `XrScene.tsx` updates the listener from the immersive camera pose, and session exit disposes the graph.
- **Control plane:** `StudyApp.tsx` owns the main 2D/3D preview mode, local preview/immersive start, pause/reset/configuration, the authoritative clock accumulator, audio lifecycle, bounded logging, and application of operator commands. Window animation frames advance time outside XR; while an immersive session is presenting, `XrScene.tsx` supplies XR animation-frame timestamps to the same accumulator so a suspended browser-window loop cannot freeze the scenario. WebXR entry starts or continues the trial from a trusted local click; right-controller A restarts/resumes and either trigger pauses.
- **Asset plane:** On an XR-capable browser—or after an explicit browser-preview request—`XrScene.tsx` loads the local Cesium Man GLB in the background while procedural agents remain immediately available. The spider is always the project-authored articulated rig; the former unrigged Huntsman GLB is retained only for provenance/reference and is not requested at runtime. A non-WebGL 2D browser never has to mount the renderer. `agentStyle` and threat identity remain snapshot state rather than renderer-private choices. The project-authored face and spider-motion libraries are source geometry/motion, not external raster/model assets.
- **Transport plane:** `lib/scene-sync.ts` carries schema-v5 scene state inside a version-2 envelope with host runtime readback, bounded receipts, a strict audio-protocol identity, and a strict command allowlist via the vendored VDO.Ninja SDK. Normal participant start begins broadcast; the dedicated `?view=headset` role begins hosting on entry; PC operator mode auto-starts discovery.

## Scenario sequence

| Phase | Standard | Gentle | Behavior |
| --- | ---: | ---: | --- |
| Baseline | 0–8 s | 0–8 s | Six front-facing dyads meander, alternate talking/listening, and exchange friendly spatial tones; the 16 m shadow is participant-invisible. |
| Detected | 8–11 s | 8–11 s | Agents detect at different delays; alarm crosses dyads. |
| Approach | 11–23 s | 11–29 s | Threat looms and fades in monotonically with proximity; agents startle and take varied avoidance paths. |
| Hold | 23–27 s | 29–33 s | Threat remains at 1.8 m; agents freeze at displaced positions. |
| Complete | 27 s onward | 33 s onward | Trial can reset or loop. |

The 1.8 m threat constraint is authoritative but intentionally invisible in the immersive renderer: VR contains neither a boundary ring nor an instructional warning billboard.

## Forest corridor contract

- The virtual dusk environment uses the fixed `FOREST_TREES` layout; it is not regenerated per participant or frame.
- Every tree's full modeled canopy radius must clear the central ±2.4 m half-width lane. The lane contains the threat's lateral sway and the articulated spider's leg span with additional visual clearance.
- Trees may vary in species, tone, scale, and rotation without entering that lane. Additions must pass `tests/forest-layout.test.ts`.
- Canvas uses a perspective projection of the same layout. Three.js adds procedural trunks, branches, multi-cluster crowns or conifer tiers, root flares, shrubs, stones, a forest floor, path, and virtual-only fog. Tree parts are merged into material batches before entering the scene to keep draw-call pressure bounded. Passthrough hides the environment and fog.

## Synchronization contract

- Snapshot schema: `5`, including twelve agents, avatar style, three threat kinds, threat visibility, two separately scheduled threat-audio layers, and the exact compact audio-protocol identity.
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

## Website publication contract

- GitHub Pages is the only active website platform. `.openai/hosting.json` is intentionally absent. Do not use ChatGPT Sites as a mirror, preview, deployment target, or completion artifact unless the user explicitly changes this contract.
- The canonical source remote is `https://github.com/GeorgeFejer91/minimal-social-threat-webxr.git`; the canonical public runtime is `https://georgefejer91.github.io/minimal-social-threat-webxr/`.
- Any change to website source, runtime behavior, public assets, dependencies, build output, WebXR, transport, or deployment configuration is not complete until its validated source commit is pushed and that exact source revision is represented by a published `gh-pages` deployment.
- The repository currently uses GitHub Pages legacy branch publishing from the root of `gh-pages`. Consequently, pushing `main` does not by itself update the live application. Build `dist/client` with the repository base path, publish that output to `gh-pages`, and preserve a deploy commit message that names the source revision.
- Acceptance requires readback from the public HTTPS site after Pages reports `built`. Verify the landing page plus every directly affected route, such as `?view=trial`, `?view=headset`, or `?view=companion`; local preview evidence is supplementary.
- Never describe local-only, unpushed, queued, failed, or unverified website work as complete. Report it as **implemented locally; deployment pending** and state the blocker.

## Audio contract

- Audio is scoped to a locally started browser preview or active immersive session. It never starts from page load or a remote command. No persisted, operator-controlled, or participant-facing audio preference exists.
- **Start preview** calls `audioEngine.enable()` synchronously from its trusted local click, then starts/resumes the authoritative scenario. Both the 2D Canvas and main Three.js view consume the same scene snapshot and cue schedule. Pause silences active cues; reset/completion disposes the graph.
- `StudyApp.tsx` dispatches `requestSession()` first and starts Web Audio within the same unawaited trusted action. Once both are ready it feeds authoritative scene cues while `XrScene.tsx` updates the listener from the XR camera. Entry failure or session exit disposes that graph; returning to a browser preview requires another trusted local **Start preview** action before audio resumes.
- Panning uses the browser's non-individualized Web Audio `HRTF`. Ordinary agent cues retain inverse panner distance attenuation. Threat panners use zero rolloff so distance is not applied twice.
- `lib/threat-audio-protocol.ts` is the single parameter authority. The approach localizer adapts PPS Kit revision `1c7ea7aa505efbde61b24c1b0f5c943bd842edb2`: deterministic broadband noise, 30 ms bursts, 10 ms raised-cosine edges, 95 ms onset period, and 300 ms onset. It runs from approach start to endpoint and is a localization adaptation, not a validated threat inducer.
- The final three seconds add a methods-derived Taffou et al. roughness reconstruction: 500 Hz fundamental plus seven harmonics through 4 kHz, reported relative amplitudes of 1, 0.5, and approximately 0.25, full-depth 70 Hz amplitude modulation, and a −0.8 dB rough-level correction. The publication's approximate upper-harmonic values prevent an exact waveform claim.
- One manual level law owns threat proximity: linear in dB from −18 dB at 16 m to 0 dB at 1.8 m. A bounded delay node tracks `distance / 343 m/s`. These are relative digital parameters, not measured SPL or a reproduction of PPS Kit's SOFA/3DTI renderer.
- Pause disconnects active generated cues and makes them eligible for reconstruction from authoritative elapsed time on resume.
- Dialogue semantics are fixed captions. Baseline friendly cues use gentle envelopes, moderate roots, and project-authored tones at 1:1, 5:4, and 3:2 ratios. This operationalization is motivated by acoustic-affect and consonance research but is not a universal or independently validated friendliness code.
- The project ships no scream recording. IADS-E files are requester-bound/non-redistributable, and the stronger Morriss/IADS-2 derivative lacks a sufficiently clear asset-level redistribution chain for this repository.
- A master gain and compressor limit digital output, but the application cannot guarantee sound-pressure level; physical headphone/headset calibration remains mandatory.

## Facial-expression contract

- `lib/facial-expression.ts` owns normalized facial geometry only. `lib/scenario.ts` remains the owner of facial state through each agent's categorical `expression` and continuous `fear` value.
- The base library contains neutral, happiness, sadness, fear, anger, surprise, and disgust. Every eyebrow, eye, pupil, nose, and mouth path has identical cubic-Bézier topology across states, so any state pair can interpolate without path re-segmentation; normalized weighted blends support exploratory compound geometry.
- Scenario rendering uses continuous stages: low-intensity neutral→happiness for `calm`, that calm geometry→surprise for `alert`, surprise→fear for `afraid`, and the anger end state for `angry`. Transition progress is derived deterministically from authoritative fear rather than renderer-local clocks.
- Canvas 2D draws the interpolated SVG paths through `Path2D` at the display backing resolution. Three.js samples each cubic curve at a stable 32 subdivisions per segment, constructs filled and stroked triangle layers, maps every vertex through the longitude/latitude projection onto radius 0.344 over the radius-0.34 head, and updates the existing position buffers during morphs. No face plane, facial bitmap, per-avatar texture, or renderer-local emotion state remains.
- `scripts/generate-face-assets.mjs` deterministically serializes all seven endpoints into standalone planar and equirectangular SVG files under `public/assets/faces/`; `manifest.json` identifies the canonical source and validation boundary. The SVG source is resolution-independent, while final visible quality is still bounded by the display, antialiasing, and GPU mesh rasterization.
- FACS action-unit patterns and recognition studies motivate feature directions and region emphasis. They do not validate the exact stylization, intensity, transition path, cultural interpretation, crowd viewing distance, or 2D/XR implementation.

## Extension seams

- Other human GLB assets can replace Cesium Man without changing scenario behavior, but asset identity must remain fixed per condition and documented.
- Recorded speech can replace synthesis while preserving cue IDs, timing, text, and source coordinates.
- An institution-operated authenticated signaling adapter can replace the public VDO.Ninja discovery boundary.
- Conditions can be added only by extending the versioned configuration and updating transport validation, logs, tests, and this folder together.
