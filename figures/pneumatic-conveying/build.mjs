// Пневмотранспорт гранул, дроблёнки и флексы: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x along the fan axis (loading funnel at +x, motor at -x), y towards the receiver
// at -y, z up. A contact fan draws the material from the funnel through its impeller and blows it along the
// line into a receiving bin with a window; a rotary valve under the bin lets the material out.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 560;

// ---------- fan
const ZF = 700;                         // impeller axis
const CASE = 130;                       // half width of the casing along x
const CUTOFF = 127;                     // degrees: the volute starts here and widens clockwise to the outlet
const R0 = 330, R1 = 430;
const CHIMNEY_TOP = 1400;
const OUT_Y = -314;                     // centre of the outlet duct
const PIPE_R = 80;                      // line 160 mm (spec 110–160 mm)
const RUN_Z = 2150;
// ---------- receiver
const RX = 450, RY = [-3300, -2050], RZ = [1650, 2450], HOP_Z = 1150, RC = -2675;
const VALVE_Z = 980;
const GLASS = [-1000, -650];
const STAND_Y = -1450;

const volR = (deg) => R0 + ((R1 - R0) * (CUTOFF - deg)) / (CUTOFF + 180);

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: -700, y: -460, w: 1960, d: 880, r: 0 }, 0, 1400),
    ...k.boxCorners({ x: 670, y: -400, w: 720, d: 780, r: 0 }, 0, 1290),
    ...k.boxCorners({ x: -RX - 60, y: RY[0] - 60, w: 2 * RX + 120, d: RY[1] - RY[0] + 120, r: 0 }, 0, RZ[1]),
    [0, -2900, 3150], [0, OUT_Y, RUN_Z + 100], [-620, 0, ZF],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 40 },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 3) => ({ x, y, w, d, r });
const centred = (cx, cy, w, d, r = 3) => plan(cx - w / 2, cy - d / 2, w, d, r);
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const deg = (a) => (a * Math.PI) / 180;
const facets = (r) => Math.max(12, Math.min(44, Math.round(r * KS * 1.25)));
const disc = (s0, s1, r, F, o = {}) => G.disc(s0, s1, r, F, P, { steps: facets(r), ...o });
const FX = (y, z) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const box = (x0, x1, y0, y1, z0, z1, tone = "mid", bevel = 0, inner = "") => S(k.slabOf(plan(x0, y0, x1 - x0, y1 - y0, Math.min(3, (x1 - x0) / 4, (y1 - y0) / 4)), z0, z1 - z0, P, 2, bevel), { tone, inner });

// A prism of any (also concave) outline in a frame's u, v plane, extruded along its axis: the casing.
function prism3(F, ring, s0, s1) {
  const area = ring.reduce((a, [x, y], i) => { const [x2, y2] = ring[(i + 1) % ring.length]; return a + x * y2 - x2 * y; }, 0);
  const pts = area > 0 ? ring : [...ring].reverse();
  const n = pts.length;
  const p3 = (s, [x, y]) => G.add3(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.mul3(F.u, x)), G.mul3(F.v, y));
  const lo = pts.map((p) => at(p3(s0, p))), hi = pts.map((p) => at(p3(s1, p)));
  const normals = pts.map(([x0, y0], j) => { const [x1, y1] = pts[(j + 1) % n]; return G.unit3(G.add3(G.mul3(F.u, y1 - y0), G.mul3(F.v, -(x1 - x0)))); });
  const facing = normals.map((nn) => G.dot3(nn, V) > 1e-6);
  const capHi = G.dot3(F.a, V) > 0;
  const near = capHi ? hi : lo, far = capHi ? lo : hi;
  const runs = (want) => {
    const out = [];
    let start = facing.findIndex((f, j) => f === want && facing[(j + n - 1) % n] !== want);
    if (start < 0) return facing.every((f) => f === want) ? [[...Array(n + 1).keys()].map((j) => j % n)] : [];
    for (let c = 0; c < n; c++) {
      const j = (start + c) % n;
      if (facing[j] === want && facing[(j + n - 1) % n] !== want) {
        const run = [j];
        let m = j;
        while (facing[m] === want) { m = (m + 1) % n; run.push(m); if (m === j) break; }
        out.push(run);
      }
    }
    return out;
  };
  const outline = [], crease = [];
  for (const run of runs(false)) outline.push(pathOf(run.map((j) => near[j]), false));
  for (const run of runs(true)) { crease.push(pathOf(run.map((j) => near[j]), false)); outline.push(pathOf(run.map((j) => far[j]), false)); }
  for (let j = 0; j < n; j++) if (facing[(j + n - 1) % n] !== facing[j]) outline.push(pathOf([near[j], far[j]], false));
  const shades = [[], [], [], []];
  const fill = [pathOf(near), pathOf(far)];
  for (let j = 0; j < n; j++) {
    if (!facing[j]) continue;
    const q = pathOf([near[j], near[(j + 1) % n], far[(j + 1) % n], far[j]]);
    fill.push(q);
    shades[Math.min(3, G.toneOf(normals[j], P))].push(q);
  }
  shades[Math.min(3, G.toneOf(capHi ? F.a : G.mul3(F.a, -1), P))].push(pathOf(near));
  return { fill: fill.join(""), outline: outline.join(""), crease: crease.join(""), top: "", shades: shades.map((list) => list.join("")) };
}

