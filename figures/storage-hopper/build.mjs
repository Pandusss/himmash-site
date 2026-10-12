// Бункер-накопитель со шнековым дозатором: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x along the bin (drive at +x, discharge spout at -x), y across, z up.
// The bin sits on a welded frame; its V-shaped bottom ends in a U-trough with the dosing screw.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 600;

// ---------- the bin: 3.6 × 1.5 m box over a V bottom, about 8.5 m³ in all (spec: 5–10 m³)
const LX = 1800;                 // half length
const LY = 750;                  // half width
const BOX = [2150, 3250];        // straight walls
const AZ = 1350;                 // screw axis
const TR = 170;                  // trough outer radius (screw 300 mm)
const SHELL = 6;
const FLIGHT = 150;
const ROOT = 45;
const PITCH = 300;
const TROUGH = [-2250, LX];
const SPOUT = [-2200, -1960];
const BASE_TOP = 1100;           // flange joints of the posts on the base frame
const POST = 80;
const TUBE = 60;
const POSTS_X = [-LX, 0, LX];
const LOW = 2420, HIGH = 3020;   // level sensors

const P = k.fitProjection(
  [
    ...k.boxCorners({ x: -LX - 60, y: -LY - 60, w: 2 * LX + 120, d: 2 * LY + 120, r: 0 }, 0, BOX[1] + 160),
    ...k.boxCorners({ x: -2350, y: -300, w: 300, d: 600, r: 0 }, 0, 1500),
    [2330, 420, 2980], [2050, 0, 2000],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 46 },
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
const FX = (y = 0, z = AZ) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const ax = (x, r, th) => [x, r * Math.cos(th), AZ + r * Math.sin(th)];
const box = (x0, x1, y0, y1, z0, z1, tone = "mid", bevel = 0, inner = "") => S(k.slabOf(plan(x0, y0, x1 - x0, y1 - y0, Math.min(3, (x1 - x0) / 4, (y1 - y0) / 4)), z0, z1 - z0, P, 2, bevel), { tone, inner });

// A square tube between two points (diagonal braces).
function bar(a, b, w = 50, tone = "mid") {
  const d = G.sub3(b, a);
  const len = G.len3(d);
  const axis = G.unit3(d);
  let u = G.cross3(axis, [0, 0, 1]);
  if (G.len3(u) < 1e-6) u = [1, 0, 0];
  u = G.unit3(u);
  const v = G.cross3(axis, u);
  const F = G.frameOf(a, axis, u, v);
  const h = w / 2;
  return S(G.prismOf(F, [[-h, -h], [h, -h], [h, h], [-h, h]], 0, len, P), { tone, crease: "none" });
}

// ---------- frame
function foot(x, y) {
  const out = [];
  const plate = centred(x, y, 220, 220, 4);
  out.push(S(k.slabOf(plate, 0, 14, P, 2, 1), { tone: "lo" }));
  out.push(D(k.corners(plate, 26).map(([px, py]) => at([px, py, 14])), { size: 0.45 }));
  // Gussets on the two faces we see.
  const gusset = (dx, dy) => {
    const F = dx ? G.frameOf([x + dx * (POST / 2), y, 14], [0, 1, 0], [dx, 0, 0], [0, 0, 1]) : G.frameOf([x, y + dy * (POST / 2), 14], [1, 0, 0], [0, dy, 0], [0, 0, 1]);
    return S(G.prismOf(F, [[0, 0], [60, 0], [0, 150]], -5, 5, P), { tone: "mid", crease: "none" });
  };
  out.push(gusset(-1, 0), gusset(0, -1));
  return out.join("");
}
function footFront(x, y) {
  const F1 = G.frameOf([x + POST / 2, y, 14], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const F2 = G.frameOf([x, y + POST / 2, 14], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return [F1, F2].map((F) => S(G.prismOf(F, [[0, 0], [60, 0], [0, 150]], -5, 5, P), { tone: "mid", crease: "none" })).join("");
}
const post = (x, y) => S(k.slabOf(centred(x, y, POST, POST, 3), 14, BOX[1] - 14, P, 2), { tone: "mid", crease: "none", inner: L(k.sideSeam(centred(x, y, POST, POST, 3), BASE_TOP, P, 2), { tone: "lo" }) });
// Bolted flange joint where the bin legs meet the base frame.
function joint(x, y) {
  const plate = centred(x, y, 150, 150, 3);
  return S(k.slabOf(plate, BASE_TOP - 12, 24, P, 2, 0.8), { tone: "mid", inner: L(k.sideSeam(plate, BASE_TOP, P, 2), { tone: "faint" }) }) +
    D(k.corners(plate, 16).map(([px, py]) => at([px, py, BASE_TOP + 12])), { size: 0.5, tone: "hi" });
}
const railX = (x0, x1, y, z, h = TUBE) => box(x0, x1, y - h / 2, y + h / 2, z - h, z);
const railY = (x, y0, y1, z, h = TUBE) => box(x - h / 2, x + h / 2, y0, y1, z - h, z);

// One long side of the frame (the base truss and the braces under the bin).
function side(y) {
  const out = [];
  const xs = [-LX, -900, 0, 900, LX];
  // Base truss diagonals, then chords and verticals.
  for (let i = 0; i < 4; i++) {
    const [x0, x1] = [xs[i], xs[i + 1]];
    const up = i % 2 === 0;
    out.push(bar([up ? x0 + 40 : x0 + 30, y, up ? 200 : BASE_TOP - 90], [up ? x1 - 30 : x1 - 40, y, up ? BASE_TOP - 90 : 200], 44));
  }
  // V braces from the base to the bin bottom.
  for (const [x0, xm, x1] of [[-LX, -900, 0], [0, 900, LX]]) {
    out.push(bar([x0 + (x0 ? 40 : 40), y, BASE_TOP + 40], [xm - 30, y, BOX[0] - 70], 44));
    out.push(bar([xm + 30, y, BOX[0] - 70], [x1 - 40, y, BASE_TOP + 40], 44));
  }
  for (let i = 0; i < 4; i++) {
    out.push(railX(xs[i] + (i ? 30 : 40), xs[i + 1] - (i < 3 ? 30 : 40), y, 200));
    out.push(railX(xs[i] + (i ? 30 : 40), xs[i + 1] - (i < 3 ? 30 : 40), y, BASE_TOP - 30));
  }
  for (const x of [-900, 900]) out.push(box(x - 30, x + 30, y - 30, y + 30, 200, BASE_TOP - 90));
  out.push(railX(-LX + 40, LX - 40, y, BOX[0]));
  return out.join("");
}
function endFrame(x) {
  const out = [];
  out.push(railY(x, -LY + 40, LY - 40, 200));
  out.push(railY(x, -LY + 40, LY - 40, BASE_TOP - 30));
  out.push(railY(x, -LY + 40, LY - 40, BOX[0]));
  // Trough support on the end cross member.
  if (x > 0) out.push(box(x - 30, x + 30, -60, 60, BASE_TOP - 30, AZ - TR + 4));
  return out.join("");
}

// ---------- V bottom and trough
const vY = (z) => TR + ((LY - SHELL - TR) * (z - AZ)) / (BOX[0] - AZ);
const WIN = { x0: -1640, x1: 1640, z1: 2040, th: deg(-62) };
function vWall(x0, x1, z0, z1) {
  // Front sloped wall between z0 and z1, outer face.
  const n = G.unit3([0, BOX[0] - AZ, -(LY - SHELL - TR)]);
  const a = [x0, vY(z0), z0], b = [x1, vY(z0), z0], c = [x1, vY(z1), z1], d = [x0, vY(z1), z1];
  const centre = G.mul3(G.add3(G.add3(a, b), G.add3(c, d)), 0.25);
  const u = [1, 0, 0];
  const v = G.cross3(n, u);
  const F = G.frameOf(centre, n, u, v);
  const poly = [a, b, c, d].map((p) => { const q = G.sub3(p, centre); return [G.dot3(q, u), G.dot3(q, v)]; });
  return S(G.prismOf(F, poly, -SHELL, 0, P), { tone: "mid", crease: "none" });
}
function vEnd() {
  // +x end wall of the V bottom, then the round end plate of the trough.
  const F = G.frameOf([LX, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const poly = [[-TR, AZ], [TR, AZ], [LY - SHELL, BOX[0]], [-(LY - SHELL), BOX[0]]];
  return S(G.prismOf(F, poly, -SHELL, 0, P), { tone: "mid", crease: "none" });
}
function windowRings(inset) {
  const ring = [];
  const R = TR - inset;
  const { x0, x1, th, z1 } = WIN;
  ring.push(ax(x0, R, th), ax(x1, R, th));
  for (let i = 1; i <= 12; i++) ring.push(ax(x1, R, th - (th * i) / 12));
  ring.push([x1, vY(z1) - inset, z1], [x0, vY(z1) - inset, z1]);
  for (let i = 0; i <= 12; i++) ring.push(ax(x0, R, (th * i) / 12));
  return ring;
}
const OUTER = windowRings(0).map(at);
const INNER = windowRings(SHELL).map(at);

function trough() {
  const out = [];
  const F = FX();
  out.push(S(disc(TROUGH[0] - 20, TROUGH[0], TR + 30, F), { tone: "mid" }));
  out.push(S(disc(TROUGH[0], TROUGH[1], TR, F), { tone: "mid", crease: "none", inner: L([-1200, -600, 0, 600, 1200].map((s) => G.arcOf(F, s, TR, P, { from: deg(-90), to: deg(0) })).join(""), { tone: "faint" }) }));
  // Lid over the discharge extension, and the spout below it.
  out.push(box(TROUGH[0], -LX, -TR - 5, TR + 5, AZ, AZ + TR + 12, "mid", 1));
  out.push(D([-2200, -2050, -1900].map((x) => at([x, TR + 5, AZ + TR + 12])), { size: 0.45 }));
  return out.join("");
}
function spout() {
  const out = [];
  const sp = plan(SPOUT[0], -110, SPOUT[1] - SPOUT[0], 220, 3);
  out.push(S(k.slabOf(sp, 900, AZ - 100 - 900, P, 2), { tone: "mid", inner: L(k.sideSeam(sp, 1020, P, 2), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(sp, -22), 880, 20, P, 2, 0.8), { tone: "mid" }));
  out.push(D(k.corners(k.insetPlan(sp, -22), 10).map(([x, y]) => at([x, y, 900])), { size: 0.45 }));
  return out.join("");
}
function troughEnd() {
  const out = [];
  const F = FX();
  out.push(S(disc(LX, LX + 20, TR + 60, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, LX + 20, TR + 40, 10, P, { all: true, phase: Math.PI / 10 }), { size: 0.5, tone: "mid" }));
  return out.join("");
}

// The window into the trough: cut sheet, material, screw.
function troughWindow() {
  const out = [];
  out.push(`<path class="sh-cut" d="${pathOf(OUTER)}"/><path class="sh-pack" d="${pathOf(INNER)}"/>`);
  out.push(`<g clip-path="url(#sh-win)">`);
  out.push(`<g data-sh="screw" data-hit>`);
  for (let i = 0; i < 16; i++) out.push(`<path class="sh-fb" data-sh="back" d=""/><path class="sh-be" data-sh="back-edge" d=""/>`);
  out.push(`</g><g data-hit>${S(disc(TROUGH[0], TROUGH[1], ROOT, FX()), { tone: "hi", crease: "none" })}</g>`);
  out.push(`<path class="sh-flake" data-sh="flakes" d=""/><g data-sh="screw" data-hit>`);
  for (let i = 0; i < 16; i++) out.push(`<path class="sh-ff" data-sh="front" d=""/><path class="sh-fe" data-sh="front-edge" d=""/>`);
  out.push(`</g></g>`);
  out.push(L(pathOf(INNER), { tone: "lo" }) + L(pathOf(OUTER), { tone: "mid" }));
  return out.join("");
}

// ---------- drive: worm gearbox on the trough end plate with the motor standing on it
function drive() {
  const out = [];
  const gb = plan(LX + 20, -120, 190, 240, 14);
  out.push(S(k.slabOf(gb, AZ - 120, 250, P, 4, 1.2), { tone: "mid", inner: L(k.sideSeam(gb, AZ + 40, P, 4), { tone: "faint" }) }));
  const Fx = FX();
  out.push(S(disc(LX + 210, LX + 232, 70, Fx), { tone: "mid" }));
  out.push(D(G.dotsOf(Fx, LX + 232, 54, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.5, tone: "mid" }));
  out.push(S(disc(LX + 232, LX + 246, 30, Fx), { tone: "hi" }));
  // Torque arm down to the end cross member.
  out.push(box(LX - 30, LX + 110, -40, 40, BASE_TOP - 30, BASE_TOP - 18, "mid", 0.6));
  out.push(box(LX + 70, LX + 110, -18, 18, BASE_TOP - 18, AZ - 120));
  const mx = LX + 115, my = 0;
  out.push(S(k.cylinder(mx, my, 92, AZ + 130, 30, P, 32, 1), { tone: "mid" }));
  out.push(D([0, 1, 2, 3].map((i) => at([mx + 78 * Math.cos(i * Math.PI / 2 + 0.78), my + 78 * Math.sin(i * Math.PI / 2 + 0.78), AZ + 160])), { size: 0.5, tone: "hi" }));
  out.push(S(k.cylinder(mx, my, 100, AZ + 160, 310, P, 36), { tone: "mid", crease: "none", inner: L(k.sideArc(mx, my, 100, AZ + 180, P, 32) + k.sideArc(mx, my, 100, AZ + 450, P, 32), { tone: "faint" }) }));
  out.push(L(k.knurl(mx, my, 100, AZ + 180, AZ + 450, 30, P, 0.6), { tone: "lo" }));
  out.push(S(k.cylinder(mx, my, 104, AZ + 470, 16, P, 36), { tone: "mid" }));
  out.push(S(k.cylinder(mx, my, 94, AZ + 486, 64, P, 36, 1.2), { tone: "mid", inner: L(k.sideArc(mx, my, 94, AZ + 516, P, 32), { tone: "faint" }) }));
  out.push(L(k.ring(mx, my, 70, AZ + 550, P, 32) + k.ring(mx, my, 44, AZ + 550, P, 28), { tone: "lo" }));
  // Terminal box on the side of the motor.
  const tb = plan(mx - 50, my + 92, 100, 50, 4);
  out.push(S(k.slabOf(tb, AZ + 300, 110, P, 2, 0.8), { tone: "mid" }));
  out.push(D([[mx - 38, my + 142, AZ + 400], [mx + 38, my + 142, AZ + 400], [mx - 38, my + 142, AZ + 310], [mx + 38, my + 142, AZ + 310]].map(at), { size: 0.4 }));
  return out.join("");
}

// ---------- bin box
const MAT_Y = LY - SHELL - 2;
function matFront() {
  // The section of the material behind the front wall (updated live) with a flake texture.
  const flakes = [];
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 150; i++) {
    const p = at([-LX + rnd() * 2 * LX, MAT_Y, BOX[0] + rnd() * (HIGH + 120 - BOX[0])]);
    const s = 1 + rnd() * 1.3, a = rnd() * Math.PI;
    flakes.push(pathOf([0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.5 : 0); const r = s * (j % 2 ? 0.55 : 1); return [p[0] + r * Math.cos(t), p[1] + r * Math.sin(t) * 0.7]; })));
  }
  return `<clipPath id="sh-matclip"><path data-sh="mat-clip" d=""/></clipPath><path class="sh-mat" data-sh="mat-front" d=""/><g clip-path="url(#sh-matclip)"><path class="sh-flake sh-still" d="${flakes.join("")}"/></g>`;
}
function matTop() {
  const flakes = [];
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const p = at([-LX + 20 + rnd() * (2 * LX - 40), -LY + 20 + rnd() * (2 * LY - 40), 0]);
    const s = 1 + rnd() * 1.3, a = rnd() * Math.PI;
    flakes.push(pathOf([0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.5 : 0); const r = s * (j % 2 ? 0.55 : 1); return [p[0] + r * Math.cos(t), p[1] + r * Math.sin(t) * 0.5]; })));
  }
  const ring = [[-LX + SHELL, -LY + SHELL], [LX - SHELL, -LY + SHELL], [LX - SHELL, LY - SHELL], [-LX + SHELL, LY - SHELL]].map(([x, y]) => at([x, y, 0]));
  return `<g data-sh="mat-top"><path class="sh-heap" d="${pathOf(ring)}"/><path class="sh-flake sh-still" d="${flakes.join("")}"/></g><path class="sh-flake" data-sh="stream" d=""/>`;
}
function panel(x0, x1, tone = "lo") {
  return S(k.slabOf(plan(x0, LY - SHELL - 8, x1 - x0, 8, 1), BOX[0], BOX[1] - BOX[0], P, 2), { tone, crease: "none" });
}
// Bay 2 carries a window like the photo; its glass shows the material inside.
const WINDOW = { x0: -700, x1: -260, z0: 2380, z1: 3080 };
function windowBay() {
  const out = [];
  const y = LY - 8;
  const { x0, x1, z0, z1 } = WINDOW;
  // Panel around the opening: four plates.
  out.push(S(k.slabOf(plan(-900 + 30, y - 6, x0 - (-900 + 30), 8, 1), BOX[0], BOX[1] - BOX[0], P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan(x1, y - 6, -30 - x1, 8, 1), BOX[0], BOX[1] - BOX[0], P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan(x0, y - 6, x1 - x0, 8, 1), BOX[0], z0 - BOX[0], P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(plan(x0, y - 6, x1 - x0, 8, 1), z1, BOX[1] - z1, P, 2), { tone: "lo", crease: "none" }));
  // Glass over the material, then the frame and sash with a handle.
  const glass = [[x0 + 40, z0 + 40], [x1 - 40, z0 + 40], [x1 - 40, z1 - 40], [x0 + 40, z1 - 40]].map(([x, z]) => at([x, y + 2, z]));
  out.push(`<path class="sh-glass" d="${pathOf(glass)}"/>`);
  out.push(`<clipPath id="sh-glassclip"><path d="${pathOf(glass)}"/></clipPath><g clip-path="url(#sh-glassclip)">${L(k.segment([x0, y + 2, z0 + 260], [x1, y + 2, z0 + 660], P) + k.segment([x0, y + 2, z0 + 120], [x1, y + 2, z0 + 380], P), { tone: "faint" })}</g>`);
  const fr = (a0, a1, b0, b1) => S(k.slabOf(plan(a0, y - 6, a1 - a0, 34, 1), b0, b1 - b0, P, 2), { tone: "hi", crease: "faint" });
  out.push(fr(x0, x1, z0, z0 + 40), fr(x0, x0 + 40, z0 + 40, z1 - 40), fr(x1 - 40, x1, z0 + 40, z1 - 40), fr(x0, x1, z1 - 40, z1));
  out.push(S(k.slabOf(plan(x0 + 6, y + 28, 22, 14, 2), (z0 + z1) / 2 - 30, 60, P, 2), { tone: "mid" }));
  out.push(L([0, 1, 2, 3].map((i) => k.ring(x0 + 20 + i * ((x1 - x0 - 40) / 3), y + 28, 4, z0, P, 8)).join(""), { tone: "faint" }));
  return out.join("");
}
function endWall() {
  const out = [];
  out.push(S(k.slabOf(plan(LX - 8, -LY + 40, 8, 2 * LY - 80, 1), BOX[0], BOX[1] - BOX[0], P, 2), { tone: "lo", crease: "none" }));
  out.push(L(k.segment([LX, -80, BOX[0]], [LX, -80, BOX[1]], P), { tone: "faint" }));
  // Rotary paddle level switches, high and low.
  for (const z of [LOW, HIGH]) {
    const F = G.frameOf([LX, 300, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(disc(0, 16, 62, F), { tone: "mid" }));
    out.push(D(G.dotsOf(F, 16, 50, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.45, tone: "mid" }));
    out.push(`<g data-sh="${z === LOW ? "low" : "high"}">${S(disc(16, 96, 48, F), { tone: "hi", inner: L(G.arcOf(F, 70, 48, P), { tone: "faint" }) })}${S(disc(96, 104, 40, F), { tone: "hi" })}</g>`);
    const Fg = G.frameOf([LX + 56, 300 + 48, z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(disc(0, 14, 13, Fg, { steps: 6 }), { tone: "mid" }));
    out.push(S(disc(14, 22, 9, Fg), { tone: "mid" }));
  }
  // Inlet of the pneumatic conveying line near the top.
  const Fi = G.frameOf([0, 420, 2980], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(disc(LX, LX + 18, 130, Fi), { tone: "mid" }));
  out.push(D(G.dotsOf(Fi, LX + 18, 112, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.45, tone: "mid" }));
  out.push(S(disc(LX + 18, 2280, 70, Fi), { tone: "hi", crease: "none", inner: L(G.arcOf(Fi, 2100, 70, P), { tone: "faint" }) }));
  out.push(S(disc(2280, 2330, 84, Fi), { tone: "mid" }));
  out.push(`<path class="sh-bore" d="${G.circleOf(Fi, 2330, 70, P)}"/>`);
  out.push(L(G.circleOf(Fi, 2330, 70, P), { tone: "mid" }));
  return out.join("");
}
// Inside of the back wall, seen through the opened corner of the bin.
function backInside() {
  const y = -LY + SHELL;
  const face = [[0, BOX[0]], [LX - SHELL, BOX[0]], [LX - SHELL, BOX[1]], [0, BOX[1]]].map(([x, z]) => at([x, y, z]));
  return `<path class="sh-inner" d="${pathOf(face)}"/>` + L(k.segment([450, y, BOX[0]], [450, y, BOX[1]], P) + k.segment([1350, y, BOX[0]], [1350, y, BOX[1]], P), { tone: "faint" });
}
function inletInside() {
  const Fi = G.frameOf([0, 420, 2980], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  return S(disc(LX - 160, LX - SHELL, 70, Fi), { tone: "hi", crease: "none" });
}
function roof() {
  const out = [];
  const r = plan(-LX, -LY, LX, 2 * LY, 2);
  out.push(S(k.slabOf(r, BOX[1] - 10, 10, P, 2), { tone: "lo" }));
  // Air vent with a hood: conveying air leaves here into the shop.
  const vent = centred(-1400, -250, 300, 300, 6);
  out.push(S(k.slabOf(vent, BOX[1], 160, P, 3, 1), { tone: "mid", inner: L(k.sideSeam(vent, BOX[1] + 40, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(vent, -50), BOX[1] + 160, 22, P, 3, 1), { tone: "mid" }));
  out.push(L([BOX[1] + 70, BOX[1] + 100, BOX[1] + 130].map((z) => k.sideSeam(vent, z, P, 3)).join(""), { tone: "lo" }));
  // Inspection hatch.
  const hatch = centred(-650, 150, 500, 500, 10);
  out.push(S(k.slabOf(hatch, BOX[1], 16, P, 3, 1), { tone: "mid" }));
  out.push(D(k.corners(hatch, 24).map(([x, y]) => at([x, y, BOX[1] + 16])), { size: 0.45 }));
  out.push(S(k.slabOf(plan(-750, 300, 200, 30, 6), BOX[1] + 16, 26, P, 2), { tone: "mid" }));
  out.push(railY(0, -LY + 30, LY - 30, BOX[1]));
  return out.join("");
}
function topRails(far) {
  const z = BOX[1];
  return far ? [railX(-LX, LX, -LY, z), railY(-LX, -LY, LY, z)].join("") : [railY(LX, -LY, LY, z), railX(-LX, LX, LY, z)].join("");
}

// ---------- control cabinet (inverter, "с пульта") on the near post
function cabinet() {
  const out = [];
  const cb = plan(LX + 40, LY - 260, 140, 300, 6);
  out.push(box(LX + 40, LX + 80, LY - 60, LY - 20, 1250, 1290));
  out.push(box(LX + 40, LX + 80, LY - 60, LY - 20, 1610, 1650));
  out.push(S(k.slabOf(cb, 1200, 500, P, 3, 1.2), { tone: "mid", inner: L(k.sideSeam(cb, 1240, P, 3), { tone: "faint" }) }));
  const F = G.frameOf([LX + 180, LY - 110, 1450], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const scr = [[-80, 300], [80, 300], [80, 370], [-80, 370]].map(([y, z]) => at([LX + 181, LY - 110 + y, 1200 + z]));
  out.push(`<path class="sh-screen" d="${pathOf(scr)}"/>`);
  out.push(L(pathOf(scr), { tone: "mid" }));
  out.push(`<path class="sh-bar" data-sh="hz" d=""/>`);
  for (const [dy, dz, tone] of [[-50, -60, "hi"], [0, -60, "mid"], [50, -60, "mid"]]) {
    const Fb = G.frameOf([LX + 180, LY - 110 + dy, 1450 + dz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(disc(0, 14, 16, Fb), { tone }));
  }
  out.push(L(k.segment([LX + 180, LY - 250, 1200], [LX + 180, LY - 250, 1700], P), { tone: "faint" }));
  out.push(D([at([LX + 180, LY - 236, 1300]), at([LX + 180, LY - 236, 1600])], { size: 0.45 }));
  return out.join("");
}

// ---------- receiving funnel of the next machine under the spout (drawn simply)
function funnel() {
  const out = [];
  const cx = (SPOUT[0] + SPOUT[1]) / 2;
  const top = 760, bot = 470;
  const legs = [[-190, -190], [190, -190], [-190, 190], [190, 190]];
  out.push(`<path class="iso-halo" d="${k.haloOf(centred(cx, 0, 420, 420, 8), 0, 30, P)}"/>`);
  const corner = (sx, sy, z) => { const t = (z - bot) / (top - bot); const h = 70 + (220 - 70) * t; return [cx + sx * h, sy * h, z]; };
  const wall = (sx, sy) => {
    const c = sx ? [corner(sx, -1, bot), corner(sx, 1, bot), corner(sx, 1, top), corner(sx, -1, top)] : [corner(-1, sy, bot), corner(1, sy, bot), corner(1, sy, top), corner(-1, sy, top)];
    const centre = c.reduce((a, p) => G.add3(a, G.mul3(p, 0.25)), [0, 0, 0]);
    const u = G.unit3(G.sub3(c[1], c[0]));
    let n = G.unit3(G.cross3(u, G.sub3(c[3], c[0])));
    if (G.dot3(n, sx ? [sx, 0, 0] : [0, sy, 0]) < 0) n = G.mul3(n, -1);
    const v = G.cross3(n, u);
    const poly = c.map((p) => { const q = G.sub3(p, centre); return [G.dot3(q, u), G.dot3(q, v)]; });
    return S(G.prismOf(G.frameOf(centre, n, u, v), poly, -4, 0, P), { tone: "mid", crease: "none" });
  };
  for (const [dx, dy] of legs.slice(0, 2)) out.push(S(k.slabOf(centred(cx + dx, dy, 40, 40, 2), 0, top - 60, P, 2), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(centred(cx, 0, 150, 150, 3), 400, bot - 400, P, 2), { tone: "lo" }));
  out.push(wall(0, -1), wall(-1, 0));
  out.push(`<path class="sh-pack" d="${pathOf([corner(-1, -1, top), corner(1, -1, top), corner(1, 1, top), corner(-1, 1, top)].map(at))}"/>`);
  out.push(`<path class="sh-flake" data-sh="drop" d=""/>`);
  out.push(wall(1, 0), wall(0, 1));
  for (const [dx, dy] of legs.slice(2)) out.push(S(k.slabOf(centred(cx + dx, dy, 40, 40, 2), 0, top - 60, P, 2), { tone: "lo", crease: "none" }));
  return out.join("");
}

// ---------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs><clipPath id="sh-win"><path d="${pathOf(INNER)}"/></clipPath></defs>`,
    `<path class="iso-halo" d="${k.haloOf(plan(-LX - 110, -LY - 110, 2 * LX + 220, 2 * LY + 220, 10), 0, 60, P)}"/>`,
    backInside(),
    ...POSTS_X.map((x) => foot(x, -LY)),
    ...POSTS_X.map((x) => post(x, -LY)),
    ...POSTS_X.map((x) => joint(x, -LY)),
    side(-LY),
    box(900 - 30, 900 + 30, -LY - 30, -LY + 30, BOX[0], BOX[1] - TUBE),
    topRails(true),
    inletInside(),
    funnel(),
    endFrame(-LX),
    spout(),
    trough(),
    troughWindow(),
    vWall(-LX + SHELL, WIN.x0, AZ, WIN.z1),
    vWall(WIN.x1, LX - SHELL, AZ, WIN.z1),
    vWall(-LX + SHELL, LX - SHELL, WIN.z1, BOX[0]),
    endFrame(0),
    vEnd(),
    endFrame(LX),
    troughEnd(),
    `<g data-sh="drive" data-hit>${drive()}</g>`,
    matTop(),
    matFront(),
    panel(-LX + 40, -930),
    windowBay(),
    endWall(),
    roof(),
    topRails(false),
    side(LY),
    ...POSTS_X.map((x) => footFront(x, LY)),
    ...POSTS_X.map((x) => post(x, LY)),
    ...POSTS_X.map((x) => joint(x, LY)),
    ...[-900, 900].map((x) => box(x - 30, x + 30, LY - 30, LY + 30, BOX[0], BOX[1] - TUBE)),
    `<g data-sh="panel" data-hit>${cabinet()}</g>`,
  ],
});

// Screw table: constant pitch and flight.
function screwTable() {
  const xs = [], ts = [];
  const dt = (2 * Math.PI) / 32;
  for (let t = 0, x = LX - 20; x > TROUGH[0] + 60; t += dt, x -= (PITCH * dt) / (2 * Math.PI)) { xs.push(Math.round(x * 10) / 10); ts.push(Math.round(t * 1000) / 1000); }
  return { x: xs, t: ts };
}
const round = (v) => Math.round(v * 10000) / 10000;
const proj = { o: at([0, 0, 0]), ex: k.axisVector(P, [1, 0, 0]), ey: k.axisVector(P, [0, 1, 0]), ez: k.axisVector(P, [0, 0, 1]) };
const DATA = {
  proj: Object.fromEntries(Object.entries(proj).map(([key, v]) => [key, v.map(round)])),
  az: AZ, view: Math.round(Math.atan2(V[2], V[1]) * 1000) / 1000,
  screw: screwTable(), flight: FLIGHT, root: ROOT, pitch: PITCH,
  win: [WIN.x0, WIN.x1], trough: TROUGH,
  box: { lx: LX - SHELL, ly: MAT_Y, z0: BOX[0], z1: BOX[1] },
  low: LOW, high: HIGH,
  // Volume below the straight walls (V bottom and trough) and the box section, for the level in %.
  vBottom: Math.round((((2 * TR + 2 * (LY - SHELL)) / 2) * (BOX[0] - AZ) * 2 * LX + ((Math.PI * TR * TR) / 2) * 2 * LX) / 1e7) / 100,
  inlet: { x: 2330, y: 420, z: 2980, mouth: LX - 170 },
  spout: { x: SPOUT, z: 880, to: 760 },
  hz: { x: LX + 182, y0: LY - 110 - 68, w: 136, z0: 1200 + 312, z1: 1200 + 358 },
};

const CSS = figureCss(`
.sh-cut{fill:var(--anatomy-top);stroke:none}
.sh-inner{fill:var(--sh-inner);stroke:none}
.sh-pack{fill:var(--sh-pack);stroke:none}
.sh-mat{fill:var(--sh-mat);stroke:var(--anatomy-mid);stroke-width:.5}
.sh-heap{fill:var(--sh-heap);stroke:var(--anatomy-mid);stroke-width:.5}
.sh-flake{fill:var(--sh-flake);stroke:none}
.sh-still{opacity:.7}
.sh-bore{fill:var(--sh-pack);stroke:none}
.sh-glass{fill:var(--sh-glass);stroke:none}
.sh-screen{fill:var(--sh-screen);stroke:none}
.sh-bar{fill:var(--anatomy-lit);stroke:none}
.sh-fb{fill:var(--anatomy-shade-0);stroke:var(--anatomy-shade-0);stroke-width:.4;stroke-linejoin:round}
.sh-ff{fill:var(--anatomy-top);stroke:var(--anatomy-top);stroke-width:.4;stroke-linejoin:round}
.sh-be,.sh-fe{fill:none;stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-linejoin:round;stroke-linecap:round}
.sh-fe{stroke:var(--anatomy-hi)}
.${SVG_CLASS} [data-on] .sh-ff{fill:var(--anatomy-lit-top);stroke:var(--anatomy-lit-top)}
.${SVG_CLASS} [data-on] .sh-fb{fill:var(--anatomy-lit-shade);stroke:var(--anatomy-lit-shade)}
.${SVG_CLASS} [data-on] .sh-fe,.${SVG_CLASS} [data-on] .sh-be{stroke:var(--anatomy-lit)}`, {
  light: "--sh-pack:#c3cbc2;--sh-mat:#d2d9d0;--sh-heap:#f1f4ef;--sh-inner:#e2e7df;--sh-flake:#5d6a61;--sh-glass:rgba(150,170,160,.28);--sh-screen:#2a3530",
  dark: "--sh-pack:#0c120e;--sh-mat:#141c17;--sh-heap:#2b3730;--sh-inner:#111814;--sh-flake:#a9b8ad;--sh-glass:rgba(140,170,155,.14);--sh-screen:#0a0f0c",
});

const file = writeFigure({ id: "storage-hopper", svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "storage-hopper", file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
