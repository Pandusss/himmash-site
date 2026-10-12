// Линия переработки вторичных полимеров: a "hero-lite" isometric figure built with the anatomy kit.
// World units are millimetres; x along the line, y across it (toward the viewer's left), z up, floor z = 0.
// The line is laid out in a U, as the company builds it: the washing line runs left to right along the
// back row (infeed belt, shredder, flotation machine, friction washer, centrifuge), a fan blows the clean
// flakes through a pipe over to the storage hopper at the right end of the front row, and the pelletizing
// line runs right to left (doser, crammer feeder, extruder with degassing, screen changer, water-ring
// pelletizer, pellet tank, auger into a big bag). Distances between the units are shortened.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 400;
const AZIMUTH = 56;
const ELEVATION = 33;
const TAU = Math.PI * 2;

const YB = -1700;     // back row centre line
const YF = 1100;      // front row centre line
const BACK = { x: -950, y: YB - 820, w: 10600, d: 1640 };
const FRONT = { x: 3850, y: YF - 900, w: 8650, d: 1800 };
const BACK_RING = [[BACK.x, BACK.y], [BACK.x + BACK.w, BACK.y], [BACK.x + BACK.w, BACK.y + BACK.d], [BACK.x, BACK.y + BACK.d]];
const FRONT_RING = [[FRONT.x, FRONT.y], [FRONT.x + FRONT.w, FRONT.y], [FRONT.x + FRONT.w, FRONT.y + FRONT.d], [FRONT.x, FRONT.y + FRONT.d]];
const FLOOR = [...BACK_RING, ...FRONT_RING];

// ---------- camera
const EXTREMES = [
  ...FLOOR.flatMap(([x, y]) => [[x, y, -70], [x, y, 0]]),
  [11700, YF, 3800], [9420, -1250, 4250], [1000, YB, 2250], [-700, YB, 2300], [6150, YF, 2350],
];
const P = k.fitProjection(EXTREMES, WIDTH, HEIGHT, { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION, headroom: 10 });
const V = G.viewOf(P);
const K = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const pathOf = (points, closed = true) => (points.length ? `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}` : "");
const defs = [];

// ---------- primitives (millimetres)
const plan = (x, y, w, d, r = 25) => ({ x, y, w, d, r });
const box = (x, y, w, d, z, h, tone = "mid", { bevel = 0.8, steps = 3, seam = null, r = 25 } = {}) => {
  const p = plan(x, y, w, d, r);
  return S(k.slabOf(p, z, h, P, steps, bevel), { tone, inner: seam === null ? "" : L(k.sideSeam(p, seam, P, steps), { tone: "faint" }) });
};
const FX = (y, z) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const cylX = (x0, x1, y, z, r, tone = "mid", opts = {}) => S(G.disc(x0, x1, r, FX(y, z), P, { steps: 24, ...opts }), { tone });
const cylY = (y0, y1, x, z, r, tone = "mid", opts = {}) => S(G.disc(y0, y1, r, FY(x, z), P, { steps: 24, ...opts }), { tone });
const cylZ = (x, y, z0, z1, r, tone = "mid", steps = 24, bevel = 0) => S(k.cylinder(x, y, r, z0, z1 - z0, P, steps, bevel), { tone });
const PY = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const PX = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
// Prisms: a convex polygon in (x, z) extruded along y, or in (y, z) extruded along x.
const prismY = (y0, y1, poly, tone = "mid") => S(G.prismOf(PY, poly, y0, y1, P), { tone });
const prismX = (x0, x1, poly, tone = "mid") => S(G.prismOf(PX, poly, x0, x1, P), { tone });
const turned = (x, y, z, profile, tone = "mid", steps = 32) => S(G.solidOf(profile, G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P, { steps }), { tone });
const hole = (d) => `<path class="gl-cavity" d="${d}"/>`;
const ribs = (F, s0, s1, r, n) => k.fadedSvg(G.ribsOf(F, s0, s1, r, n, P, { fade: [0.1, 0.55] }), { tone: "lo" });
const pipe = (route, r, tone = "hi", bend = 3) => tubePieces(G.fillet(route, r * bend, 6), r, P, { maxLength: 900, spacing: 1.2 / K }).map((piece) => tubeSvg(piece, { tone })).join("");
function motorX(x0, x1, y, z, r) {
  // An electric motor lying along x: fan cowl, finned body, terminal box on top.
  const c = x0 + (x1 - x0) * 0.22;
  return [cylX(x0, c, y, z, r * 0.9), cylX(c, x1, y, z, r), ribs(FX(y, z), c + 20, x1 - 20, r, 16),
    box(x0 + (x1 - x0) * 0.45, y - r * 0.4, (x1 - x0) * 0.3, r * 0.8, z + r * 0.86, r * 0.4, "mid", { bevel: 0.4 })].join("");
}
function motorZ(x, y, z0, z1, r) {
  const c = z0 + (z1 - z0) * 0.78;
  return [cylZ(x, y, z0, c, r), ribs(FZ(x, y), z0 + 20, c - 20, r, 16), cylZ(x, y, c, z1, r * 0.9)].join("");
}

