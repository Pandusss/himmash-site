// Аэросепаратор: the zig-zag air separation column of the KPTBO-300 line with the cyclone for the light fraction and
// the blower of the pneumatic line, cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs).
// `node figures/air-separator/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "air-separator", units: ["aero"], lit: '[data-sh="column"]' });
