// Conveyors used along the line: an inclined belt with troughing idlers, cleats that run with the belt and a gear
// motor on the head pulley; a screw conveyor whose tube has a window on top, so its flight is seen turning.
export function beltConveyor(L, id, a, b, w, { legsAt = [0.3, 0.8], sideH = 120, cleats = 260, speed = 260, flakes = true, motorSide = 1, kind = "raw" } = {}) {
  const { box, cylY, prismY, leg, brace, slide, flow, motor, path3, bolts, G } = L;
  const out = [];
  const y = a[1];
  const [x0, z0] = [a[0], a[2]], [x1, z1] = [b[0], b[2]];
  const zAt = (x) => z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const dir = [(x1 - x0) / len, 0, (z1 - z0) / len];
  const legX = legsAt.map((t) => x0 + (x1 - x0) * t);
  for (const x of legX) out.push(leg(x, y - w / 2 + 20, 0, zAt(x) - 150, 60));
  if (legX.length > 1) out.push(brace([legX[0], y - w / 2 + 20, 120], [legX[1], y - w / 2 + 20, zAt(legX[1]) - 200], 40));
  // Far side channel and its skirt board.
  out.push(prismY(y - w / 2 - 30, y - w / 2, [[x0, z0 - 110], [x1, z1 - 110], [x1, z1 + 30], [x0, z0 + 30]], "mid"));
  out.push(prismY(y - w / 2 - 10, y - w / 2 + 10, [[x0 + 80, z0 + 30], [x0 + 80 + (x1 - x0) * 0.35, zAt(x0 + 80 + (x1 - x0) * 0.35) + 30], [x0 + 80 + (x1 - x0) * 0.35, zAt(x0 + 80 + (x1 - x0) * 0.35) + sideH], [x0 + 80, z0 + sideH]], "lo"));
  // Idlers under the belt (seen between the channels' lower edges), then the belt with its cleats.
  for (let t = 0.12; t < 0.95; t += 0.16) {
    const x = x0 + (x1 - x0) * t;
    out.push(cylY(y - w / 2 + 10, y + w / 2 - 10, x, zAt(x) - 95, 28, "lo"));
  }
  out.push(prismY(y - w / 2, y + w / 2, [[x0, z0 - 70], [x1, z1 - 70], [x1, z1], [x0, z0]], "hi"));
  const top = [[x0, y - w / 2, z0], [x1, y - w / 2, z1], [x1, y + w / 2, z1], [x0, y + w / 2, z0]];
  const lines = [];
  // Lines from the tail to the head; sliding forward by up to one pitch never opens a gap wider than a pitch.
  for (let s = 0; s <= len; s += cleats) {
    const px = x0 + dir[0] * s, pz = z0 + dir[2] * s;
    lines.push(path3([[px, y - w / 2, pz + 2], [px, y + w / 2, pz + 2]], false));
  }
  out.push(slide(`${id}-cleats`, L.L(lines.join(""), { tone: "lo" }), { dir, speed, period: cleats, clip: path3(top) }));
  if (flakes) out.push(flow(`${id}-flakes`, [[x0 + 150, y, z0 + 30], [x1 - 60, y, z1 + 30]], { speed, count: Math.round(len / 160), size: 30, spread: w * 0.3, kind }));
  // Pulleys.
  out.push(cylY(y - w / 2 - 20, y + w / 2 + 20, x0, z0 - 35, 70, "mid"), cylY(y - w / 2 - 20, y + w / 2 + 20, x1, z1 - 35, 70, "mid"));
  // Near channel, skirt, legs and the drive.
  for (const x of legX) out.push(leg(x, y + w / 2 - 20, 0, zAt(x) - 150, 60));
  if (legX.length > 1) out.push(brace([legX[0], y + w / 2 - 20, 120], [legX[1], y + w / 2 - 20, zAt(legX[1]) - 200], 40));
  out.push(prismY(y + w / 2 - 10, y + w / 2 + 10, [[x0 + 80, z0 + 30], [x0 + 80 + (x1 - x0) * 0.35, zAt(x0 + 80 + (x1 - x0) * 0.35) + 30], [x0 + 80 + (x1 - x0) * 0.35, zAt(x0 + 80 + (x1 - x0) * 0.35) + sideH], [x0 + 80, z0 + sideH]], "lo"));
  out.push(prismY(y + w / 2, y + w / 2 + 30, [[x0, z0 - 110], [x1, z1 - 110], [x1, z1 + 30], [x0, z0 + 30]], "mid"));
  const bl = [];
  for (let t = 0.1; t < 1; t += 0.2) { const x = x0 + (x1 - x0) * t; bl.push([x, y + w / 2 + 30, zAt(x) - 40]); }
  out.push(bolts(bl));
  const side = motorSide > 0 ? y + w / 2 + 30 : y - w / 2 - 30;
  out.push(box(x1 - 130, side + (motorSide > 0 ? 0 : -220), 260, 220, z1 - 160, 260, "mid", { bevel: 0.4, r: 20 }));
  // The gear motor runs back from the head gearbox along the side channel, at the belt's slope, so it sits on the frame.
  const hub = [x1, side + motorSide * 110, z1 - 30];
  out.push(motor(G.sub3(hub, G.mul3(dir, 260)), G.sub3(hub, G.mul3(dir, 700)), 85));
  return out;
}

