// Активная фрикционная скоростная мойка: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; z up. The octagonal housing lies on an incline of 32° in the x-z plane: the feed end
// (hopper, heavy lower bearing unit) is low at x = 0, the discharge end (belt drive, motor on top) is high at +x.
// Two side panels of the housing are taken off over the middle of its length, so the rotor is seen inside.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "friction-washer";
const WIDTH = 520;
const HEIGHT = 600;

// ---------- dimensions (mm)
const INC = (32 * Math.PI) / 180;
const CI = Math.cos(INC), SI = Math.sin(INC);
const A = [CI, 0, SI];            // along the rotor, uphill
const U = [0, 1, 0];              // across, toward the viewer's side
const VV = [-SI, 0, CI];          // square to the rotor, up
const H0 = 560;                   // rotor axis above the floor at the feed end
const O = [0, 0, H0];
const L = 3000;                   // housing length
const RA = 360;                   // octagon: distance to the flats
const T = 8;                      // sheet
const HALF = RA * Math.tan(Math.PI / 8);
const W0 = 760, W1 = 2240;        // the window where the side panels are off
const SUP = [520, 2520];          // trunnion supports
const SHAFT_R = 130;
const PADDLE = { r0: 126, r1: 330, w: 150, t: 16, beta: (35 * Math.PI) / 180 };
const PADDLES = [];
for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) PADDLES.push({ s: 260 + i * 225, phase: (j * 2 * Math.PI) / 3 + (i * Math.PI) / 6 });
const MOTOR = { v: RA + T + 330, r: 175, s0: L - 520, s1: L + 60 };

const pt = (s, u = 0, v = 0) => [O[0] + A[0] * s + U[0] * u + VV[0] * v, O[1] + A[1] * s + U[1] * u + VV[1] * v, O[2] + A[2] * s + U[2] * u + VV[2] * v];

const P = k.fitProjection(
  [
    pt(-460, 0, 0), pt(-30, 420, 420), pt(-30, -420, -420), pt(0, 420, -420),
    pt(L + 340, 0, MOTOR.v + 160), pt(L + 340, 0, -240), pt(L - 520, 0, MOTOR.v + MOTOR.r + 120),
    pt(420, 0, RA + 560), [0, 560, 0], [0, -560, 0], [2500, 560, 0], [2500, -560, 0],
    pt(L - 250, 0, -RA - 400),
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 120 },
);
const V = G.viewOf(P);
const LIGHT = G.lightOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const seg = (a, b) => k.segment(a, b, P);
const FA = G.frameOf(O, A, U, VV);                      // prisms along the rotor take polygons in (u, v)
const alongA = (poly, s0, s1) => G.prismOf(FA, poly, s0, s1, P);
const axisAt = (s, u = 0, v = 0) => G.frameOf(pt(s, u, v), A, U, VV);

