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
- Direct Start 2D / Start immersive 3D controls, a shared clock whose authority moves to XR animation frames during immersion, and automatic data-link startup/discovery.
- A dedicated headset host role, version-2 data-only operator transport, full versioned scenario controls, bounded per-request receipts, XR lifecycle/readback, and top-down/3D authoritative state reconstruction.
- Remote VR/MR requests stage a local headset confirmation to preserve WebXR's trusted-user-activation boundary; they cannot silently enter immersive mode.
- Three threat renderings and two avatar styles are explicit versioned configuration fields.
- Shared cubic-Bézier face geometry has seven compatible end states, deterministic pairwise/weighted morphing, and a tested front-facing sphere projection; this establishes software behavior, not recognition validity.
- Explicit audio opt-in, HRTF panning, capped digital gain, and no microphone/camera request.

## Required before study use

1. Obtain the applicable ethics/IRB approval and define exclusion, withdrawal, and adverse-event procedures.
2. Validate the prototype friendly-tone classification in the target population, or replace it with fixed, licensed recordings if intelligible speech or independently normed valence is experimentally important.
3. Calibrate output on every supported headphone/headset combination with an acoustic measurement procedure. Record device volume, equivalent level, peak level, duration, and calibration equipment.
4. Pilot the shadow, angry-agent, and spider conditions for threat recognition, intensity, valence, arousal, agency, ambiguity, disgust, phobia burden, and demand characteristics. Screen/exclude spider-phobic participants unless the approved protocol intentionally includes them.
5. Pilot social cues for gaze recognition, speaking/listening role, group naturalness, synchrony, and perceived contagion.
6. Manipulation-check the friendly tones for valence, arousal, tension, friendliness, and cultural familiarity separately from the full scene.
7. Validate 2D phone and immersive XR presentations separately.
8. Test localization, front/back confusions, distance perception, audio/visual co-location, and the effect of non-individual HRTFs.
9. Measure presence, discomfort, simulator sickness, startle burden, hearing sensitivity, and participant stop behavior.
10. Verify direct WebXR entry/start, non-frozen XR-frame clock progression, 2D-to-XR clock continuity, passthrough, right-controller A-button restart/resume, trigger pause, dedicated-headset auto-host, PC start/pause/resume/reset/configuration, locally confirmed remote VR/MR request, remote XR exit, exact receipt/readback reconciliation, network loss/stale recovery, logging, model loading/fallbacks, shadow/spider fade, and the invisible 1.8 m model limit on each physical device/browser version.
11. Freeze stimulus version, code revision, cue parameters, recordings, device configuration, random seed policy, preregistration, and analysis plan before collection.
12. Validate the exact project-authored facial end states and intermediate transitions with the intended population. Report forced-choice and open-label recognition, confusion matrices (especially fear/surprise and anger/disgust), perceived intensity/valence/arousal, viewing distance, avatar style, 2D versus XR presentation, and cultural/language context.

## Physical-device evidence recorded 2026-08-28

A targeted diagnostic smoke pass used a Meta Quest 3 on Horizon Android 14 with Quest Browser 149 against the HTTPS GitHub Pages build. It established that the browser exposed WebXR, reported both immersive VR and AR support, entered a stereo immersive-VR session, rendered at approximately 90 frames per second, and emitted no JavaScript exception during the observed session. It also reproduced the prior defect: the XR renderer continued submitting frames while scenario time stayed at 3.6 seconds because only the suspended window animation loop advanced the clock. That observation motivates the shared XR-frame clock implementation and is evidence about one device/browser/build combination—not a claim that the patched deployment, every XR mode, the full bidirectional bridge, or a prolonged session has passed physical acceptance yet.

Any final smoke pass of the patched public build may establish only implementation behavior: session entry/exit, clock progression, command/readback coherence, rendering, and absence of unexpected permissions or media tracks on the recorded device/browser revision. It cannot establish construct validity, emotional effect, safety, comfort, acoustic calibration, or readiness for participant data collection. Record the exact deployed code revision and URL when that pass is completed.

## Claims that must not be made yet

- “Scientifically validated threat stimulus.”
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