// 1 Infeed belt and shredder
const BELT = { x0: -800, z0: 380, x1: 560, z1: 2250, half: 300 };
function shredder() {
  const out = [];
  const { x0, z0, x1, z1, half } = BELT;
  const zAt = (x) => z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
  out.push(prismY(YB - half - 40, YB - half, [[x0, z0], [x1, z1], [x1, z1 + 90], [x0, z0 + 90]], "mid"));
  for (const x of [-450, 250]) out.push(box(x - 40, YB - half + 20, 80, 70, 0, zAt(x) - 130, "lo", { bevel: 0.4 }));
  out.push(prismY(YB - half, YB + half, [[x0, z0 - 130], [x1, z1 - 130], [x1, z1], [x0, z0]], "hi"));
  out.push(`<g class="gl-flakes" data-flakes="belt"></g>`);
  out.push(cylY(YB - half - 20, YB + half + 20, x0 + 20, z0 - 55, 70, "mid"));
  for (const x of [-450, 250]) out.push(box(x - 40, YB + half - 90, 80, 70, 0, zAt(x) - 130, "lo", { bevel: 0.4 }));
  out.push(prismY(YB + half, YB + half + 40, [[x0, z0], [x1, z1], [x1, z1 + 90], [x0, z0 + 90]], "mid"));
  // Shredder: base, cutting body, hopper with its open mouth, flywheel on the near side.
  out.push(box(400, YB - 600, 1200, 1200, 0, 260, "lo", { seam: 120 }));
  out.push(box(520, YB - 470, 960, 940, 260, 1150, "mid", { seam: 1240 }));
  out.push(prismY(YB - 470, YB + 470, [[520, 1410], [1480, 1410], [1640, 2080], [360, 2080]], "mid"));
  const mouth = pathOf([[440, YB - 420], [1560, YB - 420], [1560, YB + 420], [440, YB + 420]].map(([x, y]) => at([x, y, 2080])));
  out.push(hole(mouth), L(mouth, { tone: "lo" }));
  out.push(cylY(YB + 470, YB + 590, 1000, 760, 400, "mid", { steps: 40 }));
  out.push(cylY(YB + 590, YB + 640, 1000, 760, 120, "mid"));
  out.push(L(G.circleOf(FY(1000, 760), YB + 590, 330, P), { tone: "lo" }));
  // Discharge screw up into the flotation bath.
  const a = [1500, YB + 150, 330], b = [2300, YB + 150, 1700];
  const F = G.frameAlong(a, G.sub3(b, a));
  const len = G.len3(G.sub3(b, a));
  out.push(S(G.disc(0, len, 110, F, P, { steps: 24 }), { tone: "mid" }));
  out.push(S(G.disc(len - 10, len + 160, 95, F, P, { steps: 24 }), { tone: "mid" }));
  return out.join("");
}

