// Шнеки и валы: an interactive isometric figure built with the anatomy kit.
// A friction-washer shaft with bolted blade overlays lies on the roller supports of a dynamic balancing machine.
// World units are millimetres; x along the shaft, y across (toward the viewer), z up.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "screws-and-shafts";
const WIDTH = 520;
const HEIGHT = 420;

// ---------- dimensions (mm)
const Z = 1000;                       // shaft axis
const BED = { x: -1680, y: -300, w: 3360, d: 600, r: 10 };
const BED_Z = 70, BED_TOP = 380;
const BODY_R = 110, BODY_X = 1150;    // pipe body
const DISC = { r: 150, x0: 1150, x1: 1172 };   // end discs: the two correction planes
const HUB_R = 75, SEAT_R = 55, JOURNAL_R = 45;
const SUPPORT_X = 1440;
const ROLLER_R = 50, ROLLER_Y = 70;
const ROLLER_Z = Z - Math.sqrt((JOURNAL_R + ROLLER_R) ** 2 - ROLLER_Y ** 2);
// Blades: two straight rows on opposite sides, seven blades a side of the drive gap, inclined 30° to the axis;
// each blade is a welded arm with a heat-treated overlay bolted to its tip.
const BLADE = { r0: BODY_R - 4, r1: 330, w: 130, t: 12, beta: (30 * Math.PI) / 180 };
const OVERLAY = { r0: 238, r1: 336, w: 130, t: 10 };
const XS = [];
for (let i = 0; i < 7; i++) XS.push(-(240 + i * 140), 240 + i * 140);
XS.sort((a, b) => a - b);
const ROWS = [0, Math.PI];

const P = k.fitProjection(
  [...k.boxCorners(BED, 0, BED_TOP), [-1560, 0, Z + 340], [1560, 0, Z + 340], [0, -520, 300], [1560, 0, Z - 340], [-1560, 0, Z - 340]],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 44 },
);
const V = G.viewOf(P);
const LIGHT = G.lightOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const centred = (cx, cy, w, d, r = 4) => plan(cx - w / 2, cy - d / 2, w, d, r);
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const seg = (a, b) => k.segment(a, b, P);
const axisX = (y, z, x = 0) => G.frameAlong([x, y, z], [1, 0, 0]);
const FX = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const FY = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);

// ---------- bed
function bed() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BED, 0, 60, P)}"/>`);
  for (const [x, y] of [[-1580, -230], [1580, -230]]) out.push(S(k.cylinder(x, y, 60, 0, BED_Z, P, 24), { tone: "lo" }));
  out.push(S(k.slabOf(BED, BED_Z, BED_TOP - BED_Z - 30, P, 6, 2), { tone: "lo", inner: Ln(k.sideSeam(BED, BED_Z + 60, P, 6), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(BED, -12), BED_TOP - 30, 30, P, 6, 2), { tone: "mid" }));
  // Two ways the supports slide on, with a scale strip between them.
  for (const y of [-160, 160]) out.push(S(k.slabOf(plan(BED.x + 40, y - 30, BED.w - 80, 60, 3), BED_TOP, 26, P, 3, 1), { tone: "mid" }));
  const strip = plan(BED.x + 60, -18, BED.w - 120, 36, 2);
  out.push(S(k.slabOf(strip, BED_TOP, 4, P, 2), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 20, strip.x + strip.w - 20, 50, 10, strip.y + 1, BED_TOP + 4, [10, 20], P);
  out.push(Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }));
  // Bolted access covers along the front of the bed.
  const fy = BED.y + BED.d;
  const covers = [];
  const screws = [];
  for (const x0 of [-1500, -700, 100]) {
    const x1 = x0 + 620, z0 = BED_Z + 70, z1 = BED_TOP - 80;
    covers.push(pathOf([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => at([x, fy, z]))));
    for (const [x, z] of [[x0 + 20, z0 + 20], [x1 - 20, z0 + 20], [x0 + 20, z1 - 20], [x1 - 20, z1 - 20]]) screws.push(at([x, fy, z]));
  }
  out.push(Ln(covers.join(""), { tone: "lo" }));
  out.push(D(screws, { size: 0.45 }));
  // Label plate on the front of the bed.
  const ly = BED.y + BED.d, lx = 1360, lz = 225;
  out.push(S(G.prismOf(G.frameOf([lx, ly, lz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[-110, -45], [110, -45], [110, 45], [-110, 45]], 0, 4, P), { tone: "mid" }));
  out.push(Ln([[-85, 20, 120], [-85, 0, 160], [-85, -20, 90]].map(([x0, z0, len]) => seg([lx + x0, ly + 4, lz + z0], [lx + x0 + len, ly + 4, lz + z0])).join(""), { tone: "lo", free: true }));
  out.push(D([at([lx - 98, ly + 4, lz]), at([lx + 98, ly + 4, lz])], { size: 0.45 }));
  return out.join("");
}
function frontFeet() {
  return [[-1580, 230], [1580, 230]].map(([x, y]) => S(k.cylinder(x, y, 60, 0, BED_Z, P, 24), { tone: "lo" })).join("");
}

