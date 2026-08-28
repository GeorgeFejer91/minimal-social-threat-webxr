# SVG facial-expression assets

These files are deterministic exports of the canonical cubic-Bézier geometry in `lib/facial-expression.ts`.

- `planar/` contains standalone square SVG endpoints.
- `spherical/` contains transparent 2:1 equirectangular SVG mappings aligned to the procedural head's forward axis.
- `manifest.json` records the format, source, and validation boundary.

Do not hand-edit generated SVGs. Run `npm run assets:faces` from the repository root after changing canonical geometry, then run the facial-expression tests to verify exact parity.

The assets are project-authored and resolution-independent. They are evidence-grounded prototypes, not normed, culturally universal, or independently validated emotion stimuli.
