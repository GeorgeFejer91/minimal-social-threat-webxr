# Experiment readiness

## Current status

**Working stimulus prototype; not approved or validated for participant data collection.** Automated tests establish deterministic software properties. They do not establish construct validity, participant safety, experimental efficacy, or device-level acoustic output.

## Established in code

- Deterministic phase order and cue schedule.
- Twelve independently parameterized agents and six social dyads, all initially in front of the observer.
- Shadow visibility is zero before approach and then rises deterministically with proximity.
- Non-simultaneous threat detection.
- Threat distance never below 1.8 m in the authoritative model.
- Complete 2D trial, optional WebXR, pause/reset, bounded logging, and synchronization contracts.
- The large main trial viewport switches between the authoritative live 2D Canvas and live Three.js renderer without changing the scenario state or clock.
- Direct Start preview / Start immersive 3D controls, a shared clock whose authority moves to XR animation frames during immersion, and automatic data-link startup/discovery.
- A dedicated headset host role, version-2 data-only operator transport, full versioned scenario controls, bounded per-request receipts, XR lifecycle/readback, and top-down/3D authoritative state reconstruction.
- Remote VR/MR requests stage a local headset confirmation to preserve WebXR's trusted-user-activation boundary; they cannot silently enter immersive mode.
- Three threat renderings and two avatar styles are explicit versioned configuration fields.
- The spider rendering faces the observer and uses a deterministic alternating eight-leg gait in both 2D and 3D; this is software behavior, not biological or threat validation.
- The virtual forest has a code-tested tree-and-canopy-free central threat corridor shared by 2D and 3D renderers; visual composition and frame-time still require physical-device acceptance.
- Shared cubic-Bézier face geometry has seven compatible end states, deterministic pairwise/weighted morphing, committed planar/spherical SVG assets, and a tested texture-free sphere-vector projection with stable mesh topology; this establishes software behavior, not recognition validity.
- Locally activated scene audio: **Start preview** automatically runs the schema-v5 HRTF cue schedule in either browser renderer, while trusted local VR/MR entry runs it with the listener following the XR camera. There is no separate setting; reset/completion or XR exit disposes the relevant graph, and no microphone/camera is requested.
- The generated threat layers have deterministic, unit-tested parameters and separate IDs: PPS Kit-derived broadband burst localization across approach, followed by a three-second 70 Hz rough harmonic reconstruction at final approach. HRTF direction consumes authoritative `x/y/z` source coordinates, with upright threats at 1.55 m and the spider at 0.42 m; one −18→0 dB relative level law and propagation delay consume authoritative threat distance. This establishes software traceability only.
- A 2026-08-29 earlier local-browser control check confirmed the then-current manual enable/disable behavior and clean graph teardown without console warnings. That activation policy was later superseded by R32; it is retained as historical evidence only and is not acceptance evidence for automatic immersive audio.

## Website delivery gate

For any website-affecting change, local validation is necessary but not sufficient. Completion requires a pushed source commit, a successful GitHub Pages publication tied to that exact source revision, and an HTTPS readback of every affected public route. GitHub Pages is the sole delivery target; ChatGPT Sites is not part of the gate. The current Pages configuration publishes the generated `gh-pages` branch, so a `main` push without a corresponding deployment does not pass this gate. Record failures or unavailable credentials as **implemented locally; deployment pending**.

Public source `7346177` was packaged with the GitHub Pages base path and published as deployment commit `0ddf0e4`. A cache-busted HTTPS readback of `?view=trial&v=7346177` returned the current application and assets successfully. Interactive browser acceptance confirmed the large main-stage **2D view** and **3D view** controls, removal of the former mini-preview, scenario-clock advancement after **Start preview**, automatic activation of the complete generated cue schedule, and return to the inactive-audio state after **Reset**. The available verification browser intentionally exposed no WebGL, so it also confirmed the 2D fallback and explicit WebGL-unavailable status but could not visually judge the Three.js frame; current-source desktop-WebGL and physical-Quest rendering remain separate device checks.

## Required before study use

1. Obtain the applicable ethics/IRB approval and define exclusion, withdrawal, and adverse-event procedures.
2. Validate the prototype friendly-tone classification in the target population, or replace it with fixed, licensed recordings if intelligible speech or independently normed valence is experimentally important.
3. Calibrate output on every supported headphone/headset combination with an acoustic measurement procedure. Record device volume, equivalent level, peak level, duration, and calibration equipment.
4. Pilot the shadow, angry-agent, and spider conditions for threat recognition, intensity, valence, arousal, agency, ambiguity, disgust, phobia burden, and demand characteristics. Screen/exclude spider-phobic participants unless the approved protocol intentionally includes them.
5. Pilot social cues for gaze recognition, speaking/listening role, group naturalness, synchrony, and perceived contagion.
6. Manipulation-check the friendly tones for valence, arousal, tension, friendliness, and cultural familiarity separately from the full scene. Test the PPS burst layer, 70 Hz roughness layer, and their sequence separately before treating the combined audio as causal.
7. Validate 2D phone and immersive XR presentations separately.
8. Test localization, front/back confusions, distance perception, audio/visual co-location, and the effect of non-individual HRTFs.
9. Measure presence, discomfort, simulator sickness, startle burden, hearing sensitivity, and participant stop behavior.
10. Verify direct WebXR entry/start, non-frozen XR-frame clock progression, 2D-to-XR clock continuity, passthrough, right-controller A-button restart/resume, trigger pause, dedicated-headset auto-host, PC start/pause/resume/reset/configuration, locally confirmed remote VR/MR request, remote XR exit, exact receipt/readback reconciliation, network loss/stale recovery, logging, model loading/fallbacks, shadow/spider fade, forest corridor clearance/occlusion, forest frame-time, and the invisible 1.8 m model limit on each physical device/browser version.
11. Freeze stimulus version, code revision, cue parameters, recordings, device configuration, random seed policy, preregistration, and analysis plan before collection.
12. Validate the exact project-authored facial end states and intermediate transitions with the intended population. Report forced-choice and open-label recognition, confusion matrices (especially fear/surprise and anger/disgust), perceived intensity/valence/arousal, viewing distance, avatar style, 2D versus XR presentation, and cultural/language context.

