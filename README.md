# Minimal Social Threat WebXR

A small, procedural WebXR research prototype with two browser views:

- **Headset scene:** six minimalist social agents surround the observer; a stylized tiger or angry agent appears, approaches, and causes the group to display alert/fear expressions and avoid it.
- **Companion view:** a realtime top-down diagram, scene readback, and bounded start/pause/reset/configuration controls.

The app supports a virtual dusk-clearing background, WebXR passthrough (`immersive-ar`), and an ordinary desktop preview. No image, audio, or 3D-model downloads are required.

## Important research boundary

This repository is a **stimulus-building prototype**, not a pre-validated paradigm, diagnostic, or emotion detector. Its procedural faces and avoidance behavior have not themselves been validated. Before collecting study data, pre-register the operationalization and pilot-test at least:

- threat/fear recognition and perceived intensity;
- realism, presence, discomfort, and simulator sickness;
- timing, minimum distance, manipulation checks, and demand characteristics;
- device/browser compatibility and cultural or population-specific interpretation.

The threat has a code-tested **1.8 m minimum distance**. “Gentle” takes 18 seconds to approach; “Standard” takes 12 seconds. Either XR controller trigger pauses movement, and the companion can pause or reset the scene.

## Quick start

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`, then choose a view. Direct links are:

- `http://localhost:3000/?view=headset`
- `http://localhost:3000/?view=companion`

For a real headset, host the exported site over HTTPS. On the headset, review the content note, choose VR or MR, and explicitly start the scene broadcast. In a second browser, open the companion and explicitly connect. No signaling or peer connection starts on page load.

## Validation commands

```bash
npm run test:unit
npm run lint
npm run build
node --test tests/build-output.test.mjs
```

`npm test` runs the complete sequence. The static export is written to `dist/client/`.

## GitHub Pages

The published repository uses a generated `gh-pages` branch. For automatic
deployment on later pushes, copy `docs/github-pages-workflow.yml` to
`.github/workflows/pages.yml` after authorizing the GitHub CLI or token for
the `workflow` scope. The workflow builds and publishes `dist/client/` on
pushes to `main`:

1. Create an empty GitHub repository.
2. Add this directory as its contents and push to `main`.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Wait for the **Deploy static WebXR site** workflow.
5. Open `https://<account>.github.io/<repository>/?view=headset` on the headset.

The workflow supplies the repository base path. If you use a custom domain at the root, change `PAGES_BASE_PATH` and `NEXT_PUBLIC_BASE_PATH` to empty strings in the workflow.

## Runtime authority and synchronization

| Concern | Authority | Readback |
| --- | --- | --- |
| Scenario clock, phase, agent behavior, threat distance | Headset page | Versioned scene frame at up to 20 Hz |
| Start/pause/reset/threat/intensity request | Companion page | Applied only by headset; command ID returns in a headset-owned frame |
| Rendering | Each browser | Same positions/phase from the latest accepted frame |
| Logging | Headset page | Downloadable bounded CSV; never uploaded by this app |

The scene transport follows the Affect Tracker’s remote-Flubber pattern: bundled VDO.Ninja SDK 1.5.5, a data-only public discovery room, anonymous random stream IDs, no media tracks, `ordered: false`, `maxRetransmits: 0`, newest-state backpressure, sequence validation, automatic selection only when one source exists, and an explicit stale state. The richer scene uses versioned JSON rather than Affect Tracker’s 12-byte X/Y frame.

### Wire data

The headset sends only:

- anonymous in-memory session ID;
- scenario configuration, phase, elapsed scenario time, and pause/run state;
- fixed observer origin and procedural agent/threat positions/expressions;
- last applied companion command ID.

The companion sends an allowlisted command: `start`, `pause`, `resume`, `reset`, `set-threat`, or `set-intensity`. It cannot send code or arbitrary scene state. The app does **not** request microphone, camera, media capture, controller pose, headset pose, participant name, or physiology.

VDO.Ninja still uses third-party signaling and STUN/TURN. WebRTC peers may learn IP addresses; relay routing can affect latency and privacy. The discovery room is public and has no study-grade authentication. For sensitive or multi-site deployment, replace the public discovery boundary with an institution-operated authenticated signaling service.

## Study log

The headset holds at most 12,000 rows in memory and exports CSV on demand. Rows contain schema version, anonymous session ID, client time, event/source, scenario time, phase/run state, threat kind/distance, and the complete versioned procedural scene as JSON. Refreshing closes the session and clears unsaved data.

## Physical acceptance checklist

The automated checks do not qualify a headset study. Before claiming support, record:

- headset model, OS, browser version, and served HTTPS URL;
- `immersive-vr` and `immersive-ar` entry/exit;
- virtual background and compositor passthrough behavior;
- controller-trigger pause and companion pause/reset;
- direct and relayed VDO routes, multi-source selection, disconnect, stale hold, and recovery;
- 1.8 m visual/behavioral limit, Gentle/Standard timing, CSV download, and no unexpected permissions;
- at least a 15-minute thermal/network soak and participant-visible comfort review.

## Repository map

- `components/XrScene.tsx` — Three.js desktop/WebXR renderer and procedural agents.
- `lib/scenario.ts` — deterministic scenario timeline and safety contract.
- `lib/scene-sync.ts` — VDO.Ninja transport, codec, discovery, command validation, and stale handling.
- `components/TopdownScene.tsx` — companion canvas renderer.
- `components/StudyApp.tsx` — experiment UI, authority application, logging, and routing.
- `tests/` — scenario, transport, vendored-SDK, privacy, and export checks.

## Licenses and provenance

Project-authored code is MIT licensed. The unmodified VDO.Ninja SDK 1.5.5 distribution and readable source are under MPL-2.0; its license is packaged next to the SDK. See `THIRD_PARTY_NOTICES.md` for pinned hashes and source links.
