// 5 Two-shaft primary washer (photos and video): a trough on legs, two shafts with bolted paddles on a helix that
// turn toward each other in the water, tearing the pieces apart and pushing them along; a spray bar along the
// far rim takes the clean water, the drain at the bottom sends the dirty water to the collector. Drive: motor on
// the floor, belt guard, gearbox on the shaft ends.
import { YB } from "../layout.mjs";

export function wash2(L, ports) {
  const { box, cylX, cylY, motor, gearbox, legs, brace, bolts, rotor, flow, water, clipped, cavity, path3, depth, S, G, P, pipe, ripples } = L;
  const p = [];
  const x = 11200, w = 3000, y0 = YB - 560, d = 1120, z0 = 650, z1 = 1550;
  const [far, near] = legs(x, y0, w, d, z0, { s: 90, inset: 80 });
  p.push(far, brace([x + 80, y0 + 80, 100], [x + w - 80, y0 + 80, z0 - 40], 50));
  // Drive on the left end: motor on the floor, belt guard up to the gearbox on the shaft ends.
  p.push(box(x - 900, YB - 400, 700, 800, 0, 100, "lo", { bevel: 0.3 }));
  p.push(motor([x - 820, YB - 150, 330], [x - 300, YB - 150, 330], 180));
  p.push(box(x - 260, YB - 460, 180, 920, 200, z1 - 300, "hi", { bevel: 0.6, r: 40, seam: z1 - 200 }));
  p.push(gearbox(x - 120, YB - 420, 120, 840, z1 - 480, 380));
  p.push(box(x, y0, w, d, z0, z1 - z0, "mid", { seams: [z0 + 120, z1 - 120], r: 20 }));
  const inner = [[x + 50, y0 + 50, z1], [x + w - 50, y0 + 50, z1], [x + w - 50, y0 + d - 50, z1], [x + 50, y0 + d - 50, z1]];
  const mouth = path3(inner);
  const zs = z1 - 230;
  const shafts = [YB - 250, YB + 250].map((sy, j) => {
    const blades = [];
    for (let i = 0; i < 14; i++) for (const half of [0, Math.PI]) blades.push({ s: 120 + i * 200, phase: half + i * (Math.PI / 4) + j * 0.4, type: 0 });
    return rotor(`wash2-${j}`, { o: [x + 40, sy, zs], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: j ? -0.35 : 0.35, types: [{ r0: 60, r1: 300, w: 110, t: 26, beta: 0.45 }], blades, shaft: { s0: 0, s1: w - 80, r: 75 } });
  });
  p.push(cavity(inner));
  const sprays = [0.2, 0.45, 0.7, 0.9].map((t, i) => flow(`wash2-spray${i}`, [[x + w * t, y0 + 130, z1 - 80], [x + w * t + 40, y0 + 330, z1 - 205]], { speed: 900, count: 5, size: 16, spread: 60, kind: "spray" })).join("");
  p.push(clipped(mouth, water(inner.map(([px, py]) => [px, py, z1 - 200]), "dirty") + ripples("wash2-rip", inner.map(([px, py]) => [px, py, z1 - 200]), { speed: 220 }) + sprays + flow("wash2-float", [[x + 200, YB, z1 - 195], [x + w - 200, YB, z1 - 195]], { speed: 220, count: 26, size: 34, spread: 380, kind: "raw" }) + shafts.join("")));
  p.push(L.L(mouth, { tone: "lo" }));
  // Spray bar along the inside of the far rim, with its nozzles.
  p.push(cylX(x + 120, x + w - 120, y0 + 90, z1 - 40, 30, "mid"));
  const nz = [];
  for (let i = 0; i < 10; i++) nz.push([x + 250 + i * 280, y0 + 120, z1 - 70]);
  p.push(bolts(nz, 0.5));
  // Lid flanges with bolt rows on the near rim, bearing housings on the right end.
  const rim = [];
  for (let i = 0; i < 12; i++) rim.push([x + 120 + i * 250, y0 + d, z1 - 50]);
  p.push(bolts(rim));
  p.push(box(x + w, YB - 380, 110, 760, z1 - 400, 300, "mid", { bevel: 0.4, r: 10 }));
  for (const sy of [YB - 250, YB + 250]) p.push(cylX(x + w + 110, x + w + 170, sy, zs, 70, "mid"));
  // Drain valve at the bottom of the near wall.
  p.push(cylY(y0 + d, y0 + d + 100, x + 520, z0 + 90, 60, "mid"), cylY(y0 + d + 100, y0 + d + 140, x + 520, z0 + 90, 85, "mid"));
  p.push(near, brace([x + 80, y0 + d - 80, 100], [x + w - 80, y0 + d - 80, z0 - 40], 50));
  ports.wash2 = { clean: [x + 120, y0 + 90, z1 - 40], inside: y0, key: depth([x + w / 2, YB, 1000]), dirty: [x + 520, y0 + d + 140, z0 + 90] };
  return { id: "wash2", items: [{ key: depth([x + w / 2, YB, 1000]), svg: p.join("") }] };
}
