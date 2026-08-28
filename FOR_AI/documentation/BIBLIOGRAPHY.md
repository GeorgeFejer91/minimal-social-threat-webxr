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
- Project use: the final three-second runtime layer now reconstructs the reported 500 Hz fundamental plus seven harmonics through 4 kHz, full-depth 70 Hz modulation, and −0.8 dB rough/non-rough level difference. It follows the authoritative threat position.
- Rejected overreach: the paper reports the upper-partial amplitudes only as “around 0.25,” and the project uses a different trajectory, browser HRTF, no LISTEN/near-field/room simulation, a manual relative-level law, and no tactile task. This is a methods-derived reconstruction, not the original stimulus or transferred validation.

PPS Toolkit. *Peripersonal Space Toolkit*, revision `1c7ea7aa505efbde61b24c1b0f5c943bd842edb2`. https://github.com/GeorgeFejer91/pps-kit

- Reference lesson borrowed: keep the dry source separate from the spatial renderer and export exact source profile, trajectory, level policy, HRTF resource/renderer, and QC identity. The DynaSpace-derived default uses 30 ms broadband Gaussian-noise bursts, 10 ms rise/fall, approximately 95 ms onset spacing, and an onset at 300 ms.
- Project use: `lib/threat-audio-protocol.ts` adapts those dry-source parameters into a deterministic Web Audio approach-localizer and logs the pinned reference revision. HRTF, level, and delay remain renderer-owned.
- Overreach rejected: the browser implementation is not PPS Toolkit's Python SOFA/FABIAN preview, native 3DTI renderer, measured loudness profile, or validated audio-tactile PPS protocol. The burst layer is not independently validated as a threat inducer.

Seow, T. X. F., & Hauser, T. U. (2022). Reliability of web-based affective auditory stimulus presentation. *Behavior Research Methods, 54*, 378–392. https://doi.org/10.3758/s13428-021-01643-0

- Supported lesson: in an 84-participant, 15-sound comparison, the modified Morriss female scream was the most unpleasant and arousing item and produced reliable repeated ratings under headphone-screened web delivery.
- Project consequence: recorded screams remain strong candidates for a separately licensed aversive-outcome condition, but they should not be conflated with a learned cue or with the current generated spatial layers.
- Redistribution boundary: the accompanying repository labels the work CC BY-NC 4.0, while the article says sounds were included with author permission or CC BY 3.0. The specific winning file derives from IADS-2 #277, so the project does not bundle it without clearer asset-level permission.

Morriss, J., Macdonald, B., & van Reekum, C. M. (2016). What is going on around here? Intolerance of uncertainty predicts threat generalization. *PLOS ONE, 11*(5), e0154494. https://doi.org/10.1371/journal.pone.0154494

- Supported lesson: a one-second modified IADS-2 #277 scream was used as an aversive unconditioned stimulus in a conditioning/generalization task with subjective and skin-conductance measures; participants rated it strongly aversive and arousing.
- Rejected overreach: the older approximately 90 dB laboratory presentation is not a safe target for uncontrolled Quest/headphone playback, and conditioning evidence does not make the recording a neutral threat-predictive cue.

Yang, W., et al. (2018). Affective auditory stimulus database: An expanded version of the International Affective Digitized Sounds (IADS-E). *Behavior Research Methods, 50*, 1415–1429. https://doi.org/10.3758/s13428-017-0947-1 and official access terms: https://sites.google.com/view/iads-e/

- Supported lesson: IADS-E provides normed affective recordings for approved non-profit academic research.
- Redistribution boundary: the official site says download access is requester-specific and the link/files must not be shared or distributed beyond that requester. Therefore the evaluated #0276 scream is not bundled even though it appeared in the Seow comparison repository.

Taschereau-Dumouchel, V., et al. (2020). The ‘Threat of Scream’ paradigm: a tool for studying sustained physiological and subjective anxiety. *Scientific Reports, 10*, 12496. https://doi.org/10.1038/s41598-020-68889-0

- Supported lesson: unpredictable screams during threat blocks increased skin-conductance level and subjective anxiety across two replications, indicating that uncertainty and anticipation can be more important for sustained anxiety than simply maximizing acoustic intensity.
- Project consequence: any later sustained-anxiety condition should manipulate and preregister predictability separately. The study's exact scream set is not openly redistributed here.

Zhao, S., Yum, N. W., Benjamin, L., Benhamou, E., Yoneya, M., Furukawa, S., Dick, F., Slaney, M., & Chait, M. (2019). Rapid ocular responses are modulated by bottom-up-driven auditory salience. *Journal of Neuroscience, 39*(39), 7703–7714. https://doi.org/10.1523/JNEUROSCI.0776-19.2019

- Supported lesson: crowd-sourced salience related to acoustic roughness and an ocular-freezing measure.
- Project use: contextual support for roughness as salience, not an implementation specification.