// ---------- supports (pedestals) with rollers
function pedestal(xc) {
  const out = [];
  const base = centred(xc, 0, 300, 440, 6);
  out.push(S(k.slabOf(base, BED_TOP + 26, 40, P, 3, 1.5), { tone: "mid" }));
  out.push(D([[-120, -190], [120, -190], [-120, 190], [120, 190]].map(([dx, dy]) => at([xc + dx, dy, BED_TOP + 66])), { size: 0.55 }));
  const col = centred(xc, 0, 200, 300, 6);
  out.push(S(k.slabOf(col, BED_TOP + 66, ROLLER_Z - 120 - BED_TOP - 66, P, 3, 1.5), { tone: "mid", inner: Ln(k.sideSeam(col, ROLLER_Z - 200, P, 3), { tone: "faint" }) }));
  // Height adjustment hand wheel on the front of the column.
  const hw = G.frameAlong([xc, 150, ROLLER_Z - 330], [0, 1, 0]);
  out.push(S(G.disc(0, 30, 16, hw, P), { tone: "mid" }));
  out.push(S(G.disc(30, 46, 52, hw, P), { tone: "mid" }));
  out.push(Ln(G.circleOf(hw, 46, 36, P), { tone: "lo" }));
  out.push(S(G.disc(46, 70, 9, G.frameAlong([xc + 36, 150, ROLLER_Z - 330], [0, 1, 0]), P), { tone: "mid" }));
  return out.join("");
}
// The swinging roller carrier: a block under two rollers whose axles sit in end cheeks. Back roller and back cheeks
// before the journal, the front roller after it.
function carrier(xc, part) {
  const out = [];
  const zb = ROLLER_Z - 120;
  if (part === "back") {
    out.push(S(k.slabOf(centred(xc, 0, 240, 260, 5), zb, 70, P, 3, 1.5), { tone: "mid" }));
    for (const dx of [-105, 105]) out.push(S(k.slabOf(centred(xc + dx, -ROLLER_Y, 30, 90, 3), zb + 70, 110, P, 2, 1), { tone: "mid" }));
    out.push(S(G.disc(-90, 90, ROLLER_R, axisX(-ROLLER_Y, ROLLER_Z, xc), P), { tone: "mid", inner: Ln([-60, 60].map((s) => G.arcOf(axisX(-ROLLER_Y, ROLLER_Z, xc), s, ROLLER_R, P)).join(""), { tone: "faint" }) }));
  } else {
    for (const dx of [-105]) out.push(S(k.slabOf(centred(xc + dx, ROLLER_Y, 30, 90, 3), zb + 70, 110, P, 2, 1), { tone: "mid" }));
    out.push(S(G.disc(-90, 90, ROLLER_R, axisX(ROLLER_Y, ROLLER_Z, xc), P), { tone: "mid", inner: Ln([-60, 60].map((s) => G.arcOf(axisX(ROLLER_Y, ROLLER_Z, xc), s, ROLLER_R, P)).join(""), { tone: "faint" }) }));
    out.push(S(k.slabOf(centred(xc + 105, ROLLER_Y, 30, 90, 3), zb + 70, 110, P, 2, 1), { tone: "mid" }));
    out.push(S(G.disc(-8, 0, 22, axisX(ROLLER_Y, ROLLER_Z, xc + 120 + 8), P), { tone: "mid" }));
    // Feeler arm off the carrier block: the gauge plunger rests under it.
    out.push(S(k.slabOf(plan(xc - 40 - 16, 128, 32, GAUGE.y - 10 + 16 - 128, 2), zb, 18, P, 2, 1), { tone: "mid" }));
  }
  return out.join("");
}
// Vibration pick-up on the side of the carrier block, with its cable down the column.
function pickup(xc) {
  const out = [];
  const zb = ROLLER_Z - 85;
  const F = G.frameAlong([xc + 60, 130, zb], [0, 1, 0]);
  out.push(S(G.disc(0, 40, 26, F, P), { tone: "mid" }));
  out.push(S(G.disc(40, 52, 16, F, P), { tone: "mid" }));
  return out.join("");
}
// Dial gauge on a bracket off the column face, its plunger under the carrier block: the needle swings with the support.
const GAUGE = { r: 58, y: 230 };
function gauge(xc) {
  const out = [];
  const c = [xc - 40, GAUGE.y, ROLLER_Z - 240];
  // Bracket from the column face.
  out.push(S(k.slabOf(plan(c[0] - 18, 150, 36, GAUGE.y - 150 - 20, 2), c[2] - 14, 28, P, 2, 1), { tone: "mid" }));
  const F = G.frameOf(c, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(-20, 0, GAUGE.r, F, P), { tone: "mid" }));
  // Plunger stem up to the carrier block underside.
  out.push(S(k.cylinder(c[0], c[1] - 10, 6, c[2] + GAUGE.r - 4, ROLLER_Z - 120 - (c[2] + GAUGE.r - 4), P, 12), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(c[0], c[1] - 10, 12, c[2] + GAUGE.r - 6, 22, P, 16), { tone: "mid" }));
  out.push(S(G.disc(0, 6, GAUGE.r, F, P), { tone: "hi" }));
  const face = (r, a) => at([c[0] + r * Math.sin(a), c[1] + 6, c[2] + r * Math.cos(a)]);
  const ring = Array.from({ length: 64 }, (_, i) => face(GAUGE.r - 8, (i / 64) * 2 * Math.PI));
  out.push(Ln(pathOf(ring), { tone: "lo" }));
  const minor = [], major = [];
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * 2 * Math.PI;
    (i % 5 ? minor : major).push(pathOf([face(GAUGE.r - 8, a), face(GAUGE.r - (i % 5 ? 14 : 19), a)], false));
  }
  out.push(Ln(minor.join(""), { tone: "lo" }) + Ln(major.join(""), { tone: "mid" }));
  out.push(`<path class="iso-line ss-needle" data-tone="hi" data-free="end" data-needle="${xc < 0 ? 0 : 1}" d="${pathOf([face(-8, 0), face(GAUGE.r - 16, 0)], false)}"/>`);
  out.push(D([face(0, 0)], { size: 1.3, tone: "hi" }));
  return { svg: out.join(""), centre: [c[0], c[1] + 6.5, c[2]] };
}

