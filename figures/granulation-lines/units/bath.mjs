// 9, 10 Flotation and rinse baths (company 3D model and photo): a long V-bottomed tank on a frame with paddle drums
// across its top that push the floating flakes along. Polyethylene and polypropylene are lighter than water and
// stay on top; PET, sand and stones sink into the V, where a bottom screw carries the sludge to the drain. A window cut
// in the near wall shows the water, the sinking particles and the bottom screw.
import { YB } from "../layout.mjs";

export function bath(L, ports, id, x, w, drums) {
  const { box, cylY, cylX, leg, brace, prismX, rotor, motor, water, clipped, cavity, path3, bolts, depth, flow, S, G, P, ripples } = L;
  const p = [];
  const y0 = YB - 750, d = 1500, z1 = 1400, zw = 1250, zv = 820, zb = 330;
  const prof = [[y0, z1], [y0 + d, z1], [y0 + d, zv], [YB + 150, zb], [YB - 150, zb], [y0, zv]];
  // Frame under the V.
  const lx = [x + 200, x + w / 2, x + w - 200];
  for (const px of lx) p.push(leg(px, YB - 450, 0, 620, 100), box(px - 90, YB - 560, 180, 1120, 0, 20, "lo", { bevel: 0.2, r: 6 }));
  p.push(brace([lx[0], YB - 450, 120], [lx[2], YB - 450, 120], 60));
  p.push(prismX(x, x + w, prof, "mid"));
  const inner = [[x + 50, y0 + 50, z1], [x + w - 50, y0 + 50, z1], [x + w - 50, y0 + d - 50, z1], [x + 50, y0 + d - 50, z1]];
  const mouth = path3(inner);
  p.push(cavity(inner));
  p.push(clipped(mouth, water(inner.map(([px, py]) => [px, py, zw]), "dirty") + ripples(`${id}-rip`, inner.map(([px, py]) => [px, py, zw]), { speed: 300, spacing: 360 }) + flow(`${id}-float`, [[x + 150, YB, zw + 4], [x + w - 150, YB, zw + 4]], { speed: 300, count: Math.round(w / 110), size: 34, spread: 600, kind: id === "flot" ? "rinse" : "clean" })));
  // Paddle drums across the tank (axis along y): two end discs and eight short paddles between them, the lower
  // part in the water (photo: white wheels along the bath).
  const zd = zw + 60;
  drums.forEach((dx, j) => {
    const blades = [];
    for (let i = 0; i < 8; i++) blades.push({ s: d / 2 - 20, phase: i * (Math.PI / 4) + j * 0.3, type: 0 });
    p.push(rotor(`${id}-${j}`, {
      o: [x + dx, y0 + 30, zd], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], speed: -0.16,
      types: [{ r0: 230, r1: 380, w: d - 200, t: 24, beta: 0 }], blades,
      shaft: { s0: 0, s1: d - 60, r: 70, tone: "mid" },
      core: (F) => [60, d - 120].map((s0) => S(G.disc(s0, s0 + 22, 390, F, P), { tone: "hi" })).join(""),
    }));
  });
  // The near wall again over the drums (they turn inside the tank), with its rim bolts and the cut window.
  p.push(box(x, y0 + d - 40, w, 40, zv, z1 - zv, "mid", { bevel: 0.3, r: 6, seam: zv + 120 }));
  const wx0 = x + w * 0.2, wx1 = x + w * 0.8, wz0 = zv + 90, wz1 = z1 - 160;
  const win = [[wx0, y0 + d, wz0], [wx1, y0 + d, wz0], [wx1, y0 + d, wz1], [wx0, y0 + d, wz1]];
  const wd = path3(win);
  const screw = rotor(`${id}-bottom`, { o: [x + 100, YB, zb + 150], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 0.3, flight: { s0: 0, s1: w - 200, r0: 40, r1: 140, pitch: 260 }, shaft: { s0: 0, s1: w - 200, r: 40, tone: "mid" } });
  const sinking = flow(`${id}-sink`, [[wx0 + 200, YB + 300, zw - 40], [wx0 + 260, YB + 150, zb + 330]], { speed: 120, count: 10, size: 26, spread: 260, kind: "grit" });
  const sinking2 = flow(`${id}-sink2`, [[wx1 - 400, YB + 300, zw - 40], [wx1 - 340, YB + 100, zb + 330]], { speed: 100, count: 8, size: 26, spread: 300, kind: "grit" });
  p.push(clipped(wd, `<path class="ln-water" data-water="body" d="${wd}"/>` + `<path class="ln-cavity" d="${path3([[wx0, YB + 150, zb], [wx1, YB + 150, zb], [wx1, y0 + d, zv], [wx0, y0 + d, zv]])}"/>` + screw + sinking + sinking2));
  p.push(L.L(wd, { tone: "hi" }));
  // Bearings and a gear motor with a chain guard per drum on the near rim.
  drums.forEach((dx) => {
    p.push(box(x + dx - 80, y0 + d - 30, 160, 100, z1 - 40, 140, "mid", { bevel: 0.3, r: 8 }));
    p.push(box(x + dx - 70, y0 + d + 70, 140, 120, zd - 300, 420, "hi", { bevel: 0.4, r: 30 }));
    p.push(motor([x + dx, y0 + d + 190, zd - 220], [x + dx, y0 + d + 480, zd - 220], 80));
  });
  const rim = [];
  for (let px = x + 150; px < x + w; px += 300) rim.push([px, y0 + d, z1 - 30]);
  p.push(bolts(rim));
  // Bottom screw drive on the right end and the sludge outlet (dirty water) on the left end.
  p.push(box(x + w, YB - 160, 200, 320, zb + 20, 260, "mid", { bevel: 0.3 }));
  p.push(motor([x + w + 200, YB, zb + 150], [x + w + 560, YB, zb + 150], 90));
  p.push(cylY(YB + 150, YB + 600, x + 300, zb + 60, 70, "mid"));
  for (const px of lx) p.push(leg(px, YB + 450, 0, 620, 100));
  p.push(brace([lx[0], YB + 450, 120], [lx[2], YB + 450, 120], 60));
  ports[id] = { clean: [x + 200, y0 + 90, z1 + 40], inside: y0, key: depth([x + w / 2, YB, 900]), dirty: [x + 300, YB + 600, zb + 60] };
  return { id, items: [{ key: depth([x + w / 2, YB, 900]), svg: p.join("") }] };
}