// 2 Flotation machine: an open bath with two paddle shafts.
const BATH = { x: 1950, y: YB - 650, w: 3000, d: 1300, z0: 480, z1: 1500, water: 1360, wall: 60 };
function flotation() {
  const out = [];
  const { x, y, w, d, z0, z1, water, wall } = BATH;
  for (const lx of [x + 120, x + w / 2, x + w - 200]) for (const ly of [y + 80, y + d - 160]) out.push(box(lx, ly, 90, 90, 0, z0, "lo", { bevel: 0.3 }));
  out.push(box(x, y, w, d, z0, z1 - z0, "mid", { seam: z0 + 140, r: 30 }));
  const inner = [[x + wall, y + wall], [x + w - wall, y + wall], [x + w - wall, y + d - wall], [x + wall, y + d - wall]];
  const mouth = pathOf(inner.map(([px, py]) => at([px, py, z1])));
  defs.push(`<clipPath id="gl-bath"><path d="${mouth}"/></clipPath>`);
  out.push(hole(mouth));
  out.push(`<g clip-path="url(#gl-bath)"><path class="gl-water" d="${pathOf(inner.map(([px, py]) => at([px, py, water])))}"/>`);
  for (const sy of [y + 380, y + d - 420]) {
    out.push(cylX(x + wall, x + w - wall, sy, water + 20, 55, "hi", { steps: 16 }));
    for (let i = 0; i < 11; i++) {
      const px = x + 220 + i * ((w - 440) / 10);
      const tilt = (i % 2 ? 1 : -1) * 90;
      out.push(prismY(sy - 30, sy + 30, [[px - 40 + tilt * 0.3, water + 60], [px + 40 + tilt * 0.3, water + 60], [px + 40 + tilt, water + 150], [px - 40 + tilt, water + 150]], "hi"));
    }
  }
  out.push(`<g class="gl-flakes" data-flakes="bath"></g></g>`);
  out.push(L(mouth, { tone: "lo" }));
  // Water spray header along the far rim, fed by a riser at the near end.
  out.push(cylX(x + 80, x + w - 80, y + wall / 2, z1 + 40, 40, "mid", { steps: 12 }));
  for (let i = 0; i < 6; i++) out.push(box(x + 300 + i * ((w - 600) / 5) - 20, y + 5, 40, 50, z1, 20, "lo", { bevel: 0.2, r: 5 }));
  out.push(box(x + w, YB - 260, 200, 520, z1 - 420, 360, "mid"));
  out.push(motorX(x + w + 200, x + w + 600, YB - 120, z1 - 240, 150));
  out.push(cylY(y + d, y + d + 70, x + 420, z0 + 120, 60, "mid"));
  out.push(cylY(y + d + 70, y + d + 160, x + 420, z0 + 120, 85, "mid", { steps: 6 }));
  return out.join("");
}

// 3 Friction washer: an octagonal tube rising at about 40° on a frame, motor at the top.
const WASH = { a: [5450, YB, 760], b: [6950, YB, 2050], r: 230 };
function washer() {
  const out = [];
  const { a, b, r } = WASH;
  const axis = G.unit3(G.sub3(b, a));
  const len = G.len3(G.sub3(b, a));
  const F = G.frameOf(a, axis, [0, 1, 0], G.cross3(axis, [0, 1, 0]));
  const oct = Array.from({ length: 8 }, (_, i) => [r * Math.cos((i + 0.5) * (TAU / 8)), r * Math.sin((i + 0.5) * (TAU / 8))]);
  out.push(prismY(YB - 200, YB + 200, [[4950, 1300], [5260, 1150], [5260, 1210], [4950, 1360]], "mid"));
  const slope = Math.atan2(b[2] - a[2], b[0] - a[0]);
  const zUnder = (x) => a[2] + Math.tan(slope) * (x - a[0]) - r / Math.cos(slope);
  for (const lx of [6500, 5650]) out.push(box(lx - 50, YB - 330, 100, 90, 0, zUnder(lx), "lo", { bevel: 0.3 }));
  out.push(S(G.prismOf(F, oct, 0, len, P), { tone: "hi" }));
  out.push(prismY(YB - 300, YB + 300, [[5250, 820], [5650, 820], [5730, 1210], [5170, 1210]], "mid"));
  out.push(hole(pathOf([[5210, YB - 260], [5690, YB - 260], [5690, YB + 260], [5210, YB + 260]].map(([px, py]) => at([px, py, 1210])))));
  const win = G.frameOf(G.add3(a, G.mul3(axis, len * 0.55)), axis, [0, 1, 0], G.cross3(axis, [0, 1, 0]));
  out.push(S(G.prismOf(win, [[-120, r * 0.92], [120, r * 0.92], [120, r * 1.03], [-120, r * 1.03]], -150, 150, P), { tone: "mid" }));
  const top = G.frameAlong(b, axis);
  out.push(S(G.disc(0, 150, 150, top, P, { steps: 24 }), { tone: "mid" }));
  out.push(S(G.disc(150, 500, 175, top, P, { steps: 24 }), { tone: "mid" }));
  out.push(ribs(top, 190, 480, 175, 14));
  out.push(prismY(YB - 180, YB + 180, [[6870, 1750], [7010, 1750], [7400, 1520], [7260, 1520]], "mid"));
  for (const lx of [6500, 5650]) out.push(box(lx - 50, YB + 240, 100, 90, 0, zUnder(lx), "lo", { bevel: 0.3 }));
  out.push(prismY(YB + 240, YB + 330, [[5650, 120], [5730, 120], [6500, zUnder(6500) - 160], [6420, zUnder(6500) - 160]], "lo"));
  return out.join("");
}