// Any convex hexahedron: corners 0-3 one end, 4-7 the other, in the same winding.
const FACES = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
function hexa(c) {
  const centre = c.reduce((sum, p) => G.add3(sum, p), [0, 0, 0]).map((v) => v / 8);
  const flat = c.map(at);
  const buckets = [[], [], [], [], []];
  const seen = FACES.map((f) => {
    let n = G.cross3(G.sub3(c[f[1]], c[f[0]]), G.sub3(c[f[2]], c[f[0]]));
    const mid = f.reduce((sum, i) => G.add3(sum, c[i]), [0, 0, 0]).map((v) => v / 4);
    if (G.dot3(n, G.sub3(mid, centre)) < 0) n = G.mul3(n, -1);
    n = G.unit3(n);
    const visible = G.dot3(n, V) > 1e-6;
    if (visible) buckets[G.bandOf(G.dot3(n, LIGHT))].push(pathOf(f.map((i) => flat[i])));
    return visible;
  });
  const edges = new Map();
  FACES.forEach((f, fi) => f.forEach((a, i) => {
    const b = f[(i + 1) % 4];
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    edges.set(key, [...(edges.get(key) || []), fi]);
  }));
  const crease = [], outline = [];
  for (const [key, list] of edges) {
    const count = list.filter((fi) => seen[fi]).length;
    const [a, b] = key.split("-").map(Number);
    if (count === 2) crease.push(pathOf([flat[a], flat[b]], false));
    if (count === 1) outline.push(pathOf([flat[a], flat[b]], false));
  }
  return { fill: pathOf(G.hullOf(flat)), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}
// A square beam from p to q, w wide across the horizontal normal and h deep in the vertical plane through it.
function beam(p, q, w, h) {
  const d = G.unit3(G.sub3(q, p));
  const side = Math.abs(d[2]) > 0.99 ? [1, 0, 0] : G.unit3(G.cross3(d, [0, 0, 1]));
  const up = G.unit3(G.cross3(side, d));
  const c = (o, a, b) => G.add3(o, G.add3(G.mul3(side, a), G.mul3(up, b)));
  const ring = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  return hexa([...ring.map(([a, b]) => c(p, a, b)), ...ring.map(([a, b]) => c(q, a, b))]);
}

// ---------- housing
// Face k of the octagon is centred at angle 45k in the (u, v) plane: 0 faces the viewer's side, 90 is the top,
// 270 the bottom screen.
function faceQuad(deg, inner = RA, t = T) {
  const a = (deg * Math.PI) / 180;
  const d = [Math.cos(a), Math.sin(a)], tau = [-Math.sin(a), Math.cos(a)];
  const h0 = inner * Math.tan(Math.PI / 8), h1 = (inner + t) * Math.tan(Math.PI / 8);
  return [
    [inner * d[0] - h0 * tau[0], inner * d[1] - h0 * tau[1]],
    [inner * d[0] + h0 * tau[0], inner * d[1] + h0 * tau[1]],
    [(inner + t) * d[0] + h1 * tau[0], (inner + t) * d[1] + h1 * tau[1]],
    [(inner + t) * d[0] - h1 * tau[0], (inner + t) * d[1] - h1 * tau[1]],
  ];
}
const panel = (deg, s0, s1, tone = "mid", inner = "") => S(alongA(faceQuad(deg), s0, s1), { tone, crease: "none", inner });
// A point on the inner surface of face `deg`, `f` across it (-1..1), at s.
const onFace = (deg, s, f, r = RA - 1) => {
  const a = (deg * Math.PI) / 180;
  return pt(s, r * Math.cos(a) - f * HALF * Math.sin(a), r * Math.sin(a) + f * HALF * Math.cos(a));
};

function interior() {
  const out = [];
  out.push(panel(135, 0, L));
  out.push(panel(180, 0, L));
  out.push(panel(225, 0, L));
  // Bottom screen: perforated sheet, its holes seen from inside through the window.
  out.push(panel(270, 0, L));
  const holes = [];
  for (let s = W0 + 20; s < W1 - 10; s += 44) for (let f = -0.8; f <= 0.81; f += 0.32) holes.push(at(onFace(270, s + (Math.round(f * 3) % 2 ? 22 : 0), f)));
  out.push(D(holes, { size: 0.55, tone: "mid" }));
  // Seams where the back panels meet, under the window only (elsewhere the front panels hide them).
  const seams = [157.5, 202.5, 247.5].map((deg) => {
    const a = (deg * Math.PI) / 180, r = (RA - 1) / Math.cos(Math.PI / 8);
    return seg(pt(0, r * Math.cos(a), r * Math.sin(a)), pt(L, r * Math.cos(a), r * Math.sin(a)));
  });
  out.push(Ln(seams.join(""), { tone: "lo" }));
  return out.join("");
}

function outside() {
  const out = [];
  // Front-top and top faces run the whole length; the side and lower front faces only outside the window.
  const weld = (deg, list) => Ln(list.map((s) => seg(onFace(deg, s, -1, RA + T + 0.5), onFace(deg, s, 1, RA + T + 0.5))).join(""), { tone: "faint" });
  out.push(panel(315, 0, W0, "mid", weld(315, [300])));
  out.push(panel(315, W1, L, "mid", weld(315, [2700])));
  out.push(panel(0, 0, W0, "mid", weld(0, [300])));
  out.push(panel(0, W1, L, "mid", weld(0, [2700])));
  out.push(panel(45, 0, W0, "mid", weld(45, [300])));
  out.push(panel(45, W1, L, "mid", weld(45, [2700])));
  // Rating plate on the side, between the window and the upper support.
  const lp = [[RA + T, -55], [RA + T + 3, -55], [RA + T + 3, 55], [RA + T, 55]];
  out.push(S(alongA(lp, W1 + 70, W1 + 210), { tone: "mid" }));
  out.push(Ln([[25, 0.75], [0, 1], [-25, 0.5]].map(([v, f]) => seg(pt(W1 + 90, RA + T + 3.5, v), pt(W1 + 90 + 100 * f, RA + T + 3.5, v))).join(""), { tone: "lo", free: true }));
  out.push(D([pt(W1 + 80, RA + T + 3.5, 42), pt(W1 + 200, RA + T + 3.5, 42), pt(W1 + 80, RA + T + 3.5, -42), pt(W1 + 200, RA + T + 3.5, -42)].map(at), { size: 0.4 }));
  out.push(panel(90, 0, L, "mid", Ln(sectionSeams(90), { tone: "faint" })));
  // Frame round the window: flat bars bolted along its edges.
  const a1 = (67.5 * Math.PI) / 180, a2 = (-67.5 * Math.PI) / 180, R = (RA + T) / Math.cos(Math.PI / 8);
  const bar = (ang) => {
    const u = R * Math.cos(ang), v = R * Math.sin(ang);
    const n = [Math.cos(ang), Math.sin(ang)];
    return [[u - n[1] * 26, v + n[0] * 26], [u + n[1] * 26, v - n[0] * 26], [u + n[1] * 26 + n[0] * 14, v - n[0] * 26 + n[1] * 14], [u - n[1] * 26 + n[0] * 14, v + n[0] * 26 + n[1] * 14]];
  };
  out.push(S(alongA(bar(a1), W0 - 40, W1 + 40), { tone: "mid" }));
  out.push(S(alongA(bar(a2), W0 - 40, W1 + 40), { tone: "mid" }));
  const bolts = [];
  for (let s = W0; s <= W1 + 1; s += 185) for (const ang of [a1, a2]) bolts.push(at(pt(s, (R + 14) * Math.cos(ang), (R + 14) * Math.sin(ang))));
  out.push(D(bolts, { size: 0.55 }));
  // Cut ends of the side panels, framed by a flat bar across each end of the window.
  for (const s of [W0 - 40, W1]) {
    for (const deg of [315, 0, 45]) out.push(S(alongA(faceQuad(deg, RA + T, 14), s, s + 40), { tone: "mid" }));
  }
  return out.join("");
}
// Weld seams across the panel where the housing sections join, edge to edge across the face.
function sectionSeams(deg) {
  return [1000, 2000].map((s) => seg(onFace(deg, s, -1, RA + T + 0.5), onFace(deg, s, 1, RA + T + 0.5))).join("");
}

// End plates: octagonal flanges a little larger than the housing.
function endPlate(s0, s1, bolts = false) {
  const R = (RA + T + 40) / Math.cos(Math.PI / 8);
  const poly = Array.from({ length: 8 }, (_, i) => {
    const a = ((i + 0.5) / 8) * 2 * Math.PI;
    return [R * Math.cos(a), R * Math.sin(a)];
  });
  let out = S(alongA(poly, s0, s1), { tone: "mid" });
  if (bolts) {
    // Bolts round the flange, on the face toward the housing, where it shows beyond the housing.
    const r = RA + T + 20;
    const list = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * Math.PI;
      const u = r * Math.cos(a) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)), Math.abs(Math.cos(a) + Math.sin(a)) / Math.SQRT2, Math.abs(Math.cos(a) - Math.sin(a)) / Math.SQRT2);
      const v = r * Math.sin(a) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)), Math.abs(Math.cos(a) + Math.sin(a)) / Math.SQRT2, Math.abs(Math.cos(a) - Math.sin(a)) / Math.SQRT2);
      list.push(at(pt(s1, u * 1.0, v * 1.0)));
    }
    out += D(list, { size: 0.5 });
  }
  return out;
}

