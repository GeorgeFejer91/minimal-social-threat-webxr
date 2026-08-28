# Experiment readiness

## Current status

**Working stimulus prototype; not approved or validated for participant data collection.** Automated tests establish deterministic software properties. They do not establish construct validity, participant safety, experimental efficacy, or device-level acoustic output.

## Established in code

- Deterministic phase order and cue schedule.
- Six independently parameterized agents and three social dyads.
- Non-simultaneous threat detection.
- Threat distance never below 1.8 m in the authoritative model.
- Complete 2D trial, optional WebXR, pause/reset, bounded logging, and synchronization contracts.
- Explicit audio opt-in, HRTF panning, capped digital gain, and no microphone/camera request.

## Required before study use

1. Obtain the applicable ethics/IRB approval and define exclusion, withdrawal, and adverse-event procedures.
2. Replace prototype non-lexical conversation tones with fixed, licensed recordings if intelligible speech is experimentally important.
3. Calibrate output on every supported headphone/headset combination with an acoustic measurement procedure. Record device volume, equivalent level, peak level, duration, and calibration equipment.
4. Pilot the shadow and angry-agent conditions for threat recognition, intensity, valence, arousal, agency, ambiguity, and demand characteristics.
5. Pilot social cues for gaze recognition, speaking/listening role, group naturalness, synchrony, and perceived contagion.
6. Validate 2D phone and immersive XR presentations separately.
7. Test localization, front/back confusions, distance perception, audio/visual co-location, and the effect of non-individual HRTFs.
8. Measure presence, discomfort, simulator sickness, startle burden, hearing sensitivity, and participant stop behavior.
9. Verify WebXR entry/exit, passthrough, controller pause, companion controls, network loss/stale recovery, logging, and the 1.8 m limit on each physical device/browser version.
10. Freeze stimulus version, code revision, cue parameters, recordings, device configuration, random seed policy, preregistration, and analysis plan before collection.

## Claims that must not be made yet

- “Scientifically validated threat stimulus.”
- “Clinically safe volume.”
- “Binaural localization equivalent to individualized HRTF rendering.”
- “Culturally universal fear response.”
- “Validated social-agent behavior.”
- “Rocketbox/VALID validation transfers to this procedural scene.”

## Recommended manipulation checks

- Threat identity and perceived agency.
- Fear/threat, valence, arousal, unpredictability, and imminence.
- Perceived distance and approach speed.
- Agent gaze target, talking/listening roles, group cohesion, and naturalness.
- Audio direction, co-location, roughness, unpleasantness, and loudness.
- Presence, discomfort, cybersickness, and willingness to continue.

