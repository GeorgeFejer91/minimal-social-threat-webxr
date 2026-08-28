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
- Silent-by-default operation: optional audio requires an explicit 2D click, while every immersive entry closes any prior Web Audio graph and keeps VR/MR silent. The dormant synthesis retains HRTF panning and capped digital gain; no microphone/camera is requested.

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

A targeted diagnostic smoke pass used a Meta Quest 3 on Horizon Android 14 with Quest Browser 149 against the HTTPS GitHub Pages build. It established that the browser exposed WebXR, reported both immersive VR and AR support, entered a stereo immersive-VR session, rendered at approximately 90 frames per second, and emitted no JavaScript exception during the observed session. It also reproduced the prior defect: the XR renderer continued submitting frames while scenario time stayed at 3.6 seconds because only the suspended window animation loop advanced the clock. That observation motivated the shared XR-frame clock implementation.

The patched source commit `3825279` was then tested from `https://georgefejer91.github.io/minimal-social-threat-webxr/?view=headset&v=3825279`, with the PC operator on the corresponding `?view=companion` route. The public build auto-hosted before scenario start, reported VR/MR support and engine readiness, returned `pending/local-confirmation-required` for a PC VR request, entered only after a trusted headset-side confirmation, and returned the exact confirmed receipt. During that public immersive session the readback advanced from 698 to 964 XR frames and from 8.3 to 12.3 scenario seconds over a four-second observation; PC-requested XR exit returned a confirmed receipt and changed lifecycle readback to inline. A same-source USB-loopback pass also confirmed PC start/pause/resume/reset and configuration convergence: while remotely paused, elapsed time held at 27.6 seconds as XR frames advanced from 2,355 to 2,580, then elapsed time resumed after the PC Resume command.

This evidence establishes implementation behavior only for the recorded device/browser/source combination. Passthrough MR, controller mappings, network-loss recovery, prolonged soak, physical-boundary safety, construct validity, emotional effect, comfort, acoustic calibration, and participant readiness remain unverified.

## Silent-immersive evidence recorded 2026-08-29

Source `292c95c` was loaded from the public HTTPS headset route on the same Quest 3 / Quest Browser 149 device class. The page reported audio off, a trusted browser touch entered immersive VR, and the runtime status reported the trial running silently. Fresh Android audio-service readback during the active immersive session listed no started audio player for Quest Browser or Meta VR Shell. Navigating out of XR ended the session; Meta VR Shell then restarted its own `USAGE_GAME` AAudio stream. This separates the audible Home/environment background stream from application audio and establishes that the observed patched immersive run created no active playback stream. It does not prove acoustic silence on other Horizon/browser versions or replace physical volume/acoustic checks.

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