// ---------- feed end: hopper on top and the heavy lower bearing unit
function hopper() {
  const out = [];
  const top = RA + T;
  const s0 = 170, s1 = 640, hw = 190;
  const base = [pt(s0, -hw, top), pt(s1, -hw, top), pt(s1, hw, top), pt(s0, hw, top)];
  out.push(S(alongA([[-hw - 30, top], [hw + 30, top], [hw + 30, top + 20], [-hw - 30, top + 20]], s0 - 30, s1 + 30), { tone: "mid" }));
  const lift = 20;
  const bottom = base.map((p) => G.add3(p, G.mul3(VV, lift)));
  const cx = (bottom[0][0] + bottom[2][0]) / 2, cz = Math.max(...bottom.map((p) => p[2])) + 430;
  const half = 250;
  const rim = [[cx - half, -half, cz], [cx + half, -half, cz], [cx + half, half, cz], [cx - half, half, cz]];
  out.push(S(hexa([...bottom, ...rim]), { tone: "mid" }));
  const mouth = k.ringOf(plan(cx - half + 24, -half + 24, 2 * half - 48, 2 * half - 48, 3), 2);
  out.push(`<path class="fw-void" d="${pathOf(mouth.map(([x, y]) => at([x, y, cz])))}"/>`);
  out.push(Ln(pathOf(mouth.map(([x, y]) => at([x, y, cz]))), { tone: "mid" }));
  return { svg: out.join(""), mouth: { x: cx, half: half - 24, z: cz } };
}
const HOP = hopper();