// ---------- the shaft
const SHAFT_STEPS = (side) => {
  // Profile from the end disc outward: hub, seal seat (hardened), journal, chamfered end.
  const s = side;
  return [
    { from: DISC.x1, to: DISC.x1 + 78, r: HUB_R, tone: "hi" },
    { from: DISC.x1 + 78, to: DISC.x1 + 170, r: SEAT_R, tone: "hi", seat: true },
    { from: DISC.x1 + 170, to: SUPPORT_X + 120, r: JOURNAL_R, tone: "hi" },
    { from: SUPPORT_X + 120, to: SUPPORT_X + 150, r: JOURNAL_R - 8, tone: "hi" },
  ].map((p) => ({ ...p, from: s * p.from, to: s * p.to }));
};
function shaftEnd(side) {
  const out = [];
  const F = axisX(0, Z, 0);
  const pieces = SHAFT_STEPS(side);
  for (const p of side > 0 ? pieces : pieces.slice().reverse()) {
    const [a, b] = p.from < p.to ? [p.from, p.to] : [p.to, p.from];
    const inner = p.seat ? Ln([a + 20, b - 20].map((s) => G.arcOf(F, s, p.r, P)).join(""), { tone: "faint" }) : "";
    out.push(S(G.disc(a, b, p.r, F, P), { tone: p.tone, crease: "lo", inner }));
  }
  return out.join("");
}
function disc(side) {
  const F = axisX(0, Z, 0);
  const [a, b] = side > 0 ? [DISC.x0, DISC.x1] : [-DISC.x1, -DISC.x0];
  return S(G.disc(a, b, DISC.r, F, P), { tone: "hi" }) + (side > 0 ? D(G.dotsOf(F, b, DISC.r - 22, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.55 }) : "");
}
function body() {
  const F = axisX(0, Z, 0);
  const seams = Ln([-BODY_X + 40, -120, 120, BODY_X - 40].map((s) => G.arcOf(F, s, BODY_R, P)).join(""), { tone: "faint" });
  return S(G.disc(-BODY_X, BODY_X, BODY_R, F, P), { tone: "hi", inner: seams });
}
// Blade templates, one per row, rebuilt by the page as the shaft turns; every blade is a <use> of its row's template.
function bladeBox(spec, angle, beta) {
  const er = [0, Math.cos(angle), Math.sin(angle)];
  const et = [0, -Math.sin(angle), Math.cos(angle)];
  const ew = G.add3(G.mul3([1, 0, 0], Math.cos(beta)), G.mul3(et, Math.sin(beta)));
  const en = G.cross3(er, ew);
  const rm = (spec.r0 + spec.r1) / 2;
  const off = spec.offset || 0;
  const centre = G.add3(G.add3([0, 0, Z], G.mul3(er, rm)), G.mul3(en, off));
  const hr = (spec.r1 - spec.r0) / 2, hw = spec.w / 2, ht = spec.t / 2;
  return G.prismOf(G.frameOf(centre, en, er, ew), [[-hr, -hw], [hr, -hw], [hr, hw], [-hr, hw]], -ht, ht, P);
}
function templates() {
  return ROWS.map((angle, j) => {
    const arm = S(bladeBox(BLADE, angle, BLADE.beta), { tone: "hi" });
    const over = S(bladeBox({ ...OVERLAY, offset: (BLADE.t + OVERLAY.t) / 2 }, angle, BLADE.beta), { tone: "mid" });
    return `<g id="ss-row${j}" data-row="${j}"><g data-part="arm">${arm}</g><g data-part="over">${over}</g><g class="iso-dots" data-tone="hi" data-bolts><circle r="0.55"/><circle r="0.55"/></g></g>`;
  }).join("");
}
function blades() {
  const ax = k.axisVector(P, [1, 0, 0]);
  const list = [];
  ROWS.forEach((angle, j) => XS.forEach((x) => list.push({ j, x, depth: G.dot3([x, Math.cos(angle) * 220, Z + Math.sin(angle) * 220], V) })));
  const back = list.filter((b) => G.dot3([0, Math.cos(ROWS[b.j]), Math.sin(ROWS[b.j])], V) < 0).sort((a, b) => a.depth - b.depth);
  const front = list.filter((b) => !back.includes(b)).sort((a, b) => a.depth - b.depth);
  const use = (b) => `<use href="#ss-row${b.j}" data-blade="${b.j}" data-x="${b.x}" transform="translate(${(b.x * ax[0]).toFixed(1)} ${(b.x * ax[1]).toFixed(1)})"/>`;
  return { back: back.map(use).join(""), front: front.map(use).join("") };
}

