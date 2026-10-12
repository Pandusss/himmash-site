// Центрифуга для обезвоживания полимеров: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x along the rotor (feed end at -x, drive and discharge end at +x), y across, z up.
// The housing is drawn in half-section: the front half (y > 0) of the screen basket and of the trough is cut away,
// so the rotor with its paddles, the back of the basket, the water and the sludge screw are seen inside.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "centrifuge";
const WIDTH = 520;
const HEIGHT = 480;

// ---------- dimensions (mm)
const Z = 1100;                 // rotor axis above the floor
const BEAM_H = 200;             // base beams
const WALL_R = 650;             // end walls: a disc on a straight lower part
const WALL_T = 40;
const XIN = 1010;               // inner faces of the end walls at ±XIN (rotor about 2 000 mm long)
const XF = -XIN - WALL_T;       // outer face of the feed wall
const XD = XIN + WALL_T;        // outer face of the drive wall
const RB = 430;                 // screen basket: octagon, vertex radius
const DRUM_R = 200;             // rotor drum
const SHAFT_R = 55;
const ZS = 470;                 // sludge screw axis
const PIPE_R = 140;             // sludge trough, outer radius
const TROUGH_Y = -480;          // trough back wall (inner face)
const TROUGH_KNEE = Z - 300;    // where the back wall turns into the sloped bottom
const PAD = { x: 1150, w: 140 };// pulleys: x from 1150 to 1290
const PULLEY_R = 260;
const MOTOR = { y: 360, z: 455, r: 225, x0: 1320, x1: 1920 };
const MPULLEY_R = 130;

// Paddles: four rows, nine paddles in each, staggered by 20° along the rotor; blades inclined 30° to the axis.
const PADDLE = { r0: 197, r1: 390, w: 132, t: 14, beta: (30 * Math.PI) / 180 };
const PADDLES = [];
for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) PADDLES.push({ x: -880 + i * 220, phase: (j * Math.PI) / 2 + (i * Math.PI) / 9 });

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: -1700, y: -650, w: 3650, d: 1300 }, 0, Z + WALL_R),
    [800, -330, Z + RB + 560],
    [-1720, 0, Z + 520],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 62 },
);
const V = G.viewOf(P);
const LIGHT = G.lightOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const seg = (a, b) => k.segment(a, b, P);
const byDepth = (list, of = (item) => item) => [...list].sort((a, b) => G.dot3(of(a), V) - G.dot3(of(b), V));

// Frames: prisms along x take polygons in (y, z); along y in (x, z); along z in (x, y).
const FX = (x = 0) => G.frameOf([x, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = (y = 0) => G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const alongX = (poly, x0, x1) => G.prismOf(FX(), poly, x0, x1, P);
const alongY = (poly, y0, y1) => G.prismOf(FY(), poly, y0, y1, P);
const axisX = (y, z, x = 0) => G.frameAlong([x, y, z], [1, 0, 0]);
const quad = (a, b, t) => {
  // A plate of thickness t on the left of the line a -> b in the (y, z) plane.
  const dy = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dy, dz);
  const ny = (-dz / len) * t, nz = (dy / len) * t;
  return [a, b, [b[0] + ny, b[1] + nz], [a[0] + ny, a[1] + nz]];
};
const vertex = (deg, r = RB) => [r * Math.cos((deg * Math.PI) / 180), Z + r * Math.sin((deg * Math.PI) / 180)];
// Angles in the basket section run from +y toward +z: 90 is the top, 180 the back, 270 the bottom.

// ---------- base frame
const BEAMS = [-560, 560];
const CROSS = [-1030, 1030, 1360, 1880];
function beam(x0, x1, y) {
  const p = plan(x0, y - 50, x1 - x0, 100, 2);
  // An I-beam seen from the side: the flanges' inner edges run end to end along the outer face.
  return S(k.slabOf(p, 0, BEAM_H, P, 2, 1.5), { tone: "lo", inner: L(k.sideSeam(p, 18, P, 2) + k.sideSeam(p, BEAM_H - 18, P, 2), { tone: "faint" }) });
}
function crossMember(x) {
  const p = plan(x - 45, -510, 90, 1020, 2);
  return S(k.slabOf(p, BEAM_H - 140, 140, P, 2, 1), { tone: "lo" });
}
function feet(y) {
  const out = [];
  for (const x of [-1100, 1950]) {
    out.push(S(k.cylinder(x, y, 70, -2, 20, P, 24), { tone: "lo" }));
  }
  return out.join("");
}

// ---------- end walls
const WALL_POLY = (() => {
  const pts = [[WALL_R, BEAM_H]];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI;
    pts.push([WALL_R * Math.cos(a), Z + WALL_R * Math.sin(a)]);
  }
  pts.push([-WALL_R, BEAM_H]);
  return pts;
})();
const wallSolid = (x0) => alongX(WALL_POLY, x0, x0 + WALL_T);
// Seam along the edge of the wall, where its rim band is welded on (visible from the faces that show).
function gusset(xFace, dir, y) {
  const poly = dir > 0 ? [[xFace, BEAM_H], [xFace + 170, BEAM_H], [xFace, BEAM_H + 300]] : [[xFace, BEAM_H], [xFace, BEAM_H + 300], [xFace - 170, BEAM_H]];
  return S(alongY(poly, y - 10, y + 10), { tone: "mid" });
}

