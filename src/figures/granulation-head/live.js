// Live behaviour of the pelletizing head figure. Two knives on the cutter shaft sweep the die face; each time
// a knife passes a die hole it cuts the strand that has grown there into a pellet. The strand grows at the
// speed the output sets, so the pellet length is that speed divided by the cut rate (shaft rpm × 2 knives):
// halving the shaft speed doubles the pellet length. Pellets fly into the water film, run down the wall and
// leave through the outlet. Rotation is shown 100 times slower than real; the pellets' flight is schematic.
const PELLET_AT_MAX = 3.5;   // mm, pellet length assumed at the top shaft speed (sets the strand speed)
const FLIGHT = 0.45, FALL = 1.3, OUT = 0.7;
const TAU = Math.PI * 2;
const RESUME_MS = 8000;    // the tour resumes this long after the last input (wall clock)
const RESTART_MS = 6000;   // a stop made by the reader comes back on by itself this long after the last input

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
  const cutter = svg.querySelector('[data-part="cutter"]');
  const motorPart = svg.querySelector('[data-part="motor"]');
  const water = svg.querySelector("[data-water] .iso-line");
  const solids = ["arm", "blade0", "blade1"].map((name) => {
    const g = q(name);
    return { fill: g.querySelector(".iso-fill"), shades: [0, 1, 2, 3].map((i) => g.querySelector(`.iso-shade[data-shade="${i}"]`)), top: g.querySelector(".iso-top"), crease: g.querySelector(".iso-crease"), edge: g.querySelector(".iso-edge") };
  });
  const bolts = q("bolts"), jaws = q("jaws"), strands = q("strands");
  const back = q("pellets-back"), front = q("pellets-front");

  // ---- projection and a small convex prism painter (the kit's extrude, for parts that turn)
  const iso = (x, y, z) => [C.ox + (x * C.sa - y * C.ca) * C.k, C.oy + ((x * C.ca + y * C.sa) * C.se - z * C.ce) * C.k];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const path = (pts, closed) => pts.length ? "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + (closed ? "Z" : "") : "";
  function hull(points) {
    const s = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function runs(flags, want) {
    const n = flags.length, out = [];
    const start = flags.findIndex((f, i) => f !== flags[(i + n - 1) % n]);
    if (start < 0) return flags[0] === want ? [Array.from({ length: n + 1 }, (_, i) => i % n)] : [];
    let run = null;
    for (let s = 0; s < n; s++) {
      const i = (start + s) % n;
      if (flags[i] === want) { if (!run) run = [i]; run.push((i + 1) % n); } else if (run) { out.push(run); run = null; }
    }
    if (run) out.push(run);
    return out;
  }
  function prism(ring, z, h, el) {
    const n = ring.length;
    let area = 0;
    for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const normals = ring.map((a, i) => {
      const b = ring[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return area > 0 ? [dy / l, -dx / l] : [-dy / l, dx / l];
    });
    const facing = normals.map(([nx, ny]) => nx * C.ca + ny * C.sa > 1e-9);
    const top = ring.map(([x, y]) => iso(x, y, z + h)), bottom = ring.map(([x, y]) => iso(x, y, z));
    const outline = [], crease = [], shades = ["", "", "", ""];
    for (const r of runs(facing, false)) outline.push(path(r.map((i) => top[i])));
    for (const r of runs(facing, true)) { crease.push(path(r.map((i) => top[i]))); outline.push(path(r.map((i) => bottom[i]))); }
    for (let i = 0; i < n; i++) {
      if (facing[(i + n - 1) % n] !== facing[i]) outline.push(path([top[i], bottom[i]]));
      if (!facing[i]) continue;
      const lit = (normals[i][0] * -C.sa + normals[i][1] * C.ca + 1) / 2;
      const j = (i + 1) % n;
      shades[clamp(Math.floor(lit * 4), 0, 3)] += path(area > 0 ? [top[i], top[j], bottom[j], bottom[i]] : [bottom[i], bottom[j], top[j], top[i]], true);
    }
    el.fill.setAttribute("d", path(hull(top.concat(bottom)), true));
    shades.forEach((d, i) => el.shades[i].setAttribute("d", d));
    el.top.setAttribute("d", path(area > 0 ? top : top.slice().reverse(), true));
    el.crease.setAttribute("d", crease.join(""));
    el.edge.setAttribute("d", outline.join(""));
  }
  const turn = (ring, a) => ring.map(([u, v]) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]);

  // ---- model
  const K = F.knives;
  const levels = F.rpm;
  const maxRpm = levels[levels.length - 1];
  const strandSpeed = PELLET_AT_MAX * (maxRpm / 60) * K.count / F.slow;   // mm per second of figure time
  const [a1, a2] = F.cut;
  const inGap = (a) => { const w = wrap(a - a1); return w > 0 && w < wrap(a2 - a1); };
  const holes = [];
  for (let i = 0; i < F.die.holes; i += 1) {
    const a = (i / F.die.holes) * TAU + 0.04;
    if (!inGap(a)) holes.push({ a, len: 0, face: false });
  }
  for (const a of [a1 + 0.004, a2 - 0.004]) holes.push({ a, len: 0, face: true });
  let level = levels.length - 1, rpm = maxRpm, running = true;
  let phase = 0.3, clock = 0, last = 0, frame = 0, visible = false, hover = "", phrase = "", shown = "";
  let touring = !still.matches, tourAt = 0, quietUntil = 1.4, seed = 7;
  let lastInput = 0, restartAt = 0, restartTimer = 0;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pellets = [];
  holes.forEach((h) => { h.rel = wrap(h.a - phase) % Math.PI; });

  const target = () => (running ? levels[level] : 0);
  const number = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, T.thousands || " ");

  function say(textValue) {
    if (restartAt) textValue += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && shown !== textValue) { shown = textValue; readout.textContent = textValue; }
  }
  function announce(textValue) { if (live && phrase !== textValue) { phrase = textValue; live.textContent = textValue; } }

  function emit(h) {
    const tilt = random() * TAU;
    pellets.push({ a0: h.a, a: h.a, r: F.die.hole, z: F.die.face - 3, len: Math.max(1.2, h.len), t: 0, stage: 0, ax: [Math.cos(tilt) * 0.8, Math.sin(tilt) * 0.8, 0.6], wa: 0 });
  }

  function step(dt) {
    clock += dt;
    if (!touring && !still.matches && lastInput && performance.now() - lastInput >= RESUME_MS) {
      touring = true; tourAt = 0; quietUntil = clock; lastInput = 0; disarmRestart();
    }
    if (touring && clock > quietUntil) {
      tourAt += dt;
      const plan = [3, 1, 0, 1];
      const want = plan[Math.floor(tourAt / 5.5) % plan.length];
      if (want !== level) level = want;
      running = true;
    }
    const goal = target();
    rpm = still.matches ? goal : rpm + (goal - rpm) * (1 - Math.exp(-dt / 0.7));
    if (Math.abs(rpm - goal) < 1) rpm = goal;
    const turnBy = (rpm / 60) * TAU * dt / F.slow;
    phase += turnBy;
    const flow = running ? strandSpeed * dt : 0;
    for (const h of holes) {
      h.len += flow;
      const rel = wrap(h.a - phase) % Math.PI;
      if (turnBy > 0 && rel > h.rel + 1e-6 && h.len > 0.4) { if (!h.face) emit(h); else emitFace(h); h.len = 0; }
      h.rel = rel;
    }
    for (let i = pellets.length - 1; i >= 0; i--) {
      const p = pellets[i];
      p.t += dt;
      if (p.stage === 0) {
        const s = clamp(p.t / FLIGHT, 0, 1), e = 1 - (1 - s) * (1 - s);
        p.r = F.die.hole + (F.hood.rIn - 5 - F.die.hole) * e;
        p.a = p.a0 + 0.42 * e;
        p.z = F.die.face - 3 - 8 * s;
        if (s >= 1) { p.stage = 1; p.t = 0; p.wa = p.a; }
      } else if (p.stage === 1) {
        const s = clamp(p.t / FALL, 0, 1);
        p.z = F.die.face - 11 - (F.die.face - 11 - F.hood.floor - 3) * (0.35 * s + 0.65 * s * s);
        p.a = p.wa + 0.6 * s;
        if (s >= 1) { p.stage = 2; p.t = 0; p.wa = p.a; p.x0 = p.r * Math.cos(p.a); p.y0 = p.r * Math.sin(p.a); }
      } else {
        // Along the floor to the outlet, then down into it.
        const s = clamp(p.t / OUT, 0, 1), e = s * s * (3 - 2 * s);
        const [orr, oa] = F.hood.outlet;
        const x = p.x0 + (orr * Math.cos(oa) - p.x0) * e, y = p.y0 + (orr * Math.sin(oa) - p.y0) * e;
        p.r = Math.hypot(x, y); p.a = Math.atan2(y, x);
        p.z = F.hood.floor + 2 - 14 * Math.max(0, s - 0.85) / 0.15;
        if (s >= 1) pellets.splice(i, 1);
      }
    }
  }
  function emitFace(h) { emit(h); }

  function draw() {
    prism(turn(K.arm, phase), K.arm_z[0], K.arm_z[1] - K.arm_z[0], solids[0]);
    prism(turn(K.blade, phase), K.blade_z[0], K.blade_z[1] - K.blade_z[0], solids[1]);
    prism(turn(K.blade, phase + Math.PI), K.blade_z[0], K.blade_z[1] - K.blade_z[0], solids[2]);
    let b = "";
    for (const off of [0, Math.PI]) for (const [u] of K.bolts) {
      const p = iso(u * Math.cos(phase + off), u * Math.sin(phase + off), K.blade_z[1]);
      b += "M" + f1(p[0]) + " " + f1(p[1]) + "h0.01";
    }
    bolts.setAttribute("d", b);
    // Coupling jaws in the lantern window.
    let j = "";
    for (let i = 0; i < 6; i++) {
      const a = phase + (i * TAU) / 6;
      if (Math.cos(a) * C.ca + Math.sin(a) * C.sa < 0.15) continue;
      const x = F.coupling.r * Math.cos(a), y = F.coupling.r * Math.sin(a);
      j += path([iso(x, y, F.coupling.z[0]), iso(x, y, F.coupling.z[1])]);
    }
    jaws.setAttribute("d", j);
    // Strands hanging from the die holes cut by the section.
    let s = "";
    for (const h of holes) if (h.face && h.len > 0.3) {
      const x = F.die.hole * Math.cos(h.a), y = F.die.hole * Math.sin(h.a);
      s += path([iso(x, y, F.die.face - 0.5), iso(x, y, F.die.face - h.len)]);
    }
    strands.setAttribute("d", s);
    let pb = "", pf = "";
    for (const p of pellets) {
      const ca = Math.cos(p.a), sa = Math.sin(p.a);
      if (p.stage === 0 && p.r < F.die.r + 3 && !inGap(p.a)) continue;
      const x = p.r * ca, y = p.r * sa, h = p.len / 2;
      const m = path([iso(x - p.ax[0] * h, y - p.ax[1] * h, p.z - p.ax[2] * h), iso(x + p.ax[0] * h, y + p.ax[1] * h, p.z + p.ax[2] * h)]);
      if (x * C.ca + y * C.sa < 0) pb += m; else pf += m;
    }
    back.setAttribute("d", pb);
    front.setAttribute("d", pf);
    // Accent: the knives, or the motor while the pointer is on it.
    cutter.toggleAttribute("data-on", hover !== "motor");
    motorPart.toggleAttribute("data-on", hover === "motor");
    if (water) water.toggleAttribute("data-flow", running && !still.matches);
    say(rpm < 1 ? T.stopped : T.speed.replace("{rpm}", number(Math.round(rpm / 10) * 10)).replace("{cuts}", number((rpm / 60) * K.count)));
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
  // Reduced motion: no loop; show the steady state for the chosen speed.
  function settleStill() {
    pellets.length = 0;
    holes.forEach((h) => { h.len = 0; });
    rpm = target();
    for (let i = 0; i < 150; i++) step(1 / 30);
    draw();
  }

  // Any input hands the figure to the reader; the tour comes back RESUME_MS after the last one.
  function takeOver() { touring = false; lastInput = performance.now(); }
  // A stop made by the reader comes back on by itself RESTART_MS later; any further input restarts the wait.
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    running = true;
    announce(T.start);
    run();
  }
  const afterInput = () => (running ? disarmRestart() : armRestart());
  function setLevel(next) {
    takeOver();
    level = clamp(next, 0, levels.length - 1);
    running = true;
    announce(T.set.replace("{rpm}", number(levels[level])));
    afterInput();
    run();
  }
  function toggle() {
    takeOver();
    running = !running;
    announce(running ? T.start : T.stop);
    afterInput();
    run();
  }
  const partOf = (event) => { const n = event.target.closest && event.target.closest("[data-part]"); return n ? n.dataset.part : ""; };
  // Only a real mouse counts as hover; a tap on a phone fires pointer events too.
  svg.addEventListener("pointermove", (event) => { if (event.pointerType !== "mouse") return; hover = partOf(event); if (still.matches) draw(); });
  svg.addEventListener("pointerleave", () => { if (!hover) return; hover = ""; if (still.matches) draw(); });
  svg.addEventListener("click", (event) => {
    const part = partOf(event);
    if (part === "cutter" || part === "motor") setLevel(running ? (level + levels.length - 1) % levels.length : level);
  });
  stage.addEventListener("keydown", (event) => {
    const n = Number(event.key);
    if (n >= 1 && n <= levels.length) setLevel(n - 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowRight") setLevel(level + 1);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setLevel(level - 1);
    else if (event.key === " " || event.key === "Enter") toggle();
    else return;
    event.preventDefault();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  if (still.matches) settleStill(); else { for (let i = 0; i < 60; i++) step(1 / 30); draw(); }
}
