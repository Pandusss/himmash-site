// Ванна флотации с барабанами: the flotation bath of the KPTBO-300 line with its five paddle drums, the transfer
// conveyor and the rinse bath, cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs).
// `node figures/flotation-bath/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({
  id: "flotation-bath",
  units: ["flot", "transfer", "rinse"],
  azimuth: 38,
  elevation: 34,
  lit: '[data-rotor^="flot-"]',
});