function feedWall() {
  const out = [];
  out.push(S(wallSolid(XF), { tone: "mid" }));
  // On the inner face: the end ring of the basket (front half left on the wall when the housing was cut),
  // the end plate of the trough and the feed opening below the shaft.
  const x = -XIN;
  const ring = [];
  for (let d = 90; d >= -90; d -= 45) ring.push(vertex(d));
  for (let i = 0; i < ring.length - 1; i++) out.push(S(alongX(quad(ring[i], ring[i + 1], 26), x, x + 22), { tone: "mid" }));
  // Feed opening: a dark window with a frame, wet flakes slide in here from the chute.
  const win = [[-150, Z - 360], [150, Z - 360], [150, Z - 130], [-150, Z - 130]].map(([y, z]) => at([x, y, z]));
  out.push(`<path class="cf-void" d="${pathOf(win)}"/>`);
  out.push(L(pathOf(win), { tone: "mid" }));
  // Bearing boss for the rotor shaft.
  out.push(S(G.disc(0, 30, 120, axisX(0, Z, x), P), { tone: "mid" }));
  out.push(D(G.dotsOf(axisX(0, Z, x), 30, 92, 6, P, { all: true }), { size: 0.6 }));
  // Bolts round the wall rim.
  const bolts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    bolts.push(at([x, (WALL_R - 45) * Math.cos(a), Z + (WALL_R - 45) * Math.sin(a)]));
  }
  out.push(D(bolts, { size: 0.55 }));
  return out.join("");
}

// The sludge trough's far end and the screw shaft through the feed wall are hidden; the chute is behind the wall.
function feedChute() {
  const out = [];
  // Inclined square chute entering the window in the feed wall, rising outward at 45°.
  const a0 = [XF + 10, Z - 360], a1 = [XF + 10, Z - 130];
  const run = 520;
  const poly = [[a0[0], a0[1]], [a1[0], a1[1]], [a1[0] - run, a1[1] + run], [a0[0] - run - 160, a0[1] + run]];
  out.push(S(alongY(poly, -150, 150), { tone: "mid" }));
  // Hopper mouth on its upper end: a box widening upward.
  const top = Z - 130 + run;
  const hx = XF + 10 - run - 80;
  out.push(S(hopper(hx, 0, top - 40, 170, 270, 220), { tone: "mid" }));
  const mouth = plan(hx - 270, -270, 540, 540, 4);
  out.push(`<path class="cf-void" d="${pathOf(k.ringOf(k.insetPlan(mouth, 22), 2).map(([x, y]) => at([x, y, top + 180])))}"/>`);
  out.push(L(k.planOutline(k.insetPlan(mouth, 22), top + 180, P, 2), { tone: "mid" }));
  return out.join("");
}
// A frustum standing on z0: square bottom of half-size b, square top of half-size t, height h.
function hopper(cx, cy, z0, b, t, h) {
  const bottom = [[-b, -b], [b, -b], [b, b], [-b, b]].map(([x, y]) => [cx + x, cy + y, z0]);
  const top = [[-t, -t], [t, -t], [t, t], [-t, t]].map(([x, y]) => [cx + x, cy + y, z0 + h]);
  return hexa([...bottom, ...top]);
}

