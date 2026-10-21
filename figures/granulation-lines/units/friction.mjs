// 6, 8 Friction washers (photos): an octagonal stainless tube rising at about 40° on a blue frame, the rotor's inclined
// paddles lifting the flakes and scrubbing them against each other; a spray header along the top takes the clean water,
// a perforated trough along the bottom drains the dirty water. A window cut in the tube shows the rotor turning.
import { YB } from "../layout.mjs";

export function friction(L, ports, id, a, b) {
  const { box, leg, brace, rotor, motor, hopper, frustum, S, G, P, path3, bolts, depth, clipped, cylX, flow } = L;
  const p = [];
  const r = 250;
  const axis = G.unit3(G.sub3(b, a));
  const len = G.len3(G.sub3(b, a));
  const F = G.frameOf(a, axis, [0, 1, 0], G.cross3(axis, [0, 1, 0]));
  const oct = Array.from({ length: 8 }, (_, i) => [r * Math.cos((i + 0.5) * (Math.PI / 4)), r * Math.sin((i + 0.5) * (Math.PI / 4))]);
  const at = (s, rr = 0, th = 0) => G.add3(G.add3(a, G.mul3(axis, s)), G.add3(G.mul3(F.u, rr * Math.cos(th)), G.mul3(F.v, rr * Math.sin(th))));
  const slope = Math.atan2(b[2] - a[2], b[0] - a[0]);
  const zUnder = (x) => a[2] + Math.tan(slope) * (x - a[0]) - r / Math.cos(slope);
  const legX = [a[0] + len * Math.cos(slope) * 0.22, a[0] + len * Math.cos(slope) * 0.74];
  // Service platform at the top end on the far side: deck on posts, toe board, railing, and a ladder down.
  const px0 = b[0] - 500, px1 = b[0] + 300, py0 = a[1] - 1150, py1 = a[1] - 450, pz = b[2] - 900;
  for (const [qx, qy] of [[px0 + 40, py0 + 40], [px1 - 40, py0 + 40], [px0 + 40, py1 - 40], [px1 - 40, py1 - 40]]) p.push(leg(qx, qy, 0, pz, 60));
  p.push(box(px0, py0, px1 - px0, py1 - py0, pz, 40, "mid", { bevel: 0.3, r: 6 }));
  const grate = [];
  for (let gx = px0 + 100; gx < px1; gx += 100) grate.push(path3([[gx, py0, pz + 40], [gx, py1, pz + 40]], false));
  p.push(L.L(grate.join(""), { tone: "faint" }));
  for (const qx of [px0 + 30, px1 - 30]) p.push(leg(qx, py0 + 30, pz + 40, pz + 1100, 40, "mid"));
  p.push(box(px0, py0, px1 - px0, 40, pz + 1060, 40, "mid", { bevel: 0.2, r: 4, steps: 2 }), box(px0, py0, px1 - px0, 30, pz + 560, 30, "lo", { bevel: 0.2, r: 4, steps: 2 }));
  p.push(...[px0 - 30, px0 + 380].map((qx) => leg(qx, py1 + 60, 0, pz + 1000, 40, "mid")));
  p.push(...Array.from({ length: Math.floor(pz / 280) }, (_, i) => box(px0 - 30, py1 + 40, 450, 40, 250 + i * 280, 30, "lo", { bevel: 0.1, r: 3, steps: 2 })));
  // Far frame: legs, a longitudinal brace and a diagonal.
  for (const lx of legX) p.push(leg(lx, a[1] - 340, 0, zUnder(lx) - 60, 90));
  p.push(brace([legX[0], a[1] - 340, 300], [legX[1], a[1] - 340, 300], 60, "lo"), brace([legX[0], a[1] - 340, 320], [legX[1], a[1] - 340, zUnder(legX[1]) - 120], 55, "lo"));
  // Drain trough under the tube (perforated screen inside), its outlet toward the aisle.
  const t0 = len * 0.08, t1 = len * 0.6;
  const tr = G.frameOf(G.add3(a, [0, 0, -r - 40]), axis, [0, 1, 0], G.cross3(axis, [0, 1, 0]));
  p.push(S(G.prismOf(tr, [[-200, -110], [200, -110], [200, 30], [-200, 30]], t0, t1, P), { tone: "mid" }));
  // The tube, its window and the rotor.
  p.push(S(G.prismOf(F, oct, 0, len, P), { tone: "hi" }));
  const w0 = len * 0.28, w1 = len * 0.74;
  const view = G.viewOf(P);
  const thv = Math.atan2(G.dot3(view, F.v), G.dot3(view, F.u));
  const win = [];
  for (let i = 0; i <= 6; i++) win.push(at(w0, r * 0.93, thv - 0.5 + (1.0 * i) / 6));
  for (let i = 6; i >= 0; i--) win.push(at(w1, r * 0.93, thv - 0.5 + (1.0 * i) / 6));
  const wd = path3(win);
  const blades = [];
  for (let i = 0; i < 16; i++) blades.push({ s: w0 - 120 + i * ((w1 - w0 + 240) / 15), phase: i * 0.9, type: 0 }, { s: w0 - 120 + i * ((w1 - w0 + 240) / 15), phase: i * 0.9 + Math.PI, type: 0 });
  p.push(`<path class="ln-cavity" d="${wd}"/>`);
  p.push(rotor(id, { o: a, a: axis, u: F.u, v: F.v, speed: 1.1, types: [{ r0: 55, r1: 215, w: 130, t: 22, beta: 0.75 }], blades, shaft: { s0: w0 - 200, s1: w1 + 200, r: 60 }, clip: wd }));
  p.push(clipped(wd, flow(`${id}-up`, [at(w0, 120, thv), at(w1, 120, thv + 0.5)], { speed: 520, count: 14, size: 30, spread: 90, kind: id === "fric1" ? "wash" : "rinse" })));
  p.push(L.L(wd, { tone: "lo" }));
  // Flanges and bearing housings at both ends.
  p.push(S(G.disc(-30, 20, r * 1.2, F, P), { tone: "mid" }), S(G.disc(len - 20, len + 30, r * 1.2, F, P), { tone: "mid" }));
  // Spray header along the top with its drop nozzles.
  const hv = G.unit3(G.sub3(F.v, G.mul3(axis, 0)));
  const hp0 = G.add3(at(len * 0.2), G.mul3([0, 0, 1], r + 110)), hp1 = G.add3(at(len * 0.85), G.mul3([0, 0, 1], r + 110));
  p.push(L.rod(hp0, hp1, 32, "mid"));
  const studs = [];
  for (let i = 0; i < 5; i++) { const q = G.lerp3(hp0, hp1, 0.1 + i * 0.2); studs.push(L.rod(q, G.add3(q, [0, 0, -95]), 14, "mid")); }
  p.push(studs.join(""));
  // Inlet hopper on the low end; motor and coupling guard on the top end; discharge chute.
  p.push(hopper([a[0] - 250, a[1] - 260, 500, 520], a[2] + 140, [a[0] - 380, a[1] - 380, 760, 760], a[2] + 600, "mid"));
  const top = G.add3(b, G.mul3(axis, 30));
  p.push(S(G.disc(0, 180, 150, G.frameAlong(top, axis), P), { tone: "mid" }));
  p.push(motor(G.add3(top, G.mul3(axis, 180)), G.add3(top, G.mul3(axis, 700)), 185));
  p.push(frustum([b[0] + 60, b[1] - 220, 340, 440], b[2] - 180, [b[0] + 260, b[1] - 170, 300, 340], b[2] - 760, "mid"));
  // Near frame.
  for (const lx of legX) p.push(leg(lx, a[1] + 340, 0, zUnder(lx) - 60, 90));
  p.push(brace([legX[0], a[1] + 340, 300], [legX[1], a[1] + 340, 300], 60, "lo"), brace([legX[0], a[1] + 340, 320], [legX[1], a[1] + 340, zUnder(legX[1]) - 120], 55, "lo"));
  for (const lx of legX) p.push(box(lx - 70, a[1] - 380, 140, 760, zUnder(lx) - 60, 60, "lo", { bevel: 0.3, r: 6 }));
  const drain = at(t0 + 200, 0, 0);
  ports[id] = { clean: hp0, key: depth(G.lerp3(a, b, 0.5)), dirty: [drain[0], a[1] + 200, drain[2] - r - 120] };
  return { id, items: [{ key: depth(G.lerp3(a, b, 0.5)), svg: p.join("") }] };
}
