// Охлаждение и сушка гранул: the hot-cut head's water ring and the centrifugal pellet dryer of the KPTBO-300 line with
// its water tank and pump, cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs).
// `node figures/pellet-dryer/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "pellet-dryer", units: ["head", "pelletdry"], lit: '[data-rotor="pelletdry"]' });