// Any convex hexahedron: corners 0-3 bottom, 4-7 top, in the same winding.
const FACES = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
function hexa(c) {
  const centre = c.reduce((s, p) => G.add3(s, p), [0, 0, 0]).map((v) => v / 8);
  const flat = c.map(at);
  const buckets = [[], [], [], [], []];
  const seen = FACES.map((f) => {
    let n = G.cross3(G.sub3(c[f[1]], c[f[0]]), G.sub3(c[f[2]], c[f[0]]));
    const mid = f.reduce((s, i) => G.add3(s, c[i]), [0, 0, 0]).map((v) => v / 4);
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
  const crease = [];
  const outline = [];
  for (const [key, list] of edges) {
    const count = list.filter((fi) => seen[fi]).length;
    const [a, b] = key.split("-").map(Number);
    if (count === 2) crease.push(pathOf([flat[a], flat[b]], false));
    if (count === 1) outline.push(pathOf([flat[a], flat[b]], false));
  }
  return { fill: pathOf(G.hullOf(flat)), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
}

// ---------- trough (back half) and sludge screw
const SLOPE_END = [-120, ZS + 70];
function troughBack() {
  const out = [];
  // Rim lip the basket rests on, back wall, sloped bottom: sheet steel 10 mm.
  out.push(S(alongX(quad([TROUGH_Y, Z - 2], [TROUGH_Y - 70, Z - 2], 10).map(([y, z]) => [y, z]), -XIN, XIN), { tone: "mid" }));
  out.push(S(alongX([[TROUGH_Y - 10, TROUGH_KNEE], [TROUGH_Y, TROUGH_KNEE], [TROUGH_Y, Z - 2], [TROUGH_Y - 10, Z - 2]], -XIN, XIN), { tone: "mid" }));
  out.push(S(alongX(quad([TROUGH_Y, TROUGH_KNEE], SLOPE_END, -10), -XIN, XIN), { tone: "mid" }));
  return out.join("");
}
// The U-trough of the sludge screw, seen from inside: facets of its back half, from the slope down to the cut at y = 0.
function screwTrough() {
  const out = [];
  const r = PIPE_R;
  const start = Math.atan2(SLOPE_END[1] - ZS, SLOPE_END[0]);   // where the slope meets the U
  const steps = 7;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + ((1.5 * Math.PI - start) * i) / steps;
    pts.push([r * Math.cos(a), ZS + r * Math.sin(a)]);
  }
  for (let i = 0; i < steps; i++) out.push(S(alongX(quad(pts[i], pts[i + 1], -10), -XIN, XIN), { tone: "mid", crease: "none" }));
  return out.join("");
}
// The sludge outlet under the trough near the drive end, cut in half like the trough, and the tray it drops into.
const SPOUT_X = 760;
function spout() {
  const out = [];
  out.push(S(k.slabOf(plan(SPOUT_X - 70, -70, 140, 70, 2), ZS - PIPE_R - 110, 120, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf(plan(SPOUT_X - 85, -85, 170, 85, 2), ZS - PIPE_R - 130, 22, P, 2), { tone: "mid" }));
  return out.join("");
}
function tray() {
  const p = plan(SPOUT_X - 180, -240, 360, 480, 8);
  const out = [];
  out.push(S(k.slabOf(p, 0, 120, P, 4, 2), { tone: "lo" }));
  out.push(`<path class="cf-sludge" d="${pathOf(k.ringOf(k.insetPlan(p, 18), 4).map(([x, y]) => at([x, y, 100])))}"/>`);
  out.push(L(k.planOutline(k.insetPlan(p, 12), 120, P, 4), { tone: "lo" }));
  return out.join("");
}
// The screw: a shaft with a continuous flight, pitch 200. The flight is drawn as half-turn sheets; back halves before
// the shaft, front halves after it. The whole screw is moved along x by a fraction of the pitch in the page, which
// looks the same as turning it, and clipped to the trough.
const PITCH = 200;
const FLIGHT_R = 122;
function screwSvg() {
  const back = [], front = [];
  const F = axisX(0, ZS, 0);
  const helix = (a0, a1, r) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = a0 + ((a1 - a0) * i) / 14;
      const x = -XIN - PITCH + (a / (2 * Math.PI)) * PITCH;
      pts.push([x, r * Math.cos(a), ZS + r * Math.sin(a)]);
    }
    return pts;
  };
  // The half that faces the viewer: angles where the radial direction points toward V.
  const facing = Math.atan2(V[2], V[1]);
  const turns = Math.ceil((2 * XIN + 2 * PITCH) / PITCH);
  for (let t = 0; t < turns; t++) {
    for (const half of [0, 1]) {
      const a0 = t * 2 * Math.PI + facing - Math.PI / 2 + half * Math.PI;
      const a1 = a0 + Math.PI;
      const outer = helix(a0, a1, FLIGHT_R);
      const inner = helix(a1, a0, 34);
      const poly = [...outer, ...inner].map(at);
      // Shade by the flight's mean normal (roughly along x, tipped by the helix angle).
      const tone = half === 0 ? 2 : 1;
      const svg = S({ fill: pathOf(poly), shades: [0, 1, 2, 3].map((t) => (t === tone ? pathOf(poly) : "")), top: "", crease: "", outline: pathOf(outer.map(at), false) }, { tone: "mid", crease: "none" });
      (half === 0 ? front : back).push(svg);
    }
  }
  const shaft = S(G.disc(-XIN - PITCH, XIN + PITCH, 34, F, P), { tone: "mid", crease: "none" });
  return { back: back.join(""), shaft, front: front.join("") };
}
function screwClip() {
  // Screen region of the trough between the end walls, swept a long way down so the flights below the rim stay in.
  const a = at([-XIN, -PIPE_R - 20, ZS + 260]), b = at([XIN, -PIPE_R - 20, ZS + 260]);
  const c = at([XIN, 60, ZS - PIPE_R - 4]), d = at([-XIN, 60, ZS - PIPE_R - 4]);
  return `<clipPath id="cf-screw"><path d="${pathOf([a, b, [b[0] + 60, b[1] + 60], c, d, [d[0] - 60, d[1]]])}"/></clipPath>`;
}

// ---------- screen basket (back half)
const PANELS = [[135, 180], [180, 225], [225, 270]];   // seen from inside
function basketInside() {
  const out = [];
  for (const [a0, a1] of PANELS) {
    const p0 = vertex(a0), p1 = vertex(a1);
    out.push(S(alongX(quad(p0, p1, -8), -XIN, XIN), { tone: "mid", crease: "none" }));
    // Wedge-wire screen: slots along the rotor, wall to wall, drawn on the inner face.
    const lines = [];
    for (let i = 1; i < 6; i++) {
      const f = i / 6;
      const y = p0[0] + (p1[0] - p0[0]) * f, z = p0[1] + (p1[1] - p0[1]) * f;
      lines.push(seg([-XIN, y * 0.985, Z + (z - Z) * 0.985], [XIN, y * 0.985, Z + (z - Z) * 0.985]));
    }
    out.push(L(lines.join(""), { tone: "faint" }));
    // Section joints of the screen: four sections along the rotor.
    const joints = [-505, 0, 505].map((x) => seg([x, p0[0], p0[1]], [x, p1[0], p1[1]]));
    out.push(L(joints.join(""), { tone: "lo" }));
  }
  return out.join("");
}
function basketTop() {
  // The top-back panel faces the viewer from outside, as in the photo: mesh, frame bars and the bent section ribs.
  const out = [];
  const p0 = vertex(90), p1 = vertex(135);
  out.push(S(alongX(quad(p1, p0, -8), -XIN, XIN), { tone: "hi", crease: "none" }));
  const lines = [];
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    lines.push(seg([-XIN, p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f], [XIN, p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]));
  }
  out.push(L(lines.join(""), { tone: "faint" }));
  // Longitudinal frame bars along both edges of the panel.
  out.push(S(alongX([[-40, Z + RB - 4], [0, Z + RB - 4], [0, Z + RB + 30], [-40, Z + RB + 30]], -XIN, XIN), { tone: "mid" }));
  const v = vertex(135, RB + 4);
  out.push(S(alongX([[v[0] - 30, v[1] - 30], [v[0] + 10, v[1] - 30], [v[0] + 10, v[1] + 26], [v[0] - 30, v[1] + 26]], -XIN, XIN), { tone: "mid" }));
  // Section ribs: bent strips over the panel between the bars, with a bolt at each end.
  for (const x of [-505, 0, 505]) {
    const a = vertex(132, RB + 6), b = vertex(92, RB + 6);
    out.push(S(alongX(quad(a, b, 26), x - 25, x + 25), { tone: "mid" }));
    out.push(D([at([x, ...vertex(126, RB + 34)]), at([x, ...vertex(98, RB + 34)])], { size: 0.5 }));
  }
  return out.join("");
}

