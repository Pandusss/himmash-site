// Интенсивная механическая мойка: the fast paddle rotor of the KPTBO-300 line seen through a window in its housing,
// cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs). `node figures/intensive-washer/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "intensive-washer", units: ["intense"], lit: '[data-rotor="intense"]' });
