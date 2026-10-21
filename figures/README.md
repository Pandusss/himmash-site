# Interactive figures

Isometric drawings of the machines, built with the [anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, copied into `kit/` from commit 689dcf9). One figure per product, named by the product slug.

| File | What it is |
|---|---|
| `figures/<id>/build.mjs` | Geometry and drawing (Node, imports `../kit/*.mjs` and `../shared.mjs`). |
| `public/figures/<id>.svg` | Written by the build: the drawing with its styles. The page fetches it when the section nears the viewport. |
| `src/figures/<id>/figure.json` | Written by the build: data for the live script, plus `width` and `height`. |
| `src/figures/<id>/text.js` | Texts of the card and the section in RU and EN. |
| `src/figures/<id>/live.js` | Behaviour: `export function mount(stage, { text, data })`. Loaded on demand. |
| `figures/<id>/out/preview*.html` | Standalone pages for the browser checks (not committed). |

A product page shows the section «Как устроено» as soon as `src/figures/<slug>/text.js` and `figure.json` exist (`src/figures/index.ts`, `src/components/AnatomyFigure.astro`).

```sh
node figures/screen-changer/build.mjs --light   # light preview; without the flag, dark
```

Geometry follows the product photos, the specifications and open sources; details marked in each figure's notes are to be confirmed by the engineer.

## The whole line (`granulation-lines`)

The figure on the line's page is the whole KPTBO-300 complex, after the company's own materials (presentation, drawings, photos; `materials/` beside the repository, not committed). It is larger than the others, so it is split into modules:

| File | What it is |
|---|---|
| `granulation-lines/layout.mjs` | Where things stand: rows, water header and collector, T-5000, floor. |
| `granulation-lines/lib.mjs` | Helpers bound to the projection: solids, frustums and hoppers, convex parts, motors and gearboxes, legs and braces, pipes with flow marks; and the live parts — `rotor` (blades and screw flights), `flow` (material dots along a polyline), `slide` (slats, belts, bags), `ripples`, `heat`. |
| `granulation-lines/units/*.mjs` | One module per unit (or a few per file); each returns its drawing as painter items and records its water ports. |
| `granulation-lines/washing.mjs`, `pelletizing.mjs`, `water.mjs` | The two rows and the water network. |
| `granulation-lines/build.mjs` | Camera, painter's order, styles; writes the SVG and `figure.json` (rotors, flows, slides, unit links). |

`src/figures/granulation-lines/live.js` turns the rotors (blade shapes cached per quarter degree, flights slid along their axis inside a clip), moves the material and the slides, runs the start-up wave, the tour, the unit card, the material path (key P) and the camera. With `#record` at the end of the page's URL, time only moves when `window.__line.advance(dt)` is called and the CSS animations follow the same clock, so a video can be recorded frame by frame.
