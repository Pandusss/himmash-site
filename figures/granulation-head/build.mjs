// Голова грануляции с горячим торцевым резом (вертикальное исполнение): an interactive isometric figure.
// World units are millimetres; z up along the cutter shaft, x and y on the floor. The melt comes in from the
// side (angle −40°), turns down through an annular die plate that faces down; two knives on the shaft sweep
// the die face, and the pellets fly into a water film running down the inside of the hood and leave at the
// bottom. The front sector of the hood and of the die body is cut away to show the knives and the melt path.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "granulation-head";
const WIDTH = 520;
const HEIGHT = 720;
const DEG = Math.PI / 180;

// ---------- dimensions (mm). Height with the drive: 1 000 mm (spec).
const PLATE_H = 0;                          // floor
const RING = { z0: 46, z1: 66, r: 170 };    // hood base ring on levelling feet
const R_OUT = 165, R_IN = 159;              // hood shell
const HZ0 = 66, HZ1 = 380;                  // hood shell height
const FLOOR_Z = 74;                         // inside floor of the hood
const LID = { z0: 380, z1: 394, r: 174 };
const CUT = { a1: 20 * DEG, a2: 122 * DEG, z0: 124 };   // cut-away sector of the hood and the die body
const DIE = { r: 112, rIn: 40, face: 250, joint: 264, top: 312 };   // die plate + die body, hanging from the lid
const HOLE_R = 77;                          // radius of the ring of die holes
const KNIFE = { r0: 34, r1: 128, w: 28, z0: 244, z1: 250 };          // knife Ø 256 mm, 160–350 by spec
const ARM = { r: 104, w: 34, z0: 236, z1: 244 };
const CARRIER = { r: 52, z0: 224, z1: 236 };
const NUT = { r: 30, z0: 150, z1: 168 };
const SHAFT_R = 16;
const MELT_IN = { a: -40 * DEG, z: 281, r: 40, len: 190, flange: 92 };
const WATER = { a: -12 * DEG, z0: 334, z1: 374 };
const OUTLET = { a: 192 * DEG, r: 104, hole: 24 };   // outlet in the floor; its pipe runs down under the hood
const HINGE = { a: 131 * DEG, z0: 150, z1: 330 };
// The column above the lid.
const HEAD = { z0: 394, z1: 448, r: 130 };
const FLANGE = { z0: 448, z1: 462, r: 112 };
const HOUSING = { z0: 462, z1: 536, r: 74 };
const ADJUST = { z0: 536, z1: 568, r: 96, handle: 104, knob: 13 };
const QUILL = { z0: 568, z1: 648, r: 60 };
const LANTERN = { z0: 648, z1: 790, r: 82, win: [18 * DEG, 72 * DEG], wz: [684, 760] };
const MFLANGE = { z0: 790, z1: 806, r: 140 };
const MOTOR = { z0: 806, z1: 930, r: 112 };
const FAN = { z0: 930, z1: 1000, r: 108 };

const P = k.fitProjection(
  [...[45, 135, 225, 315].map((a) => [218 * Math.cos(a * DEG), 218 * Math.sin(a * DEG), 0]), [0, 0, FAN.z1], ...[0, 90, 180, 270].map((a) => [FAN.r * Math.cos(a * DEG), FAN.r * Math.sin(a * DEG), FAN.z1]),
    [Math.cos(MELT_IN.a) * (R_OUT + MELT_IN.len + 14), Math.sin(MELT_IN.a) * (R_OUT + MELT_IN.len + 14), MELT_IN.z + MELT_IN.flange],
    [Math.cos(MELT_IN.a) * (R_OUT + MELT_IN.len + 14), Math.sin(MELT_IN.a) * (R_OUT + MELT_IN.len + 14), MELT_IN.z - MELT_IN.flange]],
  WIDTH, HEIGHT, { pad: 34, azimuth: 45 },
);
const V = G.viewOf(P);
const CAM = k.cameraOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const AX = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const polar = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const arc = (r, z, a0, a1, steps = 48) => Array.from({ length: steps + 1 }, (_, i) => polar(r, a0 + ((a1 - a0) * i) / steps, z));
const facing = (a) => Math.cos(a) * CAM.cosA + Math.sin(a) * CAM.sinA;
const shadeOf = (nx, ny) => Math.min(3, Math.max(0, Math.floor(((nx * -CAM.sinA + ny * CAM.cosA + 1) / 2) * 4)));
const disc = (z0, z1, r, opts = {}) => G.disc(z0, z1, r, AX, P, { steps: 44, ...opts });
const rdisc = (s0, s1, r, F, opts = {}) => G.disc(s0, s1, r, F, P, { steps: r > 20 ? 36 : 20, ...opts });

