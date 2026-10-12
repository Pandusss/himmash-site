// Шиберный фильтр безостановочного действия: an interactive isometric figure built with the anatomy kit.
// World units are millimetres; x across the filter, y along the melt flow (inlet faces +y, the viewer), z up.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { kitScript } from "../kit/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const SITE = join(HERE, "..", "..");
const SRC = join(SITE, "src", "figures", "screen-changer");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 520;
const HEIGHT = 700;

// Heights. The channel axis is z = 190, the filter centre stands 1 100 mm above the floor (spec: 1 050–1 180).
const AXIS_Z = 190;
const FLOOR = AXIS_Z - 1100;
const CASTER_H = 150;
const RAIL_H = 80;
const RAIL_Z = FLOOR + CASTER_H;            // underside of the platform frame
const DECK = RAIL_Z + RAIL_H;               // top of the platform frame
const BODY = { x: -470, y: -150, w: 940, d: 300, r: 10 };
const BODY_H = 380;
const SLOT_GAP = 6;

// Slide plates: two windows of 250 mm, 340 mm apart. Up: the lower window is in the melt, the upper one waits above.
const WINDOW_R = 125;
const PITCH = 340;
const PLATE_W = 335;
const PLATE_T = 70;
const PLATE_Z = 20;
const PLATE_H = 720;
const PLATES = [-210, 210];
const STROKE = PITCH;

const COUPLING_H = 50;
const NUT_H = 15;
const FRAME_Z = PLATE_Z + PLATE_H + COUPLING_H + NUT_H + 25;   // underside of the top frame plate
const FRAME_H = 65;
const FRAME_TOP = FRAME_Z + FRAME_H;
const FRAME = { x: -470, y: -120, w: 940, d: 240, r: 8 };
const COLUMNS = [-428, 0, 428];
const COLUMN_R = 25;

const CAP = 150;
const CAP_H = 70;
const BARREL_R = 55;
const BARREL_H = 455;
const ROD_R = 25;

const PLATFORM = { x: -480, y: -340, w: 960, d: 680, r: 6 };
const PEDESTALS = [-440, 440];

