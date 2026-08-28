# Project-memory changelog

## 2026-08-29 — automatic immersive spatial audio

- Clarified the preceding “silent immersive default” request: spatial threat sound is now the built-in VR/MR behavior, not a separate participant setting. The non-immersive page remains silent.
- Removed the spatial-audio toggle. The trusted local immersive action dispatches the WebXR request first and Web Audio startup second before awaiting either, preserving both activation boundaries; a remotely staged request still requires local headset confirmation.
- Attached HRTF listener updates only during the immersive session and dispose the audio graph on entry failure or session exit so the application cannot leave background audio running afterward.
- The live Android audio-service diagnosis remains valid: the continuous post-exit stream belonged to Meta VR Shell/Home, not Quest Browser. Automatic-audio headset acceptance for this new revision is still required before experimental use.

## 2026-08-29 — mandatory live website delivery

- Added a durable completion gate for all website-affecting work: validate the change, commit and push its source to the canonical GitHub repository, publish that exact revision to GitHub Pages, and verify every affected public route.
- Recorded the current deployment authority accurately: the public site uses legacy branch publishing from the generated `gh-pages` branch, so a successful local build or `main` push alone does not make a change live.
- Required blocked or unverified delivery to be reported as **implemented locally; deployment pending** rather than complete. Pure research/project-memory-only edits remain outside the Pages rebuild requirement unless shipped alongside website changes.

## 2026-08-29 — corridor-cleared procedural forest

- Replaced the evenly spaced low-detail tree ring and flat 2D triangle silhouettes with a deterministic 28-tree forest edge containing varied broadleaf trees, conifers, tapered trunks, branches, multi-cluster crowns, root flares, shrubs, rocks, atmospheric depth, and a visible approach path.
- Added `lib/forest-layout.ts` as the shared 2D/Three.js position/species authority. Every complete tree canopy is code-tested to remain outside a ±2.4 m half-width central lane, preventing the threat—including the animated spider's leg span—from intersecting or visually walking through a tree.
- Expanded the virtual ground plane and added virtual-only forest fog; passthrough continues to hide all authored environment geometry. Hundreds of source tree parts are merged into a small set of material batches before rendering to contain Quest draw-call cost.
- Visually verified the 2D ready and final spider positions in the local browser. Physical Quest/WebGL composition and performance remain an explicit acceptance item.

## 2026-08-29 — PPS-derived spatial threat-audio protocol and schema v5

- Pinned PPS Kit reference revision `1c7ea7aa505efbde61b24c1b0f5c943bd842edb2` and borrowed its source/renderer separation plus DynaSpace-derived 30 ms burst, 10 ms edge, 95 ms onset-period, and 300 ms onset parameters for a generated approach-localizer.
- Replaced the exploratory 47/83 Hz inharmonic menace composite with a separately scheduled three-second methods-derived Taffou et al. reconstruction: 500 Hz fundamental plus seven harmonics through 4 kHz, full-depth 70 Hz modulation, and −0.8 dB level correction. The publication's approximate upper-harmonic amplitudes prevent an exact-waveform claim.
- Made Web Audio HRTF direction consume the live threat position, including a 1.55 m upright-threat or 0.42 m spider visual anchor, while one explicit −18→0 dB law owns relative approach level and a bounded delay follows `distance / 343 m/s`; threat panner distance rolloff is disabled to avoid double attenuation.
- Kept audio off by default. A deliberate local opt-in can now remain active in WebXR so `XrScene.tsx` updates the listener from the XR camera; audio cannot be enabled after immersive entry and cannot be enabled by the PC operator.
- Bumped scene snapshots to schema v5 and added explicit cue height plus a strict compact audio-protocol identity to scene transport/logs. Added tests for source parameters, burst envelope, source height, monotonic distance level, propagation delay, scheduling, transport rejection, and build wiring.
- Did not bundle the strongest Morriss/IADS-2-derived scream or the IADS-E comparison scream. Their asset-level/requester redistribution terms are insufficient for this public project. No external audio file or new third-party runtime dependency was added.
- This change improves parameter traceability and spatial implementation only. The generated layers, their sequence, browser HRTF rendering, loudness, and combined audiovisual scenario still require acoustic calibration, physical Quest validation, target-population piloting, and ethics approval.