// A flat polygon face (side or top) shaded like the kit's prisms.
function face(points, normal, { tone = "mid", top = false, inner = "" } = {}) {
  const d = pathOf(points.map(at));
  const fill = top ? `<path class="iso-top" d="${d}"/>` : `<path class="iso-shade" data-shade="${shadeOf(normal[0], normal[1])}" d="${d}"/>`;
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/>${fill}${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
}

// Part of a vertical cylinder's side between angles t0..t1 (radians), shaded per facet, outlined.
function bandSide(r, z0, z1, t0, t1, { tone = "mid", steps = 40, inner = "" } = {}) {
  const shades = [[], [], [], []];
  for (let i = 0; i < steps; i++) {
    const a = t0 + ((t1 - t0) * i) / steps, b = t0 + ((t1 - t0) * (i + 1)) / steps;
    const m = (a + b) / 2;
    shades[shadeOf(Math.cos(m), Math.sin(m))].push(pathOf([polar(r, a, z0), polar(r, b, z0), polar(r, b, z1), polar(r, a, z1)].map(at)));
  }
  const ring = [...arc(r, z1, t0, t1, steps), ...arc(r, z0, t1, t0, steps)];
  const d = pathOf(ring.map(at));
  return `<g class="iso-solid"><path class="iso-fill" d="${d}"/>${shades.map((list, i) => (list.length ? `<path class="iso-shade" data-shade="${i}" d="${list.join("")}"/>` : "")).join("")}${inner}<path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
}

// A solid whose paths the live script rewrites each frame (all parts present, even when empty).
function liveSolid(name, paths, tone = "hi") {
  return `<g class="iso-solid" data-live="${name}"><path class="iso-fill" d="${paths.fill}"/>${[0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("")}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="lo" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}

// A box standing out from the hood or column, built in a frame along the radial direction at angle a.
function radialBox(a, rFrom, rTo, halfW, z0, z1, style = { tone: "mid" }) {
  const F = G.frameOf([0, 0, (z0 + z1) / 2], [Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]);
  const h = (z1 - z0) / 2;
  return S(G.prismOf(F, [[-halfW, -h], [halfW, -h], [halfW, h], [-halfW, h]], rFrom, rTo, P), style);
}
const radialFrame = (a, z, r = 0) => G.frameAlong([r * Math.cos(a), r * Math.sin(a), z], [Math.cos(a), Math.sin(a), 0]);

// ---------- base plate and levelling feet
function base() {
  // The head stands on four levelling feet; a soft shadow on the floor under them.
  return `<path class="iso-halo" d="${k.haloOf({ x: -200, y: -200, w: 400, d: 400, r: 190 }, 0, 4, P)}"/>`;
}

function feet(front) {
  const out = [];
  const list = [45, 135, 225, 315].map((a) => a * DEG).filter((a) => (facing(a) > 0) === front).sort((a, b) => facing(a) - facing(b));
  for (const a of list) {
    const [x, y] = [Math.cos(a) * 196, Math.sin(a) * 196];
    out.push(S(k.cylinder(x, y, 22, PLATE_H, 8, P, 28, 0.8), { tone: "lo" }));
    out.push(L(k.ring(x, y, 16, PLATE_H + 8, P, 24), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, 7, PLATE_H + 8, RING.z0 - PLATE_H - 8 - 8, P, 14), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(x, y, 12, RING.z0 - 8, 8, P, 6), { tone: "mid" }));
    out.push(radialBox(a, RING.r - 4, 214, 20, RING.z0, RING.z1, { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 11, RING.z1, 7, P, 6), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- hood
function hoodShell() {
  const out = [];
  out.push(S(disc(RING.z0, RING.z1, RING.r), { tone: "lo" }));
  out.push(S(disc(HZ0, HZ1, R_OUT, { steps: 72 }), { tone: "hi", inner: L([HZ0 + 26, HZ1 - 22].map((z) => G.arcOf(AX, z, R_OUT, P)).join(""), { tone: "faint" }) }));
  return out.join("");
}

// The hollow seen through the cut: inner wall with its water film, the floor and what hangs inside.
const OPEN = [
  polar(R_OUT, CUT.a1, CUT.z0), ...arc(R_OUT, HZ1, CUT.a1, CUT.a2, 60), polar(R_OUT, CUT.a2, CUT.z0), ...arc(R_IN, CUT.z0, CUT.a2, CUT.a1, 60),
];
function cave() {
  const out = [];
  const box = pathOf(OPEN.map(at));
  out.push(`<path class="gh-cave" d="${box}"/>`);
  // Floor: the back part of the inside floor, where the water and pellets run to the outlet.
  const floorRing = arc(R_IN, FLOOR_Z, 0, 2 * Math.PI, 120);
  out.push(`<path class="gh-floor" d="${pathOf(floorRing.map(at))}"/>`);
  out.push(L(pathOf(arc(R_IN, FLOOR_Z, 135 * DEG, 315 * DEG, 60).map(at), false), { tone: "lo" }));
  // Outlet in the floor at the back: the water and pellets drop into the pipe to the cooler.
  const H = G.frameAlong(polar(OUTLET.r, OUTLET.a, FLOOR_Z), [0, 0, 1]);
  out.push(L(G.circleOf(H, 0, OUTLET.hole + 7, P, 40), { tone: "lo" }));
  out.push(`<path class="gh-hole" d="${G.circleOf(H, 0, OUTLET.hole, P, 40)}"/>`);
  // Water film: streaks running down the inner wall in a slow spiral, from under the lid to the floor.
  const streaks = [];
  for (let i = 0; i < 22; i++) {
    const a0 = 120 * DEG + i * 10 * DEG;
    const pts = Array.from({ length: 25 }, (_, j) => polar(R_IN - 0.5, a0 + j * 1.2 * DEG, HZ1 - ((HZ1 - FLOOR_Z) * j) / 24));
    if (pts.some((p) => facing(Math.atan2(p[1], p[0])) < -0.05)) streaks.push(pathOf(pts.filter((p) => facing(Math.atan2(p[1], p[0])) < 0.02).map(at), false));
  }
  out.push(`<g class="gh-water" data-water>${L(streaks.join(""), { tone: "lo", className: "gh-stream" })}</g>`);
  return out.join("");
}

// Vertical helix for the knife spring, split into the half behind the shaft and the half in front.
function helix(r, z0, z1, turns) {
  const back = [], front = [];
  let run = [], side = null;
  const steps = turns * 36;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const p = [r * Math.cos(t), r * Math.sin(t), z0 + ((z1 - z0) * i) / steps];
    const s = facing(t) >= 0;
    if (side !== null && s !== side) {
      (side ? front : back).push(pathOf([...run, p].map(at), false));
      run = [];
    }
    run.push(p);
    side = s;
  }
  (side ? front : back).push(pathOf(run.map(at), false));
  return { back: back.join(""), front: front.join("") };
}

// Knife unit hanging under the die: shaft, knurled nut, spring, carrier; the arms and knives turn (live).
const KNIVES = {
  arm: [[-ARM.r, -ARM.w / 2], [ARM.r, -ARM.w / 2], [ARM.r, ARM.w / 2], [-ARM.r, ARM.w / 2]],
  blade: [[KNIFE.r0, -KNIFE.w / 2], [KNIFE.r1 - 10, -KNIFE.w / 2], [KNIFE.r1, -KNIFE.w / 2 + 9], [KNIFE.r1, KNIFE.w / 2], [KNIFE.r0, KNIFE.w / 2]],
  bolts: [[56, 0], [86, 0]],
};
const rotate = (ring, a) => ring.map(([u, v]) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]);
function knifeUnit() {
  const out = [];
  const coil = helix(22, NUT.z1, CARRIER.z0, 6);
  out.push(S(k.cylinder(0, 0, 11, NUT.z0 - 10, 10, P, 18, 0.8), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, NUT.r, NUT.z0, NUT.z1 - NUT.z0, P, 40, 1), { tone: "mid", inner: L(k.knurl(0, 0, NUT.r, NUT.z0, NUT.z1, 40, P), { tone: "lo" }) }));
  out.push(L(k.ring(0, 0, 22, NUT.z1, P, 48), { tone: "lo" }));
  out.push(L(coil.back, { tone: "lo", className: "gh-coil" }));
  out.push(S(k.cylinder(0, 0, SHAFT_R, NUT.z1, DIE.face - NUT.z1, P, 24), { tone: "hi", crease: "none" }));
  out.push(L(coil.front, { tone: "mid", className: "gh-coil" }));
  const cutter = [];
  cutter.push(S(k.cylinder(0, 0, CARRIER.r, CARRIER.z0, CARRIER.z1 - CARRIER.z0, P, 48, 1), { tone: "hi" }));
  cutter.push(liveSolid("arm", k.extrude(KNIVES.arm, ARM.z0, ARM.z1 - ARM.z0, P)));
  cutter.push(liveSolid("blade0", k.extrude(KNIVES.blade, KNIFE.z0, KNIFE.z1 - KNIFE.z0, P)));
  cutter.push(liveSolid("blade1", k.extrude(rotate(KNIVES.blade, Math.PI), KNIFE.z0, KNIFE.z1 - KNIFE.z0, P)));
  cutter.push(`<path class="gh-bolts" data-live="bolts" d=""/>`);
  out.push(`<g data-part="cutter" data-hit data-on>${cutter.join("")}</g>`);
  return out.join("");
}

// Die body and die plate, cut by the same sector as the hood. Section faces show the melt channels.
function dieBody() {
  const out = [];
  const { a1, a2 } = CUT;
  const rest = [a2, a1 + 2 * Math.PI];
  // Top of the die body (under the lid), then the sleeve that carries the shaft bearings.
  out.push(face([...arc(DIE.r, DIE.top, rest[0], rest[1], 60), ...arc(DIE.rIn, DIE.top, rest[1], rest[0], 30)], [0, 0, 1], { top: true }));
  out.push(S(disc(DIE.face, LID.z0, DIE.rIn), { tone: "mid", crease: "none", inner: L(G.arcOf(AX, DIE.face + 6, DIE.rIn, P), { tone: "faint" }) }));
  // Outer side, visible on both sides of the cut.
  const seam = (t0, t1) => L(pathOf(arc(DIE.r, DIE.joint, t0, t1, 20).map(at), false), { tone: "faint" });
  out.push(bandSide(DIE.r, DIE.face, DIE.top, a2, 135 * DEG, { steps: 6, inner: seam(a2, 135 * DEG) }));
  out.push(bandSide(DIE.r, DIE.face, DIE.top, -45 * DEG, a1, { steps: 24, inner: seam(-45 * DEG, a1) }));
  // Section faces: steel, the annular melt chamber, a die hole going down to the face; a joint line at the plate.
  for (const [a, sign] of [[a1, 1], [a2, -1]]) {
    const n = [-Math.sin(a) * sign, Math.cos(a) * sign, 0];
    const q = (r, z) => polar(r, a, z);
    const chamber = [q(60, 272), q(94, 272), q(94, 296), q(60, 296)];
    const hole = [q(HOLE_R - 3, DIE.face), q(HOLE_R + 3, DIE.face), q(HOLE_R + 3, 272), q(HOLE_R - 3, 272)];
    const melt = `<path class="gh-melt" d="${pathOf(chamber.map(at))}${pathOf(hole.map(at))}"/>` +
      L(pathOf([q(HOLE_R - 3, DIE.face), q(HOLE_R - 3, 272), q(60, 272), q(60, 296), q(94, 296), q(94, 272), q(HOLE_R + 3, 272), q(HOLE_R + 3, DIE.face)].map(at), false), { tone: "mid" }) +
      L(pathOf([q(DIE.rIn, DIE.joint), q(HOLE_R - 3, DIE.joint)].map(at), false) + pathOf([q(HOLE_R + 3, DIE.joint), q(DIE.r, DIE.joint)].map(at), false), { tone: "lo" });
    out.push(face([q(DIE.rIn, DIE.face), q(DIE.r, DIE.face), q(DIE.r, DIE.top), q(DIE.rIn, DIE.top)], n, { tone: "hi", inner: melt }));
  }
  return out.join("");
}

// Faces of the cut through the hood wall.
function cutFaces() {
  const out = [];
  const { a1, a2, z0 } = CUT;
  out.push(face([...arc(R_OUT, z0, a1, a2, 50), ...arc(R_IN, z0, a2, a1, 50)], [0, 0, 1], { top: true, tone: "hi" }));
  for (const [a, sign] of [[a1, 1], [a2, -1]]) {
    out.push(face([polar(R_IN, a, z0), polar(R_OUT, a, z0), polar(R_OUT, a, HZ1), polar(R_IN, a, HZ1)], [-Math.sin(a) * sign, Math.cos(a) * sign, 0], { tone: "hi" }));
  }
  return out.join("");
}

// Things on the outside of the hood: hinge with latches (left), water inlet box (right), melt inlet adapter.
function hinge() {
  const out = [];
  const { a, z0, z1 } = HINGE;
  out.push(radialBox(a, R_OUT - 2, R_OUT + 10, 9, z0, z1, { tone: "mid" }));
  for (const z of [z0 + 22, (z0 + z1) / 2, z1 - 22]) {
    out.push(radialBox(a, R_OUT + 10, R_OUT + 24, 13, z - 12, z + 12, { tone: "mid" }));
    out.push(S(rdisc(R_OUT + 24, R_OUT + 30, 6, radialFrame(a, z)), { tone: "hi" }));
  }
  return out.join("");
}

function waterInlet() {
  const out = [];
  const { a, z0, z1 } = WATER;
  out.push(radialBox(a, R_OUT - 3, R_OUT + 34, 34, z0, z1, { tone: "hi" }));
  const top = polar(R_OUT + 17, a, z1);
  out.push(S(k.cylinder(top[0], top[1], 11, z1, 10, P, 6), { tone: "mid" }));
  out.push(S(k.cylinder(top[0], top[1], 8, z1 + 10, 18, P, 18), { tone: "mid", crease: "none", inner: L([z1 + 16, z1 + 22].map((z) => k.sideArc(top[0], top[1], 8, z, P, 14)).join(""), { tone: "lo" }) }));
  out.push(`<path class="gh-hole" d="${G.circleOf(G.frameAlong([top[0], top[1], z1 + 28], [0, 0, 1]), 0, 5, P, 18)}"/>`);
  return out.join("");
}

function meltInlet() {
  const out = [];
  const { a, z, r, len, flange } = MELT_IN;
  const F = radialFrame(a, z);
  out.push(S(rdisc(R_OUT - 8, R_OUT + 14, r + 14, F), { tone: "mid" }));                 // boss on the hood
  out.push(S(rdisc(R_OUT + 14, R_OUT + len - 18, r, F), { tone: "hi", crease: "none" })); // adapter pipe
  // Band heater on the adapter with its terminal block.
  out.push(S(rdisc(R_OUT + 46, R_OUT + 100, r + 5, F), { tone: "mid", inner: L([R_OUT + 60, R_OUT + 86].map((s) => G.arcOf(F, s, r + 5, P)).join(""), { tone: "faint" }) }));
  const tb = polar(R_OUT + 73, a, z + r + 5);
  out.push(S(k.slabOf({ x: tb[0] - 9, y: tb[1] - 9, w: 18, d: 18, r: 2 }, z + r + 3, 12, P, 2), { tone: "mid" }));
  out.push(D([at([tb[0], tb[1] - 4, z + r + 15]), at([tb[0], tb[1] + 4, z + r + 15])], { size: 0.5 }));
  // V-band clamp and the connection flange to the screen changer.
  out.push(S(rdisc(R_OUT + len - 18, R_OUT + len - 4, flange - 10, F), { tone: "mid" }));
  out.push(S(rdisc(R_OUT + len - 4, R_OUT + len + 14, flange, F), { tone: "mid" }));
  out.push(D(G.dotsOf(F, R_OUT + len + 14, flange - 14, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.6, tone: "mid" }));
  out.push(`<path class="gh-melt" d="${G.circleOf(F, R_OUT + len + 14, r - 14, P, 40)}"/>`);
  out.push(L(G.circleOf(F, R_OUT + len + 14, r - 14, P, 40), { tone: "mid" }));
  return out.join("");
}

// Name plate on the hood, curved to the shell, with its two rivets and three lines of text.
function namePlate() {
  const r = R_OUT + 1.5, t0 = -10 * DEG, t1 = 12 * DEG, z0 = 170, z1 = 216;
  const rule = (z, share) => L(pathOf(arc(r, z, t0 + 0.12 * (t1 - t0), t0 + (0.12 + share) * (t1 - t0), 10).map(at), false), { tone: "lo", free: true });
  const lines = rule(z1 - 12, 0.7) + rule(z1 - 22, 0.5) + rule(z1 - 32, 0.6);
  const rivets = D([polar(r, t0 + 0.06 * (t1 - t0), (z0 + z1) / 2), polar(r, t1 - 0.06 * (t1 - t0), (z0 + z1) / 2)].map(at), { size: 0.5 });
  return bandSide(r, z0, z1, t0, t1, { tone: "mid", steps: 8, inner: lines + rivets });
}

function lid() {
  const out = [];
  out.push(S(disc(LID.z0, LID.z1, LID.r, { bevel: 1 }), { tone: "mid" }));
  out.push(D(G.dotsOf(AX, LID.z1, LID.r - 10, 16, P, { all: true, phase: 0.1 }), { size: 0.6, tone: "mid" }));
  return out.join("");
}

// ---------- column: die head, bearing housing, knife adjuster, quill, lantern, motor
function headRing() {
  const out = [];
  const holes = [-30, 0, 30, 60, 90, 120].map((d) => d * DEG);
  const inner = holes.map((a) => L(G.circleOf(radialFrame(a, (HEAD.z0 + HEAD.z1) / 2), HEAD.r, 6, P, 16), { tone: "lo" })).join("");
  out.push(S(disc(HEAD.z0, HEAD.z1, HEAD.r, { bevel: 1 }), { tone: "mid", inner: L(G.arcOf(AX, HEAD.z0 + 8, HEAD.r, P), { tone: "faint" }) + inner }));
  // Thermocouples screwed into the die head.
  for (const a of [10 * DEG, 75 * DEG]) {
    const F = radialFrame(a, (HEAD.z0 + HEAD.z1) / 2 + 2);
    out.push(S(rdisc(HEAD.r - 1, HEAD.r + 10, 9, F, { steps: 6 }), { tone: "mid" }));
    out.push(S(rdisc(HEAD.r + 10, HEAD.r + 34, 3.5, F), { tone: "hi", crease: "none" }));
    out.push(S(rdisc(HEAD.r + 34, HEAD.r + 44, 6, F), { tone: "mid" }));
  }
  out.push(S(disc(FLANGE.z0, FLANGE.z1, FLANGE.r, { bevel: 0.8 }), { tone: "mid" }));
  const bolts = G.dotsOf(AX, FLANGE.z1, FLANGE.r - 12, 8, P, { all: true, phase: Math.PI / 8 });
  out.push(D(bolts, { size: 0.7, tone: "mid" }));
  out.push(S(disc(HOUSING.z0, HOUSING.z1, HOUSING.r), { tone: "mid", inner: L([HOUSING.z0 + 14, HOUSING.z1 - 16].map((z) => G.arcOf(AX, z, HOUSING.r, P)).join(""), { tone: "faint" }) }));
  return out.join("");
}

// Knife adjuster: a ring with three handles; turning it moves the quill and brings the knives to the die.
function adjuster() {
  const back = [], front = [];
  const zc = (ADJUST.z0 + ADJUST.z1) / 2;
  for (const d of [100, 220, 340]) {
    const a = d * DEG;
    const F = radialFrame(a, zc);
    const part = S(rdisc(ADJUST.r - 2, ADJUST.r + ADJUST.handle, 6, F), { tone: "lo", crease: "none" }) +
      S(rdisc(ADJUST.r + ADJUST.handle - 2, ADJUST.r + ADJUST.handle + 26, 9, F, { bevel: 0.5 }), { tone: "lo" });
    (facing(a) > 0 ? front : back).push(part);
  }
  const ring = S(disc(ADJUST.z0, ADJUST.z1, ADJUST.r, { bevel: 0.8 }), { tone: "mid", inner: L(G.arcOf(AX, ADJUST.z0 + 8, ADJUST.r, P), { tone: "faint" }) });
  const quill = S(disc(QUILL.z0, QUILL.z1, QUILL.r), { tone: "hi", inner: L(G.arcOf(AX, QUILL.z1 - 12, QUILL.r, P), { tone: "faint" }) + `<path class="gh-hole" d="${G.circleOf(radialFrame(40 * DEG, 608), QUILL.r, 7, P, 18)}"/>` + L(G.circleOf(radialFrame(40 * DEG, 608), QUILL.r, 7, P, 18), { tone: "lo" }) });
  return back.join("") + ring + front.join("") + quill;
}

// Lantern between the quill and the motor; its window shows the jaw coupling turning with the shaft.
function lantern() {
  const out = [];
  const [w0, w1] = LANTERN.win, [z0, z1] = LANTERN.wz;
  out.push(S(disc(LANTERN.z0, LANTERN.z1, LANTERN.r), { tone: "mid", inner: L([LANTERN.z0 + 12, LANTERN.z1 - 12].map((z) => G.arcOf(AX, z, LANTERN.r, P)).join(""), { tone: "faint" }) }));
  const win = [...arc(LANTERN.r, z1, w0, w1, 24), ...arc(LANTERN.r, z0, w1, w0, 24)];
  const id = "gh-win";
  out.push(`<clipPath id="${id}"><path d="${pathOf(win.map(at))}"/></clipPath>`);
  const inner = [`<path class="gh-cave" d="${pathOf(win.map(at))}"/>`];
  // Coupling: two hubs and the spider between them; the jaws (live) turn.
  inner.push(S(disc(z0 - 10, 712, 40), { tone: "mid" }));
  inner.push(S(disc(712, 724, 36), { tone: "lo", crease: "none" }));
  inner.push(S(disc(724, z1 + 10, 40), { tone: "mid" }));
  inner.push(`<path class="iso-line" data-tone="lo" data-live="jaws" d=""/>`);
  out.push(`<g clip-path="url(#${id})">${inner.join("")}</g>`);
  // Window rim: the cut edges of the lantern wall.
  out.push(face([polar(LANTERN.r - 6, w0, z0), polar(LANTERN.r, w0, z0), polar(LANTERN.r, w0, z1), polar(LANTERN.r - 6, w0, z1)], [-Math.sin(w0), Math.cos(w0), 0], { tone: "mid" }));
  out.push(face([...arc(LANTERN.r, z0, w0, w1, 24), ...arc(LANTERN.r - 6, z0, w1, w0, 24)], [0, 0, 1], { top: true, tone: "mid" }));
  out.push(L(pathOf(win.map(at)), { tone: "mid" }));
  return out.join("");
}

function motor() {
  const out = [];
  out.push(S(disc(MFLANGE.z0, MFLANGE.z1, MFLANGE.r, { bevel: 0.8 }), { tone: "mid" }));
  out.push(D(G.dotsOf(AX, MFLANGE.z1, MFLANGE.r - 14, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.75, tone: "mid" }));
  const ribs = k.fadedSvg(G.ribsOf(AX, MOTOR.z0 + 12, MOTOR.z1 - 10, MOTOR.r, 36, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" });
  out.push(S(disc(MOTOR.z0, MOTOR.z1, MOTOR.r), { tone: "mid", inner: ribs }));
  // Terminal box on the left side, with two cable glands (plugged).
  const a = 95 * DEG;
  out.push(radialBox(a, MOTOR.r - 8, MOTOR.r + 34, 40, 834, 906, { tone: "mid" }));
  out.push(radialBox(a, MOTOR.r + 34, MOTOR.r + 38, 34, 840, 900, { tone: "mid" }));
  for (const dz of [-14, 14]) {
    const t = polar(MOTOR.r + 20, a, 834);
    const off = [-Math.sin(a) * dz, Math.cos(a) * dz];
    out.push(S(k.cylinder(t[0] + off[0], t[1] + off[1], 7, 820, 14, P, 6), { tone: "mid" }));
  }
  // Fan cover with its rounded top and the air slots.
  const fan = [[FAN.z0, FAN.r], [FAN.z1 - 18, FAN.r], [FAN.z1 - 10, FAN.r - 3, 1], [FAN.z1 - 4, FAN.r - 10, 1], [FAN.z1, FAN.r - 24]];
  out.push(S(G.solidOf(fan, AX, P), { tone: "mid", inner: L(G.arcOf(AX, FAN.z0 + 10, FAN.r, P), { tone: "faint" }) }));
  out.push(L([30, 48, 66].map((r) => G.circleOf(AX, FAN.z1, r, P, 48)).join(""), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, 12, FAN.z1, 3, P, 18), { tone: "mid" }));
  return out.join("");
}

// ---------- assemble
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    `<defs><clipPath id="gh-open"><path d="${pathOf(OPEN.map(at))}"/></clipPath></defs>`,
    base(),
    feet(false),
    hoodShell(),
    `<g clip-path="url(#gh-open)">`,
    cave(),
    `<path class="gh-pellets" data-live="pellets-back" d=""/>`,
    knifeUnit(),
    dieBody(),
    `<path class="gh-strand" data-live="strands" d=""/>`,
    `<path class="gh-pellets" data-live="pellets-front" d=""/>`,
    `</g>`,
    cutFaces(),
    namePlate(),
    feet(true),
    hinge(),
    meltInlet(),
    waterInlet(),
    lid(),
    headRing(),
    adjuster(),
    `<g data-part="motor" data-hit>${lantern()}${motor()}</g>`,
  ],
});

