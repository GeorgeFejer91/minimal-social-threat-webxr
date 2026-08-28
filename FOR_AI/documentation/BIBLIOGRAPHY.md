# Bibliography and citation map

## Positive-valence and low-tension tone design

Bresin, R., & Friberg, A. (2011). Emotion rendering in music: Range and characteristic values of seven musical variables. *Cortex, 47*(9), 1068–1081. https://doi.org/10.1016/j.cortex.2011.05.009

- Supported lesson: performers systematically varied tempo, loudness, articulation, register, timbre, attack, and phrasing when rendering happy, peaceful, scary, sad, and neutral intentions.
- Project use: motivates using an intentionally smooth, modest-level synthesis for the baseline rather than the urgent/rough threat synthesis.
- Rejected overreach: the project tones are not reproductions of the study performances and have not inherited their emotion labels.

Ilie, G., & Thompson, W. F. (2006). A comparison of acoustic cues in music and speech for three dimensions of affect. *Music Perception, 23*(4), 319–330. https://doi.org/10.1525/mp.2006.23.4.319

- Supported lesson: intensity, rate, and pitch height affected perceived valence, energy, and tension, with interactions and different pitch effects in speech and music.
- Project use: supports treating pitch, intensity, envelope, and rate as jointly controllable parameters rather than calling any one frequency “friendly.”
- Rejected overreach: there is no context-free or modality-independent friendly pitch.

Papavasileiou, V., & Vatakis, A. (2023). Musical consonance in simple, static auditory stimuli and perceived pleasantness: The role of musical intervals and inharmonicity, and the influence of duration. *Psychology of Music, 51*(3). https://doi.org/10.1177/03057356221109323

- Supported lesson: harmonicity and musical interval interacted in pleasantness judgments of simple tone combinations; consonant intervals alone did not guarantee pleasantness.
- Project use: motivates harmonic 5:4 and 3:2 ratios while keeping the synthesis harmonic and brief.
- Rejected overreach: consonance is neither sufficient for pleasantness nor equivalent to social friendliness.

McDermott, J. H., Schultz, A. F., Undurraga, E. A., & Godoy, R. A. (2016). Indifference to dissonance in native Amazonians reveals cultural variation in music perception. *Nature, 535*, 547–550. https://doi.org/10.1038/nature18635

- Counterevidence: Tsimane’ listeners did not show the consonance preference found in the comparison groups.
- Project consequence: the baseline mapping must be called a prototype and pilot-tested in the intended population; it must not be described as culturally universal.

Lahdelma, I., & Eerola, T. (2020). Cultural familiarity and musical expertise impact the pleasantness of consonance/dissonance but not its perceived tension. *Scientific Reports, 10*, 8693. https://doi.org/10.1038/s41598-020-65615-8

- Supported lesson: cultural familiarity and musical expertise can affect pleasantness judgments, while pleasantness, consonance, preference, and tension should not be treated as interchangeable.
- Project consequence: collect valence/friendliness and tension manipulation checks separately and report participant cultural/music background when relevant.

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
