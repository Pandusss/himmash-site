// Система очистки сточных вод Т-5000: an interactive isometric figure built with the anatomy kit.
// World units are millimetres. The container block runs along x (inlet end x = 0, outlet end x = CL),
// y across it (the near long wall and the roof are cut away, the open side faces +y), z up from the floor.
// Five stages in series, as on the maker's diagrams: 1 intake and equalisation with a step screen,
// 2 electroflotation and electrocoagulation, 3 mechanical and sorption filters, 4 bactericidal treatment,
// 5 clean water tank with two outlets: back to the washing line, or to the sewer. Flotation sludge goes to a tote.
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { SVG_CLASS, figureCss, writeFigure, writePreview } from "../shared.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const ID = "water-treatment-t5000";

const WIDTH = 520;
const HEIGHT = 400;

// ---------- container (height up to 2 500 mm by spec; length estimated from the maker's picture)
const CL = 10000;
const CW = 1200;            // half width
const WALL = 30;
const ZF = -120;            // underside of the floor frame
const ZH = 2280;            // top of the walls
const ZR = 2380;            // top of the top rails
const PR = 55;              // main pipe radius
const EL = 78;              // elbow ball radius

const P = k.fitProjection(
  [
    [-30, -CW, ZF], [-30, CW, ZF], [CL + 360, -CW, ZF], [CL + 360, CW, ZF],
    [-30, -CW, ZR], [-30, CW, ZR], [CL + 30, CW, ZR], [CL + 30, -CW, ZR],
  ],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 60, elevation: 40 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const plan = (x, y, w, d, r = 4) => ({ x, y, w, d, r });
const box = ([x0, y0, z0], [x1, y1, z1], r = 3, steps = 2) => k.slabOf(plan(x0, y0, x1 - x0, y1 - y0, r), z0, z1 - z0, P, steps);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const alongX = (o) => G.frameAlong(o, [1, 0, 0]);
const alongY = (o) => G.frameAlong(o, [0, 1, 0]);
const alongZ = (o) => G.frameAlong(o, [0, 0, 1]);
const depth = (p) => G.dot3(p, V);

// ---------- pipes: straight legs along the axes, ball elbows at the corners, flanges where they land
function pipe(points, { r = PR, flanges = [true, true], tone = "mid", flow = null, cls = "" } = {}) {
  const out = [];
  const items = [];
  const ball = EL * (r / PR);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const axis = a[0] !== b[0] ? 0 : a[1] !== b[1] ? 1 : 2;
    const sign = Math.sign(b[axis] - a[axis]);
    const cut = Math.sqrt(ball * ball - r * r);
    const s0 = i > 0 ? cut : 0;
    const s1 = Math.abs(b[axis] - a[axis]) - (i < points.length - 2 ? cut : 0);
    const dir = [0, 0, 0];
    dir[axis] = sign;
    const F = G.frameAlong(a, dir);
    const mid = G.add3(a, G.mul3(dir, (s0 + s1) / 2));
    items.push({ at: mid, svg: S(G.disc(s0, s1, r, F, P, { rims: "none", steps: 12 }), { tone, crease: "none" }) });
    if (i === 0 && flanges[0]) items.push({ at: a, svg: S(G.disc(0, 18, r * 1.85, F, P, { steps: 12 }), { tone: "mid" }), bias: 1 });
    if (i === points.length - 2 && flanges[1]) items.push({ at: b, svg: S(G.disc(s1 - 18, s1, r * 1.85, F, P, { steps: 12 }), { tone: "mid" }), bias: 1 });
    if (i > 0) items.push({ at: a, svg: S(G.sphereOf(a, ball, P, { steps: 12 }), { tone: "mid" }), bias: 2 });
  }
  items.sort((p, q) => depth(p.at) + (p.bias || 0) - depth(q.at) - (q.bias || 0));
  out.push(...items.map((item) => item.svg));
  if (flow) out.push(`<path class="wt-flow ${flow}" data-flow d="${path3(points)}"/>`);
  return `<g${cls ? ` class="${cls}"` : ""}>${out.join("")}</g>`;
}
// A ball valve with a lever on a straight leg.
function ballValve(c, axis) {
  const out = [];
  out.push(S(G.sphereOf(c, 82, P, { steps: 28 }), { tone: "mid" }));
  out.push(S(k.cylinder(c[0], c[1], 14, c[2] + 76, 40, P, 14), { tone: "mid" }));
  const lever = axis === "x" ? box([c[0] - 8, c[1] - 8, c[2] + 116], [c[0] + 8, c[1] + 190, c[2] + 130], 2) : box([c[0] - 8, c[1] - 8, c[2] + 116], [c[0] + 190, c[1] + 8, c[2] + 130], 2);
  out.push(S(lever, { tone: "mid" }));
  return out.join("");
}