## 2026-08-29 — resolution-independent SVG face assets and direct sphere vectors

- Promoted the cubic-Bézier facial geometry into deterministic standalone SVG assets: seven planar endpoints, seven equirectangular spherical mappings, and a machine-readable manifest under `public/assets/faces/`.
- Added `npm run assets:faces` so committed SVGs can be regenerated from the single canonical geometry source without manual path duplication.
- Removed the per-avatar 256×128 facial `CanvasTexture` and transparent spherical texture shell from Three.js. Live expressions now tessellate the same SVG curves into filled/stroked vector meshes whose vertices lie directly on the orb surface; morph updates reuse stable buffer topology.
- Added checks for SVG metadata/scalability, exact generated-asset parity, curve sampling, finite sphere vertices, stable all-emotion mesh topology, outward bounded indices, and constant stroke radius.
- The SVG assets are resolution-independent, but no screen or GPU output is literally infinite-resolution; final appearance still depends on display sampling, antialiasing, viewing distance, and physical-device validation. Scientific-validation caveats remain unchanged.

## 2026-08-29 — silent immersive default

- Confirmed from live Quest audio-service readback that the currently audible continuous background stream belonged to Meta VR Shell/Home rather than Quest Browser. No headset audio setting was changed during that diagnostic.
- Kept the application audio state off by default and made every immersive VR/MR entry explicitly dispose any prior 2D Web Audio graph before requesting the XR session, without adding a new preference.
- Restricted the existing opt-in audio action and engine attachment to non-immersive 2D use, and added a build-output regression gate for restored-tab audio carryover.

## 2026-08-28 — viewer-facing articulated spider locomotion

- Replaced the runtime use of the static, unrigged Huntsman GLB with a project-authored articulated spider in both Canvas 2D and Three.js/WebXR. The retained CC0 file contained a separate `Cube_2` prop and could not animate individual limbs; it now remains only as a provenance/reference artifact and is no longer requested by the application.
- Oriented the cephalothorax, six visible eye glints, mandibles, and forward leg pairs toward the observer. The authoritative threat yaw now targets the viewer and the Three.js threat root consumes it.
- Added eight three-segment legs driven by a deterministic alternating-tetrapod pose derived from authoritative elapsed time, with approach locomotion, subdued hold motion, body bob/yaw, and mandible movement. Removed the former whole-body twitch/pulse substitute for spider walking.
- Added focused gait/support-group/orientation tests. This establishes deterministic software behavior only; neither the anatomy, gait, fear effect, nor combined spider stimulus is validated.

## 2026-08-28 — Quest XR clock repair and bidirectional PC operator bridge

- Added a dedicated `?view=headset` role that starts the data-only VDO.Ninja host on entry, allowing the PC operator to connect before the scenario starts while preserving the ordinary trial's start-gated connection behavior.
- Kept scenario snapshots at schema v4 and introduced transport/command envelope v2 with an incompatible discovery namespace, strict full-scenario command validation, bounded exact-request receipts, and host/XR runtime readback.
- Expanded the PC operator from a top-down companion into top-down and 3D authoritative state viewports with start/pause/resume/reset, threat/avatar/intensity/background/loop configuration, VR/MR request, XR exit, and lifecycle/frame-count readback.
- Preserved the browser security boundary for WebXR: a remote VR/MR request stages a prominent local headset **Confirm**/**Dismiss** prompt; only the trusted local confirmation invokes immersive entry. Incoming data cannot silently activate XR.
- Moved immersive scenario-clock advancement to the XR animation loop while presentation is active, preventing the timeline from freezing when Quest Browser suspends its window animation callbacks. Added entry concurrency/failure cleanup and optional `layers` session compatibility.
- Kept the bridge data-only. The PC viewport reconstructs experiment-owned scene state and receives no video, framebuffer, media, controller pose, or headset pose.
- Recorded the patched source `3825279` Quest 3 / Quest Browser 149 acceptance pass on the public GitHub Pages headset and companion routes: exact pending/confirmed XR receipts, trusted local entry, non-frozen immersive clock/frame progression, bidirectional start/pause/resume/reset/configuration, and remote XR exit all converged. This does not validate MR, controller mappings, recovery/soak, safety, comfort, acoustics, or the experimental paradigm.

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
