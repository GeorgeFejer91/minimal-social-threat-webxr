# Project scope and goals

## Decision

Build one deterministic social-threat scenario that works first as a touch-friendly 2D browser trial and optionally as virtual or mixed reality. Twelve minimal game-like or optional human-form social agents form six conversational dyads in a large crowd entirely in front of the observer. The dyads exchange friendly-tone prototypes. One of three threats—shrouded shadow, angry agent, or articulated spider—approaches; the shadow and spider begin participant-invisible and fade in with proximity. Agents detect it at different times, alarm spreads through the group, and they adopt varied avoidance behavior while the threat never crosses the configured 1.8 m boundary.

The same authoritative scene snapshot drives the 2D participant view, optional Three.js/WebXR view, HRTF spatial audio, CSV logging, and the PC operator's realtime top-down or 3D state reconstruction. The PC can request bounded scenario and XR actions; the participant/headset host remains authoritative and returns explicit runtime readback and per-request receipts.

## Goals

- Convey useful social cues with visually minimal, inexpensive-to-render agents, including a shared evidence-grounded SVG facial-expression geometry.
- Avoid synchronized crowd motion by using independent deterministic timing, meandering, pair formation, gaze targets, speaking/listening turns, detection delays, startle, flight, and freeze states.
- Produce a complete phone trial without requiring VR; VR and passthrough MR are add-ons.
- Spatialize dyadic friendly tones, later warning cues, and the approaching threat so sound direction and distance correspond to scene position.
- Keep every trial reproducible and every synchronized or logged state explicit.
- Make the repository publishable as a static GitHub Pages application.
- Make participant start and external-browser synchronization one-action workflows: ordinary trial start exposes the VDO.Ninja scene, the dedicated `?view=headset` role exposes it on entry, and PC operator mode auto-discovers.
- Support bidirectional supervised operation: the PC can control all versioned scenario fields, start/pause/resume/reset, stage VR/MR entry, exit XR, and observe authoritative scenario/XR state; headset actions are reflected back in that readback.
- Keep experimental claims, bibliography, software/assets, license status, and validation gaps auditable.

## Current stimulus

- Twelve procedural agents or optional Cesium Man GLB instances, organized as six dyads in front of the observer. Procedural heads use cubic-Bézier SVG facial features that morph continuously and are tessellated into sphere-conforming vector meshes in 3D rather than using a flat face plate or facial bitmap.
- Eight-second baseline with independent movement and alternating talk/listen behavior.
- Individual threat-detection delays and dyadic alarm transmission.
- A generic shrouded shadow that fades in with proximity, an immediately visible angry-agent comparison, or a fading project-authored spider with viewer-facing cephalothorax, eyes, mandibles, and an alternating eight-leg gait.
- A deterministic dusk forest edge with varied broadleaf trees, conifers, branches, roots, shrubs, rocks, haze, and a visible central approach path. Full tree-canopy bounds stay outside the threat corridor in both 2D and WebXR.
- Gentle 18-second or standard 12-second approach after the detection interval.
- Four-second safety-distance hold and deterministic completion.
- Captioned friendly dyadic cues and threat cues are silent outside immersion. The trusted local VR/MR entry action automatically starts the same authoritative HRTF cue schedule, with no separate audio setting; the listener follows the XR camera and the graph closes on session exit.
- The threat cue is split into auditable layers: a PPS Kit-derived broadband burst-train localizer across approach and a methods-derived three-second 70 Hz rough harmonic cue at final approach. Web Audio HRTF owns direction from a visual-kind-specific 3D anchor (1.55 m for upright threats; 0.42 m for the spider), a manual −18→0 dB law owns relative distance level, and `distance / 343 m/s` owns propagation delay. No recorded scream is bundled.
- Data-only VDO.Ninja v2 operator synchronization, bounded command receipts and XR readback, and bounded CSV export; scenario snapshots use schema v5 and carry the audio-protocol identity.

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

- A participant can configure, directly start, pause, reset, and complete the 2D trial on a smartphone without a checkbox gate.
- Supported headsets can directly start VR and, when supported, passthrough MR over HTTPS; an active 2D run can continue with its elapsed time preserved.
- Agents visibly face partners, alternate roles, move asynchronously, react at different times, and avoid the threat.
- The non-immersive trial is silent. A trusted local VR/MR entry automatically enables HRTF scene audio without a separate control, and leaving immersion tears it down so the browser page does not keep background audio running.
- The threat never crosses 1.8 m in the authoritative state.
- A separately opened PC operator browser auto-discovers the data-only VDO.Ninja scene, can receive the full versioned scene and host runtime state, and can issue only allowlisted commands with exact bounded receipts.
- The dedicated headset role advertises itself before the scenario starts; PC start/pause/resume/reset and configuration changes are reflected on both displays, while local headset/controller actions return through the same authoritative readback.
- A PC VR/MR request produces a local headset confirmation rather than silently entering immersive mode; confirmation starts the requested session and rejection/failure is reported against the matching request.
- Once immersive, the authoritative scenario clock advances from XR animation frames and remains continuous across 2D/XR transitions.
- Every website-affecting change is validated, committed, pushed to the canonical GitHub repository, published as the exact live GitHub Pages revision, and checked on each affected public route before it is reported complete.
- Automated checks pass, followed by documented physical-device, acoustic, and participant-pilot validation before data collection.