// ---------- open tank: walls, inner faces and water seen through the top opening
function openTank(id, pl, h, water, waterClass) {
  const out = [];
  const t = 20;
  out.push(S(k.slabOf(pl, 0, h, P, 3, 2), { tone: "mid", inner: Ln(k.sideSeam(pl, h - 60, P, 3), { tone: "faint" }) }));
  const inner = k.insetPlan(pl, t);
  const opening = k.pathOf(k.roundedPlan(inner, 3).map(([x, y]) => at([x, y, h])), true);
  const x0 = inner.x, x1 = inner.x + inner.w, y0 = inner.y, y1 = inner.y + inner.d;
  const backFace = [[x0, y0, h], [x1, y0, h], [x1, y0, water], [x0, y0, water]];
  const leftFace = [[x0, y0, h], [x0, y1, h], [x0, y1, water], [x0, y0, water]];
  const surface = [[x0, y0, water], [x1, y0, water], [x1, y1, water], [x0, y1, water]];
  out.push(`<clipPath id="wt-open-${id}"><path d="${opening}"/></clipPath>`);
  out.push(`<g clip-path="url(#wt-open-${id})">`);
  out.push(`<path class="iso-shade" data-shade="2" d="${path3(backFace, true)}"/>`);
  out.push(`<path class="iso-shade" data-shade="1" d="${path3(leftFace, true)}"/>`);
  out.push(`<path class="${waterClass}" d="${path3(surface, true)}"/>`);
  out.push(Ln(path3([[x0, y0, water], [x1, y0, water]]), { tone: "lo" }));
  out.push(Ln(path3([[x0, y0, water], [x0, y1, water]]), { tone: "lo" }));
  out.push(`</g>`);
  out.push(Ln(opening, { tone: "lo" }));
  return out.join("");
}