// ---------- drive: a flat belt from the drive pulley behind the bed over the shaft body in the gap between the blades
const DRIVE = { y: 0, z: 585, r: 70 };
const SCREEN = { x: [-100, 100], z: 520, r: 74, y: -320 };
function driveUnit() {
  // A drive column standing behind the bed: the measuring display on its front, the belt pulley in cheeks on top.
  const out = [];
  const box = plan(-260, -570, 520, 250, 6);
  const top = 640;
  out.push(S(k.slabOf(box, 0, top, P, 4, 2), { tone: "mid", inner: Ln(k.sideSeam(box, top - 40, P, 4), { tone: "faint" }) }));
  const y = SCREEN.y;
  const scr = [[-195, 425], [195, 425], [195, 610], [-195, 610]].map(([x, z]) => at([x, y, z]));
  out.push(`<path class="ss-screen" d="${pathOf(scr)}"/>`);
  out.push(Ln(pathOf(scr), { tone: "mid" }));
  for (const cx of SCREEN.x) {
    const ring = (r) => pathOf(Array.from({ length: 48 }, (_, i) => at([cx + r * Math.cos((i / 48) * 2 * Math.PI), y, SCREEN.z + r * Math.sin((i / 48) * 2 * Math.PI)])));
    out.push(Ln(ring(SCREEN.r) + ring(SCREEN.r * 0.5), { tone: "lo" }));
    out.push(Ln(pathOf([at([cx - SCREEN.r, y, SCREEN.z]), at([cx + SCREEN.r, y, SCREEN.z])], false) + pathOf([at([cx, y, SCREEN.z - SCREEN.r]), at([cx, y, SCREEN.z + SCREEN.r])], false), { tone: "faint" }));
  }
  out.push(`<path class="iso-line" data-tone="hi" data-vec data-free="end" d=""/>`);
  out.push(`<g class="iso-dots" data-tone="hi" data-vecdots><circle r="1.1"/><circle r="1.1"/></g>`);
  // Buttons under the display.
  out.push(D([-120, -80, -40].map((x) => at([x, y, 380])), { size: 1, tone: "mid" }));
  return out.join("");
}
// The belt drive head on the bed between the ways: a housing with the motor, cheeks and the pulley under the shaft.
function driveHead() {
  const out = [];
  const box = plan(-140, -125, 280, 250, 6);
  out.push(S(k.slabOf(box, BED_TOP, 110, P, 4, 2), { tone: "mid", inner: Ln(k.sideSeam(box, BED_TOP + 70, P, 4), { tone: "faint" }) }));
  out.push(D([[-115, -100], [115, -100], [-115, 100], [115, 100]].map(([x, y]) => at([x, y, BED_TOP + 110])), { size: 0.5 }));
  const top = BED_TOP + 110;
  out.push(S(k.slabOf(plan(-98, -40, 22, 80, 2), top, DRIVE.z - top + 30, P, 2, 1), { tone: "mid" }));
  const F = axisX(DRIVE.y, DRIVE.z, -62);
  out.push(S(G.disc(0, 124, DRIVE.r, F, P), { tone: "mid", inner: Ln([20, 104].map((s) => G.arcOf(F, s, DRIVE.r, P)).join(""), { tone: "faint" }) }));
  out.push(S(k.slabOf(plan(76, -40, 22, 80, 2), top, DRIVE.z - top + 30, P, 2, 1), { tone: "mid" }));
  out.push(S(G.disc(160, 176, 22, axisX(DRIVE.y, DRIVE.z, -62), P), { tone: "mid" }));
  return out.join("");
}
function beltLoop(x0, x1, centres, radii, t) {
  // Same construction as an open belt drive: wraps round the far side of each pulley, two tangent strands.
  const [[y1, z1], [y2, z2]] = centres, [r1, r2] = radii;
  const base = Math.atan2(z2 - z1, y2 - y1);
  const off = Math.acos((r1 - r2) / Math.hypot(y2 - y1, z2 - z1));
  const arc = ([cy, cz], r, a0, a1) => Array.from({ length: 41 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 40;
    return [cy + r * Math.cos(a), cz + r * Math.sin(a)];
  });
  const loopAt = (grow) => [...arc(centres[0], r1 + grow, base + off, base - off + 2 * Math.PI), ...arc(centres[1], r2 + grow, base - off, base + off)];
  const outer = loopAt(t), inner = loopAt(0);
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
  buckets[G.bandOf(G.dot3([1, 0, 0], LIGHT))].push(front);
  const start = seen.indexOf(false) + 1;
  const runs = [];
  let run = null;
  for (let j = 0; j < n; j++) {
    const i = (j + start) % n;
    if (seen[i]) { if (!run) runs.push((run = [])); run.push(i); } else run = null;
  }
  const outline = [pathOf(inner.map((p) => P3(x1, p)))], crease = [];
  for (const r of runs) {
    const pts = [...r, (r[r.length - 1] + 1) % n];
    outline.push(pathOf(pts.map((i) => P3(x0, outer[i])), false));
    crease.push(pathOf(pts.map((i) => P3(x1, outer[i])), false));
    outline.push(pathOf([P3(x0, outer[pts[0]]), P3(x1, outer[pts[0]])], false));
    outline.push(pathOf([P3(x0, outer[pts[pts.length - 1]]), P3(x1, outer[pts[pts.length - 1]])], false));
  }
  let hidden = [];
  for (let j = 0; j <= n; j++) {
    const i = (j + seen.indexOf(false)) % n;
    if (!seen[i]) hidden.push(i);
    if ((seen[i] || j === n) && hidden.length) { hidden.push((hidden[hidden.length - 1] + 1) % n); outline.push(pathOf(hidden.map((h) => P3(x1, outer[h])), false)); hidden = []; }
  }
  const paths = { fill: buckets.flat().join(""), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((l) => l.join("")) };
  return S(paths, { tone: "lo" }).replace('<path class="iso-fill"', '<path class="iso-fill" fill-rule="evenodd"');
}

