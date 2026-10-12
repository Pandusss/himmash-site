// Узел упорного подшипника экструдера: an interactive isometric figure built with the anatomy kit.
// World units are millimetres. The screw axis runs along x: the gearbox side is at x = 0, the extruder
// (screw) side faces +x and the viewer. z is up, z = 0 is the top of the frame pad.
// The housing and the front cover are drawn with the top-front quarter cut away; the rotating parts
// inside (sleeve, bearings) are whole, so the reader sees them turn through the cut.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 440;
const AXIS_Z = 300;
const TAU = Math.PI * 2;
const QUARTER = Math.PI / 2;

// Explode: the cover comes off first, then the sleeve with its bearings slides out of the housing.
const COVER_OUT = 470;
const CARTRIDGE_OUT = 230;

// ---------- the parts, as half-sections [s, r] along the axis (s = x)
// Housing: open at the back (bolted to the gearbox output boss), bore 200 for the rear bearing,
// shoulder at x = 110, bore 300 for the thrust bearing and the front cartridge, mouth at x = 330.
const SHOULDER = 110;
const MOUTH = 330;
const BORE_REAR = 100;
const BORE_MAIN = 150;
const HOUSING_OUTER = [[0, BORE_REAR], [0, 206], [34, 206], [34, 186], [300, 186], [300, 198], [MOUTH, 198], [MOUTH, BORE_MAIN]];
const HOUSING_SECTION = [[0, BORE_REAR], [0, 206], [34, 206], [34, 186], [300, 186], [300, 198], [MOUTH, 198], [MOUTH, BORE_MAIN], [SHOULDER, BORE_MAIN], [SHOULDER, BORE_REAR]];
const JACKET = { s0: 128, s1: 286, r0: 160, r1: 174 };

// Cover with a lip-seal boss; the sleeve passes through its 144 mm bore.
const COVER_BORE = 72;
const COVER_OUTER = [[MOUTH, COVER_BORE], [MOUTH, 198], [372, 198], [372, 112], [396, 112], [396, COVER_BORE]];
const COVER_SECTION = [[MOUTH, 86], [MOUTH, 198], [372, 198], [372, 112], [396, 112], [396, COVER_BORE], [380, COVER_BORE], [380, 86]];
const SEAL = [[MOUTH, COVER_BORE], [MOUTH, 86], [380, 86], [380, COVER_BORE]];

// Sleeve (hollow drive shaft): splines for the gearbox at the back, rear journal, thrust journal,
// collar, front journal; a splined bore takes the screw shank from the front.
const SLEEVE_BORE = 45;
const SLEEVE_REAR = [[0, SLEEVE_BORE], [0, 52], [36, 52], [36, 58], [56, 58], [56, 60], [100, 60]];
const SLEEVE_FRONT_S = 365;

// Bearings: rear cylindrical-roller bearing, spherical-roller thrust bearing, front cylindrical-roller bearing.
const REAR_BRG = { s0: 58, s1: 100, rIn: 60, rOut: BORE_REAR };
const NUT = { s0: 40, s1: 58, rIn: 58, rOut: 84 };
const ROLLERS = { s0: 133, s1: 159, r0: 139.5, r1: 120.5, count: 18 };
const THRUST = { hw: [SHOULDER, 132, 96, BORE_MAIN], roll: [132, 160], sw: [160, 182, 75, 128] };
const CARRIER = { s0: 212, s1: MOUTH, rIn: 110, rOut: BORE_MAIN };
const FRONT_BRG = { s0: 262, s1: 302, rIn: 70, rOut: 110 };

// Foot and pad.
const FOOT = { x: 70, y: -124, w: 200, d: 248, r: 3 };
const FOOT_TOP = 176;
const BASE = { x: 40, y: -168, w: 262, d: 336, r: 6 };
const BASE_H = 24;
const PAD = { x: -40, y: -250, w: 420, d: 500, r: 8 };
const PAD_H = 70;

