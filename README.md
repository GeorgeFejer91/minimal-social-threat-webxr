# Minimal Social Threat 2D + WebXR

A deterministic social-threat research prototype with a phone-first 2D trial, optional HRTF spatial audio, and optional WebXR:

**Live site:** https://georgefejer91.github.io/minimal-social-threat-webxr/

**Direct views:** [2D trial](https://georgefejer91.github.io/minimal-social-threat-webxr/?view=trial) · [dedicated headset host](https://georgefejer91.github.io/minimal-social-threat-webxr/?view=headset) · [PC operator view](https://georgefejer91.github.io/minimal-social-threat-webxr/?view=companion)

- **2D trial:** twelve minimalist or human-proportioned agents form six conversational dyads in a large crowd entirely in front of the observer. Choose a fading shrouded shadow, visible angry agent, or fading Huntsman spider as the approaching threat.
- **Facial expressions:** one renderer-neutral cubic-Bézier/SVG library defines neutral, happiness, sadness, fear, anger, surprise, and disgust end states, supports smooth all-pairs and weighted blends, and drives the live calm→alert→fear sequence. Procedural WebXR faces are equirectangular textures wrapped onto the head orb—not flat face plates. The geometry is FACS-informed and evidence-grounded, but the exact stylization and transitions are not independently validated.
- **Spatial audio:** the application is silent by default. An explicit 2D-only opt-in lets dyads trade short consonant/harmonic friendly-tone prototypes. Entering immersive VR/MR closes any prior browser-audio graph, so the headset scenario starts and remains silent. The synthesized cues are evidence-informed design features, not an independently validated composite.
- **Optional WebXR:** the lazy Three.js engine prewarms automatically. A local headset action directly enters VR and starts or continues the same trial; passthrough MR remains available where supported. A PC can request VR or MR, but WebXR requires a trusted local user activation, so the headset presents a conspicuous **Confirm** action rather than entering immersion silently.
- **PC operator view:** a realtime top-down or 3D reconstruction from authoritative scene state, full versioned scenario controls, XR request/exit controls, command receipts, and host/XR readback. The dedicated headset route starts its data-only VDO.Ninja host automatically; the separately opened operator view auto-discovers it.

The primary trial supports a dusk-clearing or neutral study-grid background. The optional add-on supports WebXR passthrough (`immersive-ar`). Procedural visuals and all sounds are generated locally; the WebXR view can additionally load locally bundled Cesium Man and Huntsman Spider GLBs. The landing, trial, and companion views use a safe-area-aware single-column phone layout with touch-sized controls; both 2D Canvas and optional WebGL surfaces yield vertical gestures to page scrolling.

**First-time contributors and AI agents:** read [`FOR_AI/README.md`](FOR_AI/README.md) before working in this repository. It is the authority for requirements, scope, architecture, bibliography, source assets, and validation status.

## Important research boundary

This repository is a **stimulus-building prototype**, not a pre-validated paradigm, diagnostic, or emotion detector. Its procedural faces, social dynamics, shadow, captions, synthesized voices, and combined audiovisual manipulation have not themselves been validated. Before collecting study data, pre-register the operationalization and pilot-test at least:

- threat/fear recognition and perceived intensity;
- realism, presence, discomfort, and simulator sickness;
- timing, minimum distance, manipulation checks, and demand characteristics;
- audio localization, roughness, loudness, audiovisual co-location, and headphone/headset calibration;
- device/browser compatibility and cultural or population-specific interpretation.
- facial-expression identity, intensity, transition naturalness, common category confusions, and recognition at actual 2D/XR crowd distance.

The threat has a code-tested **1.8 m minimum distance**. After an 8-second social baseline and 3-second detection interval, “Gentle” takes 18 seconds to approach and “Standard” takes 12 seconds. The immersive launch button starts/continues the trial; right-controller A restarts/resumes, while phone controls, either XR controller trigger, and the companion can pause. Digital limiting does not establish a safe sound-pressure level; begin at low volume and calibrate physical output before participant use.

## Quick start

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`, then choose a view. Direct links are:

- `http://localhost:3000/?view=trial`
- `http://localhost:3000/?view=headset`
- `http://localhost:3000/?view=companion`

The 2D trial works in an ordinary phone browser. Press **Start 2D** for a phone/desktop run, or **Start immersive 3D** in a supported HTTPS headset browser. A running 2D scene can be continued in immersive 3D without resetting elapsed time. The normal trial route connects only after participant start or a manual link action. For supervised Quest operation, open `?view=headset` in the headset: that dedicated role starts its data-only host on entry, before the scenario starts. Then open `?view=companion` on the PC; it starts discovery automatically and provides start/pause/resume/reset, scenario configuration, VR/MR request, XR exit, and runtime readback.

A remote **Request VR/MR** first stages a request on the headset. The participant/operator must select the headset’s local **Confirm** control while it has trusted user activation; browser security rules do not permit an incoming network message to call `requestSession()` silently. The PC reports the matching pending, confirmed, rejected, or failed receipt. Its 3D viewport is a reconstruction of the synchronized scene snapshot—not a video, framebuffer, or headset-pose mirror.

## Validation commands

```bash
npm run test:unit
npm run lint
npm run build
node --test tests/build-output.test.mjs
```

`npm test` runs the complete sequence. The static export is written to `dist/client/`.

## GitHub Pages

The published repository uses a generated `gh-pages` branch. For automatic
deployment on later pushes, copy `docs/github-pages-workflow.yml` to
`.github/workflows/pages.yml` after authorizing the GitHub CLI or token for
the `workflow` scope. The workflow builds and publishes `dist/client/` on
pushes to `main`:

1. Create an empty GitHub repository.
2. Add this directory as its contents and push to `main`.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Wait for the **Deploy static WebXR site** workflow.
5. Open `https://<account>.github.io/<repository>/?view=trial` on a phone or headset.

The workflow supplies the repository base path. If you use a custom domain at the root, change `PAGES_BASE_PATH` and `NEXT_PUBLIC_BASE_PATH` to empty strings in the workflow.

## Runtime authority and synchronization

| Concern | Authority | Readback |
| --- | --- | --- |
| Scenario clock, phase, social links, agent behavior, audio cues, threat distance | Participant/headset host | Versioned scene frame at up to 20 Hz; immersive time is advanced from the active XR frame loop |
| Start/pause/resume/reset and scenario configuration | PC operator request; host application | Matching bounded receipt plus authoritative state readback |
| VR/MR request and XR exit | PC operator request; headset/browser session authority | Local headset confirmation for entry; XR phase, mode, support, engine readiness, and frame count readback |
| Rendering | Each browser | 2D, top-down, or 3D reconstruction from the same latest accepted snapshot |
| Logging | 2D trial host | Downloadable bounded CSV; never uploaded by this app |

The scene transport follows the Affect Tracker’s remote-Flubber pattern: bundled VDO.Ninja SDK 1.5.5, a data-only public discovery room, anonymous random stream IDs, no media tracks, `ordered: false`, `maxRetransmits: 0`, newest-state backpressure, sequence validation, automatic selection only when one source exists, and an explicit stale state. Transport envelope/command version 2 carries scenario schema 4 unchanged. The snapshot includes the complete twelve-agent social state, avatar style, active audio-cue metadata, one of three threat kinds, and threat visibility rather than Affect Tracker’s 12-byte X/Y frame. The v2 namespace separates these peers from incompatible earlier clients.

### Wire data

The trial host sends only:

- anonymous in-memory session ID;
- scenario configuration, phase, elapsed scenario time, and pause/run state;
- fixed observer origin, social links, active cue metadata, and procedural agent/threat positions, orientations, expressions, and behaviors;
- page visibility and participant/headset role;
- XR support check, VR/MR support, engine readiness, lifecycle phase, active/requested mode, and an aggregate XR frame count;
- at most 16 command receipts with request ID, action, status, and bounded reason/message fields.

The operator sends only allowlisted commands: `start`, `pause`, `resume`, `reset`, `set-threat`, `set-agent-style`, `set-intensity`, `set-mode`, `set-loop`, `request-xr`, or `exit-xr`. Configuration values and XR modes are strictly validated; the operator cannot send code or arbitrary scene state. A sticky command ID is not treated as proof of success: the UI reconciles the exact request against its bounded host-authored receipt. The app does **not** request or transmit microphone, camera, media capture, controller pose, headset pose, participant name, or physiology.

VDO.Ninja still uses third-party signaling and STUN/TURN. WebRTC peers may learn IP addresses; relay routing can affect latency and privacy. The discovery room is public and has no study-grade authentication. For sensitive or multi-site deployment, replace the public discovery boundary with an institution-operated authenticated signaling service.

## Study log

The trial host holds at most 12,000 rows in memory and exports CSV on demand. Rows contain schema version, anonymous session ID, client time, event/source, scenario time, phase/run state, threat kind/distance, and the complete versioned procedural scene as JSON. Refreshing closes the session and clears unsaved data.

## Physical acceptance checklist

The automated checks do not qualify a headset study. Before claiming support, record:

The 2026-08-28 Quest 3 / Quest Browser 149 smoke pass for source `3825279` covered public VR entry with local confirmation, XR-frame clock progression, PC command receipts, pause/resume, and remote XR exit. The unchecked items below—including MR, controller mapping, recovery, and soak—remain required before participant use.

- headset model, OS, browser version, and served HTTPS URL;
- `immersive-vr` and `immersive-ar` entry/exit;
- virtual background and compositor passthrough behavior;
- direct immersive launch/start, non-frozen XR-frame clock progression, 2D-to-XR clock continuity, right-controller A-button restart/resume, and controller-trigger pause;
- dedicated-headset auto-host, PC start/pause/resume/reset/configuration, local confirmation of remote VR/MR requests, remote XR exit, matching command receipts, and XR lifecycle/frame-count readback;
- consistency among the headset scene and PC top-down/3D state reconstructions, while confirming that no video or pose data is sent;
- direct and relayed VDO routes, multi-source selection, disconnect, stale hold, late-receipt reconciliation, and recovery;
- 1.8 m visual/behavioral limit, Gentle/Standard timing, CSV download, and no unexpected permissions;
- at least a 15-minute thermal/network soak and participant-visible comfort review.

## Repository map

- `components/ParticipantScene2D.tsx` — phone-first Canvas renderer and minimalist emotional agents.
- `components/XrScene.tsx` — prewarmed optional Three.js/WebXR renderer, local GLB loading, and procedural fallbacks.
- `lib/scenario.ts` — deterministic scenario timeline and safety contract.
- `lib/facial-expression.ts` — FACS-informed SVG geometry, all-pairs/weighted morphing, Canvas drawing, and spherical projection math.
- `lib/spatial-audio.ts` — opt-in HRTF panning and project-authored vocal/roughness synthesis.
- `lib/scene-sync.ts` — VDO.Ninja transport, codec, discovery, command validation, and stale handling.
- `components/TopdownScene.tsx` — companion canvas renderer.
- `components/StudyApp.tsx` — experiment UI, authority application, logging, and routing.
- `tests/` — scenario, transport, vendored-SDK, privacy, and export checks.
- `FOR_AI/` — mandatory first-read project memory, requirements, architecture, bibliography, provenance, and study-readiness record.

## Licenses and provenance

Project-authored code, procedural visuals, and runtime synthesis are MIT licensed. The VDO.Ninja SDK is MPL-2.0; Cesium Man is CC BY 4.0 with Cesium credit/trademark notice; the Huntsman Spider is CC0. See `THIRD_PARTY_NOTICES.md`, `public/assets/models/LICENSES.md`, [`FOR_AI/documentation/SOURCE_ASSET_REGISTER.md`](FOR_AI/documentation/SOURCE_ASSET_REGISTER.md), and [`FOR_AI/documentation/BIBLIOGRAPHY.md`](FOR_AI/documentation/BIBLIOGRAPHY.md) for exact hashes, source links, attribution, and validation boundaries.
