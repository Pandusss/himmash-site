// 7 Intensive washer, 11 centrifuge, 12 SPU-500 dryer and 13 air separator: each housing has a window cut where the
// work happens, so the rotor inside is seen turning.
import { YB } from "../layout.mjs";
import { screwConveyor } from "./conveyors.mjs";

// A rectangular window on a vertical face at y (normal +y), x0–x1 and z0–z1.
const faceWindow = (L, y, x0, x1, z0, z1) => L.path3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);

export function intense(L, ports) {
  const { box, legs, brace, motor, rotor, frustum, clipped, bolts, depth, prismX, path3, flow } = L;
  const p = [];
  const x = 16900, w = 1800, y0 = YB - 460, d = 920, z0 = 560, z1 = 1480;
  const [far, near] = legs(x, y0, w, d, z0, { s: 90, inset: 70 });
  p.push(far, brace([x + 70, y0 + 70, 120], [x + w - 70, y0 + 70, z0 - 40], 50));
  p.push(box(x, y0, w, d, z0, z1 - z0, "mid", { seams: [z0 + 100, z1 - 160], r: 30 }));
  p.push(prismX(x, x + w, [[y0, z1], [y0 + d, z1], [y0 + d - 140, z1 + 280], [y0 + 140, z1 + 280]], "hi"));
  // Window in the near face over the rotor.
  const zc = (z0 + z1) / 2 + 60;
  const wd = faceWindow(L, y0 + d, x + 220, x + w - 220, zc - 300, zc + 300);
  const blades = [];
  for (let i = 0; i < 11; i++) for (let k = 0; k < 4; k++) blades.push({ s: 230 + i * 130, phase: k * (Math.PI / 2) + i * 0.35, type: 0 });
  p.push(clipped(wd, `<path class="ln-cavity" d="${wd}"/>` + rotor("intense", { o: [x, YB, zc], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 2.2, types: [{ r0: 70, r1: 330, w: 70, t: 24, beta: 0.5 }], blades, shaft: { s0: 120, s1: w - 120, r: 70 } }) + flow("intense-churn", [[x + 260, YB + 200, zc - 200], [x + w - 260, YB + 200, zc + 150]], { speed: 900, count: 12, size: 28, spread: 220, kind: "wash" })));
  p.push(L.L(wd, { tone: "hi" }));
  const fr = [];
  for (let i = 0; i < 9; i++) fr.push([x + 120 + i * 210, y0 + d, z1 - 60]);
  p.push(bolts(fr));
  // Drive: bearing on the right end, belt guard down to the motor on its base.
  p.push(box(x + w, YB - 120, 140, 240, zc - 120, 240, "mid", { bevel: 0.3, r: 10 }));
  p.push(box(x + w + 140, YB - 200, 180, 400, 260, zc + 100 - 260, "hi", { bevel: 0.6, r: 40 }));
  p.push(box(x + w - 100, YB - 340, 900, 680, 0, 120, "lo", { bevel: 0.3 }));
  p.push(motor([x + w + 350, YB, 400], [x + w + 820, YB, 400], 190));
  p.push(frustum([x + 140, YB - 300, 420, 600], z1 + 280, [x + 80, YB - 360, 540, 720], z1 + 560, "mid"));
  p.push(frustum([x + w - 450, YB - 250, 380, 500], z0, [x + w - 400, YB - 200, 280, 400], z0 - 260, "mid"));
  p.push(near, brace([x + 70, y0 + d - 70, 120], [x + w - 70, y0 + d - 70, z0 - 40], 50));
  ports.intense = { clean: [x + w * 0.5, y0 + 140, z1 + 280], key: depth([x + w / 2, YB, 1000]), dirty: [x + 400, y0 + d, z0 + 50] };
  return { id: "intense", items: [{ key: depth([x + w / 2, YB, 1000]), svg: p.join("") }] };
}

