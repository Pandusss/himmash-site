// 21 T-5000 water treatment (company figure and presentation): on one skid, (1) a receiving tank where the dirty water
// arrives, with a step screen lifting the coarse debris into a bin; (2) the electroflotation and electrocoagulation bath
// with its electrode pack, the foam on top and a chain scraper pushing it into the sludge trough and container; (3) a
// battery of four mechanical and sorption filters with their headers; (4) the bactericidal cell; (5) the clean water
// tank and the pump that sends the water back to the washers. The rectifier cabinet powers the electrodes.
// 3–10 m³/h, water reused up to 20 times, 35 m², 10 kW.
import { T5 } from "../layout.mjs";

export function t5000(L) {
  const { box, cylX, cylY, cylZ, turned, motor, cavity, water, clipped, path3, depth, bolts, leg, brace, slide, flow, frustum, pipe, S, G, P, ripples } = L;
  const p = [];
  const items = [];
  const { x, y, w, d } = T5;
  const pipes = (route, r, cls) => pipe(route, r, { cls, flow: cls === "air" ? "air" : cls === "mid" ? "mid" : cls, bend: 3.5 }).filter((it) => it.svg);
  // Skid with its grating outline.
  p.push(box(x, y, w, d, 0, 140, "lo", { bevel: 0.4, seam: 70 }));
  p.push(L.L(path3([[x + 100, y + 100, 140], [x + w - 100, y + 100, 140], [x + w - 100, y + d - 100, 140], [x + 100, y + d - 100, 140]]), { tone: "faint" }));

  // 1 Receiving tank.
  const r1 = { x: x + 200, y: y + 400, w: 1400, d: 1700, z: 1540 };
  p.push(box(r1.x, r1.y, r1.w, r1.d, 140, r1.z - 140, "mid", { seams: [300, r1.z - 120], r: 20 }));
  const m1 = [[r1.x + 50, r1.y + 50, r1.z], [r1.x + r1.w - 50, r1.y + 50, r1.z], [r1.x + r1.w - 50, r1.y + r1.d - 50, r1.z], [r1.x + 50, r1.y + r1.d - 50, r1.z]];
  p.push(cavity(m1), clipped(path3(m1), water(m1.map(([a, b]) => [a, b, 1350]), "dirty") + ripples("t5-rip1", m1.map(([a, b]) => [a, b, 1350]), { dir: [1, 0, 0], speed: 120, spacing: 300 })), L.L(path3(m1), { tone: "lo" }));
  // Step screen rising out of the tank toward the viewer, over the debris bin.
  const sa = [r1.x + 300, r1.y + r1.d - 300, 900], sb = [r1.x + 300, r1.y + r1.d + 650, 2050];
  const sF = L.frameBetween(sa, sb);
  const slen = G.len3(G.sub3(sb, sa));
  p.push(S(G.prismOf(sF, [[-330, -40], [330, -40], [330, 40], [-330, 40]], 0, slen, P), { tone: "hi" }));
  const steps = [];
  for (let s = -150; s < slen + 150; s += 150) steps.push(path3([G.add3(sa, G.add3(G.mul3(sF.a, s), G.mul3(sF.u, -300))), G.add3(sa, G.add3(G.mul3(sF.a, s), G.mul3(sF.u, 300)))].map((q) => G.add3(q, G.mul3(sF.v, 42))), false));
  const face = [G.add3(sa, G.mul3(sF.u, -320)), G.add3(sa, G.mul3(sF.u, 320)), G.add3(sb, G.mul3(sF.u, 320)), G.add3(sb, G.mul3(sF.u, -320))].map((q) => G.add3(q, G.mul3(sF.v, 42)));
  p.push(slide("t5-steps", L.L(steps.join(""), { tone: "lo" }), { dir: sF.a, speed: 120, period: 150, clip: path3(face) }));
  p.push(box(sb[0] - 140, sb[1] - 100, 280, 200, sb[2] - 60, 220, "mid", { bevel: 0.3 }));
  p.push(motor([sb[0] + 160, sb[1], sb[2] + 50], [sb[0] + 500, sb[1], sb[2] + 50], 80));
  for (const lx of [sb[0] - 280, sb[0] + 280]) p.push(leg(lx, sb[1] - 150, 140, sb[2] - 80, 60));
  // Debris bin under the screen's head.
  const bin = { x: sb[0] - 450, y: sb[1] - 100, w: 900, d: 700 };
  p.push(box(bin.x, bin.y, bin.w, bin.d, 140, 650, "mid", { seam: 700, r: 30 }));
  p.push(cavity([[bin.x + 40, bin.y + 40, 790], [bin.x + bin.w - 40, bin.y + 40, 790], [bin.x + bin.w - 40, bin.y + bin.d - 40, 790], [bin.x + 40, bin.y + bin.d - 40, 790]]));

  // 2 Electroflotation bath: electrodes in the water, the foam on top, the chain scraper.
  const r2 = { x: x + 1800, y: y + 300, w: 2000, d: 1900, z: 1340 };
  p.push(box(r2.x, r2.y, r2.w, r2.d, 140, r2.z - 140, "mid", { seams: [300, r2.z - 120], r: 20 }));
  const m2 = [[r2.x + 50, r2.y + 50, r2.z], [r2.x + r2.w - 50, r2.y + 50, r2.z], [r2.x + r2.w - 50, r2.y + r2.d - 50, r2.z], [r2.x + 50, r2.y + r2.d - 50, r2.z]];
  const plates = Array.from({ length: 7 }, (_, i) => box(r2.x + 250 + i * 230, r2.y + 260, 26, r2.d - 520, 500, 720, "lo", { bevel: 0.2, r: 4, steps: 2 })).join("");
  const foam = [[r2.x + 120, r2.y + 120, 1251], [r2.x + r2.w - 160, r2.y + 120, 1251], [r2.x + r2.w - 160, r2.y + r2.d - 120, 1251], [r2.x + 120, r2.y + r2.d - 120, 1251]];
  p.push(cavity(m2), clipped(path3(m2), water(m2.map(([a, b]) => [a, b, 1250]), "mid") + plates + `<path class="ln-foam" d="${path3(foam)}"/>` + flow("t5-bubbles", [[r2.x + 400, r2.y + r2.d / 2, 700], [r2.x + 500, r2.y + r2.d / 2, 1240]], { speed: 300, count: 10, size: 22, spread: 600, kind: "bubble" })), L.L(path3(m2), { tone: "lo" }));
  // Scraper: a frame over the bath with flights moving toward the sludge trough.
  for (const sy of [r2.y - 40, r2.y + r2.d]) p.push(box(r2.x, sy, r2.w, 40, r2.z, 160, "mid", { bevel: 0.2, r: 4 }));
  const flights = [];
  for (let fx = r2.x - 400; fx < r2.x + r2.w; fx += 400) flights.push(box(fx, r2.y + 40, 40, r2.d - 80, 1270, 110, "hi", { bevel: 0.2, r: 4, steps: 2 }));
  p.push(slide("t5-scraper", flights.join(""), { dir: [1, 0, 0], speed: 90, period: 400, clip: L.pathOf(G.hullOf([[r2.x + 40, r2.y, 1260], [r2.x + r2.w - 40, r2.y, 1260], [r2.x + r2.w - 40, r2.y + r2.d, 1260], [r2.x + 40, r2.y + r2.d, 1260], [r2.x + 40, r2.y, 1400], [r2.x + r2.w - 40, r2.y, 1400], [r2.x + r2.w - 40, r2.y + r2.d, 1400], [r2.x + 40, r2.y + r2.d, 1400]].map(L.at))) }));
  p.push(motor([r2.x + r2.w - 200, r2.y + r2.d + 40, r2.z + 200], [r2.x + r2.w - 200, r2.y + r2.d + 400, r2.z + 200], 80));
  // Sludge trough on the bath's end and the sludge container below it.
  p.push(box(r2.x + r2.w, r2.y + 200, 280, r2.d - 400, 950, 300, "mid", { bevel: 0.3 }));
  p.push(frustum([r2.x + r2.w + 60, r2.y + r2.d - 400, 160, 160], 950, [r2.x + r2.w + 80, r2.y + r2.d - 250, 120, 120], 760, "mid"));
  const sl = { x: r2.x + r2.w - 100, y: r2.y + r2.d - 150, w: 700, d: 600 };
  p.push(box(sl.x, sl.y, sl.w, sl.d, 140, 560, "mid", { seam: 600, r: 30 }));
  p.push(cavity([[sl.x + 40, sl.y + 40, 700], [sl.x + sl.w - 40, sl.y + 40, 700], [sl.x + sl.w - 40, sl.y + sl.d - 40, 700], [sl.x + 40, sl.y + sl.d - 40, 700]]));

  // 3 Filter battery: four columns, top and bottom headers with valves.
  const cols = [[x + 4400, y + 650], [x + 5000, y + 650], [x + 4400, y + 1450], [x + 5000, y + 1450]];
  for (const [cx, cy] of cols) {
    p.push(cylZ(cx, cy, 140, 260, 260, "lo"), cylZ(cx, cy, 260, 1700, 230, "hi"), turned(cx, cy, 1700, [[0, 230], [110, 205, 1], [190, 0, 1]], "hi"));
    p.push(cylZ(cx, cy, 1890, 1960, 50, "mid"));
  }
  // 4 Bactericidal cell: a horizontal tube with its lamp caps, on two saddles.
  const uv = { x0: x + 4200, x1: x + 5600, y: y + 2250, z: 650 };
  for (const sx of [uv.x0 + 200, uv.x1 - 200]) p.push(box(sx - 80, uv.y - 160, 160, 320, 140, uv.z - 140 - 120, "lo", { bevel: 0.2 }));
  p.push(cylX(uv.x0, uv.x1, uv.y, uv.z, 160, "hi"), cylX(uv.x1, uv.x1 + 60, uv.y, uv.z, 190, "mid"));
  for (let i = 0; i < 3; i++) p.push(cylZ(uv.x0 + 350 + i * 350, uv.y, uv.z + 150, uv.z + 260, 40, "mid"));
  // 5 Clean water tank (blue water).
  const r5 = { x: x + 4100, y: y + 2600, w: 2000, d: 800, z: 1640 };
  p.push(box(r5.x, r5.y, r5.w, r5.d, 140, r5.z - 140, "hi", { seams: [300, r5.z - 120], r: 20 }));
  const m5 = [[r5.x + 50, r5.y + 50, r5.z], [r5.x + r5.w - 50, r5.y + 50, r5.z], [r5.x + r5.w - 50, r5.y + r5.d - 50, r5.z], [r5.x + 50, r5.y + r5.d - 50, r5.z]];
  p.push(cavity(m5), clipped(path3(m5), water(m5.map(([a, b]) => [a, b, 1450]), "clean") + ripples("t5-rip5", m5.map(([a, b]) => [a, b, 1450]), { dir: [-1, 0, 0], speed: 90, spacing: 300 })), L.L(path3(m5), { tone: "lo" }));
  // Rectifier cabinet and the clean water pump.
  const cab = { x: x + 5300, y: y + 900, w: 700, d: 450 };
  p.push(box(cab.x, cab.y, cab.w, cab.d, 140, 1800, "mid", { seam: 1800 }));
  p.push(`<path class="ln-glass" d="${path3([[cab.x + 80, cab.y + cab.d, 1300], [cab.x + 380, cab.y + cab.d, 1300], [cab.x + 380, cab.y + cab.d, 1600], [cab.x + 80, cab.y + cab.d, 1600]])}"/>`);
  p.push(bolts([[cab.x + 480, cab.y + cab.d, 1450], [cab.x + 580, cab.y + cab.d, 1450]], 0.6));
  p.push(box(x + 600, y + d - 400, 700, 300, 140, 120, "lo", { bevel: 0.3 }));
  p.push(motor([x + 1100, y + d - 250, 420], [x + 650, y + d - 250, 420], 140));
  p.push(cylY(y + d - 330, y + d - 170, x + 1250, 420, 160, "mid"));
  const key = depth([x + w / 2, y + d / 2, 800]);

  // Pipes between the stages: brown into the filters, grey through them, blue after the bactericidal cell.
  items.push(...pipes([[r1.x + r1.w, r1.y + 600, 1100], [r2.x, r1.y + 600, 1100]], 55, "dirty"));
  items.push(...pipes([[r2.x + r2.w - 300, r2.y, 800], [r2.x + r2.w - 300, y + 150 + 120, 800], [x + 4400, y + 150 + 120, 800], [x + 4400, y + 420, 800]], 50, "mid"));
  items.push(...pipes([[x + 4400, y + 650, 1960], [x + 4400, y + 650, 2120], [x + 5000, y + 650, 2120], [x + 5000, y + 1450, 2120], [x + 5000, y + 1450, 1960]], 45, "mid"));
  items.push(...pipes([[x + 5000, y + 1450, 2120], [x + 5800, y + 1450, 2120], [x + 5800, uv.y, 2120], [x + 5800, uv.y, uv.z], [uv.x1 + 60, uv.y, uv.z]].reverse(), 45, "clean"));
  items.push(...pipes([[uv.x0, uv.y, uv.z], [uv.x0 - 200, uv.y, uv.z], [uv.x0 - 200, r5.y + 300, uv.z], [uv.x0 - 200, r5.y + 300, r5.z + 120], [r5.x + 200, r5.y + 300, r5.z + 120], [r5.x + 200, r5.y + 300, r5.z - 100]], 45, "clean"));
  items.push(...pipes([[r5.x, r5.y + r5.d - 200, 420], [x + 1450, r5.y + r5.d - 200, 420], [x + 1450, y + d - 250, 420]], 50, "clean"));
  return { unit: { id: "t5000", items: [{ key, svg: p.join("") }] }, items };
}
