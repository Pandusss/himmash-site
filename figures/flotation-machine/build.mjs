// Активная флотационная машина: an interactive isometric figure built with the anatomy kit.
// World units are millimetres. x runs along the bath from the feed end (x = 0) to the outlet end (x = L),
// y across it (the cut-away long wall faces +y, the viewer), z up from the floor.
// Two longitudinal shafts with bolted paddles stir the flakes and push the floating fraction to the outlet weir;
// particles heavier than water sink into the V-shaped bottom and are let out through the sludge valve.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "flotation-machine";

const WIDTH = 520;
const HEIGHT = 420;

// ---------- dimensions (spec: length up to 5 700, width up to 1 300, height up to 1 500 mm)
const L = 4580;            // bath length between the end walls (inner faces)
const HW = 600;            // inner half-width
const T = 14;              // wall plate
const ZW = 760;            // where the straight walls meet the V bottom
const ZT = 1480;           // top of the walls; a 20 mm flat rim on top
const RIM = 20;
const ZA = 450;            // inner apex of the V bottom (27° slopes)
const WATER = 1250;        // working water level
const SHAFT_Z = 1080;
const SHAFT_Y = [-300, 300];
const SHAFT_R = 110;
const WIN = [520, 4000];   // the cut-away window in the near wall
const WIN_Z = 840;         // top of the wall strip left under the window
const NOTCH = 160;         // half-width of the outlet weir notch in the near end wall
const WEIR = 1180;         // weir edge, below the water level: floating flakes flow over it
const PADDLES = 19;        // paddles per shaft
const PITCH = 230;
const FIRST = 260;

const vZ = (y) => ZA + Math.abs(y) * ((ZW - ZA) / HW);   // inner bottom height across the bath

const P = k.fitProjection(
  [
    [-60, -650, 0], [-60, 650, 0], [L + 620, -650, 0], [L + 620, 650, 0],
    [-60, -650, ZT + RIM], [-60, 650, ZT + RIM], [L + 50, 650, ZT + RIM], [L + 50, -650, ZT + RIM],
    [-440, 0, 1840], [-T - 680, -400, 1400], [-T - 680, 400, 1400],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 52, elevation: 35 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const box = ([x0, y0, z0], [x1, y1, z1], steps = 2) => k.slabOf(plan(x0, y0, x1 - x0, y1 - y0, 3), z0, z1 - z0, P, steps);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const depth = (p) => G.dot3(p, V);

// A plate or prism of any (also concave) polygon in a frame's (u, v) plane, extruded along its axis.
const signed = (poly) => poly.reduce((a, [x, y], i) => {
  const [x2, y2] = poly[(i + 1) % poly.length];
  return a + x * y2 - x2 * y;
}, 0);
const screenOriented = (pts) => (signed(pts) < 0 ? [...pts].reverse() : pts);
function runsOf(flags, want) {
  const count = flags.length;
  const runs = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}
function plate(F, poly, s0, s1) {
  const ring = signed(poly) > 0 ? poly : [...poly].reverse();
  const n = ring.length;
  const W3 = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const capNear = G.dot3(F.a, V) > 0;
  const [nearS, farS] = capNear ? [s1, s0] : [s0, s1];
  const near = ring.map((p) => at(W3(nearS, p)));
  const far = ring.map((p) => at(W3(farS, p)));
  const normals = ring.map(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % n];
    return G.unit3(G.add3(G.mul3(F.u, y1 - y0), G.mul3(F.v, -(x1 - x0))));
  });
  const facing = normals.map((m) => G.dot3(m, V) > 1e-9);
  const outline = [];
  const crease = [];
  for (const run of runsOf(facing, false)) outline.push(k.pathOf(run.map((i) => near[i])));
  for (const run of runsOf(facing, true)) {
    crease.push(k.pathOf(run.map((i) => near[i])));
    outline.push(k.pathOf(run.map((i) => far[i])));
  }
  for (let i = 0; i < n; i++) if (facing[(i + n - 1) % n] !== facing[i]) outline.push(k.pathOf([near[i], far[i]]));
  const parts = [k.pathOf(screenOriented(near), true), k.pathOf(screenOriented(far), true)];
  const buckets = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    if (!facing[i]) continue;
    const quad = screenOriented([near[i], near[(i + 1) % n], far[(i + 1) % n], far[i]]);
    parts.push(k.pathOf(quad, true));
    buckets[G.toneOf(normals[i], P)].push(k.pathOf(quad, true));
  }
  buckets[G.toneOf(capNear ? F.a : G.mul3(F.a, -1), P)].push(k.pathOf(screenOriented(near), true));
  return { fill: parts.join(""), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((b) => b.join("")) };
}
const XF = (o = [0, 0, 0]) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);   // polygon in (y, z), along x
const YF = (o = [0, 0, 0]) => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);   // polygon in (x, z), along y
const ZF = (o = [0, 0, 0]) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const alongX = (o) => G.frameAlong(o, [1, 0, 0]);
const alongY = (o) => G.frameAlong(o, [0, 1, 0]);