export function centrifuge(L, ports) {
  const { box, prismX, cylX, cylY, cylZ, motor, rotor, clipped, bolts, depth, path3, S, G, P, flow } = L;
  const p = [];
  const x0 = 31600, x1 = 33200, r = 480, zc = 1000, zb = 280;
  p.push(box(x0 - 120, YB - 640, x1 - x0 + 900, 1280, 0, zb, "lo", { seam: 140 }));
  const arc = Array.from({ length: 17 }, (_, i) => [r * Math.cos((i / 16) * Math.PI), zc + r * Math.sin((i / 16) * Math.PI)]);
  const prof = [[r, zb], ...arc, [-r, zb]].map(([py, pz]) => [YB + py, pz]);
  p.push(prismX(x0, x1, prof, "hi"));
  // Window in the near face: the screen basket and the rotor's paddles.
  const wd = faceWindow(L, YB + r, x0 + 200, x1 - 200, zb + 140, zc + 60);
  const blades = [];
  for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) blades.push({ s: 260 + i * 130, phase: k * (Math.PI / 2) + i * 0.6, type: 0 });
  p.push(clipped(wd, `<path class="ln-cavity" d="${wd}"/>` + rotor("centrifuge", { o: [x0, YB, zc - 60], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 3, types: [{ r0: 90, r1: 330, w: 80, t: 22, beta: 0.6 }], blades, shaft: { s0: 140, s1: x1 - x0 - 140, r: 90 } })));
  p.push(L.L(wd, { tone: "hi" }));
  const sb = [];
  for (let i = 0; i < 7; i++) sb.push([x0 + 120 + i * 230, YB + r, zb + 60]);
  p.push(bolts(sb));
  // Inlet on top of the left end (from the discharge screw), outlet duct on the right end into the dryer's hopper.
  p.push(cylZ(x0 + 250, YB + 250, zc + r - 60, zc + r + 300, 140, "mid"));
  p.push(cylX(x1, x1 + 80, YB, zc + 120, 220, "mid"));
  p.push(L.rod([x1 + 80, YB, zc + 120], [x1 + 500, YB + 120, zc + 500], 150, "mid"));
  // Belt drive: motor on the base, belt guard on the right end.
  p.push(box(x1 + 60, YB - 250, 200, 500, zb, zc + 100 - zb, "hi", { bevel: 0.6, r: 40, seam: zc - 200 }));
  p.push(motor([x1 + 270, YB + 380, 520], [x1 + 760, YB + 380, 520], 170));
  p.push(cylY(YB + r - 40, YB + r + 120, x0 + 500, zb + 80, 60, "mid"));
  ports.centrifuge = { dirty: [x0 + 500, YB + r + 120, zb + 80] };
  return { id: "centrifuge", items: [{ key: depth([(x0 + x1) / 2, YB, 900]), svg: p.join("") }] };
}