function lowerBearing() {
  const out = [];
  const F = G.frameOf(O, G.mul3(A, -1), U, G.mul3(VV, 1));
  const ring = (s0, s1, r, tone = "mid", extra = "") => out.push(S(G.disc(s0, s1, r, F, P), { tone, inner: extra }));
  ring(24, 52, 300);
  out.push(D(G.dotsOf(F, 52, 268, 16, P, { fade: [0.04, 0.42] }), { size: 0.6 }));
  ring(52, 176, 205, "lo");
  ring(176, 204, 222);
  out.push(D(G.dotsOf(F, 204, 196, 10, P, { fade: [0.04, 0.42] }), { size: 0.55 }));
  ring(204, 390, 152, "hi", Ln([250, 330].map((s) => G.arcOf(F, s, 152, P)).join(""), { tone: "faint" }));
  ring(390, 420, 166);
  out.push(D(G.dotsOf(F, 420, 128, 8, P, { all: true }), { size: 0.5 }));
  ring(420, 446, 52, "hi");
  return out.join("");
}

// ---------- discharge end: bearing, belt guard, motor on its pedestal
function upperEnd() {
  const out = [];
  const F = axisAt(L);
  out.push(S(G.disc(24, 150, 140, F, P), { tone: "mid" }));
  // Belt guard round both pulleys (painted steel, as in the photo).
  // Two brackets from the end flange carry the guard.
  for (const u of [-150, 150]) out.push(S(alongA([[u - 20, 230], [u + 20, 230], [u + 20, 300], [u - 20, 300]], L + 24, L + 150), { tone: "mid" }));
  const guard = G.stadium(175, 120, MOTOR.v);
  out.push(S(alongA(guard.map(([x, y]) => [y, x]), L + 150, L + 290), { tone: "mid" }));   // the stadium runs along v
  return out.join("");
}
function motor() {
  const out = [];
  const top = RA + T;
  // Pedestal welded to the top face.
  const ped = [[-190, top], [190, top], [190, MOTOR.v - MOTOR.r - 20], [-190, MOTOR.v - MOTOR.r - 20]];
  out.push(S(alongA(ped, MOTOR.s0 - 20, MOTOR.s1 - 60), { tone: "mid", inner: Ln(seg(pt(MOTOR.s0 - 20, 190, top + 60), pt(MOTOR.s1 - 60, 190, top + 60)), { tone: "faint" }) }));
  const F = axisAt(0, 0, MOTOR.v);
  // Feet on the pedestal.
  for (const s of [MOTOR.s0 + 60, MOTOR.s1 - 200]) for (const u of [-130, 130]) out.push(S(alongA([[u - 35, MOTOR.v - MOTOR.r - 20], [u + 35, MOTOR.v - MOTOR.r - 20], [u + 35, MOTOR.v - 60], [u - 35, MOTOR.v - 60]], s, s + 80), { tone: "mid" }));
  out.push(S(G.disc(MOTOR.s0, MOTOR.s0 + 60, MOTOR.r - 12, F, P), { tone: "mid" }));
  const ribs = G.ribsOf(F, MOTOR.s0 + 60, MOTOR.s1 - 40, MOTOR.r, 28, P, { fade: [0.08, 0.5], seams: true });
  out.push(S(G.disc(MOTOR.s0 + 60, MOTOR.s1 - 40, MOTOR.r, F, P), { tone: "mid", crease: "none", inner: k.fadedSvg(ribs, { tone: "lo" }) }));
  out.push(S(G.disc(MOTOR.s1 - 40, MOTOR.s1, MOTOR.r - 14, F, P), { tone: "mid" }));
  out.push(S(G.disc(MOTOR.s1, L + 150, 28, F, P), { tone: "hi", crease: "none" }));
  // Terminal box on top of the frame.
  const box = [[-95, MOTOR.v + MOTOR.r - 25], [95, MOTOR.v + MOTOR.r - 25], [95, MOTOR.v + MOTOR.r + 85], [-95, MOTOR.v + MOTOR.r + 85]];
  out.push(S(alongA(box, MOTOR.s0 + 170, MOTOR.s0 + 370), { tone: "mid" }));
  const gland = G.frameOf(pt(MOTOR.s0 + 230, 95, MOTOR.v + MOTOR.r + 30), U, A, VV);
  out.push(S(G.disc(0, 26, 17, gland, P), { tone: "mid" }));
  const gland2 = G.frameOf(pt(MOTOR.s0 + 310, 95, MOTOR.v + MOTOR.r + 30), U, A, VV);
  out.push(S(G.disc(0, 26, 17, gland2, P), { tone: "mid" }));
  return out.join("");
}