// ---------- rotor
function paddleSolid({ x, phase }, angle = 0) {
  const a = phase + angle;
  const er = [0, Math.cos(a), Math.sin(a)];
  const et = [0, -Math.sin(a), Math.cos(a)];
  const ew = G.add3(G.mul3([1, 0, 0], Math.cos(PADDLE.beta)), G.mul3(et, Math.sin(PADDLE.beta)));
  const en = G.cross3(er, ew);
  const centre = [x, ((PADDLE.r0 + PADDLE.r1) / 2) * er[1], Z + ((PADDLE.r0 + PADDLE.r1) / 2) * er[2]];
  const hr = (PADDLE.r1 - PADDLE.r0) / 2, hw = PADDLE.w / 2, ht = PADDLE.t / 2;
  const F = G.frameOf(centre, en, er, ew);
  return { paths: G.prismOf(F, [[-hr, -hw], [hr, -hw], [hr, hw], [-hr, hw]], -ht, ht, P), centre, er };
}
function rotorSvg() {
  // Paddles are rebuilt by the page every frame; the build writes them at rest so the drawing reads without script.
  const back = [], front = [];
  for (const [index, p] of PADDLES.entries()) {
    const { paths, centre, er } = paddleSolid(p);
    const node = { depth: G.dot3(centre, V), html: `<g data-paddle="${index}">${S(paths, { tone: "hi" })}</g>` };
    (G.dot3(er, V) < 0 ? back : front).push(node);
  }
  const sort = (list) => list.sort((a, b) => a.depth - b.depth).map((n) => n.html).join("");
  const F = axisX(0, Z, 0);
  const drum = S(G.disc(-XIN + 60, XIN - 60, DRUM_R, F, P), {
    tone: "hi",
    inner: L([-XIN + 120, XIN - 120].map((s) => G.arcOf(F, s, DRUM_R, P)).join(""), { tone: "faint" }),
  });
  const ends = S(G.disc(-XIN + 30, -XIN + 60, DRUM_R - 30, F, P), { tone: "mid" });
  const shaft = S(G.disc(-XIN, -XIN + 30, SHAFT_R + 20, F, P), { tone: "mid" });
  return `<g class="cf-rotor" data-rotor data-hit>${shaft}${ends}<g data-layer="back">${sort(back)}</g>${drum}<g data-layer="front">${sort(front)}</g></g>`;
}