// ---------- frame: legs on foot plates, low rails
const LEG_X = [120, 1570, 3010, 4460];
const LEG_Y = [-560, 560];
function leg(x, y) {
  const out = [];
  const foot = plan(x - 90, y - 90, 180, 180, 4);
  out.push(S(k.slabOf(foot, 0, 12, P, 2, 2), { tone: "lo" }));
  out.push(D([[x - 60, y - 60], [x + 60, y + 60]].map(([px, py]) => at([px, py, 12])), { size: 0.45 }));
  out.push(S(k.slabOf(plan(x - 50, y - 50, 100, 100, 3), 12, 668, P, 2, 1.5), { tone: "mid", inner: Ln(k.sideSeam(plan(x - 50, y - 50, 100, 100, 3), 640, P, 2), { tone: "faint" }) }));
  return out.join("");
}
function rails(y) {
  const out = [];
  out.push(S(box([LEG_X[0] + 50, y - 20, 190], [LEG_X[3] - 50, y + 20, 250]), { tone: "lo" }));
  // Long beam under the wall edge, carrying the bath.
  out.push(S(box([0, y > 0 ? 520 : -614, 680], [L, y > 0 ? 614 : -520, 760]), { tone: "mid" }));
  return out.join("");
}
function crossRail(x) {
  return S(box([x - 20, LEG_Y[0] + 50, 190], [x + 20, LEG_Y[1] - 50, 250]), { tone: "lo" });
}

// ---------- the bath
const backWall = () => S(box([0, -HW - T, ZW - 8], [L, -HW, ZT]), { tone: "mid", crease: "lo" });
const vBottom = () => S(plate(XF(), [[-HW, ZW], [0, ZA], [HW, ZW], [HW + T, ZW - 8], [0, ZA - 16], [-HW - T, ZW - 8]], 0, L), { tone: "mid", crease: "lo" });
const endPoly = [[-HW - T, ZT], [HW + T, ZT], [HW + T, ZW - 8], [0, ZA - 16], [-HW - T, ZW - 8]];
const farEnd = () => S(plate(XF([-T, 0, 0]), endPoly, 0, T), { tone: "mid", crease: "lo" });
const nearEndPoly = [[-HW - T, ZT], [-NOTCH, ZT], [-NOTCH, WEIR], [NOTCH, WEIR], [NOTCH, ZT], [HW + T, ZT], [HW + T, ZW - 8], [0, ZA - 16], [-HW - T, ZW - 8]];

function rimBar(x0, x1, y0, y1) {
  return S(box([x0, y0, ZT], [x1, y1, ZT + RIM]), { tone: "mid", crease: "lo" });
}

// Seal flanges where the shafts pass through the far end wall.
function farSeals() {
  return SHAFT_Y.map((y) => {
    const F = alongX([0, y, SHAFT_Z]);
    return S(G.disc(0, 22, 170, F, P), { tone: "mid" }) + D(G.dotsOf(F, 22, 140, 6, P, { all: true, phase: Math.PI / 6 }), { size: 0.45 }) + S(G.disc(22, 34, 128, F, P), { tone: "mid" });
  }).join("");
}

function shaft(y) {
  const F = alongX([0, y, SHAFT_Z]);
  return S(G.disc(34, L, SHAFT_R, F, P, { rims: "first" }), { tone: "hi", crease: "none", inner: Ln([1200, 2600, 3900].map((s) => G.arcOf(F, s, SHAFT_R, P)).join(""), { tone: "faint" }) });
}