export function screwConveyor(L, id, a, b, r, { stands = [0.4], inlet = true, speed = 0.9, pitch = null, tone = "hi", kind = "raw" } = {}) {
  const { box, leg, rotor, motor, hopper, frustum, S, G, P, path3, at, pathOf } = L;
  const out = [];
  const F = L.frameBetween(a, b);
  const len = G.len3(G.sub3(b, a));
  const pt = (s, rr, th) => G.add3(G.add3(a, G.mul3(F.a, s)), G.add3(G.mul3(F.u, rr * Math.cos(th)), G.mul3(F.v, rr * Math.sin(th))));
  for (const t of stands) {
    const p = G.add3(a, G.mul3(F.a, len * t));
    out.push(leg(p[0], p[1] - r * 0.7, 0, p[2] - r, 60), leg(p[0], p[1] + r * 0.7, 0, p[2] - r, 60));
    out.push(box(p[0] - 60, p[1] - r - 40, 120, 2 * r + 80, p[2] - r - 40, 40, "lo", { bevel: 0.2, r: 6 }));
  }
  out.push(S(G.disc(0, len, r, F, P), { tone }));
  // A window on the top of the tube from 25% to 85% of its length: the flight shows through it.
  const w0 = len * 0.25, w1 = len * 0.85;
  const up = G.unit3(G.sub3(F.v, G.mul3(F.a, G.dot3(F.v, F.a))));
  const ang = Math.atan2(G.dot3(up, F.v), G.dot3(up, F.u));
  const win = [];
  for (let i = 0; i <= 8; i++) win.push(pt(w0, r * 0.98, ang - 0.7 + (1.4 * i) / 8));
  for (let i = 8; i >= 0; i--) win.push(pt(w1, r * 0.98, ang - 0.7 + (1.4 * i) / 8));
  const wd = path3(win);
  out.push(`<path class="ln-cavity" d="${wd}"/>`);
  out.push(rotor(id, { o: a, a: F.a, u: F.u, v: F.v, speed, flight: { s0: w0 - 40, s1: w1 + 40, r0: r * 0.28, r1: r * 0.9, pitch: pitch || r * 1.6 }, shaft: { s0: w0 - 60, s1: w1 + 60, r: r * 0.28 }, clip: wd }));
  // Flakes carried along by the flight, seen through the window.
  if (kind) out.push(L.clipped(wd, L.flow(`${id}-carry`, [pt(w0, r * 0.75, ang), pt(w1, r * 0.75, ang)], { speed: speed * (pitch || r * 1.6), count: 8, size: 30, spread: r * 0.25, kind })));
  out.push(L.L(wd, { tone: "lo" }));
  out.push(S(G.disc(-40, 30, r * 1.18, F, P), { tone: "mid" }), S(G.disc(len - 30, len + 40, r * 1.18, F, P), { tone: "mid" }));
  if (inlet) out.push(hopper([a[0] + 40, a[1] - r * 0.8, r * 1.6, r * 1.6], a[2] + r * 0.8, [a[0] - 60, a[1] - r * 1.4, r * 2.6, r * 2.8], a[2] + r * 0.8 + 380, "mid"));
  const m = G.add3(b, G.mul3(F.a, 40));
  out.push(motor(m, G.add3(m, G.mul3(F.a, r * 3.2)), r * 0.72));
  // Outlet spout under the high end.
  out.push(frustum([b[0] - r * 0.7, b[1] - r * 0.7, r * 1.4, r * 1.4], b[2] - r, [b[0] - r * 0.6, b[1] - r * 0.6, r * 1.2, r * 1.2], b[2] - r - 280, "mid"));
  return out;
}
