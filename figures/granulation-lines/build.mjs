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
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";
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
const ORDER = ["breaker", "belt", "shredder", "screw1", "wash2", "fric1", "intense", "fric2", "flot", "transfer", "rinse", "screw2", "centrifuge", "dryer", "aero", "hopper", "feeder", "extruder", "changer", "head", "pelletdry", "bagging", "t5000"];
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

const f1 = (v) => (Math.round(v * 10) / 10).toString();
// Douglas-Peucker thinning of the kit's dense outlines and tone sheets (the same for a fill and its outline).
function thin(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let worst = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dd = len > 1e-6 ? Math.abs((px - ax) * dy - (py - ay) * dx) / len : Math.hypot(px - ax, py - ay);
      if (dd > worst) { worst = dd; idx = i; }
    }
    if (worst > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
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
const thinSvg = (markup) => markup.replace(/(<path class="(?:iso-fill|iso-line iso-edge|iso-line iso-crease|iso-line iso-bevel|iso-shade|iso-top|tb-body|tb-shine|tb-shade|iso-line tb-edge)"[^>]*? d=")([^"]*)"/g, (_, head, d) => `${head}${thinPath(d)}"`);

const DATA = {
  view: { origin: P.origin, scale: P.scale, azimuth: P.azimuth, elevation: P.elevation },
  units: ORDER,
  // Units with a page of their own (the link is relative to this page: ../<slug>/).
  links: { fric1: "friction-washer", fric2: "friction-washer", flot: "flotation-machine", rinse: "flotation-machine", centrifuge: "centrifuge", aero: "pneumatic-conveying", hopper: "storage-hopper", feeder: "screw-feeder", extruder: "vacuum-degassing", changer: "screen-changer", head: "granulation-head", t5000: "water-treatment-t5000" },
  proj: (() => { const c = k.cameraOf(P); return { ox: P.origin[0], oy: P.origin[1], k: c.k, sinA: c.sinA, cosA: c.cosA, sinE: c.sinE, cosE: c.cosE }; })(),
  light: L.G.lightOf(P),
  bands: [0, 0.2, 0.42, 0.62],
  rotors: L.rotors,
  flows: L.flows,
  slides: L.slides,
};

const CSS = figureCss(`
.fig-svg{overflow:hidden}
/* Lines keep their screen width as the camera moves in, so a close view stays a fine drawing. */
.fig-svg :is(.iso-line,.tb-edge,.ln-ripple,.ln-heat){vector-effect:non-scaling-stroke}
.fig-svg .iso-line{stroke-width:max(var(--anatomy-weight),.75px)}
.ln-dot{stroke:var(--ln-flake-edge);stroke-width:.25px}
.ln-raw{fill:var(--ln-raw)}.ln-wash{fill:var(--ln-wash)}.ln-rinse{fill:var(--ln-rinse)}.ln-clean{fill:var(--ln-cleanflake)}.ln-dry{fill:var(--ln-dry)}.ln-flake{fill:var(--ln-wash)}
.ln-pellet{fill:var(--ln-pellet);stroke:none}
.ln-spray{fill:var(--ln-clean-edge);stroke:none;opacity:.7}
.ln-ripple{fill:none;stroke:var(--ln-ripple);stroke-width:.35px;stroke-linecap:round}
.ln-heat{fill:none;stroke:var(--ln-heat);stroke-width:.6px;stroke-linecap:round}
.ln-hot .iso-shade,.ln-hot .iso-top{animation:ln-glow 2.4s ease-in-out infinite alternate}
.ln-melt{animation:ln-glow-melt 1.8s ease-in-out infinite alternate}
@keyframes ln-glow{from{fill:var(--ln-hot1)}to{fill:var(--ln-hot2)}}
@keyframes ln-glow-melt{from{fill:var(--ln-melt)}to{fill:var(--ln-melt2)}}
.fig-svg[data-stopped] :is(.ln-hot .iso-shade,.ln-hot .iso-top,.ln-melt){animation-play-state:paused}
@media (prefers-reduced-motion:reduce){:is(.ln-hot .iso-shade,.ln-hot .iso-top,.ln-melt){animation:none}}
.ln-cavity{fill:var(--ln-cavity);stroke:none}
.ln-glass{fill:var(--ln-glass);stroke:none}
.ln-water[data-water=clean]{fill:var(--ln-clean-fill);stroke:none}
.ln-water[data-water=dirty]{fill:var(--ln-dirty-fill);stroke:none}
.ln-water[data-water=mid]{fill:var(--ln-mid-fill);stroke:none}
.ln-water[data-water=body]{fill:var(--ln-body);stroke:none}
.ln-fill{fill:var(--ln-flakes);stroke:none}
.ln-melt{fill:var(--ln-melt);stroke:none}
.ln-grit{fill:var(--anatomy-hi);stroke:none}
.ln-paper{fill:var(--anatomy-paper);stroke:var(--anatomy-mid);stroke-width:.3px}
[data-pipe=clean] .tb-body{fill:var(--ln-clean-fill)}
[data-pipe=clean] .tb-shine{fill:var(--ln-clean-shine)}
[data-pipe=clean] .tb-shade{fill:var(--ln-clean-shade)}
[data-pipe=clean] .tb-edge{stroke:var(--ln-clean-edge)}
[data-pipe=dirty] .tb-body{fill:var(--ln-dirty-fill)}
[data-pipe=dirty] .tb-shine{fill:var(--ln-dirty-shine)}
[data-pipe=dirty] .tb-shade{fill:var(--ln-dirty-shade)}
[data-pipe=dirty] .tb-edge{stroke:var(--ln-dirty-edge)}
[data-pipe=mid] .tb-body{fill:var(--ln-mid-fill)}
[data-pipe=mid] .tb-edge{stroke:var(--anatomy-mid)}
.ln-flowline[data-flow-kind=mid]{stroke:var(--anatomy-mid)}
.ln-foam{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.3px}
.ln-bubble{fill:none;stroke:var(--anatomy-mid);stroke-width:.3px}
.ln-flowline{fill:none;stroke-width:.7px;stroke-linecap:round;stroke-dasharray:1.6 7.4;stroke-dashoffset:var(--o);animation:ln-flow 1.1s linear infinite}
.ln-flowline[data-flow-kind=clean]{stroke:var(--ln-clean-edge)}
.ln-flowline[data-flow-kind=dirty]{stroke:var(--ln-dirty-edge)}
.ln-flowline[data-flow-kind=air]{stroke:var(--anatomy-mid);animation-duration:.5s}
@keyframes ln-flow{from{stroke-dashoffset:var(--o)}to{stroke-dashoffset:calc(var(--o) - 9px)}}
.fig-svg[data-stopped] .ln-flowline{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.ln-flowline{animation:none}}`, {
  light: "--ln-cavity:#c9d0c7;--ln-glass:#dfe8ea;--ln-clean-fill:#cfe3f4;--ln-clean-shine:#e6f1fb;--ln-clean-shade:#a9c8e6;--ln-clean-edge:#2f6fae;--ln-dirty-fill:#e3d6c3;--ln-dirty-shine:#efe6d8;--ln-dirty-shade:#cdb898;--ln-dirty-edge:#8a6a3c;--ln-mid-fill:#dde3e0;--ln-body:#d9cdb8;--ln-flakes:#d6dcd2;--ln-melt:#e8c9a0;--ln-raw:#8c7454;--ln-wash:#ad9876;--ln-rinse:#cdbfa3;--ln-cleanflake:#e9e4d6;--ln-dry:#fff;--ln-pellet:#4d5c55;--ln-flake-edge:#5a4a35;--ln-ripple:#9f8a68;--ln-heat:#d2793d;--ln-hot1:#f4dcc4;--ln-hot2:#f6b98b;--ln-melt2:#f2a35a",
  dark: "--ln-cavity:#0b100d;--ln-glass:#1f2e31;--ln-clean-fill:#1d3a55;--ln-clean-shine:#2a5378;--ln-clean-shade:#152b40;--ln-clean-edge:#7fb6ee;--ln-dirty-fill:#3d3121;--ln-dirty-shine:#54442d;--ln-dirty-shade:#2c2317;--ln-dirty-edge:#c9a26a;--ln-mid-fill:#24302c;--ln-body:#3a3022;--ln-flakes:#2f3a33;--ln-melt:#5a4128;--ln-raw:#7d6545;--ln-wash:#9b8766;--ln-rinse:#bcae92;--ln-cleanflake:#dcd7c8;--ln-dry:#f2f2ee;--ln-pellet:#a9b7ae;--ln-flake-edge:#1a140c;--ln-ripple:#6d5a3d;--ln-heat:#e08a4e;--ln-hot1:#3a2a1e;--ln-hot2:#7a3e1c;--ln-melt2:#b5602a",
});

const file = writeFigure({ id: "granulation-lines", svg: thinSvg(svg), css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: "granulation-lines", file, data: DATA, theme, width: 1180 });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg ·", items.length, "items");