// ---------- water: spray header along the front-top face, drain trough under the screen
const HEADER_R = 30;
const HEADER = (() => {
  return { u: 40, v: RA + T + 70, s0: W0 + 110, s1: L - 700 };
})();
const NOZZLES = [];
for (let s = HEADER.s0 + 160; s < HEADER.s1 - 60; s += 260) NOZZLES.push(s);
function header() {
  const out = [];
  const F = axisAt(0, HEADER.u, HEADER.v);
  // Nozzle stubs into the face, then the header, its brackets and the end cap; the hot-water feed rises at its lower end.
  for (const s of NOZZLES) {
    const stub = G.frameOf(pt(s, HEADER.u, RA + T), VV, A, U);
    out.push(S(G.disc(0, 44, 16, stub, P), { tone: "mid" }));
    out.push(S(G.disc(16, 28, 24, stub, P, { steps: 6 }), { tone: "mid" }));
  }
  out.push(S(G.disc(HEADER.s0, HEADER.s1, HEADER_R, F, P), { tone: "mid", crease: "none", inner: Ln([HEADER.s0 + 40, HEADER.s1 - 40].map((s) => G.arcOf(F, s, HEADER_R, P)).join(""), { tone: "faint" }) }));
  out.push(S(G.disc(HEADER.s1, HEADER.s1 + 16, HEADER_R + 6, F, P), { tone: "mid" }));
  // Riser to the hot-water line: an elbow ball, a vertical pipe with a valve, a flange at the top.
  const p0 = pt(HEADER.s0, HEADER.u, HEADER.v);
  out.push(S(G.sphereOf(p0, HEADER_R + 8, P), { tone: "mid" }));
  const up = G.frameAlong(p0, [0, 0, 1]);
  out.push(S(G.disc(HEADER_R + 2, 330, HEADER_R, up, P), { tone: "mid", crease: "none" }));
  out.push(S(G.disc(150, 210, HEADER_R + 22, up, P), { tone: "mid" }));
  out.push(S(k.slabOf(plan(p0[0] - 30, p0[1] - 30, 60, 60, 4), p0[2] + 210, 44, P, 2, 1), { tone: "mid" }));
  out.push(S(G.disc(330, 350, HEADER_R + 26, up, P), { tone: "mid" }));
  out.push(D(G.dotsOf(up, 350, HEADER_R + 15, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.5 }));
  return out.join("");
}
const TROUGH = { s0: 660, s1: 2440, w: 210, d: 110, v: -(RA + T) };
function drainTrough() {
  const out = [];
  const { s0, s1, w, d, v } = TROUGH;
  const poly = [[-w, v], [w, v], [w, v - d], [0, v - d - 90], [-w, v - d]];
  out.push(S(alongA(poly, s0, s1), { tone: "mid", inner: Ln(seg(pt(s0, w, v - d), pt(s1, w, v - d)), { tone: "faint" }) }));
  // Outlet at the low end of the trough, a pipe down to the drain tank.
  const p = pt(s0 + 70, 0, v - d - 90);
  const F = G.frameAlong(p, [0, 0, -1]);
  out.push(S(G.disc(-4, 30, 48, F, P), { tone: "mid" }));
  out.push(S(G.disc(30, p[2] - 300, 34, F, P), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(p[2] - 300, p[2] - 280, 42, F, P), { tone: "mid" }));
  return { svg: out.join(""), outlet: [p[0], p[1], 280] };
}
const DRAIN = drainTrough();
function tank() {
  const [x, y] = DRAIN.outlet;
  const p = plan(x - 260, y - 300, 520, 600, 10);
  const out = [];
  out.push(S(k.slabOf(p, 0, 190, P, 4, 2), { tone: "lo" }));
  out.push(`<path class="fw-dirty" d="${pathOf(k.ringOf(k.insetPlan(p, 16), 4).map(([px, py]) => at([px, py, 160])))}"/>`);
  out.push(Ln(k.planOutline(k.insetPlan(p, 12), 190, P, 4), { tone: "lo" }));
  return out.join("");
}
// Discharge chute under the upper end: clean flakes fall out of it.
function chute() {
  const s0 = L - 420, s1 = L - 120, hw = 170, v = -(RA + T);
  const topC = [pt(s0, -hw, v), pt(s1, -hw, v), pt(s1, hw, v), pt(s0, hw, v)];
  const z = Math.min(...topC.map((p) => p[2])) - 320;
  const cx = (topC[0][0] + topC[1][0]) / 2;
  const bottom = [[cx - 150, -hw, z], [cx + 150, -hw, z], [cx + 150, hw, z], [cx - 150, hw, z]];
  return { svg: S(hexa([...topC, ...bottom]), { tone: "mid" }), mouth: { x: [cx - 130, cx + 130], y: [-hw + 20, hw - 20], z } };
}
const CHUTE = chute();

