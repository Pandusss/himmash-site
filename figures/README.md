# Interactive figures

Isometric drawings built with the [anatomy](https://github.com/wheresryan22/anatomy) kit (MIT, copied into `kit/` from commit 689dcf9).

`screen-changer/build.mjs` builds the slide-plate screen changer:

- `public/figures/screen-changer.svg` — the drawing with its styles; the site fetches it when the section comes into view;
- `src/figures/screen-changer/figure.json` — the screen vector of the plate stroke for the live script;
- `figures/screen-changer/out/preview.html` (`--light` for the light theme) — a standalone page for checks.

Texts are in `src/figures/screen-changer/text.js`, behaviour in `live.js`, the card in `src/components/ScreenChangerFigure.astro`.

```sh
node figures/screen-changer/build.mjs --light
```

Geometry follows the product photo and the specifications (250 mm windows, 340 mm pitch, 2.5 s change, filter centre 1 100 mm above the floor). The direction of the plate stroke and the sensor position are to be confirmed by the engineer.
