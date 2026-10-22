// Live behaviour of a machine cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs): its rotors
// turn, the material moves, belts and slats slide and the water marks run. Space or Enter, a click on the machine or
// the first button stops and starts it (a stop comes back on by itself after a while); the arrows change its speed in
// 10 % steps, and the readout gives the machine's own figures at that speed. The part named first in the keys is lit.
import { makeRotors, makeSlides, makeFlows, makeMarks, splitLayers } from "./parts.js";

const RESTART_MS = 8000;
const SPEEDS = [0.3, 1.5];

export function mountUnit(stage, { text: T, data: F }) {
  const base = stage.querySelector("svg");
  if (T.label) base.setAttribute("aria-label", T.label);
  if (F.lit) base.querySelectorAll(F.lit).forEach((node) => node.setAttribute("data-on", ""));
  const svg = splitLayers(base, F);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;

  const rotors = makeRotors(svg, F);
  const slides = makeSlides(svg, F);
  const flows = makeFlows(svg, F);
  const marks = makeMarks(svg);
  const angles = rotors.map(() => 0);

  let running = true, flow = 1, speed = 1, visible = false, frame = 0, last = 0, pending = 0;
  let restartAt = 0, restartTimer = 0, phrase = "";
  const pct = () => Math.round(speed * 100);
  // A template's {name} takes the machine's figure for that name at the current speed; {n} is the speed in per cent.
  const fill = (template) => template.replace(/\{(\w+)\}/g, (_, name) => {
    if (name === "n") return pct();
    if (name === "s") return Math.max(1, Math.ceil((restartAt - performance.now()) / 1000));
    const v = F.values && F.values[name];
    if (v === undefined) return `{${name}}`;
    const x = v * speed;
    const digits = Math.abs(x) < 10 && x % 1 ? 1 : 0;
    return x.toFixed(digits).replace(".", T.decimal || ".").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  });
  function say() {
    let text = fill(running ? T.run : T.stopped);
    if (restartAt) text += " · " + fill(T.restart);
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  function update(dt) {
    flow += ((running ? 1 : 0) - flow) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.6));
    if (!running && flow < 1e-3) flow = 0;
    const go = flow * speed;
    rotors.forEach((r, i) => { angles[i] += dt * r.R.speed * TAU * go; r.draw(angles[i]); });
    flows.forEach((f) => f.move(dt * go));
    slides.forEach((s) => s.move(dt * go));
    marks(dt, go);
    [base, svg].forEach((layer) => layer.toggleAttribute("data-stopped", !running));
    say();
  }
  // The drawing changes at most 30 times a second; between those updates the browser repaints nothing.
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    pending += dt;
    if (pending >= 1 / 30) { update(Math.min(pending, 0.1)); pending = 0; }
    frame = visible && !still.matches && (running || flow > 0) ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); }
    else if (still.matches) update(0);
  }

  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { say(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    running = true;
    announce(fill(T.start));
    run();
  }
  function toggle() {
    running = !running;
    announce(fill(running ? T.start : T.stop));
    if (running) disarmRestart();
    else { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  }
  function setSpeed(next) {
    speed = Math.min(SPEEDS[1], Math.max(SPEEDS[0], Math.round(next * 10) / 10));
    if (!running) { running = true; disarmRestart(); }
    announce(fill(T.speed));
  }

  base.addEventListener("click", () => { toggle(); run(); });
  stage.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key === " " || key === "Enter") toggle();
    else if (key === "ArrowUp" || key === "ArrowRight") setSpeed(speed + 0.1);
    else if (key === "ArrowDown" || key === "ArrowLeft") setSpeed(speed - 0.1);
    else return;
    event.preventDefault();
    run();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  still.addEventListener("change", () => { update(0); run(); });
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  update(0);
}