// Camera: the scale fits the apart pose (cover and sleeve pulled out along +x); the drawing is centred
// on the assembled pose, and the live script pans it by PAN as the unit comes apart, so both poses sit
// in the middle of the card.
const AZIMUTH = 50;
const unitPoints = (x0, x1) => [x0, x1].flatMap((x) => [[x, 0, AXIS_Z + 206], [x, 206, AXIS_Z], [x, -206, AXIS_Z], [x, 150, AXIS_Z - 150], [x, 0, AXIS_Z - 206]]);
const REST_POINTS = [...k.boxCorners(PAD, -PAD_H, 0), ...unitPoints(0, 400)];
const APART_POINTS = [...k.boxCorners(PAD, -PAD_H, 0), ...unitPoints(0, 400 + COVER_OUT)];
const FIT_PAD = 26;
const P = (() => {
  const unit = { origin: [0, 0], scale: 1, azimuth: AZIMUTH, elevation: 30 };
  const box = (pts) => {
    const flat = pts.map((p) => k.iso(p, unit));
    const xs = flat.map((q) => q[0]), ys = flat.map((q) => q[1]);
    return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
  };
  const rest = box(REST_POINTS), apart = box(APART_POINTS);
  const scale = Math.min((WIDTH - 2 * FIT_PAD) / (apart.r - apart.l), (HEIGHT - 2 * FIT_PAD - 30) / (apart.b - apart.t), (HEIGHT - 2 * FIT_PAD - 30) / (rest.b - rest.t));
  const centre = (b) => [(b.l + b.r) / 2, (b.t + b.b) / 2];
  const [rx, ry] = centre(rest), [ax, ay] = centre(apart);
  return { origin: [WIDTH / 2 - rx * scale, HEIGHT / 2 + 4 - ry * scale], scale, azimuth: AZIMUTH, elevation: 30, pan: [(rx - ax) * scale, (ry - ay) * scale] };
})();
const PAN = P.pan;
const V = G.viewOf(P);
const K = G.scaleOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const pathOf = (points, closed = true) => (points.length ? `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}` : "");
const plan = (x, y, w, d, r = 3) => ({ x, y, w, d, r });