// ---------- container shell
function container(part) {
  const out = [];
  if (part === "back") {
    const base = plan(-WALL, -CW, CL + 2 * WALL, 2 * CW, 2);
    out.push(`<path class="iso-halo" d="${k.haloOf(plan(-WALL, -CW, CL + 400, 2 * CW, 30), ZF, 200, P)}"/>`);
    out.push(S(k.slabOf(base, ZF, -ZF, P, 2, 2), { tone: "lo", inner: Ln(k.sideSeam(base, -22, P, 2), { tone: "faint" }) }));
    // Forklift pockets in the near side rail: closed slots.
    for (const x of [3300, 6700]) out.push(Ln(path3([[x - 180, CW, -95], [x + 180, CW, -95], [x + 180, CW, -40], [x - 180, CW, -40]], true), { tone: "lo" }), `<path class="wt-dark" d="${path3([[x - 180, CW, -95], [x + 180, CW, -95], [x + 180, CW, -40], [x - 180, CW, -40]], true)}"/>`);
    // Back wall with its corrugation, seen from inside.
    out.push(S(box([-WALL, -CW, 0], [CL + WALL, -CW + WALL, ZH], 0, 1), { tone: "mid", crease: "lo" }));
    const lines = [];
    for (let x = 140; x < CL - 60; x += 280) lines.push(k.segment([x, -CW + WALL, 0], [x, -CW + WALL, ZH], P));
    out.push(Ln(lines.join(""), { tone: "faint" }));
    // Left end wall, inner face.
    out.push(S(box([-WALL, -CW + WALL, 0], [0, CW, ZH], 0, 1), { tone: "mid", crease: "lo" }));
    const ends = [];
    for (let y = -CW + 200; y < CW - 100; y += 240) ends.push(k.segment([0, y, 0], [0, y, ZH], P));
    out.push(Ln(ends.join(""), { tone: "faint" }));
    // Top rails and the back-left corner post.
    out.push(S(box([-WALL, -CW, ZH], [CL + WALL, -CW + 150, ZR], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([-WALL, -CW + 150, ZH], [120, CW, ZR], 0, 1), { tone: "mid", crease: "lo" }));
  } else if (part === "nearLeft") {
    out.push(S(box([-WALL, CW - 150, ZF], [120, CW, ZR], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(corner([-WALL, CW - 150, ZR - 110]), corner([-WALL, CW - 150, ZF]));
  } else if (part === "right") {
    // Outlet end: the door end of the container, seen from outside.
    out.push(S(box([CL, -CW, 0], [CL + WALL, CW, ZH], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([CL - 120, -CW + 150, ZH], [CL + WALL, CW, ZR], 0, 1), { tone: "mid", crease: "lo" }));
    const xf = CL + WALL;
    out.push(Ln(k.segment([xf, 0, 0], [xf, 0, ZH], P), { tone: "lo" }));
    for (const y of [-820, -380, 380, 820]) {
      out.push(S(k.cylinder(xf + 16, y, 14, 80, ZH - 160, P, 8), { tone: "mid", crease: "none" }));
      out.push(S(box([xf, y - 26, 60], [xf + 30, y + 26, 100], 2), { tone: "mid" }), S(box([xf, y - 26, ZH - 100], [xf + 30, y + 26, ZH - 60], 2), { tone: "mid" }));
      out.push(S(box([xf + 14, y - 10, 1000], [xf + 44, y + 110, 1040], 2), { tone: "mid" }));
    }
    for (const z of [300, 1900]) out.push(S(box([xf, -CW + 20, z], [xf + 24, -CW + 90, z + 120], 2), { tone: "mid" }), S(box([xf, CW - 90, z], [xf + 24, CW - 20, z + 120], 2), { tone: "mid" }));
  } else if (part === "nearRight") {
    out.push(S(box([CL - 120, CW - 150, ZF], [CL + WALL, CW, ZR], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(corner([CL - 120, CW - 150, ZR - 110]), corner([CL - 120, CW - 150, ZF]));
  }
  return out.join("");
}
// Corner casting with its oval holes.
function corner([x, y, z]) {
  const out = [S(box([x - 4, y - 4, z], [x + 154, y + 154, z + 110], 2), { tone: "mid" })];
  const hole = Array.from({ length: 16 }, (_, i) => at([x + 75 + 38 * Math.cos((i / 16) * 2 * Math.PI), y + 154, z + 55 + 22 * Math.sin((i / 16) * 2 * Math.PI)]));
  out.push(`<path class="wt-dark" d="${k.pathOf(hole, true)}"/>`, Ln(k.pathOf(hole, true), { tone: "lo" }));
  return out.join("");
}

// ---------- stage 1: intake and equalisation tank with a step screen
const T1 = plan(900, -1100, 1400, 1150, 6);
const T1_H = 1300, T1_W = 1150;
const SCREEN = { y0: -880, y1: -380, bottom: [1420, T1_W], top: [560, 2060] };
function binOf(pl, h, id) {
  const out = [S(k.slabOf(pl, 0, h, P, 3, 2), { tone: "mid", inner: Ln(k.sideSeam(pl, h - 40, P, 3), { tone: "faint" }) })];
  const open = k.pathOf(k.roundedPlan(k.insetPlan(pl, 16), 3).map(([x, y]) => at([x, y, h])), true);
  out.push(`<path class="wt-dark" d="${open}"/>`, Ln(open, { tone: "lo" }));
  if (id) out.push(`<clipPath id="${id}"><path d="${open}"/></clipPath>`);
  return out.join("");
}
function stage1() {
  const out = [];
  // Debris bin under the screen head.
  out.push(binOf(plan(220, -860, 560, 440, 8), 600, "wt-bin-clip"));
  out.push(`<g clip-path="url(#wt-bin-clip)" class="wt-live" data-layer="debris-bin"></g>`);
  out.push(`<g class="wt-live" data-layer="drop"></g>`);
  // Legs of the screen head, between the bin and the tank.
  for (const y of [SCREEN.y0 - 40, SCREEN.y1 + 40]) out.push(S(box([570, y - 30, 0], [630, y + 30, 1990], 2), { tone: "mid" }));
  out.push(openTank("t1", T1, T1_H, T1_W, "wt-w1"));
  out.push(screen());
  return out.join("");
}
function screen() {
  const out = [];
  const [bx, bz] = SCREEN.bottom, [tx, tz] = SCREEN.top;
  const len = Math.hypot(bx - tx, tz - bz);
  const dx = (tx - bx) / len, dz = (tz - bz) / len;   // up the screen
  const nx = dz, nz = -dx;                              // across, toward +x and up
  const side = (y) => {
    const F = G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const poly = [[bx - nx * 30, bz - nz * 30], [tx - nx * 30, tz - nz * 30], [tx + nx * 190, tz + nz * 190], [bx + nx * 190, bz + nz * 190]];
    return S(plate(F, poly, 0, 14), { tone: "mid" });
  };
  out.push(side(SCREEN.y0 - 14));
  // The lamella bed: a sloped deck between the side plates; its moving steps are drawn live.
  const bed = [[bx + nx * 40, SCREEN.y0, bz + nz * 40], [tx + nx * 40, SCREEN.y0, tz + nz * 40], [tx + nx * 40, SCREEN.y1, tz + nz * 40], [bx + nx * 40, SCREEN.y1, bz + nz * 40]];
  out.push(`<path class="iso-fill" d="${path3(bed, true)}"/><path class="iso-shade" data-shade="3" d="${path3(bed, true)}"/>`);
  out.push(`<g class="wt-live" data-layer="steps"></g>`);
  out.push(side(SCREEN.y1));
  // Drive head at the top: gearbox and motor.
  const hx = tx + nx * 80, hz = tz + nz * 80;
  out.push(S(box([hx - 110, SCREEN.y0 - 20, hz - 60], [hx + 110, SCREEN.y1 + 20, hz + 90], 6, 3), { tone: "mid" }));
  const M = alongY([hx, SCREEN.y1 + 20, hz + 15]);
  out.push(S(G.disc(0, 40, 80, M, P, { steps: 12 }), { tone: "mid" }), S(G.disc(40, 260, 70, M, P, { steps: 12 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(M, 60, 240, 70, 14, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  return out.join("");
}

// A plate or prism of any polygon in a frame's (u, v) plane, extruded along its axis.
const signed = (poly) => poly.reduce((a, [x, y], i) => {
  const [x2, y2] = poly[(i + 1) % poly.length];
  return a + x * y2 - x2 * y;
}, 0);
const screenOriented = (pts) => (signed(pts) < 0 ? [...pts].reverse() : pts);
function plate(F, poly, s0, s1) {
  const ring = signed(poly) > 0 ? poly : [...poly].reverse();
  const n = ring.length;
  const W3 = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  const capNear = G.dot3(F.a, V) > 0;
  const [nearS, farS] = capNear ? [s1, s0] : [s0, s1];
  const near = ring.map((p) => at(W3(nearS, p)));
  const far = ring.map((p) => at(W3(farS, p)));
  const normals = ring.map(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % n];
    return G.unit3(G.add3(G.mul3(F.u, y1 - y0), G.mul3(F.v, -(x1 - x0))));
  });
  const facing = normals.map((m) => G.dot3(m, V) > 1e-9);
  const hull = G.hullOf([...near, ...far]);
  const parts = [k.pathOf(screenOriented(near), true), k.pathOf(screenOriented(far), true)];
  const buckets = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    if (!facing[i]) continue;
    const quad = screenOriented([near[i], near[(i + 1) % n], far[(i + 1) % n], far[i]]);
    parts.push(k.pathOf(quad, true));
    buckets[G.toneOf(normals[i], P)].push(k.pathOf(quad, true));
  }
  buckets[G.toneOf(capNear ? F.a : G.mul3(F.a, -1), P)].push(k.pathOf(screenOriented(near), true));
  const crease = ring.map((_, i) => (facing[i] ? k.pathOf([near[i], near[(i + 1) % n]]) : "")).join("");
  return { fill: parts.join(""), outline: k.pathOf(hull, true), crease, top: buckets[4].join(""), shades: buckets.slice(0, 4).map((b) => b.join("")) };
}

// ---------- stage 2: electroflotation and electrocoagulation, front wall cut away
const T2 = { x0: 2600, x1: 4500, y0: -1100, y1: 50, h: 1500 };
const T2_W = 1380;
const CUT = { x0: 2920, x1: 4200, z: 420 };
const PLATES = Array.from({ length: 12 }, (_, i) => 2900 + i * 88);
function stage2(part) {
  const out = [];
  const t = 20;
  const { x0, x1, y0, y1, h } = T2;
  if (part === "back") {
    // Rectifier (DC supply) on the container wall behind the tank.
    const cab = [2330, -CW + WALL, 700];
    out.push(S(box(cab, [2570, -930, 1760], 3), { tone: "mid" }));
    const fy = -930;
    out.push(Ln(path3([[2350, fy, 720], [2550, fy, 720], [2550, fy, 1740], [2350, fy, 1740]], true), { tone: "lo" }));
    out.push(`<path class="wt-dark" d="${path3([[2390, fy, 1500], [2510, fy, 1500], [2510, fy, 1600], [2390, fy, 1600]], true)}"/>`);
    out.push(Ln([900, 960, 1020, 1080].map((z) => path3([[2390, fy, z], [2510, fy, z], [2510, fy, z + 24], [2390, fy, z + 24]], true)).join(""), { tone: "lo" }));
    // Tank: back wall, left wall, bottom, right wall; the front wall only below the cut and right of it.
    out.push(S(box([x0, y0, 0], [x1, y0 + t, h], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([x0, y0 + t, 0], [x0 + t, y1, h], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([x0 + t, y0 + t, 0], [x1 - t, y1 - t, 60], 0, 1), { tone: "mid", crease: "lo" }));
    // Electrode pack: plates across the flow on two bus bars, rods up to the terminals.
    out.push(S(box([2860, -990, 60], [3960, -930, 150], 2), { tone: "lo" }), S(box([2860, -230, 60], [3960, -170, 150], 2), { tone: "lo" }));
    for (const x of PLATES) out.push(`<path class="wt-plate" d="${path3([[x + 10, -960, 150], [x + 10, -200, 150], [x + 10, -200, 820], [x, -200, 820], [x, -960, 820], [x + 10, -960, 820]], true)}"/>`);
    out.push(S(box([2860, -930, 820], [3960, -880, 860], 2), { tone: "mid" }), S(box([2860, -280, 820], [3960, -230, 860], 2), { tone: "mid" }));
    for (const y of [-905, -255]) out.push(S(k.cylinder(2830, y, 16, 860, T2_W - 860, P, 14), { tone: "mid", crease: "none" }));
  } else if (part === "water") {
    // Water: surface over the tank and the cut face of the water body.
    const surface = [[x0 + t, y0 + t, T2_W], [x1 - t, y0 + t, T2_W], [x1 - t, y1 - t, T2_W], [x0 + t, y1 - t, T2_W]];
    const section = [[CUT.x0, y1 - t, CUT.z], [CUT.x1, y1 - t, CUT.z], [CUT.x1, y1 - t, T2_W], [CUT.x0, y1 - t, T2_W]];
    out.push(`<path class="wt-w2" d="${path3(surface, true)}"/>`, `<path class="wt-w2 wt-section" d="${path3(section, true)}"/>`);
    out.push(Ln(path3([[x0 + t, y0 + t, T2_W], [x1 - t, y0 + t, T2_W]]), { tone: "lo" }), Ln(path3([[x0 + t, y0 + t, T2_W], [x0 + t, y1 - t, T2_W]]), { tone: "lo" }));
    out.push(Ln(path3([[CUT.x0, y1 - t, T2_W], [CUT.x1, y1 - t, T2_W]]), { tone: "mid" }));
  } else if (part === "top") {
    // Rods above the water, terminals on the rim.
    for (const y of [-905, -255]) {
      out.push(S(k.cylinder(2830, y, 16, T2_W, h + 60 - T2_W, P, 14), { tone: "mid", crease: "none" }));
      out.push(S(k.cylinder(2830, y, 30, h + 60, 40, P, 18), { tone: "mid" }));
    }
    // Sludge trough at the outlet end, where the scraper drops the froth.
    out.push(S(box([4270, y0 + t, 1240], [x1 - t, y1 - t, h - 20], 0, 1), { tone: "mid", crease: "lo" }));
    const trough = [[4290, y0 + t + 20, h - 20], [x1 - t - 20, y0 + t + 20, h - 20], [x1 - t - 20, y1 - t - 20, h - 20], [4290, y1 - t - 20, h - 20]];
    out.push(`<path class="wt-sludge" d="${path3(trough, true)}"/>`, Ln(path3(trough, true), { tone: "lo" }));
  } else if (part === "front") {
    // Right wall and what is left of the front wall, cut edges shown.
    out.push(S(box([x1 - t, y0 + t, 0], [x1, y1, h], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([x0, y1 - t, 0], [CUT.x0, y1, h], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([CUT.x0, y1 - t, 0], [CUT.x1, y1, CUT.z], 0, 1), { tone: "mid", crease: "lo" }));
    out.push(S(box([CUT.x1, y1 - t, 0], [x1 - t, y1, h], 0, 1), { tone: "mid", crease: "lo" }));
    // Scraper: rails on the walls, sprocket shafts at both ends, drive motor at the inlet end.
    out.push(S(box([x0, y0 - 40, h], [x1, y0 + t, h + 40], 2), { tone: "mid" }));
    out.push(S(box([x0, y1 - t, h], [CUT.x0, y1 + 40, h + 40], 2), { tone: "mid" }), S(box([CUT.x1, y1 - t, h], [x1, y1 + 40, h + 40], 2), { tone: "mid" }));
    const M = alongY([x0 + 120, y1 + 40, h + 90]);
    out.push(S(box([x0 + 40, y1 + 40, h + 20], [x0 + 200, y1 + 160, h + 170], 4, 3), { tone: "mid" }));
    out.push(S(G.disc(120, 150, 74, M, P, { steps: 12 }), { tone: "mid" }), S(G.disc(150, 360, 64, M, P, { steps: 12 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(M, 170, 340, 64, 12, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  }
  return out.join("");
}

// ---------- stage 3: filter columns on two headers
const COLS = [
  { x: 5000, r: 270, h: 1700, dome: true },
  { x: 5640, r: 270, h: 1700, dome: true },
  { x: 6240, r: 200, h: 1500 },
  { x: 6700, r: 200, h: 1500 },
  { x: 7160, r: 200, h: 1500 },
];
const COL_Y = -420;
const HEAD_Y = 160;
const TOP_Z = 1400, LOW_Z = 400;
function column(c, index) {
  const out = [];
  const base = 150;
  out.push(S(k.cylinder(c.x, COL_Y, c.r * 0.86, 0, base, P, 16), { tone: "lo" }));
  out.push(S(k.cylinder(c.x, COL_Y, c.r, base, c.h, P, 24, 0), { tone: "mid", crease: c.dome ? "none" : "faint", inner: Ln([base + 220, base + c.h - 220].map((z) => k.sideArc(c.x, COL_Y, c.r, z, P, 24)).join(""), { tone: "faint" }) }));
  const top = base + c.h;
  if (c.dome) {
    // Hemispherical head: a ball clipped to what lies above the front arc of the shell's top rim.
    const facing = Math.atan2(V[1], V[0]);
    const arc = Array.from({ length: 25 }, (_, i) => {
      const a = facing - Math.PI / 2 + (Math.PI * i) / 24;
      return at([c.x + c.r * Math.cos(a), COL_Y + c.r * Math.sin(a), top]);
    });
    const clip = [...arc, [arc[24][0], arc[24][1] - 400], [arc[0][0], arc[0][1] - 400]];
    out.push(`<clipPath id="wt-dome-${index}"><path d="${k.pathOf(clip, true)}"/></clipPath>`);
    out.push(`<g clip-path="url(#wt-dome-${index})">${S(G.sphereOf([c.x, COL_Y, top], c.r, P, { steps: 24 }), { tone: "mid" })}</g>`);
    out.push(Ln(k.pathOf(arc), { tone: "faint" }));
    out.push(S(k.cylinder(c.x, COL_Y, 50, top + c.r - 10, 70, P, 18), { tone: "mid" }));
  } else {
    out.push(S(k.cylinder(c.x, COL_Y, c.r + 30, top, 36, P, 24, 1), { tone: "mid" }));
    out.push(D(Array.from({ length: 12 }, (_, i) => at([c.x + (c.r + 14) * Math.cos((i / 12) * 2 * Math.PI), COL_Y + (c.r + 14) * Math.sin((i / 12) * 2 * Math.PI), top + 36])), { size: 0.4 }));
    out.push(S(k.cylinder(c.x, COL_Y, 40, top + 36, 60, P, 18), { tone: "mid" }));
    out.push(S(k.cylinder(c.x, COL_Y, 52, top + 96, 22, P, 22), { tone: "mid" }));
  }
  return out.join("");
}
// Stubs from a header into a column, with flanges on the column side.
function stub(c, z) {
  const yS = COL_Y + c.r;
  const F = alongY([c.x, yS, z]);
  return S(G.disc(0, 16, 90, F, P, { steps: 12 }), { tone: "mid" }) + S(G.disc(16, HEAD_Y - yS - Math.sqrt(EL * EL - PR * PR), 42, F, P, { rims: "none", steps: 10 }), { tone: "mid", crease: "none" }) + S(G.sphereOf([c.x, HEAD_Y, z], EL, P, { steps: 10 }), { tone: "mid" });
}
function header(z, x0, x1, flow, ends = [true, true]) {
  const out = [];
  const F = alongX([x0, HEAD_Y, z]);
  const cut = Math.sqrt(EL * EL - PR * PR);
  const xs = COLS.map((c) => c.x).filter((x) => x > x0 && x < x1);
  const stops = [x0, ...xs, x1];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i] - x0 + (i > 0 || !ends[0] ? cut : 0);
    const b = stops[i + 1] - x0 - (i < stops.length - 2 || !ends[1] ? cut : 0);
    out.push(S(G.disc(a, b, PR, F, P, { rims: "none", steps: 12 }), { tone: "mid", crease: "none" }));
  }
  if (flow) out.push(`<path class="wt-flow ${flow}" data-flow d="${path3([[x0, HEAD_Y, z], [x1, HEAD_Y, z]])}"/>`);
  return out.join("");
}

// ---------- stage 4: bactericidal treatment cell with electrodes in the lid
const R4 = { x: 7980, y: -460, r: 380, z0: 150, h: 1350 };
function stage4(part) {
  const out = [];
  if (part === "box") {
    out.push(S(box([7680, -CW + WALL, 1800], [8280, -1040, 2160], 3), { tone: "mid" }));
    out.push(Ln(path3([[7700, -1040, 1820], [8260, -1040, 1820], [8260, -1040, 2140], [7700, -1040, 2140]], true), { tone: "lo" }));
    out.push(`<path class="wt-dark" d="${path3([[7740, -1040, 2040], [7880, -1040, 2040], [7880, -1040, 2100], [7740, -1040, 2100]], true)}"/>`);
    out.push(D([at([8180, -1040, 2070]), at([8220, -1040, 2070])], { size: 0.6 }));
    return out.join("");
  }
  const { x, y, r, z0, h } = R4;
  out.push(S(k.cylinder(x, y, r * 0.86, 0, z0, P, 24), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, r, z0, h, P, 24), { tone: "mid", crease: "none", inner: Ln([z0 + 300, z0 + h - 260].map((z) => k.sideArc(x, y, r, z, P, 40)).join(""), { tone: "faint" }) }));
  const top = z0 + h;
  out.push(S(k.cylinder(x, y, r + 40, top, 40, P, 24, 1), { tone: "mid" }));
  out.push(D(Array.from({ length: 16 }, (_, i) => at([x + (r + 20) * Math.cos((i / 16) * 2 * Math.PI), y + (r + 20) * Math.sin((i / 16) * 2 * Math.PI), top + 40])), { size: 0.4 }));
  // Electrode terminals in the lid.
  for (const [dx, dy] of [[-150, -60], [0, 120], [150, -60]].sort((a, b) => depth([x + a[0], y + a[1], 0]) - depth([x + b[0], y + b[1], 0]))) {
    out.push(S(k.cylinder(x + dx, y + dy, 46, top + 40, 40, P, 22), { tone: "mid" }));
    out.push(S(k.cylinder(x + dx, y + dy, 22, top + 80, 90, P, 16), { tone: "mid" }));
    out.push(S(k.cylinder(x + dx, y + dy, 30, top + 170, 26, P, 18, 1), { tone: "mid" }));
  }
  return out.join("");
}

// ---------- stage 5: clean water tank with a level glass
const T5 = { x: 9160, y: -440, r: 600, h: 1900 };
function stage5() {
  const out = [];
  const { x, y, r, h } = T5;
  out.push(S(k.cylinder(x, y, r, 0, h, P, 24), { tone: "mid", crease: "none", inner: Ln([620, 1260].map((z) => k.sideArc(x, y, r, z, P, 48)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, r + 24, h, 34, P, 24, 1), { tone: "mid" }));
  out.push(S(k.cylinder(x - 180, y - 120, 190, h + 34, 70, P, 24, 1), { tone: "mid" }));
  out.push(D(Array.from({ length: 10 }, (_, i) => at([x - 180 + 170 * Math.cos((i / 10) * 2 * Math.PI), y - 120 + 170 * Math.sin((i / 10) * 2 * Math.PI), h + 104])), { size: 0.4 }));
  out.push(S(k.cylinder(x + 260, y + 200, 30, h + 34, 160, P, 16), { tone: "mid" }));
  out.push(S(G.sphereOf([x + 260, y + 200, h + 210], 60, P, { steps: 24 }), { tone: "mid" }));
  // Level glass on the front: two brackets and a tube; the water inside is drawn live.
  const gy = y + r + 70;
  for (const z of [180, 1720]) out.push(S(G.disc(0, 70, 26, alongY([x, y + r - 6, z]), P, { steps: 12 }), { tone: "mid" }));
  out.push(S(k.cylinder(x, gy, 28, 140, 1640, P, 18), { tone: "mid", crease: "none" }));
  out.push(`<path class="wt-w5" d="${path3([[x - 16, gy + 28, 180], [x + 16, gy + 28, 180], [x + 16, gy + 28, 1640], [x - 16, gy + 28, 1640]], true)}"/>`);
  return out.join("");
}

// ---------- pumps
// End-suction pump on a base: suction on its -x face, discharge up from the volute.
function pump(x, y) {
  const out = [];
  out.push(S(box([x - 60, y - 170, 0], [x + 620, y + 170, 90], 4, 2), { tone: "lo" }));
  out.push(D([[x - 20, y - 130], [x + 580, y - 130], [x - 20, y + 130], [x + 580, y + 130]].map(([px, py]) => at([px, py, 90])), { size: 0.45 }));
  out.push(S(box([x + 30, y - 110, 90], [x + 150, y + 110, 190], 2), { tone: "mid" }));
  const F = alongX([x, y, 300]);
  out.push(S(G.disc(0, 30, 92, F, P, { steps: 12 }), { tone: "mid" }));
  out.push(S(G.disc(30, 160, 150, F, P, { steps: 12 }), { tone: "mid", inner: Ln(G.arcOf(F, 95, 150, P), { tone: "faint" }) }));
  out.push(S(G.disc(160, 240, 70, F, P, { steps: 12 }), { tone: "mid" }));
  out.push(S(G.disc(240, 270, 126, F, P, { steps: 12 }), { tone: "mid" }));
  out.push(S(box([x + 300, y - 100, 90], [x + 560, y + 100, 170], 2), { tone: "mid" }));
  out.push(S(G.disc(270, 560, 118, F, P, { steps: 12 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 290, 540, 118, 16, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) }));
  out.push(S(G.disc(560, 610, 122, F, P, { steps: 12 }), { tone: "mid" }));
  out.push(S(box([x + 360, y - 60, 418], [x + 480, y + 60, 490], 2), { tone: "mid" }));
  out.push(S(k.cylinder(x + 95, y, 70, 440, 40, P, 28), { tone: "mid" }));
  return out.join("");
}
// In-line pump on the return line: body on the pipe, motor standing on it.
function inlinePump(x, y, z) {
  const out = [];
  out.push(S(G.disc(-120, -100, 100, alongX([x, y, z]), P, { steps: 12 }), { tone: "mid" }), S(G.disc(100, 120, 100, alongX([x, y, z]), P, { steps: 12 }), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 120, z - 130, 260, P, 24), { tone: "mid", inner: Ln(k.sideArc(x, y, 120, z + 30, P, 30), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 90, z + 130, 60, P, 36), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 115, z + 190, 300, P, 24), { tone: "mid", inner: k.lineSvg(k.knurl(x, y, 115, z + 190, z + 490, 30, P), { tone: "lo" }) }));
  out.push(S(k.cylinder(x, y, 118, z + 490, 50, P, 24, 1), { tone: "mid" }));
  return out.join("");
}

// ---------- sludge tote (IBC in a cage on a pallet)
const TOTE = { x: 3880, y: 520, w: 600, d: 560, z0: 120, h: 900 };
function tote() {
  const out = [];
  const { x, y, w, d, z0, h } = TOTE;
  out.push(S(box([x - 20, y - 20, 0], [x + w + 20, y + d + 20, z0]), { tone: "lo" }));
  out.push(S(box([x, y, z0], [x + w, y + d, z0 + h], 30, 4), { tone: "mid", crease: "faint" }));
  out.push(`<g class="wt-live" data-layer="tote"></g>`);
  // Cage: posts and rails on the two visible faces, edge to edge.
  const rails = [];
  for (const z of [z0 + 300, z0 + 600]) rails.push(path3([[x, y + d, z], [x + w, y + d, z], [x + w, y, z]]));
  for (const t of [0.33, 0.66]) rails.push(path3([[x + w * t, y + d, z0], [x + w * t, y + d, z0 + h]]), path3([[x + w, y + d * t, z0], [x + w, y + d * t, z0 + h]]));
  out.push(Ln(rails.join(""), { tone: "mid" }));
  out.push(S(k.cylinder(x + w / 2, y + d / 2, 90, z0 + h, 50, P, 28, 1), { tone: "mid" }));
  return out.join("");
}

// ---------- routes (water flows from stage to stage)
const ROUTES = {
  inlet: [[-300, 450, 1000], [1250, 450, 1000], [1250, T1.y + T1.d, 1000]],
  suction1: [[2050, T1.y + T1.d, 300], [2050, 650, 300], [2200, 650, 300]],
  press1: [[2295, 650, 480], [2295, 650, 1200], [2760, 650, 1200], [2760, T2.y1, 1200]],
  out2: [[3300, T2.y1, 300], [3300, 390, 300], [4580, 390, 300]],
  press2: [[4675, 390, 480], [4675, 390, TOP_Z], [4675, HEAD_Y, TOP_Z], [4740, HEAD_Y, TOP_Z]],
  sludge: [[4380, T2.y1, 1150], [4380, 800, 1150], [4380, 800, TOTE.z0 + TOTE.h + 50]],
  toR4: [[7400, HEAD_Y, LOW_Z], [R4.x, HEAD_Y, LOW_Z], [R4.x, R4.y + R4.r, LOW_Z]],
  toT5: [[R4.x + R4.r, R4.y, 1300], [T5.x - Math.sqrt(T5.r ** 2 - (R4.y - T5.y) ** 2), R4.y, 1300]],
  sewer1: [[T5.x + Math.sqrt(T5.r ** 2 - (-560 - T5.y) ** 2), -560, 300], [9839, -560, 300]],
  sewer2: [[9961, -560, 300], [CL, -560, 300]],
  reuse1: [[T5.x, T5.y + T5.r, 300], [T5.x, 700, 300], [9440, 700, 300]],
  reuse2: [[9680, 700, 300], [CL, 700, 300]],
};
// The two outlets beyond the door end: wall collar, pipe and the flange that meets the plant's line.
function outlet(y) {
  const F = alongX([CL + WALL, y, 300]);
  return [
    S(G.disc(0, 330, PR, F, P, { rims: "none", steps: 12 }), { tone: "mid", crease: "none" }),
    `<path class="wt-flow wt-f5" data-flow d="${path3([[CL + WALL, y, 300], [CL + 360, y, 300]])}"/>`,
    S(G.disc(0, 18, PR * 1.7, F, P, { steps: 12 }), { tone: "mid" }),
    S(G.disc(312, 330, PR * 1.85, F, P, { steps: 12 }), { tone: "mid" }),
    D(G.dotsOf(F, 330, PR * 1.4, 6, P, { all: true }), { size: 0.4 }),
  ].join("");
}
// Wires: power from the rectifier to the electrode rods, from the cell's box to its electrodes.
function wires(which) {
  if (which === "t2") {
    return [-905, -255].map((y, i) => k.wireSvg(at([2570, -1000 + i * 40, 1560 - i * 60]), at([2830, y, 1600]), { via: [at([2690, -1000 + i * 40, 1660 - i * 40])], tone: "mid", size: 0.9 })).join("");
  }
  return [[-150, -60], [0, 120], [150, -60]].map(([dx, dy], i) => k.wireSvg(at([7820 + i * 160, -1100, 1800]), at([R4.x + dx, R4.y + dy, 1696]), { tone: "mid", size: 0.9 })).join("");
}

// ---------- live layers
const live = (name) => `<g class="wt-live" data-layer="${name}"></g>`;
const stage = (n, content) => `<g data-stage="${n}" data-hit>${content}</g>`;

const body = [
  container("back"),
  stage(4, stage4("box")),
  stage(1, stage1()),
  pipe(ROUTES.inlet, { flow: "wt-f1", flanges: [false, true] }),
  `<g data-stage="2" data-hit>${stage2("back")}${live("bubbles")}${stage2("water")}${live("froth")}${stage2("top")}${live("flights")}${stage2("front")}</g>`,
  wires("t2"),
  pipe(ROUTES.suction1, { flow: "wt-f1" }),
  stage(1, pump(2200, 650)),
  pipe(ROUTES.press1, { flow: "wt-f1", flanges: [false, true] }),
  stage(3, COLS.map(column).join("")),
  S(G.disc(-18, 0, PR * 1.85, alongX([COLS[0].x - 120, HEAD_Y, LOW_Z]), P, { steps: 12 }), { tone: "mid" }),
  header(LOW_Z, COLS[0].x - 120, 7400, "wt-f3", [true, true]),
  COLS.map((c) => stub(c, LOW_Z)).join(""),
  header(TOP_Z, 4740, COLS[4].x, "wt-f2", [true, false]),
  COLS.map((c) => stub(c, TOP_Z)).join(""),
  pipe(ROUTES.out2, { flow: "wt-f2" }),
  stage(2, tote()),
  pipe(ROUTES.sludge, { flow: "wt-fs", flanges: [true, false] }),
  stage(3, pump(4580, 390)),
  pipe(ROUTES.press2, { flow: "wt-f2", flanges: [false, false] }),
  stage(4, stage4("cell")),
  wires("r4"),
  pipe(ROUTES.toR4, { flow: "wt-f3", flanges: [false, true] }),
  pipe(ROUTES.toT5, { flow: "wt-f4" }),
  stage(5, stage5()),
  pipe(ROUTES.sewer1, { flow: "wt-f5", flanges: [true, false] }),
  stage(5, ballValve([9900, -560, 300], "x")),
  pipe(ROUTES.sewer2, { flow: "wt-f5", flanges: [false, false] }),
  pipe(ROUTES.reuse1, { flow: "wt-f5", flanges: [true, false] }),
  stage(5, inlinePump(9560, 700, 300)),
  pipe(ROUTES.reuse2, { flow: "wt-f5", flanges: [false, false] }),
  container("nearLeft"),
  container("right"),
  outlet(-560),
  outlet(700),
  container("nearRight"),
];

const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: SVG_CLASS, label: "", body });

const cam = k.cameraOf(P);
const DATA = {
  cam: { ox: P.origin[0], oy: P.origin[1], k: cam.k, sinA: cam.sinA, cosA: cam.cosA, sinE: cam.sinE, cosE: cam.cosE },
  t1: { x0: T1.x + 20, x1: T1.x + T1.w - 20, y0: T1.y + 20, y1: T1.y + T1.d - 20, z: T1_W },
  screen: { ...SCREEN },
  t2: { x0: T2.x0 + 20, x1: 4270, y0: T2.y0 + 20, y1: T2.y1 - 20, water: T2_W, plates: [PLATES[0], PLATES[PLATES.length - 1] + 10], plateY: [-960, -200], plateTop: 820 },
  bin: { x0: 236, x1: 764, y0: -844, y1: -436, z: 600 },
  tote: TOTE,
  dropX: [470, 700],
  flowSpeed: 1,
};

const CSS = figureCss(`
.wt-w1{fill:var(--wt-w1);stroke:none}
.wt-w2{fill:var(--wt-w2);fill-opacity:var(--wt-a);stroke:none}
.wt-section{fill-opacity:var(--wt-sa)}
.wt-w5{fill:var(--wt-w5);stroke:none}
.wt-dark{fill:var(--anatomy-shade-0);stroke:none}
.wt-sludge{fill:var(--wt-sludge);stroke:none}
.wt-froth{fill:var(--wt-froth);stroke:var(--wt-froth-edge);stroke-width:.35}
.wt-bubble{fill:none;stroke:var(--wt-bubble);stroke-width:.4}
.wt-debris{fill:var(--wt-debris);stroke:none}
.wt-flow{fill:none;stroke-width:1.1;stroke-linecap:round;stroke-dasharray:1.6 5.4}
.wt-f1{stroke:var(--wt-f1)}.wt-f2{stroke:var(--wt-f2)}.wt-f3{stroke:var(--wt-f3)}.wt-f4{stroke:var(--wt-f4)}.wt-f5{stroke:var(--wt-f5)}.wt-fs{stroke:var(--wt-sludge)}
.wt-step{fill:none;stroke:var(--anatomy-lo);stroke-width:.5}
.wt-plate{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.${SVG_CLASS} [data-on] .wt-plate{stroke:var(--anatomy-lit);fill:var(--anatomy-lit-shade)}`, {
  light: "--wt-w1:#c9b48f;--wt-w2:#b3bcc0;--wt-a:.38;--wt-sa:.5;--wt-w5:#cfe3f4;--wt-sludge:#8e8573;--wt-froth:#f3f1e8;--wt-froth-edge:#9a9688;--wt-bubble:#ffffff;--wt-debris:#5b564a;--wt-f1:#8a6a3c;--wt-f2:#7f8582;--wt-f3:#6a8aa6;--wt-f4:#4a7fb2;--wt-f5:#2f6fae",
  dark: "--wt-w1:#7a6440;--wt-w2:#3e4e58;--wt-a:.36;--wt-sa:.46;--wt-w5:#1d3a55;--wt-sludge:#5a5242;--wt-froth:#d9d6c8;--wt-froth-edge:#8a8676;--wt-bubble:#d6e6f6;--wt-debris:#b7ae98;--wt-f1:#c9a26a;--wt-f2:#a0a6a3;--wt-f3:#8fb0cf;--wt-f4:#86b3e6;--wt-f5:#7fb6ee",
});

const file = writeFigure({ id: ID, svg, css: CSS, data: DATA, width: WIDTH, height: HEIGHT });
const page = await writePreview({ id: ID, file, data: DATA, theme });
console.log("wrote", page, "·", (file.length / 1024).toFixed(0), "KB svg");