Blumstein, D. T., Davitian, R., & Kaye, P. D. (2010). Do film soundtracks contain nonlinear analogues to influence emotion? *Biology Letters, 6*(6), 751–754. https://doi.org/10.1098/rsbl.2010.0333

- Supported lesson: highly ranked horror soundtracks contained more noisy screams/non-musical nonlinear analogues than expected, consistent with filmmakers exploiting harsh/unpredictable acoustic structure.
- Historical project use: motivated an earlier exploratory inharmonic menace sound that schema v5 replaced with the parameter-traceable PPS/Taffou layers.
- Rejected overreach: the observational film analysis does not prescribe this project’s carriers, pulse pattern, loudness, or emotional effect.

Bidelman, G. M., & Myers, M. H. (2020). Frontal cortex selectively overrides auditory processing to bias perception for looming sonic motion. *Brain Research, 1726*, 146507. https://doi.org/10.1016/j.brainres.2019.146507

- Supported lesson: listeners responded faster to rising-intensity looming than receding complex tones, with early prefrontal differentiation in EEG.
- Project use: supports increasing acoustic salience with the moving threat rather than using a static non-spatial sound.
- Rejected overreach: the runtime’s distance model, source identity, PPS burst rate, and Taffou-derived roughness reconstruction were not tested in this paper.

W3C. Web Audio API. https://www.w3.org/TR/webaudio/

- Project use: `PannerNode` HRTF spatialization and browser audio graph.

## Avatars and affective stimuli

Khronos Group. Cesium Man, glTF Sample Assets, revision `fcc7fba598e7bd07ae9533ba28cf6d2408693d54`. https://github.com/KhronosGroup/glTF-Sample-Assets/tree/fcc7fba598e7bd07ae9533ba28cf6d2408693d54/Models/CesiumMan

- Bundled asset: `public/assets/models/cesium-man.glb`, CC BY 4.0, © 2017 Cesium.
- Project use: optional lightweight human-form mesh rendered at each authoritative crowd-agent transform.
- Validation boundary: this is a glTF format sample and has no inherited validation for emotion, identity, gaze, or group behavior.

ffish.asia / floraZia.com. CC0 Huntsman Spider, *Heteropoda venatoria*. Source package revision `32aaefa3e540658a75258771c76c2d398f4a473b`: https://github.com/code4fukui/vr-spiders/tree/32aaefa3e540658a75258771c76c2d398f4a473b

- Bundled asset: `public/assets/models/huntsman-spider.glb`, CC0 1.0.
- Project use: retained provenance/reference for the earlier static spider implementation. The file is no longer loaded or rendered because it is unrigged, includes a separate cube prop, and cannot supply articulated locomotion.
- Validation boundary: a public/CC0 model is not a validated phobia or threat stimulus.

Prokop, P., Randler, C., Beňo, M., Monyová, D., Jurišová, M., & Čapíková, S. (2021). What makes spiders frightening and disgusting to people? *Frontiers in Ecology and Evolution, 9*, 694569. https://doi.org/10.3389/fevo.2021.694569

- Supported lesson: in a large Slovak non-clinical sample, enlarged abdomen and chelicerae were strong fear/disgust cues; hairiness also mattered, while eye enlargement was not significant for fear.
- Project use: favors a thick-bodied, visibly legged/hairy real-spider asset over a cute simplified icon and motivates explicit disgust/fear manipulation checks.
- Rejected overreach: results from manipulated 2D images do not validate the chosen GLB, its scale, movement, sound, or an immersive approach.

Schmuecker, L., et al. (2025). Into the spiderverse: validation of a behavioral avoidance test in virtual reality for assessing spider phobia. *Virtual Reality*. https://doi.org/10.1007/s10055-025-01272-4

- Supported lesson: a VR spider behavioral-avoidance task can be evaluated against other approach tests in a diagnosed spider-phobic sample.
- Project use: supports treating perceived/accepted distance and stop behavior as important outcomes for a spider condition.
- Rejected overreach: the published Unity stimulus is not the bundled CC0 Huntsman model; validation does not transfer between assets or paradigms.

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

## Minimal facial-expression geometry and dynamics

Du, S., Tao, Y., & Martinez, A. M. (2014). Compound facial expressions of emotion. *Proceedings of the National Academy of Sciences, 111*(15), E1454–E1462. https://doi.org/10.1073/pnas.1322355111

- Supported lesson: FACS coding of 230 participants found recurring action-unit configurations for six conventional component categories and showed that compound categories can combine compatible subordinate action units. The core patterns used here are happiness (AU12/25), sadness (AU4/15), fear (AU1/4/20/25), anger (AU4/7/24), surprise (AU1/2/25/26), and disgust (AU9/10/17), with reported variants.
- Project use: sets the direction of eyebrow, eyelid, nose, and mouth deformations and motivates topology-compatible weighted blends.
- Rejected overreach: the paper's photographed faces, FACS coding, and computational discrimination do not validate this simplified SVG geometry or imply that a linear blend equals a naturally produced compound expression.