// ---------- outlet duct (self-discharge: the paddles throw the dry flakes up and out at the drive end)
function outlet() {
  const out = [];
  const zb = (y) => Z + RB + 0.4142 * y;   // the top-back panel
  const y0 = -320, y1 = -36, top = Z + RB + 470;
  out.push(S(alongX([[y0, zb(y0) - 4], [y1, zb(y1) - 4], [y1, top], [y0, top]], 700, 980), { tone: "mid", inner: L(seg([700, y1, top - 60], [980, y1, top - 60]), { tone: "faint" }) }));
  out.push(S(k.slabOf(plan(680, y0 - 20, 320, y1 - y0 + 40, 3), top, 24, P, 2, 1.5), { tone: "mid" }));
  out.push(D([[700, y1 + 6], [840, y1 + 6], [980, y1 + 6], [700, y0 - 8], [980, y0 - 8]].map(([x, y]) => at([x, y, top + 24])), { size: 0.5 }));
  out.push(`<path class="cf-void" d="${pathOf(k.ringOf(plan(712, y0 + 12, 256, y1 - y0 - 24, 2), 2).map(([x, y]) => at([x, y, top + 24])))}"/>`);
  return out.join("");
}

// ---------- drive end
function driveWall() {
  const out = [];
  const x = XD;
  out.push(gusset(XD, 1, -560));
  out.push(S(wallSolid(XIN), { tone: "mid" }));
  out.push(gusset(XD, 1, 560));
  const F = axisX(0, Z, x);
  // Bolted cover disc and its bolt circle.
  out.push(S(G.disc(0, 14, WALL_R - 90, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 14, WALL_R - 125, 16, P, { all: true, phase: Math.PI / 16 }), { size: 0.6 }));
  // Octagonal inspection cover above the shaft.
  const oct = Array.from({ length: 8 }, (_, i) => {
    const a = ((i + 0.5) / 8) * 2 * Math.PI;
    return [140 * Math.cos(a), Z + 330 + 110 * Math.sin(a)];
  });
  out.push(S(G.prismOf(G.frameOf([x + 14, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]), oct, 0, 10, P), { tone: "mid" }));
  out.push(D(oct.map(([y, z]) => at([x + 24, y * 0.82, Z + 330 + (z - Z - 330) * 0.82])), { size: 0.5 }));
  // Label plate.
  const lz = Z - 360, ly = -300;
  out.push(S(G.prismOf(G.frameOf([x + 14, ly, lz], [1, 0, 0], [0, 1, 0], [0, 0, 1]), [[-75, -40], [75, -40], [75, 40], [-75, 40]], 0, 3, P), { tone: "mid" }));
  out.push(L([[-55, 18, 70], [-55, 0, 100], [-55, -18, 50]].map(([y0, z0, len]) => seg([x + 17, ly + y0, lz + z0], [x + 17, ly + y0 + len, lz + z0])).join(""), { tone: "lo", free: true }));
  // Bearing housing: flange, body, cap, grease nipple.
  out.push(S(G.disc(14, 40, 175, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 40, 148, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.65 }));
  out.push(S(G.disc(40, 90, 120, F, P), { tone: "mid" }));
  out.push(S(G.disc(90, 100, 90, F, P), { tone: "mid" }));
  const nip = G.frameAlong([x + 65, 0, Z + 118], [0, 0, 1]);
  out.push(S(G.disc(0, 18, 9, nip, P), { tone: "mid" }));
  out.push(S(G.disc(0, PAD.x - x - 100, SHAFT_R, axisX(0, Z, x + 100), P), { tone: "hi", crease: "none" }));
  return out.join("");
}