// 4 Centrifuge: base frame, a housing with a rounded top, belt drive on the end.
const CEN = { x0: 7150, x1: 8450, r: 520, z: 900 };
function centrifuge() {
  const out = [];
  const { x0, x1, r, z } = CEN;
  out.push(box(x0 - 120, YB - 650, x1 - x0 + 240, 1300, 0, 220, "lo", { seam: 110 }));
  const arc = Array.from({ length: 13 }, (_, i) => [r * Math.cos((i / 12) * Math.PI), z + r * Math.sin((i / 12) * Math.PI)]);
  out.push(prismX(x0, x1, [[r, 220], ...arc, [-r, 220]].map(([py, pz]) => [YB + py, pz]), "hi"));
  const seams = [];
  for (const sx of [x0 + 350, x0 + 700, x0 + 1050]) {
    const pts = [at([sx, YB + r, 220])];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI;
      if (Math.cos(t) * V[1] + Math.sin(t) * V[2] < 0.03 && i > 0) break;
      pts.push(at([sx, YB + r * Math.cos(t), z + r * Math.sin(t)]));
    }
    seams.push(pathOf(pts, false));
  }
  out.push(L(seams.join(""), { tone: "lo" }));
  const big = [YB + 80, z + 40, 330], small = [YB + 80, 420, 120];
  out.push(motorX(x1 - 40, x1 + 520, YB + 80, 420, 190));
  out.push(cylX(x1, x1 + 90, big[0], big[1], big[2], "mid", { steps: 32 }));
  out.push(cylX(x1 + 520, x1 + 600, small[0], small[1], small[2], "mid", { steps: 20 }));
  const tangent = (side) => {
    const dy = small[0] - big[0], dz = small[1] - big[1];
    const t = Math.atan2(dz, dy) + Math.acos((big[2] - small[2]) / Math.hypot(dy, dz)) * side;
    return pathOf([at([x1 + 90, big[0] + big[2] * Math.cos(t), big[1] + big[2] * Math.sin(t)]), at([x1 + 560, small[0] + small[2] * Math.cos(t), small[1] + small[2] * Math.sin(t)])], false);
  };
  out.push(L(tangent(1) + tangent(-1), { tone: "mid" }));
  out.push(L(G.circleOf(FX(big[0], big[1]), x1 + 90, 90, P), { tone: "lo" }));
  return out.join("");
}

// 5 Pneumatic conveying: fan at the end of the washing row, pipe up, along and down into the hopper.
const FAN = { x: 9420, y: -1250, z: 520, r: 300 };
const HOP = { x: 11100, y: YF - 750, w: 1300, d: 1500, z0: 2300, z1: 3500 };
const INLET = [HOP.x + HOP.w / 2, HOP.y + 300];
const PIPE = [[FAN.x, FAN.y, FAN.z + FAN.r + 160], [FAN.x, FAN.y, 4150], [INLET[0], FAN.y, 4150], [INLET[0], INLET[1], 4150], [INLET[0], INLET[1], HOP.z1 + 130]];
function pneumatic() {
  const out = [];
  const { x, y, z, r } = FAN;
  // Duct from the centrifuge's flake outlet into the fan eye, the volute, its outlet, the motor in front.
  out.push(cylY(YB + 560, y - 130, x, z + 40, 80, "mid", { steps: 16 }));
  out.push(box(x - 360, y - 260, 720, 560, 0, 120, "lo"));
  out.push(cylY(y - 130, y + 130, x, z + 40, r, "mid", { steps: 32 }));
  out.push(box(x - 110, y - 100, 220, 200, z + 40 + r - 60, 220, "mid", { bevel: 0.4 }));
  out.push(cylY(y + 130, y + 170, x, z + 40, 120, "mid"));
  out.push(cylY(y + 170, y + 420, x, z + 40, 150, "mid"));
  out.push(ribs(FY(x, z + 40), y + 190, y + 400, 150, 14));
  out.push(pipe(PIPE, 75, "hi", 3.5));
  return out.join("");
}

