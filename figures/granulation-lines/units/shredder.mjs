// 3 Two-shaft shredder (photos): a heavy dark base frame, the cutting chamber with bearing housings on both
// ends, a big gearbox with an orange guard on the right end, two motors on the frame below, and a tall white
// hopper with stiffening ribs and lifting lugs. Through the hopper's mouth the two cutter shafts are seen:
// stacks of discs with hooks turning toward each other at 700 kg/h. A control cabinet stands beside it.
import { YB } from "../layout.mjs";

export function shredder(L) {
  const { box, cylX, motor, gearbox, rotor, legs, leg, brace, bolts, path3, depth, S, G, P, clipped, flow } = L;
  const p = [];
  const x = 7600, y0 = YB - 650, w = 1800, d = 1300;
  const zc = 1080;           // shaft height (the rotor sits 120 higher, in the chamber's upper part)
  p.push(box(x - 40, y0 - 40, w + 80, d + 80, 0, 140, "lo", { bevel: 0.4, seam: 70 }));
  const [far, near] = legs(x, y0, w, d, 700, { s: 120, inset: 80, z0: 140 });
  p.push(far);
  p.push(brace([x + 80, y0 + 80, 200], [x + w - 80, y0 + 80, 640], 60));
  // Two motors on the frame floor, with orange belt guards (drawn as solid guards) up to the gearbox.
  p.push(motor([x + 200, YB - 330, 380], [x + 900, YB - 330, 380], 200));
  p.push(box(x + 80, y0 - 10, w - 160, d + 20, 700, 90, "mid", { bevel: 0.4, seam: 745 }));
  // Cutting chamber.
  const cx0 = x + 330, cw = 1140, cy0 = YB - 470, cd = 940;
  p.push(box(cx0, cy0, cw, cd, 790, 640, "mid", { seam: 1100, r: 15 }));
  for (const sx of [cx0 - 80, cx0 + cw]) {
    p.push(box(sx, YB - 360, 80, 720, 820, 560, "mid", { bevel: 0.4, r: 10 }));
    p.push(bolts([[sx + 40, YB + 360, 900], [sx + 40, YB + 360, 1300]]));
  }
  // Big gearbox and its guard on the right end.
  p.push(gearbox(x + w - 300, YB - 450, 360, 900, 790, 760));
  p.push(box(x + w + 40, YB - 300, 220, 600, 400, 900, "hi", { bevel: 0.6, r: 40, seam: 900 }));
  // Hopper: through its mouth the cutter shafts show at the bottom of the chamber.
  const zh0 = 1430, zh1 = 2500;
  const bottom = [cx0, cy0, cw, cd], top = [x + 60, YB - 780, w - 120, 1560];
  // Cutaway: only the far half of the hopper is drawn (far wall and the far halves of the end walls, cut on
  // the midline), so the chamber opening and the cutter shafts show from the front.
  const B = (t, y) => [bottom[0] + bottom[2] * t, y, zh0], T = (t, y) => [top[0] + top[2] * t, y, zh1];
  const yb0 = bottom[1], yt0 = top[1], ym = YB;
  const thick = (q, n) => { const off = q.map((v) => G.add3(v, n)); return L.convex([q, off, ...q.map((_, i) => [q[i], q[(i + 1) % 4], off[(i + 1) % 4], off[i]])], "hi"); };
  p.push(thick([B(0, yb0), B(1, yb0), T(1, yt0), T(0, yt0)], [0, -25, 0]));
  p.push(thick([B(0, yb0), B(0, ym), T(0, ym), T(0, yt0)], [-25, 0, 0]));
  // The chamber's open top with the two shafts of discs and hooks.
  const inner = [[cx0 + 40, cy0 + 40, zh0 - 10], [cx0 + cw - 40, cy0 + 40, zh0 - 10], [cx0 + cw - 40, cy0 + cd - 40, zh0 - 10], [cx0 + 40, cy0 + cd - 40, zh0 - 10]];
  const shafts = [YB - 200, YB + 200].map((sy, j) => {
    const blades = [];
    for (let i = 0; i < 16; i++) for (let h = 0; h < 3; h++) blades.push({ s: 70 + i * 65, phase: h * (Math.PI * 2 / 3) + i * 0.5 + j * 0.3, type: 0 });
    return rotor(`shred-${j}`, {
      o: [cx0 + 20, sy, zc + 120], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: j ? 0.18 : -0.18,
      types: [{ r0: 160, r1: 250, w: 40, t: 70, beta: 0 }], blades,
      shaft: { s0: 0, s1: cw - 40, r: 70, tone: "mid" },
      core: (F) => Array.from({ length: 16 }, (_, i) => S(G.disc(50 + i * 65, 90 + i * 65, 175, F, P), { tone: "hi" })).join(""),
    });
  });
  const opening = path3(inner);
  p.push(`<path class="ln-cavity" d="${opening}"/>`, clipped(opening, shafts.join("")), L.L(opening, { tone: "lo" }));
  // The right end wall's far half (drawn after the shafts it stands beside), and the cut edges.
  p.push(thick([B(1, yb0), B(1, ym), T(1, ym), T(1, yt0)], [25, 0, 0]));
  p.push(L.L(path3([B(0, ym), T(0, ym)], false) + path3([B(1, ym), T(1, ym)], false), { tone: "hi" }));
  // Lifting lugs on the far wall's rim.
  for (const lx of [top[0] + 150, top[0] + top[2] - 250]) p.push(box(lx, top[1] - 40, 100, 50, zh1 - 40, 140, "mid", { bevel: 0.3, r: 25 }));
  // Pieces falling into the mouth from the belt.
  p.push(flow("shred-in", [[x + 120, YB, 2600], [x + 600, YB, 2200], [x + 800, YB, 1500]], { speed: 1100, count: 8, size: 30, spread: 300 }));
  p.push(near);
  p.push(motor([x + 900, YB + 330, 380], [x + 1600, YB + 330, 380], 200));
  p.push(brace([x + 80, y0 + d - 80, 200], [x + w - 80, y0 + d - 80, 640], 60));
  const out = [{ id: "shredder", items: [{ key: depth([x + w / 2, YB, 1300]), svg: p.join("") }] }];
  // Control cabinet of the washing line, beside the shredder: doors, a lamp column, an HMI panel.
  const cab = [];
  const kx = 6100, ky = YB + 700;
  cab.push(box(kx, ky, 800, 420, 0, 100, "lo", { bevel: 0.3 }));
  cab.push(box(kx, ky, 800, 420, 100, 1900, "mid", { seam: 1850 }));
  cab.push(L.L(path3([[kx + 400, ky + 420, 150], [kx + 400, ky + 420, 1850]], false), { tone: "lo" }));
  cab.push(`<path class="ln-glass" d="${path3([[kx + 80, ky + 420, 1350], [kx + 330, ky + 420, 1350], [kx + 330, ky + 420, 1600], [kx + 80, ky + 420, 1600]])}"/>`);
  cab.push(bolts([[kx + 480, ky + 420, 1500], [kx + 560, ky + 420, 1500], [kx + 640, ky + 420, 1500]], 0.6));
  cab.push(L.cylZ(kx + 700, ky + 200, 2000, 2350, 40, "mid"), L.cylZ(kx + 700, ky + 200, 2350, 2550, 55, "hi"));
  out.push({ id: "cabinet", items: [{ key: depth([kx + 400, ky + 210, 900]), svg: cab.join("") }], part: true });
  return out;
}