// V-belts in the plane of the pulleys: one loop of five belts, wrapped round the far side of each pulley and running
// between them on the two tangents. Drawn as one solid: its front side face, the visible part of its outer surface
// and an outline, so the strands run into the wraps without a joint.
const BIG = [0, Z], SMALL = [MOTOR.y, MOTOR.z];
const BELT_T = 12;
function beltLoop(x0, x1) {
  const [y1, z1] = BIG, [y2, z2] = SMALL;
  const base = Math.atan2(z2 - z1, y2 - y1);
  const off = Math.acos((PULLEY_R - MPULLEY_R) / Math.hypot(y2 - y1, z2 - z1));
  const arc = ([cy, cz], r, a0, a1) => Array.from({ length: 41 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 40;
    return [cy + r * Math.cos(a), cz + r * Math.sin(a)];
  });
  const loopAt = (grow) => [...arc(BIG, PULLEY_R + grow, base + off, base - off + 2 * Math.PI), ...arc(SMALL, MPULLEY_R + grow, base - off, base + off)];
  const outer = loopAt(BELT_T), inner = loopAt(0);
  const P3 = (x, [y, z]) => at([x, y, z]);
  const n = outer.length;
  const seen = [], buckets = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n];
    const ty = b[0] - a[0], tz = b[1] - a[1], len = Math.hypot(ty, tz) || 1;
    const normal = [0, tz / len, -ty / len];
    const visible = G.dot3(normal, V) > 1e-6;
    seen.push(visible);
    if (visible) buckets[G.bandOf(G.dot3(normal, LIGHT))].push(pathOf([P3(x0, a), P3(x0, b), P3(x1, b), P3(x1, a)]));
  }
  const front = pathOf(outer.map((p) => P3(x1, p))) + pathOf(inner.map((p) => P3(x1, p)).reverse());
  const toneFront = G.bandOf(G.dot3([1, 0, 0], LIGHT));
  if (toneFront === 4) buckets[4].push(front); else buckets[toneFront].push(front);
  const runs = [];
  let run = null;
  for (let j = 0; j < n; j++) {
    const i = (j + seen.indexOf(false) + 1) % n;
    if (seen[i]) { if (!run) runs.push((run = [])); run.push(i); } else run = null;
  }
  const outline = [pathOf(inner.map((p) => P3(x1, p)))], crease = [];
  const lines = [];
  for (const r of runs) {
    const pts = [...r, (r[r.length - 1] + 1) % n];
    outline.push(pathOf(pts.map((i) => P3(x0, outer[i])), false));
    crease.push(pathOf(pts.map((i) => P3(x1, outer[i])), false));
    outline.push(pathOf([P3(x0, outer[pts[0]]), P3(x1, outer[pts[0]])], false));
    outline.push(pathOf([P3(x0, outer[pts[pts.length - 1]]), P3(x1, outer[pts[pts.length - 1]])], false));
    for (let b = 1; b < 5; b++) {
      const x = x0 + ((x1 - x0) * b) / 5;
      lines.push(pathOf(pts.map((i) => P3(x, outer[i])), false));
    }
  }
  // Front-face outer edge where the outer surface is hidden.
  let hidden = [];
  for (let j = 0; j <= n; j++) {
    const i = (j + seen.indexOf(false)) % n;
    if (!seen[i]) hidden.push(i);
    if ((seen[i] || j === n) && hidden.length) { hidden.push((hidden[hidden.length - 1] + 1) % n); outline.push(pathOf(hidden.map((h) => P3(x1, outer[h])), false)); hidden = []; }
  }
  const fill = buckets.flat().join("");
  const paths = { fill, outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
  return S(paths, { tone: "lo", inner: L(lines.join(""), { tone: "faint" }) }).replace('<path class="iso-fill"', '<path class="iso-fill" fill-rule="evenodd"');
}
function pulleyRim(cy, cz, r) {
  const F = axisX(cy, cz, PAD.x);
  // The rim with its grooves, which show only where the belts leave the pulley.
  return S(G.disc(0, PAD.w, r, F, P), { tone: "lo", inner: L([1, 2, 3, 4].map((i) => G.arcOf(F, (PAD.w * i) / 5, r, P)).join(""), { tone: "faint" }) });
}
function pulleyFace(cy, cz, r, spokes) {
  const out = [];
  const F = axisX(cy, cz, PAD.x);
  out.push(L(G.circleOf(F, PAD.w, r - 14, P), { tone: "lo" }));
  if (spokes) {
    out.push(`<g data-spokes>${spokesPaths(cy, cz, r, 0)}</g>`);
    out.push(S(G.disc(PAD.w, PAD.w + 20, 72, F, P), { tone: "mid" }));
    out.push(`<g data-hub>${D(hubDots(cy, cz, 0), { size: 0.55 })}</g>`);
    out.push(S(G.disc(PAD.w + 20, PAD.w + 28, 26, F, P), { tone: "mid" }));
  } else {
    out.push(S(G.disc(PAD.w, PAD.w + 24, 48, F, P), { tone: "mid" }));
    out.push(`<g data-mhub>${D(hubDots(cy, cz, 0, 30, 3), { size: 0.5 })}</g>`);
  }
  return out.join("");
}
const SPOKE = { r0: 95, r1: 205, half: 0.42 };
function windowPoints(cy, cz, a) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = a - SPOKE.half + (2 * SPOKE.half * i) / 8;
    pts.push([PAD.x + PAD.w, cy + SPOKE.r1 * Math.cos(t), cz + SPOKE.r1 * Math.sin(t)]);
  }
  for (let i = 8; i >= 0; i--) {
    const t = a - SPOKE.half * 0.8 + (2 * SPOKE.half * 0.8 * i) / 8;
    pts.push([PAD.x + PAD.w, cy + SPOKE.r0 * Math.cos(t), cz + SPOKE.r0 * Math.sin(t)]);
  }
  return pts;
}
function spokesPaths(cy, cz, r, angle) {
  let d = "";
  for (let i = 0; i < 5; i++) d += pathOf(windowPoints(cy, cz, angle + (i * 2 * Math.PI) / 5).map(at));
  return `<path class="cf-void" d="${d}"/>${L(d, { tone: "lo" })}`;
}
function hubDots(cy, cz, angle, r = 48, n = 6) {
  return Array.from({ length: n }, (_, i) => at([PAD.x + PAD.w + 20, cy + r * Math.cos(angle + (i * 2 * Math.PI) / n), cz + r * Math.sin(angle + (i * 2 * Math.PI) / n)]));
}