// The axis frame: angle 0 points to +y (toward the viewer's left), angle 90° up. The cut removes 0..90°.
const AX = G.frameOf([0, 0, AXIS_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const P3 = (s, r, t) => G.pointOf(AX, s, r, t);
const inCut = (t) => {
  const a = ((t % TAU) + TAU) % TAU;
  return a > -0.02 && a < QUARTER + 0.02;
};

// ---------- cut helpers
const area = (pts) => pts.reduce((sum, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return sum + x * y2 - x2 * y; }, 0);
const wound = (pts) => (area(pts) < 0 ? [...pts].reverse() : pts);
// Screen region of the removed quarter: the union of the hulls of each axial segment's quarter solid.
function quarterHull(outer, grow = 1.6) {
  // The end arcs bulge out by `grow` px between the cut edges, so the rim outline of the removed quarter
  // leaves no ghost after masking, while the cut edges themselves (t = 0 and 90°) stay exact.
  const g = grow / K;
  const out = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [s0, r0] = outer[i];
    const [s1, r1] = outer[i + 1];
    if (Math.abs(s1 - s0) < 1e-6) continue;
    const pts = [];
    for (let j = 0; j <= 24; j++) {
      const t = (j / 24) * QUARTER;
      const b = g * Math.sin(2 * t);
      // The back rim also reaches a little past the cut edges, where its stroke would otherwise leak.
      pts.push(at(P3(s0, r0 + b + g * 0.4, t)), at(P3(s1, r1 + b, t)));
    }
    pts.push(at(P3(s0, 0, 0)), at(P3(s1, 0, 0)));
    out.push(pathOf(wound(G.hullOf(pts))));
  }
  return out.join("");
}
const BOX = `M-60 -60H${WIDTH + 60}V${HEIGHT + 60}H-60Z`;
const defs = [];
function cutMask(id, outer) {
  defs.push(`<mask id="${id}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="${WIDTH + 120}" height="${HEIGHT + 120}"><path fill="#fff" d="${BOX}"/><path fill="#000" d="${quarterHull(outer)}"/></mask>`);
  return `mask="url(#${id})"`;
}
// A forward tube: the screen region swept by a disc of radius r at x = s moving to +x. Inner parts
// behind the plane show in it only through the disc, parts in front of it show whole.
function tubeClip(id, s, r, reach = 900) {
  const ring = (x) => Array.from({ length: 72 }, (_, i) => at(P3(x, r, (i / 72) * TAU)));
  defs.push(`<clipPath id="${id}"><path d="${pathOf(G.hullOf([...ring(s), ...ring(s + reach)]))}"/></clipPath>`);
  return `clip-path="url(#${id})"`;
}

// Section faces of a half-section polygon: the vertical face (plane y = 0, above the axis) and the
// horizontal one (plane z = axis, toward +y). Both face the viewer and are drawn after anything behind them.
function sectionFaces(poly, { cls = "", extra = "", open = [] } = {}) {
  // `open` lists s values where the polygon was sliced for the painter's order: edges lying on them are
  // not real edges of the cut face, so the outline skips them (and ends on the neighbouring slab's outline).
  const onCut = (p, q) => open.some((s) => Math.abs(p[0] - s) < 1e-6 && Math.abs(q[0] - s) < 1e-6);
  const outlineOf = (map) => {
    if (!open.length) return pathOf(poly.map(map));
    const n = poly.length;
    let start = poly.findIndex((p, i) => onCut(poly[(i + n - 1) % n], p));
    if (start < 0) return pathOf(poly.map(map));
    const runs = [];
    let run = [];
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n, j = (i + 1) % n;
      if (!run.length) run.push(poly[i]);
      if (onCut(poly[i], poly[j])) { if (run.length > 1) runs.push(run); run = []; }
      else run.push(poly[j]);
    }
    if (run.length > 1) runs.push(run);
    return runs.map((r) => pathOf(r.map(map), false)).join("");
  };
  const vMap = ([s, r]) => at(P3(s, r, QUARTER));
  const hMap = ([s, r]) => at(P3(s, r, 0));
  const vertical = pathOf(poly.map(vMap));
  const horizontal = pathOf(poly.map(hMap));
  return `<g class="iso-solid tu-sec ${cls}"><path class="iso-fill" d="${vertical}"/><path class="iso-shade tu-cut-v" data-shade="1" d="${vertical}"/>${extra ? extra.v || "" : ""}<path class="iso-line iso-edge" data-tone="mid" d="${outlineOf(vMap)}"/></g>` +
    `<g class="iso-solid tu-sec ${cls}"><path class="iso-fill" d="${horizontal}"/><path class="iso-top tu-cut-h" d="${horizontal}"/>${extra ? extra.h || "" : ""}<path class="iso-line iso-edge" data-tone="mid" d="${outlineOf(hMap)}"/></g>`;
}
const rectPoly = (s0, s1, r0, r1) => [[s0, r0], [s0, r1], [s1, r1], [s1, r0]];
// Keep the part of a half-section between two s values (for slabs of the painter's order).
function sliceS(poly, a, b) {
  const clipEdge = (pts, keep, cross) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const kp = keep(p), kq = keep(q);
      if (kp) out.push(p);
      if (kp !== kq) out.push(cross(p, q));
    }
    return out;
  };
  const at_ = (x) => (p, q) => [x, p[1] + ((q[1] - p[1]) * (x - p[0])) / (q[0] - p[0] || 1)];
  let pts = clipEdge(poly, (p) => p[0] >= a - 1e-9, at_(a));
  pts = clipEdge(pts, (p) => p[0] <= b + 1e-9, at_(b));
  return pts;
}

// A whole turned part (a ring or a shaft piece), with optional face rings on its visible front face.
function ringPart(s0, s1, rIn, rOut, { tone = "hi", faces = [], seams = [], hole = true } = {}) {
  const inner = [
    ...faces.map((r) => L(G.circleOf(AX, s1, r, P), { tone: "lo" })),
    ...seams.map((s) => L(G.arcOf(AX, s, rOut, P), { tone: "faint" })),
  ].join("");
  return S(G.ringBand(s0, s1, rIn, rOut, AX, P, { steps: 64, ...(hole && rIn > 0 ? { hole: [s1, rIn] } : {}) }), { tone, inner, className: "tu-holed" });
}

// The hollow inside of a part: the union of its bore cylinders' outlines.
function boreHull(slabs) {
  return slabs.map(([a, b, r]) => {
    const ring = (x) => Array.from({ length: 64 }, (_, i) => at(P3(x, r, (i / 64) * TAU)));
    return pathOf(wound(G.hullOf([...ring(a), ...ring(b)])));
  }).join("");
}