// ---------- fan unit
function foot(x, y) {
  return S(k.cylinder(x, y, 45, 0, 16, P, 24, 1), { tone: "lo" }) + S(k.cylinder(x, y, 10, 16, 70, P, 12), { tone: "mid", crease: "none" }) +
    S(k.cylinder(x, y, 19, 50, 14, P, 6), { tone: "mid" }) + S(k.slabOf(centred(x, y, 90, 90, 3), 86, 10, P, 2), { tone: "mid" });
}
const FRAME = { x0: -700, x1: 1260, y0: -460, y1: 420 };
function fanFrame(part) {
  const { x0, x1, y0, y1 } = FRAME;
  const z = 180, t = 60;
  const out = [];
  if (part === "far") {
    for (const [x, y] of [[x0 + 45, y0 + 45], [x1 - 45, y0 + 45], [x0 + 45, y1 - 45]]) out.push(foot(x, y));
    out.push(box(x0, x1, y0, y0 + t, z - t, z));
    out.push(box(x0, x0 + t, y0 + t, y1 - t, z - t, z));
    out.push(box(-160, -100, y0 + t, y1 - t, z - t, z));
    out.push(box(100, 160, y0 + t, y1 - t, z - t, z));
    out.push(box(FUN.cx - 30, FUN.cx + 30, y0 + t, y1 - t, z - t, z));
    for (const x of [-450, -250]) out.push(box(x - 30, x + 30, y0 + t, y1 - t, z - t, z));
  } else {
    out.push(box(x1 - t, x1, y0 + t, y1 - t, z - t, z));
    out.push(box(x0, x1, y1 - t, y1, z - t, z));
    out.push(foot(x1 - 45, y1 - 45));
  }
  return out.join("");
}
const casingRing = () => {
  const ring = [];
  for (let d = CUTOFF; d >= -180; d -= 6) { const r = volR(d); ring.push([r * Math.cos(deg(d)), ZF + r * Math.sin(deg(d))]); }
  ring.push([-R1, ZF], [-R1, CHIMNEY_TOP], [R0 * Math.cos(deg(CUTOFF)), CHIMNEY_TOP]);
  return ring;
};
const FCASE = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
// Window cut in the inlet-side plate: a sector below the inlet, showing the paddle wheel.
const FW = { r0: 186, r1: 338, a0: -128, a1: 34 };
const winPoly = (x, shrink = 0) => {
  const pts = [];
  for (let d = FW.a0; d <= FW.a1 + 0.01; d += 4) pts.push([x, (FW.r1 - shrink) * Math.cos(deg(d)), ZF + (FW.r1 - shrink) * Math.sin(deg(d))]);
  for (let d = FW.a1; d >= FW.a0 - 0.01; d -= 6) pts.push([x, (FW.r0 + shrink) * Math.cos(deg(d)), ZF + (FW.r0 + shrink) * Math.sin(deg(d))]);
  return pts.map(at);
};
function fan() {
  const out = [];
  // Stand under the volute, then the volute casing with its chimney.
  out.push(S(k.slabOf(plan(-CASE, -270, 2 * CASE, 540, 3), 180, ZF - 300 - 180, P, 2, 1), { tone: "mid" }));
  out.push(D([-200, 200].map((y) => at([CASE, y, 200])), { size: 0.45 }));
  out.push(S(prism3(FCASE, casingRing(), -CASE, CASE), { tone: "mid", crease: "faint" }));
  // The front plate's bolted rim, window and inner details.
  const ring = casingRing();
  const rim = [];
  for (let i = 0; i < ring.length; i += 4) { const [y, z] = ring[i]; const len = Math.hypot(y, z - ZF); const f = (len - 26) / len; rim.push(at([CASE, y * f, ZF + (z - ZF) * f])); }
  out.push(D(rim, { size: 0.45, tone: "mid" }));
  out.push(`<path class="pc-cut" d="${pathOf(winPoly(CASE))}"/><path class="pc-cavity" d="${pathOf(winPoly(CASE, 8))}"/>`);
  out.push(`<g clip-path="url(#pc-fanwin)"><g data-pc="wheel" data-hit="fan">`);
  for (let i = 0; i < 6; i++) out.push(`<path class="pc-blade" data-pc="blade" d=""/>`);
  out.push(`</g><path class="pc-part" data-pc="fan-parts" d=""/></g>`);
  out.push(L(pathOf(winPoly(CASE, 8)), { tone: "lo" }) + L(pathOf(winPoly(CASE)), { tone: "mid" }));
  // Chimney top flange and the reducer to the round line.
  const top = plan(-CASE - 20, -R1 - 20, 2 * CASE + 40, R1 - 198 + 40, 3);
  out.push(S(k.slabOf(top, CHIMNEY_TOP, 14, P, 2, 0.8), { tone: "mid" }));
  out.push(D(k.corners(top, 14).map(([x, y]) => at([x, y, CHIMNEY_TOP + 14])), { size: 0.45 }));
  const Fz = G.frameOf([0, OUT_Y, CHIMNEY_TOP + 14], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(G.solidOf([[0, 118], [40, 118], [150, PIPE_R + 6], [158, PIPE_R + 6]], Fz, P, { steps: facets(118) }), { tone: "mid", crease: "faint" }));
  return out.join("");
}
function motor() {
  const out = [];
  const F = FX(0, ZF);
  out.push(box(-480, -420, -90, 90, 180, ZF - 150));
  out.push(box(-280, -220, -90, 90, 180, ZF - 150));
  out.push(box(-500, -200, -125, 125, ZF - 150, ZF - 130, "mid", 0.8));
  out.push(S(disc(-640, -580, 128, F), { tone: "mid", inner: L(G.arcOf(F, -610, 128, P), { tone: "faint" }) }));
  out.push(S(disc(-580, -190, 138, F), { tone: "mid", crease: "none" }));
  out.push(k.fadedSvg(G.ribsOf(F, -570, -200, 138, 30, P, { fade: [0.1, 0.55] }), { tone: "lo" }));
  out.push(L(G.arcOf(F, -570, 138, P) + G.arcOf(F, -200, 138, P), { tone: "faint" }));
  out.push(S(disc(-190, -166, 142, F), { tone: "mid" }));
  out.push(S(disc(-166, -CASE, 250, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, -CASE, 226, 8, P, { phase: Math.PI / 8, fade: [0.04, 0.42] }), { size: 0.5, tone: "mid" }));
  const tb = plan(-460, -60, 130, 120, 4);
  out.push(S(k.slabOf(tb, ZF + 128, 64, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(tb, ZF + 168, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(tb, 12).map(([x, y]) => at([x, y, ZF + 192])), { size: 0.45 }));
  return out.join("");
}
// Inlet tube from the funnel box to the eye of the fan.
const FUN = { x0: 900, x1: 1160, b: 160, top: 1260, t: [360, 380], cx: 1030 };
function inlet() {
  const out = [];
  const F = FX(0, ZF);
  out.push(S(disc(CASE, CASE + 20, 170, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, CASE + 20, 150, 8, P, { phase: Math.PI / 8, fade: [0.04, 0.42] }), { size: 0.5, tone: "mid" }));
  out.push(S(disc(CASE + 20, FUN.x0 - 20, 125, F), { tone: "mid", crease: "none" }));
  out.push(S(disc(FUN.x0 - 20, FUN.x0, 165, F), { tone: "mid" }));
  return out.join("");
}
const funCorner = (sx, sy, z) => {
  const t = (z - (ZF + FUN.b)) / (FUN.top - ZF - FUN.b);
  const hx = (FUN.x1 - FUN.x0) / 2 + (FUN.t[0] - (FUN.x1 - FUN.x0) / 2) * t;
  const hy = FUN.b + (FUN.t[1] - FUN.b) * t;
  return [FUN.cx + sx * hx, sy * hy, z];
};
function sheet(corners, out) {
  const centre = corners.reduce((a, p) => G.add3(a, G.mul3(p, 1 / corners.length)), [0, 0, 0]);
  const u = G.unit3(G.sub3(corners[1], corners[0]));
  let n = G.unit3(G.cross3(u, G.sub3(corners[corners.length - 1], corners[0])));
  if (G.dot3(n, out) < 0) n = G.mul3(n, -1);
  const v = G.cross3(n, u);
  const poly = corners.map((p) => { const q = G.sub3(p, centre); return [G.dot3(q, u), G.dot3(q, v)]; });
  return S(G.prismOf(G.frameOf(centre, n, u, v), poly, -4, 0, P), { tone: "mid", crease: "none" });
}
function funnelWall(sx, sy) {
  const z0 = ZF + FUN.b, z1 = FUN.top;
  const c = sx ? [funCorner(sx, -1, z0), funCorner(sx, 1, z0), funCorner(sx, 1, z1), funCorner(sx, -1, z1)] : [funCorner(-1, sy, z0), funCorner(1, sy, z0), funCorner(1, sy, z1), funCorner(-1, sy, z1)];
  return sheet(c, sx ? [sx, 0, 0] : [0, sy, 0]);
}
function funnel() {
  const out = [];
  // Box at the end of the inlet tube, standing on two posts; the funnel above it.
  out.push(box(FUN.cx - 20, FUN.cx + 20, -20, 20, 180, ZF - FUN.b));
  out.push(S(k.slabOf(plan(FUN.x0, -FUN.b, FUN.x1 - FUN.x0, 2 * FUN.b, 4), ZF - FUN.b, 2 * FUN.b, P, 2, 1.2), { tone: "mid", inner: L(k.sideSeam(plan(FUN.x0, -FUN.b, FUN.x1 - FUN.x0, 2 * FUN.b, 4), ZF, P, 2), { tone: "faint" }) }));
  out.push(funnelWall(0, -1), funnelWall(-1, 0));
  const z = FUN.top - 90;
  const surf = [funCorner(-1, -1, z), funCorner(1, -1, z), funCorner(1, 1, z), funCorner(-1, 1, z)].map(at);
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const flakes = [];
  for (let i = 0; i < 50; i++) { const c = at(funCorner(rnd() * 2 - 1, rnd() * 2 - 1, z)); const s = 1 + rnd() * 1.2, a = rnd() * Math.PI; flakes.push(pathOf([0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.5 : 0); const r = s * (j % 2 ? 0.6 : 1); return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t) * 0.6]; }))); }
  out.push(`<clipPath id="pc-fill"><path d="${pathOf(surf)}"/></clipPath><path class="pc-heap" d="${pathOf(surf)}"/><g clip-path="url(#pc-fill)"><path class="pc-part pc-still" data-pc="heap-still" d="${flakes.join("")}"/><path class="pc-part" data-pc="hopper" d=""/></g>`);
  out.push(funnelWall(1, 0), funnelWall(0, 1));
  const [hx, hy] = FUN.t;
  const ztop = FUN.top;
  out.push(box(FUN.cx - hx - 6, FUN.cx + hx + 6, hy, hy + 6, ztop, ztop + 30, "mid", 0.6));
  out.push(box(FUN.cx + hx, FUN.cx + hx + 6, -hy - 6, hy, ztop, ztop + 30, "mid", 0.6));
  return out.join("");
}

