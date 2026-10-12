// Live behaviour of the die plate and floating knives figure. The two knives turn on the hub and cut the
// strands growing out of the die holes into pellets. The hub slides on the shaft and a spring presses it down,
// so when the knife edges wear (shown sped up and drawn twice as large) the hub follows them down: the worn
// knife grows a flat land on the die face, the spring gets longer, and the knives never lift off the plate.
const TURN = 0.16;          // turns per second of figure time (slowed down)
const PELLET = 3.5;         // mm, pellet length the strand speed is set for
const WEAR_FOR = 7;         // seconds from new to worn knives (sped up)
const TAU = Math.PI * 2;
const BANDS = [0, 0.2, 0.42, 0.62];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const wrap = (a) => ((a % TAU) + TAU) % TAU;

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const C = F.cam;
  const q = (name) => svg.querySelector(`[data-live="${name}"]`);
  const solid = (name) => {
    const g = q(name);
    return { fill: g.querySelector(".iso-fill"), shades: [0, 1, 2, 3].map((i) => g.querySelector(`.iso-shade[data-shade="${i}"]`)), top: g.querySelector(".iso-top"), crease: g.querySelector(".iso-crease"), edge: g.querySelector(".iso-edge") };
  };
  const blades = [solid("blade0"), solid("blade1")], arm = solid("arm"), shaft = solid("shaft");
  const hub = q("hub"), hubDots = q("hubdots"), screws = q("screws");
  const coilBack = q("coil-back"), coilFront = q("coil-front"), strands = q("strands");
  const back = q("pellets-back"), front = q("pellets-front");
  const knives = svg.querySelector('[data-part="knives"]');

  // ---- projection and the kit's prism painter (prismOf), for the parts that turn
  const V = [C.ca * C.ce, C.sa * C.ce, C.se];
  const Lt = F.light;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const iso = (x, y, z) => [C.ox + (x * C.sa - y * C.ca) * C.k, C.oy + ((x * C.ca + y * C.sa) * C.se - z * C.ce) * C.k];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const path = (pts, closed) => (pts.length ? "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + (closed ? "Z" : "") : "");
  const band = (score) => { let t = 0; while (t < BANDS.length && score >= BANDS[t]) t++; return t; };
  function hull(points) {
    const s = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function prism(Fr, polygon, s0, s1, el) {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) { const a = polygon[i], b = polygon[(i + 1) % polygon.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const ring = area < 0 ? polygon.slice().reverse() : polygon;
    const n = ring.length;
    const p3 = (s, [x, y]) => [Fr.o[0] + Fr.a[0] * s + Fr.u[0] * x + Fr.v[0] * y, Fr.o[1] + Fr.a[1] * s + Fr.u[1] * x + Fr.v[1] * y, Fr.o[2] + Fr.a[2] * s + Fr.u[2] * x + Fr.v[2] * y];
    const low = ring.map((p) => iso(...p3(s0, p))), high = ring.map((p) => iso(...p3(s1, p)));
    const buckets = ["", "", "", "", ""], seen = [];
    for (let j = 0; j < n; j++) {
      const [x0, y0] = ring[j], [x1, y1] = ring[(j + 1) % n];
      const nx = Fr.u[0] * (y1 - y0) - Fr.v[0] * (x1 - x0), ny = Fr.u[1] * (y1 - y0) - Fr.v[1] * (x1 - x0), nz = Fr.u[2] * (y1 - y0) - Fr.v[2] * (x1 - x0);
      const l = Math.hypot(nx, ny, nz) || 1, nrm = [nx / l, ny / l, nz / l];
      const visible = dot(nrm, V) > 1e-6;
      seen.push(visible);
      if (visible) buckets[band(dot(nrm, Lt))] += path([low[j], low[(j + 1) % n], high[(j + 1) % n], high[j]], true);
    }
    const ends = [[low, [-Fr.a[0], -Fr.a[1], -Fr.a[2]]], [high, Fr.a]];
    const capSeen = ends.map(([, nrm]) => dot(nrm, V) > 1e-6);
    ends.forEach(([pts, nrm], i) => { if (capSeen[i]) buckets[band(dot(nrm, Lt))] += path(pts, true); });
    let crease = "";
    for (let j = 0; j < n; j++) {
      const prev = (j - 1 + n) % n;
      const a = [ring[j][0] - ring[prev][0], ring[j][1] - ring[prev][1]], b = [ring[(j + 1) % n][0] - ring[j][0], ring[(j + 1) % n][1] - ring[j][1]];
      const sharp = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < Math.cos(0.35);
      if (sharp && seen[j] && seen[prev]) crease += path([low[j], high[j]]);
      ends.forEach(([pts], i) => { if (capSeen[i] && seen[j]) crease += path([pts[j], pts[(j + 1) % n]]); });
    }
    const outline = path(hull(low.concat(high)), true);
    el.fill.setAttribute("d", outline);
    for (let i = 0; i < 4; i++) el.shades[i].setAttribute("d", buckets[i]);
    el.top.setAttribute("d", buckets[4]);
    el.crease.setAttribute("d", crease);
    el.edge.setAttribute("d", outline);
  }
  // Keeps the part of a knife section above the die face (h ≥ 0): the worn-off strip is gone.
  function clipUp(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ina = a[1] >= 0, inb = b[1] >= 0;
      if (ina) out.push(a);
      if (ina !== inb) { const t = a[1] / (a[1] - b[1]); out.push([a[0] + (b[0] - a[0]) * t, 0]); }
    }
    return out;
  }
  const circle = Array.from({ length: 48 }, (_, i) => [F.shaft.r * Math.cos((i / 48) * TAU), F.shaft.r * Math.sin((i / 48) * TAU)]);
  const AXIS = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };

  // ---- model
  const holes = Array.from({ length: F.die.holes }, (_, i) => ({ a: (i / F.die.holes) * TAU, len: 0, rel: 0 }));
  const strandSpeed = PELLET * TURN * 2;                  // mm/s: two knife passes per turn
  let phase = 0.5, clock = 0, last = 0, frame = 0, visible = false, shown = "", phrase = "";
  let running = true, mode = "run", wear = 0, hold = 0, seed = 11;
  let touring = !still.matches, tourWait = 2.5;
  const pellets = [];
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  holes.forEach((h) => { h.rel = wrap(h.a - phase) % Math.PI; });

  function say(value) { if (readout && shown !== value) { shown = value; readout.textContent = value; } }
  function announce(value) { if (live && phrase !== value) { phrase = value; live.textContent = value; } }

  function startWear() { if (wear >= F.wear.max - 1e-3) return replace(); mode = "wearing"; announce(T.wear); if (still.matches) { wear = F.wear.max; mode = "worn"; } }
  function replace() { mode = "replacing"; announce(T.replaced); if (still.matches) { wear = 0; mode = "run"; } }

  function step(dt) {
    clock += dt;
    if (touring) {
      tourWait -= dt;
      if (tourWait <= 0) {
        if (mode === "run") { startWear(); tourWait = 99; } else if (mode === "worn") { replace(); tourWait = 99; }
      }
    }
    if (mode === "wearing") { wear += (F.wear.max / WEAR_FOR) * dt; if (wear >= F.wear.max) { wear = F.wear.max; mode = "worn"; hold = 0; if (touring) tourWait = 2.5; } }
    else if (mode === "replacing") { wear -= (F.wear.max / 0.8) * dt; if (wear <= 0) { wear = 0; mode = "run"; if (touring) tourWait = 3; } }
    if (!running) return agePellets(dt);
    phase += TURN * TAU * dt;
    for (const h of holes) {
      h.len += strandSpeed * dt;
      const rel = wrap(h.a - phase) % Math.PI;
      if (rel > h.rel + 1e-6) {
        const tilt = random() * TAU;
        pellets.push({ r: F.die.hole, a: h.a, z: F.die.face + 1.5, vr: 60 + 30 * random(), va: 0.6, vz: 0, len: Math.max(1, h.len), ax: [Math.cos(tilt) * 0.85, Math.sin(tilt) * 0.85, 0.5] });
        h.len = 0;
      }
      h.rel = rel;
    }
    agePellets(dt);
  }
  function agePellets(dt) {
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      p.r += p.vr * dt;
      p.a += p.va * dt;
      const support = p.r < 106 ? F.die.face : p.r < F.die.edge ? 84 : -1e3;
      p.vz -= 900 * dt;
      p.z = Math.max(support + 1.5, p.z + p.vz * dt);
      if (p.z <= support + 1.5) p.vz = 0;
      if (p.r > F.die.edge + 40 || p.z < 20) pellets.splice(i, 1);
    }
  }

  function draw() {
    const drop = wear * F.wear.show;
    for (let k = 0; k < 2; k++) {
      const a = phase + k * Math.PI;
      const Fr = { o: [0, 0, F.die.face], a: [Math.cos(a), Math.sin(a), 0], u: [-Math.sin(a), Math.cos(a), 0], v: [0, 0, 1] };
      prism(Fr, clipUp(F.blade.section.map(([t, h]) => [t, h - drop])), F.blade.r0, F.blade.r1, blades[k]);
    }
    const Fa = { o: [0, 0, 0], a: [0, 0, 1], u: [Math.cos(phase), Math.sin(phase), 0], v: [-Math.sin(phase), Math.cos(phase), 0] };
    const hw = F.arm.w / 2;
    prism(Fa, [[-F.arm.r, -hw], [F.arm.r, -hw], [F.arm.r, hw], [-F.arm.r, hw]], F.arm.z[0] - drop, F.arm.z[1] - drop, arm);
    let s = "";
    for (const off of [0, Math.PI]) for (const u of F.blade.screws) {
      const p = iso(u * Math.cos(phase + off), u * Math.sin(phase + off), F.arm.z[1] - drop);
      s += "M" + f1(p[0]) + " " + f1(p[1]) + "h0.01";
    }
    screws.setAttribute("d", s);
    let hd = "";
    for (const off of [Math.PI / 2, -Math.PI / 2]) {
      const p = iso(F.hub.dots * Math.cos(phase + off), F.hub.dots * Math.sin(phase + off), F.hub.z1);
      hd += "M" + f1(p[0]) + " " + f1(p[1]) + "h0.01";
    }
    hubDots.setAttribute("d", hd);
    hub.setAttribute("transform", drop ? `translate(${f1(-F.lift[0] * drop)} ${f1(-F.lift[1] * drop)})` : "");
    // Spring from the hub to the nut, turning with the hub; longer as the hub follows the wear down.
    const z0 = F.hub.z1 - drop, z1 = F.spring.z1, turns = F.spring.turns, steps = turns * 22;
    let cb = "", cf = "", run = [], side = null;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * turns * TAU + phase;
      const p = iso(F.spring.r * Math.cos(t), F.spring.r * Math.sin(t), z0 + ((z1 - z0) * i) / steps);
      const sd = Math.cos(t) * C.ca + Math.sin(t) * C.sa >= 0;
      if (side !== null && sd !== side) { run.push(p); if (side) cf += path(run); else cb += path(run); run = []; }
      run.push(p);
      side = sd;
    }
    if (side) cf += path(run); else cb += path(run);
    coilBack.setAttribute("d", cb);
    coilFront.setAttribute("d", cf);
    prism(AXIS, circle, z0, F.shaft.z1, shaft);
    // Strands growing out of the die holes, and the pellets thrown off the face.
    let st = "";
    for (const h of holes) if (h.len > 0.3) {
      const x = F.die.hole * Math.cos(h.a), y = F.die.hole * Math.sin(h.a);
      st += path([iso(x, y, F.die.face + 0.3), iso(x, y, F.die.face + h.len)]);
    }
    strands.setAttribute("d", st);
    let pb = "", pf = "";
    for (const p of pellets) {
      const x = p.r * Math.cos(p.a), y = p.r * Math.sin(p.a), h = p.len / 2;
      const m = path([iso(x - p.ax[0] * h, y - p.ax[1] * h, p.z - p.ax[2] * h), iso(x + p.ax[0] * h, y + p.ax[1] * h, p.z + p.ax[2] * h)]);
      if (x * C.ca + y * C.sa < 0) pb += m; else pf += m;
    }
    back.setAttribute("d", pb);
    front.setAttribute("d", pf);
    knives.toggleAttribute("data-on", true);
    const w = String(Math.round((wear / F.wear.max) * 100));
    const template = !running ? T.stopped : mode === "wearing" ? T.wearing : mode === "worn" ? T.worn : T.run;
    say(template.replace("{w}", w));
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    draw();
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (still.matches) { settleStill(); return; }
    if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
  };
  function settleStill() {
    pellets.length = 0;
    holes.forEach((h) => { h.len = 0; });
    const keep = mode;
    for (let i = 0; i < 120; i++) step(1 / 30);
    mode = keep;
    draw();
  }
  function takeOver() { touring = false; }
  const partOf = (event) => { const n = event.target.closest && event.target.closest("[data-part]"); return n ? n.dataset.part : ""; };
  svg.addEventListener("click", (event) => { if (partOf(event)) { takeOver(); startWear(); run(); } });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "2") { takeOver(); startWear(); }
    else if (event.key === "1") { takeOver(); replace(); }
    else if (event.key === " " || event.key === "Enter") { takeOver(); running = !running; announce(running ? T.start : T.stop); }
    else return;
    event.preventDefault();
    run();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  if (still.matches) settleStill(); else { const tour = touring; touring = false; for (let i = 0; i < 90; i++) step(1 / 30); touring = tour; draw(); }
}