// ---------- pad, foot
function pad() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PAD, -PAD_H, PAD_H, P)}"/>`];
  out.push(S(k.slabOf(PAD, -PAD_H, PAD_H, P, 6, 2.5), { tone: "lo", inner: L(k.sideSeam(PAD, -PAD_H + 22, P, 6), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 16), 0, P, 6), { tone: "faint" }));
  const bolts = k.corners(PAD, 34);
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 14, 0, P, 18)).join(""), { tone: "lo" }));
  for (const [x, y] of bolts) out.push(S(k.cylinder(x, y, 8, 0, 6, P, 6), { tone: "mid" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 6])), { size: 0.5 }));
  return out.join("");
}

function foot() {
  const out = [];
  out.push(S(k.slabOf(BASE, 0, BASE_H, P, 4, 2), { tone: "mid", inner: L(k.sideSeam(BASE, 8, P, 4), { tone: "faint" }) }));
  const holes = k.corners(BASE, 26);
  for (const [x, y] of holes) {
    out.push(S(k.cylinder(x, y, 15, BASE_H, 3, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 11, BASE_H + 3, 9, P, 6), { tone: "hi" }));
  }
  out.push(D(holes.map(([x, y]) => at([x, y, BASE_H + 12])), { size: 0.45 }));
  // Pedestal: a trapezoid web along the axis whose top corners hide inside the housing cylinder.
  const R = HOUSING_OUTER[3][1];
  const top = AXIS_Z - Math.sqrt(R * R - 112 * 112) + 12;
  const FP = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const web = [[-150, BASE_H], [150, BASE_H], [112, top], [-112, top]];
  out.push(S(G.prismOf(FP, web, FOOT.x, FOOT.x + FOOT.w, P), { tone: "mid" }));
  // Name plate on the foot face, riveted.
  // On the sloped side of the web: plane through (y = 150, z = BASE_H) rising to (112, top).
  const lx = 168, lz = 80;
  const y = 150 - ((lz - BASE_H) * 38) / (top - BASE_H);
  const PF = G.frameOf([lx, y, lz], G.unit3([0, top - BASE_H, 38]), [1, 0, 0], G.unit3([0, -38, top - BASE_H]));
  out.push(S(G.prismOf(PF, [[-30, -14], [30, -14], [30, 14], [-30, 14]], 0, 2, P), { tone: "mid" }));
  const onPlate = (u, v) => at(G.add3(G.add3(PF.o, G.mul3(PF.a, 2)), G.add3(G.mul3(PF.u, u), G.mul3(PF.v, v))));
  out.push(L([[-20, 5, 22], [-20, -1, 16], [-20, -7, 19]].map(([u0, v0, len]) => pathOf([onPlate(u0, v0), onPlate(u0 + len * 1.7, v0)], false)).join(""), { tone: "lo", free: true }));
  out.push(D([onPlate(-25, 0), onPlate(25, 0)], { size: 0.45 }));
  return out.join("");
}

// ---------- housing (static, cut)
const HOUSING_MASK = cutMask("tu-m-housing", HOUSING_OUTER);
const HOUSING_HULL = quarterHull(HOUSING_OUTER, 0);
defs.push(`<clipPath id="tu-c-housing"><path d="${HOUSING_HULL}"/></clipPath>`);
const REAR_TUBE = tubeClip("tu-c-rear", SHOULDER, BORE_REAR);
const MOUTH_TUBE = tubeClip("tu-c-mouth", MOUTH, BORE_MAIN);

