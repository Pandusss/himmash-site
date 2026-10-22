// Линия КПТБО-300 целиком: the whole recycling complex of NPO Himmash as one interactive isometric drawing,
// from the bale breaker to bagged pellets, with the T-5000 water treatment and its clean (blue) and dirty
// (brown) water. Built with the anatomy kit; see figures/README.md. The parts live in modules:
//   layout.mjs        where things stand
//   lib.mjs           drawing helpers bound to the projection
//   washing.mjs       the washing row (back)
//   pelletizing.mjs   the pelletizing row (front)
//   water.mjs         T-5000, the water network, the pneumatic line
// Every unit hands its drawing to the painter as items with a depth key; pipes are chunked so they sort
// against the machines they pass. `node figures/granulation-lines/build.mjs [--light]`.
import * as k from "../kit/iso-kit.mjs";
import { SVG_CLASS, writeFigure, writePreview } from "../shared.mjs";
import { CSS, thinSvg } from "./style.mjs";
import { makeLib } from "./lib.mjs";
import { FLOOR, YB, YF } from "./layout.mjs";
import { washingRow } from "./washing.mjs";
import { pelletizingRow } from "./pelletizing.mjs";
import { waterSystem } from "./water.mjs";
import { hall } from "./units/hall.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 1000;
const HEIGHT = 430;
const AZIMUTH = 72;
const ELEVATION = 44;

// ---------- camera
const F = FLOOR;
const EXTREMES = [
  ...[[F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.d], [F.x, F.y + F.d]].flatMap(([x, y]) => [[x, y, -150], [x, y, 0]]),
  [40250, YB, 4400], [38500, 2550, 4400], [41500, YB - 1200, 3900], [-950, YB - 1550, 3200], [36000, 4300, 2200], [F.x, F.y, 4500], [F.x + F.w, F.y, 4500], [F.x, F.y + F.d, 4500],
];
const P = k.fitProjection(EXTREMES, WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH, elevation: ELEVATION, headroom: 8 });
const L = makeLib(P);

// ---------- floor: one hall floor with expansion joints, a painted aisle and anchor plates
function floor() {
  const out = [];
  const pl = L.plan(F.x, F.y, F.w, F.d, 80);
  out.push(`<path class="iso-halo" d="${k.haloOf(pl, -150, 150, P)}"/>`);
  out.push(L.S(k.slabOf(pl, -150, 150, P, 3, 1.2), { tone: "lo", inner: L.L(k.sideSeam(pl, -75, P, 3), { tone: "faint" }) }));
  const joints = [];
  for (let x = F.x + 6000; x < F.x + F.w; x += 6000) joints.push(L.path3([[x, F.y, 0], [x, F.y + F.d, 0]], false));
  joints.push(L.path3([[F.x, 0, 0], [F.x + F.w, 0, 0]], false));
  out.push(L.L(joints.join(""), { tone: "faint" }));
  // Painted aisle lines between the rows.
  out.push(L.L(L.path3([[F.x, -700, 0], [F.x + F.w, -700, 0]], false) + L.path3([[F.x, 550, 0], [F.x + F.w, 550, 0]], false), { tone: "lo" }));
  return out.join("");
}

// ---------- units and items
const wash = washingRow(L);
const pel = pelletizingRow(L);
const wat = waterSystem(L, wash.ports);
const units = [...wash.units, ...pel.units, ...wat.units];
// Units the reader steps through, in the order the material meets them.
const ORDER = ["breaker", "belt", "shredder", "screw1", "wash2", "fric1", "intense", "fric2", "flot", "transfer", "rinse", "screw2", "centrifuge", "dryer", "aero", "hopper", "feeder", "extruder", "changer", "head", "pelletdry", "bagging", "t5000", "cabinet"];
const index = new Map(ORDER.map((id, i) => [id, i]));
const items = [];
for (const u of units) for (const it of u.items) {
  const i = index.get(u.id);
  items.push({ key: it.key, svg: i === undefined ? `<g data-part="${u.id}">${it.svg}</g>` : `<g data-unit="${i}" data-hit>${it.svg}</g>` });
}
items.push(...hall(L));
const flows = [];
for (const it of wat.items) {
  if (it.flow) { flows.push(it.flow); continue; }
  items.push(it);
}
items.sort((a, b) => a.key - b.key);

const body = [`<defs>${L.defs.join("")}</defs>`, floor(), ...items.map((it) => it.svg)];
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: SVG_CLASS, label: "", body });

const DATA = {
  view: { origin: P.origin, scale: P.scale, azimuth: P.azimuth, elevation: P.elevation },
  units: ORDER,
  // Units 0…chain-1 are the material's path; the rest (water treatment, cabinet) stand apart from it.
  chain: ORDER.indexOf("t5000"),
  // Units with a page of their own (the link is relative to this page: ../<slug>/).
  links: { breaker: "bale-breaker", belt: "conveyors", shredder: "shredder", screw1: "conveyors", wash2: "flotation-machine", fric1: "friction-washer", intense: "intensive-washer", fric2: "friction-washer", flot: "flotation-bath", transfer: "conveyors", rinse: "flotation-bath", screw2: "conveyors", dryer: "dryer-spu-500", pelletdry: "pellet-dryer", bagging: "bagging", centrifuge: "centrifuge", aero: "air-separator", hopper: "storage-hopper", feeder: "screw-feeder", extruder: "vacuum-degassing", changer: "screen-changer", head: "granulation-head", t5000: "water-treatment-t5000" },
  proj: (() => { const c = k.cameraOf(P); return { ox: P.origin[0], oy: P.origin[1], k: c.k, sinA: c.sinA, cosA: c.cosA, sinE: c.sinE, cosE: c.cosE }; })(),
  light: L.G.lightOf(P),
  bands: [0, 0.2, 0.42, 0.62],
  rotors: L.rotors,
  flows: L.flows,
  slides: L.slides,
};

const file = writeFigure({ id: "granulation-lines", svg: thinSvg(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "granulation-lines", file, data: DATA, theme, width: 1180 });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg ·", items.length, "items");
