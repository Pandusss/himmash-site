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