// Bosses and fittings on the outer surface (all outside the cut).
function radialFrame(s, t, r) {
  const n = G.radialOf(AX, t);
  return G.frameOf(P3(s, r, t), n, [1, 0, 0], G.cross3(n, [1, 0, 0]));
}
function fittings() {
  const out = [];
  const R = 186;
  // Water inlet (lower front) and outlet (upper back): boss, hex, hose barb.
  for (const [s, t] of [[150, -0.42], [270, 2.02]]) {
    const F = radialFrame(s, t, R - 6);
    out.push(S(G.disc(0, 14, 17, F, P), { tone: "mid" }));
    out.push(S(G.disc(14, 26, 13, F, P, { steps: 6 }), { tone: "mid" }));
    out.push(S(G.disc(26, 46, 7, F, P), { tone: "hi" }));
    out.push(S(G.disc(46, 52, 9, F, P), { tone: "hi" }));
  }
  // Oil filler plug with breather on top-back, oil sight glass on the front.
  {
    const F = radialFrame(84, 1.86, R - 6);
    out.push(S(G.disc(0, 12, 20, F, P), { tone: "mid" }));
    out.push(S(G.disc(12, 24, 15, F, P, { steps: 6 }), { tone: "mid" }));
    out.push(S(G.disc(24, 34, 7, F, P), { tone: "mid" }));
  }
  {
    const F = radialFrame(236, -0.2, R - 4);
    out.push(S(G.disc(0, 10, 26, F, P), { tone: "mid" }));
    out.push(`<path class="tu-glass" d="${G.circleOf(F, 10, 17, P)}"/>`);
    out.push(`<path class="tu-oil" d="${oilInGlass(F)}"/>`);
    out.push(L(G.circleOf(F, 10, 17, P), { tone: "mid" }));
    out.push(D(G.dotsOf(F, 10, 22, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.45 }));
  }
  return out.join("");
}
// The lower half of the sight glass, filled with oil up to the axis of the glass (level line horizontal).
function oilInGlass(F) {
  const pts = [];
  for (let i = 0; i <= 36; i++) {
    const a = Math.PI + (i / 36) * Math.PI;
    const p = G.add3(G.add3(F.o, G.mul3(F.a, 10)), G.add3(G.mul3(F.u, 17 * Math.cos(a)), G.mul3(G.unit3(G.cross3(F.a, F.u)), 17 * Math.sin(a))));
    pts.push(at(p));
  }
  return pathOf(pts);
}

function housingBody() {
  const inner = [
    L(G.arcOf(AX, 60, 186, P), { tone: "faint" }),
  ].join("");
  const out = [`<g ${HOUSING_MASK}>`];
  out.push(S(G.lathe([[0, BORE_REAR], [0, 206], [34, 206], [34, 186]], AX, P, { steps: 72 }), { tone: "mid" }));
  // Rear flange bolts (on its front face, outside the body) and the front flange's tapped holes.
  const rear = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * TAU + Math.PI / 12;
    if (inCut(t)) continue;
    const F = G.frameAlong(P3(34, 196, t), [1, 0, 0]);
    rear.push({ t, d: G.dot3(F.o, V), svg: S(G.disc(0, 6, 8, F, P, { steps: 6 }), { tone: "mid" }) });
  }
  out.push(rear.sort((a, b) => a.d - b.d).map((b) => b.svg).join(""));
  out.push(S(G.lathe(HOUSING_OUTER.slice(3), AX, P, { steps: 72 }), { tone: "mid", inner }));
  // Mouth: dark bore behind the cover.
  out.push(`<path class="tu-cavity" d="${G.circleOf(AX, MOUTH, BORE_MAIN, P)}"/>`);
  out.push(L(G.circleOf(AX, MOUTH, BORE_MAIN, P), { tone: "mid" }));
  out.push(L(G.circleOf(AX, MOUTH, BORE_MAIN + 8, P), { tone: "faint" }));
  out.push("</g>");
  return out.join("");
}

function housingSection(a, b) {
  const poly = sliceS(HOUSING_SECTION, a, b);
  let extra = null;
  if (b > JACKET.s0) {
    const j0 = Math.max(a, JACKET.s0), j1 = Math.min(b, JACKET.s1);
    if (j1 > j0) {
      const ch = rectPoly(j0, j1, JACKET.r0, JACKET.r1);
      const mid = (JACKET.r0 + JACKET.r1) / 2;
      const flow = (t) => L(pathOf([at(P3(j0, mid, t)), at(P3(j1, mid, t))], false), { tone: "lit", className: "tu-flow" });
      const v = `<path class="tu-water" d="${pathOf(ch.map(([s, r]) => at(P3(s, r, QUARTER))))}"/>${flow(QUARTER)}<path class="iso-line" data-tone="mid" d="${pathOf(ch.map(([s, r]) => at(P3(s, r, QUARTER))))}"/>`;
      const h = `<path class="tu-water" d="${pathOf(ch.map(([s, r]) => at(P3(s, r, 0))))}"/>${flow(0)}<path class="iso-line" data-tone="mid" d="${pathOf(ch.map(([s, r]) => at(P3(s, r, 0))))}"/>`;
      extra = { v, h };
    }
  }
  return sectionFaces(poly, { extra, open: [a, b].filter((v) => v > 0 && v < MOUTH) });
}