// ---------- stand
const POST = 90;
function standPart(side) {
  // side: -1 back, +1 front. Posts under the trunnion blocks, a tie between them low down, a diagonal brace.
  const out = [];
  const y = side * (RA + T + 70);
  for (const s of SUP) {
    const c = pt(s, side * (RA + T + 70), 0);
    const zTop = c[2] - 75;
    out.push(S(k.slabOf(plan(c[0] - POST / 2, y - POST / 2, POST, POST, 2), 100, zTop - 100 - 20, P, 2, 1), { tone: "mid", inner: Ln(k.sideSeam(plan(c[0] - POST / 2, y - POST / 2, POST, POST, 2), zTop - 140, P, 2), { tone: "faint" }) }));
    out.push(S(k.slabOf(plan(c[0] - 90, y - 75, 180, 150, 3), zTop - 20, 20, P, 2, 1), { tone: "mid" }));
  }
  const a = pt(SUP[0], y, 0), b = pt(SUP[1], y, 0);
  out.push(S(beam([a[0] + POST / 2, y, 170], [b[0] - POST / 2, y, b[2] - 520], 70, 70), { tone: "mid" }));
  return out.join("");
}
function floorFrame(side) {
  const y = side * (RA + T + 70);
  const a = pt(SUP[0], 0, 0)[0], b = pt(SUP[1], 0, 0)[0];
  const p = plan(a - 160, y - 50, b - a + 320, 100, 2);
  const out = [];
  out.push(S(k.slabOf(p, 0, 100, P, 2, 1), { tone: "lo", inner: Ln(k.sideSeam(p, 50, P, 2), { tone: "faint" }) }));
  return out.join("");
}
function feet(side) {
  const y = side * (RA + T + 70);
  const a = pt(SUP[0], 0, 0)[0], b = pt(SUP[1], 0, 0)[0];
  return [a - 110, b + 110].map((x) => S(k.cylinder(x, y, 70, -2, 26, P, 28), { tone: "lo" }) + S(k.cylinder(x, y, 14, 24, 40, P, 12), { tone: "mid" })).join("");
}
function crossTies() {
  const a = pt(SUP[0], 0, 0)[0], b = pt(SUP[1], 0, 0)[0];
  const w = RA + T + 70;
  return [a, b].map((x) => S(k.slabOf(plan(x - 45, -w + 50, 90, 2 * w - 100, 2), 0, 90, P, 2, 1), { tone: "lo" })).join("");
}
// Trunnion: a stub shaft from the side flat into a pillow-block bearing on the post.
function trunnion(side, s) {
  const out = [];
  const u0 = side * (RA + T), u1 = side * (RA + T + 130);
  const F = G.frameOf(pt(s, u0, 0), G.mul3(U, side), A, VV);
  const c = pt(s, side * (RA + T + 70), 0);
  const block = (inner) => {
    out.push(S(k.slabOf(plan(c[0] - 80, c[1] - 40, 160, 80, 4), c[2] - 75, 28, P, 3, 1), { tone: "mid" }));
    out.push(D([at([c[0] - 58, c[1], c[2] - 47]), at([c[0] + 58, c[1], c[2] - 47])], { size: 0.6 }));
    out.push(inner);
  };
  const pad = S(G.disc(0, 18, 80, F, P), { tone: "mid" });
  const shaft = S(G.disc(18, 130, 34, F, P), { tone: "hi", crease: "none" });
  const housing = S(G.disc(40, 100, 64, G.frameOf(pt(s, u0, 0), G.mul3(U, side), A, VV), P), { tone: "lo" });
  if (side > 0) { out.push(pad); block(housing); out.push(shaft); }
  else { block(""); out.push(shaft); out.push(housing); out.push(pad); }
  return out.join("");
}

