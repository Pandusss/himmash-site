// Drawing helpers of the whole-line figure, bound to one projection. World units are millimetres:
// x along the line, y across it (+y toward the viewer), z up, floor at z = 0.
// Every helper returns SVG markup; a unit module composes them and hands its pieces to the painter
// as items with a depth key (see build.mjs).
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../kit/tube.mjs";

export const TAU = Math.PI * 2;
const f1 = (v) => (Math.round(v * 10) / 10).toString();

export function makeLib(P) {
  const V = G.viewOf(P);
  const K = G.scaleOf(P);
  const at = (p) => k.iso(p, P);
  const depth = (p) => k.depthOf(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const pathOf = (points, closed = true) => (points.length ? `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}` : "");
  const path3 = (pts, closed = true) => pathOf(pts.map(at), closed);
  const plan = (x, y, w, d, r = 25) => ({ x, y, w, d, r });

  // ---------- frames
  const FX = (y, z) => G.frameOf([0, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const FY = (x, z) => G.frameOf([x, 0, z], [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
  const FZ = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const PX = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const PY = G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  // A frame along any segment, with u kept horizontal where it can be.
  function frameBetween(a, b) {
    const ax = G.unit3(G.sub3(b, a));
    let u = G.cross3([0, 0, 1], ax);
    if (G.len3(u) < 1e-6) u = [1, 0, 0];
    u = G.unit3(u);
    return G.frameOf(a, ax, u, G.unit3(G.cross3(ax, u)));
  }

  // ---------- solids
  const box = (x, y, w, d, z, h, tone = "mid", { bevel = 0.6, steps = 3, seam = null, seams = [], r = 20, lit = false, inner = "" } = {}) => {
    const p = plan(x, y, w, d, r);
    const lines = [seam, ...seams].filter((v) => v !== null && v !== undefined).map((zz) => L(k.sideSeam(p, zz, P, steps), { tone: "faint" })).join("");
    return S(k.slabOf(p, z, h, P, steps, bevel), { tone, lit, inner: lines + inner });
  };
  const cylX = (x0, x1, y, z, r, tone = "mid", opts = {}) => S(G.disc(x0, x1, r, FX(y, z), P, opts), { tone });
  const cylY = (y0, y1, x, z, r, tone = "mid", opts = {}) => S(G.disc(y0, y1, r, FY(x, z), P, opts), { tone });
  const cylZ = (x, y, z0, z1, r, tone = "mid", steps = 0, bevel = 0) => S(k.cylinder(x, y, r, z0, z1 - z0, P, steps || G.stepsFor(r, 16, 96, K), bevel), { tone });
  const rod = (a, b, r, tone = "mid") => S(G.disc(0, G.len3(G.sub3(b, a)), r, frameBetween(a, b), P), { tone });
  const prismX = (x0, x1, poly, tone = "mid") => S(G.prismOf(PX, poly, x0, x1, P), { tone });
  const prismY = (y0, y1, poly, tone = "mid") => S(G.prismOf(PY, poly, y0, y1, P), { tone });
  const turned = (x, y, z, profile, tone = "mid") => S(G.solidOf(profile, G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]), P), { tone });
  const turnedAlong = (F, profile, tone = "mid") => S(G.solidOf(profile, F, P), { tone });
  const ribs = (F, s0, s1, r, n, tone = "lo") => k.fadedSvg(G.ribsOf(F, s0, s1, r, n, P, { fade: [0.1, 0.55], seams: true }), { tone });

  // A convex polyhedron given by its faces (each a list of 3D points, wound either way): paper fill over the
  // hull, visible faces shaded by facing (tops lighter), creases between visible faces, hull outline.
  function convex(faces, tone = "mid", { lit = false, inner = "" } = {}) {
    const verts = faces.flat();
    const c = verts.reduce((s, p) => G.add3(s, p), [0, 0, 0]).map((v) => v / verts.length);
    const hull = G.hullOf(verts.map(at));
    const shades = ["", "", "", ""];
    let top = "";
    const seen = [];
    for (const f of faces) {
      let n = G.cross3(G.sub3(f[1], f[0]), G.sub3(f[2], f[0]));
      const fc = f.reduce((s, p) => G.add3(s, p), [0, 0, 0]).map((v) => v / f.length);
      if (G.dot3(n, G.sub3(fc, c)) < 0) n = G.mul3(n, -1);
      if (G.dot3(G.unit3(n), V) <= 0.01) continue;
      seen.push(f);
      const d = path3(f);
      const tone = G.toneOf(n, P);
      if (G.unit3(n)[2] > 0.72 || tone > 3) top += d;
      else shades[tone] += d;
    }
    // Creases: edges shared by two visible faces.
    const key = (p) => p.map((v) => Math.round(v)).join(",");
    const count = new Map();
    for (const f of seen) f.forEach((p, i) => {
      const q = f[(i + 1) % f.length];
      const e = [key(p), key(q)].sort().join("|");
      count.set(e, (count.get(e) || { n: 0, p, q }));
      count.get(e).n++;
    });
    let crease = "";
    for (const { n, p, q } of count.values()) if (n === 2) crease += path3([p, q], false);
    const outline = pathOf(hull);
    return S({ fill: outline, shades, top, crease, outline }, { tone, lit, inner });
  }
  // A frustum between two horizontal rectangles (hoppers, chutes, transitions).
  function frustum([x0, y0, w0, d0], z0, [x1, y1, w1, d1], z1, tone = "mid", opts = {}) {
    const b = [[x0, y0, z0], [x0 + w0, y0, z0], [x0 + w0, y0 + d0, z0], [x0, y0 + d0, z0]];
    const t = [[x1, y1, z1], [x1 + w1, y1, z1], [x1 + w1, y1 + d1, z1], [x1, y1 + d1, z1]];
    const sides = [0, 1, 2, 3].map((i) => [b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]]);
    return convex([b, t, ...sides], tone, opts);
  }
  // An open-topped frustum: the same, with the mouth drawn as a dark cavity and its rim line.
  function hopper(bottom, z0, top, z1, tone = "mid", opts = {}) {
    const [x1, y1, w1, d1] = top;
    const mouth = [[x1, y1, z1], [x1 + w1, y1, z1], [x1 + w1, y1 + d1, z1], [x1, y1 + d1, z1]];
    const m = path3(mouth);
    return frustum(bottom, z0, top, z1, tone, opts) + `<path class="ln-cavity" d="${m}"/>` + L(m, { tone: "lo" });
  }
  // A box seen through an opening on its top: cavity polygon with a rim line.
  const cavity = (pts) => { const d = path3(pts); return `<path class="ln-cavity" d="${d}"/>` + L(d, { tone: "lo" }); };
  // Clip paths are collected once for the whole drawing; `clipped` wraps markup in one.
  const defs = [];
  let clipCount = 0;
  function clipped(d, inner) {
    const id = `ln-c${++clipCount}`;
    defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return `<g clip-path="url(#${id})">${inner}</g>`;
  }
  const water = (pts, kind = "clean") => `<path class="ln-water" data-water="${kind}" d="${path3(pts)}"/>`;

  // ---------- machine parts
  // Electric motor along any axis from a to b: fan cowl, finned body, terminal box.
  function motor(a, b, r, { box: tbox = true } = {}) {
    const F = frameBetween(a, b);
    const len = G.len3(G.sub3(b, a));
    const c = len * 0.24;
    const out = [S(G.disc(0, c, r * 0.9, F, P), { tone: "mid" }), S(G.disc(c, len, r, F, P), { tone: "mid", inner: ribs(F, c + len * 0.06, len - len * 0.06, r, 18) })];
    if (tbox) {
      const m = G.add3(a, G.mul3(F.a, len * 0.6));
      const up = Math.abs(F.a[2]) > 0.8 ? F.u : [0, 0, 1];
      const o = G.add3(m, G.mul3(up, r * 0.9));
      out.push(box(o[0] - r * 0.35, o[1] - r * 0.35, r * 0.7, r * 0.7, o[2] - (up === F.u ? r * 0.35 : 0), r * 0.42, "mid", { bevel: 0.3, r: 6 }));
    }
    out.push(S(G.disc(len, len + r * 0.18, r * 0.42, F, P), { tone: "mid" }));
    return out.join("");
  }
  // A bevel or worm gearbox block with a flange, sitting with its base at z.
  function gearbox(x, y, w, d, z, h, tone = "mid") {
    return box(x, y, w, d, z, h * 0.18, "lo", { bevel: 0.3, r: 10 }) + box(x + w * 0.06, y + d * 0.06, w * 0.88, d * 0.88, z + h * 0.18, h * 0.82, tone, { bevel: 0.5, r: 30, seam: z + h * 0.6 });
  }
  // A square-tube leg.
  const leg = (x, y, z0, z1, s = 70, tone = "lo") => box(x - s / 2, y - s / 2, s, s, z0, z1 - z0, tone, { bevel: 0.2, r: 4, steps: 2 });
  // Four legs under a rectangle, inset; returns [far legs, near legs] so a body can sit between them.
  function legs(x, y, w, d, z1, { s = 70, inset = 60, z0 = 0, tone = "lo" } = {}) {
    const pts = [[x + inset, y + inset], [x + w - inset, y + inset], [x + inset, y + d - inset], [x + w - inset, y + d - inset]];
    const far = pts.filter(([, py]) => py < y + d / 2).map(([px, py]) => leg(px, py, z0, z1, s, tone)).join("");
    const near = pts.filter(([, py]) => py >= y + d / 2).map(([px, py]) => leg(px, py, z0, z1, s, tone)).join("");
    return [far, near];
  }
  // A foot plate under a leg.
  const foot = (x, y, s = 140) => box(x - s / 2, y - s / 2, s, s, 0, 18, "lo", { bevel: 0.2, r: 6, steps: 2 });

  // ---------- pipes
  // A pipe along a route of straight legs, filleted; `cls` picks the fill (clean / dirty water, air, plain).
  function pipe(route, r, { bend = 3, tone = "hi", cls = "", flow = "" } = {}) {
    const pts = G.fillet(route, r * bend, 7, { P, tube: r });
    const pieces = tubePieces(pts, r, P, { maxLength: 600, spacing: 1.2 / K });
    // Flow marks: dashes along each chunk's centreline, phased by the screen length from the route's start so
    // they run on without a break through every chunk joint (the CSS animation shifts them all together).
    let screenAt = null;
    if (flow) {
      const cum3 = [0], cumS = [0];
      for (let i = 1; i < pts.length; i++) {
        cum3.push(cum3[i - 1] + G.len3(G.sub3(pts[i], pts[i - 1])));
        const a = at(pts[i - 1]), b = at(pts[i]);
        cumS.push(cumS[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
      screenAt = (d) => {
        let i = 1;
        while (i < cum3.length - 1 && cum3[i] < d) i++;
        const t = (d - cum3[i - 1]) / (cum3[i] - cum3[i - 1] || 1);
        return cumS[i - 1] + (cumS[i] - cumS[i - 1]) * Math.max(0, Math.min(1, t));
      };
    }
    return pieces.map((piece) => {
      let marks = "";
      if (flow && piece.points.length > 1) {
        const off = screenAt(piece.from ?? 0);
        marks = `<path class="ln-flowline" data-flow-kind="${flow}" style="--o:${(-off).toFixed(1)}px" d="${pathOf(piece.points.map(at), false)}"/>`;
      }
      return {
        key: G.dot3(piece.mid, V),
        mid: piece.mid,
        svg: `<g class="ln-pipe"${cls ? ` data-pipe="${cls}"` : ""}>${tubeSvg(piece, { tone })}${marks}</g>`,
      };
    });
  }
  // A flange collar on a route point.
  const flange = (p, dir, r, t = 30, tone = "mid") => S(G.disc(-t / 2, t / 2, r, G.frameAlong(p, dir), P), { tone });

  // ---------- rotating parts, drawn by the page (live.js) every frame
  // A rotor turns about the axis `a` through `o` (u, v radial). Its blades are boxes: radial span r0–r1,
  // width w along the axis, thickness t, tilted by beta about their radius; each sits at axial position s
  // with its own phase. A flight is a screw helicoid from r0 to r1 with a pitch; turning it looks the same
  // as sliding it along the axis, so the page only translates it inside a clip of its envelope.
  // The static shaft sits between the back and front layers, so blades behind it are hidden by it.
  const rotors = [];
  function rotor(id, { o, a, u = null, v = null, speed = 1, blades = [], types = [], shaft = null, core = "", flight = null, clip = null }) {
    const ax = G.unit3(a);
    let uu = u ? G.unit3(u) : G.unit3(G.cross3(Math.abs(ax[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], ax));
    const vv = v ? G.unit3(v) : G.unit3(G.cross3(ax, uu));
    const F = G.frameOf(o, ax, uu, vv);
    let shaftSvg = "";
    if (shaft) shaftSvg = S(G.disc(shaft.s0, shaft.s1, shaft.r, F, P), { tone: shaft.tone || "hi" });
    shaftSvg += typeof core === "function" ? core(F) : core;
    let flightSvg = { back: "", front: "" };
    let flightData = null;
    if (flight) {
      const { s0, s1, r0, r1, pitch, hand = 1 } = flight;
      const turns = (s1 - s0) / pitch + 1;
      const n = Math.ceil(turns * 28);
      const L0 = G.lightOf(P);
      const shades = { back: ["", "", "", ""], front: ["", "", "", ""] };
      const edges = { back: "", front: "" };
      const pt = (s, r, th) => G.add3(G.add3(o, G.mul3(ax, s)), G.add3(G.mul3(uu, r * Math.cos(th)), G.mul3(vv, r * Math.sin(th))));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const th0 = hand * t0 * turns * TAU, th1 = hand * t1 * turns * TAU;
        const sa = s0 - pitch + t0 * turns * pitch, sb = s0 - pitch + t1 * turns * pitch;
        const q = [pt(sa, r0, th0), pt(sa, r1, th0), pt(sb, r1, th1), pt(sb, r0, th1)];
        let nn = G.cross3(G.sub3(q[1], q[0]), G.sub3(q[3], q[0]));
        if (G.dot3(nn, V) < 0) nn = G.mul3(nn, -1);
        const thm = (th0 + th1) / 2;
        const radial = G.add3(G.mul3(uu, Math.cos(thm)), G.mul3(vv, Math.sin(thm)));
        const layer = G.dot3(radial, V) < 0 ? "back" : "front";
        shades[layer][Math.min(3, G.toneOf(nn, P))] += path3(q);
        edges[layer] += path3([q[1], q[2]], false);
      }
      for (const layer of ["back", "front"]) flightSvg[layer] = `<g class="iso-solid">${shades[layer].map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("")}<path class="iso-line iso-edge" data-tone="hi" d="${edges[layer]}"/></g>`;
      // Envelope clip: the hull of the two end rings.
      const ring = (s) => Array.from({ length: 36 }, (_, i) => at(pt(s, r1 + 2, (i / 36) * TAU)));
      const env = G.hullOf([...ring(s0), ...ring(s1)]);
      const step = G.sub3(at(G.add3(o, ax)), at(o));
      flightData = { pitch, hand, step: [step[0], step[1]] };
      const clipId = `ln-f-${id}`;
      defs.push(`<clipPath id="${clipId}"><path d="${pathOf(env)}"/></clipPath>`);
      flightSvg.wrap = (inner) => `<g clip-path="url(#${clipId})"><g data-flight>${inner}</g></g>`;
    }
    rotors.push({ id, o, a: ax, u: uu, v: vv, speed, types, blades, flight: flightData });
    const back = flight ? flightSvg.wrap(flightSvg.back) : "";
    const front = flight ? flightSvg.wrap(flightSvg.front) : "";
    const inner = `<g data-l="back"></g>${back}${shaftSvg}${front}<g data-l="front"></g>`;
    return `<g data-rotor="${id}">${clip ? clipped(clip, inner) : inner}</g>`;
  }
  // Things that slide: slats, a belt's cleats, a bale, bags on a belt. The page translates the group along
  // `dir` at `speed` mm/s, wrapping every `period` mm (a loop) inside `clip` (screen path) when given.
  const slides = [];
  function slide(id, inner, { dir, speed = 200, period = 1000, clip = null, phase = 0 }) {
    const d = G.unit3(dir);
    const step = G.sub3(at(d), at([0, 0, 0]));
    slides.push({ id, step: [step[0], step[1]], speed, period, phase });
    const g = `<g data-slide="${id}">${inner}</g>`;
    return clip ? clipped(clip, g) : g;
  }
  // A square-tube brace between two points (s = section).
  function brace(a, b, s = 50, tone = "lo") {
    const F = frameBetween(a, b);
    const h = s / 2;
    return S(G.prismOf(F, [[-h, -h], [h, -h], [h, h], [-h, h]], 0, G.len3(G.sub3(b, a)), P), { tone });
  }
  // A pillow-block bearing on a shaft along `axis` ("x" or "y") at point c, its foot down.
  function pillow(c, axis = "y", r = 70) {
    const [x, y, z] = c;
    const out = [];
    if (axis === "y") {
      out.push(box(x - r * 1.6, y - r * 0.5, r * 3.2, r, z - r * 1.2, r * 0.45, "lo", { bevel: 0.2, r: 6, steps: 2 }));
      out.push(cylY(y - r * 0.5, y + r * 0.5, x, z, r, "mid"));
    } else {
      out.push(box(x - r * 0.5, y - r * 1.6, r, r * 3.2, z - r * 1.2, r * 0.45, "lo", { bevel: 0.2, r: 6, steps: 2 }));
      out.push(cylX(x - r * 0.5, x + r * 0.5, y, z, r, "mid"));
    }
    return out.join("");
  }
  // Bolt heads as dots at world points.
  const bolts = (pts, size = 0.45) => D(pts.map(at), { size });

  // Material moving along a polyline (flakes, pellets): the page moves dots along it.
  const flows = [];
  // size is in millimetres (a flake about 40, a pellet about 25), so dots keep their size as the camera zooms.
  function flow(id, points, { speed = 400, count = 12, size = 40, spread = 0, kind = "flake" } = {}) {
    flows.push({ id, points, speed, count, size: Math.max(0.2, (size / 2) * K), spread, kind });
    return `<g class="ln-flow" data-flow="${id}"></g>`;
  }

  return {
    k, G, P, V, K, at, depth, S, L, D, pathOf, path3, plan,
    FX, FY, FZ, frameBetween,
    box, cylX, cylY, cylZ, rod, prismX, prismY, turned, turnedAlong, ribs, convex, frustum, hopper, cavity, water, defs, clipped,
    motor, gearbox, leg, legs, foot, pipe, flange, rotor, rotors, flow, flows, slide, slides, brace, pillow, bolts,
  };
}