Wegrzyn, M., Vogt, M., Kireclioglu, B., Schneider, J., & Kissler, J. (2017). Mapping the emotional face: How individual face parts contribute to successful emotion recognition. *PLOS ONE, 12*(5), e0177239. https://doi.org/10.1371/journal.pone.0177239

- Supported lesson: sequential unmasking showed the eyes and mouth were most diagnostic overall; eye-region information was especially important for fear, anger, and sadness, while mouth/lower-face information was especially important for happiness and disgust. Fear/surprise confusion remained prominent.
- Project use: justifies retaining eyebrows/eye aperture, a minimal nose wrinkle, and mouth geometry instead of reducing the face to eyes and a generic smile/frown.
- Rejected overreach: diagnostic regions in full photographic faces do not establish recognition rates for the project's stylized faces at crowd distance.

Langner, O., Dotsch, R., Bijlstra, G., Wigboldus, D. H. J., Hawk, S. T., & van Knippenberg, A. (2010). Presentation and validation of the Radboud Faces Database. *Cognition and Emotion, 24*(8), 1377–1388. https://doi.org/10.1080/02699930903485076

- Supported lesson: FACS-configured frontal photographs spanning neutral, happiness, sadness, anger, fear, surprise, disgust, and contempt were rated for intended expression, intensity, clarity, genuineness, attractiveness, and valence; the reported overall intended-expression agreement was 82%.
- Project use: supports keeping neutral plus the conventional six categories as an auditable reference basis and motivates measuring more than forced-choice identity in project validation.
- Rejected overreach: RaFD validation applies to its controlled photographs and participant sample, not to these SVG paths, avatar colors, animation, viewing distances, or XR presentation.

van der Schalk, J., Hawk, S. T., Fischer, A. H., & Doosje, B. (2011). Moving faces, looking places: Validation of the Amsterdam Dynamic Facial Expression Set (ADFES). *Emotion, 11*(4), 907–920. https://doi.org/10.1037/a0023853

- Supported lesson: ADFES validates filmed expressions beginning from neutral and includes nine emotion categories plus directed head motion; recognition was high but varied with the social categorization of the model.
- Project use: motivates treating onset-to-apex dynamics as part of the stimulus and separately testing static end states and animated transitions.
- Rejected overreach: ADFES timing, actor movement, and recognition do not validate smoothstep Bézier interpolation or the project's orb-headed agents.

Jack, R. E., Garrod, O. G. B., & Schyns, P. G. (2014). Dynamic facial expressions of emotion transmit an evolving hierarchy of signals over time. *Current Biology, 24*(2), 187–192. https://doi.org/10.1016/j.cub.2013.11.064

- Supported lesson: dynamic facial signals conveyed coarser approach/avoidance information earlier and more socially specific category information later rather than transmitting all diagnostic movements simultaneously.
- Project use: supports continuous, inspectable transition trajectories rather than instant texture swaps.
- Rejected overreach: the study does not prescribe linear or smoothstep timing for this scenario and explicitly questions treating six categories as psychologically irreducible.

Jack, R. E., Garrod, O. G. B., Yu, H., Caldara, R., & Schyns, P. G. (2012). Facial expressions of emotion are not culturally universal. *Proceedings of the National Academy of Sciences, 109*(19), 7241–7244. https://doi.org/10.1073/pnas.1200155109

- Counterevidence: reverse-correlated dynamic expression models differed between Western Caucasian and East Asian participants in both feature groupings and temporal intensity signals, particularly among negative categories.
- Project consequence: call the library FACS-informed or evidence-grounded, never culturally universal or scientifically validated; validate label recognition and confusions in the actual target population.

## Software and transport

VDO.Ninja SDK 1.5.5. https://github.com/steveseguin/ninjasdk/tree/v1.5.5

Three.js. https://github.com/mrdoob/three.js

W3C. WebXR Device API. https://www.w3.org/TR/webxr/

- Project use: immersive session requests require trusted user activation. A VDO.Ninja `request-xr` command therefore stages a headset prompt, and the local **Confirm** action performs `requestSession()`; the PC cannot silently place the headset into VR or MR.
- Validation boundary: conformance to the browser API and a device smoke test establish software behavior only, not stimulus validity, participant safety, presence, or comfort.

Three.js. `SphereGeometry` and `CanvasTexture` documentation. https://threejs.org/docs/pages/SphereGeometry.html and https://threejs.org/docs/pages/CanvasTexture.html

- Project use: the transparent face texture is updated from an offscreen canvas and mapped to a spherical shell. The checked `SphereGeometry` source places local +Z at `u = 0.25`, which is bound by a projection regression test.

## Citation rule

In papers, preregistrations, protocols, and repository releases, distinguish:

1. sources that motivated a design feature;
2. software actually executed;
3. assets actually redistributed;
4. stimuli that were independently validated;
5. project-authored adaptations that still require validation.

Never cite a source in a way that implies its validation automatically transfers to this combined scenario.
