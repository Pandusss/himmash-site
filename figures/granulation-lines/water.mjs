// T-5000 water treatment and the water network. The T-5000 follows the company's own figure: a receiving
// tank with a step screen and a debris bin, an electroflotation bath with its electrode pack, scraper and
// sludge trough, a battery of mechanical and sorption filters, a bactericidal cell and the clean water tank.
// Clean water (blue) leaves it by a pump, climbs a riser and runs along the far side of the washing row with a
// drop into every washer and bath; dirty water (brown) leaves every washer at the bottom, runs along the aisle
// in a collector and back into the receiving tank. The pneumatic pipe lifts the dry flakes over the aisle.
import { YB, CLEAN, DIRTY, T5 } from "./layout.mjs";
import { t5000 } from "./units/t5000.mjs";

export function waterSystem(L, ports) {
  const { box, cylZ, cylY, cylX, hopper, cavity, water, clipped, motor, leg, legs, path3, depth, pipe, flange, G } = L;
  const units = [];
  const items = [];

  // ---------- T-5000
  const t5 = t5000(L);
  units.push(t5.unit);
  items.push(...t5.items);

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
    // Hand valve on the drop's vertical leg: a bulged body, bonnet, stem and handwheel facing the viewer.
    const vz = CLEAN.z - 420;
    const vk = depth([px, CLEAN.y, vz]) + 2;
    const FV = G.frameOf([px, CLEAN.y, vz - 70], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const valve = [L.S(G.solidOf([[0, 40], [20, 40], [40, 62, 1], [100, 62, 1], [120, 40], [140, 40]], FV, L.P), { tone: "mid" })];
    const FW = G.frameOf([px, CLEAN.y + 60, vz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    valve.push(L.S(G.disc(0, 70, 22, FW, L.P), { tone: "mid" }), L.S(G.ringBand(70, 90, 70, 95, FW, L.P), { tone: "hi" }));
    items.push({ key: vk, svg: valve.join("") });
  }
  for (const tx of tees) items.push({ key: depth([tx, CLEAN.y, CLEAN.z]) + 1, svg: L.S(G.sphereOf([tx, CLEAN.y, CLEAN.z], CLEAN.r * 1.4, L.P), { tone: "mid" }) });
  // Header brackets on posts along the far side.
  for (let px = 1200; px < CLEAN.x1; px += 4000) {
    items.push({ key: depth([px, CLEAN.y - 100, 1500]) - 5, svg: leg(px, CLEAN.y - 140, 0, CLEAN.z - CLEAN.r, 60) + box(px - 60, CLEAN.y - 160, 120, 200, CLEAN.z - CLEAN.r - 40, 40, "lo", { bevel: 0.2 }) });
    items.push({ key: depth([px, CLEAN.y, CLEAN.z]) + 3, svg: L.S(G.ringBand(-20, 20, CLEAN.r, CLEAN.r + 14, G.frameOf([px, CLEAN.y, CLEAN.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), L.P), { tone: "mid" }) });
  }
  // Pressure gauge on the riser: a dial facing the viewer on a short neck.
  {
    const gx = -950, gy = CLEAN.y + 700, gz = 1500;
    const FN = G.frameOf([gx, gy, gz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const FD = G.frameOf([gx + 120, gy + 30, gz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    items.push({ key: depth([gx + 120, gy + 60, gz]) + 2, svg: L.S(G.disc(0, 120, 14, FN, L.P), { tone: "mid" }) + L.S(G.disc(0, 40, 75, FD, L.P), { tone: "hi" }) + L.L(G.circleOf(FD, 40, 58, L.P), { tone: "lo" }) + L.L(L.path3([[gx + 120, gy + 70, gz], [gx + 160, gy + 70, gz + 35]], false), { tone: "hi", free: "end" }) });
  }

  // ---------- dirty water: drains → collector along the aisle → into the receiving tank
  const collector = [[DIRTY.x1, DIRTY.y, DIRTY.z], [T5.x + 900, DIRTY.y, DIRTY.z], [T5.x + 900, T5.y + 250, DIRTY.z], [T5.x + 900, T5.y + 250, 1200], [T5.x + 900, T5.y + 450, 1200]];
  items.push(...pipe(collector, DIRTY.r, { cls: "dirty", flow: "dirty", bend: 4 }));
  for (const [id, port] of Object.entries(ports)) {
    if (!port.dirty) continue;
    const [px, py, pz] = port.dirty;
    items.push(...pipe([[px, py, pz], [px, py + 120, pz], [px, py + 120, DIRTY.z + 60], [px, DIRTY.y, DIRTY.z + 60]], 40, { cls: "dirty", flow: "dirty", bend: 3 }));
    items.push({ key: depth([px, DIRTY.y, DIRTY.z]) + 1, svg: L.S(G.sphereOf([px, DIRTY.y, DIRTY.z], DIRTY.r * 1.35, L.P), { tone: "mid" }) });
  }
  for (let px = 7000; px < DIRTY.x1; px += 3500) {
    items.push({ key: depth([px, DIRTY.y, 100]) - 5, svg: box(px - 80, DIRTY.y - 90, 160, 180, 0, DIRTY.z - DIRTY.r, "lo", { bevel: 0.2, r: 6 }) });
    items.push({ key: depth([px, DIRTY.y, DIRTY.z]) + 3, svg: L.S(G.ringBand(-20, 20, DIRTY.r, DIRTY.r + 16, G.frameOf([px, DIRTY.y, DIRTY.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]), L.P), { tone: "mid" }) });
  }

  // ---------- pneumatic line from the blower over the aisle into the storage hopper
  const air = [[40250, YB + 1150, 640], [40250, YB + 1400, 640], [40250, YB + 1400, 4300], [40250, 2550, 4300], [38500, 2550, 4300], [38500, 2550, 3700]];
  items.push(...pipe(air, 90, { cls: "air", flow: "air", bend: 4 }));

  return { units, items };
}
