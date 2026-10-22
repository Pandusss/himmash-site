// A figure of one machine cut from the whole-line drawing, for the machine's own page: the same unit modules, drawn
// alone on a floor slab with a closer camera, with the same live parts (rotors, material, slides, water marks).
// The camera fits itself in three passes: a plan view (elevation 90°, azimuth 90°: x and y map straight onto the
// drawing) gives the unit's footprint and so the slab; a first iso view measures the drawing; the last one scales
// and centres it in the card. Units come from the line rows by id, or from `make(L)` for a composition of its own.
import * as k from "../kit/iso-kit.mjs";
import { SVG_CLASS, writeFigure, writePreview } from "../shared.mjs";
import { makeLib } from "./lib.mjs";
import { washingRow } from "./washing.mjs";
import { pelletizingRow } from "./pelletizing.mjs";
import { CSS, thinSvg } from "./style.mjs";

// The drawing's box in its own units, from every path point (the kit draws with M, L and Z only) and circle.
function boxOf(markup) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { if (!isFinite(x) || !isFinite(y)) return; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const [, d] of markup.matchAll(/ d="([^"]*)"/g)) {
    const n = d.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) add(n[i], n[i + 1]);
  }
  for (const [, cx, cy, r] of markup.matchAll(/<circle[^>]* cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)) { add(+cx - +r, +cy - +r); add(+cx + +r, +cy + +r); }
  return { x0, y0, x1, y1 };
}

export async function unitFigure({ id, units: ids = [], make = null, azimuth = 52, elevation = 32, width = 520, margin = 450, pad = 22, minHeight = 340, maxHeight = 560, lit = null, values = {}, data = {} }) {
  const theme = process.argv.includes("--light") ? "light" : "dark";
  function draw(P) {
    const L = makeLib(P);
    // Units check this to end their connections to units left out of the figure (a flange instead of a dangling pipe).
    L.alone = new Set(ids);
    let units;
    if (make) units = make(L);
    else {
      const all = [...washingRow(L).units, ...pelletizingRow(L).units];
      units = ids.map((u) => all.find((x) => x.id === u)).filter(Boolean);
      if (units.length !== ids.length) throw new Error(`${id}: unknown unit among ${ids.join(", ")}`);
    }
    const items = units.flatMap((u) => u.items.map((it) => ({ key: it.key, svg: `<g data-part="${u.id}" data-hit>${it.svg}</g>` })));
    items.sort((a, b) => a.key - b.key);
    return { L, markup: items.map((it) => it.svg).join("") };
  }

  // 1. Plan view: the footprint, and the slab round it.
  const PLAN = { origin: [0, 0], scale: 1, azimuth: 90, elevation: 90 };
  const pb = boxOf(draw(PLAN).markup), kp = k.cameraOf(PLAN).k;
  const plan = { x0: pb.x0 / kp, y0: pb.y0 / kp, x1: pb.x1 / kp, y1: pb.y1 / kp };
  const R = 50;
  const slab = { x: Math.floor((plan.x0 - margin) / R) * R, y: Math.floor((plan.y0 - margin) / R) * R };
  slab.w = Math.ceil((plan.x1 + margin) / R) * R - slab.x;
  slab.d = Math.ceil((plan.y1 + margin) / R) * R - slab.y;

  function floor(L) {
    const pl = L.plan(slab.x, slab.y, slab.w, slab.d, 60);
    const out = [`<path class="iso-halo" d="${k.haloOf(pl, -140, 140, L.P)}"/>`];
    out.push(L.S(k.slabOf(pl, -140, 140, L.P, 3, 1.2), { tone: "lo", inner: L.L(k.sideSeam(pl, -70, L.P, 3), { tone: "faint" }) }));
    // Floor joints every metre, and anchor plates are the units' own.
    const joints = [];
    for (let x = Math.ceil((slab.x + 300) / 1000) * 1000; x < slab.x + slab.w - 300; x += 1000) joints.push(L.path3([[x, slab.y + 60, 0], [x, slab.y + slab.d - 60, 0]], false));
    for (let y = Math.ceil((slab.y + 300) / 1000) * 1000; y < slab.y + slab.d - 300; y += 1000) joints.push(L.path3([[slab.x + 60, y, 0], [slab.x + slab.w - 60, y, 0]], false));
    out.push(L.L(joints.join(""), { tone: "faint" }));
    return out.join("");
  }

  // 2. A first iso view with the slab, measured; 3. the same view scaled and centred in the card.
  const corners = [[slab.x, slab.y], [slab.x + slab.w, slab.y], [slab.x + slab.w, slab.y + slab.d], [slab.x, slab.y + slab.d]].flatMap(([x, y]) => [[x, y, -140], [x, y, 0]]);
  const P0 = k.fitProjection(corners, width, width, { pad, azimuth, elevation });
  const first = draw(P0);
  const b = boxOf(floor(first.L) + first.markup);
  const bw = (b.x1 - b.x0) / P0.scale, bh = (b.y1 - b.y0) / P0.scale;
  const height = Math.round(Math.min(maxHeight, Math.max(minHeight, ((width - pad * 2) * bh) / bw + pad * 2)));
  const scale = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh);
  const cx = ((b.x0 + b.x1) / 2 - P0.origin[0]) / P0.scale, cy = ((b.y0 + b.y1) / 2 - P0.origin[1]) / P0.scale;
  const P = { origin: [width / 2 - cx * scale, height / 2 - cy * scale], scale, azimuth, elevation };
  const { L, markup } = draw(P);

  const body = [`<defs>${L.defs.join("")}</defs>`, floor(L), markup];
  const svg = k.figureSvg({ width, height, className: SVG_CLASS, label: "", body });
  const has = (attr, key) => markup.includes(`${attr}="${key}"`);
  const DATA = {
    proj: (() => { const c = k.cameraOf(P); return { ox: P.origin[0], oy: P.origin[1], k: c.k, sinA: c.sinA, cosA: c.cosA, sinE: c.sinE, cosE: c.cosE }; })(),
    light: L.G.lightOf(P),
    bands: [0, 0.2, 0.42, 0.62],
    rotors: L.rotors.filter((r) => has("data-rotor", r.id)),
    flows: L.flows.filter((f) => has("data-flow", f.id)),
    slides: L.slides.filter((s) => has("data-slide", s.id)),
    lit,
    values,
    ...data,
  };
  const file = writeFigure({ id, svg: thinSvg(svg), css: CSS, data: DATA, width, height });
  const page = await writePreview({ id, file, data: DATA, theme, width: 600 });
  console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg ·", `${width}×${height}`, "·", DATA.rotors.length, "rotors,", DATA.flows.length, "flows,", DATA.slides.length, "slides");
}
