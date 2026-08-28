# Project-memory changelog

## 2026-08-28 — schema v4 direct launch, human avatars, and spider threat

- Removed the readiness checkbox and the separate WebXR-load gate. Added prominent Start 2D and Start immersive 3D controls; immersive entry requests its session directly from the click and starts/continues the shared trial.
- Prewarmed the lazy Three.js/WebXR renderer invisibly on XR-capable browsers and kept browser-preview visibility independent from engine readiness; non-XR 2D browsers mount it only after an explicit preview request.
- Started the data-only VDO.Ninja broadcast automatically on participant start and companion discovery automatically on companion-page entry; retained retry, stop, disconnect, source selection, and readback.
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
