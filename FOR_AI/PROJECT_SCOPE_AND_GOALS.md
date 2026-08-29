# Project scope and goals

## Decision

Build one deterministic social-threat scenario with a touch-friendly planar top-down monitor, a complete Three.js browser presentation, and optional immersive virtual or mixed reality. Twelve minimal game-like or optional human-form social agents form six conversational dyads in a large crowd entirely in front of the observer. The dyads exchange friendly-tone prototypes. One of three threats—shrouded shadow, angry agent, or articulated spider—approaches; the shadow and spider begin participant-invisible in the 3D stimulus and fade in with proximity. Agents detect it at different times, alarm spreads through the group, and they adopt varied avoidance behavior while the threat never crosses the configured 1.8 m boundary.

The same authoritative scene snapshot drives the planar state monitor, Three.js/WebXR stimulus, HRTF spatial audio, CSV logging, and the PC operator's realtime top-down or 3D state reconstruction. The PC can request bounded scenario and XR actions; the participant/headset host remains authoritative and returns explicit runtime readback and per-request receipts. Phase names remain useful for logging, but threat motion, awareness, fear, avoidance, and locomotion overlap and ramp continuously rather than acting as hard visual cuts.

## Goals

- Convey useful social cues with visually minimal, inexpensive-to-render agents, including a shared evidence-grounded SVG facial-expression geometry.
- Avoid synchronized crowd motion and running-in-place by using independent deterministic timing, meandering, pair formation, gaze targets, speaking/listening turns, detection delays, continuous awareness/fear/avoidance, larger individual escape paths, motion-derived locomotion intensity, and settled holds.
- Provide a phone-safe top-down monitoring/control surface and a complete 3D browser stimulus without requiring immersion; VR and passthrough MR are add-ons.
- Spatialize dyadic friendly tones, later warning cues, and the approaching threat so sound direction and distance correspond to scene position.
- Keep every trial reproducible and every synchronized or logged state explicit.
- Make the repository publishable as a static GitHub Pages application.
- Keep GitHub Pages as the only current website platform; do not use ChatGPT Sites for builds, mirrors, or handoff URLs.
- Put the authoritative planar top-down monitor and Three.js renderer behind a peer Top-down/3D switch in the large main viewport.
- Make participant start and external-browser synchronization one-action workflows: ordinary trial start exposes the VDO.Ninja scene, the dedicated `?view=headset` role exposes it on entry, and PC operator mode auto-discovers.
- Support bidirectional supervised operation: the PC can control all versioned scenario fields, start/pause/resume/reset, stage VR/MR entry, exit XR, and observe authoritative scenario/XR state; headset actions are reflected back in that readback.
- Keep experimental claims, bibliography, software/assets, license status, and validation gaps auditable.

## Current stimulus

- Twelve procedural agents or optional Cesium Man GLB instances, organized as six dyads in front of the observer. Procedural heads use cubic-Bézier SVG facial features that morph continuously and are tessellated into sphere-conforming vector meshes in 3D rather than using a flat face plate or facial bitmap.
- Twelve-second positive social baseline with independent movement, alternating talk/listen behavior, extended call/reply tones, acknowledgements, and soft group-like murmurs.
- Individual threat-detection delays and dyadic alarm transmission spread across the moving threat's early approach; awareness, fear, avoidance, and locomotion are continuous `[0,1]` fields.
- A generic shrouded shadow that fades in with proximity, an immediately visible angry-agent comparison, or a fading project-authored spider with viewer-facing cephalothorax, eyes, mandibles, and an alternating eight-leg gait.
- A deterministic 3D dusk forest edge with varied broadleaf trees, conifers, branches, roots, shrubs, rocks, haze, and a visible central approach path. Full tree-canopy bounds stay outside the threat corridor in browser Three.js and WebXR; the planar monitor intentionally omits scenery.
- Gentle 36-second or standard 26-second continuous approach beginning immediately after baseline; the first six seconds are logged as emerging awareness while the threat is already moving and fading in.
- Four-second safety-distance hold and deterministic completion.
- Captioned friendly dyadic cues and threat cues run automatically after a trusted local **Start preview** action in either browser renderer, or after trusted local VR/MR entry. There is no separate audio setting. The browser preview uses the fixed observer pose, the immersive listener follows the XR camera, and the graph closes on preview reset/completion or immersive session exit.
- The threat cue is split into auditable layers: a PPS Kit-derived broadband burst-train localizer across approach and a methods-derived three-second 70 Hz rough harmonic cue at final approach. Web Audio HRTF owns direction from a visual-kind-specific 3D anchor (1.55 m for upright threats; 0.42 m for the spider), a manual −18→0 dB law owns relative distance level, and `distance / 343 m/s` owns propagation delay. No recorded scream is bundled.
- Data-only VDO.Ninja v2 operator synchronization, bounded command receipts and XR readback, and bounded CSV export; scenario snapshots use schema v6, carry the audio-protocol identity, and expose authoritative awareness/avoidance/locomotion values.

