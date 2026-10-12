// Шнековый питатель (задавливатель) сырья в экструдер: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x along the feeder axis (drive at +x, discharge at -x), y across, z up.
// The feeder bolts its nozzle to the side feed port of the extruder, whose barrel runs along y.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 420;

// ---------- the machine in millimetres (overall up to 3 000 × 1 000 × 1 400 mm by spec)
const AZ = 720;                       // feeder axis height
const HOUSING = { x0: -400, x1: 300, r: 200 };
const SHELL = 8;
const CONE = { x0: -1100, x1: -444, r0: 110, r1: 200 };
const NOZZLE = { x0: -1440, x1: -1144, r: 95 };
const OUTLET = -1466;                 // face of the outlet flange on the extruder feed port
const NECK = { x: -400, y: -200, w: 700, d: 400, r: 3 };
const NECK_TOP = 980;
const HOP = { z0: 992, z1: 1372, rim: 1400, cx: -50, b: [350, 200], t: [490, 370] };
const FILL_Z = 1318;

const FRAME_Y = 260;                  // centre lines of the side members
const TUBE = 60;
const LOW_TOP = 420;
const HIGH_TOP = 500;
const LEGS_X = [-640, 560, 1180];

// Extruder feed section (drawn as a cut-out piece of the extruder).
const XE = -1633;
const BLOCK = { x: -1800, y: -180, w: 334, d: 360, r: 6 };
const BLOCK_Z = [AZ - 180, AZ + 180];
const BARREL_R = 130;
const BORE_R = 76;
const ESCREW_R = 50;
const CUT_Y = 560;

// Screw: constant root, flight follows the barrel, pitch falls along the cone (compression).
const ROOT_R = 60;
const SCREW_X = [-1082, 292];
const PITCH = (x) => (x >= CONE.x1 ? 300 : 300 - (140 * (CONE.x1 - x)) / (CONE.x1 - CONE.x0));
const coneR = (x) => CONE.r0 + ((CONE.r1 - CONE.r0) * (x - CONE.x0)) / (CONE.x1 - CONE.x0);
const outerR = (x) => (x >= HOUSING.x0 ? HOUSING.r : coneR(x));
const flightR = (x) => outerR(x) - SHELL - 4;

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: -700, y: -320, w: 1910, d: 640, r: 0 }, 0, 600),
    ...k.boxCorners({ x: HOP.cx - HOP.t[0], y: -HOP.t[1], w: 2 * HOP.t[0], d: 2 * HOP.t[1], r: 0 }, HOP.z0, HOP.rim),
    ...k.boxCorners({ x: BLOCK.x, y: -440, w: 340, d: CUT_Y + 440, r: 0 }, 0, BLOCK_Z[1]),
    [1100, 0, AZ + 235],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 52 },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
// Facets about 5 px long on screen: tone fills only, outlines stay analytic.
const facets = (r) => Math.max(12, Math.min(44, Math.round(r * KS * 1.25)));
const disc = (s0, s1, r, F, o = {}) => G.disc(s0, s1, r, F, P, { steps: facets(r), ...o });
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 3) => ({ x, y, w, d, r });
const centred = (cx, cy, w, d, r = 3) => plan(cx - w / 2, cy - d / 2, w, d, r);
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const deg = (a) => (a * Math.PI) / 180;

// Frames: along x with angle 0 = +y and 90° = +z; along y with angle 0 = +x and 90° = +z.
const FX = (y = 0, z = AZ) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (x, z = AZ) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const FZ = (x, y, z) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const ax = (x, r, th, y = 0, z = AZ) => [x, y + r * Math.cos(th), z + r * Math.sin(th)];
const box = (x0, x1, y0, y1, z0, z1, tone = "mid", steps = 2, bevel = 0) => S(k.slabOf(plan(x0, y0, x1 - x0, y1 - y0, Math.min(3, (x1 - x0) / 4, (y1 - y0) / 4)), z0, z1 - z0, P, steps, bevel), { tone });

// ---------- frame of square tube on levelling feet
function foot(x, y) {
  const out = [];
  out.push(S(k.cylinder(x, y, 52, 0, 18, P, 28, 1.2), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 11, 18, 70, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, 22, 52, 16, P, 6), { tone: "mid" }));
  out.push(S(k.slabOf(centred(x, y, 100, 100, 3), 88, 10, P, 2), { tone: "mid" }));
  return out.join("");
}
const legTop = (x) => (x < 0 ? LOW_TOP : HIGH_TOP);
function leg(x, y) {
  return S(k.slabOf(centred(x, y, TUBE, TUBE, 3), 98, legTop(x) - 98, P, 2), { tone: "mid", crease: "none" });
}
const rail = (x0, x1, y, z) => box(x0, x1, y - TUBE / 2, y + TUBE / 2, z - TUBE, z);
const cross = (x, z, y0 = -FRAME_Y + TUBE / 2, y1 = FRAME_Y - TUBE / 2) => box(x - TUBE / 2, x + TUBE / 2, y0, y1, z - TUBE, z);