export function dryer(L, ports) {
  const { box, cylX, cylZ, motor, gearbox, rotor, clipped, bolts, depth, path3, hopper, frustum, flow } = L;
  const p = [];
  const x = 34800, w = 3500, y0 = YB - 750, d = 1500, z0 = 300, z1 = 2300;
  // Loading screw with its hopper (Ø400, 1100 long) and gear motor.
  p.push(...screwConveyor(L, "dryer-in", [33800, YB + 120, 1080], [x, YB + 120, 1080], 200, { stands: [0.4], inlet: false, speed: 0.8, kind: "clean" }).filter((_, i, arr) => true));
  p.push(hopper([33980, YB - 80, 420, 420], 1290, [33830, YB - 230, 720, 720], 1780, "mid"));
  // Body on vibration mounts.
  for (const vx of [x + 250, x + w - 250]) for (const vy of [y0 + 150, y0 + d - 150]) p.push(box(vx - 110, vy - 90, 220, 180, 0, z0, "lo", { bevel: 0.3 }), cylZ(vx, vy, z0 - 120, z0, 70, "mid"));
  p.push(box(x, y0, w, d, z0, z1 - z0, "mid", { seams: [z0 + 160, z1 - 140], r: 25 }));
  // Hatches: two upper and three lower; the middle lower one is open and shows the paddle shaft inside.
  const fy = y0 + d;
  const hatches = [[x + 400, 1450, 1150, 650], [x + 1950, 1450, 1150, 650], [x + 350, 480, 900, 360], [x + 2250, 480, 900, 360]];
  p.push(L.L(hatches.map(([hx, hz, hw, hh]) => path3([[hx, fy, hz], [hx + hw, fy, hz], [hx + hw, fy, hz + hh], [hx, fy, hz + hh]])).join(""), { tone: "lo" }));
  p.push(bolts(hatches.flatMap(([hx, hz, hw, hh]) => [[hx + 40, fy, hz + 40], [hx + hw - 40, fy, hz + 40], [hx + 40, fy, hz + hh - 40], [hx + hw - 40, fy, hz + hh - 40]])));
  const wd = faceWindow(L, fy, x + 1300, x + 2200, 460, 860);
  const blades = [];
  for (let i = 0; i < 26; i++) for (let k = 0; k < 2; k++) blades.push({ s: 150 + i * 125, phase: k * Math.PI + i * 0.45, type: 0 });
  p.push(clipped(wd, `<path class="ln-cavity" d="${wd}"/>` + rotor("dryer", { o: [x + 60, YB + 300, 660], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 0.9, types: [{ r0: 60, r1: 260, w: 90, t: 20, beta: 0.6 }], blades, shaft: { s0: 0, s1: w - 120, r: 60 } }) + flow("dryer-tumble", [[x + 1350, YB + 400, 560], [x + 2150, YB + 400, 760]], { speed: 600, count: 9, size: 28, spread: 120, kind: "clean" })));
  p.push(L.L(wd, { tone: "hi" }));
  // Thermo-block on the roof: heater with its fan, the louvred air box, the hot air duct down the right side.
  p.push(`<g class="ln-hot">${box(x + 200, YB - 350, 600, 700, z1, 450, "mid", { bevel: 0.4, seam: z1 + 225 })}</g>`);
  p.push(L.heat("dryer-heat", x + 1100, x + 2700, YB, z1 + 420, z1 + 1250));
  p.push(L.L(path3([[x + 260, YB + 350, z1 + 60], [x + 740, YB + 350, z1 + 390]], false) + path3([[x + 260, YB + 350, z1 + 390], [x + 740, YB + 350, z1 + 60]], false), { tone: "lo" }));
  p.push(box(x + 1000, YB - 420, 1900, 840, z1 + 80, 340, "mid", { bevel: 0.4, seam: z1 + 260 }));
  for (const lx of [x + 1100, x + 1700, x + 2300]) {
    p.push(box(lx, YB - 300, 150, 600, z1, 80, "lo", { bevel: 0.2 }));
    p.push(L.L([0, 1, 2, 3].map((i) => path3([[lx + 20, YB + 420, z1 + 140 + i * 60], [lx + 480, YB + 420, z1 + 140 + i * 60]], false)).join(""), { tone: "faint" }));
    p.push(L.L(path3([[lx, YB + 420, z1 + 110], [lx + 500, YB + 420, z1 + 110], [lx + 500, YB + 420, z1 + 380], [lx, YB + 420, z1 + 380]]), { tone: "lo" }));
  }
  p.push(box(x + w - 120, YB + 300, 180, 180, z1 - 450, 870, "mid", { bevel: 0.3 }));
  // Unloading screw (300 mm) up to the air separator.
  p.push(...screwConveyor(L, "dryer-out", [x + w + 120, YB + 120, 720], [x + w + 1650, YB + 120, 2650], 160, { stands: [0.55], inlet: false, speed: 1, kind: "dry" }));
  return { id: "dryer", items: [{ key: depth([x + w / 2, YB, 1300]), svg: p.join("") }] };
}

