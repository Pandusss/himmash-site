// Вакуумная дегазация расплава: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x along the extruder barrel (melt flows to +x), y across, z up.
// The barrel and the vacuum chamber over its vent are cut in half along the axis (front half removed) to show
// the screw, the melt and the vapour leaving it; the line runs through a ball valve and a tee with the vacuum
// gauge to the condensate tank and the vacuum pump with its motor on a common base.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "vacuum-degassing";
const WIDTH = 520;
const HEIGHT = 500;
const DEG = Math.PI / 180;

// ---------- dimensions (mm)
const AXZ = 340;                                     // barrel axis height above the extruder frame
const BAR = { r: 82, bore: 55, x0: -420, x1: 230 };
const HEAT = { r0: 84, r1: 100 };                     // band heaters under the shrouds
const SHROUD = { r0: 114, r1: 118 };
const CUT = { x0: -350, x1: 110 };                   // the half-section along the axis
const SEGMENTS = [[-415, -355], [-350, -224], [-36, 106], [114, 226]];   // heater shrouds
const VENT = { x0: -220, x1: -40, y: 86, z0: 418, z1: 444, open: [-195, -65], openY: 55 };
const CH = { cx: -130, z0: 454, z1: 628, bot: [115, 70], top: [200, 130], t: 4 };   // chamber: half-length, half-width
const LID = { x0: -350, x1: 90, y: 150, z0: 628, z1: 642 };
const SCREW = { root: 34, flight: 54, pitch: 110, t: 12 };
const POOL = { h: 13, share: 0.62 };                  // melt pool ahead of each flight above the root (starved channel)
const PORT = { y: -60, z: 552 };
const TEE = { x: 155 };
const GAUGE = { x: 155, y0: -78, y1: -46, z: 724, r: 52 };
const TANK = { x: 300, y: -262, r: 140, z0: 96, z1: 470, shell: [134, 430] };   // about 25 L; up to 50 L by spec
const PUMP = { y: -262, z: 548, x0: 214, x1: 316, r: 60 };   // vacuum pump on the tank top
const MOTOR = { x0: 330, x1: 436, r: 56, fan: 22 };
const HOSE_R = 18;                                   // steel-reinforced hose, 1–2 inch by spec
const NOZZLE = 135 * DEG;                            // hose nozzle on the tank, facing the barrel