// ---------- rotor
function paddleSolid({ s, phase }, angle = 0) {
  const a = phase + angle;
  const er = G.add3(G.mul3(U, Math.cos(a)), G.mul3(VV, Math.sin(a)));
  const et = G.add3(G.mul3(U, -Math.sin(a)), G.mul3(VV, Math.cos(a)));
  const ew = G.add3(G.mul3(A, Math.cos(PADDLE.beta)), G.mul3(et, Math.sin(PADDLE.beta)));
  const en = G.cross3(er, ew);
  const rm = (PADDLE.r0 + PADDLE.r1) / 2;
  const centre = G.add3(pt(s), G.mul3(er, rm));
  const hr = (PADDLE.r1 - PADDLE.r0) / 2, hw = PADDLE.w / 2, ht = PADDLE.t / 2;
  return { paths: G.prismOf(G.frameOf(centre, en, er, ew), [[-hr, -hw], [hr, -hw], [hr, hw], [-hr, hw]], -ht, ht, P), centre, er };
}
function rotorSvg() {
  const back = [], front = [];
  for (const [index, p] of PADDLES.entries()) {
    const { paths, centre, er } = paddleSolid(p);
    const node = { depth: G.dot3(centre, V), html: `<g data-paddle="${index}">${S(paths, { tone: "hi" })}</g>` };
    (G.dot3(er, V) < 0 ? back : front).push(node);
  }
  const sort = (list) => list.sort((a, b) => a.depth - b.depth).map((n) => n.html).join("");
  const F = axisAt(0);
  const shaft = S(G.disc(60, L - 60, SHAFT_R, F, P), { tone: "hi", inner: Ln([200, L - 200].map((s) => G.arcOf(F, s, SHAFT_R, P)).join(""), { tone: "faint" }) });
  return `<g class="fw-rotor" data-rotor data-hit><g data-layer="back">${sort(back)}</g>${shaft}<g data-layer="front">${sort(front)}</g></g>`;
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    ...[-1, 1].map((side) => {
      const a = pt(SUP[0], 0, 0)[0], b = pt(SUP[1], 0, 0)[0];
      return `<path class="iso-halo" d="${k.haloOf(plan(a - 180, side * (RA + T + 70) - 70, b - a + 360, 140, 20), 0, 30, P)}"/>`;
    }),
    feet(-1),
    floorFrame(-1),
    crossTies(),
    standPart(-1),
    trunnion(-1, SUP[1]),
    trunnion(-1, SUP[0]),
    upperEnd(),
    endPlate(L, L + 24),
    `<g class="fw-drops" data-chute></g>`,
    CHUTE.svg,
    tank(),
    `<g class="fw-drops" data-drain></g>`,
    DRAIN.svg,
    `<g class="fw-cavity">${interior()}</g>`,
    `<g class="fw-flakes" data-flakes></g>`,
    rotorSvg(),
    `<g class="fw-drops" data-spray></g>`,
    outside(),
    endPlate(-24, 0, true),
    lowerBearing(),
    HOP.svg,
    `<g class="fw-flakes" data-in></g>`,
    header(),
    motor(),
    floorFrame(1),
    feet(1),
    standPart(1),
    trunnion(1, SUP[1]),
    trunnion(1, SUP[0]),
  ],
});

