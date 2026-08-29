# FOR_AI — read this first

This folder is the first-read project memory for every future human or AI contributor. Its purpose is to prevent implementation details, research caveats, citations, licensing, and prior user requirements from being lost between sessions.

## Required reading order

1. [`PROJECT_SCOPE_AND_GOALS.md`](PROJECT_SCOPE_AND_GOALS.md)
2. [`REQUIREMENTS_LEDGER.md`](REQUIREMENTS_LEDGER.md)
3. [`ARCHITECTURE.md`](ARCHITECTURE.md)
4. [`EXPERIMENT_READINESS.md`](EXPERIMENT_READINESS.md)
5. [`documentation/SOURCE_ASSET_REGISTER.md`](documentation/SOURCE_ASSET_REGISTER.md)
6. [`documentation/BIBLIOGRAPHY.md`](documentation/BIBLIOGRAPHY.md)
7. [`CHANGELOG.md`](CHANGELOG.md)

## Update contract

Update this folder in the same change whenever work alters:

- participant-visible stimuli, timing, behavior, audio, safety limits, controls, or logs;
- schemas, synchronization, runtime authority, privacy, deployment, or browser support;
- third-party code, human/avatar assets, sound, images, research sources, citations, or licenses;
- validation status, known limitations, experimental claims, or intended study use.

## Website delivery contract

GitHub Pages is the sole deployment target and the GitHub repository is the sole source authority for current work. Do not publish or mirror new revisions through ChatGPT Sites. The former `.openai/hosting.json` binding was intentionally removed; any already-existing Sites deployment is legacy, non-authoritative, and outside the delivery gate unless the user explicitly reverses this decision.

Any change that affects the served website is incomplete while it exists only in a local worktree. This includes participant or operator UI, scenario/runtime behavior, WebXR, audio, synchronization, public assets, dependencies, build configuration, and deployment configuration.

After the relevant validation passes, the contributor must:

1. commit the complete in-scope change to the canonical repository;
2. push the commit to GitHub;
3. publish that exact source revision to the configured GitHub Pages site; and
4. verify the public HTTPS site and every directly affected route.

The canonical public site is `https://georgefejer91.github.io/minimal-social-threat-webxr/`. It currently publishes from the generated `gh-pages` branch. A successful local build or a push to `main` alone is not proof that the website is live. Record the source commit and deployed revision in the handoff or changelog. If authentication, GitHub, Pages, or live verification prevents delivery, report the work as **implemented locally; deployment pending** rather than complete. Pure research or project-memory edits that do not alter the served application do not require a Pages rebuild, although their commits must still be pushed when they accompany website work.

The current product is a deterministic, phone-first social-threat stimulus prototype with a main 2D/3D browser-preview switch, direct optional WebXR launch, a dedicated headset-host route, a bidirectional VDO.Ninja data-only PC operator, a corridor-cleared procedural dusk forest, minimal or bundled human-form crowd avatars, and shadow/angry-agent/viewer-facing articulated-spider conditions. Schema v6 uses a 12-second positive social baseline and a continuous 26/36-second threat approach; staggered awareness, fear, avoidance, escape spread, and motion-derived locomotion replace hard behavioral cuts and running-in-place. A local **Start preview** action runs the complete scene-bound HRTF cue schedule in either browser renderer without a separate audio setting; reset/completion tears that graph down. The trusted local VR/MR entry action likewise starts HRTF audio, and session exit closes it. The threat protocol separates a PPS Kit-derived burst-train localizer from a three-second 70 Hz roughness reconstruction and records a relative-level-only/no-SPL claim. The operator reconstructs authoritative scene state and sends strictly allowlisted requests; it receives no headset media or pose. Remote immersive entry still requires trusted local headset confirmation. This is not a diagnostic and is not yet a validated social-neuroscience paradigm.
