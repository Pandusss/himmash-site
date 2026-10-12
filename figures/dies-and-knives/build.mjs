// Фильеры и плавающие ножи: an interactive isometric figure built with the anatomy kit.
// A parts-level close-up of the cutting unit: the die plate (shown face up) bolted to the end of the die head,
// and the two-knife floating cutter on its shaft. World units are millimetres; z up along the shaft.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "dies-and-knives";
const WIDTH = 520;
const HEIGHT = 600;
const DEG = Math.PI / 180;

// ---------- dimensions (mm)
const BASE = { r: 172, z0: -16 };                         // turned stand under the die head
const BODY = { r: 148, z0: 0, z1: 56 };                     // end of the die head
const BAND = { r: 154, z0: 8, z1: 48 };                     // band heater
const DIE = { r: 150, z0: 56, z1: 84, boss: 106, face: 104, ring: [64, 104], recess: 58, floor: 96 };
const HOLES = { r: 84, count: 40, d: 3 };                   // 26–120 holes Ø 1.8–4.5 mm by spec
const BOLTS = { r: 128, count: 12 };
const BLADE = { r0: 46, r1: 118, w: 34, t: 4, angle: 15 * DEG, edge: 25 * DEG };   // knife Ø 220; angles by spec
const ARM = { r: 104, w: 24, z0: 115, z1: 125 };
const HUB = { r: 56, z0: 125, z1: 150 };
const SPRING = { r: 27, z1: 214, turns: 7, wire: 1.6 };
const NUT = { r: 36, z0: 214, z1: 236 };
const SHAFT = { r: 20, z1: 262 };
const COUPLING = { r: 52, z0: 262, z1: 294 };
const WEAR = { max: 3, show: 2 };                           // mm of wear shown; drawn ×2 (see caption)

const P = k.fitProjection(
  [...Array.from({ length: 24 }, (_, i) => [BASE.r * Math.cos(i * 15 * DEG), BASE.r * Math.sin(i * 15 * DEG), BASE.z0]), ...Array.from({ length: 24 }, (_, i) => [COUPLING.r * Math.cos(i * 15 * DEG), COUPLING.r * Math.sin(i * 15 * DEG), COUPLING.z1])],
  WIDTH, HEIGHT, { pad: 30, azimuth: 45, elevation: 35 },
);
const CAM = k.cameraOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const AX = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const polar = (r, a, z) => [r * Math.cos(a), r * Math.sin(a), z];
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const facing = (a) => Math.cos(a) * CAM.cosA + Math.sin(a) * CAM.sinA;
const disc = (z0, z1, r, opts = {}) => G.disc(z0, z1, r, AX, P, { steps: 56, ...opts });
const ellipse = (cx, cy, z, r, steps = 32) => pathOf(Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * 2 * Math.PI), cy + r * Math.sin((i / steps) * 2 * Math.PI), z])));
const radialFrame = (a, z, r = 0) => G.frameAlong([r * Math.cos(a), r * Math.sin(a), z], [Math.cos(a), Math.sin(a), 0]);

// A solid whose paths the live script rewrites each frame (all parts present, even when empty).
function liveSolid(name, paths, tone = "hi") {
  return `<g class="iso-solid" data-live="${name}"><path class="iso-fill" d="${paths.fill}"/>${[0, 1, 2, 3].map((i) => `<path class="iso-shade" data-shade="${i}" d="${paths.shades[i] || ""}"/>`).join("")}<path class="iso-top" d="${paths.top}"/><path class="iso-line iso-crease" data-tone="lo" d="${paths.crease}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/></g>`;
}
function radialBox(a, rFrom, rTo, halfW, z0, z1, style = { tone: "mid" }) {
  const F = G.frameOf([0, 0, (z0 + z1) / 2], [Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]);
  const h = (z1 - z0) / 2;
  return S(G.prismOf(F, [[-halfW, -h], [halfW, -h], [halfW, h], [-halfW, h]], rFrom, rTo, P), style);
}

// Knife cross-section in the plane across the knife (t along the direction of travel, z up): a plate of
// thickness t with its cutting edge ground at the sharpening angle, tilted by the working angle so the
// edge leads and touches the die face (z = face). Returned with the edge at t = +w/2.
function bladeSection() {
  const { w, t, angle, edge } = BLADE;
  const local = [[0, 0], [w, 0], [w, t], [t / Math.tan(edge), t]];        // x back from the edge, y up from the face side
  return local.map(([x, y]) => [w / 2 - (x * Math.cos(angle) - y * Math.sin(angle)), x * Math.sin(angle) + y * Math.cos(angle)]);
}