const cam = k.cameraOf(P);
const DATA = {
  proj: { ox: P.origin[0], oy: P.origin[1], k: cam.k, sinA: cam.sinA, cosA: cam.cosA, sinE: cam.sinE, cosE: cam.cosE },
  view: V,
  light: LIGHT,
  bands: [0, 0.2, 0.42, 0.62],
  origin: O,
  axis: [A, U, VV],
  step: k.axisVector(P, A),
  paddle: PADDLE,
  paddles: PADDLES.map((p) => [p.s, +p.phase.toFixed(4)]),
  flakes: { s0: 200, s1: L - 200, r: RA - 40 },
  window: [W0, W1],
  nozzles: NOZZLES.map((s) => [s, HEADER.u, RA - 20]),
  drain: DRAIN.outlet,
  chute: CHUTE.mouth,
  hopper: HOP.mouth,
  materials: [
    { q: 500, size: 50 },
    { q: 500, size: 100 },
    { q: 700, size: 30 },
    { q: 900, size: 30 },
  ],
  rps: 0.5,
};

const CSS = figureCss(`
.fw-void{fill:var(--fw-void);stroke:none}
.fw-cavity{--anatomy-paper:var(--fw-c-paper);--anatomy-top:var(--fw-c-top);--anatomy-shade-0:var(--fw-c0);--anatomy-shade-1:var(--fw-c1);--anatomy-shade-2:var(--fw-c2);--anatomy-shade-3:var(--fw-c3)}
.fw-dirty{fill:var(--fw-dirt);opacity:.5;stroke:none}
.fw-drops ellipse{fill:var(--fw-water);stroke:none}
.fw-drops ellipse[data-dirty]{fill:var(--fw-dirt)}
.fw-flakes path{stroke:none}
.fw-flakes [data-c="0"]{fill:var(--fw-dirt)}
.fw-flakes [data-c="1"]{fill:var(--fw-half)}
.fw-flakes [data-c="2"]{fill:var(--fw-clean);stroke:var(--anatomy-mid);stroke-width:.5px}`, {
  light: "--fw-void:#2a3530;--fw-water:#3f7f9a;--fw-dirt:#7a6a4f;--fw-half:#a39a83;--fw-clean:#fff;--fw-c-paper:#e9ede7;--fw-c-top:#eef1ec;--fw-c0:#cfd6cc;--fw-c1:#d7ddd4;--fw-c2:#dee3db;--fw-c3:#e5e9e2",
  dark: "--fw-void:#050706;--fw-water:#7fb8d0;--fw-dirt:#9a7f55;--fw-half:#b8b09a;--fw-clean:#eef3ef;--fw-c-paper:#131a15;--fw-c-top:#18201a;--fw-c0:#0d130f;--fw-c1:#101611;--fw-c2:#131a15;--fw-c3:#161e18",
});

const file = writeFigure({ id: ID, svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("k", cam.k.toFixed(4), "wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
