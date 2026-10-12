// Live behaviour of the pneumatic conveying figure. The contact fan draws material from the loading funnel
// through its paddle wheel and blows it along the line; in the receiving bin the air slows down, the material
// falls into the hopper and leaves through the rotary valve, and the air escapes through the filter sock.
// The material is shown slowed down about 20 times: in a dilute-phase line it flies at roughly 20 m/s.
const WHEEL_REV = 1.2;       // paddle wheel turns per second on screen (slowed down)
const VALVE_REV = 0.3;       // rotary valve, turns per second (assumed)
const SPIN_UP = 0.9, SPIN_DOWN = 1.1;
const FEED = 14;             // particles per second at full air
const STAGES = [1.5, 0.25, 0.75, 0.55, 0.38, 0.6];  // seconds at full air: funnel, tube, wheel, riser, glass, run
const KINDS = [
  { size: 1.5, round: true, drag: 1.6, fall: 2000, flutter: 0, sink: 2400 },
  { size: 2.4, round: false, drag: 2.4, fall: 1600, flutter: 40, sink: 1500 },
  { size: 3.6, round: false, drag: 5, fall: 1100, flutter: 220, sink: 420 },
];
const TOUR = [[0, 1, 1], [8, 1, 2], [16, 1, 0], [24, 0, 0], [31, 1, 1]];
const TOUR_LEN = 33;
const RESTART_MS = 6000;     // a stop made by the reader switches itself back on after this (wall clock)
const RESUME_MS = 8000;      // the tour resumes this long after the last input (wall clock)

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const one = (name) => svg.querySelector(`[data-pc="${name}"]`);
  const blades = [...svg.querySelectorAll('[data-pc="blade"]')];
  const wheel = one("wheel");
  const els = { fan: one("fan-parts"), hopper: one("hopper"), glass: one("glass"), receiver: one("receiver"), drop: one("drop"), cells: one("cells"), vanes: one("vanes"), sock: one("sock") };
  if (wheel) wheel.setAttribute("data-on", "");

  const { o, ex, ey, ez } = F.proj;
  const sx = (x, y, z) => o[0] + x * ex[0] + y * ey[0] + z * ez[0];
  const sy = (x, y, z) => o[1] + x * ex[1] + y * ey[1] + z * ez[1];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const P3 = (p) => f1(sx(p[0], p[1], p[2])) + " " + f1(sy(p[0], p[1], p[2]));
  const V = F.view;   // towards the viewer, for sorting the paddles
  const deg = Math.PI / 180;
  const volR = (a) => F.r0 + ((F.r1 - F.r0) * (F.cutoff - a / deg)) / (F.cutoff + 180);

  let seed = 21;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shape = (round) => {
    if (round) return Array.from({ length: 6 }, (_, j) => [Math.cos((j * Math.PI) / 3), Math.sin((j * Math.PI) / 3) * 0.8]);
    const a = rnd() * Math.PI;
    return [0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.45 : 0); const r = j % 2 ? 0.5 : 1; return [r * Math.cos(t), r * Math.sin(t) * 0.7]; });
  };
  const blob = (p, size, s) => { const cx = sx(p[0], p[1], p[2]), cy = sy(p[0], p[1], p[2]); return "M" + s.map(([u, v]) => f1(cx + u * size) + " " + f1(cy + v * size)).join("L") + "Z"; };

  const parts = Array.from({ length: 110 }, () => ({ stage: -1 }));
  let kind = 1, on = true, w = 1, beta = 0, gamma = 0, sock = 1;
  let clock = 0, last = 0, frame = 0, visible = false, phrase = "", spawnDebt = 0;
  let touring = !still.matches, tourAt = 0, quiet = 0, hovering = false;
  let restartAt = 0, restartTimer = 0;

  function say(text) {
    if (restartAt) text += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  const H = F.funnel;
  const surf = (u, v) => [H.cx + u * (H.b[0] + (H.t[0] - H.b[0]) * ((H.z - H.z0) / (H.z1 - H.z0))), v * (H.b[1] + (H.t[1] - H.b[1]) * ((H.z - H.z0) / (H.z1 - H.z0))), H.z];
  function spawn(p) {
    p.stage = 0; p.t = 0; p.kind = kind; p.s = shape(KINDS[kind].round);
    const a = rnd() * 2 * Math.PI, m = 0.5 + rnd() * 0.45;
    p.u = Math.cos(a) * m; p.v = Math.sin(a) * m;
    p.x = (rnd() * 2 - 1) * 90; p.a0 = rnd() * 2 * Math.PI; p.b0 = 0;
    p.gx = (rnd() * 2 - 1) * 40; p.gz = (rnd() * 2 - 1) * 45; p.phase = rnd() * 6;
  }
  function advance(p, dt) {
    const K = KINDS[p.kind];
    if (p.stage >= 0 && p.stage < 6) {
      p.t += (dt * w) / STAGES[p.stage];
      if (p.stage === 2 && p.t === 0) p.b0 = beta;
      if (p.t >= 1) {
        p.t = 0; p.stage++;
        if (p.stage === 2) p.b0 = beta;
        if (p.stage === 6) { p.px = (rnd() * 2 - 1) * 50; p.py = F.receiver.inlet - 10; p.pz = F.run + (rnd() * 2 - 1) * 40; p.vy = -2400 * (0.8 + rnd() * 0.4); p.vz = 0; p.vx = (rnd() * 2 - 1) * 120; }
      }
      return;
    }
    if (p.stage === 6) {
      const R = F.receiver;
      p.vy *= Math.exp(-K.drag * dt);
      p.vz = Math.max(p.vz - K.fall * dt, -K.sink);
      p.px += (p.vx + K.flutter * Math.sin(clock * 6 + p.phase)) * dt;
      p.py += p.vy * dt; p.pz += p.vz * dt;
      if (p.py < R.y[0] + 60) { p.py = R.y[0] + 60; p.vy = 0; }
      p.px = Math.max(-R.x + 40, Math.min(R.x - 40, p.px));
      if (p.pz < R.z[0]) { p.stage = 7; p.t = 0; p.wait = 1 + rnd() * 1.8; }
      return;
    }
    if (p.stage === 7) {
      p.t += dt;
      if (p.t >= p.wait) { p.stage = 8; p.px = (rnd() * 2 - 1) * 70; p.py = F.valve.y + (rnd() * 2 - 1) * 90; p.pz = F.drop.z0; p.vz = 0; }
      return;
    }
    if (p.stage === 8) {
      p.vz -= 3200 * dt; p.pz += p.vz * dt;
      if (p.pz < F.drop.z1) p.stage = -1;
    }
  }
  function positionOf(p) {
    if (p.stage === 0) { const c = surf(p.u * (1 - p.t), p.v * (1 - p.t)); return c; }
    if (p.stage === 2) {
      const r = 140 + (volR(p.a0) - 150) * p.t;
      const a = p.a0 - (beta - p.b0);
      return [p.x, r * Math.cos(a), F.zf + r * Math.sin(a)];
    }
    if (p.stage === 4) return [p.gx, F.glass[1] - (F.glass[1] - F.glass[0]) * p.t, F.run + p.gz];
    if (p.stage === 6 || p.stage === 8) return [p.px, p.py, p.pz];
    return null;
  }

  function drawWheel() {
    const W = F.win;
    const list = [];
    for (let i = 0; i < 6; i++) {
      const a = -beta + (i * Math.PI) / 3;
      const c = Math.cos(a), s = Math.sin(a);
      const q = [[-115, 60], [115, 60], [115, 300], [-115, 300]].map(([x, r]) => [x, r * c, F.zf + r * s]);
      const depth = q.reduce((acc, p) => acc + p[0] * V[0] + p[1] * V[1] + p[2] * V[2], 0);
      list.push({ d: "M" + q.map(P3).join("L") + "Z", depth });
    }
    list.sort((a, b) => a.depth - b.depth);
    blades.forEach((el, i) => el.setAttribute("d", list[i].d));
    void W;
  }
  function drawValve() {
    const Vv = F.valve;
    const pt = (r, a) => [Vv.x, Vv.y + r * Math.cos(a), Vv.z + r * Math.sin(a)];
    let vanes = "", cells = "";
    const load = Math.min(1, parts.filter((p) => p.stage === 7).length / 4);
    for (let i = 0; i < 8; i++) {
      const a = -gamma + (i * Math.PI) / 4;
      vanes += "M" + P3(pt(Vv.hub, a)) + "L" + P3(pt(Vv.r - 4, a));
      const c = a + Math.PI / 8;
      const side = Math.cos(c);   // the +y half carries the filled pockets down to the outlet
      if (side > 0.05 && load > 0.05) {
        const rr = Vv.hub + (Vv.r - 10 - Vv.hub) * Math.min(1, load * (0.6 + 0.4 * side));
        const pts = [];
        for (let j = 0; j <= 4; j++) pts.push(pt(rr, a + 0.05 + ((Math.PI / 4 - 0.1) * j) / 4));
        for (let j = 4; j >= 0; j--) pts.push(pt(Vv.hub + 2, a + 0.05 + ((Math.PI / 4 - 0.1) * j) / 4));
        cells += "M" + pts.map(P3).join("L") + "Z";
      }
    }
    els.vanes.setAttribute("d", vanes);
    els.cells.setAttribute("d", cells);
  }

  const NAMES = () => [T.pellets, T.regrind, T.film];
  function readoutNow() {
    const m = NAMES()[kind];
    if (!on && w < 0.05) return T.off.replace("{m}", m);
    if (on && w < 0.95) return T.start.replace("{m}", m);
    if (!on) return T.stopping;
    return T.run.replace("{m}", m);
  }

  function draw() {
    drawWheel();
    drawValve();
    const buckets = { fan: "", hopper: "", glass: "", receiver: "", drop: "" };
    for (const p of parts) {
      if (p.stage < 0) continue;
      const pos = positionOf(p);
      if (!pos) continue;
      const size = KINDS[p.kind].size * (p.stage === 0 ? 1 - 0.5 * p.t : 1);
      const key = p.stage === 0 ? "hopper" : p.stage === 2 ? "fan" : p.stage === 4 ? "glass" : p.stage === 6 ? "receiver" : "drop";
      buckets[key] += blob(pos, size, p.s);
    }
    for (const key of Object.keys(buckets)) if (els[key]) els[key].setAttribute("d", buckets[key]);
    if (els.sock) {
      const [bx, by] = els.sock.dataset.base.split(" ").map(Number);
      els.sock.setAttribute("transform", `translate(${bx} ${by}) scale(1 ${sock.toFixed(3)}) translate(${-bx} ${-by})`);
    }
    say(readoutNow());
  }

  function step(dt) {
    clock += dt;
    if (touring) {
      tourAt += dt;
      const t = tourAt % TOUR_LEN;
      let s = TOUR[0];
      for (const entry of TOUR) if (t >= entry[0]) s = entry;
      if (s[2] !== kind) setKind(s[2], false);
      if (!!s[1] !== on) setOn(!!s[1]);
    } else if (!still.matches && !hovering && quiet > 0 && performance.now() - quiet >= RESUME_MS) { touring = true; tourAt = 0; disarmRestart(); }
    if (still.matches) { w = on ? 1 : 0; sock = on ? 1.02 : 0.9; return; }
    simulate(dt);
  }
  function simulate(dt) {
    w += ((on ? 1 : 0) - w) * (1 - Math.exp(-dt / (on ? SPIN_UP : SPIN_DOWN)));
    if (Math.abs(w - (on ? 1 : 0)) < 1e-3) w = on ? 1 : 0;
    sock += ((0.9 + 0.12 * w) - sock) * (1 - Math.exp(-dt / 0.5));
    beta += 2 * Math.PI * WHEEL_REV * w * dt;
    gamma += 2 * Math.PI * VALVE_REV * dt;
    spawnDebt += FEED * w * (on ? 1 : 0) * dt;
    while (spawnDebt >= 1) {
      spawnDebt -= 1;
      const free = parts.find((p) => p.stage < 0);
      if (free) spawn(free);
    }
    for (const p of parts) if (p.stage >= 0) advance(p, dt);
  }

  function setOn(v) {
    if (v === on) return;
    on = v;
    announce(v ? T.started : T.stopped);
  }
  function setKind(v, user) {
    if (v === kind) return;
    kind = v;
    if (user) announce(T.material.replace("{m}", NAMES()[kind]));
  }
  function takeOver() { touring = false; quiet = performance.now(); }
  // A stop made by the reader comes back on by itself RESTART_MS later; any further input restarts the wait.
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    setOn(true);
    run(); if (still.matches) draw();
  }
  const afterInput = () => (on ? disarmRestart() : armRestart());
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    draw();
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (still.matches) { step(0); draw(); return; }
    if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
  };
  svg.addEventListener("click", (event) => {
    const hit = event.target.closest && event.target.closest("[data-hit]");
    if (!hit) return;
    takeOver();
    if (hit.dataset.hit === "hopper") setKind((kind + 1) % 3, true); else setOn(!on);
    afterInput(); run(); if (still.matches) draw();
  });
  stage.addEventListener("keydown", (event) => {
    let handled = true;
    if (event.key === " " || event.key === "Enter") setOn(!on);
    else if (event.key === "1" || event.key === "2" || event.key === "3") setKind(Number(event.key) - 1, true);
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    takeOver(); afterInput(); run(); if (still.matches) draw();
  });
  // Only a real mouse pauses the tour on hover; a tap on a phone fires pointerenter too.
  stage.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = true;
    if (touring) { takeOver(); if (!on && !restartAt) armRestart(); }
  });
  stage.addEventListener("pointerleave", () => { if (!hovering) return; hovering = false; quiet = performance.now(); });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  // Start with the line already running, so the first frame shows material on its way.
  for (let i = 0; i < 260; i++) simulate(1 / 30);
  draw();
}
