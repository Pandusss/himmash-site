// Live behaviour of the screen changer figure. Melt splits into two channels, one per slide plate.
// Each channel's screen clogs with the flow through it; when the inlet pressure reaches the set point,
// the hydraulics move the plate with the dirtier screen by one window pitch in 2.5 s, and the melt keeps
// flowing through the other channel meanwhile. The used screen comes out and the operator replaces it.
const OPEN_FULL = 65;    // window offset (mm) up to which the 125 mm window still uncovers the whole bore
const OPEN_NONE = 185;   // offset at which the bore is fully covered by the web between windows
const RATE = 0.045;      // clogging per second of figure time at an even split (time is accelerated)
const R_SET = 1.55;      // channel resistance at the set point
const REPLACE_AFTER = 1.4;
const REPLACE_FOR = 1.6;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function mount(stage) {
  const T = JSON.parse(stage.dataset.text);
  const F = JSON.parse(stage.dataset.figure);
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".sc-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const parts = [0, 1].map((i) => [...svg.querySelectorAll(`[data-plate="${i}"]`)]);
  const dirt = [...svg.querySelectorAll(".sc-dirt")].sort((a, b) => a.dataset.window - b.dataset.window);
  const number = (v, digits = 0) => v.toFixed(digits).replace(".", T.decimal);

  const plates = [0, 1].map(() => ({ s: 0, from: 0, to: 0, started: -1 }));
  const clog = [0.5, 0, 0.12, 0];          // windows: plate 0 lower, upper; plate 1 lower, upper
  const replacing = [null, null, null, null];
  let clock = 0, last = 0, frame = 0, visible = false, hovered = -1, pressure = 0, phrase = "";

  const offsets = (p) => [p.s * F.stroke, (1 - p.s) * F.stroke];
  const openOf = (d) => clamp((OPEN_NONE - Math.abs(d)) / (OPEN_NONE - OPEN_FULL), 0, 1);
  const inMelt = (i) => (plates[i].s < 0.5 ? i * 2 : i * 2 + 1);
  const outside = (i) => (plates[i].s < 0.5 ? i * 2 + 1 : i * 2);
  const moving = () => plates.findIndex((p) => p.started >= 0);

  function flows() {
    const per = plates.map((p, i) => offsets(p).map((d, w) => openOf(d) / (1 + 4 * clog[i * 2 + w])));
    const total = per.flat().reduce((a, b) => a + b, 0) || 1e-6;
    return { per, total };
  }

  function say(text) {
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) {
    if (live && phrase !== text) { phrase = text; live.textContent = text; }
  }

  function start(i) {
    const p = plates[i];
    if (p.started >= 0 || moving() >= 0 || clog[outside(i)] > 0.02) return false;
    p.from = p.s; p.to = p.s < 0.5 ? 1 : 0; p.started = clock;
    announce(T.started.replace("{n}", i + 1));
    if (still.matches) finish(i);
    return true;
  }
  function finish(i) {
    const p = plates[i];
    p.s = p.to; p.started = -1;
    const out = outside(i);
    if (clog[out] > 0.02) replacing[out] = clock + (still.matches ? 0 : REPLACE_AFTER);
    announce(T.done.replace("{n}", i + 1));
  }

  function step(dt) {
    clock += dt;
    plates.forEach((p, i) => {
      if (p.started < 0) return;
      const t = (clock - p.started) / F.change;
      p.s = p.from + (p.to - p.from) * smooth(t);
      if (t >= 1) finish(i);
    });
    const { per, total } = flows();
    per.forEach((list, i) => list.forEach((g, w) => { clog[i * 2 + w] = Math.min(1, clog[i * 2 + w] + RATE * 2 * (g / total) * dt); }));
    replacing.forEach((at, w) => {
      if (at === null || clock < at) return;
      clog[w] = Math.max(0, clog[w] - dt / REPLACE_FOR);
      if (clog[w] === 0) replacing[w] = null;
    });
    pressure = 100 / total / R_SET;
    if (pressure >= 100 && moving() < 0) {
      const next = [0, 1].sort((a, b) => clog[inMelt(b)] - clog[inMelt(a)]).find((i) => clog[outside(i)] <= 0.02);
      if (next !== undefined) start(next);
    }
  }

  function draw() {
    plates.forEach((p, i) => {
      const dx = F.down[0] * p.s, dy = F.down[1] * p.s;
      const text = p.s ? `translate(${dx.toFixed(2)} ${dy.toFixed(2)})` : "";
      parts[i].forEach((node) => {
        if (text) node.setAttribute("transform", text); else node.removeAttribute("transform");
        node.querySelectorAll("[data-hold]").forEach((hold) => (text ? hold.setAttribute("transform", `translate(${(-dx).toFixed(2)} ${(-dy).toFixed(2)})`) : hold.removeAttribute("transform")));
      });
    });
    clog.forEach((c, w) => dirt[w] && dirt[w].setAttribute("opacity", (0.78 * smooth(c)).toFixed(3)));
    const busy = moving();
    const next = [0, 1].sort((a, b) => clog[inMelt(b)] - clog[inMelt(a)])[0];
    const on = busy >= 0 ? busy : hovered >= 0 ? hovered : next;
    parts.forEach((list, i) => list.forEach((node) => node.toggleAttribute("data-on", i === on)));
    if (busy >= 0) {
      say(T.change.replace("{n}", busy + 1).replace("{t}", number(clamp(clock - plates[busy].started, 0, F.change), 1)));
    } else {
      const w = replacing.findIndex((at) => at !== null);
      say(w >= 0 ? T.replace.replace("{n}", Math.floor(w / 2) + 1) : T.pressure.replace("{p}", number(Math.round(pressure))));
    }
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

  const plateOf = (event) => {
    const node = event.target.closest && event.target.closest("[data-plate]");
    return node ? Number(node.dataset.plate) : -1;
  };
  svg.addEventListener("pointermove", (event) => { hovered = plateOf(event); if (still.matches) draw(); });
  svg.addEventListener("pointerleave", () => { hovered = -1; if (still.matches) draw(); });
  svg.addEventListener("click", (event) => { const i = plateOf(event); if (i >= 0) { start(i); run(); draw(); } });
  stage.addEventListener("keydown", (event) => {
    let i = -1;
    if (event.key === "1") i = 0;
    if (event.key === "2") i = 1;
    if (event.key === " " || event.key === "Enter") i = [0, 1].sort((a, b) => clog[inMelt(b)] - clog[inMelt(a)])[0];
    if (i < 0) return;
    event.preventDefault();
    start(i); run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  step(0);
  draw();
}

// The drawing is a separate file, fetched when the figure comes near the viewport.
function load(stage) {
  if (stage.querySelector("svg")) return mount(stage);
  const go = () => fetch(stage.dataset.src)
    .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
    .then((markup) => {
      stage.insertAdjacentHTML("afterbegin", markup);
      stage.removeAttribute("aria-busy");
      mount(stage);
    })
    .catch(() => stage.setAttribute("data-failed", ""));
  const io = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { io.disconnect(); go(); }
  }, { rootMargin: "600px 0px" });
  io.observe(stage);
}

document.querySelectorAll(".sc-stage").forEach(load);