export function aero(L) {
  const { box, cylY, cylZ, motor, rotor, clipped, bolts, depth, path3, leg, turned, rod, flow, S, G, P } = L;
  const p = [];
  const cx = 40500, cy = YB - 200;
  // Zig-zag column: a square duct with a window down its near face; baffles alternate inside it.
  p.push(box(cx - 340, cy - 340, 680, 680, 0, 140, "lo", { bevel: 0.3 }));
  p.push(cylY(cy - 300, cy - 120, cx, 560, 300, "mid"));
  p.push(motor([cx, cy - 300, 560], [cx, cy - 760, 560], 170));
  p.push(box(cx - 260, cy - 260, 520, 520, 900, 2800, "hi", { seams: [1000, 3600], r: 15 }));
  const wd = path3([[cx - 200, cy + 260, 1300], [cx + 200, cy + 260, 1300], [cx + 200, cy + 260, 3300], [cx - 200, cy + 260, 3300]]);
  const baffles = [];
  for (let i = 0; i < 6; i++) {
    const zz = 1400 + i * 320, left = i % 2 === 0;
    baffles.push(L.convex([[[cx + (left ? -250 : 250), cy - 250, zz], [cx, cy - 250, zz - 160], [cx, cy + 250, zz - 160], [cx + (left ? -250 : 250), cy + 250, zz]], [[cx + (left ? -250 : 250), cy - 250, zz + 20], [cx, cy - 250, zz - 140], [cx, cy + 250, zz - 140], [cx + (left ? -250 : 250), cy + 250, zz + 20]]], "mid"));
  }
  p.push(clipped(wd, `<path class="ln-cavity" d="${wd}"/>` + baffles.join("") + flow("aero-heavy", [[cx - 100, cy + 100, 3200], [cx + 80, cy + 100, 2400], [cx - 80, cy + 100, 1500]], { speed: 600, count: 9, size: 30, spread: 60, kind: "dry" }) + flow("aero-light", [[cx + 60, cy + 100, 1500], [cx - 60, cy + 100, 2400], [cx + 60, cy + 100, 3300]], { speed: 900, count: 9, size: 22, spread: 80, kind: "paper" })));
  p.push(L.L(wd, { tone: "hi" }));
  // Light fraction up a duct into the cyclone; the rotary valve under it and the dust bag.
  const kx = cx + 900, ky = cy - 900;
  for (const [lx, ly] of [[kx - 420, ky - 420], [kx + 420, ky - 420], [kx - 420, ky + 420], [kx + 420, ky + 420]]) p.push(leg(lx, ly, 0, 2300, 70));
  p.push(rod([cx, cy, 3700], [kx - 300, ky, 3900], 130, "mid"));
  p.push(cylZ(cx, cy, 3700, 3760, 300, "mid"));
  p.push(turned(kx, ky, 1650, [[0, 90], [800, 470, 1], [820, 470], [1700, 470], [1760, 200]], "hi"));
  p.push(cylZ(kx, ky, 1300, 1650, 140, "mid"));
  p.push(box(kx - 160, ky - 160, 320, 320, 1100, 200, "mid", { bevel: 0.3 }));
  p.push(turned(kx, ky, 300, [[0, 250], [500, 280, 1], [800, 120, 1]], "hi"));
  // The blower of the pneumatic line, on the aisle side.
  p.push(box(cx - 600, YB + 450, 1000, 650, 0, 140, "lo", { bevel: 0.3 }));
  p.push(cylY(YB + 450, YB + 700, cx - 250, 640, 380, "mid"));
  p.push(motor([cx - 250, YB + 700, 640], [cx - 250, YB + 1150, 640], 190));
  return { id: "aero", items: [{ key: depth([cx, YB, 1600]), svg: p.join("") }] };
}
