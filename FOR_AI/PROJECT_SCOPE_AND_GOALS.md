# Project scope and goals

## Decision

Build one deterministic social-threat scenario that works first as a touch-friendly 2D browser trial and optionally as virtual or mixed reality. Twelve minimal game-like social agents form six conversational dyads in a large crowd entirely in front of the observer. The dyads exchange friendly-tone prototypes. A generic shrouded shadow with faint red eyes starts 16 m away and participant-invisible, then becomes more opaque as it approaches; agents detect it at different times, alarm spreads through the group, and they adopt varied avoidance behavior while the threat never crosses the configured 1.8 m boundary.

The same authoritative scene snapshot drives the 2D participant view, optional Three.js/WebXR view, HRTF spatial audio, CSV logging, and realtime top-down companion.

## Goals

- Convey useful social cues with visually minimal, inexpensive-to-render agents.
- Avoid synchronized crowd motion by using independent deterministic timing, meandering, pair formation, gaze targets, speaking/listening turns, detection delays, startle, flight, and freeze states.
- Produce a complete phone trial without requiring VR; VR and passthrough MR are add-ons.
- Spatialize dyadic friendly tones, later warning cues, and the approaching threat so sound direction and distance correspond to scene position.
- Keep every trial reproducible and every synchronized or logged state explicit.
- Make the repository publishable as a static GitHub Pages application.
- Keep experimental claims, bibliography, software/assets, license status, and validation gaps auditable.

## Current stimulus

- Twelve procedural agents, organized as six dyads in front of the observer.
- Eight-second baseline with independent movement and alternating talk/listen behavior.
- Individual threat-detection delays and dyadic alarm transmission.
- A generic shrouded shadow that fades in with proximity, or an immediately visible angry-agent comparison condition.
- Gentle 18-second or standard 12-second approach after the detection interval.
- Four-second safety-distance hold and deterministic completion.
- Captioned, procedurally synthesized friendly dyadic cues using smooth envelopes and simple 5:4 and 3:2 harmonic ratios as a study-motivated—not universal or pre-validated—positive/low-tension mapping.
- Threat sound using 70 Hz amplitude modulation to create auditory roughness, rendered from the threat position with Web Audio HRTF panning.
- Data-only VDO.Ninja companion synchronization and bounded CSV export.

## Non-scope

- Diagnosis, emotion recognition, clinical decision support, or treatment.
- A claim that the complete stimulus is validated, normed, culturally invariant, or safe at arbitrary volume.
- Photorealistic scenes, autonomous generative dialogue, microphone/camera capture, participant identification, physiology, cloud storage, or study recruitment.
- A reproduction of any copyrighted film character. The shadow is a project-authored generic cinematic archetype.
- Inclusion of Rocketbox, VALID, ACASS, or FERG files in the shipped build. They are evaluated candidate resources only.

## Success criteria

- A participant can acknowledge the content warning, configure, start, pause, reset, and complete the 2D trial on a smartphone.
- Supported headsets can enter VR and, when supported, passthrough MR over HTTPS.
- Agents visibly face partners, alternate roles, move asynchronously, react at different times, and avoid the threat.
- Enabled headphone audio is HRTF-positioned and the threat source grows more salient as its distance decreases.
- The threat never crosses 1.8 m in the authoritative state.
- A companion browser can receive the full versioned scene and issue only allowlisted commands with host readback.
- Automated checks pass, followed by documented physical-device, acoustic, and participant-pilot validation before data collection.
