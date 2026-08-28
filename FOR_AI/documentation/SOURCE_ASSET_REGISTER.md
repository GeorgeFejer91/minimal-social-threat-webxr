# Source and asset register

## Shipped dependencies and assets

| Item | Use | Source | License/status | Citation action |
| --- | --- | --- | --- | --- |
| VDO.Ninja SDK 1.5.5 | Data-only discovery and WebRTC channel | https://github.com/steveseguin/ninjasdk/tree/v1.5.5 | MPL-2.0; readable source, minified distribution, and license are vendored with pinned hashes | Cite project/version in software methods; preserve notice and files. |
| Three.js | Procedural WebGL/WebXR scene and OrbitControls | https://github.com/mrdoob/three.js | MIT; installed package | Cite version from lockfile in software methods. |
| React / React DOM | Interface | https://react.dev/ | MIT; installed packages | Report versions for reproducibility if relevant. |
| Vinext/Vite/Cloudflare tooling | Static/worker build | Package metadata and lockfile | Installed development/runtime tooling | Report repository revision and build environment; no stimulus claim. |
| Procedural agents | 2D Canvas and Three.js geometry | Project-authored code | MIT project code | Describe as project-authored and unvalidated. |
| Cesium Man GLB | Optional human crowd mesh in WebGL/WebXR | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/fcc7fba598e7bd07ae9533ba28cf6d2408693d54/Models/CesiumMan | CC BY 4.0; © 2017 Cesium; trademark/logo notice retained; unmodified local file hash `b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9` | Attribute Cesium and cite exact sample-asset revision/URL. State that it is a format sample, not a validated social/emotion avatar. |
| Shrouded shadow | 2D Canvas and Three.js geometry with red eyes | Project-authored code | MIT project code; generic archetype, not copied from *Darkness Falls* | Describe as project-authored; do not imply film affiliation. |
| Huntsman Spider GLB | Optional spider threat mesh in WebGL/WebXR | https://github.com/code4fukui/vr-spiders/tree/32aaefa3e540658a75258771c76c2d398f4a473b and original Sketchfab record linked in `public/assets/models/LICENSES.md` | CC0 1.0; ffish.asia / floraZia.com; unmodified local file hash `efc9cfda2b8a198277d6a1b10ca8123460d909deb76400ccddcb495d355bb5ca` | Credit creator despite CC0; distinguish asset license from stimulus validation. |
| Friendly dyadic and warning cues | Web Audio oscillator synthesis | Project-authored code informed by cited affect/consonance research | Generated at runtime; no external recording; not independently normed | Describe exact synthesis, ratios, envelopes, caption schedule, and cultural-validation caveat. |
| Threat menace cue | 47/83 Hz amplitude modulation, inharmonic carriers, deterministic noise, accelerating low pulses, and optional spider clicks | Project-authored implementation informed by cited roughness, nonlinear-vocalization, and auditory-looming research | Generated at runtime; not a copy of any published sound and not independently normed | Cite Arnal et al. (2015), Blumstein et al. (2010), Taffou et al. (2021), and Bidelman & Myers (2020); report all synthesis parameters and validation gap. |
| HRTF spatialization | Web Audio `PannerNode` | W3C Web Audio API/browser implementation | Platform feature; non-individualized | Cite Web Audio specification and report browser/headset. |
| `public/og.png` | Social/link preview only; never shown as an experimental stimulus | Generated once with OpenAI’s built-in image-generation tool on 2026-08-28 from the finished site brief | Project-bound generated raster; no source photograph or reference image | Do not cite as study stimulus. Preserve this provenance row and regenerate only when the product direction changes. |

## Evaluated but not included

| Item | Why considered | Inclusion status | Constraint |
| --- | --- | --- | --- |
| Microsoft Rocketbox | 115 rigged humans, broad animations, visemes, FACS, LODs | Not bundled | Candidate for a later higher-diversity human-agent condition, but selected FBX/animations must be converted, optimized, and pilot-validated. |
| Headbox | Rocketbox facial/viseme extensions | Not bundled | Demo dependencies have additional licenses; implement only the needed permissive data/path after audit. |
| VALID | 210 demographically evaluated rigged avatars | Not bundled | Validation concerns perceived race/gender, not emotion or social behavior; behavior/facial layer still required. |
| VALID GLB conversion | Browser-ready VALID assets | Not bundled | Community conversion; verify identity mapping, source revision, material quality, and license before use. |
| ACASS | Validated affective movement clips | Not bundled | One neutral avatar and household actions; useful reference/benchmark, not a multi-agent crowd. |
| FERG-3D | Stylized facial-expression rig data | Not bundled | Four Maya rigs under access agreement; not a drop-in crowd system. |

## Intake rule

Before adding any external asset, record its exact URL/revision, file names, hashes, license, attribution text, consent/model-release implications, transformation steps, intended condition, performance cost, and validation plan here. Do not treat public download access as permission to redistribute.
