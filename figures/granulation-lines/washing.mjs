// The washing row, left to right, in the order the material meets it (presentation, slide 5): bale breaker, belt,
// two-shaft shredder, screw conveyor, two-shaft primary washer, friction washer I, intensive washer, friction washer
// II, flotation bath with five paddle drums, transfer conveyor, rinse bath, discharge screw, centrifuge, SPU-500
// dryer, air separator with the pneumatic blower. Each unit lives in units/*.mjs and records its water ports.
import { YB } from "./layout.mjs";
import { breaker } from "./units/breaker.mjs";
import { shredder } from "./units/shredder.mjs";
import { wash2 } from "./units/wash2.mjs";
import { friction } from "./units/friction.mjs";
import { bath } from "./units/bath.mjs";
import { intense, centrifuge, dryer, aero } from "./units/process.mjs";
import { beltConveyor, screwConveyor } from "./units/conveyors.mjs";

export function washingRow(L) {
  const units = [];
  const ports = {};
  const unit = (id, center, parts) => units.push({ id, items: [{ key: L.depth(center), svg: parts.join("") }] });

  units.push(breaker(L));
  unit("belt", [6650, YB, 1500], beltConveyor(L, "belt", [5650, YB, 650], [7700, YB, 2450], 800, { legsAt: [0.3, 0.8] }));
  units.push(...shredder(L));
  unit("screw1", [10150, YB + 250, 1100], screwConveyor(L, "screw1", [9300, YB + 250, 480], [11000, YB + 250, 1900], 170, { stands: [0.45] }));
  units.push(wash2(L, ports));
  units.push(friction(L, ports, "fric1", [14650, YB, 650], [16300, YB, 2150]));
  units.push(intense(L, ports));
  units.push(friction(L, ports, "fric2", [19850, YB, 650], [21500, YB, 2150]));
  units.push(bath(L, ports, "flot", 22100, 4200, [450, 1250, 2050, 2850, 3650]));
  unit("transfer", [26850, YB, 1700], beltConveyor(L, "transfer", [26350, YB, 1300], [27350, YB, 2050], 900, { legsAt: [0.5], sideH: 160, cleats: 180, speed: 200 }));
  units.push(bath(L, ports, "rinse", 27450, 2600, [500, 1300, 2100]));
  unit("screw2", [30600, YB + 250, 1700], screwConveyor(L, "screw2", [29900, YB + 250, 1200], [31300, YB + 250, 2300], 170, { stands: [0.5], inlet: false }));
  units.push(centrifuge(L, ports));
  units.push(dryer(L, ports));
  units.push(aero(L));
  return { units, ports };
}
