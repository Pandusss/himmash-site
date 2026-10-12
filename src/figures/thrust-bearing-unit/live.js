// Live behaviour of the thrust bearing unit figure. While the extruder runs, melt pressure pushes the
// screw back: the axial load (in % of the working load) passes from the sleeve collar into the thrust
// bearing and the housing. The sleeve and the roller crown turn (slowed down), water flows in the jacket.
// The idle tour walks the load path part by part, then stops the unit, takes it apart and rebuilds it.
const PARTS = ["sleeve", "thrust", "housing", "radial", "cover"];
const SPIN = 1.3;          // sleeve, rad/s of figure time (slowed down)
const CAGE = 0.44;         // roller crown of a thrust bearing turns at a little under half the shaft speed
const RESUME_MS = 8000;    // the tour resumes this long after the last input (wall clock)
const RESTART_MS = 6000;   // a unit the reader took apart goes back together by itself this long after the last input
// "Load path": four steps that follow the axial load from the screw into the frame, one part at a time.
const PATH = [
  { part: "sleeve", text: "path1" },
  { part: "thrust", text: "path2" },
  { part: "housing", text: "path3" },
  { part: "housing", text: "path4" },
];
const PATH_STEP_MS = 3200;
const TOUR = [
  { run: true, part: null, dur: 3 },
  { part: "sleeve", dur: 2.2 },
  { part: "thrust", dur: 2.4 },
  { part: "housing", dur: 2.2 },
  { part: "radial", dur: 2.2 },
  { part: "cover", dur: 2 },
  { part: null, apart: true, dur: 5.2 },
  { apart: false, dur: 2.6 },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  // Camera, the same numbers the build used.
  const A = (F.view.azimuth * Math.PI) / 180, E = (F.view.elevation * Math.PI) / 180;
  const sA = Math.sin(A), cA = Math.cos(A), sE = Math.sin(E), cE = Math.cos(E);
  const KS = F.view.scale * Math.sqrt(1.6);
  const [OX, OY] = F.view.origin;
  const VIEW = [cA * cE, sA * cE, sE];
  const iso = (x, y, z) => [OX + (x * sA - y * cA) * KS, OY + ((x * cA + y * sA) * sE - z * cE) * KS];
  const at = (s, r, t) => iso(s, r * Math.cos(t), F.axisZ + r * Math.sin(t));
  const f1 = (v) => Math.round(v * 10) / 10;

  const groups = {};
  PARTS.forEach((name) => (groups[name] = [...svg.querySelectorAll(`[data-part="${name}"]`)]));
  const movers = { cover: [...svg.querySelectorAll('[data-move="cover"]')], cartridge: [...svg.querySelectorAll('[data-move="cartridge"]')] };
  const rollers = [...svg.querySelectorAll(".tu-rollers")];
  const panner = svg.querySelector("[data-pan]");
  const holes = [...svg.querySelectorAll(".tu-hole")];
  const splines = [...svg.querySelectorAll(".tu-spline")];
  const flows = [...svg.querySelectorAll(".tu-flow")];

  // State.
  let running = true, load = 0, speed = 0, angle = 0, flow = 0, clock = 0;
  let selected = null, hovered = null;
  const pieces = { cover: { x: 0, v: 0, goal: 0, at: 0 }, cartridge: { x: 0, v: 0, goal: 0, at: 0 } };
  let wantApart = false, apart = false;
  let touring = !still.matches, tourStep = 0, tourClock = 0, quiet = 0;
  let frame = 0, last = 0, visible = false, phrase = "";
  let restartAt = 0, restartTimer = 0, startPending = false;
  let pathAt = 0, pathStep = -1, pathWait = false, focused = null;
  // A message for the card's toast (the loader shows it in large type over the drawing).
  const toast = (title) => stage.dispatchEvent(new CustomEvent("anatomy-toast", { detail: { title } }));

  const number = (v) => String(Math.round(v * 100));
  function say(text) {
    if (restartAt) text += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  // Critically damped follow of one assembly toward its goal.
  function settle(p, dt, calm) {
    if (calm) { p.x = p.goal; p.v = 0; return false; }
    const w = 1 / 0.2;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      p.v += (w * w * (p.goal - p.x) - 2 * w * p.v) * h;
      p.x += p.v * h;
    }
    if (Math.abs(p.goal - p.x) < 1e-3 && Math.abs(p.v) < 1e-3) { p.x = p.goal; p.v = 0; }
    return p.x !== p.goal;
  }

  // Opening: the cover leaves first, the sleeve after it. Closing: the sleeve goes home first.
  function setApart(on) {
    wantApart = on;
    if (on) { running = false; startPending = false; }
  }
  function schedule(on) {
    const first = on ? pieces.cover : pieces.cartridge;
    const second = on ? pieces.cartridge : pieces.cover;
    first.goalNext = on ? 1 : 0; first.at = clock;
    second.goalNext = on ? 1 : 0; second.at = clock + (still.matches ? 0 : F.spring.stagger);
    apart = on;
    announce(on ? T.parted : T.joined);
  }

  function step(dt) {
    clock += dt;
    const calm = still.matches;
    // Tour.
    if (touring && !calm) {
      tourClock += dt;
      const s = TOUR[tourStep];
      if (tourClock >= s.dur) {
        tourStep = (tourStep + 1) % TOUR.length;
        tourClock = 0;
        enter(TOUR[tourStep]);
      }
    } else if (!touring && !calm && !hovered && quiet && pathStep < 0 && !pathWait && performance.now() - quiet >= RESUME_MS) {
      resumeTour();
    }
    // Arming: stop before taking apart; take apart only once the sleeve has stopped.
    if (wantApart && !apart && speed < 0.03 && load < 0.03) schedule(true);
    if (!wantApart && apart) schedule(false);
    for (const p of Object.values(pieces)) if (p.goalNext !== undefined && clock >= p.at) { p.goal = p.goalNext; p.goalNext = undefined; }
    const moving = settle(pieces.cover, dt, calm) | settle(pieces.cartridge, dt, calm);
    const home = pieces.cover.x === 0 && pieces.cartridge.x === 0 && pieces.cover.goal === 0 && pieces.cartridge.goal === 0;
    if (!wantApart && home && !apart && !running && touring) running = true;
    if (startPending && home && !apart && running) { startPending = false; announce(T.started); }
    // Load path: wait until the unit is together and loaded, then walk the four steps.
    if (pathWait && home && !apart && running && load > 0.6) { pathWait = false; pathStep = 0; pathAt = performance.now(); showPath(); }
    if (pathStep >= 0) {
      const next = Math.floor((performance.now() - pathAt) / PATH_STEP_MS);
      if (next >= PATH.length) { pathStep = -1; selected = null; quiet = performance.now(); toast(T.pathDone); announce(T.pathDone); }
      else if (next !== pathStep) { pathStep = next; showPath(); }
    }
    // Drive and load: the motor brings the sleeve up to speed, melt pressure builds behind it.
    const on = running && home;
    const k1 = calm ? 1 : 1 - Math.exp(-dt / (on ? 0.5 : 0.25));
    const k2 = calm ? 1 : 1 - Math.exp(-dt / (on ? 0.9 : 0.3));
    speed += ((on ? 1 : 0) - speed) * k1;
    const ripple = on ? 0.03 * Math.sin(clock * 1.7) + 0.015 * Math.sin(clock * 4.3) : 0;
    load += ((on ? 0.97 + ripple : 0) - load) * k2;
    if (Math.abs(load) < 1e-3 && !on) load = 0;
    if (speed < 1e-3 && !on) speed = 0;
    angle = (angle + SPIN * speed * dt) % (Math.PI * 2);
    flow = (flow + dt * 9 * (0.3 + 0.7 * speed)) % 10;
    return moving;
  }

  function showPath() {
    const s = PATH[pathStep];
    selected = s.part;
    toast(T[s.text]);
    announce(T[s.text]);
  }
  // Start the load-path demo: put the unit together and running first if it is apart or stopped.
  function startPath() {
    disarmRestart();
    if (wantApart || apart) setApart(false);
    running = true;
    selected = null;
    pathStep = -1;
    pathWait = true;
    if (still.matches) { pathWait = false; pathStep = 0; pathAt = performance.now(); showPath(); }
  }
  function enter(s) {
    if (s.run) { running = true; announce(T.started); }
    if ("part" in s) selected = s.part;
    if (s.apart === true) setApart(true);
    if (s.apart === false) setApart(false);
  }
  // Any input hands the figure to the reader; the tour comes back RESUME_MS after the last one.
  function takeOver() { touring = false; quiet = performance.now(); }
  function resumeTour() {
    touring = true; tourClock = 0; quiet = 0;
    disarmRestart();
    tourStep = apart || wantApart ? TOUR.length - 1 : 0;
    enter(TOUR[tourStep]);
  }

  function rollerPaths(phase) {
    const { s0, s1, r0, r1, count } = F.rollers;
    const slope = (r1 - r0) / (s1 - s0);
    const out = ["", "", "", ""];
    for (let i = 0; i < count; i++) {
      const t = phase + (i / count) * Math.PI * 2;
      const c = Math.cos(t), n = Math.sin(t), m = Math.hypot(slope, 1);
      const facing = (-slope * VIEW[0] + c * VIEW[1] + n * VIEW[2]) / m;
      const a = ease((facing - 0.1) / 0.45);
      if (a < 0.13) continue;
      const b = Math.min(3, Math.round(a * 4) - 1);
      const p = at(s0, r0, t), q = at(s1, r1, t);
      out[b] += `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`;
    }
    return out;
  }
  function starPath(phase) {
    const { s, bore, teeth } = F.face;
    let d = "";
    for (let i = 0; i < teeth; i++) {
      for (const [f, r] of [[0, bore], [0.36, bore], [0.5, bore - 5], [0.86, bore - 5]]) {
        const p = at(s, r, phase + ((i + f) / teeth) * Math.PI * 2);
        d += `${d ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`;
      }
    }
    return d + "Z";
  }

  let lastAngle = null, lastOn = null;
  function draw() {
    // Moving assemblies.
    for (const [name, nodes] of Object.entries(movers)) {
      const x = pieces[name].x, m = F.moves[name];
      const text = x ? `translate(${(m[0] * x).toFixed(2)} ${(m[1] * x).toFixed(2)})` : "";
      nodes.forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
    }
    // The camera follows the parts so both poses sit in the middle of the card.
    const share = (pieces.cover.x + pieces.cartridge.x) / 2;
    if (panner) {
      if (share) panner.setAttribute("transform", `translate(${(F.pan[0] * share).toFixed(2)} ${(F.pan[1] * share).toFixed(2)})`);
      else panner.removeAttribute("transform");
    }
    // Turning parts.
    if (angle !== lastAngle) {
      lastAngle = angle;
      const crown = rollerPaths(angle * CAGE);
      rollers.forEach((node) => node.setAttribute("d", crown[Number(node.dataset.b)]));
      const star = starPath(-angle);
      holes.forEach((node) => node.setAttribute("d", star));
      splines.forEach((node) => node.setAttribute("d", star));
    }
    const offset = (-flow).toFixed(2);
    flows.forEach((node) => node.setAttribute("stroke-dashoffset", offset));
    // Lit part: the one the reader picked or hovers, else the thrust bearing while the load is on.
    const busy = pieces.cover.x > 0 || pieces.cartridge.x > 0 || apart;
    const on = hovered || selected || (busy ? null : load > 0.05 ? "thrust" : null);
    if (on !== lastOn) {
      lastOn = on;
      PARTS.forEach((name) => groups[name].forEach((node) => node.toggleAttribute("data-on", name === on)));
    }
    // Focus: a picked part is filled with the accent and everything else fades, so it reads even inside.
    const focus = hovered || selected || null;
    if (focus !== focused) { focused = focus; svg.toggleAttribute("data-focus", !!focus); }
    // Readout.
    const p = number(load);
    const moving = pieces.cover.x !== pieces.cover.goal || pieces.cartridge.x !== pieces.cartridge.goal || pieces.cover.goalNext !== undefined || pieces.cartridge.goalNext !== undefined;
    if (on && on !== "thrust" || (on === "thrust" && (hovered || selected))) say(T[on].replace("{p}", p));
    else if (moving) say(apart ? T.opening : T.closing);
    else if (apart) say(T.apart);
    else if (wantApart || (!running && load > 0.01)) say(T.stop.replace("{p}", p));
    else if (!running) say(T.stopped);
    else say(T.run.replace("{p}", p));
  }

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
  const refresh = () => { if (still.matches) { step(0); draw(); } else run(); };

  // Taking the unit apart stops it; when the reader did that, it goes back together and starts by itself
  // RESTART_MS later. Any further input while it waits restarts the wait.
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    setApart(false);
    running = true;
    if (still.matches) { step(0); announce(T.started); draw(); }
    else { startPending = true; run(); }
  }
  const afterInput = () => { if (!wantApart) disarmRestart(); else if (restartAt) armRestart(); };

  const partOf = (event) => {
    const node = event.target.closest && event.target.closest("[data-part]");
    return node ? node.dataset.part : null;
  };
  // Only a real mouse counts as hover; a tap on a phone fires pointer events too.
  svg.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const name = partOf(event);
    if (name !== hovered) { hovered = name; takeOver(); refresh(); }
  });
  svg.addEventListener("pointerleave", () => { if (!hovered) return; hovered = null; takeOver(); refresh(); });
  // A click on a part takes the unit apart and shows that part; a click on the shown part (or beside the
  // unit) puts it back together; a click on another part while apart shows that one.
  svg.addEventListener("click", (event) => {
    const name = partOf(event);
    takeOver();
    pathStep = -1; pathWait = false;
    if (name && !wantApart) { setApart(true); armRestart(); selected = name; }
    else if (name && name !== selected) selected = name;
    else if (wantApart) { setApart(false); running = true; selected = null; }
    else selected = null;
    afterInput();
    if (still.matches) {
      if (wantApart) { running = false; load = 0; speed = 0; schedule(true); } else { schedule(false); running = true; }
    }
    refresh();
  });
  stage.addEventListener("keydown", (event) => {
    const key = event.key;
    let handled = true;
    const pick = (name) => { pathStep = -1; pathWait = false; selected = name; if (!wantApart) { setApart(true); armRestart(); } };
    if (key === "p" || key === "P" || key === "з" || key === "З") startPath();
    else if (/^[1-5]$/.test(key)) pick(PARTS[Number(key) - 1]);
    else if (key === "ArrowRight" || key === "ArrowDown") pick(PARTS[(PARTS.indexOf(selected) + 1) % PARTS.length]);
    else if (key === "ArrowLeft" || key === "ArrowUp") pick(PARTS[(PARTS.indexOf(selected) + PARTS.length - 1) % PARTS.length]);
    else if (key === " " || key === "Enter") { pathStep = -1; pathWait = false; setApart(!wantApart); if (!wantApart) running = true; if (wantApart) armRestart(); }
    else if (key === "Escape") { pathStep = -1; pathWait = false; selected = null; }
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    takeOver();
    afterInput();
    if (still.matches && (key === " " || key === "Enter")) {
      if (wantApart) { running = false; load = 0; speed = 0; schedule(true); } else { schedule(false); running = true; }
    }
    refresh();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  if (touring) enter(TOUR[0]);
  else { load = 0.97; speed = 1; }
  step(0);
  draw();
}