// ---------- assemble
const G0 = gauge(-SUPPORT_X), G1 = gauge(SUPPORT_X);
const BL = blades();
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs>${templates()}</defs>`,
    driveUnit(),
    bed(),
    driveHead(),
    pedestal(-SUPPORT_X),
    pedestal(SUPPORT_X),
    `<g data-swing="0">${carrier(-SUPPORT_X, "back")}</g>`,
    `<g data-swing="1">${carrier(SUPPORT_X, "back")}</g>`,
    `<g data-shaft data-hit>`,
    shaftEnd(-1),
    `<g data-plane="0"><g data-weights="0" data-layer="back"></g>${disc(-1)}<g data-weights="0" data-layer="front"></g></g>`,
    `<g data-layer="back">${BL.back}</g>`,
    body(),
    beltLoop(-30, 30, [[0, Z], [DRIVE.y, DRIVE.z]], [BODY_R, DRIVE.r], 6),
    `<g data-layer="front">${BL.front}</g>`,
    `<g data-plane="1"><g data-weights="1" data-layer="back"></g>${disc(1)}<g data-weights="1" data-layer="front"></g></g>`,
    shaftEnd(1),
    `</g>`,
    `<g data-swing="0">${carrier(-SUPPORT_X, "front")}${pickup(-SUPPORT_X)}</g>`,
    `<g data-swing="1">${carrier(SUPPORT_X, "front")}${pickup(SUPPORT_X)}</g>`,
    G0.svg,
    G1.svg,
    frontFeet(),
  ],
});

const cam = k.cameraOf(P);
const DATA = {
  proj: { ox: P.origin[0], oy: P.origin[1], k: cam.k, sinA: cam.sinA, cosA: cam.cosA, sinE: cam.sinE, cosE: cam.cosE },
  view: V,
  light: LIGHT,
  bands: [0, 0.2, 0.42, 0.62],
  axis: Z,
  rows: ROWS,
  blade: BLADE,
  overlay: { ...OVERLAY, offset: (BLADE.t + OVERLAY.t) / 2 },
  disc: { r: DISC.r, x: [-DISC.x1, DISC.x1] },
  gauges: [G0.centre, G1.centre],
  gaugeR: GAUGE.r - 16,
  swing: k.axisVector(P, [0, 0.55, 0.85]),
  rps: 0.6,
  screen: SCREEN,
};

const CSS = figureCss(`
.ss-needle{stroke-width:1px}
.ss-screen{fill:var(--anatomy-shade-1);stroke:none}`);

const file = writeFigure({ id: ID, svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("k", cam.k.toFixed(4), "wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