function frameFar() {
  const y = -FRAME_Y;
  const out = [];
  for (const x of LEGS_X) out.push(foot(x, y));
  for (const x of LEGS_X) out.push(leg(x, y));
  out.push(rail(LEGS_X[0] + 30, LEGS_X[1] - 30, y, 160));
  out.push(rail(LEGS_X[1] + 30, LEGS_X[2] - 30, y, 160));
  out.push(rail(LEGS_X[0] + 30, LEGS_X[1] - 30, y, LOW_TOP));
  out.push(rail(LEGS_X[1] + 30, LEGS_X[2] - 30, y, HIGH_TOP));
  return out.join("");
}
function frameNear() {
  const y = FRAME_Y;
  const out = [];
  out.push(cross(LEGS_X[2], 160));
  out.push(cross(LEGS_X[2], HIGH_TOP));
  out.push(rail(LEGS_X[0] + 30, LEGS_X[1] - 30, y, 160));
  out.push(rail(LEGS_X[1] + 30, LEGS_X[2] - 30, y, 160));
  out.push(rail(LEGS_X[0] + 30, LEGS_X[1] - 30, y, LOW_TOP));
  out.push(rail(LEGS_X[1] + 30, LEGS_X[2] - 30, y, HIGH_TOP));
  for (const x of LEGS_X) out.push(foot(x, y));
  for (const x of LEGS_X) out.push(leg(x, y));
  // Label plate on the near top rail of the drive section.
  const lx = 870, lz = HIGH_TOP - 30;
  const Fp = G.frameOf([lx, y + TUBE / 2, lz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.prismOf(Fp, [[-70, -18], [70, -18], [70, 18], [-70, 18]], 0, 2, P), { tone: "mid" }));
  out.push(L([[-52, 6, 40], [-52, -1, 26], [-52, -8, 34]].map(([x0, z0, len]) => k.segment([lx + x0, y + TUBE / 2 + 2, lz + z0], [lx + x0 + len * 2.2, y + TUBE / 2 + 2, lz + z0], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([lx - 62, y + TUBE / 2 + 2, lz]), at([lx + 62, y + TUBE / 2 + 2, lz])], { size: 0.45 }));
  return out.join("");
}
function frameMiddle() {
  const out = [];
  out.push(cross(LEGS_X[0], 160));
  out.push(cross(LEGS_X[0], LOW_TOP));
  out.push(cross(-60, 160));
  for (const x of [-330, 230]) out.push(cross(x, LOW_TOP));
  out.push(cross(LEGS_X[1], 160));
  out.push(cross(LEGS_X[1], HIGH_TOP));
  for (const x of [700, 940]) out.push(cross(x, 160));
  for (const x of [650, 950]) out.push(cross(x, HIGH_TOP));
  return out.join("");
}

// Saddles carry the feed housing on the low cross members.
function saddle(x) {
  const out = [];
  out.push(S(k.slabOf(centred(x, 0, 90, 230, 3), LOW_TOP, 12, P, 2, 1), { tone: "mid" }));
  out.push(D([-85, 85].map((y) => at([x, y, LOW_TOP + 12])), { size: 0.45 }));
  const h = AZ - HOUSING.r - LOW_TOP - 12 + 10;
  out.push(S(k.slabOf(centred(x, 0, 18, 150, 2), LOW_TOP + 12, h, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf(centred(x, 0, 60, 18, 2), LOW_TOP + 12, h - 5, P, 2), { tone: "mid" }));
  return out.join("");
}

// ---------- extruder feed section on its stand
function extruder() {
  const out = [];
  const stand = plan(-1770, -150, 274, 300, 4);
  out.push(`<path class="iso-halo" d="${k.haloOf(stand, 0, 40, P)}"/>`);
  out.push(S(k.slabOf(k.insetPlan(stand, -20), 0, 20, P, 3, 1.5), { tone: "lo" }));
  out.push(D(k.corners(k.insetPlan(stand, -20), 14).map(([x, y]) => at([x, y, 20])), { size: 0.45 }));
  // Back stub of the barrel (towards the extruder drive): ends on its flange.
  out.push(S(disc(-320, -298, 165, FY(XE)), { tone: "mid" }));
  out.push(S(disc(-298, BLOCK.y, BARREL_R, FY(XE)), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(stand, 20, BLOCK_Z[0] - 20 - 20, P, 3, 1), { tone: "mid", inner: L(k.sideSeam(stand, 120, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(stand, -10), BLOCK_Z[0] - 20, 20, P, 3, 1), { tone: "mid" }));
  // Water-cooled feed block with the side port the feeder bolts to.
  out.push(S(k.slabOf(BLOCK, BLOCK_Z[0], BLOCK_Z[1] - BLOCK_Z[0], P, 4, 2), { tone: "mid", inner: L(k.sideSeam(BLOCK, BLOCK_Z[0] + 60, P, 4), { tone: "faint" }) }));
  for (const x of [-1730, -1540]) {
    out.push(S(k.cylinder(x, -60, 24, BLOCK_Z[1], 22, P, 6), { tone: "mid" }));
    out.push(S(k.cylinder(x, -60, 13, BLOCK_Z[1] + 22, 34, P, 14), { tone: "mid" }));
    out.push(S(k.cylinder(x, -60, 17, BLOCK_Z[1] + 56, 12, P, 16, 1), { tone: "mid" }));
  }
  out.push(D([[-1770, 0], [-1500, 0], [-1770, 150], [-1500, 150]].map(([x, y]) => at([x, y, BLOCK_Z[1]])), { size: 0.45 }));
  // Front stub of the barrel with a heater band; it ends in a section through the feed zone.
  const F = FY(XE);
  out.push(S(disc(BLOCK.y + BLOCK.d, BLOCK.y + BLOCK.d + 22, 165, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, BLOCK.y + BLOCK.d + 22, 148, 8, P, { phase: Math.PI / 8, fade: [0.04, 0.42] }), { size: 0.5 }));
  const heater = [360, 450];
  out.push(S(disc(BLOCK.y + BLOCK.d + 22, heater[0], BARREL_R, F), { tone: "hi", crease: "none" }));
  out.push(S(disc(heater[0], heater[1], BARREL_R + 14, F), { tone: "mid", inner: L(G.arcOf(F, (heater[0] + heater[1]) / 2, BARREL_R + 14, P), { tone: "faint" }) }));
  out.push(S(k.slabOf(centred(XE, (heater[0] + heater[1]) / 2, 70, 60, 3), AZ + BARREL_R + 10, 40, P, 2, 1), { tone: "mid" }));
  out.push(S(disc(heater[1], CUT_Y, BARREL_R, F), { tone: "hi", crease: "none" }));
  // The section face: barrel wall, bore, screw root.
  const face = (r, steps = 64) => Array.from({ length: steps }, (_, i) => at([XE + r * Math.cos((i / steps) * 2 * Math.PI), CUT_Y, AZ + r * Math.sin((i / steps) * 2 * Math.PI)]));
  out.push(`<path class="sf-bore" d="${pathOf(face(BORE_R))}"/>`);
  out.push(`<path class="sf-melt" data-sf="ext-fill" d=""/>`);
  out.push(`<path class="iso-fill sf-root-face" d="${pathOf(face(ESCREW_R, 40))}"/>`);
  out.push(L(pathOf(face(ESCREW_R, 40)), { tone: "hi" }));
  out.push(`<path class="sf-eflight" data-sf="ext-flight" d=""/>`);
  out.push(L(pathOf(face(BORE_R)), { tone: "mid" }));
  out.push(D([at([XE, CUT_Y, AZ])], { size: 0.7, tone: "hi" }));
  return out.join("");
}

// ---------- conical screw table for the live script (x, flight radius and unwrapped angle)
function screwTable() {
  const xs = [], rs = [], ts = [];
  let x = SCREW_X[1], t = 0;
  const dt = (2 * Math.PI) / 36;
  while (x > SCREW_X[0]) {
    xs.push(Math.round(x * 10) / 10);
    rs.push(Math.round(flightR(x) * 10) / 10);
    ts.push(Math.round(t * 1000) / 1000);
    // advance by dt of angle: dx = p/(2π)·dt, with a midpoint step for the varying pitch
    const half = x - (PITCH(x) * dt) / (4 * Math.PI);
    x -= (PITCH(half) * dt) / (2 * Math.PI);
    t += dt;
  }
  return { x: xs, r: rs, t: ts };
}

// ---------- windows cut into the cone and the feed housing
const thLo = deg(-60);
function windowRings(inset) {
  // W1 on the cone: x from -1060 to -590, angles -60°..110°.
  const w1 = [];
  const xa = -590, xb = -1060, thHi = deg(110);
  const steps = 14;
  for (let i = 0; i <= steps; i++) { const x = xa + ((xb - xa) * i) / steps; w1.push(ax(x, coneR(x) - inset, thLo)); }
  for (let i = 0; i <= 24; i++) { const th = thLo + ((thHi - thLo) * i) / 24; w1.push(ax(xb, coneR(xb) - inset, th)); }
  for (let i = 0; i <= steps; i++) { const x = xb + ((xa - xb) * i) / steps; w1.push(ax(x, coneR(x) - inset, thHi)); }
  for (let i = 0; i <= 24; i++) { const th = thHi + ((thLo - thHi) * i) / 24; w1.push(ax(xa, coneR(xa) - inset, th)); }
  // W2 on the feed housing and the front wall of the throat box.
  const w2 = [];
  const x0 = -340, x1 = 240, top = NECK_TOP - 16, R = HOUSING.r - inset;
  w2.push(ax(x0, R, thLo), ax(x1, R, thLo));
  for (let i = 1; i <= 12; i++) w2.push(ax(x1, R, thLo + (-thLo * i) / 12));
  w2.push([x1, R, top], [x0, R, top]);
  for (let i = 0; i <= 12; i++) w2.push(ax(x0, R, (thLo * i) / 12));
  return [w1, w2];
}
const OUTER = windowRings(0);
const INNER = windowRings(SHELL);
const flat = (ring) => ring.map(at);

function windowBack(index) {
  const out = [];
  out.push(`<path class="sf-cut" d="${pathOf(flat(OUTER[index]))}"/>`);
  out.push(`<path class="sf-cavity" d="${pathOf(flat(INNER[index]))}"/>`);
  return out.join("");
}
function windowEdges(index) {
  return L(pathOf(flat(INNER[index])), { tone: "lo" }) + L(pathOf(flat(OUTER[index])), { tone: "mid" });
}
function windowInside(index) {
  const out = [];
  out.push(`<g clip-path="url(#sf-win-${index})">`);
  if (index === 1) {
    // Far inner corner where the throat wall meets the trough, and the throat opening above.
    out.push(L(k.segment([-420, -HOUSING.r + SHELL, AZ], [320, -HOUSING.r + SHELL, AZ], P), { tone: "faint" }));
    out.push(`<path class="sf-flake" data-sf="throat" d=""/>`);
  }
  out.push(`<g data-sf="screw" data-hit>`);
  for (let i = 0; i < 9; i++) out.push(`<path class="sf-fb" data-sf="back" d=""/><path class="sf-be" data-sf="back-edge" d=""/>`);
  out.push(`</g><g data-hit>`);
  out.push(S(G.solidOf([[SCREW_X[0] - 20, 22], [SCREW_X[0] + 20, ROOT_R], [HOUSING.x1, ROOT_R]], FX(), P, { steps: facets(ROOT_R) }), { tone: "hi", crease: "none" }));
  out.push(`</g><path class="sf-flake" data-sf="flakes" d=""/><g data-sf="screw" data-hit>`);
  for (let i = 0; i < 9; i++) out.push(`<path class="sf-ff" data-sf="front" d=""/><path class="sf-fe" data-sf="front-edge" d=""/>`);
  out.push(`</g></g>`);
  return out.join("");
}

// ---------- barrel: nozzle, cone, feed housing, throat box and hopper
function nozzle() {
  const out = [];
  const F = FX();
  out.push(S(disc(OUTLET, NOZZLE.x0, 150, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, NOZZLE.x0, 125, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.6, tone: "mid" }));
  out.push(S(disc(NOZZLE.x0, NOZZLE.x1, NOZZLE.r, F), { tone: "lo", crease: "none" }));
  out.push(S(disc(NOZZLE.x1, NOZZLE.x1 + 22, 160, F), { tone: "mid" }));
  out.push(S(disc(NOZZLE.x1 + 22, CONE.x0, 160, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, CONE.x0, 140, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.6, tone: "mid" }));
  return out.join("");
}
function cone() {
  return S(G.solidOf([[CONE.x0, CONE.r0], [CONE.x1, CONE.r1]], FX(), P, { steps: facets(CONE.r1) }), { tone: "mid", crease: "none" });
}
function joint() {
  const out = [];
  const F = FX();
  out.push(S(disc(CONE.x1, CONE.x1 + 22, 250, F), { tone: "mid" }));
  out.push(S(disc(CONE.x1 + 22, HOUSING.x0, 250, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, HOUSING.x0, 228, 12, P, { phase: Math.PI / 12, fade: [0.04, 0.42] }), { size: 0.6, tone: "mid" }));
  return out.join("");
}
function housing() {
  const out = [];
  out.push(S(disc(HOUSING.x0, HOUSING.x1, HOUSING.r, FX()), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(NECK, AZ, NECK_TOP - AZ, P, 2), { tone: "mid", crease: "faint" }));
  // Top flange of the throat box with its bolts.
  const flange = k.insetPlan(NECK, -30);
  out.push(S(k.slabOf(flange, NECK_TOP, HOP.z0 - NECK_TOP, P, 2, 0.8), { tone: "mid" }));
  return out.join("");
}
function rearEnd() {
  const out = [];
  const F = FX();
  out.push(S(disc(HOUSING.x1, HOUSING.x1 + 22, 250, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, HOUSING.x1 + 22, 228, 12, P, { all: true, phase: Math.PI / 12 }), { size: 0.6, tone: "mid" }));
  // Bearing housing of the screw shaft, then the coupling to the gearbox.
  out.push(S(disc(HOUSING.x1 + 22, HOUSING.x1 + 42, 140, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, HOUSING.x1 + 42, 118, 6, P, { all: true }), { size: 0.55, tone: "mid" }));
  out.push(S(disc(HOUSING.x1 + 42, 470, 92, F), { tone: "hi", crease: "none", inner: L(G.arcOf(F, 400, 92, P), { tone: "faint" }) }));
  out.push(S(disc(470, 490, 70, F), { tone: "mid" }));
  out.push(S(disc(490, 522, 38, F), { tone: "hi", crease: "none" }));
  out.push(S(disc(522, 556, 78, F), { tone: "mid" }));
  out.push(S(disc(556, 564, 66, F), { tone: "lo" }));
  out.push(S(disc(564, 598, 78, F), { tone: "mid" }));
  out.push(S(disc(598, 616, 38, F), { tone: "hi", crease: "none" }));
  return out.join("");
}

// Hopper: four sheet walls flaring up to a collar; walls as thin plates.
const hopperCorner = (sx, sy, z) => {
  const t = (z - HOP.z0) / (HOP.z1 - HOP.z0);
  const hx = HOP.b[0] + (HOP.t[0] - HOP.b[0]) * t;
  const hy = HOP.b[1] + (HOP.t[1] - HOP.b[1]) * t;
  return [HOP.cx + sx * hx, sy * hy, z];
};
function wall(sx, sy) {
  // A wall facing (sx, 0) or (0, sy): four corners, bottom then top.
  const corners = sx ? [hopperCorner(sx, -1, HOP.z0), hopperCorner(sx, 1, HOP.z0), hopperCorner(sx, 1, HOP.z1), hopperCorner(sx, -1, HOP.z1)]
    : [hopperCorner(-1, sy, HOP.z0), hopperCorner(1, sy, HOP.z0), hopperCorner(1, sy, HOP.z1), hopperCorner(-1, sy, HOP.z1)];
  const centre = corners.reduce((a, p) => G.add3(a, G.mul3(p, 0.25)), [0, 0, 0]);
  const u = G.unit3(G.sub3(corners[1], corners[0]));
  const up = G.sub3(G.mul3(G.add3(corners[2], corners[3]), 0.5), G.mul3(G.add3(corners[0], corners[1]), 0.5));
  let n = G.unit3(G.cross3(u, up));
  const out = sx ? [sx, 0, 0] : [0, sy, 0];
  if (G.dot3(n, out) < 0) n = G.mul3(n, -1);
  const v = G.cross3(n, u);
  const F = G.frameOf(centre, n, u, v);
  const poly = corners.map((p) => { const d = G.sub3(p, centre); return [G.dot3(d, u), G.dot3(d, v)]; });
  return S(G.prismOf(F, poly, -5, 0, P), { tone: "mid", crease: "none" });
}
function collar(side) {
  const [hx, hy] = HOP.t;
  const z = HOP.z1, h = HOP.rim - HOP.z1;
  const c = HOP.cx;
  const plans = {
    back: plan(c - hx, -hy - 6, 2 * hx, 6, 1),
    left: plan(c - hx - 6, -hy - 6, 6, 2 * hy + 12, 1),
    right: plan(c + hx, -hy - 6, 6, 2 * hy + 12, 1),
    front: plan(c - hx, hy, 2 * hx, 6, 1),
  };
  return S(k.slabOf(plans[side], z, h, P, 2, 0.6), { tone: "mid" });
}
function hopperFill() {
  const z = FILL_Z;
  const ring = [hopperCorner(-1, -1, z), hopperCorner(1, -1, z), hopperCorner(1, 1, z), hopperCorner(-1, 1, z)].map(at);
  const out = [];
  out.push(`<clipPath id="sf-fill"><path d="${pathOf(ring)}"/></clipPath>`);
  out.push(`<path class="sf-heap" d="${pathOf(ring)}"/>`);
  // A static layer of film flakes lying on the surface.
  const flakes = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const p = hopperCorner(rnd() * 2 - 1, rnd() * 2 - 1, z);
    const c = at(p);
    const s = 1.4 + rnd() * 1.6, a = rnd() * Math.PI;
    const pts = [0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.5 : 0); const rr = s * (j % 2 ? 0.6 : 1); return [c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t) * 0.6]; });
    flakes.push(pathOf(pts));
  }
  out.push(`<g clip-path="url(#sf-fill)"><path class="sf-flake sf-still" d="${flakes.join("")}"/><path class="sf-flake" data-sf="hopper" d=""/></g>`);
  return out.join("");
}
function hopper() {
  const back = [wall(0, -1), wall(-1, 0), collar("back"), collar("left")];
  const front = [wall(1, 0), wall(0, 1), collar("right"), collar("front")];
  const flange = k.insetPlan(NECK, -30);
  const bolts = [];
  for (let i = 0; i <= 6; i++) bolts.push([flange.x + 18 + ((flange.w - 36) * i) / 6, flange.y + flange.d - 15]);
  for (let i = 1; i < 4; i++) bolts.push([flange.x + flange.w - 15, flange.y + 18 + ((flange.d - 36) * i) / 4]);
  return [...back, hopperFill(), ...front, D(bolts.map(([x, y]) => at([x, y, HOP.z0])), { size: 0.55, tone: "mid" })].join("");
}

