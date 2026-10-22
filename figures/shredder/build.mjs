// Двухвальный шредер: the shredder of the KPTBO-300 line with its hopper cut open over the two cutter shafts,
// cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs). `node figures/shredder/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "shredder", units: ["shredder"], lit: '[data-rotor^="shred-"]' });