// 6 Storage hopper with its screw doser: the doser runs over the extruder drive to the crammer.
const FEED_X = 9500;
function hopper() {
  const out = [];
  const { x, y, w, d, z0, z1 } = HOP;
  for (const [lx, ly] of [[x + 30, y + 30], [x + w - 170, y + 30]]) out.push(box(lx, ly, 140, 140, 0, z0, "lo", { bevel: 0.4 }));
  out.push(box(x + 40, y + 50, w - 80, 80, 1100, 90, "lo", { bevel: 0.3 }));
  out.push(prismX(x, x + w, [[y, z0], [y + d, z0], [YF + 230, 1830], [YF - 230, 1830]], "mid"));
  out.push(box(x, y, w, d, z0, z1 - z0, "hi", { seam: z0 + 120, r: 20 }));
  out.push(box(x - 20, y - 20, w + 40, d + 40, z1, 50, "mid", { bevel: 0.4, r: 20 }));
  out.push(cylZ(INLET[0], INLET[1], z1 + 50, z1 + 130, 120, "mid"));
  // Air outlet with its filter sock on the roof.
  out.push(cylZ(x + w - 300, y + d - 350, z1 + 50, z1 + 110, 130, "mid"));
  out.push(turned(x + w - 300, y + d - 350, z1 + 110, [[0, 110], [260, 110, 1], [330, 80, 1], [370, 0, 1]], "hi", 24));
  const wy = y + d;
  const win = [[x + 380, 2900], [x + 820, 2900], [x + 820, 3350], [x + 380, 3350]].map(([px, pz]) => at([px, wy, pz]));
  out.push(`<path class="gl-fill" d="${pathOf([[x + 390, 2910], [x + 810, 2910], [x + 810, 3120], [x + 390, 3120]].map(([px, pz]) => at([px, wy, pz])))}"/>`, L(pathOf(win), { tone: "lo" }));
  // Doser trough: from under the hopper over the motor and gearbox to the crammer's inlet.
  out.push(cylX(FEED_X + 330, x + w + 120, YF, 1650, 150, "mid", { steps: 24 }));
  out.push(box(x + w + 120, YF - 150, 220, 300, 1500, 300, "mid", { bevel: 0.4 }));
  out.push(cylX(x + w + 340, x + w + 600, YF, 1650, 120, "mid"));
  out.push(ribs(FX(YF, 1650), x + w + 360, x + w + 580, 120, 12));
  for (const [lx, ly] of [[x + 30, y + d - 170], [x + w - 170, y + d - 170]]) out.push(box(lx, ly, 140, 140, 0, z0, "lo", { bevel: 0.4 }));
  out.push(box(x + 40, y + d - 130, w - 80, 80, 1100, 90, "lo", { bevel: 0.3 }));
  // Control cabinet of the line at the front corner.
  out.push(box(x + w - 380, y + d + 120, 420, 260, 0, 1650, "mid", { seam: 120 }));
  const cy = y + d + 380;
  out.push(L(pathOf([[x + w - 340, 200], [x + w + 0, 200], [x + w + 0, 1580], [x + w - 340, 1580]].map(([px, pz]) => at([px, cy, pz]))), { tone: "lo" }));
  out.push(D([[x + w - 250, 1380], [x + w - 170, 1380], [x + w - 90, 1380], [x + w - 250, 1250], [x + w - 170, 1250], [x + w - 90, 1250]].map(([px, pz]) => at([px, cy, pz])), { size: 0.7, tone: "hi" }));
  out.push(D([at([x + w - 60, cy, 950])], { size: 0.9, tone: "hi" }));
  // A stand under the doser where it crosses the motor.
  out.push(box(10750 - 40, YF - 300, 80, 80, 0, 1500, "lo", { bevel: 0.3 }));
  return out.join("");
}

// 7 Crammer feeder: a cone on the feed throat, gear motor on top, side inlet from the doser.
function crammer() {
  const out = [];
  out.push(turned(FEED_X, YF, 1180, [[0, 150], [420, 360], [520, 360]], "hi", 32));
  out.push(cylZ(FEED_X, YF, 1700, 1740, 380, "mid", 32));
  out.push(cylZ(FEED_X, YF, 1740, 1880, 150, "mid"));
  out.push(motorZ(FEED_X, YF, 1880, 2350, 160));
  return out.join("");
}