const P = k.fitProjection(
  [...k.boxCorners(PLATFORM, FLOOR, DECK), ...k.boxCorners(FRAME, FRAME_Z, FRAME_TOP + 2 * CAP_H + BARREL_H + 40), [0, BODY.y + BODY.d + 60, AXIS_Z]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 58 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const centred = (cx, cy, w, d, r = 4) => plan(cx - w / 2, cy - d / 2, w, d, r);
const byDepth = (list, of = (item) => item) => [...list].sort((a, b) => G.dot3(of(a), V) - G.dot3(of(b), V));
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${closed ? "Z" : ""}`;
const faceCircle = (cx, y, cz, r, steps = 72) => Array.from({ length: steps }, (_, i) => at([cx + r * Math.cos((i / steps) * 2 * Math.PI), y, cz + r * Math.sin((i / steps) * 2 * Math.PI)]));

// ---------- platform on casters
function caster(x, y) {
  const out = [];
  const top = centred(x, y, 110, 110, 6);
  const wheelZ = FLOOR + 50;
  const F = G.frameAlong([x, y, wheelZ], [1, 0, 0]);
  const fork = (dx) => S(k.slabOf(centred(x + dx, y, 6, 60, 2), wheelZ - 14, RAIL_Z - 18 - wheelZ + 14, P, 2), { tone: "lo", crease: "none" });
  out.push(fork(-27));
  out.push(S(G.disc(-20, 20, 50, F, P), { tone: "lo" }));
  out.push(S(G.disc(-24, 24, 16, F, P), { tone: "lo" }));
  out.push(fork(27));
  out.push(S(k.cylinder(x, y, 34, RAIL_Z - 18, 10, P, 28), { tone: "lo" }));
  out.push(S(k.slabOf(top, RAIL_Z - 8, 8, P, 3, 2), { tone: "lo" }));
  out.push(D(k.corners(top, 14).map(([px, py]) => at([px, py, RAIL_Z])), { size: 0.45 }));
  return out.join("");
}

function platform() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATFORM, FLOOR, RAIL_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATFORM, 60), ([x, y]) => [x, y, 0])) out.push(caster(x, y));
  const rails = [
    plan(PLATFORM.x, PLATFORM.y, PLATFORM.w, 80, 4),                      // back
    plan(-400, -150, 800, 40, 3),                                        // tray bars
    plan(-400, 110, 800, 40, 3),
    plan(PLATFORM.x, PLATFORM.y + 80, 80, PLATFORM.d - 160, 3),            // left
    plan(PLATFORM.x + PLATFORM.w - 80, PLATFORM.y + 80, 80, PLATFORM.d - 160, 3), // right
    plan(PLATFORM.x, PLATFORM.y + PLATFORM.d - 80, PLATFORM.w, 80, 4),    // front
  ];
  rails.forEach((r, i) => {
    const z = i === 1 || i === 2 ? DECK - 40 : RAIL_Z;
    const h = i === 1 || i === 2 ? 40 : RAIL_H;
    out.push(S(k.slabOf(r, z, h, P, 3, 3), { tone: "lo", inner: L(k.sideSeam(r, z + h / 2, P, 3), { tone: "faint" }) }));
  });
  // Drip tray under the plates: melt drips when a screen comes out.
  const tray = plan(-390, -140, 780, 280, 10);
  out.push(S(k.slabOf(tray, DECK, 45, P, 6, 3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 12), DECK + 45, P, 6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 16), DECK + 45, P, 6), { tone: "faint" }));
  // Corner screws of the deck.
  const screws = [[-440, -300], [440, -300], [-440, 300], [440, 300]];
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 12, DECK, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, DECK])), { size: 0.5 }));
  return out.join("");
}

function pedestal(x) {
  const out = [];
  const foot = centred(x, 0, 80, 360, 4);
  const column = centred(x, 0, 70, 260, 4);
  const head = centred(x, 0, 80, 300, 4);
  out.push(S(k.slabOf(foot, DECK, 18, P, 3, 2), { tone: "lo" }));
  out.push(D([-150, 150].map((y) => at([x, y, DECK + 18])), { size: 0.5 }));
  out.push(L([-150, 150].map((y) => k.ring(x, y, 10, DECK + 18, P, 14)).join(""), { tone: "lo" }));
  out.push(S(k.slabOf(column, DECK + 18, -18 - DECK - 18, P, 3, 2), { tone: "mid", inner: L(k.sideSeam(column, (DECK + 0) / 2, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(head, -18, 18, P, 3, 2), { tone: "mid" }));
  return out.join("");
}

// ---------- slide plates
const windowsOf = (cx) => [PLATE_Z + 170, PLATE_Z + 170 + PITCH].map((z) => [cx, z]);
function perforation(cx, cz) {
  const points = [];
  const pitch = 19;
  for (let row = -8; row <= 8; row++) {
    for (let col = -8; col <= 8; col++) {
      const x = col * pitch + (row % 2 ? pitch / 2 : 0);
      const z = row * pitch * 0.866;
      if (Math.hypot(x, z) < WINDOW_R - 18) points.push(at([cx + x, PLATE_T / 2, cz + z]));
    }
  }
  return points;
}

function windowSvg(cx, cz, index) {
  const y = PLATE_T / 2;
  const out = [];
  out.push(`<path class="iso-fill sc-recess" d="${pathOf(faceCircle(cx, y, cz, WINDOW_R))}"/>`);
  out.push(L(pathOf(faceCircle(cx, y, cz, WINDOW_R)), { tone: "mid" }));
  out.push(L(pathOf(faceCircle(cx, y, cz, WINDOW_R - 10)), { tone: "lo" }));
  out.push(`<path class="sc-dirt" data-window="${index}" opacity="0" d="${pathOf(faceCircle(cx, y, cz, WINDOW_R - 12))}"/>`);
  out.push(D(perforation(cx, cz), { size: 0.85, tone: "hi" }));
  return out.join("");
}

function plateBody(cx) {
  const face = centred(cx, 0, PLATE_W, PLATE_T, 3);
  const y = PLATE_T / 2;
  const top = PLATE_Z + PLATE_H;
  const out = [];
  out.push(S(k.slabOf(face, PLATE_Z, PLATE_H, P, 3, 3), { tone: "hi", crease: "lo" }));
  // Guide strips along both edges of the face, edge to edge.
  out.push(L(k.segment([cx - PLATE_W / 2 + 14, y, PLATE_Z], [cx - PLATE_W / 2 + 14, y, top], P), { tone: "faint" }));
  out.push(L(k.segment([cx + PLATE_W / 2 - 14, y, PLATE_Z], [cx + PLATE_W / 2 - 14, y, top], P), { tone: "faint" }));
  return out.join("");
}

function plateTop(cx) {
  const out = [];
  const top = PLATE_Z + PLATE_H;
  const block = centred(cx, 0, 150, 90, 6);
  out.push(S(k.slabOf(block, top, COUPLING_H, P, 4, 2), { tone: "mid" }));
  out.push(L(k.sideSeam(block, top + COUPLING_H - 14, P, 4), { tone: "faint" }));
  out.push(D([[cx - 55, 0], [cx + 55, 0]].map(([x, yy]) => at([x, yy, top + COUPLING_H])), { size: 0.5 }));
  out.push(S(k.cylinder(cx, 0, 36, top + COUPLING_H, NUT_H, P, 6), { tone: "mid" }));
  return out.join("");
}

// The rod slides out of the gland in the underside of the frame plate; one rod, clipped at the gland face.
function rodOf(cx, index) {
  const F = G.frameAlong([cx, 0, FRAME_Z], [0, 0, -1]);
  const tip = FRAME_Z - (PLATE_Z + PLATE_H + COUPLING_H + NUT_H);
  const rod = G.rodOut(F, 0, tip, ROD_R, P, { stroke: STROKE });
  return `<clipPath id="sc-rod-${index}"><path data-hold d="${rod.clip}"/></clipPath><g clip-path="url(#sc-rod-${index})">${S(rod.paths, { tone: "hi", crease: "none" })}</g>`;
}

// Screen-space clip: everything above the slot outline on the body top shows the plate in front of the body.
function slotClips(cx, index) {
  const z = BODY_H;
  const hw = PLATE_W / 2 + SLOT_GAP;
  const ht = PLATE_T / 2 + SLOT_GAP;
  const corners = [[cx - hw, -ht], [cx + hw, -ht], [cx + hw, ht], [cx - hw, ht]].map(([x, y]) => at([x, y, z]));
  const up = corners.map(([x, y]) => [x, y - 2000]);
  const hull = G.hullOf([...corners, ...up]);
  const box = `M-50 -50H${WIDTH + 50}V${HEIGHT + 50}H-50Z`;
  return `<clipPath id="sc-up-${index}"><path d="${pathOf(hull)}"/></clipPath><clipPath id="sc-down-${index}"><path clip-rule="evenodd" d="${box}${pathOf(hull)}"/></clipPath>`;
}

// ---------- body
function body() {
  const out = [];
  out.push(S(k.slabOf(BODY, 0, BODY_H, P, 6, 4), { tone: "mid", inner: L(k.sideSeam(BODY, 18, P, 6), { tone: "faint" }) }));
  const y = BODY.y + BODY.d;
  // Slots for the plates.
  for (const cx of PLATES) out.push(L(k.planOutline(centred(cx, 0, PLATE_W + 2 * SLOT_GAP, PLATE_T + 2 * SLOT_GAP, 2), BODY_H, P, 2), { tone: "lo" }));
  // Counterbored body bolts on the inlet face.
  const bolts = [-400, 400].flatMap((x) => [70, 190, 310].map((z) => [x, z]));
  out.push(L(bolts.map(([x, z]) => k.sideRing([x, y, z], 22, "y", P, 28)).join(""), { tone: "lo" }));
  out.push(L(bolts.map(([x, z]) => k.sideRing([x, y, z], 13, "y", P, 20)).join(""), { tone: "mid" }));
  out.push(D(bolts.map(([x, z]) => at([x, y, z])), { size: 0.55 }));
  // Inlet flange with the split into two channels.
  const F = G.frameAlong([0, y, AXIS_Z], [0, 1, 0]);
  out.push(S(G.disc(0, 40, 150, F, P), { tone: "mid" }));
  out.push(S(G.disc(40, 48, 95, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 40, 122, 8, P, { all: true, phase: Math.PI / 8 }), { size: 0.7, tone: "mid" }));
  out.push(`<path class="sc-bore" d="${G.circleOf(F, 48, 62, P)}"/>`);
  out.push(L(G.circleOf(F, 48, 62, P), { tone: "mid" }));
  out.push(`<path class="sc-hole" d="${G.circleOf(G.frameAlong([-26, y, AXIS_Z], [0, 1, 0]), 30, 22, P)}"/><path class="sc-hole" d="${G.circleOf(G.frameAlong([26, y, AXIS_Z], [0, 1, 0]), 30, 22, P)}"/>`);
  // Label plate.
  const lx = -270, lz = 330;
  out.push(S(G.prismOf(G.frameOf([lx, y, lz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), [[-55, -16], [55, -16], [55, 16], [-55, 16]], 0, 3, P), { tone: "mid" }));
  out.push(L([[-40, 6, 26], [-40, -1, 14], [-40, -8, 20]].map(([x0, z0, len]) => k.segment([lx + x0, y + 3, lz + z0], [lx + x0 + len * 2.4, y + 3, lz + z0], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([lx - 49, y + 3, lz]), at([lx + 49, y + 3, lz])], { size: 0.45 }));
  // Thermocouple fittings on the right end.
  for (const [yy, z] of [[-40, 120], [60, 260]]) {
    const Fx = G.frameAlong([BODY.x + BODY.w, yy, z], [1, 0, 0]);
    out.push(S(G.disc(0, 14, 14, Fx, P, { steps: 6 }), { tone: "mid" }));
    out.push(S(G.disc(14, 30, 8, Fx, P), { tone: "mid" }));
  }
  // Column collars on the body top.
  for (const x of COLUMNS) out.push(S(k.cylinder(x, 0, 32, BODY_H, 18, P, 6), { tone: "mid" }));
  return out.join("");
}

function column(x) {
  return S(k.cylinder(x, 0, COLUMN_R, BODY_H + 18, FRAME_Z - BODY_H - 18, P, 24), { tone: "mid", crease: "none" });
}

// Melt pressure transducer screwed radially into the inlet flange, before the split and the screens.
function sensor() {
  const x = 0, y = BODY.y + BODY.d + 20;
  const z0 = AXIS_Z + 150 - 1.5;
  const out = [];
  out.push(S(k.cylinder(x, y, 19, z0, 16, P, 6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 6, z0 + 16, 120, P, 14), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(x, y, 22, z0 + 136, 58, P, 28, 2), { tone: "hi" }));
  out.push(L(k.sideArc(x, y, 22, z0 + 156, P, 20), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 10, z0 + 194, 22, P, 16), { tone: "mid" }));
  return out.join("");
}

function frame() {
  const out = [];
  out.push(S(k.slabOf(FRAME, FRAME_Z, FRAME_H, P, 4, 4), { tone: "mid", inner: L(k.sideSeam(FRAME, FRAME_Z + 22, P, 4), { tone: "faint" }) }));
  for (const x of COLUMNS) {
    out.push(S(k.cylinder(x, 0, 34, FRAME_TOP, 20, P, 6), { tone: "mid" }));
    out.push(S(k.cylinder(x, 0, COLUMN_R - 6, FRAME_TOP + 20, 10, P, 18), { tone: "mid" }));
  }
  return out.join("");
}

// Hydraulic cylinder: square caps on tie rods, ports on the caps.
function cylinderUnit(cx) {
  const out = [];
  const z0 = FRAME_TOP;
  const cap = centred(cx, 0, CAP, CAP, 6);
  const barrelZ = z0 + CAP_H;
  const topZ = barrelZ + BARREL_H;
  const rods = byDepth([[-58, -58], [58, -58], [-58, 58], [58, 58]], ([dx, dy]) => [cx + dx, dy, 0]);
  out.push(S(k.slabOf(cap, z0, CAP_H, P, 4, 3), { tone: "mid", inner: L(k.sideSeam(cap, z0 + 24, P, 4), { tone: "faint" }) }));
  const back = rods.slice(0, 2), front = rods.slice(2);
  for (const [dx, dy] of back) out.push(S(k.cylinder(cx + dx, dy, 8, barrelZ, BARREL_H, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(cx, 0, BARREL_R, barrelZ, BARREL_H, P, 40, 2), { tone: "hi", crease: "none", inner: L([barrelZ + 30, topZ - 30].map((z) => k.sideArc(cx, 0, BARREL_R, z, P, 28)).join(""), { tone: "faint" }) }));
  for (const [dx, dy] of front) out.push(S(k.cylinder(cx + dx, dy, 8, barrelZ, BARREL_H, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(cap, topZ, CAP_H, P, 4, 3), { tone: "mid", inner: L(k.sideSeam(cap, topZ + 46, P, 4), { tone: "faint" }) }));
  for (const [dx, dy] of rods) {
    out.push(S(k.cylinder(cx + dx, dy, 13, topZ + CAP_H, 14, P, 6), { tone: "mid" }));
    out.push(S(k.cylinder(cx + dx, dy, 8, topZ + CAP_H + 14, 8, P, 14, 1.5), { tone: "hi" }));
  }
  // Hydraulic ports on both caps, facing the viewer.
  for (const z of [z0 + CAP_H / 2, topZ + CAP_H / 2]) {
    const F = G.frameAlong([cx, CAP / 2, z], [0, 1, 0]);
    out.push(S(G.disc(0, 10, 18, F, P), { tone: "mid" }));
    out.push(S(G.disc(10, 26, 13, F, P, { steps: 6 }), { tone: "mid" }));
    out.push(S(G.disc(26, 34, 9, F, P), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- assemble
const plateGroup = (index, part, content) => `<g data-plate="${index}" data-part="${part}">${content}</g>`;
const lower = PLATES.map((cx, i) => {
  const [low] = windowsOf(cx);
  return `<g clip-path="url(#sc-down-${i})">${plateGroup(i, "low", plateBody(cx) + windowSvg(low[0], low[1], i * 2))}</g>`;
});
const upper = PLATES.map((cx, i) => {
  const [, high] = windowsOf(cx);
  return `<g clip-path="url(#sc-up-${i})">${plateGroup(i, "high", plateBody(cx) + windowSvg(high[0], high[1], i * 2 + 1))}</g>${plateGroup(i, "rod", plateTop(cx) + rodOf(cx, i))}`;
});

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "sc-svg",
  label: "",
  body: [
    `<defs>${PLATES.map((cx, i) => slotClips(cx, i)).join("")}</defs>`,
    platform(),
    pedestal(PEDESTALS[0]),
    lower[0],
    lower[1],
    pedestal(PEDESTALS[1]),
    body(),
    column(COLUMNS[0]),
    upper[0],
    column(COLUMNS[1]),
    upper[1],
    column(COLUMNS[2]),
    sensor(),
    frame(),
    cylinderUnit(PLATES[0]),
    cylinderUnit(PLATES[1]),
  ],
});

const DOWN = k.axisVector(P, [0, 0, -STROKE]);
const DATA = { down: DOWN, stroke: STROKE, change: 2.5 };

const LIGHT = "--anatomy-paper:var(--white,#fff);--anatomy-face:var(--white,#fff);--anatomy-top:var(--white,#fff);--anatomy-shade-0:#dfe4dc;--anatomy-shade-1:#e7ebe4;--anatomy-shade-2:#eef1ec;--anatomy-shade-3:#f5f7f3;--anatomy-lit-top:#fff;--anatomy-lit-shade:#ecf2ee;--anatomy-hi:#202d28;--anatomy-mid:#86918a;--anatomy-lo:#b3bdb5;--anatomy-faint:#d5dcd4;--anatomy-lit:var(--green,#145445);--anatomy-halo:#7f8a7c;--anatomy-halo-opacity:.3;--anatomy-dot:#2c3a33;--anatomy-weight:.6px;--sc-dirt:#5c5448;--sc-hole:#2a3530";
const DARK = "--anatomy-shade-0:#121914;--anatomy-shade-1:#151d17;--anatomy-shade-2:#18211b;--anatomy-shade-3:#1c251f;--anatomy-face:#1e2822;--anatomy-top:#1f2a23;--anatomy-lit-top:#25332b;--anatomy-lit-shade:#203028;--anatomy-hi:#d6e0d9;--anatomy-mid:#6e7c73;--anatomy-lo:#3e4a43;--anatomy-faint:#2a3530;--anatomy-lit:var(--green,#7fcfa9);--anatomy-halo:#040605;--anatomy-halo-opacity:.85;--anatomy-dot:#dfe8e2;--sc-dirt:#5a4a35;--sc-hole:#050706";
const DRAW_CSS = k.ISO_CSS.split("\n").filter((line) => /^\.(iso-(fill|solid|shade|top|line|halo|dots|face-text|wire|crease|edge|bevel)|tb-)/.test(line.trim())).join("\n");
const CSS = `
.sc-svg{${LIGHT}}
:root[data-theme=dark] .sc-svg{${DARK}}
@media (prefers-color-scheme:dark){:root:not([data-theme]) .sc-svg{${DARK}}}
${DRAW_CSS}
.sc-dirt{fill:var(--sc-dirt);stroke:none}
.sc-recess{fill:var(--anatomy-shade-1)}
.sc-bore{fill:var(--anatomy-shade-0);stroke:none}
.sc-hole{fill:var(--sc-hole);stroke:none}
[data-plate]{cursor:pointer}
.sc-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
[data-plate][data-on] .iso-solid>.iso-edge{stroke:var(--anatomy-lit)}
[data-plate][data-on] .iso-solid>.iso-top{fill:var(--anatomy-lit-top)}
[data-plate][data-on] .iso-solid>.iso-shade{fill:var(--anatomy-lit-shade)}
`;

// The site fetches the drawing as one file with its own styles; the page carries only the card.
const fileSvg = svg.replace(/^<svg([^>]*)>/, `<svg$1><style>${CSS.replace(/\s*\n\s*/g, "")}</style>`);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(SITE, "public", "figures", "screen-changer.svg"), fileSvg);
writeFileSync(join(SRC, "figure.json"), JSON.stringify({ ...DATA, width: WIDTH, height: HEIGHT }));

// Standalone preview page for the checks.
const live = readFileSync(join(SRC, "live.js"), "utf8");
const TEXT = (await import(join(SRC, "text.js"))).TEXT.ru;
const card = k.plateHtml({
  fig: TEXT.fig,
  title: TEXT.title,
  hint: TEXT.hint,
  readout: TEXT.idle,
  keys: TEXT.keys,
  caption: TEXT.caption,
  body: `<div class="iso-stage sc-stage" tabindex="0" role="group" aria-label="${TEXT.aria}" data-text='${JSON.stringify({ ...TEXT.live, label: TEXT.label }).replace(/'/g, "&#39;")}' data-figure='${JSON.stringify(DATA)}'>${fileSvg}<span class="sc-live" aria-live="polite"></span></div>`,
});
const name = theme === "light" ? "preview-light.html" : "preview.html";
writeFileSync(join(OUT, name), k.pageHtml({ title: TEXT.title, theme, body: `<style>.sc-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}</style>${card}`, script: live, width: 560 }));
console.log("wrote", name, "·", (fileSvg.length / 1024).toFixed(0), "KB svg");
