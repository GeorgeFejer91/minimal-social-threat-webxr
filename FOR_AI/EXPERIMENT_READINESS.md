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
- Explicit audio opt-in, HRTF panning, capped digital gain, and no microphone/camera request.

## Required before study use

1. Obtain the applicable ethics/IRB approval and define exclusion, withdrawal, and adverse-event procedures.
2. Validate the prototype friendly-tone classification in the target population, or replace it with fixed, licensed recordings if intelligible speech or independently normed valence is experimentally important.
3. Calibrate output on every supported headphone/headset combination with an acoustic measurement procedure. Record device volume, equivalent level, peak level, duration, and calibration equipment.
4. Pilot the shadow and angry-agent conditions for threat recognition, intensity, valence, arousal, agency, ambiguity, and demand characteristics.
5. Pilot social cues for gaze recognition, speaking/listening role, group naturalness, synchrony, and perceived contagion.
6. Manipulation-check the friendly tones for valence, arousal, tension, friendliness, and cultural familiarity separately from the full scene.
7. Validate 2D phone and immersive XR presentations separately.
8. Test localization, front/back confusions, distance perception, audio/visual co-location, and the effect of non-individual HRTFs.
9. Measure presence, discomfort, simulator sickness, startle burden, hearing sensitivity, and participant stop behavior.
10. Verify WebXR entry/exit, passthrough, right-controller A-button start/resume, trigger pause, companion controls, network loss/stale recovery, logging, initial shadow invisibility/fade, and the invisible 1.8 m model limit on each physical device/browser version.
11. Freeze stimulus version, code revision, cue parameters, recordings, device configuration, random seed policy, preregistration, and analysis plan before collection.

## Claims that must not be made yet

- “Scientifically validated threat stimulus.”
- “Clinically safe volume.”
- “Binaural localization equivalent to individualized HRTF rendering.”
- “Culturally universal fear response.”
- “Validated social-agent behavior.”
- “Universally friendly tones.”
- “Rocketbox/VALID validation transfers to this procedural scene.”

## Recommended manipulation checks

- Threat identity and perceived agency.
- Fear/threat, valence, arousal, unpredictability, and imminence.
- Perceived distance and approach speed.
- Agent gaze target, talking/listening roles, group cohesion, and naturalness.
- Audio direction, co-location, roughness, unpleasantness, and loudness.
- Presence, discomfort, cybersickness, and willingness to continue.