// ---------- the line: riser, bend, horizontal run with a sight glass, into the receiver
const ROUTE = G.fillet([[0, OUT_Y, CHIMNEY_TOP + 172], [0, OUT_Y, RUN_Z], [0, RY[1] - 2, RUN_Z]], PIPE_R * 2.8, 9, { P, tube: PIPE_R });
const TOTAL = G.pathLength(ROUTE);
const glassAt = (y) => TOTAL - (y - (RY[1] - 2));   // arc length where the horizontal run reaches y
const G0 = glassAt(GLASS[1]), G1 = glassAt(GLASS[0]);
function lineParts() {
  const flangeAt = (s, r, t = 16) => { const p = G.pointAlong(ROUTE, s), d = G.tangentAlong(ROUTE, s); return S(disc(-t / 2, t / 2, r, G.frameAlong(p, d)), { tone: "mid" }); };
  const C = glassAt(STAND_Y);
  const gaps = [[G0 - 18, G1 + 18], [0, 16], [TOTAL - 16, TOTAL], [C - 25, C + 25]];
  const pieces = tubePieces(ROUTE, PIPE_R, P, { maxLength: 400, gaps });
  return { pieces, flangeAt };
}
function glass() {
  const out = [];
  const F = G.frameOf([0, 0, RUN_Z], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  const body = disc(-GLASS[1], -GLASS[0], PIPE_R - 2, F);
  out.push(`<clipPath id="pc-glassclip"><path d="${body.fill}"/></clipPath>`);
  out.push(`<path class="pc-tube-in" d="${body.fill}"/>`);
  out.push(`<g clip-path="url(#pc-glassclip)"><path class="pc-part" data-pc="glass" d=""/></g>`);
  out.push(`<path class="pc-glass" d="${body.fill}"/>`);
  out.push(L(body.outline, { tone: "mid" }));
  out.push(L(k.segment([0, GLASS[1], RUN_Z + PIPE_R * 0.55], [0, GLASS[0], RUN_Z + PIPE_R * 0.55], P), { tone: "faint" }));
  return out.join("");
}
function glassFlanges() {
  const { flangeAt } = lineParts();
  return flangeAt(G0 - 9, PIPE_R + 34, 18) + glass() + flangeAt(G1 + 9, PIPE_R + 34, 18);
}
// Pipe stand under the run with a saddle and a band clamp.
function stand(y) {
  const out = [];
  const base = centred(0, y, 220, 220, 3);
  out.push(S(k.slabOf(base, 0, 14, P, 2, 1), { tone: "lo" }));
  out.push(D(k.corners(base, 22).map(([x, yy]) => at([x, yy, 14])), { size: 0.45 }));
  out.push(S(k.slabOf(centred(0, y, 70, 70, 3), 14, RUN_Z - PIPE_R - 38 - 14, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(centred(0, y, 220, 90, 3), RUN_Z - PIPE_R - 38, 30, P, 2, 0.8), { tone: "mid" }));
  return out.join("");
}
function clamp(y) {
  const F = G.frameOf([0, y, RUN_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  return S(disc(-25, 25, PIPE_R + 8, F), { tone: "mid" }) + D([at([PIPE_R + 20, y, RUN_Z - PIPE_R - 6]), at([-PIPE_R - 20, y, RUN_Z - PIPE_R - 6])], { size: 0.5, tone: "hi" });
}

// ---------- receiving bin with a window, filter sock, rotary valve
function receiverLegs(part) {
  const out = [];
  const legs = [[-RX + 50, RY[0] + 50], [RX - 50, RY[0] + 50], [-RX + 50, RY[1] - 50], [RX - 50, RY[1] - 50]];
  const pick = part === "far" ? [0, 1, 2] : [3];
  for (const i of pick) {
    const [x, y] = legs[i];
    out.push(S(k.slabOf(centred(x, y, 160, 160, 3), 0, 12, P, 2, 1), { tone: "lo" }));
    out.push(S(k.slabOf(centred(x, y, 60, 60, 3), 12, RZ[0] - 12, P, 2), { tone: "mid", crease: "none" }));
  }
  if (part === "far") {
    out.push(box(-RX + 80, RX - 80, RY[0] + 20, RY[0] + 80, 560, 620));
    out.push(box(-RX + 20, -RX + 80, RY[0] + 80, RY[1] - 80, 560, 620));
  } else {
    out.push(box(RX - 80, RX - 20, RY[0] + 80, RY[1] - 80, 560, 620));
    out.push(box(-RX + 80, RX - 80, RY[1] - 80, RY[1] - 20, 560, 620));
  }
  return out.join("");
}
const RHOP = { b: 140 };
const rCorner = (sx, sy, z) => {
  const t = (z - HOP_Z) / (RZ[0] - HOP_Z);
  const hx = RHOP.b + (RX - RHOP.b) * t;
  const hy = RHOP.b + ((RY[1] - RY[0]) / 2 - RHOP.b) * t;
  return [sx * hx, RC + sy * hy, z];
};
const RWIN = { y0: -3150, y1: -2200, z0: 1740, z1: 2330 };
const rwinPoly = (shrink = 0) => [[RWIN.y0 + shrink, RWIN.z0 + shrink], [RWIN.y1 - shrink, RWIN.z0 + shrink], [RWIN.y1 - shrink, RWIN.z1 - shrink], [RWIN.y0 + shrink, RWIN.z1 - shrink]].map(([y, z]) => at([RX + 1, y, z]));
function receiver() {
  const out = [];
  const wall = (sx, sy) => {
    const c = sx ? [rCorner(sx, -1, HOP_Z), rCorner(sx, 1, HOP_Z), rCorner(sx, 1, RZ[0]), rCorner(sx, -1, RZ[0])] : [rCorner(-1, sy, HOP_Z), rCorner(1, sy, HOP_Z), rCorner(1, sy, RZ[0]), rCorner(-1, sy, RZ[0])];
    return sheet(c, sx ? [sx, 0, 0] : [0, sy, 0]);
  };
  out.push(wall(1, 0), wall(0, 1));
  const bx = plan(-RX, RY[0], 2 * RX, RY[1] - RY[0], 4);
  out.push(S(k.slabOf(bx, RZ[0], RZ[1] - RZ[0], P, 2, 1.5), { tone: "mid", inner: L(k.sideSeam(bx, RZ[0] + 30, P, 2), { tone: "faint" }) }));
  // Window on the side: the falling material shows through it.
  out.push(`<path class="pc-cavity" d="${pathOf(rwinPoly())}"/>`);
  out.push(`<clipPath id="pc-rwin"><path d="${pathOf(rwinPoly())}"/></clipPath><g clip-path="url(#pc-rwin)"><path class="pc-part" data-pc="receiver" d=""/></g>`);
  out.push(`<path class="pc-glass" d="${pathOf(rwinPoly())}"/>`);
  out.push(L(pathOf(rwinPoly()), { tone: "mid" }));
  const frame = [[RWIN.y0 - 40, RWIN.z0 - 40], [RWIN.y1 + 40, RWIN.z0 - 40], [RWIN.y1 + 40, RWIN.z1 + 40], [RWIN.y0 - 40, RWIN.z1 + 40]].map(([y, z]) => at([RX + 1, y, z]));
  out.push(L(pathOf(frame), { tone: "lo" }));
  const bolts = [];
  for (let i = 0; i <= 8; i++) { const y = RWIN.y0 - 20 + ((RWIN.y1 - RWIN.y0 + 40) * i) / 8; bolts.push([y, RWIN.z0 - 20], [y, RWIN.z1 + 20]); }
  for (let i = 1; i < 4; i++) { const z = RWIN.z0 - 20 + ((RWIN.z1 - RWIN.z0 + 40) * i) / 4; bolts.push([RWIN.y0 - 20, z], [RWIN.y1 + 20, z]); }
  out.push(D(bolts.map(([y, z]) => at([RX + 1, y, z])), { size: 0.45, tone: "mid" }));
  // Inlet flange on the end facing the fan.
  const Fi = G.frameOf([0, RY[1], RUN_Z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(disc(0, 14, PIPE_R + 40, Fi), { tone: "mid" }));
  out.push(D(G.dotsOf(Fi, 14, PIPE_R + 26, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45, tone: "mid" }));
  // Air outlet on the top with the filter sock.
  const Fa = G.frameOf([0, -2950, RZ[1]], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(disc(0, 70, 120, Fa), { tone: "mid" }));
  out.push(S(disc(70, 84, 150, Fa), { tone: "mid" }));
  out.push(D(G.dotsOf(Fa, 84, 134, 8, P, { all: true }), { size: 0.45, tone: "mid" }));
  out.push(S(disc(84, 120, 142, Fa), { tone: "mid", inner: L(G.arcOf(Fa, 102, 142, P), { tone: "lo" }) }));
  const sock = [];
  for (let i = 0; i <= 10; i++) { const s = 120 + (540 * i) / 10; sock.push([s, 132 + 8 * Math.sin((i / 10) * Math.PI), 1]); }
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); sock.push([660 + 120 * Math.sin(a), 132 * Math.cos(a) + 0.01, 1]); }
  const sockBase = at([0, -2950, RZ[1] + 120]);
  out.push(`<g data-pc="sock" data-base="${sockBase.map((v) => v.toFixed(1)).join(" ")}">${S(G.lathe([[120, 0], ...sock.map(([s, r]) => [s, r, 1])], Fa, P, { steps: 36 }), { tone: "hi" })}</g>`);
  // Small lid on the top and a lifting lug.
  out.push(S(k.slabOf(centred(0, -2300, 360, 260, 6), RZ[1], 12, P, 3, 0.8), { tone: "mid" }));
  out.push(D(k.corners(centred(0, -2300, 360, 260, 6), 18).map(([x, y]) => at([x, y, RZ[1] + 12])), { size: 0.45 }));
  return out.join("");
}
function valve() {
  const out = [];
  const F = FX(RC, VALVE_Z);
  const fl = centred(0, RC, 320, 320, 3);
  out.push(S(k.slabOf(fl, HOP_Z - 20, 20, P, 2, 0.8), { tone: "mid" }));
  out.push(D(k.corners(fl, 16).map(([x, y]) => at([x, y, HOP_Z])), { size: 0.45 }));
  out.push(S(k.slabOf(centred(0, RC, 260, 260, 3), 800, 20, P, 2, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(centred(0, RC, 200, 240, 3), 820, HOP_Z - 20 - 820, P, 2), { tone: "mid", crease: "none" }));
  // Gear motor on the far end of the rotor shaft.
  out.push(S(disc(-470, -330, 80, F), { tone: "mid", crease: "none" }));
  out.push(k.fadedSvg(G.ribsOf(F, -460, -340, 80, 18, P, { fade: [0.1, 0.55] }), { tone: "lo" }));
  out.push(L(G.arcOf(F, -460, 80, P) + G.arcOf(F, -340, 80, P), { tone: "faint" }));
  out.push(S(k.slabOf(plan(-330, RC - 90, 140, 180, 8), VALVE_Z - 100, 200, P, 3, 1), { tone: "mid" }));
  out.push(S(disc(-190, -170, 150, F), { tone: "mid" }));
  out.push(S(disc(-170, 150, 160, F), { tone: "mid", crease: "none" }));
  out.push(S(disc(150, 170, 180, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 170, 168, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45, tone: "mid" }));
  // The end cover is drawn off: the cell wheel turns inside.
  out.push(`<path class="pc-cavity" d="${G.circleOf(F, 170, 150, P)}"/>`);
  out.push(`<g data-pc="rotor"><path class="pc-load" data-pc="cells" d=""/><path class="pc-vane" data-pc="vanes" d=""/></g>`);
  out.push(S(disc(150, 172, 40, F), { tone: "mid" }));
  out.push(L(G.circleOf(F, 170, 150, P), { tone: "mid" }));
  return out.join("");
}
function container() {
  const out = [];
  const c = plan(-300, RC - 330, 600, 660, 10);
  out.push(`<path class="iso-halo" d="${k.haloOf(c, 0, 30, P)}"/>`);
  out.push(S(k.slabOf(c, 0, 520, P, 4, 1.2), { tone: "lo", inner: L(k.sideSeam(c, 470, P, 4), { tone: "faint" }) }));
  const inner = k.insetPlan(c, 14);
  out.push(`<path class="pc-cavity" d="${k.planOutline(inner, 520, P, 4)}"/>`);
  out.push(`<clipPath id="pc-box"><path d="${k.planOutline(inner, 520, P, 4)}"/></clipPath>`);
  out.push(`<g clip-path="url(#pc-box)"><path class="pc-heap" d="${pathOf(k.roundedPlan(k.insetPlan(inner, 30), 4).map(([x, y]) => at([x, y, 330])))}"/><path class="pc-part" data-pc="drop" d=""/></g>`);
  out.push(L(k.planOutline(inner, 520, P, 4), { tone: "lo" }));
  return out.join("");
}

// ---------- assemble
const { pieces } = lineParts();
const rising = pieces.filter((p) => p.mid[1] > OUT_Y - 400);
const beyond = pieces.filter((p) => p.mid[1] <= STAND_Y);
const running = pieces.filter((p) => p.mid[1] <= OUT_Y - 400 && p.mid[1] > STAND_Y);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs><clipPath id="pc-fanwin"><path d="${pathOf(winPoly(CASE, 8))}"/></clipPath></defs>`,
    `<path class="iso-halo" d="${k.haloOf(plan(FRAME.x0, FRAME.y0, FRAME.x1 - FRAME.x0, FRAME.y1 - FRAME.y0, 10), 0, 50, P)}"/>`,
    `<path class="iso-halo" d="${k.haloOf(plan(-RX, RY[0], 2 * RX, RY[1] - RY[0], 10), 0, 40, P)}"/>`,
    receiverLegs("far"),
    container(),
    `<g data-pc="valve">${valve()}</g>`,
    receiver(),
    receiverLegs("near"),
    stand(STAND_Y),
    ...beyond.map((piece) => tubeSvg(piece, { tone: "mid" })),
    clamp(STAND_Y),
    ...running.map((piece) => tubeSvg(piece, { tone: "mid" })),
    glassFlanges(),
    fanFrame("far"),
    `<g data-hit="fan">${motor()}</g>`,
    `<g data-hit="fan">${fan()}</g>`,
    S(disc(-8, 8, PIPE_R + 34, G.frameAlong(G.pointAlong(ROUTE, 8), [0, 0, 1])), { tone: "mid" }),
    ...rising.map((piece) => tubeSvg(piece, { tone: "mid" })),
    `<g data-hit="fan">${inlet()}</g>`,
    `<g data-hit="hopper">${funnel()}</g>`,
    fanFrame("near"),
  ],
});

const round = (v) => Math.round(v * 10000) / 10000;
const proj = { o: at([0, 0, 0]), ex: k.axisVector(P, [1, 0, 0]), ey: k.axisVector(P, [0, 1, 0]), ez: k.axisVector(P, [0, 0, 1]) };
const DATA = {
  proj: Object.fromEntries(Object.entries(proj).map(([key, v]) => [key, v.map(round)])),
  zf: ZF, cutoff: CUTOFF, r0: R0, r1: R1, win: FW, view: V.map(round),
  funnel: { cx: FUN.cx, b: [(FUN.x1 - FUN.x0) / 2, FUN.b], t: FUN.t, z0: ZF + FUN.b, z1: FUN.top, z: FUN.top - 90 },
  run: RUN_Z, pipe: PIPE_R, glass: GLASS,
  receiver: { x: RX, y: RY, z: RZ, win: RWIN, c: RC, inlet: RY[1] },
  valve: { y: RC, z: VALVE_Z, r: 150, x: 171, hub: 40 },
  drop: { z0: 800, z1: 340 },
};

const CSS = figureCss(`
.pc-cut{fill:var(--anatomy-top);stroke:none}
.pc-cavity{fill:var(--pc-cavity);stroke:none}
.pc-tube-in{fill:var(--pc-cavity);stroke:none}
.pc-glass{fill:var(--pc-glass);stroke:none}
.pc-heap{fill:var(--pc-heap);stroke:none}
.pc-part{fill:var(--pc-part);stroke:none}
.pc-load{fill:var(--pc-part);stroke:none;opacity:.45}
.pc-still{opacity:.75}
.pc-blade{fill:var(--anatomy-top);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.pc-vane{fill:none;stroke:var(--anatomy-hi);stroke-width:1.1;stroke-linecap:round}
.${SVG_CLASS} [data-on] .pc-blade{fill:var(--anatomy-lit-top);stroke:var(--anatomy-lit)}`, {
  light: "--pc-cavity:#c3cbc2;--pc-glass:rgba(160,180,170,.25);--pc-heap:#d7ddd5;--pc-part:#4e5b52",
  dark: "--pc-cavity:#0c120e;--pc-glass:rgba(140,170,155,.12);--pc-heap:#2b3730;--pc-part:#b4c3b8",
});

const file = writeFigure({ id: "pneumatic-conveying", svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "pneumatic-conveying", file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
