// Сушка СПУ-500: the dryer of the KPTBO-300 line with its loading and unloading screws and the thermo-block,
// cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs). `node figures/dryer-spu-500/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "dryer-spu-500", units: ["dryer"], lit: '[data-rotor="dryer"]' });