// ---------- stand and die head end
function stand() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -BASE.r, y: -BASE.r, w: 2 * BASE.r, d: 2 * BASE.r, r: BASE.r }, BASE.z0, -BASE.z0, P)}"/>`];
  out.push(S(disc(BASE.z0, 0, BASE.r, { bevel: 1.2 }), { tone: "lo", inner: L(G.arcOf(AX, BASE.z0 / 2, BASE.r, P), { tone: "faint" }) }));
  const bolts = [45, 135, 225, 315].map((d) => polar(BASE.r - 11, d * DEG, 0));
  out.push(L(bolts.map(([x, y]) => k.ring(x, y, 7, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(bolts.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
  return out.join("");
}

function dieHead() {
  const out = [];
  out.push(S(disc(BODY.z0, BODY.z1, BODY.r), { tone: "mid" }));
  out.push(S(disc(BAND.z0, BAND.z1, BAND.r), { tone: "mid", inner: L([BAND.z0 + 10, BAND.z1 - 10].map((z) => G.arcOf(AX, z, BAND.r, P)).join(""), { tone: "faint" }) }));
  // Terminal box of the band heater, with its plugged cable gland.
  const a = 100 * DEG;
  out.push(radialBox(a, BAND.r - 4, BAND.r + 26, 22, 12, 44, { tone: "mid" }));
  const g = polar(BAND.r + 14, a, 12);
  out.push(S(k.cylinder(g[0], g[1], 6, 2, 10, P, 6), { tone: "mid" }));
  // Clamp of the band heater: two lugs at the split and the clamping screw across them.
  for (const d of [52, 60]) out.push(radialBox(d * DEG, BAND.r - 2, BAND.r + 14, 4, 14, 42, { tone: "mid" }));
  const c = polar(BAND.r + 8, 56 * DEG, 28), t = [-Math.sin(56 * DEG), Math.cos(56 * DEG), 0];
  const Fc = G.frameAlong(c, t);
  out.push(S(G.disc(-16, 16, 3, Fc, P, { steps: 16 }), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(12, 18, 6, Fc, P, { steps: 6 }), { tone: "mid" }));
  // Thermocouple in the die head.
  const F = radialFrame(20 * DEG, 30);
  out.push(S(G.disc(BAND.r - 2, BAND.r + 8, 8, F, P, { steps: 6 }), { tone: "mid" }));
  out.push(S(G.disc(BAND.r + 8, BAND.r + 26, 3, F, P, { steps: 16 }), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(BAND.r + 26, BAND.r + 34, 5, F, P, { steps: 16 }), { tone: "mid" }));
  return out.join("");
}

// Die plate: flange with counterbored cap screws and jacking holes, the raised boss with its hard-faced
// cutting ring and the ring of die holes, and the centre recess with the bolts of the melt cone.
function diePlate() {
  const out = [];
  out.push(S(disc(DIE.z0, DIE.z1, DIE.r, { bevel: 1 }), { tone: "hi", inner: L(G.arcOf(AX, DIE.z0 + 8, DIE.r, P), { tone: "faint" }) }));
  const bores = [], heads = [], sockets = [];
  for (let i = 0; i < BOLTS.count; i++) {
    const a = ((i + 0.5) / BOLTS.count) * 2 * Math.PI;
    const [x, y] = polar(BOLTS.r, a, 0);
    bores.push(ellipse(x, y, DIE.z1, 12));
    heads.push(ellipse(x, y, DIE.z1 - 5, 8.5, 24));
    sockets.push(pathOf(Array.from({ length: 6 }, (_, j) => at([x + 3.6 * Math.cos(j * Math.PI / 3), y + 3.6 * Math.sin(j * Math.PI / 3), DIE.z1 - 5]))));
  }
  out.push(`<path class="dk-bore" d="${bores.join("")}"/>`);
  out.push(L(bores.join(""), { tone: "mid" }));
  out.push(`<path class="dk-head" d="${heads.join("")}"/>`);
  out.push(L(heads.join(""), { tone: "lo" }));
  out.push(`<path class="dk-hole" d="${sockets.join("")}"/>`);
  const jacks = [0, 90, 180, 270].map((d) => polar(BOLTS.r, d * DEG, 0));
  out.push(`<path class="dk-hole" d="${jacks.map(([x, y]) => ellipse(x, y, DIE.z1, 4.5, 20)).join("")}"/>`);
  out.push(L(jacks.map(([x, y]) => ellipse(x, y, DIE.z1, 6.5, 20)).join(""), { tone: "lo" }));
  // Boss with the cutting face.
  out.push(S(disc(DIE.z1, DIE.face, DIE.boss, { bevel: 0.8 }), { tone: "hi", crease: "lo" }));
  const [r0, r1] = DIE.ring;
  out.push(`<path class="dk-hard" fill-rule="evenodd" d="${G.circleOf(AX, DIE.face, r1, P, 120)}${G.circleOf(AX, DIE.face, r0, P, 96)}"/>`);
  out.push(L(G.circleOf(AX, DIE.face, r1, P, 120) + G.circleOf(AX, DIE.face, r0, P, 96), { tone: "lo" }));
  const holes = [];
  for (let i = 0; i < HOLES.count; i++) {
    const [x, y] = polar(HOLES.r, (i / HOLES.count) * 2 * Math.PI, 0);
    holes.push(ellipse(x, y, DIE.face, HOLES.d * 0.75, 14));
  }
  out.push(`<path class="dk-hole" d="${holes.join("")}"/>`);
  // Centre recess.
  const rim = G.circleOf(AX, DIE.face, DIE.recess, P, 72);
  out.push(`<clipPath id="dk-recess"><path d="${rim}"/></clipPath>`);
  out.push(`<path class="dk-cave" d="${rim}"/>`);
  const floor = [`<path class="dk-floor" d="${G.circleOf(AX, DIE.floor, DIE.recess, P, 72)}"/>`];
  floor.push(`<path class="dk-hole" d="${[45, 135, 225, 315].map((d) => { const [x, y] = polar(34, d * DEG, 0); return ellipse(x, y, DIE.floor, 5, 18); }).join("")}${ellipse(0, 0, DIE.floor, 11, 28)}"/>`);
  floor.push(L([45, 135, 225, 315].map((d) => { const [x, y] = polar(34, d * DEG, 0); return ellipse(x, y, DIE.floor, 7.5, 18); }).join(""), { tone: "lo" }));
  out.push(`<g clip-path="url(#dk-recess)">${floor.join("")}</g>`);
  out.push(L(rim, { tone: "mid" }));
  return out.join("");
}

// Vertical helix, split into the half behind the axis and the half in front (the live script rebuilds it).
function helix(r, z0, z1, turns) {
  const back = [], front = [];
  let run = [], side = null;
  const steps = turns * 36;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const p = [r * Math.cos(t), r * Math.sin(t), z0 + ((z1 - z0) * i) / steps];
    const s = facing(t) >= 0;
    if (side !== null && s !== side) { (side ? front : back).push(pathOf([...run, p].map(at), false)); run = []; }
    run.push(p);
    side = s;
  }
  (side ? front : back).push(pathOf(run.map(at), false));
  return { back: back.join(""), front: front.join("") };
}

// The floating cutter: knives (live), arms (live), hub, spring (live), shaft (live), knurled nut, coupling.
const SECTION = bladeSection();
function cutter() {
  const out = [];
  const empty = { fill: "", shades: [], top: "", crease: "", outline: "" };
  const unit = [];
  unit.push(liveSolid("blade0", empty));
  unit.push(liveSolid("blade1", empty));
  out.push(`<g data-part="knives" data-hit data-on>${unit.join("")}</g>`);
  out.push(`<g data-part="hub" data-hit>${liveSolid("arm", empty, "hi")}<path class="dk-screws" data-live="screws" d=""/></g>`);
  const hub = [];
  hub.push(S(disc(HUB.z0, HUB.z1, HUB.r, { bevel: 1 }), { tone: "hi", inner: L(G.arcOf(AX, HUB.z0 + 8, HUB.r, P), { tone: "faint" }) }));
  hub.push(L(G.circleOf(AX, HUB.z1, SPRING.r + 3, P, 48), { tone: "lo" }));
  hub.push(`<path class="dk-screws" data-live="hubdots" d=""/>`);
  out.push(`<g data-part="hub" data-hit data-live="hub">${hub.join("")}</g>`);
  const coil = helix(SPRING.r, HUB.z1, SPRING.z1, SPRING.turns);
  out.push(`<path class="iso-line dk-coil" data-tone="lo" data-live="coil-back" d="${coil.back}"/>`);
  out.push(liveSolid("shaft", empty, "hi"));
  out.push(`<path class="iso-line dk-coil" data-tone="mid" data-live="coil-front" d="${coil.front}"/>`);
  out.push(S(disc(NUT.z0, NUT.z1, NUT.r, { bevel: 0.8 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(AX, NUT.z0, NUT.z1, NUT.r, 56, P, { fade: [0.08, 0.5] }), { tone: "lo" }) }));
  out.push(L(G.circleOf(AX, NUT.z0, SPRING.r + 3, P, 48), { tone: "faint" }));
  out.push(S(disc(NUT.z1, COUPLING.z0, SHAFT.r, { steps: 32 }), { tone: "hi", crease: "none", inner: L(G.arcOf(AX, NUT.z1 + 30, SHAFT.r, P), { tone: "faint" }) }));
  out.push(S(disc(COUPLING.z0, COUPLING.z1, COUPLING.r, { bevel: 1 }), { tone: "mid", inner: L(G.arcOf(AX, COUPLING.z0 + 10, COUPLING.r, P), { tone: "faint" }) }));
  out.push(D(G.dotsOf(AX, COUPLING.z1, COUPLING.r - 11, 6, P, { all: true, phase: 0.3 }), { size: 0.8, tone: "mid" }));
  out.push(L(G.circleOf(AX, COUPLING.z1, SHAFT.r + 6, P, 40), { tone: "lo" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: SVG_CLASS,
  label: "",
  body: [
    stand(),
    dieHead(),
    diePlate(),
    `<path class="dk-strand" data-live="strands" d=""/>`,
    `<path class="dk-pellets" data-live="pellets-back" d=""/>`,
    cutter(),
    `<path class="dk-pellets" data-live="pellets-front" d=""/>`,
  ],
});

const DATA = {
  cam: { ox: P.origin[0], oy: P.origin[1], k: CAM.k, sa: CAM.sinA, ca: CAM.cosA, se: CAM.sinE, ce: CAM.cosE },
  light: G.lightOf(P),
  blade: { r0: BLADE.r0, r1: BLADE.r1, section: SECTION, screws: [64, 98] },
  arm: { r: ARM.r, w: ARM.w, z: [ARM.z0, ARM.z1] },
  hub: { z1: HUB.z1, dots: 38 },
  spring: { r: SPRING.r, z1: SPRING.z1, turns: SPRING.turns },
  shaft: { r: SHAFT.r, z1: NUT.z0 },
  die: { face: DIE.face, edge: DIE.r, holes: HOLES.count, hole: HOLES.r },
  wear: WEAR,
  lift: k.axisVector(P, [0, 0, 1]),
};

const CSS = figureCss(`
.dk-bore{fill:var(--dk-bore);stroke:none}
.dk-head{fill:var(--anatomy-top);stroke:none}
.dk-hole{fill:var(--dk-hole);stroke:none}
.dk-hard{fill:var(--dk-hard);stroke:none}
.dk-cave{fill:var(--dk-bore);stroke:none}
.dk-floor{fill:var(--anatomy-shade-2);stroke:none}
.dk-coil{stroke-width:1.5}
.dk-screws{fill:none;stroke:var(--anatomy-dot);stroke-width:1.6;stroke-linecap:round}
.dk-strand{fill:none;stroke:var(--dk-melt);stroke-width:3.2;stroke-linecap:round}
.dk-pellets{fill:none;stroke:var(--dk-pellet);stroke-width:3;stroke-linecap:round}`, {
  light: "--dk-bore:#d3dad3;--dk-hole:#26302b;--dk-hard:#e4e9e3;--dk-melt:#b9935e;--dk-pellet:#46534b",
  dark: "--dk-bore:#0f1612;--dk-hole:#050706;--dk-hard:#2b3830;--dk-melt:#b08a58;--dk-pellet:#c9d4cc",
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