// 8 Extruder: frame, drive (gearbox, thrust unit, motor), feed section, barrel with heater bands,
// degassing vent with its vacuum line to the vacuum unit behind the frame.
const BARREL = { x0: 6950, x1: 9350, z: 950, r: 120 };
function extruder() {
  const out = [];
  const vx = BARREL.x0 + 220 + 3 * 400 + 150;
  out.push(box(vx - 250, YF - 1150, 500, 400, 0, 760, "mid", { seam: 600 }));
  out.push(pipe([[vx, YF, BARREL.z + 380], [vx, YF, BARREL.z + 560], [vx, YF - 950, BARREL.z + 560], [vx, YF - 950, 760]], 30, "mid", 4));
  out.push(box(6800, YF - 420, 4200, 840, 0, 520, "mid", { seam: 420, r: 30 }));
  out.push(box(9850, YF - 380, 600, 760, 520, 720, "mid", { seam: 1080, r: 30 }));
  out.push(cylX(9730, 9850, YF, BARREL.z, 230, "mid"));
  out.push(cylX(9680, 9730, YF, BARREL.z, 250, "hi"));
  out.push(motorX(10450, 10950, YF - 60, 860, 260));
  out.push(box(9350, YF - 220, 330, 440, 760, 400, "hi", { bevel: 0.6 }));
  out.push(cylX(BARREL.x0, BARREL.x1, YF, BARREL.z, BARREL.r, "hi", { steps: 20 }));
  for (let i = 0; i < 6; i++) {
    if (i === 3) continue;
    const hx = BARREL.x0 + 220 + i * 400;
    out.push(cylX(hx, hx + 290, YF, BARREL.z, BARREL.r + 55, "mid", { steps: 24 }));
    out.push(box(hx + 95, YF - 50, 100, 100, BARREL.z + BARREL.r + 50, 70, "mid", { bevel: 0.3, r: 10 }));
  }
  out.push(cylZ(vx, YF, BARREL.z + 100, BARREL.z + 330, 110, "mid"));
  out.push(cylZ(vx, YF, BARREL.z + 330, BARREL.z + 380, 150, "mid"));
  for (const sx of [7400, 8700]) out.push(box(sx - 50, YF - 90, 100, 180, 520, BARREL.z - BARREL.r - 520, "lo", { bevel: 0.3 }));
  return out.join("");
}

// 9 Screen changer: body on the barrel end, two plates, two cylinders up.
function screenChanger() {
  const out = [];
  const x0 = 6500, x1 = 6950;
  out.push(box(x0, YF - 420, x1 - x0, 840, 520, 760, "mid", { seam: 600 }));
  for (const py of [YF - 230, YF + 230]) {
    out.push(box(x0 + 150, py - 120, 150, 240, 1280, 240, "hi", { bevel: 0.4 }));
    out.push(cylZ(x0 + 225, py, 1520, 2150, 70, "hi", 16));
    out.push(cylZ(x0 + 225, py, 2150, 2230, 95, "mid", 16));
  }
  // Ports on the near cylinder, and the hydraulic station on casters in front, with its two hoses.
  const cx = x0 + 225, cy = YF + 230;
  for (const pz of [1600, 2080]) out.push(cylY(cy + 60, cy + 110, cx, pz, 28, "mid", { steps: 12 }));
  const st = { x: 6380, y: YF + 520, w: 640, d: 330 };
  for (const [wx, wy] of [[st.x + 70, st.y + 60], [st.x + st.w - 70, st.y + 60], [st.x + 70, st.y + st.d - 60], [st.x + st.w - 70, st.y + st.d - 60]]) out.push(cylY(wy - 20, wy + 20, wx, 45, 45, "lo", { steps: 12 }));
  out.push(box(st.x, st.y, st.w, st.d, 90, 420, "mid", { seam: 300 }));
  out.push(cylZ(st.x + 470, st.y + st.d / 2, 510, 540, 90, "mid", 16));
  out.push(motorZ(st.x + 470, st.y + st.d / 2, 540, 860, 85));
  out.push(cylZ(st.x + 150, st.y + st.d / 2, 510, 570, 45, "mid", 12));
  for (const [i, pz] of [[0, 1600], [1, 2080]]) {
    const hx = st.x + 240 + i * 90;
    out.push(pipe([[hx, st.y + st.d / 2, 510], [hx, st.y + st.d / 2, pz], [cx, cy + 110, pz]], 14, "mid", 6));
  }
  return out.join("");
}

