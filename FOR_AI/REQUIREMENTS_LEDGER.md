# Requirements ledger

This ledger consolidates the user’s requests in chronological order. “Implemented” describes software state, not scientific validation.

| ID | Demand | Status | Notes |
| --- | --- | --- | --- |
| R01 | Investigate scientifically validated minimal 2D emotion/avatar stimuli | Researched | Candidate literature and libraries are in the bibliography; the project-authored faces are not validated. |
| R02 | Represent social agents with minimal game-like features that still carry social cues | Implemented prototype | Procedural 2D and 3D agents carry expression, orientation, role, gait, gesture, and dialogue cues. |
| R03 | Surround the observer with a group; introduce an approaching threat | Implemented | Six agents surround the origin; threat approaches from negative Z. |
| R04 | Agents become avoidant and afraid as the threat comes nearer | Implemented | Detection, alert, startle, fear, flee, and freeze are explicit agent fields. |
| R05 | Optional VR/MR, predefined background, or passthrough | Implemented where browser supports it | `immersive-vr` and `immersive-ar`; virtual clearing or transparent compositor background. Physical-device verification remains required. |
| R06 | Browser top-down companion synchronized in realtime | Implemented | Full scene snapshots and bounded commands. |
| R07 | Reuse the Affect Tracker’s VDO.Ninja solution | Implemented adaptation | VDO.Ninja SDK 1.5.5, explicit opt-in, data-only room/channel, no media tracks. |
| R08 | Publish through GitHub Pages and provide a launch URL | Existing deployment; update pending | Repository remote and live URL are recorded in the README. New changes must be pushed/deployed after validation. |
| R09 | Smartphone-compatible layout like the Affect Tracker | Implemented | Safe areas, touch targets, scroll-safe canvases, and a single-column mobile layout. |
| R10 | Complete 2D phone trial; VR only optional | Implemented | 2D Canvas is the primary trial. WebGL/WebXR loads lazily. |
| R11 | Investigate publicly available human assets | Researched, not bundled | Rocketbox is the leading behavior-ready candidate; VALID is the leading demographic-identity candidate. |
| R12 | Agents meander asymmetrically, face/look at one another, converse, and organize socially | Implemented prototype | Three dyads, seeded independent trajectories, gaze targets, alternating talk/listen roles, and social links. |
| R13 | Generate sounds and short dialogue cues in a binaural manner | Implemented prototype | Caption semantics plus project-authored non-lexical synthesis; one HRTF-positioned source per active agent cue. Fixed recorded speech is recommended for a final study. |
| R14 | Group behavior changes when the threatening cue menaces toward the observer | Implemented | Individual detection delays create non-simultaneous alarm transmission and flight. |
| R15 | Add a first-read “for AI” folder with project scope, goals, bibliography, and source assets | Implemented | Root `AGENTS.md` mandates this folder’s reading order. |
| R16 | Make the threat a stylized shrouded darkness with faint agentic cues such as red eyes | Implemented | Generic project-authored shadow; not a film-character replica. |
| R17 | Use a scientifically grounded threatening sound range and binaurally bind it to the approaching agent | Implemented with caveat | 70 Hz amplitude modulation is used as a roughness parameter based on Arnal et al. and Taffou et al.; it is not a universal threatening pitch or a validated copy of either study stimulus. |
| R18 | Implement a working VR threat-approach scenario for social-neuroscience use | Working prototype | Automated software gates can pass; study readiness still requires acoustic calibration, headset tests, ethics/safety review, and pilot validation. |
| R19 | Remove the visible VR safety-limit marker and black warning sign; start the VR experiment with the right-controller A button | Implemented prototype | The 1.8 m model constraint remains enforced and logged but is no longer rendered in VR. Entering VR stages an idle scene; an edge-triggered WebXR `xr-standard` button index 4 press from the right-hand input starts or resumes the trial. Either controller trigger remains pause-only. |