const DATA = {
  cam: { ox: P.origin[0], oy: P.origin[1], k: CAM.k, sa: CAM.sinA, ca: CAM.cosA, se: CAM.sinE, ce: CAM.cosE },
  knives: { arm: KNIVES.arm, blade: KNIVES.blade, bolts: KNIVES.bolts, arm_z: [ARM.z0, ARM.z1], blade_z: [KNIFE.z0, KNIFE.z1], count: 2 },
  die: { face: DIE.face, r: DIE.r, hole: HOLE_R, holes: 40 },
  cut: [CUT.a1, CUT.a2],
  hood: { rIn: R_IN, floor: FLOOR_Z, outlet: [OUTLET.r, OUTLET.a] },
  coupling: { r: 36, z: [712, 724] },
  rpm: [700, 1400, 2100, 2800],
  slow: 100,
  output: 400,
};

const CSS = figureCss(`
.gh-cave{fill:var(--gh-cave);stroke:none}
.gh-floor{fill:var(--gh-floor);stroke:none}
.gh-hole{fill:var(--gh-hole);stroke:none}
.gh-melt{fill:var(--gh-melt);stroke:none}
.gh-water .iso-line{stroke:var(--gh-water);stroke-dasharray:3 7}
.gh-water .iso-line[data-flow]{animation:gh-flow 1100ms linear infinite}
@keyframes gh-flow{to{stroke-dashoffset:-30}}
@media (prefers-reduced-motion:reduce){.gh-water .iso-line[data-flow]{animation:none}}
.gh-coil{stroke-width:1.2}
.gh-strand{fill:none;stroke:var(--gh-melt-line);stroke-width:3.4;stroke-linecap:round}
.gh-pellets{fill:none;stroke:var(--gh-pellet);stroke-width:2.3;stroke-linecap:round}
.gh-bolts{fill:none;stroke:var(--anatomy-dot);stroke-width:1.3;stroke-linecap:round}`, {
  light: "--gh-cave:#d5ddd6;--gh-floor:#e2e8e2;--gh-hole:#2a3530;--gh-melt:#dcc6a3;--gh-melt-line:#b38f5c;--gh-water:#8fb0b5;--gh-pellet:#46534b",
  dark: "--gh-cave:#0f1612;--gh-floor:#141c17;--gh-hole:#050706;--gh-melt:#5a4630;--gh-melt-line:#b08a58;--gh-water:#36565a;--gh-pellet:#c9d4cc",
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
      let worst = -1, at = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
        if (d > worst) { worst = d; at = i; }
      }
      if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
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
      if (closed) { out += "z"; cx = list[0][0] === undefined ? cx : Math.round(list[0][0] * 10) / 10; cy = Math.round(list[0][1] * 10) / 10; }
      first = false;
    }
    return ` d="${out}"`;
  });
}

const file = writeFigure({ id: ID, svg: compact(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