// ---------- cartridge (moves out as one), drawn three times: behind the rear section, in front of it,
// and in front of the housing mouth. Its own order is fixed.
function rollerRibsBase() {
  // Rollers seen through the cage windows: four paths by opacity, rewritten each frame by live.js
  // from the same geometry (data.rollers), so the crown turns and the rollers fade toward the limbs.
  return [0.25, 0.5, 0.75, 1].map((o, i) => `<path class="iso-line tu-rollers" data-b="${i}" data-tone="mid" opacity="${o}" d="${rollerPaths(0)[i]}"/>`).join("");
}
function rollerPaths(phase) {
  const { s0, s1, r0, r1, count } = ROLLERS;
  const slope = (r1 - r0) / (s1 - s0);
  const out = ["", "", "", ""];
  for (let i = 0; i < count; i++) {
    const t = phase + (i / count) * TAU;
    const n = G.unit3([-slope, Math.cos(t), Math.sin(t)]);
    const a = G.fadeOf(G.dot3(n, V), [0.1, 0.55]);
    if (a < 0.13) continue;
    const b = Math.min(3, Math.round(a * 4) - 1);
    const [x0, y0] = at(P3(s0, r0, t)), [x1, y1] = at(P3(s1, r1, t));
    out[b] += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
  }
  return out;
}
function thrustBearing() {
  const out = [];
  const [h0, h1, hIn, hOut] = THRUST.hw;
  const [w0, w1, wIn, wOut] = THRUST.sw;
  out.push(ringPart(h0, h1, hIn, hOut, { tone: "hi", faces: [118] }));
  // Roller crown: rollers tilted toward the axis, held in a cage (a conical band).
  const crown = [[THRUST.roll[0], 100], [THRUST.roll[0], 140], [THRUST.roll[1], 120], [THRUST.roll[1], 88]];
  out.push(S(G.lathe(crown, AX, P, { steps: 64 }), { tone: "hi", inner: rollerRibsBase() }));
  out.push(ringPart(w0, w1, wIn, wOut, { tone: "hi", faces: [96] }));
  return out.join("");
}
function rearBearing() {
  const { s0, s1, rIn, rOut } = REAR_BRG;
  return ringPart(s0, s1, rIn, rOut, { tone: "hi", faces: [70, 90] });
}
function frontBearing() {
  const { s0, s1, rIn, rOut } = FRONT_BRG;
  return ringPart(s0, s1, rIn, rOut, { tone: "hi", faces: [80, 100] });
}
function lockNut() {
  const { s0, s1, rIn, rOut } = NUT;
  const F = AX;
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * TAU + 0.4;
    if (G.facingOf(F, t, P) < 0.1) continue;
    slots.push(pathOf([at(P3(s0, rOut, t - 0.06)), at(P3(s1, rOut, t - 0.06)), at(P3(s1, rOut, t + 0.06)), at(P3(s0, rOut, t + 0.06))]));
  }
  return S(G.ringBand(s0, s1, rIn, rOut, F, P, { steps: 40 }), { tone: "mid", inner: L(slots.join(""), { tone: "lo" }) });
}
function sleeveRear() {
  // External splines for the gearbox coupling: ribs that end on the shoulder at s = 36.
  const ribs = G.ribsOf(AX, 0, 36, 52, 20, P, { fade: [0.1, 0.55] });
  return S(G.solidOf(SLEEVE_REAR, AX, P), { tone: "hi", inner: k.fadedSvg(ribs, { tone: "lo" }) });
}
function sleeveMid(a, b, r) {
  return S(G.disc(a, b, r, AX, P, { steps: 48 }), { tone: "hi" });
}
function sleeveJournal(a, b, r = 70) {
  return S(G.disc(a, b, r, AX, P, { steps: 48 }), { tone: "hi" });
}
function sleeveFront() {
  // Front journal to the face; the splined bore turns with the sleeve (live.js rotates the star).
  const out = [S(G.disc(MOUTH, SLEEVE_FRONT_S, 70, AX, P), { tone: "hi" })];
  out.push(`<path class="tu-hole" d="${splineStar(SLEEVE_FRONT_S)}"/><path class="iso-line tu-spline" data-tone="mid" d="${splineStar(SLEEVE_FRONT_S)}"/>`);
  out.push(L(G.circleOf(AX, SLEEVE_FRONT_S, 58, P), { tone: "faint" }));
  return out.join("");
}
function splineStar(s, phase = 0) {
  const pts = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    for (const [f, r] of [[0, SLEEVE_BORE], [0.36, SLEEVE_BORE], [0.5, SLEEVE_BORE - 5], [0.86, SLEEVE_BORE - 5]]) {
      const t = phase + ((i + f) / n) * TAU;
      pts.push(at(P3(s, r, t)));
    }
  }
  return pathOf(pts);
}
const CARRIER_MASK = cutMask("tu-m-carrier", [[CARRIER.s0, CARRIER.rIn], [CARRIER.s0, CARRIER.rOut], [CARRIER.s1, CARRIER.rOut], [CARRIER.s1, CARRIER.rIn]]);
function carrier() {
  const { s0, s1, rIn, rOut } = CARRIER;
  const body = `<g ${CARRIER_MASK}>${S(G.ringBand(s0, s1, rIn, rOut, AX, P, { hole: [s1, rIn], steps: 64 }), { tone: "mid", className: "tu-holed", inner: L(G.circleOf(AX, s1, 130, P), { tone: "faint" }) })}</g>`;
  return body + sectionFaces(rectPoly(s0, s1, rIn, rOut));
}