const P = k.fitProjection(
  [[-470, 130, AXZ + 130], [-470, 130, 0], [-470, -130, AXZ + 130], [264, 80, 0], [264, -130, AXZ + 130], [GAUGE.x, GAUGE.y1, GAUGE.z + GAUGE.r + 6], [LID.x0, -LID.y, LID.z1],
    ...Array.from({ length: 24 }, (_, i) => [TANK.x + TANK.r * Math.cos(i * 15 * DEG), TANK.y + TANK.r * Math.sin(i * 15 * DEG), 0]), [MOTOR.x1 + MOTOR.fan, PUMP.y + MOTOR.r, PUMP.z], [MOTOR.x1 + MOTOR.fan, PUMP.y - MOTOR.r, PUMP.z + MOTOR.r], [PUMP.x0, PUMP.y, 720]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 66 },
);
const V = G.viewOf(P);
const CAM = k.cameraOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const XAX = (x = 0) => G.frameOf([x, 0, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const ZAX = (x, y, z = 0) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const shadeOf = (n) => Math.min(3, Math.max(0, Math.floor(((n[0] * -CAM.sinA + n[1] * CAM.cosA + 1) / 2) * 4)));
const facingN = (n) => G.dot3(n, V);
const xdisc = (x0, x1, r, opts = {}) => G.disc(x0, x1, r, XAX(), P, { steps: r > 40 ? 48 : 24, ...opts });
const zdisc = (x, y, z0, z1, r, opts = {}) => G.disc(z0, z1, r, ZAX(x, y), P, { steps: r > 40 ? 48 : 24, ...opts });

function face(points, normal, { tone = "mid", top = false, inner = "", cls = "" } = {}) {
  const d = pathOf(points.map(at));
  const fill = cls ? `<path class="${cls}" d="${d}"/>` : top ? `<path class="iso-top" d="${d}"/>` : `<path class="iso-shade" data-shade="${shadeOf(normal)}" d="${d}"/>`;
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/>${fill}${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
}
// A strip of the section plane y = 0 (x0..x1, z0..z1).
const strip = (x0, x1, z0, z1, opts) => face([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], [0, 1, 0], opts);
// Part of a barrel-like cylinder about the x axis between angles t0..t1 (measured from +y toward +z).
function xBand(r, x0, x1, t0, t1, { tone = "mid", steps = 16, inner = "" } = {}) {
  const pt = (x, t) => [x, r * Math.cos(t), AXZ + r * Math.sin(t)];
  const shades = [[], [], [], []];
  for (let i = 0; i < steps; i++) {
    const a = t0 + ((t1 - t0) * i) / steps, b = t0 + ((t1 - t0) * (i + 1)) / steps, m = (a + b) / 2;
    shades[shadeOf([0, Math.cos(m), Math.sin(m)])].push(pathOf([pt(x0, a), pt(x0, b), pt(x1, b), pt(x1, a)].map(at)));
  }
  const ring = [...Array.from({ length: steps + 1 }, (_, i) => pt(x1, t0 + ((t1 - t0) * i) / steps)), ...Array.from({ length: steps + 1 }, (_, i) => pt(x0, t1 - ((t1 - t0) * i) / steps))];
  const d = pathOf(ring.map(at));
  const tops = shades.map((list, i) => (list.length ? `<path class="iso-shade" data-shade="${i}" d="${list.join("")}"/>` : "")).join("");
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/>${tops}${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
}
function liveSolid(name, tone = "hi") {
  return `<g class="iso-solid" data-live="${name}"><path class="iso-fill" d=""/>${[0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d=""/>`).join("")}<path class="iso-top" d=""/><path class="iso-line iso-crease" data-tone="lo" d=""/><path class="iso-line iso-edge" data-tone="${tone}" d=""/></g>`;
}
const tube = (route, r, opts = {}) => tubePieces(route, r, P, { maxLength: 400, ...opts }).map((piece) => tubeSvg(piece, { tone: opts.tone || "mid" })).join("");

// ---------- extruder frame top (deck)
function floor() {
  // Soft shadows on the floor under the barrel stands and under the vacuum unit.
  const halo = (plan) => `<path class="iso-halo" d="${k.haloOf(plan, 0, 6, P)}"/>`;
  return halo({ x: -490, y: -110, w: 90, d: 220, r: 20 }) + halo({ x: 214, y: -100, w: 64, d: 200, r: 20 }) + halo({ x: TANK.x - TANK.r, y: TANK.y - TANK.r, w: 2 * TANK.r, d: 2 * TANK.r, r: TANK.r });
}

// ---------- vacuum station: base, tank with level glass, pump and motor, the line between them
function station() {
  const out = [];
  // Tank on three legs with foot pads (the back leg first), dished heads.
  const legs = [90, 210, 330].map((d) => d * DEG).sort((a, b) => facingN([Math.cos(a), Math.sin(a), 0]) - facingN([Math.cos(b), Math.sin(b), 0]));
  const leg = (a) => {
    const x = TANK.x + 110 * Math.cos(a), y = TANK.y + 110 * Math.sin(a);
    return S(k.cylinder(x, y, 18, 0, 6, P, 20), { tone: "lo" }) + S(k.cylinder(x, y, 9, 6, TANK.z0 + 20 - 6, P, 14), { tone: "lo", crease: "none" });
  };
  legs.filter((a) => facingN([Math.cos(a), Math.sin(a), 0]) < 0).forEach((a) => out.push(leg(a)));
  const head = (z0, z1, up) => {
    const prof = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; const z = up ? z0 + (z1 - z0) * t : z1 - (z1 - z0) * t; prof.push([z, TANK.r * Math.sqrt(Math.max(0, 1 - t * t * 0.92)), 1]); }
    return up ? prof : prof.reverse();
  };
  const Tf = ZAX(TANK.x, TANK.y);
  // Drain valve under the tank, between the legs.
  const dv = [TANK.x + 40, TANK.y + 40];
  out.push(S(k.cylinder(dv[0], dv[1], 8, 40, 70, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: dv[0] - 11, y: dv[1] - 11, w: 22, d: 22, r: 3 }, 50, 20, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x: dv[0] - 3, y: dv[1], w: 6, d: 42, r: 2 }, 70, 5, P, 2), { tone: "lo" }));
  out.push(S(G.solidOf(head(TANK.z0, TANK.shell[0], false), Tf, P, { steps: 48 }), { tone: "mid" }));
  out.push(S(G.disc(TANK.shell[0], TANK.shell[1], TANK.r, Tf, P, { steps: 56 }), { tone: "hi", crease: "none", inner: L([TANK.shell[0] + 4, TANK.shell[1] - 4].map((z) => G.arcOf(Tf, z, TANK.r, P)).join(""), { tone: "faint" }) }));
  out.push(S(G.solidOf(head(TANK.shell[1], TANK.z1, true), Tf, P, { steps: 48 }), { tone: "mid" }));
  legs.filter((a) => facingN([Math.cos(a), Math.sin(a), 0]) >= 0).forEach((a) => out.push(leg(a)));
  // Level glass on the front of the tank: two elbows from the wall and a glass tube with the condensate level.
  const la = 60 * DEG, lr = TANK.r + 20;
  const lx = TANK.x + lr * Math.cos(la), ly = TANK.y + lr * Math.sin(la);
  for (const z of [TANK.shell[0] + 22, TANK.shell[1] - 22]) out.push(S(G.disc(TANK.r - 4, lr + 6, 7, G.frameAlong([TANK.x, TANK.y, z], [Math.cos(la), Math.sin(la), 0]), P, { steps: 14 }), { tone: "mid" }));
  const g0 = TANK.shell[0] + 32, g1 = TANK.shell[1] - 32;
  out.push(S(k.cylinder(lx, ly, 10, TANK.shell[0] + 14, 18, P, 6), { tone: "mid" }));
  out.push(S(k.cylinder(lx, ly, 7, g0, g1 - g0, P, 18), { tone: "lo", crease: "none" }) + `<path class="vd-water" data-live="level" d=""/>`);
  out.push(S(k.cylinder(lx, ly, 10, g1, 18, P, 6), { tone: "mid" }));
  // Hose nozzle on the tank, towards the barrel.
  const NF = G.frameAlong([TANK.x, TANK.y, 410], [Math.cos(NOZZLE), Math.sin(NOZZLE), 0]);
  out.push(S(G.disc(TANK.r - 6, TANK.r + 20, 22, NF, P, { steps: 24 }), { tone: "mid" }));
  out.push(S(G.disc(TANK.r + 20, TANK.r + 32, 20, NF, P, { steps: 6 }), { tone: "mid" }));
  return out.join("");
}

// Vacuum pump and its motor on a plate on the tank top; the pump draws from the tank through its bottom flange.
function pumpUnit() {
  const out = [];
  const plate = { x: PUMP.x0 - 6, y: PUMP.y - 66, w: MOTOR.x1 + MOTOR.fan - PUMP.x0 + 12, d: 132, r: 4 };
  out.push(S(zdisc(TANK.x, TANK.y, TANK.z1 - 14, TANK.z1 + 4, 58), { tone: "mid" }));
  out.push(S(k.slabOf(plate, TANK.z1 + 4, 10, P, 3, 0.8), { tone: "lo" }));
  out.push(D(k.corners(plate, 12).map(([x, y]) => at([x, y, TANK.z1 + 14])), { size: 0.5 }));
  const MF = G.frameOf([0, PUMP.y, PUMP.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(k.slabOf({ x: MOTOR.x0 + 12, y: PUMP.y - 40, w: MOTOR.x1 - MOTOR.x0 - 24, d: 80, r: 3 }, TANK.z1 + 14, PUMP.z - MOTOR.r - TANK.z1 - 12, P, 2), { tone: "mid" }));
  out.push(S(G.disc(MOTOR.x1, MOTOR.x1 + MOTOR.fan, MOTOR.r - 3, MF, P, { steps: 36, bevel: 0.6 }), { tone: "mid" }));
  out.push(L([16, 30, 42].map((r) => G.circleOf(MF, MOTOR.x1 + MOTOR.fan, r, P, 36)).join(""), { tone: "lo" }));
  const ribs = k.fadedSvg(G.ribsOf(MF, MOTOR.x0 + 8, MOTOR.x1 - 6, MOTOR.r, 24, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" });
  out.push(S(G.disc(MOTOR.x0, MOTOR.x1, MOTOR.r, MF, P, { steps: 36 }), { tone: "mid", inner: ribs }));
  out.push(S(k.slabOf({ x: (MOTOR.x0 + MOTOR.x1) / 2 - 24, y: PUMP.y - 24, w: 48, d: 48, r: 3 }, PUMP.z + MOTOR.r - 6, 28, P, 2, 0.6), { tone: "mid" }));
  out.push(S(G.disc(PUMP.x1, MOTOR.x0, 30, MF, P, { steps: 24 }), { tone: "lo" }));
  // Pump body with its bottom flange on the tank and the exhaust silencer on top.
  out.push(S(zdisc(265, PUMP.y, TANK.z1 + 14, PUMP.z - PUMP.r + 10, 22), { tone: "mid" }));
  out.push(S(G.disc(PUMP.x0, PUMP.x1, PUMP.r, MF, P, { steps: 40, bevel: 0.8 }), { tone: "hi", inner: L([PUMP.x0 + 12, PUMP.x1 - 12].map((x) => G.arcOf(MF, x, PUMP.r, P)).join(""), { tone: "faint" }) }));
  out.push(D(G.dotsOf(MF, PUMP.x0, PUMP.r - 10, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.6 }));
  out.push(S(zdisc(265, PUMP.y, PUMP.z + PUMP.r - 8, PUMP.z + PUMP.r + 14, 14, { steps: 6 }), { tone: "mid" }));
  out.push(S(zdisc(265, PUMP.y, PUMP.z + PUMP.r + 14, PUMP.z + PUMP.r + 70, 22, { bevel: 0.6 }), { tone: "mid", inner: L([PUMP.z + PUMP.r + 28, PUMP.z + PUMP.r + 42, PUMP.z + PUMP.r + 56].map((z) => G.arcOf(ZAX(265, PUMP.y), z, 22, P)).join(""), { tone: "faint" }) }));
  return out.join("");
}

// ---------- barrel
function pedestals(which) {
  const out = [];
  if (which === "left") {
    const ped = { x: -470, y: -90, w: 50, d: 180, r: 3 };
    out.push(S(k.slabOf({ x: -482, y: -104, w: 74, d: 208, r: 4 }, 0, 12, P, 3, 0.8), { tone: "lo" }));
    out.push(D([[-474, -94], [-474, 94], [-416, -94], [-416, 94]].map(([x, y]) => at([x, y, 12])), { size: 0.55 }));
    out.push(S(k.slabOf(ped, 12, AXZ - 130 - 12, P, 3, 1), { tone: "lo", inner: L(k.sideSeam(ped, 60, P, 3), { tone: "faint" }) }));
    const F = G.frameOf([0, 0, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    out.push(S(G.prismOf(F, [[-130, -130], [130, -130], [130, 130], [-130, 130]], -470, BAR.x0, P), { tone: "lo" }));
    out.push(D([[-100, -100], [100, -100], [-100, 100], [100, 100]].map(([y, z]) => at([BAR.x0, y, AXZ + z])), { size: 0.9, tone: "mid" }));
  } else {
    const ped = { x: 228, y: -80, w: 36, d: 160, r: 3 };
    out.push(S(k.slabOf({ x: 216, y: -94, w: 60, d: 188, r: 4 }, 0, 12, P, 3, 0.8), { tone: "lo" }));
    out.push(D([[222, -86], [222, 86], [270, -86], [270, 86]].map(([x, y]) => at([x, y, 12])), { size: 0.55 }));
    out.push(S(k.slabOf(ped, 12, AXZ - 130 - 12, P, 3, 1), { tone: "lo", inner: L(k.sideSeam(ped, 60, P, 3), { tone: "faint" }) }));
    out.push(S(xdisc(BAR.x1, BAR.x1 + 32, 130, { bevel: 1 }), { tone: "lo" }));
    out.push(D(G.dotsOf(XAX(), BAR.x1 + 32, 106, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.8, tone: "mid" }));
  }
  return out.join("");
}

// Barrel and shrouds outside the cut, as whole cylinders.
function barrelWhole(x0, x1) {
  const out = [S(xdisc(x0, x1, BAR.r), { tone: "mid", crease: "none" })];
  const thermo = x0 < -380 ? -385 : null;
  for (const [a, b] of SEGMENTS) {
    const s0 = Math.max(a, x0), s1 = Math.min(b, x1);
    if (s1 - s0 < 1) continue;
    out.push(S(xdisc(s0, s1, SHROUD.r1, { steps: 56 }), { tone: "hi", inner: L(G.arcOf(XAX(), (s0 + s1) / 2, SHROUD.r1, P), { tone: "faint" }) }));
  }
  if (thermo !== null) {
    // Thermocouple through the shroud into the barrel, with its head.
    out.push(S(zdisc(thermo, -20, AXZ + SHROUD.r1 - 4, AXZ + SHROUD.r1 + 8, 9, { steps: 6 }), { tone: "mid" }));
    out.push(S(zdisc(thermo, -20, AXZ + SHROUD.r1 + 8, AXZ + SHROUD.r1 + 30, 3.5), { tone: "hi", crease: "none" }));
    out.push(S(zdisc(thermo, -20, AXZ + SHROUD.r1 + 30, AXZ + SHROUD.r1 + 44, 7, { bevel: 0.5 }), { tone: "mid" }));
  }
  return out.join("");
}

// The cut part of the barrel: the top-back of the shrouds that stays, then the section faces at y = 0.
function barrelCut() {
  const out = [];
  const { x0, x1 } = CUT;
  const turn = Math.PI - Math.atan2(V[2], V[1]);
  for (const [a, b] of SEGMENTS) {
    const s0 = Math.max(a, x0), s1 = Math.min(b, x1);
    if (s1 - s0 < 1) continue;
    out.push(xBand(SHROUD.r1, s0, s1, Math.PI / 2, turn, { tone: "hi", steps: 10 }));
  }
  // The section: dark ground, then barrel wall, heater bands and shrouds as strips.
  out.push(`<path class="vd-cave" d="${pathOf([[x0, 0, AXZ - SHROUD.r1], [x1, 0, AXZ - SHROUD.r1], [x1, 0, AXZ + SHROUD.r1], [x0, 0, AXZ + SHROUD.r1]].map(at))}"/>`);
  for (const [a, b] of SEGMENTS) {
    const s0 = Math.max(a, x0), s1 = Math.min(b, x1);
    if (s1 - s0 < 1) continue;
    for (const sign of [1, -1]) {
      out.push(strip(s0, s1, AXZ + sign * SHROUD.r0, AXZ + sign * SHROUD.r1, { tone: "hi", cls: "vd-steel" }));
      out.push(strip(s0 + 4, s1 - 4, AXZ + sign * HEAT.r0, AXZ + sign * HEAT.r1, { tone: "lo", cls: "vd-heater" }));
    }
  }
  const [o0, o1] = VENT.open;
  out.push(strip(x0, x1, AXZ - BAR.r, AXZ - BAR.bore, { tone: "hi", cls: "vd-steel" }));
  out.push(strip(x0, o0, AXZ + BAR.bore, AXZ + BAR.r, { tone: "hi", cls: "vd-steel" }));
  out.push(strip(o1, x1, AXZ + BAR.bore, AXZ + BAR.r, { tone: "hi", cls: "vd-steel" }));
  // Bore: the inside of the back half, the melt lying in the channel.
  out.push(`<path class="vd-bore" d="${pathOf([[x0, 0, AXZ - BAR.bore], [x1, 0, AXZ - BAR.bore], [x1, 0, AXZ + BAR.bore], [x0, 0, AXZ + BAR.bore]].map(at))}"/>`);
  return out.join("");
}

// Screw in the bore, cut by the same plane: the root and the flight sections (live: they travel along the axis
// as the screw turns). The melt lies in the channel under the root; vapour space above it leads to the vent.
function screw() {
  const out = [];
  const { root, flight, t } = SCREW;
  // Back halves of the flights (behind the section plane), seen in the channel; moved along the axis (live).
  // The back half of one turn of the flight: a helicoid strip from the top (x = 0) round the back to the
  // bottom (x = pitch / 2), its leading face and the outer edge.
  const helix = (r, x) => Array.from({ length: 25 }, (_, i) => { const a = Math.PI / 2 + (i / 24) * Math.PI; return [x + (SCREW.pitch / 2) * (i / 24), r * Math.cos(a), AXZ + r * Math.sin(a)]; });
  const lead = [...helix(flight, t / 2), ...helix(root, t / 2).reverse()];
  const back = [...helix(flight, -t / 2), ...helix(flight, t / 2).reverse()];
  const one = face(back, [0, -0.3, 1], { tone: "hi" }) + face(lead, [1, 0, 0.2], { tone: "hi" });
  const count = Math.ceil((CUT.x1 - CUT.x0) / SCREW.pitch) + 2;
  out.push(`<clipPath id="vd-bore"><path d="${pathOf([[CUT.x0, 0, AXZ - BAR.bore], [CUT.x1, 0, AXZ - BAR.bore], [CUT.x1, 0, AXZ + BAR.bore], [CUT.x0, 0, AXZ + BAR.bore]].map(at))}"/></clipPath>`);
  out.push(`<g clip-path="url(#vd-bore)">${Array.from({ length: count }, (_, i) => `<g data-flight="${i}">${one}</g>`).join("")}</g>`);
  out.push(`<path class="vd-melt" d="${pathOf([[CUT.x0, 0, AXZ - BAR.bore], [CUT.x1, 0, AXZ - BAR.bore], [CUT.x1, 0, AXZ - root], [CUT.x0, 0, AXZ - root]].map(at))}"/>`);
  out.push(`<path class="vd-melt vd-pools" data-live="pools" d=""/>`);
  out.push(`<path class="vd-bubble-rim" data-live="bubbles-rim" d=""/><path class="vd-bubble" data-live="bubbles" d=""/>`);
  out.push(`<path class="vd-flights" data-live="flights" d=""/>`);
  out.push(strip(CUT.x0, CUT.x1, AXZ - root, AXZ + root, { tone: "hi", cls: "vd-screw" }));
  return out.join("");
}

// Vent block on the barrel and the vacuum chamber over it (back half, cut at y = 0), with lid and sight glass.
function chamberBack() {
  const out = [];
  const { x0, x1, y, z0, z1 } = VENT;
  const [o0, o1] = VENT.open;
  // Vent block top around the opening, the opening's back wall, the block's section faces.
  out.push(face([[x0, -y, z1], [x1, -y, z1], [x1, 0, z1], [o1, 0, z1], [o1, -VENT.openY, z1], [o0, -VENT.openY, z1], [o0, 0, z1], [x0, 0, z1]], [0, 0, 1], { top: true }));
  out.push(face([[o0, -VENT.openY, AXZ + BAR.bore - 2], [o1, -VENT.openY, AXZ + BAR.bore - 2], [o1, -VENT.openY, z1], [o0, -VENT.openY, z1]], [0, 1, 0], { cls: "vd-cave", tone: "lo" }));
  out.push(face([[x1, -y, z0], [x1, 0, z0], [x1, 0, z1], [x1, -y, z1]], [1, 0, 0], {}));
  out.push(strip(x0, o0, z0, z1, { tone: "hi", cls: "vd-steel" }));
  out.push(strip(o1, x1, z0, z1, { tone: "hi", cls: "vd-steel" }));
  // Chamber: base flange, inner back wall and left end wall, the outer right end wall with the port.
  const c = CH.cx, [bl, bw] = CH.bot, [tl, tw] = CH.top;
  const fl = { x0: c - bl - 15, x1: c + bl + 15, y: bw + 25 };
  out.push(face([[fl.x0, -fl.y, CH.z0], [fl.x1, -fl.y, CH.z0], [fl.x1, 0, CH.z0], [fl.x0, 0, CH.z0]], [0, 0, 1], { top: true, inner: D([[fl.x0 + 12, -fl.y + 12], [c, -fl.y + 12], [fl.x1 - 12, -fl.y + 12], [fl.x1 - 12, -24], [fl.x0 + 12, -24]].map(([px, py]) => at([px, py, CH.z0])), { size: 0.6 }) }));
  out.push(face([[fl.x1, -fl.y, z1], [fl.x1, 0, z1], [fl.x1, 0, CH.z0], [fl.x1, -fl.y, CH.z0]], [1, 0, 0], {}));
  out.push(face([[c - bl, -bw, CH.z0], [c + bl, -bw, CH.z0], [c + tl, -tw, CH.z1], [c - tl, -tw, CH.z1]], [0, 1, 0.4], { cls: "vd-inner", tone: "mid" }));
  out.push(face([[c - bl, 0, CH.z0], [c - bl, -bw, CH.z0], [c - tl, -tw, CH.z1], [c - tl, 0, CH.z1]], [1, 0, 0.4], { cls: "vd-inner2", tone: "mid" }));
  out.push(`<path class="vd-vapour" data-live="vapour" d=""/>`);
  return out.join("");
}

function chamberFront() {
  const out = [];
  const c = CH.cx, [bl, bw] = CH.bot, [tl, tw] = CH.top, t = CH.t;
  // Outer face of the right end wall (back half) with the vacuum port.
  out.push(face([[c + bl, -bw, CH.z0], [c + bl, 0, CH.z0], [c + tl, 0, CH.z1], [c + tl, -tw, CH.z1]], [1, 0, -0.5], { tone: "hi" }));
  // Section faces of the chamber walls and of the flange.
  const fl = { x0: c - bl - 15, x1: c + bl + 15 };
  out.push(strip(fl.x0, fl.x1, CH.z0 - 10, CH.z0, { tone: "hi", cls: "vd-steel" }));
  out.push(face([[c - bl - t, 0, CH.z0], [c - bl, 0, CH.z0], [c - tl, 0, CH.z1], [c - tl - t, 0, CH.z1]], [0, 1, 0], { tone: "hi", cls: "vd-steel" }));
  out.push(face([[c + bl, 0, CH.z0], [c + bl + t, 0, CH.z0], [c + tl + t, 0, CH.z1], [c + tl, 0, CH.z1]], [0, 1, 0], { tone: "hi", cls: "vd-steel" }));
  // Lid (back half): plate, its section, the sight glass in a bolted ring, the handle.
  const { x0, x1, y, z0, z1 } = LID;
  out.push(S(k.extrude([[x0, -y], [x1, -y], [x1, 0], [x0, 0]], z0, z1 - z0, P), { tone: "hi" }));
  out.push(strip(x0, x1, z0, z1, { tone: "hi", cls: "vd-steel" }));
  const gx = c, gy = -78;
  out.push(S(k.cylinder(gx, gy, 58, z1, 8, P, 48, 0.8), { tone: "mid" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => at([gx + 50 * Math.cos((i + 0.5) * Math.PI / 4), gy + 50 * Math.sin((i + 0.5) * Math.PI / 4), z1 + 8])), { size: 0.55 }));
  out.push(`<path class="vd-glass" d="${pathOf(Array.from({ length: 48 }, (_, i) => at([gx + 40 * Math.cos(i * Math.PI / 24), gy + 40 * Math.sin(i * Math.PI / 24), z1 + 8])))}"/>`);
  out.push(L(pathOf(Array.from({ length: 48 }, (_, i) => at([gx + 40 * Math.cos(i * Math.PI / 24), gy + 40 * Math.sin(i * Math.PI / 24), z1 + 8]))), { tone: "mid" }));
  out.push(L(pathOf([at([gx - 20, gy + 18, z1 + 8]), at([gx + 12, gy - 22, z1 + 8])], false) + pathOf([at([gx - 6, gy + 26, z1 + 8]), at([gx + 24, gy - 10, z1 + 8])], false), { tone: "faint", free: true }));
  for (const hx of [x0 + 40, x1 - 40]) out.push(S(k.cylinder(hx, -120, 7, z1, 26, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x0 + 30, y: -128, w: x1 - x0 - 60, d: 16, r: 6 }, z1 + 26, 12, P, 3, 0.6), { tone: "mid" }));
  return out.join("");
}

// Port, ball valve, tee with the gauge, and the hose down to the tank.
function line() {
  const out = [];
  const { y, z } = PORT;
  const wallX = CH.cx + CH.bot[0] + ((CH.top[0] - CH.bot[0]) * (z - CH.z0)) / (CH.z1 - CH.z0);
  const F = G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(wallX - 6, wallX + 10, 30, F, P, { steps: 32 }), { tone: "mid" }));
  out.push(S(G.disc(wallX + 10, wallX + 34, 18, F, P, { steps: 24 }), { tone: "mid", crease: "none" }));
  // Ball valve: hex ends, body, stem and lever.
  const v0 = wallX + 34, v1 = v0 + 70;
  out.push(S(G.disc(v0, v0 + 14, 24, F, P, { steps: 6 }), { tone: "mid" }));
  out.push(S(G.lathe([[v0 + 14, 0], [v0 + 14, 24], [v0 + 24, 30, 1], [v0 + 35, 32, 1], [v0 + 46, 30, 1], [v0 + 56, 24], [v0 + 56, 0]], F, P, { steps: 40 }), { tone: "hi" }));
  out.push(S(G.disc(v0 + 56, v1, 24, F, P, { steps: 6 }), { tone: "mid" }));
  const vc = v0 + 35;
  out.push(S(k.cylinder(vc, y, 7, z + 30, 16, P, 14), { tone: "mid", crease: "none" }));
  out.push(`<g data-part="valve">` + S(k.slabOf({ x: vc - 8, y: y - 6, w: 90, d: 12, r: 4 }, z + 46, 7, P, 3, 0.6), { tone: "lo" }) + `</g>`);
  out.push(S(G.disc(v1, TEE.x - 24, 16, F, P, { steps: 20 }), { tone: "mid", crease: "none" }));
  // Tee as a cast ball; the riser and the vacuum gauge on it.
  out.push(S(G.sphereOf([TEE.x, y, z], 27, P), { tone: "mid" }));
  out.push(S(zdisc(TEE.x, y, z + 24, z + 40, 18, { steps: 6 }), { tone: "mid" }));
  out.push(S(zdisc(TEE.x, y, z + 40, GAUGE.z - GAUGE.r + 4, 11), { tone: "hi", crease: "none" }));
  out.push(S(zdisc(TEE.x, y, GAUGE.z - GAUGE.r - 18, GAUGE.z - GAUGE.r + 2, 15, { steps: 6 }), { tone: "mid" }));
  const GF = G.frameOf([GAUGE.x, 0, GAUGE.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(GAUGE.y0, GAUGE.y1, GAUGE.r, GF, P, { steps: 56, bevel: 0.8 }), { tone: "mid" }));
  out.push(`<path class="vd-dial" d="${G.circleOf(GF, GAUGE.y1, GAUGE.r - 6, P, 64)}"/>`);
  out.push(L(G.circleOf(GF, GAUGE.y1, GAUGE.r - 6, P, 64), { tone: "mid" }));
  // Dial ticks from the zero mark (lower left) clockwise over 270°.
  const tickAt = (deg, len) => {
    const a = deg * DEG, r0 = GAUGE.r - 6, r1 = r0 - len;
    return [[GAUGE.x + r0 * Math.sin(a), GAUGE.y1, GAUGE.z + r0 * Math.cos(a)], [GAUGE.x + r1 * Math.sin(a), GAUGE.y1, GAUGE.z + r1 * Math.cos(a)]];
  };
  const minor = [], major = [];
  for (let i = 0; i <= 30; i++) (i % 5 ? minor : major).push(pathOf(tickAt(-135 + i * 9, i % 5 ? 4 : 8).map(at), false));
  out.push(L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }));
  out.push(`<path class="iso-line vd-needle" data-tone="lit" data-free="" data-live="needle" d=""/>`);
  out.push(D([at([GAUGE.x, GAUGE.y1, GAUGE.z])], { size: 1.6, tone: "mid" }));
  // Down port of the tee and the steel-reinforced hose to the tank.
  out.push(S(zdisc(TEE.x, y, z - 44, z - 22, 16, { steps: 6 }), { tone: "mid" }));
  const na = NOZZLE, nEnd = [TANK.x + (TANK.r + 32) * Math.cos(na), TANK.y + (TANK.r + 32) * Math.sin(na), 410];
  const route = G.fillet([[TEE.x, y, z - 44], [TEE.x, y, 488], [nEnd[0] + 46 * Math.cos(na), nEnd[1] + 46 * Math.sin(na), 418], nEnd], 26, 9, { P, tube: HOSE_R });
  out.push(tubePieces(route, HOSE_R, P, { maxLength: 400, rings: { pitch: 7, fade: [0.15, 0.6] } }).map((piece) => tubeSvg(piece, { tone: "mid" })).join(""));
  return out.join("");
}

// ---------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    floor(),
    `<g data-part="pump" data-hit>${station()}${pumpUnit()}</g>`,
    pedestals("left"),
    barrelWhole(BAR.x0, CUT.x0),
    barrelCut(),
    screw(),
    `<g data-part="chamber" data-hit data-on>${chamberBack()}${chamberFront()}</g>`,
    barrelWhole(CUT.x1, BAR.x1),
    pedestals("right"),
    line(),
  ],
});

const DATA = {
  cam: { ox: P.origin[0], oy: P.origin[1], k: CAM.k, sa: CAM.sinA, ca: CAM.cosA, se: CAM.sinE, ce: CAM.cosE },
  axis: AXZ,
  cut: [CUT.x0, CUT.x1],
  bore: BAR.bore,
  pool: POOL,
  screw: { pitch: SCREW.pitch, root: SCREW.root, flight: SCREW.flight, t: SCREW.t, step: k.axisVector(P, [1, 0, 0]) },
  vent: { open: VENT.open, top: VENT.z1 },
  chamber: { cx: CH.cx, z: CH.z1 - 40 },
  port: [CH.cx + CH.bot[0] + ((CH.top[0] - CH.bot[0]) * (PORT.z - CH.z0)) / (CH.z1 - CH.z0), PORT.y, PORT.z],
  gauge: { x: GAUGE.x, y: GAUGE.y1, z: GAUGE.z, r: GAUGE.r - 12 },
  level: { x: TANK.x + (TANK.r + 20) * Math.cos(60 * DEG), y: TANK.y + (TANK.r + 20) * Math.sin(60 * DEG), r: 5, z: [TANK.shell[0] + 32, TANK.shell[1] - 32] },
};

const CSS = figureCss(`
.vd-cave{fill:var(--vd-cave);stroke:none}
.vd-bore{fill:var(--vd-bore);stroke:none}
.vd-steel{fill:var(--anatomy-shade-2)}
.vd-screw{fill:var(--anatomy-shade-3)}
.vd-flights{fill:var(--anatomy-shade-3);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight,.6px);stroke-linejoin:round}
.vd-heater{fill:var(--anatomy-shade-0)}
.vd-inner{fill:var(--vd-inner)}
.vd-inner2{fill:var(--vd-inner2)}
.vd-melt{fill:var(--vd-melt);stroke:none}
.vd-pools{stroke:var(--vd-melt-line);stroke-width:.6px;stroke-linejoin:round}
.vd-melt-line{stroke:var(--vd-melt-line)}
.vd-glass{fill:var(--vd-glass);stroke:none}
.vd-dial{fill:var(--anatomy-paper);stroke:none}
.vd-needle{stroke-width:1.2}
.vd-water{fill:var(--vd-water);stroke:none}
.vd-bubble-rim{fill:none;stroke:var(--vd-melt-line);stroke-width:1.2}
.vd-bubble{fill:var(--vd-bubble);stroke:none}
.vd-vapour{fill:none;stroke:var(--vd-vapour);stroke-width:1.9;stroke-linecap:round}`, {
  light: "--vd-cave:#d2d9d2;--vd-bore:#dde3dc;--vd-inner:#e3e8e2;--vd-inner2:#d9e0d8;--vd-melt:#dcc6a3;--vd-melt-line:#b38f5c;--vd-glass:#e6eeee;--vd-water:#9fbcc0;--vd-bubble:#f8f3ea;--vd-vapour:#7f9ea3",
  dark: "--vd-cave:#0f1612;--vd-bore:#131b16;--vd-inner:#1a231d;--vd-inner2:#151d18;--vd-melt:#5a4630;--vd-melt-line:#b08a58;--vd-glass:#1d2a2b;--vd-water:#36565a;--vd-bubble:#d8c7a8;--vd-vapour:#8fb3b8",
});

// Path data written compactly: each polyline simplified within 0.12 px (end points kept) and written relative.
function compact(markup) {
  const fmt = (v) => {
    const t = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(/^(-?)0\./, "$1.");
    return t === "-0" ? "0" : t;
  };
  const simplify = (pts, tol) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
      let worst = -1, at2 = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
        if (d > worst) { worst = d; at2 = i; }
      }
      if (worst > tol) { keep[at2] = 1; stack.push([a, at2], [at2, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  return markup.replace(/ d="([MLZ0-9 .\-]+)"/g, (whole, d) => {
    const subs = d.match(/M[^M]*/g);
    if (!subs) return whole;
    let out = "", cx = 0, cy = 0, first = true;
    for (const sub of subs) {
      const closed = /Z\s*$/.test(sub);
      const pts = sub.replace(/Z\s*$/, "").slice(1).split("L").map((p) => p.trim().split(/\s+/).map(Number));
      if (pts.some((p) => p.length !== 2 || p.some(Number.isNaN))) return whole;
      const list = simplify(pts, 0.12);
      list.forEach(([x, y], i) => {
        const rx = Math.round(x * 10) / 10, ry = Math.round(y * 10) / 10;
        if (i === 0 && first) out += `M${fmt(rx)} ${fmt(ry)}`;
        else out += `${i === 0 ? "m" : i === 1 ? "l" : " "}${fmt(rx - cx)} ${fmt(ry - cy)}`.replace(/ -/g, "-");
        cx = rx; cy = ry;
      });
      if (closed) { out += "z"; cx = Math.round(list[0][0] * 10) / 10; cy = Math.round(list[0][1] * 10) / 10; }
      first = false;
    }
    return ` d="${out}"`;
  });
}

const file = writeFigure({ id: ID, svg: compact(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