function motor() {
  const out = [];
  const { y, z, r, x0, x1 } = MOTOR;
  const base = plan(x0 - 40, y - 230, x1 - x0 + 120, 460, 4);
  out.push(S(k.slabOf(base, BEAM_H, 30, P, 3, 1.5), { tone: "lo" }));
  // Slide rails with tension bolts.
  for (const dy of [-150, 150]) {
    const rail = plan(x0, y + dy - 30, x1 - x0, 60, 3);
    out.push(S(k.slabOf(rail, BEAM_H + 30, 40, P, 2, 1), { tone: "mid" }));
  }
  // Feet.
  for (const fx of [x0 + 80, x1 - 140]) for (const dy of [-150, 150]) out.push(S(k.slabOf(plan(fx, y + dy - 40, 90, 80, 3), BEAM_H + 70, z - r + 40 - BEAM_H - 70, P, 2, 1), { tone: "mid" }));
  const F = axisX(y, z, 0);
  // Shaft to the pulley, drive-end shield, finned frame, fan cowl.
  out.push(S(G.disc(PAD.x + PAD.w + 24, x0, 30, F, P), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(x0, x0 + 40, r - 25, F, P), { tone: "mid" }));
  const ribs = G.ribsOf(F, x0 + 40, x1 - 60, r, 30, P, { fade: [0.08, 0.5], seams: true });
  out.push(S(G.disc(x0 + 40, x1 - 60, r, F, P), { tone: "mid", crease: "none", inner: k.fadedSvg(ribs, { tone: "lo" }) }));
  out.push(S(G.disc(x1 - 60, x1, r - 10, F, P), { tone: "mid" }));
  const cowl = G.frameAlong([x1, y, z], [1, 0, 0]);
  out.push(L([r - 40, r - 85, r - 130, r - 175].map((rr) => G.circleOf(cowl, 0, rr, P)).join(""), { tone: "lo" }));
  out.push(S(G.disc(0, 12, 34, cowl, P), { tone: "mid" }));
  // Terminal box with cable glands.
  const box = plan(x0 + 170, y - 110, 220, 220, 6);
  out.push(S(k.slabOf(box, z + r - 30, 110, P, 3, 2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(box, 18), z + r + 80, P, 3), { tone: "faint" }));
  for (const dz of [40, 40]) {
    const g = G.frameAlong([x0 + 200, y + 110, z + r + dz], [0, 1, 0]);
    out.push(S(G.disc(0, 30, 20, g, P), { tone: "mid" }));
    break;
  }
  const g2 = G.frameAlong([x0 + 280, y + 110, z + r + 40], [0, 1, 0]);
  out.push(S(G.disc(0, 30, 20, g2, P), { tone: "mid" }));
  // Rating plate.
  out.push(S(G.prismOf(G.frameOf([x0 + 260, y + r * 0.72, z + r * 0.69], [0, Math.SQRT1_2, Math.SQRT1_2], [1, 0, 0], [0, -Math.SQRT1_2, Math.SQRT1_2]), [[-60, -35], [60, -35], [60, 35], [-60, 35]], 0, 4, P), { tone: "mid" }));
  return out.join("");
}

// ---------- dynamic layers, written by the page
const water = `<g class="cf-drops" data-drops></g>`;
const flakes = `<g class="cf-flakes" data-flakes></g>`;
const sludge = `<g class="cf-drops" data-sludge></g>`;
function waterPool() {
  // Water standing in the bottom of the U-trough over the lower flights: a tinted band clipped by the trough.
  const level = ZS - 40;
  const half = Math.sqrt(PIPE_R * PIPE_R - 40 * 40) - 10;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + Math.asin(40 / (PIPE_R - 10)) + ((Math.PI / 2 - Math.asin(40 / (PIPE_R - 10))) * i) / 12;
    pts.push([(PIPE_R - 10) * Math.cos(a), ZS + (PIPE_R - 10) * Math.sin(a)]);
  }
  const back = pts.map(([y, z]) => at([-XIN, y, z]));
  const frontPts = pts.map(([y, z]) => at([XIN, y, z])).reverse();
  const surface = [at([-XIN, -half, level]), at([XIN, -half, level]), at([XIN, 0, level]), at([-XIN, 0, level])];
  return `<path class="cf-pool" d="${pathOf([...back, ...frontPts])}"/><path class="cf-pool" d="${pathOf(surface)}"/>${L(seg([-XIN, -half, level], [XIN, -half, level]), { tone: "faint", className: "cf-wline" })}`;
}