// Parts the reader can pick. Each group carries data-part and data-hit; the live script lights it.
const part = (name, svg) => `<g data-part="${name}" data-hit>${svg}</g>`;
// Cartridge parts are drawn up to three times (behind the shoulder, in front of it, in front of the
// mouth), so each is defined once and placed with <use>; the use carries data-part for picking.
let defined = 0;
const usePart = (name, svg) => {
  const id = `tu-p${defined++}`;
  defs.push(`<g id="${id}" data-part="${name}">${svg}</g>`);
  return `<use href="#${id}" data-part="${name}" data-hit/>`;
};
function cartridgeRear() {
  return [usePart("sleeve", sleeveRear()), usePart("radial", lockNut() + rearBearing())].join("");
}
// Coaxial pieces in order of s (the viewer looks from +x); the sleeve is split wherever a ring's front
// face would otherwise hide a piece of it that stands in front of that face.
function cartridgeMainOrdered() {
  return [
    usePart("sleeve", sleeveMid(100, 182, 75)),
    usePart("thrust", thrustBearing()),
    usePart("sleeve", sleeveMid(182, 206, 112) + sleeveJournal(206, MOUTH)),
    usePart("radial", frontBearing()),
    usePart("radial", carrier()),
    usePart("sleeve", sleeveFront()),
  ].join("");
}
const moving = (name, inner, attrs = "") => `<g data-move="${name}"${attrs ? " " + attrs : ""}>${inner}</g>`;

// ---------- cover (moves first), cut like the housing
const COVER_MASK = cutMask("tu-m-cover", COVER_OUTER);
function cover() {
  const out = [];
  out.push(`<g ${COVER_MASK}>`);
  out.push(S(G.lathe(COVER_OUTER, AX, P, { hole: [396, COVER_BORE], steps: 72 }), { tone: "hi", className: "tu-holed", inner: L(G.circleOf(AX, 396, 96, P), { tone: "faint" }) }));
  const bolts = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * TAU + Math.PI / 12;
    if (inCut(t)) continue;
    const F = G.frameAlong(P3(372, 168, t), [1, 0, 0]);
    bolts.push({ d: G.dot3(F.o, V), svg: S(G.disc(0, 3, 15, F, P), { tone: "mid" }) + S(G.disc(3, 13, 11, F, P, { steps: 6 }), { tone: "hi" }) });
  }
  out.push(bolts.sort((a, b) => a.d - b.d).map((b) => b.svg).join(""));
  // Two jacking holes between the bolts.
  for (const t of [Math.PI * 1.25, Math.PI * 0.75]) out.push(L(G.circleOf(G.frameAlong(P3(372, 140, t), [1, 0, 0]), 0, 6, P), { tone: "lo" }));
  out.push("</g>");
  out.push(sectionFaces(COVER_SECTION));
  out.push(sectionFaces(SEAL, { cls: "tu-seal" }));
  return out.join("");
}
function coverCavity() {
  // Inside of the cover's bore, seen through its cut, behind the sleeve end.
  return `<g><path class="tu-cavity" d="${pathOf(G.hullOf([...Array.from({ length: 48 }, (_, i) => at(P3(MOUTH, COVER_BORE, (i / 48) * TAU))), ...Array.from({ length: 48 }, (_, i) => at(P3(396, COVER_BORE, (i / 48) * TAU)))]))}"/></g>`;
}
defs.push(`<clipPath id="tu-c-cover"><path d="${quarterHull(COVER_OUTER, 0)}"/></clipPath>`);