## Physical-device evidence recorded 2026-08-28

A targeted diagnostic smoke pass used a Meta Quest 3 on Horizon Android 14 with Quest Browser 149 against the HTTPS GitHub Pages build. It established that the browser exposed WebXR, reported both immersive VR and AR support, entered a stereo immersive-VR session, rendered at approximately 90 frames per second, and emitted no JavaScript exception during the observed session. It also reproduced the prior defect: the XR renderer continued submitting frames while scenario time stayed at 3.6 seconds because only the suspended window animation loop advanced the clock. That observation motivated the shared XR-frame clock implementation.

The patched source commit `3825279` was then tested from `https://georgefejer91.github.io/minimal-social-threat-webxr/?view=headset&v=3825279`, with the PC operator on the corresponding `?view=companion` route. The public build auto-hosted before scenario start, reported VR/MR support and engine readiness, returned `pending/local-confirmation-required` for a PC VR request, entered only after a trusted headset-side confirmation, and returned the exact confirmed receipt. During that public immersive session the readback advanced from 698 to 964 XR frames and from 8.3 to 12.3 scenario seconds over a four-second observation; PC-requested XR exit returned a confirmed receipt and changed lifecycle readback to inline. A same-source USB-loopback pass also confirmed PC start/pause/resume/reset and configuration convergence: while remotely paused, elapsed time held at 27.6 seconds as XR frames advanced from 2,355 to 2,580, then elapsed time resumed after the PC Resume command.

This evidence establishes implementation behavior only for the recorded device/browser/source combination. Passthrough MR, controller mappings, network-loss recovery, prolonged soak, physical-boundary safety, construct validity, emotional effect, comfort, acoustic calibration, and participant readiness remain unverified.

## Automatic immersive-audio evidence recorded 2026-08-29

Public source `959bf88` was opened on the same Quest 3 / Quest Browser 149 through the cache-busted dedicated headset route. The page exposed no audio toggle. One trusted headset-side **Start immersive 3D** action entered VR and reported “automatic spatial threat audio”; fresh Android audio-service readback identified a started Quest Browser media player during that immersive session. Navigating out of immersion removed the browser player. A separate Meta VR Shell/Home game-audio player resumed after exit, confirming that the continuous Home ambience is outside the threat-lab page.

This is bounded lifecycle evidence only: it shows that automatic browser audio starts and stops with the observed VR session. It does not establish HRTF perceptual accuracy, channel rendering, loudness/SPL, audiovisual co-location, comfort, construct validity, MR behavior, or participant readiness. No headset-wide audio or volume setting was changed, and the run-owned debugging forward was removed afterward.

## Current-source Quest and bridge readback recorded 2026-08-29

Public source `7346177` was loaded into the existing dedicated-host tab on the same Quest 3 / Quest Browser 149 through a bounded, serial-scoped raw-ADB diagnostic because the target is a WebXR page rather than an installable APK. Fresh page readback reported the exact cache-busted URL, `visible` page state, WebXR present, immersive VR and AR support, Three.js engine readiness, operator-link broadcasting, the new **2D view** / **3D view** controls, and no JavaScript exception or console error. The PC companion discovered several restored lab tabs, explicitly selected the live `headset`-role source, established a direct data route, and received exact `confirmed` receipts for Start, Pause, and Reset; headset readback returned inline XR state, VR/MR support, engine readiness, and Reset convergence to Ready / 0.0 seconds / 16.00 m.

The headset was not being worn and repeatedly returned to Meta Home/sleep even though the pre-existing stay-awake flag read true. Consequently the background page clock remained at 0.0 seconds after the remotely confirmed Start, and this attempt was excluded from foreground/immersive rendering acceptance. No remote XR entry was attempted: the trusted confirmation still belongs to a wearer-side action. The run changed no volume, audio, proximity, or persistent power setting; its temporary debug forward was removed. Earlier source `959bf88` remains the latest physical-wearer immersive-audio lifecycle evidence, while a current-source wearer-confirmed immersive visual pass remains pending.

## Claims that must not be made yet

- “Scientifically validated threat stimulus.” A methods-derived reconstruction and a PPS Kit-derived localization layer do not transfer validation to this combined scenario.
- “Clinically safe volume.”
- “Binaural localization equivalent to individualized HRTF rendering.”
- “Culturally universal fear response.”
- “Validated social-agent behavior.”
- “Scientifically validated SVG emotions” or “universally recognizable facial expressions.” FACS-consistent geometry and validation of photographic/video databases do not transfer automatically to these simplified faces.
- “Universally friendly tones.”
- “Rocketbox/VALID validation transfers to this procedural scene.”
- “Cesium Man is a validated emotional/social avatar.”
- “The bundled spider mesh or synthesized spider sound is a validated phobia stimulus.”

## Recommended manipulation checks

- Threat identity and perceived agency.
- Fear/threat, valence, arousal, unpredictability, and imminence.
- Perceived distance and approach speed.
- Agent gaze target, talking/listening roles, group cohesion, and naturalness.
- Facial-expression identity, intensity, transition naturalness, fear/surprise and anger/disgust confusion, and recognition at actual crowd distance in both 2D and XR.
- Audio direction, co-location, roughness, unpleasantness, and loudness.
- Presence, discomfort, cybersickness, and willingness to continue.