// ---------- gearbox, motor, belt drive
function gearbox() {
  const out = [];
  out.push(S(k.slabOf(plan(610, -200, 380, 400, 4), HIGH_TOP, 18, P, 2, 1), { tone: "mid" }));
  out.push(D([[630, 180], [970, 180], [970, -180]].map(([x, y]) => at([x, y, HIGH_TOP + 18])), { size: 0.55 }));
  const SPLIT = AZ - 10;
  const lower = plan(630, -172, 340, 344, 6);
  out.push(S(k.slabOf(lower, HIGH_TOP + 18, SPLIT - HIGH_TOP - 18, P, 3), { tone: "mid", inner: L(k.sideSeam(lower, HIGH_TOP + 60, P, 3), { tone: "faint" }) }));
  for (const y of [-110, 110]) out.push(S(k.slabOf(plan(970, y - 7, 18, 14, 2), HIGH_TOP + 18, SPLIT - HIGH_TOP - 18, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf(plan(616, -188, 368, 376, 6), SPLIT, 22, P, 3, 0.8), { tone: "mid" }));
  out.push(D([650, 950].map((x) => at([x, 178, SPLIT + 22])), { size: 0.5 }));
  const upper = plan(640, -160, 320, 320, 40);
  out.push(S(k.slabOf(upper, SPLIT + 22, 128, P, 8, 1.5), { tone: "mid", inner: L(k.sideSeam(upper, SPLIT + 110, P, 8), { tone: "faint" }) }));
  // Inspection cover, breather and lifting eye on top.
  const TOP = SPLIT + 150;
  const cover = plan(700, -80, 160, 160, 8);
  out.push(S(k.slabOf(cover, TOP, 8, P, 3, 0.8), { tone: "mid" }));
  out.push(D(k.corners(cover, 16).map(([x, y]) => at([x, y, TOP + 8])), { size: 0.45 }));
  out.push(S(k.cylinder(780, 0, 16, TOP + 8, 18, P, 6), { tone: "mid" }));
  out.push(S(k.cylinder(780, 0, 10, TOP + 26, 12, P, 14, 1), { tone: "mid" }));
  out.push(S(k.slabOf(plan(900, -10, 34, 20, 3), TOP, 34, P, 2), { tone: "mid" }));
  // Bearing caps on the split line, on the near side.
  for (const [x, r] of [[720, 66], [880, 54]]) {
    const F = G.frameOf([x, 0, SPLIT + 11], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(disc(172, 206, r, F), { tone: "mid" }));
    out.push(D(G.dotsOf(F, 206, r - 14, 6, P, { all: true, phase: Math.PI / 6 }), { size: 0.5, tone: "mid" }));
  }
  // Oil sight glass on the lower housing.
  out.push(L(k.sideRing([800, 172, SPLIT - 110], 14, "y", P, 20), { tone: "mid" }));
  out.push(D([at([800, 172, SPLIT - 110])], { size: 0.6 }));
  // Input bearing cap and shaft on the far end.
  const F = FX(0, AZ + 1);
  out.push(S(disc(970, 988, 64, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 988, 50, 6, P, { all: true }), { size: 0.5, tone: "mid" }));
  out.push(S(disc(988, 1040, 30, F), { tone: "hi", crease: "none" }));
  return out.join("");
}

const MOTOR_Z = 300;
function motor() {
  const out = [];
  const F = FX(0, MOTOR_Z);
  const base = plan(660, -170, 330, 340, 4);
  const R = 110;
  out.push(S(k.slabOf(base, 160, 16, P, 2, 1), { tone: "mid" }));
  out.push(L([plan(690, -140, 70, 20, 10), plan(890, -140, 70, 20, 10), plan(690, 120, 70, 20, 10), plan(890, 120, 70, 20, 10)].map((p) => k.planOutline(p, 176, P, 4)).join(""), { tone: "lo" }));
  for (const x0 of [700, 890]) out.push(S(k.slabOf(plan(x0, -92, 60, 184, 3), 176, MOTOR_Z - R - 176 + 24, P, 2), { tone: "mid" }));
  out.push(S(disc(606, 646, R - 8, F), { tone: "mid", inner: L(G.arcOf(F, 626, R - 8, P), { tone: "faint" }) }));
  out.push(S(disc(646, 1000, R, F), { tone: "mid", crease: "none" }));
  out.push(k.fadedSvg(G.ribsOf(F, 660, 986, R, 30, P, { fade: [0.1, 0.55] }), { tone: "lo" }));
  out.push(L(G.arcOf(F, 660, R, P) + G.arcOf(F, 986, R, P), { tone: "faint" }));
  out.push(S(disc(1000, 1018, R - 4, F), { tone: "mid" }));
  out.push(S(disc(1018, 1040, 22, F), { tone: "hi", crease: "none" }));
  // Terminal box with its nameplate side.
  const tb = plan(770, -62, 120, 124, 4);
  out.push(S(k.slabOf(tb, MOTOR_Z + R - 6, 56, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(tb, MOTOR_Z + R + 34, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(tb, 12).map(([x, y]) => at([x, y, MOTOR_Z + R + 50])), { size: 0.45 }));
  const Fg = G.frameOf([830, 62, MOTOR_Z + R + 20], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(disc(0, 14, 14, Fg, { steps: 6 }), { tone: "mid" }));
  out.push(S(disc(14, 24, 10, Fg), { tone: "mid" }));
  return out.join("");
}

// Two V-belts: straight runs as thin prisms between the tangent points (r 215 and 60 pitch).
const BIG = { z: AZ + 1, r: 230, pitch: 215 };
const SMALL = { z: MOTOR_Z, r: 70, pitch: 60 };
function belts() {
  const out = [];
  const d = BIG.z - SMALL.z;
  const nz = -(BIG.pitch - SMALL.pitch) / d, ny = Math.sqrt(1 - nz * nz);
  for (const x0 of [1052, 1074]) {
    for (const side of [-1, 1]) {
      const n = [side * ny, nz];
      const T1 = [n[0] * BIG.pitch, BIG.z + n[1] * BIG.pitch];
      const T2 = [n[0] * SMALL.pitch, SMALL.z + n[1] * SMALL.pitch];
      const poly = [[T1[0] - n[0] * 5, T1[1] - n[1] * 5], [T1[0] + n[0] * 8, T1[1] + n[1] * 8], [T2[0] + n[0] * 8, T2[1] + n[1] * 8], [T2[0] - n[0] * 5, T2[1] - n[1] * 5]];
      const F = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      out.push(S(G.prismOf(F, side > 0 ? poly : [...poly].reverse(), x0, x0 + 16, P), { tone: "lo" }));
    }
  }
  return out.join("");
}
function pulleys() {
  const out = [];
  const Fs = FX(0, SMALL.z);
  out.push(S(disc(1040, 1100, SMALL.r, Fs), { tone: "mid", inner: L([1060, 1080].map((s) => G.arcOf(Fs, s, SMALL.r, P)).join(""), { tone: "lo" }) }));
  out.push(S(disc(1100, 1112, 30, Fs), { tone: "mid" }));
  out.push(D([at([1112, 0, SMALL.z])], { size: 0.6, tone: "hi" }));
  const Fb = FX(0, BIG.z);
  out.push(S(disc(1040, 1100, BIG.r, Fb), { tone: "mid", inner: L([1060, 1080].map((s) => G.arcOf(Fb, s, BIG.r, P)).join(""), { tone: "lo" }) }));
  // The web inside the rim is recessed: a dark disc with spokes drawn live, then the hub.
  out.push(`<path class="sf-web" d="${G.circleOf(Fb, 1100, BIG.r - 34, P)}"/>`);
  out.push(L(G.circleOf(Fb, 1100, BIG.r - 34, P), { tone: "mid" }));
  out.push(`<path class="sf-spoke" data-sf="spokes" d=""/>`);
  out.push(S(disc(1060, 1112, 62, Fb), { tone: "mid" }));
  out.push(S(disc(1112, 1120, 34, Fb), { tone: "mid" }));
  out.push(D([at([1120, 0, BIG.z])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

// ---------- assemble
const frameHalo = plan(-700, -320, 1910, 640, 10);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs>${[0, 1].map((i) => `<clipPath id="sf-win-${i}"><path d="${pathOf(flat(INNER[i]))}"/></clipPath>`).join("")}</defs>`,
    `<path class="iso-halo" d="${k.haloOf(frameHalo, 0, 60, P)}"/>`,
    extruder(),
    frameFar(),
    frameMiddle(),
    `<g data-sf="drive" data-hit>${motor()}</g>`,
    saddle(-330),
    saddle(230),
    nozzle(),
    cone(),
    windowBack(0),
    windowInside(0),
    windowEdges(0),
    joint(),
    housing(),
    windowBack(1),
    windowInside(1),
    windowEdges(1),
    rearEnd(),
    hopper(),
    `<g data-sf="drive" data-hit>${gearbox()}${belts()}${pulleys()}</g>`,
    frameNear(),
  ],
});

const proj = { o: at([0, 0, 0]), ex: k.axisVector(P, [1, 0, 0]), ey: k.axisVector(P, [0, 1, 0]), ez: k.axisVector(P, [0, 0, 1]) };
const round = (v) => Math.round(v * 10000) / 10000;
const DATA = {
  proj: { o: proj.o.map(round), ex: proj.ex.map(round), ey: proj.ey.map(round), ez: proj.ez.map(round) },
  az: AZ,
  view: Math.round(Math.atan2(V[2], V[1]) * 1000) / 1000,
  screw: screwTable(),
  root: ROOT_R,
  housing: [HOUSING.x0, HOUSING.x1],
  housingR: HOUSING.r,
  gap: SHELL + 4,
  cone: { x0: CONE.x0, x1: CONE.x1, r0: CONE.r0, r1: CONE.r1 },
  pitch: [300, 160],
  screwX: SCREW_X,
  spawn: [-380, 270],
  throat: { x: [-360, 260], y: [-150, 170], z: [NECK_TOP, AZ + flightR(0)] },
  hopper: { cx: HOP.cx, b: HOP.b, t: HOP.t, z0: HOP.z0, z1: HOP.z1, z: FILL_Z },
  ext: { x: XE, y: CUT_Y, z: AZ, root: ESCREW_R, bore: BORE_R },
  spokes: { x: 1099, z: BIG.z, r0: 58, r1: BIG.r - 34, n: 5, w: 18 },
  rate: 500,
};

const CSS = figureCss(`
.sf-cavity{fill:var(--sf-cavity);stroke:none}
.sf-cut{fill:var(--anatomy-top);stroke:none}
.sf-bore{fill:var(--sf-cavity);stroke:none}
.sf-web{fill:var(--anatomy-shade-1);stroke:none}
.sf-heap{fill:var(--sf-heap);stroke:none}
.sf-melt{fill:var(--sf-pack);stroke:var(--anatomy-mid);stroke-width:.4}
.sf-flake{fill:var(--sf-flake);stroke:none}
.sf-still{opacity:.75}
.sf-eflight{fill:var(--anatomy-top);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.sf-spoke{fill:var(--anatomy-face);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.sf-fb{fill:var(--anatomy-shade-0);stroke:var(--anatomy-shade-0);stroke-width:.4;stroke-linejoin:round}
.sf-ff{fill:var(--anatomy-top);stroke:var(--anatomy-top);stroke-width:.4;stroke-linejoin:round}
.sf-be,.sf-fe{fill:none;stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-linejoin:round;stroke-linecap:round}
.sf-fe{stroke:var(--anatomy-hi)}
.${SVG_CLASS} [data-on] .sf-ff{fill:var(--anatomy-lit-top);stroke:var(--anatomy-lit-top)}
.${SVG_CLASS} [data-on] .sf-fb{fill:var(--anatomy-lit-shade);stroke:var(--anatomy-lit-shade)}
.${SVG_CLASS} [data-on] .sf-fe,.${SVG_CLASS} [data-on] .sf-be{stroke:var(--anatomy-lit)}`, {
  light: "--sf-cavity:#c3cbc2;--sf-heap:#e9ede6;--sf-flake:#5d6a61;--sf-pack:#9aa69c",
  dark: "--sf-cavity:#0c120e;--sf-heap:#25302a;--sf-flake:#a9b8ad;--sf-pack:#55645a",
});

const file = writeFigure({ id: "screw-feeder", svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "screw-feeder", file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
