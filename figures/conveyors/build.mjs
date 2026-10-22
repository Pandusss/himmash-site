// Ленточные и шнековые транспортёры: the two kinds of conveyor that join the KPTBO-300 line, side by side — an inclined
// belt conveyor with side boards (feed to the shredder) and an inclined screw conveyor in a tube with its inlet hopper
// (lift into the washer, into the centrifuge). The same builders as the whole-line drawing (units/conveyors.mjs).
// `node figures/conveyors/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";
import { beltConveyor, screwConveyor } from "../granulation-lines/units/conveyors.mjs";

await unitFigure({
  id: "conveyors",
  make: (L) => [
    { id: "screw", items: [{ key: L.depth([1500, -1800, 1000]), svg: screwConveyor(L, "cv-screw", [0, -1800, 420], [3000, -1800, 1750], 170, { stands: [0.4, 0.75] }).join("") }] },
    { id: "belt", items: [{ key: L.depth([1300, 0, 1000]), svg: beltConveyor(L, "cv-belt", [0, 0, 450], [2700, 0, 1600], 800, { legsAt: [0.3, 0.8] }).join("") }] },
  ],
  lit: '[data-rotor="cv-screw"]',
});
