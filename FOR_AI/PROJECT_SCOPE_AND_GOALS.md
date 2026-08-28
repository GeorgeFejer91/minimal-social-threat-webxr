# Project scope and goals

## Decision

Build one deterministic social-threat scenario that works first as a touch-friendly 2D browser trial and optionally as virtual or mixed reality. Twelve minimal game-like or optional human-form social agents form six conversational dyads in a large crowd entirely in front of the observer. The dyads exchange friendly-tone prototypes. One of three threats—shrouded shadow, angry agent, or Huntsman spider—approaches; the shadow and spider begin participant-invisible and fade in with proximity. Agents detect it at different times, alarm spreads through the group, and they adopt varied avoidance behavior while the threat never crosses the configured 1.8 m boundary.

The same authoritative scene snapshot drives the 2D participant view, optional Three.js/WebXR view, HRTF spatial audio, CSV logging, and realtime top-down companion.

## Goals

- Convey useful social cues with visually minimal, inexpensive-to-render agents.
- Avoid synchronized crowd motion by using independent deterministic timing, meandering, pair formation, gaze targets, speaking/listening turns, detection delays, startle, flight, and freeze states.
- Produce a complete phone trial without requiring VR; VR and passthrough MR are add-ons.
- Spatialize dyadic friendly tones, later warning cues, and the approaching threat so sound direction and distance correspond to scene position.
- Keep every trial reproducible and every synchronized or logged state explicit.
- Make the repository publishable as a static GitHub Pages application.
- Make participant start and external-browser synchronization one-action workflows: Start 2D or Start immersive 3D also exposes the VDO.Ninja scene; companion mode auto-discovers.
- Keep experimental claims, bibliography, software/assets, license status, and validation gaps auditable.

## Current stimulus

- Twelve procedural agents or optional Cesium Man GLB instances, organized as six dyads in front of the observer.
- Eight-second baseline with independent movement and alternating talk/listen behavior.
- Individual threat-detection delays and dyadic alarm transmission.
- A generic shrouded shadow that fades in with proximity, an immediately visible angry-agent comparison, or a fading CC0 Huntsman Spider condition.
- Gentle 18-second or standard 12-second approach after the detection interval.
- Four-second safety-distance hold and deterministic completion.
- Captioned, procedurally synthesized friendly dyadic cues using smooth envelopes and simple 5:4 and 3:2 harmonic ratios as a study-motivated—not universal or pre-validated—positive/low-tension mapping.
- Threat sound using inharmonic carriers, 47/83 Hz rough amplitude modulation, deterministic noise and accelerating low pulses, rendered from the threat position with Web Audio HRTF panning; spider-only clicks add a distinct condition cue.
- Data-only VDO.Ninja companion synchronization and bounded CSV export.

## Non-scope

- Diagnosis, emotion recognition, clinical decision support, or treatment.
- A claim that the complete stimulus is validated, normed, culturally invariant, or safe at arbitrary volume.
- Photorealistic scenes, autonomous generative dialogue, microphone/camera capture, participant identification, physiology, cloud storage, or study recruitment.
- A reproduction of any copyrighted film character. The shadow is a project-authored generic cinematic archetype.
- Inclusion of Rocketbox, VALID, ACASS, or FERG files in the shipped build. Cesium Man is intentionally limited to a lightweight public sample-model option, not treated as a validated human stimulus.

## Success criteria

- A participant can configure, directly start, pause, reset, and complete the 2D trial on a smartphone without a checkbox gate.
- Supported headsets can directly start VR and, when supported, passthrough MR over HTTPS; an active 2D run can continue with its elapsed time preserved.
- Agents visibly face partners, alternate roles, move asynchronously, react at different times, and avoid the threat.
- Enabled headphone audio is HRTF-positioned and the threat source grows more salient as its distance decreases.
- The threat never crosses 1.8 m in the authoritative state.
- A separately opened companion browser auto-discovers the data-only VDO.Ninja scene, can receive the full versioned state, and can issue only allowlisted commands with host readback.
- Automated checks pass, followed by documented physical-device, acoustic, and participant-pilot validation before data collection.