// 10 Water-ring pelletizer: head on the screen changer, water-ring housing, motor on top.
const PEL = { x: 6150, y: YF };
function pelletizer() {
  const out = [];
  out.push(cylX(6300, 6500, YF, BARREL.z, 150, "mid"));
  out.push(cylZ(PEL.x, PEL.y, 700, 1250, 250, "hi", 32));
  out.push(L(k.sideArc(PEL.x, PEL.y, 250, 980, P, 32), { tone: "faint" }));
  out.push(cylZ(PEL.x, PEL.y, 1250, 1330, 280, "mid", 32));
  out.push(cylZ(PEL.x, PEL.y, 1330, 1620, 150, "mid"));
  out.push(cylZ(PEL.x, PEL.y, 1620, 1680, 210, "mid"));
  out.push(motorZ(PEL.x, PEL.y, 1680, 2200, 190));
  out.push(cylY(YF + 245, YF + 370, PEL.x - 60, 1050, 45, "mid"));
  // Melt pressure gauge on the head adapter, dial toward the viewer.
  out.push(cylZ(6420, YF, BARREL.z + 140, BARREL.z + 420, 18, "mid", 10));
  out.push(cylY(YF - 30, YF + 30, 6420, BARREL.z + 500, 90, "hi", { steps: 24 }));
  out.push(L(G.circleOf(FY(6420, BARREL.z + 500), YF + 30, 70, P), { tone: "lo" }));
  out.push(L(pathOf([at([6420, YF + 30, BARREL.z + 500]), at([6470, YF + 30, BARREL.z + 545])], false), { tone: "hi", free: "end" }));
  return out.join("");
}

// 11 Pellets: water separator tank under the pelletizer, auger up to a big bag on a pallet.
const BAG = { x: 4200, w: 900, top: 1150 };
const SPOUT = [4650, YF, 2000];
function pellets() {
  const out = [];
  out.push(cylX(5500, 6150, YF, 820, 70, "mid", { steps: 16 }));
  for (const [lx, ly] of [[5150, YF - 260], [5650, YF - 260]]) out.push(box(lx - 30, ly - 30, 60, 60, 0, 520, "lo", { bevel: 0.3 }));
  out.push(turned(5400, YF, 420, [[0, 90], [380, 320], [540, 320]], "hi", 32));
  for (const [lx, ly] of [[5150, YF + 260], [5650, YF + 260]]) out.push(box(lx - 30, ly - 30, 60, 60, 0, 520, "lo", { bevel: 0.3 }));
  out.push(box(BAG.x - 40, YF - 520, 1000, 1040, 0, 140, "lo", { bevel: 0.6 }));
  out.push(box(BAG.x, YF - 450, BAG.w, 900, 140, BAG.top - 140, "hi", { bevel: 1.2, r: 160, steps: 6 }));
  out.push(`<path class="gl-fill" d="${pathOf(k.roundedPlan(plan(BAG.x + 60, YF - 390, BAG.w - 120, 780, 120), 6).map(([px, py]) => at([px, py, BAG.top])))}"/>`);
  // Lifting loops of the bag, sewn on its top edges.
  for (const ly of [YF - 450, YF + 450]) for (const lx of [BAG.x + 200, BAG.x + BAG.w - 280]) {
    out.push(L(pathOf([at([lx, ly, BAG.top]), at([lx, ly, BAG.top + 150]), at([lx + 80, ly, BAG.top + 150]), at([lx + 80, ly, BAG.top])], false), { tone: "lo" }));
  }
  out.push(`<g class="gl-pellets" data-pellets></g>`);
  const a = [5250, YF, 360], b = [SPOUT[0] + 140, YF, SPOUT[2] + 80];
  const F = G.frameAlong(a, G.sub3(b, a));
  out.push(S(G.disc(0, G.len3(G.sub3(b, a)), 85, F, P, { steps: 16 }), { tone: "mid" }));
  out.push(cylZ(SPOUT[0], YF, SPOUT[2] - 40, SPOUT[2] + 80, 70, "mid", 16));
  // Gear motor on the upper end of the auger, past the spout.
  const len = G.len3(G.sub3(b, a));
  out.push(S(G.disc(len, len + 70, 70, F, P, { steps: 16 }), { tone: "mid" }));
  out.push(S(G.disc(len + 70, len + 330, 95, F, P, { steps: 20 }), { tone: "mid" }));
  out.push(ribs(F, len + 90, len + 310, 95, 12));
  return out.join("");
}

