// The workshop around the line: the back and left walls cut at 4.5 m (section faces shaded as cuts), columns every 6 m
// carrying a crane runway, strip windows, a sectional door; operators for scale and a forklift by the finished goods.
import { FLOOR } from "../layout.mjs";

export function hall(L) {
  const { box, cylZ, cylY, leg, path3, depth, S, G, P, bolts } = L;
  const items = [];
  const F = FLOOR;
  const H = 4500, T = 250;
  const wy = F.y + 60, wx = F.x + 60;
  const cols = [];
  for (let x = F.x + 1500; x < F.x + F.w - 600; x += 6000) cols.push(x);

  // Back wall in panels between the columns, each with a strip window (glass, mullions).
  const back = [];
  back.push(box(wx, wy, F.w - 120, T, 0, H, "lo", { bevel: 0, r: 4, steps: 2, seams: [400, 1700] }));
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i] + 300, b = cols[i + 1] - 300;
    const g = [[a, wy + T, 2300], [b, wy + T, 2300], [b, wy + T, 3700], [a, wy + T, 3700]];
    back.push(`<path class="ln-glass" d="${path3(g)}"/>`);
    const mull = [];
    for (let x = a + (b - a) / 4; x < b - 10; x += (b - a) / 4) mull.push(path3([[x, wy + T, 2300], [x, wy + T, 3700]], false));
    mull.push(path3([[a, wy + T, 3000], [b, wy + T, 3000]], false));
    back.push(L.L(path3(g) + mull.join(""), { tone: "lo" }));
  }
  // Columns standing in front of the wall, with crane runway brackets and the runway beam on top.
  for (const x of cols) back.push(box(x - 200, wy + T, 400, 400, 0, H, "mid", { bevel: 0.3, r: 4, steps: 2, seams: [H - 600] }));
  back.push(box(F.x + 300, wy + T + 120, F.w - 600, 260, H - 600, 300, "mid", { bevel: 0.3, r: 4, steps: 2 }));
  back.push(box(F.x + 300, wy + T + 180, F.w - 600, 120, H - 300, 60, "hi", { bevel: 0.2, r: 3, steps: 2 }));
  items.push({ key: -1e9 + 1, svg: `<g data-part="hall">${back.join("")}</g>` });

  // Left wall with a sectional door and a pedestrian door.
  const left = [];
  left.push(box(wx - T, wy, T, F.d - 120, 0, H, "lo", { bevel: 0, r: 4, steps: 2, seams: [400, 1700] }));
  const door = [[wx, F.y + 5600, 120], [wx, F.y + 8800, 120], [wx, F.y + 8800, 3800], [wx, F.y + 5600, 3800]];
  left.push(`<path class="ln-glass" d="${path3(door)}"/>`);
  const panels = [];
  for (let z = 120 + 460; z < 3800; z += 460) panels.push(path3([[wx, F.y + 5600, z], [wx, F.y + 8800, z]], false));
  left.push(L.L(path3(door) + panels.join(""), { tone: "lo" }));
  const pd = [[wx, F.y + 9400, 120], [wx, F.y + 10300, 120], [wx, F.y + 10300, 2200], [wx, F.y + 9400, 2200]];
  left.push(L.L(path3(pd), { tone: "lo" }));
  items.push({ key: -1e9, svg: `<g data-part="hall">${left.join("")}</g>` });

  // Operators in the aisles (the one by the shredder stands clear of the control cabinet): safety boots, trousers, jacket, arms, head and helmet.
  const person = (x, y, face = 1) => {
    const o = [];
    for (const dy of [-90, 90]) o.push(box(x - 60, y + dy - 55, 120, 110, 0, 80, "lo", { bevel: 0.2, r: 20, steps: 3 }), box(x - 50, y + dy - 45, 100, 90, 80, 780, "mid", { bevel: 0.2, r: 30, steps: 3 }));
    o.push(box(x - 120, y - 210, 240, 420, 860, 620, "hi", { bevel: 0.5, r: 90, steps: 4, seam: 1240 }));
    for (const dy of [-250, 250]) o.push(box(x - 45 + face * 40, y + dy - 45, 90, 90, 900, 560, "hi", { bevel: 0.2, r: 40, steps: 3 }));
    o.push(cylZ(x, y, 1480, 1540, 55, "mid"));
    o.push(S(G.sphereOf([x, y, 1630], 105, P), { tone: "hi" }));
    o.push(L.turned(x, y, 1680, [[0, 130], [20, 125, 1], [80, 100, 1], [120, 0, 1]], "mid"));
    return o.join("");
  };
  const people = [[7500, -400, -1], [35100, 5550, -1], [22600, 4500, 1]];
  for (const [x, y, f] of people) items.push({ key: depth([x, y, 900]), svg: `<g data-part="person">${person(x, y, f)}</g>` });

  // Forklift by the finished goods: counterweight body, overhead guard, mast, forks with a pallet, wheels.
  const fk = [];
  const fx = 14300, fy = 6200;
  for (const wxw of [fx - 500, fx + 450]) for (const wyw of [fy - 420, fy + 420]) fk.push(cylY(wyw - 90, wyw + 90, wxw, 260, 260, "lo"));
  fk.push(box(fx - 750, fy - 450, 1500, 900, 280, 550, "mid", { bevel: 0.6, r: 80, steps: 4, seam: 620 }));
  fk.push(box(fx + 350, fy - 420, 400, 840, 830, 300, "mid", { bevel: 0.5, r: 120, steps: 4 }));
  fk.push(box(fx - 250, fy - 250, 450, 500, 830, 420, "hi", { bevel: 0.4, r: 60, steps: 3 }));
  for (const [px, py] of [[fx - 650, fy - 400], [fx - 650, fy + 400], [fx + 250, fy - 400], [fx + 250, fy + 400]]) fk.push(leg(px, py, 830, 2150, 60, "mid"));
  fk.push(box(fx - 700, fy - 450, 1000, 900, 2150, 60, "mid", { bevel: 0.3, r: 8 }));
  for (const py of [fy - 300, fy + 300]) fk.push(box(fx - 900, py - 50, 90, 100, 120, 2700, "mid", { bevel: 0.3, r: 6, steps: 2 }));
  fk.push(box(fx - 950, fy - 360, 60, 720, 1700, 80, "lo", { bevel: 0.2 }));
  for (const py of [fy - 260, fy + 260]) fk.push(box(fx - 2050, py - 50, 1150, 100, 160, 50, "lo", { bevel: 0.2, r: 4, steps: 2 }));
  fk.push(box(fx - 2100, fy - 520, 1200, 1040, 210, 140, "lo", { bevel: 0.3, seam: 280 }));
  for (let row = 0; row < 3; row++) for (const [ox, oy] of [[40, 40], [620, 40], [40, 540], [620, 540]]) fk.push(box(fx - 2100 + ox, fy - 520 + oy, 540, 440, 350 + row * 170, 160, "hi", { bevel: 0.6, r: 70, steps: 4 }));
  items.push({ key: depth([fx - 600, fy, 800]), svg: `<g data-part="forklift">${fk.join("")}</g>` });
  return items;
}
