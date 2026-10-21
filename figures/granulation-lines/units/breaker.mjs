// 1 Bale breaker (company drawing В-00.00.000 СБ «Разрыхлитель брикетов»): a 5 m plate conveyor on five pairs of
// legs with V braces, high side boards, and an inclined head box holding two toothed drums 30° apart, each on a
// gear motor. The bale rides the plates into the drums and is torn into pieces that fall onto the next belt.
import { YB } from "../layout.mjs";

export function breaker(L) {
  const { box, cylY, cylX, convex, leg, brace, pillow, bolts, rotor, slide, flow, motor, gearbox, path3, foot, depth, G } = L;
  const p = [];
  const y0 = YB - 650, y1 = YB + 650, top = 900;
  const posts = [160, 1360, 2560, 3760, 4840];
  const hx = 4650;

  // Far legs with their V braces, the far channel.
  for (const x of posts) p.push(foot(x, y0 + 50, 150), leg(x, y0 + 50, 18, top - 120, 90));
  for (let i = 0; i < posts.length - 1; i++) {
    const m = (posts[i] + posts[i + 1]) / 2;
    p.push(brace([posts[i] + 45, y0 + 50, 160], [m, y0 + 50, top - 140], 45), brace([posts[i + 1] - 45, y0 + 50, 160], [m, y0 + 50, top - 140], 45));
  }
  p.push(box(-120, y0, 5150, 90, top - 120, 120, "mid", { bevel: 0.3, r: 6, seam: top - 60 }));

  // Far side board: rails, stanchions, panel.
  p.push(box(380, y0 - 10, 4300, 30, top, 880, "mid", { bevel: 0.2, r: 4, seams: [top + 300, top + 600] }));
  const stan = [380, 1430, 2480, 3530, 4620];
  for (const x of stan) p.push(box(x, y0 - 70, 60, 60, top, 900, "lo", { bevel: 0.2, r: 3, steps: 2 }));
  p.push(box(380, y0 - 70, 4300, 60, top + 900, 60, "mid", { bevel: 0.2, r: 3, steps: 2 }));

  // Tail shaft with its bearings.
  p.push(pillow([-40, y0 - 80, top - 60], "y", 75));
  p.push(cylY(y0 - 40, y1 + 40, -40, top - 60, 90, "mid"));

  // The plate deck and its moving slats and chain pins.
  p.push(box(-40, y0 + 90, 5000, y1 - y0 - 180, top - 90, 90, "hi", { bevel: 0.4, r: 6 }));
  const deck = [[-40, y0 + 90, top], [4960, y0 + 90, top], [4960, y1 - 90, top], [-40, y1 - 90, top]];
  const slats = [];
  for (let x = -170 * 2; x < 5000; x += 170) slats.push(path3([[x, y0 + 90, top], [x, y1 - 90, top]], false));
  const pins = [];
  for (let x = -170 * 2; x < 5000; x += 85) pins.push([x, y0 + 45, top], [x, y1 - 45, top]);
  p.push(slide("breaker-slats", L.L(slats.join(""), { tone: "lo" }), { dir: [1, 0, 0], speed: 120, period: 170, clip: path3(deck) }));
  p.push(slide("breaker-pins", bolts(pins, 0.5), { dir: [1, 0, 0], speed: 120, period: 85, clip: path3([[-40, y0, top + 1], [4960, y0, top + 1], [4960, y1, top + 1], [-40, y1, top + 1]]) }));

  // The bale: enters at the left end and is eaten by the drums at the head (clipped to the space between them).
  const bw = 1100, bd = 1000, bh = 800, by = YB - bd / 2, bx = -bw - 300;
  const bale = [box(bx, by, bw, bd, top, bh, "hi", { bevel: 0.8, r: 50, steps: 4 })];
  const straps = [bx + 300, bx + 780].map((sx) => path3([[sx, by + bd, top + 30], [sx, by + bd, top + bh], [sx, by, top + bh]], false)).join("");
  bale.push(L.L(straps, { tone: "mid" }));
  bale.push(L.L([[bx + 200, top + 260], [bx + 520, top + 420], [bx + 860, top + 300], [bx + 640, top + 600]].map(([x, z]) => path3([[x, by + bd, z], [x + 120, by + bd, z + 40]], false)).join(""), { tone: "faint", free: true }));
  const room = [[-40, y0, top], [hx + 120, y0, top], [hx + 120, y1, top], [-40, y1, top], [-40, y1, top + 1000], [hx + 120, y1, top + 1000], [hx + 120, y0, top + 1000], [-40, y0, top + 1000]];
  p.push(slide("breaker-bale", bale.join(""), { dir: [1, 0, 0], speed: 110, period: hx + 120 - bx, phase: 1800 - bx, clip: L.pathOf(G.hullOf(room.map(L.at))) }));

  // Head box: an inclined casing; the far wall and the top are solid, the near side is an open frame.
  const zt = top + 1250, lean = 380;
  const corners = (y) => [[hx - 40, y, top], [hx + 700, y, top], [hx + 700 + lean, y, zt], [hx - 40 + lean, y, zt]];
  // Far wall seen from inside: in shadow, so the drums stand out against it.
  p.push(convex([corners(y0 - 20), corners(y0 + 10), ...[0, 1, 2, 3].map((i) => [corners(y0 - 20)[i], corners(y0 - 20)[(i + 1) % 4], corners(y0 + 10)[(i + 1) % 4], corners(y0 + 10)[i]])], "mid"));
  p.push(L.cavity(corners(y0 + 12)));
  // Output-side wall (toward +x), solid.
  const c0 = corners(y0 + 10), c1 = corners(y1 - 10);
  p.push(convex([[c0[1], c0[2], c1[2], c1[1]], [c0[1], c0[2], [c0[2][0] + 20, c0[2][1], c0[2][2]], [c0[1][0] + 20, c0[1][1], c0[1][2]]], [c1[1], c1[2], [c1[2][0] + 20, c1[2][1], c1[2][2]], [c1[1][0] + 20, c1[1][1], c1[1][2]]], [[c0[1][0] + 20, c0[1][1], c0[1][2]], [c0[2][0] + 20, c0[2][1], c0[2][2]], [c1[2][0] + 20, c1[2][1], c1[2][2]], [c1[1][0] + 20, c1[1][1], c1[1][2]]]], "mid"));
  const drums = [[hx + 300, top + 300], [hx + 300 + 330, top + 300 + 560]];
  const teeth = [];
  drums.forEach(([dx, dz], j) => {
    const blades = [];
    for (let row = 0; row < 8; row++) for (let i = 0; i < 8; i++) blades.push({ s: 150 + i * 140, phase: row * (Math.PI / 4) + (i % 2) * (Math.PI / 8), type: 0 });
    teeth.push(rotor(`breaker-${j}`, { o: [dx, y0 + 40, dz], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], speed: j ? 0.5 : -0.5, types: [{ r0: 190, r1: 300, w: 50, t: 56, beta: 0 }], blades, shaft: { s0: 0, s1: y1 - y0 - 80, r: 195 } }));
  });
  p.push(...teeth);
  // Top cover and the near frame posts.
  p.push(box(hx - 80 + lean, y0 - 30, 820, y1 - y0 + 60, zt, 50, "mid", { bevel: 0.3, r: 8 }));
  for (const [ax0, ax1] of [[hx - 40, hx - 40 + lean], [hx + 700, hx + 700 + lean]]) p.push(brace([ax0, y1 + 30, top], [ax1, y1 + 30, zt], 60, "mid"));
  // Bearings and a parallel-shaft gear motor on each drum's near end (section A-A): the motor's axis along the drum's.
  drums.forEach(([dx, dz], j) => {
    p.push(cylY(y1 + 10, y1 + 70, dx, dz, 120, "mid"), cylY(y1 + 70, y1 + 120, dx, dz, 60, "lo"));
    p.push(box(dx - 150, y1 + 120, 300, 200, dz - 150, 420, "mid", { bevel: 0.5, r: 30, seam: dz + 120 }));
    p.push(motor([dx, y1 + 320, dz + 130], [dx, y1 + 720, dz + 130], 115));
  });
  // Near legs, braces, channel and the open near board frame.
  for (const x of posts) p.push(foot(x, y1 - 50, 150), leg(x, y1 - 50, 18, top - 120, 90));
  for (let i = 0; i < posts.length - 1; i++) {
    const m = (posts[i] + posts[i + 1]) / 2;
    p.push(brace([posts[i] + 45, y1 - 50, 160], [m, y1 - 50, top - 140], 45), brace([posts[i + 1] - 45, y1 - 50, 160], [m, y1 - 50, top - 140], 45));
  }
  p.push(pillow([-40, y1 + 80, top - 60], "y", 75));
  p.push(box(-120, y1 - 90, 5150, 90, top - 120, 120, "mid", { bevel: 0.3, r: 6, seam: top - 60 }));
  p.push(bolts(posts.map((x) => [x, y1, top - 60])));
  for (const x of stan) p.push(box(x, y1 + 10, 60, 60, top, 900, "lo", { bevel: 0.2, r: 3, steps: 2 }));
  p.push(box(380, y1 + 10, 4300, 60, top + 900, 60, "mid", { bevel: 0.2, r: 3, steps: 2 }));
  p.push(box(380, y1 + 10, 4300, 60, top + 300, 50, "lo", { bevel: 0.2, r: 3, steps: 2 }));
  // Torn pieces dropping from under the drums onto the belt.
  p.push(flow("breaker-drop", [[hx + 560, YB, top + 80], [hx + 820, YB, top - 120], [5700, YB, 700]], { speed: 900, count: 14, size: 30, spread: 260, kind: "raw" }));
  return { id: "breaker", items: [{ key: depth([2500, YB, 900]), svg: p.join("") }] };
}