## Non-scope

- Diagnosis, emotion recognition, clinical decision support, or treatment.
- A claim that the complete stimulus is validated, normed, culturally invariant, or safe at arbitrary volume.
- A claim that the project-authored SVG facial prototypes, their intermediate morphs, or their spherical presentation inherit validation from FACS, RaFD, ADFES, or other source studies.
- Photorealistic scenes, autonomous generative dialogue, microphone/camera capture, participant identification, physiology, cloud storage, or study recruitment.
- Remote capture or mirroring of headset video, framebuffer, controller pose, or headset pose. The operator's 3D viewport is reconstructed from experiment-owned scene state only.
- Silent remote WebXR entry. Browser user-activation requirements keep immersive-session entry behind an explicit local headset confirmation.
- A reproduction of any copyrighted film character. The shadow is a project-authored generic cinematic archetype.
- Inclusion of Rocketbox, VALID, ACASS, or FERG files in the shipped build. Cesium Man is intentionally limited to a lightweight public sample-model option, not treated as a validated human stimulus.

## Success criteria

- An operator can configure, directly start, pause, reset, and monitor the trial from a phone-safe top-down view without a checkbox gate; the complete visual stimulus requires WebGL/Three.js or WebXR.
- Supported headsets can directly start VR and, when supported, passthrough MR over HTTPS; an active browser run can continue with its elapsed time preserved.
- Agents visibly face partners, alternate roles, move asynchronously, react at different times, and progressively fan out in depth and width as the threat approaches; limb motion falls to zero when translation settles.
- The main trial surface can switch between the live planar Canvas monitor and live Three.js renderer without changing authoritative scenario time.
- A trusted local Start preview action automatically enables the complete HRTF scene-audio schedule in either browser view; reset/completion tears it down. Trusted local VR/MR entry does the same for immersion without a separate audio control.
- The threat never crosses 1.8 m in the authoritative state.
- A separately opened PC operator browser auto-discovers the data-only VDO.Ninja scene, can receive the full versioned scene and host runtime state, and can issue only allowlisted commands with exact bounded receipts.
- The dedicated headset role advertises itself before the scenario starts; PC start/pause/resume/reset and configuration changes are reflected on both displays, while local headset/controller actions return through the same authoritative readback.
- A PC VR/MR request produces a local headset confirmation rather than silently entering immersive mode; confirmation starts the requested session and rejection/failure is reported against the matching request.
- Once immersive, the authoritative scenario clock advances from XR animation frames and remains continuous across browser/XR transitions.
- Every website-affecting change is validated, committed, pushed to the canonical GitHub repository, published as the exact live GitHub Pages revision, and checked on each affected public route before it is reported complete.
- Automated checks pass, followed by documented physical-device, acoustic, and participant-pilot validation before data collection.