// Lifting lugs: eye plates on the rim at the corners.
function lug(x, y) {
  const F = YF([x, y - 8, ZT + RIM]);
  const half = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    half.push([60 * Math.cos(a), 60 + 60 * Math.sin(a)]);
  }
  const poly = [[60, 0], ...half, [-60, 0]];
  const hole = Array.from({ length: 24 }, (_, i) => at([x + 22 * Math.cos((i / 24) * 2 * Math.PI), y + 8, ZT + RIM + 64 + 22 * Math.sin((i / 24) * 2 * Math.PI)]));
  return S(plate(F, poly, 0, 16), { tone: "mid" }) + `<path class="fm-hole" d="${k.pathOf(hole, true)}"/>` + Ln(k.pathOf(hole, true), { tone: "mid" });
}

// Feed chute over the far end wall: shredded flakes come in here.
const CHUTE_IN = { top: [-440, 1670], low: [230, 1430], half: 170, side: 130 };
function feedChute(part) {
  const [xa, za] = CHUTE_IN.top;
  const [xb, zb] = CHUTE_IN.low;
  const h = CHUTE_IN.half;
  const slope = Math.atan2(za - zb, xb - xa);
  const nx = Math.sin(slope), nz = Math.cos(slope);   // up-normal of the chute bottom
  const out = [];
  const q = (x, y, z) => [x, y, z];
  if (part === "back") {
    const side = (y0) => plate(G.frameOf([0, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[xa, za], [xb, zb], [xb + nx * CHUTE_IN.side, zb + nz * CHUTE_IN.side], [xa + nx * CHUTE_IN.side, za + nz * CHUTE_IN.side]], 0, 10);
    out.push(S(side(-h - 10), { tone: "mid" }));
    // Bottom plate.
    const bottom = [q(xa, -h, za), q(xb, -h, zb), q(xb, h, zb), q(xa, h, za)];
    const under = bottom.map(([x, y, z]) => [x - nx * 10, y, z - nz * 10]);
    out.push(S({ fill: path3(bottom, true) + path3(under, true), outline: path3([bottom[1], under[1], under[2], bottom[2]]), crease: "", top: path3(bottom, true), shades: ["", "", "", path3([bottom[1], under[1], under[2], bottom[2]], true)] }, { tone: "mid" }));
  } else {
    const side = plate(G.frameOf([0, h, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[xa, za], [xb, zb], [xb + nx * CHUTE_IN.side, zb + nz * CHUTE_IN.side], [xa + nx * CHUTE_IN.side, za + nz * CHUTE_IN.side]], 0, 10);
    out.push(S(side, { tone: "mid" }));
    // Lip frame at the upper end, where the conveyor from the shredder lands.
    out.push(S(plate(XF([xa - 12, 0, 0]), [[-h - 30, za - 25], [h + 40, za - 25], [h + 40, za + CHUTE_IN.side + 40], [-h - 30, za + CHUTE_IN.side + 40]], 0, 12), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- outside the outlet end: bearings, gear motors, weir chute, sludge valve, water inlet
const XE = L + T;   // outer face of the near end wall
const XF0 = -T;     // outer face of the far end wall
// Flange bearing on an end wall: `sign` +1 on the outlet end (a plain end cap), -1 on the drive end.
function bearing(y, sign) {
  const out = [];
  const x0 = sign > 0 ? XE : XF0;
  const F = XF([sign > 0 ? x0 : x0 - 24, 0, 0]);
  out.push(S(plate(F, [[y - 115, SHAFT_Z - 115], [y + 115, SHAFT_Z - 115], [y + 115, SHAFT_Z + 115], [y - 115, SHAFT_Z + 115]], 0, 24), { tone: "mid" }));
  if (sign > 0) out.push(D([[-80, -80], [80, -80], [80, 80], [-80, 80]].map(([dy, dz]) => at([x0 + 24, y + dy, SHAFT_Z + dz])), { size: 0.55 }));
  const A = G.frameAlong([x0 + sign * 24, y, SHAFT_Z], [sign, 0, 0]);
  out.push(S(G.disc(0, 56, 88, A, P), { tone: "mid", inner: Ln(G.arcOf(A, 30, 88, P), { tone: "faint" }) }));
  if (sign > 0) {
    out.push(S(G.disc(56, 80, 62, A, P), { tone: "mid" }));
    out.push(D([at([x0 + 104, y, SHAFT_Z + 34])], { size: 0.6 }));
  } else out.push(S(G.disc(56, 96, 58, A, P), { tone: "mid" }));
  return out.join("");
}
// Shaft-mounted parallel gear motor on the drive (feed) end; the motor points away from the bath (-x).
const GB = { a: 120, b: 300, half: 95, z0: 960, z1: 1310 };
const MOTOR_Z = 1215;
function gearMotor(y) {
  const out = [];
  const gx0 = XF0 - GB.b, gx1 = XF0 - GB.a;
  // Torque arm down to a bracket on the end wall.
  out.push(S(box([XF0 - 150, y - 30, 790], [XF0, y + 30, 840]), { tone: "lo" }));
  out.push(S(box([XF0 - 160, y - 12, 840], [XF0 - 130, y + 12, GB.z0]), { tone: "lo" }));
  const body = plan(gx0, y - GB.half, gx1 - gx0, 2 * GB.half, 18);
  out.push(S(k.slabOf(body, GB.z0, GB.z1 - GB.z0, P, 4, 3), { tone: "mid", inner: Ln(k.sideSeam(body, 1150, P, 4), { tone: "faint" }) }));
  out.push(D([[gx0 + 30, y - 60], [gx1 - 30, y - 60], [gx0 + 30, y + 60], [gx1 - 30, y + 60]].map(([px, py]) => at([px, py, GB.z1])), { size: 0.5 }));
  // Motor flange, ribbed motor body and fan cowl.
  const M = G.frameAlong([gx0, y, MOTOR_Z], [-1, 0, 0]);
  out.push(S(G.disc(0, 26, 118, M, P), { tone: "mid" }));
  out.push(D(G.dotsOf(M, 26, 102, 6, P, { fade: [0.04, 0.42] }), { size: 0.45 }));
  const ribs = G.ribsOf(M, 60, 300, 96, 18, P, { fade: [0.1, 0.55], seams: true });
  out.push(S(G.disc(26, 330, 96, M, P), { tone: "mid", inner: k.fadedSvg(ribs, { tone: "lo" }) }));
  out.push(S(G.disc(330, 380, 100, M, P), { tone: "mid", inner: Ln(G.arcOf(M, 352, 100, P), { tone: "faint" }) }));
  // Terminal box on top of the motor, cable gland on its outer side.
  out.push(S(box([gx0 - 210, y - 55, MOTOR_Z + 90], [gx0 - 90, y + 55, MOTOR_Z + 170]), { tone: "mid" }));
  out.push(D([[gx0 - 195, y - 40], [gx0 - 105, y + 40]].map(([px, py]) => at([px, py, MOTOR_Z + 170])), { size: 0.45 }));
  if (y > 0) out.push(S(G.disc(0, 26, 16, alongY([gx0 - 150, y + 55, MOTOR_Z + 130]), P), { tone: "mid" }));
  return out.join("");
}

const CHUTE = { x1: XE + 430, z0: WEIR, drop: Math.tan((24 * Math.PI) / 180), side: 130 };
const chuteZ = (x) => CHUTE.z0 - (x - XE) * CHUTE.drop;
function outletChute(part) {
  const out = [];
  const h = NOTCH;
  const sidePoly = [[XE, chuteZ(XE)], [CHUTE.x1, chuteZ(CHUTE.x1)], [CHUTE.x1, chuteZ(CHUTE.x1) + CHUTE.side], [XE, chuteZ(XE) + CHUTE.side + 60]];
  const sideOf = (y0) => S(plate(G.frameOf([0, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), sidePoly, 0, 10), { tone: "mid" });
  if (part === "back") {
    // Strut under the chute back to the end wall.
    out.push(S(box([XE, -20, 900], [XE + 40, 20, 960]), { tone: "lo" }));
    out.push(S(plate(G.frameOf([0, -12, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[XE + 30, 920], [XE + 50, 920], [XE + 270, chuteZ(XE + 270) - 12], [XE + 230, chuteZ(XE + 230) - 12]], 0, 24), { tone: "lo" }));
    out.push(sideOf(-h - 10));
    const bottom = [[XE, -h, chuteZ(XE)], [CHUTE.x1, -h, chuteZ(CHUTE.x1)], [CHUTE.x1, h, chuteZ(CHUTE.x1)], [XE, h, chuteZ(XE)]];
    const under = bottom.map(([x, y, z]) => [x, y, z - 12]);
    out.push(S({ fill: path3(bottom, true) + path3(under, true), outline: path3([bottom[1], under[1], under[2], bottom[2], bottom[3], bottom[0], bottom[1], bottom[2]]), crease: "", top: path3(bottom, true), shades: ["", "", "", path3([bottom[1], under[1], under[2], bottom[2]], true)] }, { tone: "mid" }));
  } else {
    out.push(sideOf(h));
    // End lip: the flange that lands on the friction washer inlet.
    out.push(S(plate(XF([CHUTE.x1, 0, 0]), [[-h - 40, chuteZ(CHUTE.x1) - 40], [h + 40, chuteZ(CHUTE.x1) - 40], [h + 40, chuteZ(CHUTE.x1) + CHUTE.side], [-h - 40, chuteZ(CHUTE.x1) + CHUTE.side]], 0, 14), { tone: "mid" }));
    out.push(D([-h - 20, h + 20].flatMap((y) => [chuteZ(CHUTE.x1) - 20, chuteZ(CHUTE.x1) + CHUTE.side - 20].map((z) => at([CHUTE.x1 + 14, y, z]))), { size: 0.45 }));
  }
  return out.join("");
}

// Sludge outlet at the apex of the V bottom: nozzle, knife gate valve with a pneumatic actuator, elbow, drop pipe, bin.
const SLUDGE_Z = ZA + 62;
const VALVE = { x0: XE + 130, x1: XE + 190 };
function sludgeLine(part) {
  const out = [];
  const A = alongX([XE, 0, SLUDGE_Z]);
  if (part === "pipe") {
    out.push(S(G.disc(0, 110, 60, A, P), { tone: "mid" }));
    out.push(S(G.disc(110, 130, 105, A, P), { tone: "mid" }));
    out.push(D(G.dotsOf(A, 130, 86, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45 }));
  } else if (part === "valve") {
    // Knife gate body: a slim box across the pipe with the gate housing rising above it.
    const g = `<g data-valve data-hit>`;
    out.push(g);
    out.push(S(box([VALVE.x0, -120, SLUDGE_Z - 110], [VALVE.x1, 120, SLUDGE_Z + 120]), { tone: "mid" }));
    out.push(S(box([VALVE.x0 + 8, -90, SLUDGE_Z + 120], [VALVE.x1 - 8, 90, SLUDGE_Z + 330]), { tone: "mid" }));
    out.push(S(box([VALVE.x0 - 10, -110, SLUDGE_Z + 330], [VALVE.x1 + 10, 110, SLUDGE_Z + 350]), { tone: "mid" }));
    // Pneumatic cylinder on the yoke.
    out.push(S(k.cylinder((VALVE.x0 + VALVE.x1) / 2, 0, 55, SLUDGE_Z + 350, 150, P, 28, 1.5), { tone: "mid", inner: Ln(k.sideArc((VALVE.x0 + VALVE.x1) / 2, 0, 55, SLUDGE_Z + 380, P, 20), { tone: "faint" }) }));
    out.push(S(k.cylinder((VALVE.x0 + VALVE.x1) / 2, 0, 62, SLUDGE_Z + 500, 24, P, 28, 1), { tone: "mid" }));
    out.push(D([[-80, 0], [80, 0]].map(([dy]) => at([VALVE.x1, dy, SLUDGE_Z])), { size: 0.5 }));
    out.push(`</g>`);
  } else if (part === "drop") {
    const B = alongX([VALVE.x1, 0, SLUDGE_Z]);
    out.push(S(G.disc(0, 20, 105, B, P), { tone: "mid" }));
    out.push(D(G.dotsOf(B, 20, 86, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45 }));
    out.push(S(G.disc(20, 130, 60, B, P), { tone: "mid" }));
    const elbow = [VALVE.x1 + 190, 0, SLUDGE_Z];
    out.push(S(G.sphereOf(elbow, 78, P, { steps: 32 }), { tone: "mid" }));
    out.push(S(k.cylinder(elbow[0], 0, 60, 300, SLUDGE_Z - 300 - 50, P, 28), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(elbow[0], 0, 72, 290, 26, P, 28), { tone: "mid" }));
  }
  return out.join("");
}
const BIN = { x: XE + 210, y: -230, w: 360, d: 460 };
function sludgeBin() {
  const out = [];
  const body = plan(BIN.x, BIN.y, BIN.w, BIN.d, 10);
  for (const [x, y] of [[BIN.x + 50, BIN.y + 50], [BIN.x + BIN.w - 50, BIN.y + 50], [BIN.x + 50, BIN.y + BIN.d - 50], [BIN.x + BIN.w - 50, BIN.y + BIN.d - 50]].sort((a, b) => depth([...a, 0]) - depth([...b, 0]))) {
    out.push(S(G.disc(-16, 16, 34, alongY([x, y, 36]), P), { tone: "lo" }));
  }
  out.push(S(k.slabOf(body, 60, 200, P, 4, 2), { tone: "mid", inner: Ln(k.sideSeam(body, 200, P, 4), { tone: "faint" }) }));
  const opening = k.pathOf(k.roundedPlan(k.insetPlan(body, 16), 4).map(([x, y]) => at([x, y, 260])), true);
  out.push(`<path class="fm-bin" d="${opening}"/>`);
  out.push(`<clipPath id="fm-bin-clip"><path d="${opening}"/></clipPath><g class="fm-live" clip-path="url(#fm-bin-clip)" data-layer="bin"></g>`);
  out.push(Ln(k.planOutline(k.insetPlan(body, 16), 260, P, 4), { tone: "lo" }));
  return out.join("");
}

// Recycled water from the treatment plant comes in through the end wall.
function waterInlet() {
  const out = [];
  const y = 480, z = 860;
  const A = alongX([XE, y, z]);
  out.push(S(G.disc(0, 18, 70, A, P), { tone: "mid" }));
  out.push(S(G.disc(18, 120, 40, A, P), { tone: "mid" }));
  out.push(S(G.sphereOf([XE + 160, y, z], 56, P, { steps: 32 }), { tone: "mid" }));
  out.push(S(k.cylinder(XE + 160, y, 12, z + 52, 34, P, 14), { tone: "mid" }));
  out.push(S(box([XE + 154, y - 8, z + 86], [XE + 166, y + 150, z + 98]), { tone: "mid" }));
  out.push(S(G.disc(200, 260, 40, A, P), { tone: "mid" }));
  out.push(S(G.disc(260, 276, 70, A, P), { tone: "mid" }));
  out.push(D(G.dotsOf(A, 276, 55, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.45 }));
  return out.join("");
}

// Control cabinet with the shaft inverters, bolted to the near leg at the outlet end.
function cabinet() {
  const out = [];
  const x0 = 4300, x1 = 4620, y0 = 610, y1 = 740, z0 = 250, z1 = 640;
  const body = plan(x0, y0, x1 - x0, y1 - y0, 6);
  out.push(S(k.slabOf(body, z0, z1 - z0, P, 3, 2), { tone: "mid", inner: Ln(k.sideSeam(body, z1 - 30, P, 3), { tone: "faint" }) }));
  const y = y1;
  out.push(Ln(path3([[x0 + 22, y, z0 + 22], [x1 - 22, y, z0 + 22], [x1 - 22, y, z1 - 48], [x0 + 22, y, z1 - 48]], true), { tone: "lo" }));
  const screen = [[x0 + 60, y, 520], [x0 + 190, y, 520], [x0 + 190, y, 570], [x0 + 60, y, 570]];
  out.push(`<path class="fm-hole" d="${path3(screen, true)}"/>`, Ln(path3(screen, true), { tone: "mid" }));
  for (const [x, r] of [[x0 + 80, 16], [x0 + 140, 16]]) out.push(S(G.disc(0, 16, r, alongY([x, y, 420]), P), { tone: "mid" }));
  out.push(S(G.disc(0, 10, 30, alongY([x0 + 220, y, 420]), P), { tone: "mid" }), S(G.disc(10, 30, 22, alongY([x0 + 220, y, 420]), P), { tone: "mid" }));
  out.push(S(box([x1 - 50, y, 380], [x1 - 36, y + 18, 470]), { tone: "mid" }));
  out.push(S(G.disc(0, 30, 22, G.frameAlong([x0 + 90, (y0 + y1) / 2, z0], [0, 0, -1]), P), { tone: "mid" }));
  return out.join("");
}

// ---------- water: surface and the cut face of the water body
function water() {
  const surface = [[T, -HW, WATER], [L, -HW, WATER], [L, HW, WATER], [T, HW, WATER]];
  const section = [[WIN[0], HW, WIN_Z], [WIN[1], HW, WIN_Z], [WIN[1], HW, WATER], [WIN[0], HW, WATER]];
  return [
    `<path class="fm-water" d="${path3(surface, true)}"/>`,
    `<path class="fm-water fm-section" d="${path3(section, true)}"/>`,
    Ln(path3([[0, -HW, WATER], [L, -HW, WATER]]), { tone: "lo" }),
    Ln(path3([[0, -HW, WATER], [0, HW, WATER]]), { tone: "lo" }),
    Ln(path3([[WIN[0], HW, WATER], [WIN[1], HW, WATER]]), { tone: "mid" }),
  ].join("");
}

// ---------- near wall remnants around the cut-away window
function nearWall() {
  const out = [];
  const y0 = HW, y1 = HW + T;
  const left = plan(0, y0, WIN[0], T, 0), right = plan(WIN[1], y0, L - WIN[1], T, 0), strip = plan(WIN[0], y0, WIN[1] - WIN[0], T, 0);
  out.push(S(k.slabOf(strip, ZW - 8, WIN_Z - ZW + 8, P, 1), { tone: "mid", crease: "lo" }));
  out.push(S(k.slabOf(left, ZW - 8, ZT - ZW + 8, P, 1), { tone: "mid", crease: "lo" }));
  out.push(S(k.slabOf(right, ZW - 8, ZT - ZW + 8, P, 1), { tone: "mid", crease: "lo" }));
  // Vertical stiffeners on the outside, wall bottom to rim.
  for (const x of [260, 4290]) out.push(S(box([x - 7, y1, ZW - 8], [x + 7, y1 + 50, ZT]), { tone: "mid" }));
  // Label plate on the right remnant.
  const lx = 4140, lz = 1300;
  out.push(S(plate(G.frameOf([lx, y1, lz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[-90, -40], [90, -40], [90, 40], [-90, 40]], 0, 4), { tone: "mid" }));
  out.push(Ln([[-70, 18, 90], [-70, 2, 120], [-70, -14, 70]].map(([x0, z0, len]) => k.segment([lx + x0, y1 + 4, lz + z0], [lx + x0 + len, y1 + 4, lz + z0], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([lx - 78, y1 + 4, lz]), at([lx + 78, y1 + 4, lz])], { size: 0.45 }));
  return out.join("");
}

const nearEnd = () => S(plate(XF([L, 0, 0]), nearEndPoly, 0, T), { tone: "mid", crease: "lo" });

// ---------- live layers (filled by live.js)
const live = (name) => `<g class="fm-live" data-layer="${name}"${["back0", "mid", "front1", "over"].includes(name) ? " data-hit" : ""}></g>`;

// ---------- assemble, back to front
const far = LEG_X.map((x) => leg(x, LEG_Y[0])).join("");
const near = LEG_X.map((x) => leg(x, LEG_Y[1])).join("");
const body = [
  `<path class="iso-halo" d="${k.haloOf(plan(-600, -650, L + 1150, 1300, 20), 0, 700, P)}"/>`,
  far,
  rails(LEG_Y[0]),
  crossRail(LEG_X[0]),
  crossRail(LEG_X[3]),
  bearing(SHAFT_Y[0], -1),
  gearMotor(SHAFT_Y[0]),
  bearing(SHAFT_Y[1], -1),
  gearMotor(SHAFT_Y[1]),
  backWall(),
  vBottom(),
  farEnd(),
  rimBar(-50, L + 50, -650, -HW),
  rimBar(-50, 0, -HW, HW),
  lug(160, -625),
  farSeals(),
  feedChute("back"),
  live("silt"),
  live("back0"),
  `<g data-shaft="0" data-hit>${shaft(SHAFT_Y[0])}</g>`,
  live("mid"),
  `<g data-shaft="1" data-hit>${shaft(SHAFT_Y[1])}</g>`,
  live("front1"),
  live("grit"),
  water(),
  live("flakes"),
  live("over"),
  live("feed"),
  feedChute("front"),
  nearWall(),
  rimBar(-50, WIN[0], HW, 650),
  rimBar(WIN[1], L + 50, HW, 650),
  lug(160, 625),
  lug(L - 160, -625),
  nearEnd(),
  rimBar(L, L + 50, -HW, -NOTCH),
  rimBar(L, L + 50, NOTCH, HW),
  lug(L - 160, 625),
  rails(LEG_Y[1]),
  near,
  cabinet(),
  outletChute("back"),
  live("chute"),
  outletChute("front"),
  bearing(SHAFT_Y[0], 1),
  sludgeBin(),
  sludgeLine("pipe"),
  sludgeLine("valve"),
  sludgeLine("drop"),
  waterInlet(),
  bearing(SHAFT_Y[1], 1),
];

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: SVG_CLASS, label: "", body });

const cam = k.cameraOf(P);
const DATA = {
  cam: { ox: P.origin[0], oy: P.origin[1], k: cam.k, sinA: cam.sinA, cosA: cam.cosA, sinE: cam.sinE, cosE: cam.cosE },
  light: G.lightOf(P),
  bath: { L, HW, T, ZW, ZA, water: WATER, win: WIN, winZ: WIN_Z, notch: NOTCH, weir: WEIR },
  shafts: { y: SHAFT_Y, z: SHAFT_Z, r: SHAFT_R, count: PADDLES, pitch: PITCH, first: FIRST },
  paddle: { root: [100, 160, 110, 44], blade: [160, 290, 220, 12], twist: 32 },
  feed: { x: CHUTE_IN.low[0], half: CHUTE_IN.half },
  chute: { x0: XE, x1: CHUTE.x1, z0: CHUTE.z0, drop: CHUTE.drop, half: NOTCH },
  bin: { x0: BIN.x + 16, y0: BIN.y + 16, x1: BIN.x + BIN.w - 16, y1: BIN.y + BIN.d - 16, z0: 70, z1: 250 },
  rate: 500,
};

const CSS = figureCss(`
.fm-water{fill:var(--fm-water);fill-opacity:var(--fm-water-a);stroke:none}
.fm-section{fill-opacity:var(--fm-section-a)}
.fm-hole{fill:var(--anatomy-shade-0);stroke:none}
.fm-bin{fill:var(--fm-silt);stroke:none}
.fm-flake{fill:var(--fm-flake);stroke:var(--fm-flake-edge);stroke-width:.35;stroke-linejoin:round}
.fm-grit{fill:var(--fm-grit);stroke:none}
.fm-silt{fill:var(--fm-silt);stroke:var(--fm-grit);stroke-width:.4;stroke-linejoin:round}
.fm-pad{stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round;fill:var(--anatomy-shade-2)}
.fm-pad[data-shade="0"]{fill:var(--anatomy-shade-0)}
.fm-pad[data-shade="1"]{fill:var(--anatomy-shade-1)}
.fm-pad[data-shade="3"]{fill:var(--anatomy-shade-3)}
.fm-pad[data-shade="4"]{fill:var(--anatomy-top)}
.${SVG_CLASS} [data-on] .fm-pad{stroke:var(--anatomy-lit);fill:var(--anatomy-lit-shade)}
.${SVG_CLASS} [data-on] .fm-pad[data-shade="4"],.${SVG_CLASS} [data-on] .fm-pad[data-shade="3"]{fill:var(--anatomy-lit-top)}`, {
  light: "--fm-water:#9fc4b6;--fm-water-a:.32;--fm-section-a:.42;--fm-flake:#ffffff;--fm-flake-edge:#5d6b63;--fm-grit:#3a4740;--fm-silt:#b4af9f",
  dark: "--fm-water:#3f7a66;--fm-water-a:.24;--fm-section-a:.34;--fm-flake:#e4ece6;--fm-flake-edge:#9aa89f;--fm-grit:#0a0d0b;--fm-silt:#4a4537",
});

const file = writeFigure({ id: ID, svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
