# Project-memory changelog

## 2026-08-28 — Quest XR clock repair and bidirectional PC operator bridge

- Added a dedicated `?view=headset` role that starts the data-only VDO.Ninja host on entry, allowing the PC operator to connect before the scenario starts while preserving the ordinary trial's start-gated connection behavior.
- Kept scenario snapshots at schema v4 and introduced transport/command envelope v2 with an incompatible discovery namespace, strict full-scenario command validation, bounded exact-request receipts, and host/XR runtime readback.
- Expanded the PC operator from a top-down companion into top-down and 3D authoritative state viewports with start/pause/resume/reset, threat/avatar/intensity/background/loop configuration, VR/MR request, XR exit, and lifecycle/frame-count readback.
- Preserved the browser security boundary for WebXR: a remote VR/MR request stages a prominent local headset **Confirm**/**Dismiss** prompt; only the trusted local confirmation invokes immersive entry. Incoming data cannot silently activate XR.
- Moved immersive scenario-clock advancement to the XR animation loop while presentation is active, preventing the timeline from freezing when Quest Browser suspends its window animation callbacks. Added entry concurrency/failure cleanup and optional `layers` session compatibility.
- Kept the bridge data-only. The PC viewport reconstructs experiment-owned scene state and receives no video, framebuffer, media, controller pose, or headset pose.
- Recorded a targeted Quest 3 / Quest Browser 149 diagnostic smoke pass that confirmed WebXR availability, immersive rendering, and the prior frozen-clock failure mode. This device evidence concerns implementation behavior only; it does not scientifically validate the stimulus or replace a final patched-build acceptance pass, soak, safety review, acoustic calibration, or participant pilot.

## 2026-08-28 — evidence-grounded SVG facial morphing and sphere wrapping

- Replaced the procedural Three.js agents' flat face planes with transparent equirectangular facial textures wrapped onto slightly enlarged spherical shells aligned to local +Z.
- Added `lib/facial-expression.ts`: normalized cubic-Bézier paths for eyebrows, eyes, pupils, nose, and mouth across neutral, happiness, sadness, fear, anger, surprise, and disgust; arbitrary pairwise and weighted blends; SVG export; Canvas drawing; and explicit sphere/UV projection helpers.
- Mapped existing authoritative states continuously from calm through alert/surprise to fear, while retaining the anger end state for the angry-agent threat. Smoothed the scenario's alarm-fear onset so the visual morph does not jump when alarm begins.
- Made 2D procedural and human-proportioned faces consume the same geometry and added simple orb/skin shading.
- Added topology, all-pairs morph, compound blend, transition-continuity, SVG, and spherical-projection tests. A WebGL-disabled browser now reports an optional-3D fallback instead of crashing.
- Grounded feature choices in FACS-configured stimulus research, facial-region recognition evidence, and dynamic-expression studies, with explicit cultural and validation caveats. These exact project-authored faces remain unvalidated.

## 2026-08-28 — canonical GithubVR project location

- Relocated the complete Git checkout from the temporary Codex output directory to `D:\GithubVR\github-projects\minimal-social-threat-webxr`.
- Preserved the existing Git history and `origin` remote at `GeorgeFejer91/minimal-social-threat-webxr`.

## 2026-08-28 — schema v4 direct launch, human avatars, and spider threat

- Removed the readiness checkbox and the separate WebXR-load gate. Added prominent Start 2D and Start immersive 3D controls; immersive entry requests its session directly from the click and starts/continues the shared trial.
- Prewarmed the lazy Three.js/WebXR renderer invisibly on XR-capable browsers and kept browser-preview visibility independent from engine readiness; non-XR 2D browsers mount it only after an explicit preview request.
- Started the data-only VDO.Ninja broadcast automatically on participant start and companion discovery automatically on companion-page entry; retained retry, stop, disconnect, source selection, and readback.
- Made the companion connection status explicitly report live scene frames and confirmed host command readback instead of leaving an obsolete waiting message visible.
- Added a versioned crowd-avatar style with the bundled CC BY 4.0 Cesium Man GLB in 3D and a project-authored human-proportioned 2D alternative.
- Added a third, fading spider threat using the bundled CC0 Huntsman Spider GLB with a procedural fallback.
- Reworked the threat synthesis into an HRTF-positioned inharmonic drone with 47/83 Hz rough modulation, deterministic band-limited noise, accelerating low pulses, and spider-only clicks under the existing digital gain/compressor boundary.
- Bumped scene snapshots and VDO.Ninja discovery names to v4. None of the new combined stimuli inherit scientific validation from their motivating literature or source models.

## 2026-08-28 — schema v3 front crowd, friendly tones, and fading shadow

- Expanded the group from three to six dyads: twelve independently moving agents, all placed in front of the observer.
- Replaced baseline vocal placeholders with alternating, HRTF-positioned friendly-tone prototypes using smooth envelopes and simple 5:4 and 3:2 harmonic ratios.
- Moved the shadow start to 16 m, made it participant-invisible through baseline/detection, and tied its fade-in monotonically to approach proximity in 2D and WebXR.
- Kept a faint visibility-independent shadow marker only in the operator companion so the operator can monitor hidden stimulus state.
- Bumped scene snapshots and the VDO.Ninja discovery namespace to v3 because agent cardinality and threat state changed.

## 2026-08-28 — immersive controller start

- Removed the visible 1.8 m boundary ring and dark instructional warning billboard from the immersive renderer while retaining the authoritative 1.8 m approach constraint.
- Changed immersive entry to stage an idle trial instead of starting immediately.
- Bound an edge-triggered right-controller A-button press to start or resume the VR trial; either controller trigger remains pause-only.

## 2026-08-28 — schema v2 social scenario

- Created the mandatory first-read `FOR_AI` memory and root `AGENTS.md` router.
- Consolidated the full request history, scope, architecture, validation boundary, bibliography, and source-asset register.
- Replaced the synchronous six-agent ring with three dyads, independent meandering, talk/listen roles, gaze targets, individualized detection, alarm links, and varied flight.
- Replaced the default tiger with a generic project-authored shrouded shadow with faint red eyes; retained angry agent as a comparison.
- Added deterministic dialogue cue data, visible captions, procedural social vocalizations, and HRTF panning.
- Added a 70 Hz amplitude-modulated rough threat sound bound to the moving threat position.
- Bumped the scene snapshot and VDO.Ninja discovery namespace to v2.
- Added a single generated social-preview card at `public/og.png` and recorded its provenance; it is marketing metadata, not an experimental stimulus.

## Earlier prototype

- Established phone-first 2D trial, optional virtual/passthrough WebXR, top-down VDO.Ninja companion, bounded CSV logging, a 1.8 m minimum threat distance, and GitHub Pages build/deployment.
