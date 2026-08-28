# Bibliography and citation map

## Psychoacoustics and spatial threat

Arnal, L. H., Flinker, A., Kleinschmidt, A., Giraud, A.-L., & Poeppel, D. (2015). Human screams occupy a privileged niche in the communication soundscape. *Current Biology, 25*(15), 2051–2056. https://doi.org/10.1016/j.cub.2015.06.043

- Supported lesson: human screams showed strong temporal modulations in an approximately 30–150 Hz roughness range; roughness increased negative ratings and facilitated detection/localization.
- Project use: supports selecting amplitude-modulation roughness as a threat-cue feature.
- Rejected overreach: this does not validate the project’s carrier frequencies, loudness, shadow, timing, or combined stimulus.

Taffou, M., Suied, C., & Viaud-Delmon, I. (2021). Auditory roughness elicits defense reactions. *Scientific Reports, 11*, 956. https://doi.org/10.1038/s41598-020-79767-0

- Supported lesson: a binaurally rendered looming rough sound, created with 70 Hz amplitude modulation, affected audio-tactile peripersonal-space behavior at farther distances than a matched non-rough sound.
- Project use: exact inspiration for the runtime’s 70 Hz modulation rate and looming HRTF source.
- Rejected overreach: the project does not reproduce the paper’s harmonic stimulus, loudness matching, LISTEN HRTFs, near-field correction, room simulation, task, or validation.

Zhao, S., Yum, N. W., Benjamin, L., Benhamou, E., Yoneya, M., Furukawa, S., Dick, F., Slaney, M., & Chait, M. (2019). Rapid ocular responses are modulated by bottom-up-driven auditory salience. *Journal of Neuroscience, 39*(39), 7703–7714. https://doi.org/10.1523/JNEUROSCI.0776-19.2019

- Supported lesson: crowd-sourced salience related to acoustic roughness and an ocular-freezing measure.
- Project use: contextual support for roughness as salience, not an implementation specification.

W3C. Web Audio API. https://www.w3.org/TR/webaudio/

- Project use: `PannerNode` HRTF spatialization and browser audio graph.

## Avatars and affective stimuli

Microsoft. Microsoft Rocketbox. https://github.com/microsoft/Microsoft-Rocketbox

- 115 rigged human avatars, levels of detail, facial blendshapes, and hundreds of animations under MIT.
- Candidate for a later human-agent condition; not included now.

Jaiswal, S., et al. Headbox. https://github.com/openVRlab/Headbox

- Rocketbox-compatible facial toolkit with viseme, FACS, Vive, and ARKit-oriented blendshape resources.
- Candidate reference; not included now.

Peck, T. C., et al. Validated Avatar Library for Inclusion and Diversity (VALID). https://github.com/xrtlab/Validated-Avatar-Library-for-Inclusion-and-Diversity---VALID

- 210 rigged avatars evaluated for perceived race and gender representation.
- Does not validate emotion, gaze, speech, threat, or group behavior.

C-Frame. VALID avatars converted to glTF. https://github.com/c-frame/valid-avatars-glb

- Community browser-ready conversion; not included now.

Paterson, H. M., et al. (2019). ACASS: A database of affective body movements. *Frontiers in Robotics and AI, 6*, 94. https://doi.org/10.3389/frobt.2019.00094

- Affective standardized animated movement reference with household activities and angry/happy/sad moods.
- Explicitly limited for this project because it lacks dyadic/interactive scenes.

University of Washington Graphics and Imaging Laboratory. FERG-3D-DB. https://grail.cs.washington.edu/projects/deepexpr/ferg-3d-db.html

- Facial-expression examples and rig parameters for four stylized characters under an access agreement.
- Not included.

## Software and transport

VDO.Ninja SDK 1.5.5. https://github.com/steveseguin/ninjasdk/tree/v1.5.5

Three.js. https://github.com/mrdoob/three.js

## Citation rule

In papers, preregistrations, protocols, and repository releases, distinguish:

1. sources that motivated a design feature;
2. software actually executed;
3. assets actually redistributed;
4. stimuli that were independently validated;
5. project-authored adaptations that still require validation.

Never cite a source in a way that implies its validation automatically transfers to this combined scenario.