// ---------- floor
function floor() {
  // Two floor plates, one per row; the pneumatic pipe crosses between them overhead.
  const out = [];
  for (const [p, ring] of [[BACK, BACK_RING], [FRONT, FRONT_RING]]) {
    const pl = plan(p.x, p.y, p.w, p.d, 60);
    out.push(`<path class="iso-halo" d="${k.haloOf(pl, -70, 70, P)}"/>`);
    out.push(S(k.slabOf(pl, -70, 70, P, 3, 1.2), { tone: "lo", inner: L(k.sideSeam(pl, -35, P, 3), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(pl, 120), 0, P, 3), { tone: "faint" }));
    const bolts = k.corners(pl, 60);
    out.push(L(bolts.map(([x, y]) => k.ring(x, y, 36, 0, P, 12)).join(""), { tone: "lo" }));
    out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.45 }));
  }
  return out.join("");
}

const UNITS = [
  { id: "shredder", svg: shredder },
  { id: "flotation", svg: flotation },
  { id: "washer", svg: washer },
  { id: "centrifuge", svg: centrifuge },
  { id: "pneumatic", svg: pneumatic },
  { id: "hopper", svg: hopper },
  { id: "feeder", svg: crammer },
  { id: "extruder", svg: extruder },
  { id: "changer", svg: screenChanger },
  { id: "pelletizer", svg: pelletizer },
  { id: "pellets", svg: pellets },
];
const group = (i) => `<g data-unit="${i}" data-hit>${UNITS[i].svg()}</g>`;
// Painter's order: back row left to right and the pipe, then the front row from its far (left) end.
const body = [floor(), group(0), group(1), group(2), group(3), group(4), group(10), group(9), group(8), group(7), group(6), group(5)];
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: SVG_CLASS, label: "", body: [`<defs>${defs.join("")}</defs>`, ...body] });

// Douglas-Peucker thinning of the kit's dense outlines and tone sheets (the same for a fill and its outline).
function thin(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let worst = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dd = len > 1e-6 ? Math.abs((px - ax) * dy - (py - ay) * dx) / len : Math.hypot(px - ax, py - ay);
      if (dd > worst) { worst = dd; idx = i; }
    }
    if (worst > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
function thinPath(d, tol = 0.12) {
  if (/[^MLZ0-9 .\-]/.test(d)) return d;
  return d.split(/(?=M)/).map((sub) => {
    const closed = /Z$/.test(sub);
    const pts = sub.replace(/Z$/, "").slice(1).split("L").map((pair) => pair.trim().split(/\s+/).map(Number));
    let out;
    if (closed && pts.length > 4) {
      let far = 0, best = -1;
      pts.forEach(([x, y], i) => { const dd = Math.hypot(x - pts[0][0], y - pts[0][1]); if (dd > best) { best = dd; far = i; } });
      const a = thin(pts.slice(0, far + 1), tol), b = thin([...pts.slice(far), pts[0]], tol);
      out = [...a, ...b.slice(1, -1)];
    } else out = thin(pts, tol);
    return `M${out.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}`;
  }).join("");
}
const thinSvg = (markup) => markup.replace(/(<path class="(?:iso-fill|iso-line iso-edge|iso-line iso-crease|iso-line iso-bevel|iso-shade|iso-top|tb-body|tb-shine|tb-shade|iso-line tb-edge)"[^>]*? d=")([^"]*)"/g, (_, head, d) => `${head}${thinPath(d)}"`);

const DATA = {
  view: { origin: P.origin, scale: P.scale, azimuth: P.azimuth, elevation: P.elevation },
  units: UNITS.map((u) => u.id),
  belt: BELT, beltY: YB,
  bath: { x0: BATH.x + 150, x1: BATH.x + BATH.w - 150, y0: BATH.y + 140, y1: BATH.y + BATH.d - 330, z: BATH.water + 6 },
  spout: SPOUT, bagTop: BAG.top,
};

const CSS = figureCss(`
.gl-cavity{fill:var(--gl-cavity);stroke:none}
.gl-water{fill:var(--gl-water);stroke:none}
.gl-fill{fill:var(--gl-fill);stroke:none}
.gl-flakes circle{fill:var(--anatomy-dot);opacity:.55}
.gl-pellets circle{fill:var(--anatomy-dot);opacity:.7}`, {
  light: "--gl-cavity:#c9d0c7;--gl-water:#d3e2e6;--gl-fill:#d9ddd6",
  dark: "--gl-cavity:#0b100d;--gl-water:#1d3236;--gl-fill:#2a3530",
});

const file = writeFigure({ id: "granulation-lines", svg: thinSvg(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "granulation-lines", file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
