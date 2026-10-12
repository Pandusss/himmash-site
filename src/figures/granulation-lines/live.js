// Live behaviour of the recycling line figure. Material keeps moving through the line: film flakes ride
// the infeed belt into the shredder, washed flakes drift along the flotation bath, pellets drop from the
// auger spout into the big bag. The idle tour walks along the line unit by unit (lighting it and naming
// its role in the readout); the reader picks a unit by pointing at it or with the arrow keys.
const STEP = 2.1;          // seconds per unit on the tour
const REST = 2.6;          // pause on the whole line at the end of a lap
const G = 9810;            // mm/s², pellets fall freely from the spout
const RESUME_MS = 8000;    // the tour resumes this long after the last input (wall clock)
const RESTART_MS = 6000;   // a stop made by the reader comes back on by itself this long after the last input

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";

  const A = (F.view.azimuth * Math.PI) / 180, E = (F.view.elevation * Math.PI) / 180;
  const sA = Math.sin(A), cA = Math.cos(A), sE = Math.sin(E), cE = Math.cos(E);
  const KS = F.view.scale * Math.sqrt(1.6);
  const [OX, OY] = F.view.origin;
  const iso = (x, y, z) => [OX + (x * sA - y * cA) * KS, OY + ((x * cA + y * sA) * sE - z * cE) * KS];

  const units = [...svg.querySelectorAll("[data-unit]")].sort((a, b) => a.dataset.unit - b.dataset.unit);
  const count = F.units.length;

  // Particles: preallocated circles, moved by attribute writes.
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function dots(container, n, r) {
    if (!container) return [];
    return Array.from({ length: n }, () => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", r);
      container.appendChild(c);
      return { node: c, u: rand(), side: rand() * 2 - 1, phase: rand() * 6.28 };
    });
  }
  const belt = dots(svg.querySelector('[data-flakes="belt"]'), 9, 0.95);
  const bath = dots(svg.querySelector('[data-flakes="bath"]'), 16, 0.95);
  const fall = dots(svg.querySelector("[data-pellets]"), 9, 0.8);

  let clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let running = true, flow = 1;
  let selected = null, hovered = null;
  let touring = !still.matches, tourClock = 0, quiet = 0;
  let restartAt = 0, restartTimer = 0;

  function say(text) {
    if (restartAt) text += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  function tourAt(t) {
    const lap = count * STEP + REST;
    const u = t % lap;
    return u < count * STEP ? Math.floor(u / STEP) : null;
  }

  function step(dt) {
    clock += dt;
    if (touring) tourClock += dt;
    else if (!still.matches && hovered === null && quiet && performance.now() - quiet >= RESUME_MS) {
      touring = true; tourClock = 0; quiet = 0; selected = null;
      if (!running) { running = true; announce(T.started); }
      disarmRestart();
    }
    flow += ((running ? 1 : 0) - flow) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.6));
    if (!running && flow < 1e-3) flow = 0;
    const d = dt * flow;
    belt.forEach((p) => { p.u = (p.u + d * 0.16) % 1; });
    bath.forEach((p) => { p.u = (p.u + d * 0.07) % 1; });
    fall.forEach((p) => { p.u += d * 1.6; if (p.u >= 1) { p.u %= 1; p.side = rand() * 2 - 1; p.phase = rand() * 6.28; } });
  }

  let lastOn = -2;
  function draw() {
    const { x0, z0, x1, z1 } = F.belt;
    belt.forEach((p) => {
      const u = 0.04 + p.u * 0.9;
      const [sx, sy] = iso(x0 + (x1 - x0) * u, F.beltY + p.side * 200, z0 + (z1 - z0) * u + 10);
      p.node.setAttribute("cx", sx.toFixed(1));
      p.node.setAttribute("cy", sy.toFixed(1));
    });
    const B = F.bath;
    bath.forEach((p) => {
      const x = B.x0 + (B.x1 - B.x0) * p.u;
      const y = B.y0 + (B.y1 - B.y0) * (0.5 + 0.5 * p.side) + 40 * Math.sin(clock * 0.8 + p.phase);
      const [sx, sy] = iso(x, y, B.z);
      p.node.setAttribute("cx", sx.toFixed(1));
      p.node.setAttribute("cy", sy.toFixed(1));
      p.node.style.opacity = flow > 0.02 || p.u > 0 ? "" : "0";
    });
    const [spx, spy, spz] = F.spout;
    const height = spz - 60 - F.bagTop;
    fall.forEach((p) => {
      const t = p.u * Math.sqrt((2 * height) / G);
      const z = spz - 60 - 0.5 * G * t * t;
      const [sx, sy] = iso(spx + p.side * 50 + 120 * t * Math.cos(p.phase), spy + 80 * Math.sin(p.phase) * p.u, z);
      p.node.setAttribute("cx", sx.toFixed(1));
      p.node.setAttribute("cy", sy.toFixed(1));
      p.node.style.opacity = flow > 0.05 ? "" : "0";
    });
    const toured = touring ? tourAt(tourClock) : null;
    const on = hovered !== null ? hovered : selected !== null ? selected : toured;
    if (on !== lastOn) {
      lastOn = on;
      units.forEach((node, i) => node.toggleAttribute("data-on", i === on));
    }
    if (on !== null && on !== undefined) say(T.step.replace("{n}", on + 1).replace("{text}", T.units[on]));
    else say(running ? T.run : T.stopped);
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
  // Any input hands the figure to the reader; the tour comes back RESUME_MS after the last one.
  function takeOver() { touring = false; quiet = performance.now(); }
  // A stop made by the reader comes back on by itself RESTART_MS later; any further input restarts the wait.
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    running = true;
    announce(T.started);
    refresh();
  }
  const afterInput = () => (running ? disarmRestart() : armRestart());

  const unitOf = (event) => {
    const node = event.target.closest && event.target.closest("[data-unit]");
    return node ? Number(node.dataset.unit) : null;
  };
  // Only a real mouse counts as hover; a tap on a phone fires pointer events too.
  svg.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const i = unitOf(event);
    if (i !== hovered) { hovered = i; takeOver(); refresh(); }
  });
  svg.addEventListener("pointerleave", () => { if (hovered === null) return; hovered = null; takeOver(); refresh(); });
  svg.addEventListener("click", (event) => {
    const i = unitOf(event);
    takeOver();
    selected = i !== null && i !== selected ? i : null;
    afterInput();
    refresh();
  });
  stage.addEventListener("keydown", (event) => {
    const key = event.key;
    const from = selected !== null ? selected : touring && tourAt(tourClock) !== null ? tourAt(tourClock) : null;
    let handled = true;
    if (key === "ArrowRight" || key === "ArrowDown") selected = from === null ? 0 : Math.min(count - 1, from + 1);
    else if (key === "ArrowLeft" || key === "ArrowUp") selected = from === null ? count - 1 : Math.max(0, from - 1);
    else if (key === "Home") selected = 0;
    else if (key === "End") selected = count - 1;
    else if (key === "Escape") selected = null;
    else if (key === " " || key === "Enter") { running = !running; announce(running ? T.started : T.halted); }
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    takeOver();
    afterInput();
    refresh();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  step(0);
  draw();
}