// ---------- assemble
const rear = cartridgeRear();
const main = cartridgeMainOrdered();
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs>${defs.join("")}</defs><g data-pan>`,
    pad(),
    foot(),
    part("housing", housingBody() + fittings()),
    `<g clip-path="url(#tu-c-housing)"><path class="tu-cavity" d="${boreHull([[0, SHOULDER, BORE_REAR], [SHOULDER, MOUTH, BORE_MAIN]])}"/></g>`,
    // Behind the shoulder: the rear parts as seen through the cut, then the rear section of the housing.
    `<g clip-path="url(#tu-c-housing)">${moving("cartridge", rear)}</g>`,
    part("housing", housingSection(0, SHOULDER)),
    // In front of the shoulder: the rear parts again where they have moved past it, then the main parts.
    `<g clip-path="url(#tu-c-housing)"><g ${REAR_TUBE}>${moving("cartridge", rear)}</g>${moving("cartridge", main)}</g>`,
    part("housing", housingSection(SHOULDER, MOUTH)),
    // In front of the mouth: everything of the cartridge that has come out, or shows through the open mouth.
    moving("cover", coverCavity()),
    `<g ${MOUTH_TUBE}>${moving("cartridge", rear + main)}</g>`,
    moving("cover", part("cover", cover())),
    `</g>`,
  ],
});

// The kit samples outlines every ~1.5 px; on big rings that is far denser than the eye needs.
// Thin the outline, fill, crease and bevel paths to within 0.12 px (Douglas-Peucker), the same way
// for a fill and its outline, so they stay identical.
function thin(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len > 1e-6 ? Math.abs((px - ax) * dy - (py - ay) * dx) / len : Math.hypot(px - ax, py - ay);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
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
const thinSvg = (markup) => markup.replace(/(<path class="(?:iso-fill|iso-line iso-edge|iso-line iso-crease|iso-line iso-bevel|tu-cavity)"[^>]*? d=")([^"]*)"/g, (_, head, d) => `${head}${thinPath(d)}"`);

const DATA = {
  view: { origin: P.origin, scale: P.scale, azimuth: P.azimuth, elevation: P.elevation },
  axisZ: AXIS_Z,
  pan: PAN,
  moves: { cover: k.axisVector(P, [COVER_OUT, 0, 0]), cartridge: k.axisVector(P, [CARTRIDGE_OUT, 0, 0]) },
  rollers: ROLLERS,
  face: { s: SLEEVE_FRONT_S, bore: SLEEVE_BORE, teeth: 16 },
  spring: { stiffness: 60, damping: 15.5, stagger: 0.32 },
};

const CSS = figureCss(`
.tu-cavity{fill:var(--tu-cavity);stroke:none}
.tu-hole{fill:var(--tu-cavity);stroke:none}
.tu-water{fill:var(--tu-water);stroke:none}
.tu-glass{fill:var(--anatomy-shade-1);stroke:none}
.tu-oil{fill:var(--tu-oil);stroke:none}
.${SVG_CLASS} .iso-shade.tu-cut-v{fill:var(--tu-cut-v)}
.${SVG_CLASS} .iso-top.tu-cut-h{fill:var(--tu-cut-h)}
.${SVG_CLASS} .tu-seal .iso-shade.tu-cut-v,.${SVG_CLASS} .tu-seal .iso-top.tu-cut-h{fill:var(--tu-seal)}
.tu-flow{stroke-dasharray:3 7;stroke-width:.8}
.tu-rollers{stroke-width:.7}
.tu-holed>.iso-fill{fill-rule:evenodd}`, {
  light: "--tu-cavity:#c9d0c7;--tu-water:#d3e2e6;--tu-oil:#d9cfa8;--tu-cut-v:#e3e8e1;--tu-cut-h:#eef2ec;--tu-seal:#9aa59d",
  dark: "--tu-cavity:#0b100d;--tu-water:#1d3236;--tu-oil:#4a4228;--tu-cut-v:#202b24;--tu-cut-h:#26322a;--tu-seal:#3a463f",
});

const file = writeFigure({ id: "thrust-bearing-unit", svg: thinSvg(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "thrust-bearing-unit", file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
