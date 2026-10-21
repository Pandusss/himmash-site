// T-5000 water treatment and the water network. The T-5000 follows the company's own figure: a receiving
// tank with a step screen and a debris bin, an electroflotation bath with its electrode pack, scraper and
// sludge trough, a battery of mechanical and sorption filters, a bactericidal cell and the clean water tank.
// Clean water (blue) leaves it by a pump, climbs a riser and runs along the far side of the washing row with a
// drop into every washer and bath; dirty water (brown) leaves every washer at the bottom, runs along the aisle
// in a collector and back into the receiving tank. The pneumatic pipe lifts the dry flakes over the aisle.
import { YB, CLEAN, DIRTY, T5 } from "./layout.mjs";

export function waterSystem(L, ports) {
  const { box, cylZ, cylY, cylX, hopper, cavity, water, clipped, motor, leg, legs, path3, depth, pipe, flange, G } = L;
  const units = [];
  const items = [];

  // ---------- T-5000
  {
    const p = [];
    const { x, y, w, d } = T5;
    p.push(box(x, y, w, d, 0, 140, "lo", { bevel: 0.4, seam: 70 }));
    // 1 Receiving tank with its step screen and debris bin.
    const rt = [x + 200, y + 400, 1400, 1700];
    p.push(box(rt[0], rt[1], rt[2], rt[3], 140, 1400, "mid", { seam: 300, r: 20 }));
    const m1 = [[rt[0] + 50, rt[1] + 50, 1540], [rt[0] + rt[2] - 50, rt[1] + 50, 1540], [rt[0] + rt[2] - 50, rt[1] + rt[3] - 50, 1540], [rt[0] + 50, rt[1] + rt[3] - 50, 1540]];
    p.push(cavity(m1), clipped(path3(m1), water(m1.map(([a, b]) => [a, b, 1350]), "dirty")), L.L(path3(m1), { tone: "lo" }));
    p.push(L.rod([rt[0] + 300, rt[1] + rt[3] - 200, 1250], [rt[0] + 300, rt[1] + rt[3] + 500, 2100], 160, "hi"));
    p.push(box(rt[0] + 100, rt[1] + rt[3] + 450, 600, 500, 140, 600, "mid", { bevel: 0.4 }));
    // 2 Electroflotation bath with the electrode pack and the scraper bridge.
    const ef = [x + 1800, y + 300, 2000, 1900];
    p.push(box(ef[0], ef[1], ef[2], ef[3], 140, 1200, "mid", { seam: 300, r: 20 }));
    const m2 = [[ef[0] + 50, ef[1] + 50, 1340], [ef[0] + ef[2] - 50, ef[1] + 50, 1340], [ef[0] + ef[2] - 50, ef[1] + ef[3] - 50, 1340], [ef[0] + 50, ef[1] + ef[3] - 50, 1340]];
    p.push(cavity(m2), clipped(path3(m2), water(m2.map(([a, b]) => [a, b, 1250]), "mid") + Array.from({ length: 6 }, (_, i) => box(ef[0] + 300 + i * 220, ef[1] + 300, 30, ef[3] - 600, 500, 760, "lo", { bevel: 0.2, r: 4, steps: 2 })).join("")), L.L(path3(m2), { tone: "lo" }));
    p.push(box(ef[0] + 900, ef[1] - 60, 160, ef[3] + 120, 1400, 120, "hi", { bevel: 0.3 }));
    p.push(box(ef[0] + ef[2], ef[1] + 200, 300, ef[3] - 400, 900, 300, "mid", { bevel: 0.3 }));
    // 3 Filter battery: four columns, 4 bactericidal cell, 5 clean water tank.
    for (const [i, fy] of [[0, y + 600], [1, y + 1400]]) for (const fx of [x + 4100, x + 4700]) {
      p.push(cylZ(fx, fy + i * 0, 140, 1700, 230, "hi"), L.turned(fx, fy, 1700, [[0, 230], [120, 200, 1], [200, 0, 1]], "hi"));
    }
    p.push(cylZ(x + 4400, y + 2400, 140, 1000, 160, "mid"));
    const ct = [x + 3900, y + 2700, 2000, 700];
    p.push(box(ct[0], ct[1], ct[2], ct[3], 140, 1500, "hi", { seam: 300, r: 20 }));
    p.push(box(x + 5400, y + 1900, 500, 500, 140, 1800, "mid", { seam: 1600 }));
    // The clean water pump.
    p.push(box(x + 600, y + d - 400, 700, 300, 140, 120, "lo", { bevel: 0.3 }));
    p.push(motor([x + 1100, y + d - 250, 420], [x + 650, y + d - 250, 420], 140));
    p.push(cylY(y + d - 330, y + d - 170, x + 1250, 420, 160, "mid"));
    units.push({ id: "t5000", items: [{ key: depth([x + w / 2, y + d / 2, 800]), svg: p.join("") }] });
  }

  // ---------- clean water: pump → riser → across the aisle → header along the far side → drops
  // The pump's line runs low along the floor to the far left corner, climbs a riser there and becomes the header.
  const RX = -950;
  const cleanRoute = [[T5.x + 1250, T5.y + T5.d - 170, 580], [T5.x + 1250, T5.y + T5.d + 150, 580], [T5.x + 1250, T5.y + T5.d + 150, 320], [RX, T5.y + T5.d + 150, 320], [RX, CLEAN.y, 320], [RX, CLEAN.y, CLEAN.z], [CLEAN.x1, CLEAN.y, CLEAN.z]];
  items.push(...pipe(cleanRoute, CLEAN.r, { cls: "clean", flow: "clean", bend: 5 }));
  const tees = [];
  for (const [id, port] of Object.entries(ports)) {
    if (!port.clean) continue;
    const [px, py, pz] = port.clean;
    tees.push(px);
    // A drop that reaches into a tank over its far wall is drawn after the tank from the wall on.
    const drop = pipe([[px, CLEAN.y, CLEAN.z], [px, CLEAN.y, pz + 260], [px, py, pz + 260], [px, py, pz + 30]], 32, { cls: "clean", flow: "clean", bend: 4 });
    if (port.inside !== undefined) for (const it of drop) if (it.mid && it.mid[1] > port.inside - 60) it.key = port.key + 1;
    items.push(...drop);
  }
  for (const tx of tees) items.push({ key: depth([tx, CLEAN.y, CLEAN.z]) + 1, svg: L.S(G.sphereOf([tx, CLEAN.y, CLEAN.z], CLEAN.r * 1.4, L.P), { tone: "mid" }) });
  // Header brackets on posts along the far side.
  for (let px = 1200; px < CLEAN.x1; px += 4000) items.push({ key: depth([px, CLEAN.y - 100, 1500]) - 5, svg: leg(px, CLEAN.y - 140, 0, CLEAN.z - CLEAN.r, 60) + box(px - 60, CLEAN.y - 160, 120, 200, CLEAN.z - CLEAN.r - 40, 40, "lo", { bevel: 0.2 }) });

  // ---------- dirty water: drains → collector along the aisle → into the receiving tank
  const collector = [[DIRTY.x1, DIRTY.y, DIRTY.z], [T5.x + 900, DIRTY.y, DIRTY.z], [T5.x + 900, T5.y + 250, DIRTY.z], [T5.x + 900, T5.y + 250, 1200], [T5.x + 900, T5.y + 450, 1200]];
  items.push(...pipe(collector, DIRTY.r, { cls: "dirty", flow: "dirty", bend: 4 }));
  for (const [id, port] of Object.entries(ports)) {
    if (!port.dirty) continue;
    const [px, py, pz] = port.dirty;
    items.push(...pipe([[px, py, pz], [px, py + 120, pz], [px, py + 120, DIRTY.z + 60], [px, DIRTY.y, DIRTY.z + 60]], 40, { cls: "dirty", flow: "dirty", bend: 3 }));
    items.push({ key: depth([px, DIRTY.y, DIRTY.z]) + 1, svg: L.S(G.sphereOf([px, DIRTY.y, DIRTY.z], DIRTY.r * 1.35, L.P), { tone: "mid" }) });
  }
  for (let px = 7000; px < DIRTY.x1; px += 3500) items.push({ key: depth([px, DIRTY.y, 100]) - 5, svg: box(px - 80, DIRTY.y - 90, 160, 180, 0, DIRTY.z - DIRTY.r, "lo", { bevel: 0.2, r: 6 }) });

  // ---------- pneumatic line from the blower over the aisle into the storage hopper
  const air = [[40250, YB + 1150, 640], [40250, YB + 1400, 640], [40250, YB + 1400, 4300], [40250, 2550, 4300], [38500, 2550, 4300], [38500, 2550, 3700]];
  items.push(...pipe(air, 90, { cls: "air", flow: "air", bend: 4 }));

  return { units, items };
}
