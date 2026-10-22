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
  // Under the shredder its outlet chute drops the pieces to the side, into the screw that lifts them into the washer.
  unit("screw1", [10150, YB + 500, 1100], [L.transfer("shred-out", [[8450, YB + 300, 690], [8650, YB + 820, 560]], { w: 300, kind: "raw" }), ...screwConveyor(L, "screw1", [8650, YB + 820, 330], [11550, YB + 200, 2000], 170, { stands: [0.4, 0.75], inlet: false })]);
  units.push(wash2(L, ports));
  units.push(friction(L, ports, "fric1", [14650, YB, 650], [16300, YB, 2950], { inlet: [[14200, YB, 1500], [14420, YB, 1400]], kindIn: "raw", outlet: [[17230, YB, 2620]] }));
  units.push(intense(L, ports));
  units.push(friction(L, ports, "fric2", [19200, YB, 250], [20850, YB, 2300], { inlet: [[18450, YB, 1030]], kindIn: "wash", outlet: [[22300, YB, 1480]] }));
  units.push(bath(L, ports, "flot", 22100, 4200, [450, 1250, 2050, 2850, 3650]));
  unit("transfer", [26850, YB, 1700], beltConveyor(L, "transfer", [26350, YB, 1300], [27350, YB, 2050], 900, { legsAt: [0.5], sideH: 160, cleats: 180, speed: 200, kind: "clean" }));
  // The rinse bath is a plain bath (company model of the flotator: drums on the first bath only).
  units.push(bath(L, ports, "rinse", 27450, 2600, []));
  unit("screw2", [30800, YB + 250, 1700], screwConveyor(L, "screw2", [29900, YB + 250, 1200], [31850, YB + 250, 2350], 170, { stands: [0.5], inlet: false, kind: "clean" }));
  units.push(centrifuge(L, ports));
  units.push(dryer(L, ports));
  units.push(aero(L));
  return { units, ports };
}