const screw = screwSvg();

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs>${screwClip()}</defs>`,
    ...[-560, 560].map((y) => `<path class="iso-halo" d="${k.haloOf(plan(-1150, y - 70, 3150, 140, 20), 0, 40, P)}"/>`),
    `<path class="iso-halo" d="${k.haloOf(plan(SPOUT_X - 200, -260, 400, 520, 20), 0, 30, P)}"/>`,
    feet(-560),
    beam(-1150, 2000, BEAMS[0]),
    ...CROSS.map(crossMember),
    feedChute(),
    `<g class="cf-flakes" data-in></g>`,
    gusset(XF, -1, -560),
    feedWall(),
    gusset(XF, -1, 560),
    tray(),
    sludge,
    spout(),
    troughBack(),
    screwTrough(),
    `<g clip-path="url(#cf-screw)"><g data-screw>${screw.back}${screw.shaft}${screw.front}</g></g>`,
    waterPool(),
    water,
    basketInside(),
    flakes,
    rotorSvg(),
    basketTop(),
    outlet(),
    `<g class="cf-flakes" data-out></g>`,
    feet(560),
    beam(-1150, 2000, BEAMS[1]),
    driveWall(),
    pulleyRim(0, Z, PULLEY_R),
    beltLoop(PAD.x + 8, PAD.x + PAD.w - 8),   // the motor pulley sits behind the motor body, seen from here
    pulleyFace(0, Z, PULLEY_R, true),
    motor(),
  ],
});

const cam = k.cameraOf(P);
const DATA = {
  proj: { ox: P.origin[0], oy: P.origin[1], k: cam.k, sinA: cam.sinA, cosA: cam.cosA, sinE: cam.sinE, cosE: cam.cosE },
  view: V,
  light: LIGHT,
  bands: [0, 0.2, 0.42, 0.62],
  axis: Z,
  paddle: { r0: PADDLE.r0, r1: PADDLE.r1, w: PADDLE.w, t: PADDLE.t, beta: PADDLE.beta },
  paddles: PADDLES.map((p) => [p.x, +p.phase.toFixed(4)]),
  basket: { x0: -XIN + 40, x1: XIN - 40, r: RB * 0.9 },
  trough: { pool: ZS - 40, spoutX: SPOUT_X, spoutZ: ZS - PIPE_R - 130, tray: 100 },
  screwStep: k.axisVector(P, [PITCH, 0, 0]),
  pulley: { x: PAD.x + PAD.w, big: [0, Z], small: [MOTOR.y, MOTOR.z], spoke: SPOKE, ratio: PULLEY_R / MPULLEY_R },
  wall: XIN,
  start: [2.2, 2.0],
  stopTime: 4.5,
  materials: [
    { inlet: 17, size: 50 },
    { inlet: 15, size: 100 },
    { inlet: 15, size: 30 },
  ],
  outlet: [3, 5],
  capacity: 500,
  mouthOut: { x: [712, 968], y: [-308, -48], z: Z + RB + 470 + 24 },
  mouthIn: { x: XF + 10 - 520 - 80, half: 248, z: Z - 130 + 520 + 180 },
  rpm: 1500,
  shownRps: 0.45,
};

const CSS = figureCss(`
.cf-void{fill:var(--cf-void);stroke:none}
.cf-pool{fill:var(--cf-water);opacity:.28;stroke:none}
.cf-wline{stroke:var(--cf-water)}
.cf-sludge{fill:var(--cf-dirt);opacity:.55;stroke:none}
.cf-drops ellipse{fill:var(--cf-water);stroke:none}
.cf-flakes path{stroke:none}
.cf-flakes [data-w="0"]{fill:var(--cf-water)}
.cf-flakes [data-w="1"]{fill:var(--cf-damp)}
.cf-flakes [data-w="2"]{fill:var(--anatomy-hi)}`, {
  light: "--cf-void:#2a3530;--cf-water:#3f7f9a;--cf-damp:#4f6f73;--cf-dirt:#6b6152",
  dark: "--cf-void:#050706;--cf-water:#7fb8d0;--cf-damp:#a8c4c8;--cf-dirt:#8a7a5e",
});

const file = writeFigure({ id: ID, svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("k", k.cameraOf(P).k.toFixed(4), "wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
