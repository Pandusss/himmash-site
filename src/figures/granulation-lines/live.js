// Live behaviour of the whole-line figure. On first sight the line starts up unit by unit along the material flow,
// and the idle tour walks it, lighting each unit in turn and naming its role; the reader picks a unit by clicking it
// or with the arrow keys, the camera moves in onto it and a card names it with its key figures and a link to its
// page (Escape, or a second click, returns to the whole line). P plays the material path: the camera follows the
// material from the bale to the bag. Space stops and starts the line.
import { makeRotors, makeSlides, makeFlows, makeMarks, splitLayers } from "./parts.js";

const STEP = 3;            // seconds per unit on the tour: long enough to find the lit unit and read its line
const REST = 5;            // each lap opens on the whole line
const RESUME_MS = 12000;   // the tour resumes this long after the last input
const RESTART_MS = 6000;   // a stop made by the reader comes back on by itself this long after the last input
const ZOOM_MS = 1100;
const STORY_STEP = 4.2;    // seconds per unit on the material path
const BOOT_STEP = 0.3;     // seconds between units starting up (motion only; the tour lights the units)
const FIRST_LIT = 1.5;     // on first sight the tour lights its first unit this soon, while the line is still starting

export function mount(stage, { text: T, data: F }) {
  const base0 = stage.querySelector("svg");
  if (T.label) base0.setAttribute("aria-label", T.label);
  // The camera moves an HTML box holding both layers: the browser's compositor runs a transform animation on a box but
  // not on an svg element (on the svg it fell back to the page's own thread, and a move stuttered). The stage clips it.
  const cam = document.createElement("div");
  cam.style.cssText = "position:relative;height:100%;transform-origin:0 0;will-change:transform";
  base0.before(cam);
  cam.appendChild(base0);
  stage.style.overflow = "hidden";
  const loading = stage.querySelector(".anatomy-loading");
  if (loading) loading.style.display = "none";   // its rule hides it only after an svg sibling
  const svg = splitLayers(base0, F);       // the live layer: moving parts and what stands in front of them
  const layers2 = [base0, svg];
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const count = F.units.length;
  const groups = Array.from({ length: count }, (_, i) => layers2.flatMap((layer) => [...layer.querySelectorAll(`[data-unit="${i}"]`)]));

  // ---------- camera: the viewBox eases between the whole line and the box round a unit
  const base = svg.viewBox.baseVal;
  // The drawing's own box; the whole-line view is that box widened or heightened to the stage's proportions (on a phone
  // the stage is taller than the drawing, so a picked unit fills more of it and the whole line sits between bands).
  const drawn = { x: base.x, y: base.y, w: base.width, h: base.height };
  function fitted() {
    const ratio = base0.clientWidth / base0.clientHeight, own = drawn.w / drawn.h;
    if (!(ratio > 0) || Math.abs(ratio - own) < 0.01) return { ...drawn };
    if (ratio < own) { const h = drawn.w / ratio; return { x: drawn.x, y: drawn.y - (h - drawn.h) / 2, w: drawn.w, h }; }
    const w = drawn.h * ratio;
    return { x: drawn.x - (w - drawn.w) / 2, y: drawn.y, w, h: drawn.h };
  }
  let full = fitted();
  let view = { ...full }, from = view, to = view, zoomStart = 0, zoomed = null, clockMs = 0, lastVb = "";
  const recording = location.hash === "#record";
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  // A unit's box, measured once on both layers; a copy whose parts are all hidden in its layer measures 0 × 0 at the
  // origin and is left out (it pulled the camera out to the whole line).
  const unitBoxes = [];
  function unitBox(i) {
    if (unitBoxes[i] !== undefined) return unitBoxes[i];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const g of groups[i]) {
      const b = g.getBBox();
      if (!b.width && !b.height) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
    return (unitBoxes[i] = isFinite(x0) ? [x0, y0, x1, y1] : null);
  }
  function boxOf(i, k = 1.5) {
    const ub = unitBox(i);
    if (!ub) return null;
    const [x0, y0, x1, y1] = ub;
    const ratio = full.w / full.h;
    let w = Math.max((x1 - x0) * k, full.w / 6), h = (y1 - y0) * k;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    w = Math.min(w, full.w); h = Math.min(h, full.h);
    const x = Math.min(Math.max((x0 + x1) / 2 - w / 2, full.x), full.x + full.w - w);
    const y = Math.min(Math.max((y0 + y1) / 2 - h / 2, full.y), full.y + full.h - h);
    return { x, y, w, h };
  }
  // The camera. Re-rastering thousands of paths at every step of a zoom made it stutter, so a move renders once the box
  // that holds both the start and the end view, and the browser's compositor slides and scales that picture (a Web
  // Animation of the transform, sampled along the camera's own path, so no work on the page can delay a frame of it);
  // the end view is rendered sharp when the move is done. While the camera moves, the drawing holds still. A recording
  // keeps exact frames instead.
  let rendered = null, shown = null, moving = false, flights = [], flightId = 0, flightStart = 0;
  const transformOf = (v) => {
    const W = base0.clientWidth || 1000, sc = W / v.w;
    return `translate(${((rendered.x - v.x) * sc).toFixed(2)}px,${((rendered.y - v.y) * sc).toFixed(2)}px) scale(${(rendered.w / v.w).toFixed(5)})`;
  };
  const viewAt = (e) => ({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
  function fly(start) {
    flights.forEach((a) => a.cancel());
    const frames = [];
    for (let i = 0; i <= 24; i++) frames.push({ transform: transformOf(viewAt(ease(i / 24))) });
    const a = cam.animate(frames, { duration: ZOOM_MS, easing: "linear", fill: "forwards" });
    a.startTime = start;
    flights = [a];
    const id = flightId;
    a.finished.then(() => {
      if (id !== flightId || !moving) return;
      // The page's own camera clock stood still during the flight: set it to the end, so it holds the landed view.
      moving = false; view = { ...to }; zoomStart = clockMs - ZOOM_MS;
      land();
      run();
    }, () => {});
  }
  const holds = (a, b) => a.x <= b.x + 0.5 && a.y <= b.y + 0.5 && a.x + a.w >= b.x + b.w - 0.5 && a.y + a.h >= b.y + b.h - 0.5;
  function land() {
    // The sharp end view and the end of the flight in one task, so they reach the screen in the same frame.
    setViewBox(to);
    cam.style.transform = "";
    flights.forEach((a) => a.cancel());
    flights = [];
  }
  function zoomTo(i, k = 1.5) {
    const target = i === null ? full : boxOf(i, k) || full;
    zoomed = i;
    // Where the camera is now: on a flight, from the flight's own clock (the page sleeps while the compositor flies).
    if (moving && flights.length) view = viewAt(ease(Math.min(1, Math.max(0, (document.timeline.currentTime - flightStart) / ZOOM_MS))));
    from = { ...view }; to = target; zoomStart = clockMs;
    if (!recording && !still.matches) {
      // Render the union of both views, at the card's proportions, once for the whole move.
      const x0 = Math.min(from.x, to.x), y0 = Math.min(from.y, to.y), x1 = Math.max(from.x + from.w, to.x + to.w), y1 = Math.max(from.y + from.h, to.y + to.h);
      let w = x1 - x0, h = y1 - y0;
      const ratio = full.w / full.h;
      if (w / h > ratio) h = w / ratio; else w = h * ratio;
      w = Math.min(w, full.w); h = Math.min(h, full.h);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      rendered = { x: Math.min(Math.max(cx - w / 2, full.x), full.x + full.w - w), y: Math.min(Math.max(cy - h / 2, full.y), full.y + full.h - h), w, h };
      moving = true;
      const id = ++flightId;
      flights.forEach((a) => a.cancel());
      flights = [];
      // All the heavy work before take-off, while the picture stands: render the union (unless the picture on screen
      // already holds it), show the current view on it, put up the new highlight and card. Two frames later, when
      // that is on screen, the compositor flies and the page has nothing left to do until the landing (work done
      // mid-flight, even once, cost the flight a frame on a slow machine).
      if (shown && holds(shown, rendered)) rendered = shown;
      else setViewBox(rendered);
      cam.style.transform = transformOf(from);
      draw();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (id !== flightId || !moving) return;
        flightStart = document.timeline.currentTime;
        fly(flightStart);
      }));
    }
    run();
  }
  function setViewBox(r) {
    const vb = `${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}`;
    if (vb !== lastVb) { lastVb = vb; layers2.forEach((layer) => layer.setAttribute("viewBox", vb)); }
    shown = { ...r };
  }
  function moveCamera(now) {
    const t = still.matches ? 1 : Math.min(1, (now - zoomStart) / ZOOM_MS);
    view = viewAt(ease(t));
    if (!moving) setViewBox(view);
    else if (t >= 1) { moving = false; land(); }
    return t < 1;
  }

  // ---------- moving parts (parts.js): rotors, sliding groups, material dots, flow marks
  const TAU = Math.PI * 2;
  let boot = still.matches ? Infinity : 0;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const startOf = (i) => (i < 0 || boot === Infinity ? 1 : smooth((boot - BOOT_STEP * i) / 0.8));
  const rotors = makeRotors(svg, F);
  const angles = rotors.map(() => 0);
  const inView = (b) => b.x < view.x + view.w && b.x + b.w > view.x && b.y < view.y + view.h && b.y + b.h > view.y;
  // Pacing. How often the drawing changes adapts to the machine: the page watches its own frame intervals and, while
  // frames come on time, steps the rates up (smooth motion on a strong machine); when they run late, it steps them down,
  // so a weak machine keeps its frame rate and the motion stays even. Per level: the whole drawing on the whole-line view
  // and on a close view; rotors on the whole line (the lit unit's apart) and on a close view. Each rotor keeps its own
  // phase, so the redraws of different rotors fall on different frames.
  // `frame` is how often the drawing may change at all (each change costs the browser a repaint of the live layer,
  // however small); the parts' own rates spread their work over those frames. On the lowest level the rotors of the
  // whole-line view stand still, except the lit unit's.
  const PACE = [
    { frame: 1 / 15, wide: 1 / 10, close: 1 / 15, rotor: Infinity, lit: 1 / 10, near: 1 / 12 },
    { frame: 1 / 20, wide: 1 / 15, close: 1 / 20, rotor: 1 / 8, lit: 1 / 15, near: 1 / 20 },
    { frame: 1 / 30, wide: 1 / 24, close: 1 / 30, rotor: 1 / 12, lit: 1 / 24, near: 1 / 30 },
    { frame: 1 / 45, wide: 1 / 40, close: 1 / 45, rotor: 1 / 24, lit: 1 / 40, near: 1 / 45 },
  ];
  let level = recording ? PACE.length - 1 : 2, paceAt = 0, good = 0;
  const gaps = [];
  function pace(now, gap) {
    if (recording || moving || !visible || still.matches) return;
    gaps.push(gap);
    if (now - paceAt < 1500) return;
    paceAt = now;
    if (gaps.length >= 20) {
      // Late: a frame longer than 25 ms (under 40 frames a second, whatever the display's own rate).
      const late = gaps.filter((g) => g > 25).length / gaps.length;
      if (late > 0.08 && level > 0) { level--; good = 0; }
      else if (late < 0.02 && level < PACE.length - 1 && ++good >= 2) { level++; good = 0; }
      stage.dataset.pace = level;
    }
    gaps.length = 0;
  }
  const due = rotors.map((_, i) => i * 0.0137);
  let svgPx = base0.getBoundingClientRect().width || 1000;
  new ResizeObserver(() => {
    svgPx = base0.getBoundingClientRect().width || svgPx;
    // The stage changed proportions (a phone turned, the window crossed the narrow layout): refit the views.
    const next = fitted();
    if (moving || (Math.abs(next.w - full.w) < 0.5 && Math.abs(next.h - full.h) < 0.5)) return;
    full = next;
    view = from = to = zoomed === null ? { ...full } : boxOf(zoomed) || { ...full };
    zoomStart = clockMs - ZOOM_MS;
    setViewBox(view);
  }).observe(base0);
  function turn(dt) {
    const wide = view.w > full.w * 0.6;
    rotors.forEach((r, i) => {
      angles[i] += dt * r.R.speed * TAU * flow * startOf(r.unit);
      if (moving) return;
      const P = PACE[level];
      const every = still.matches || recording ? 0 : !wide ? P.near : r.unit === lastOn ? P.lit : P.rotor;
      if (every === Infinity) return;
      due[i] -= dt;
      if (due[i] > 0 && dt > 0) return;
      due[i] += every;
      if (due[i] < 0) due[i] = every;
      if (!inView(r.box)) return;
      // A rotor a few pixels across shows no motion worth the redraw.
      const px = (Math.max(r.box.w, r.box.h) * svgPx) / view.w;
      if (px < 14) return;
      r.draw(angles[i]);
    });
  }

  const slides = makeSlides(svg, F);
  const flows = makeFlows(svg, F);

  // ---------- the unit card: number, name, two key figures, a link to the unit's own page
  if (!document.getElementById("ln-info-css")) {
    const css = document.createElement("style");
    css.id = "ln-info-css";
    css.textContent = `.ln-info{position:absolute;left:12px;top:12px;z-index:3;max-width:min(380px,62%);background:color-mix(in srgb,var(--white,#fff) 94%,transparent);border:1px solid var(--line,#d9dfd7);border-radius:6px;padding:10px 13px 11px;font-size:13px;line-height:1.4;color:var(--muted,#5e6b63);opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .35s;pointer-events:none}
.ln-info[data-show]{opacity:1;transform:none;pointer-events:auto}
.ln-info .n{font:11px/1.4 var(--font-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase}
.ln-info b{display:block;margin:2px 0 3px;font-size:17px;line-height:1.2;font-weight:600;color:var(--ink,#202d28)}
.ln-info p{margin:0}
.ln-info a{display:inline-block;margin-top:6px;font-weight:500;color:var(--green,#145445);text-decoration:none}
.ln-info a:hover{text-decoration:underline}
.ln-info .r{display:grid;gap:2px;margin-top:6px;padding-top:6px;border-top:1px solid var(--line,#d9dfd7);font-size:12px}
.ln-info .r button{border:0;padding:0;background:none;font:inherit;color:var(--ink,#202d28);text-decoration:underline;text-decoration-color:var(--line,#d9dfd7);text-underline-offset:2px;cursor:pointer}
.ln-info .r button:hover{color:var(--green,#145445)}
.ln-info[data-story] b{font-size:24px}
.ln-info[data-story] p{font-size:15px}
/* On a phone the card leaves the drawing and stands under the controls, always showing what is lit (or the whole line). */
.ln-info[data-below]{position:relative;left:auto;top:auto;z-index:auto;max-width:none;min-height:8.5em;margin:2px 0 10px;background:none;opacity:1;transform:none;transition:none;pointer-events:auto}
.ln-info[data-below] b,.ln-info[data-below][data-story] b{font-size:16px}
.ln-info[data-below][data-story] p{font-size:13px}
.ln-info[data-below] .r{gap:0}
.ln-info[data-below] .r button{min-height:30px;padding:4px 0;text-align:left}
.ln-info[data-below] a{padding:6px 0 2px}`;
    document.head.appendChild(css);
  }
  if (getComputedStyle(stage).position === "static") stage.style.position = "relative";
  const card = document.createElement("div");
  card.className = "ln-info";
  card.setAttribute("aria-hidden", "true");
  stage.appendChild(card);
  // The neighbours named on the card are buttons that step to them.
  card.addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]");
    if (!go) return;
    event.stopPropagation();
    takeOver();
    pick(Number(go.dataset.go));
    afterInput();
    run();
  });
  let cardFor = -1, cardStory = false;
  // i: a unit, null for no card, -1 for the whole line (on a phone, where the card always stands under the controls).
  function showCard(i, asStory) {
    if (i === cardFor && asStory === cardStory) return;
    cardFor = i; cardStory = asStory;
    if (i === null) { card.removeAttribute("data-show"); return; }
    if (i < 0) {
      card.innerHTML = `<div class="n">${T.overview.n}</div><b>${T.overview.title}</b><p>${T.overview.text}</p>`;
      card.removeAttribute("data-story");
      card.setAttribute("data-show", "");
      return;
    }
    const [title, a, b] = T.info[i];
    const slug = F.links && F.links[F.units[i]];
    // Where the material comes from and goes next, along the material chain (the water treatment and the cabinet stand
    // apart from it).
    const chain = F.chain || count;
    const prev = i > 0 && i < chain ? T.info[i - 1][0] : null;
    const next = i < chain - 1 ? T.info[i + 1][0] : null;
    const route = i < chain ? `<div class="r">${prev ? `<span>${T.from}: <button type="button" data-go="${i - 1}">${prev}</button></span>` : ""}${next ? `<span>${T.to}: <button type="button" data-go="${i + 1}">${next}</button></span>` : ""}</div>` : "";
    card.innerHTML = `<div class="n">${String(i + 1).padStart(2, "0")} / ${count}</div><b>${title}</b><p>${a}</p><p>${b}</p>${route}${slug ? `<a href="../${slug}/">${T.more} →</a>` : ""}`;
    card.toggleAttribute("data-story", asStory);
    card.setAttribute("data-show", "");
  }
  const narrow = matchMedia("(max-width: 640px)");
  function placeCard() {
    card.toggleAttribute("data-below", narrow.matches);
    if (narrow.matches) (plate.querySelector(".anatomy-controls") || stage).after(card);
    else stage.appendChild(card);
    cardFor = undefined;
  }
  placeCard();
  narrow.addEventListener("change", () => { placeCard(); run(); });

  let clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let story = null;          // { i, t } while the material path plays
  let running = true, flow = 1;
  let selected = null, hovered = null, overview = false;
  let touring = !still.matches, tourClock = REST - FIRST_LIT, quiet = 0;
  let restartAt = 0, restartTimer = 0;

  function say(text) {
    if (restartAt) text += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && readout.textContent !== text) readout.textContent = text;
  }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }
  const stepText = (i) => T.step.replace("{n}", i + 1).replace("{count}", count).replace("{text}", T.units[i]);

  function tourAt(t) {
    const lap = count * STEP + REST;
    const u = t % lap;
    return u < REST ? null : Math.min(count - 1, Math.floor((u - REST) / STEP));
  }

  function step(dt) {
    clock += dt;
    if (boot !== Infinity) { boot += dt; if (boot > BOOT_STEP * count + 1) boot = Infinity; }
    if (story) {
      story.t += dt;
      if (story.t >= STORY_STEP) {
        story.t = 0; story.i++;
        if (story.i >= count) { endStory(); }
        else { zoomTo(story.i, 2.3); announce(stepText(story.i)); }
      }
    }
    if (touring) tourClock += dt;
    else if (!still.matches && !story && hovered === null && quiet && performance.now() - quiet >= RESUME_MS) {
      touring = true; tourClock = 0; quiet = 0; selected = null;
      if (zoomed !== null) zoomTo(null);
      if (!running) { running = true; announce(T.started); }
      disarmRestart();
    }
    flow += ((running ? 1 : 0) - flow) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.6));
    if (!running && flow < 1e-3) flow = 0;
    layers2.forEach((layer) => layer.toggleAttribute("data-stopped", !running));
  }

  let lastOn = -2;
  function draw() {
    const booting = boot !== Infinity && boot < BOOT_STEP * count;
    const toured = touring && !overview ? tourAt(tourClock) : null;
    const on = story ? story.i : hovered !== null ? hovered : selected !== null ? selected : toured;
    showCard(story ? story.i : selected !== null ? selected : narrow.matches ? (on ?? -1) : null, !!story);
    if (on !== lastOn) {
      lastOn = on;
      groups.forEach((list, i) => list.forEach((node) => node.toggleAttribute("data-on", i === on)));
    }
    if (booting && !story && on == null) say(T.starting);
    else if (on !== null && on !== undefined) say(stepText(on));
    else say(running ? T.run : T.stopped);
  }

  // Each update does a share of the work: each rotor and each material trail, the slides and the marks keep their own
  // clock and phase, so their changes spread evenly over the updates instead of landing together on one (a weak machine
  // felt that one long frame as a stutter). How often each changes follows the pacing; in between it stays as it is.
  let pending = 0;
  const fdue = flows.map((_, i) => i * 0.0071), facc = flows.map(() => 0);
  let sdue = 0.005, sacc = 0, mdue = 0.011, macc = 0;
  const due1 = (d, dt, every) => (d > 0 && dt > 0 ? d : Math.max(d + every, 0) || every);
  function update(dt) {
    step(dt);
    if (moving) { draw(); return; }
    turn(dt);
    const P = PACE[level], every = still.matches || recording ? 0 : view.w > full.w * 0.6 ? P.wide : P.close;
    flows.forEach((f, i) => {
      facc[i] += dt * flow * startOf(f.unit);
      fdue[i] -= dt;
      if (fdue[i] > 0 && dt > 0) return;
      fdue[i] = due1(fdue[i], dt, every);
      // A trail out of a close view keeps its time and catches up when it comes back into view.
      if (dt && !inView(f.box)) return;
      if (facc[i] || !dt) { f.move(facc[i]); facc[i] = 0; }
    });
    sacc += dt * flow; sdue -= dt;
    if (!(sdue > 0 && dt > 0)) { sdue = due1(sdue, dt, every); slides.forEach((f) => f.move(sacc * startOf(f.unit))); sacc = 0; }
    macc += dt; mdue -= dt;
    if (!(mdue > 0 && dt > 0)) { mdue = due1(mdue, dt, every); marks(macc, flow); macc = 0; }
    draw();
  }
  const marks = makeMarks(svg);
  function tick(now) {
    // On a flight the compositor moves the picture and the page sleeps until the landing (a main-thread frame on every
    // frame of the flight cost the compositor a commit each time).
    if (moving && flights.length) { frame = 0; last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    if (last) pace(now, now - last);
    last = now;
    clockMs += dt * 1000;
    const panning = moveCamera(clockMs);
    pending += dt;
    if (pending >= (still.matches ? 0 : PACE[level].frame)) { update(Math.min(pending, 0.1)); pending = 0; }
    frame = visible && (!still.matches || panning) ? requestAnimationFrame(tick) : 0;
  }
  function run() {
    if (recording) return;
    if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
    else if (still.matches) { step(0); moveCamera(clockMs); draw(); }
  }
  function takeOver() { touring = false; quiet = performance.now(); }
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    running = true;
    announce(T.started);
    run();
  }
  const afterInput = () => (running ? disarmRestart() : armRestart());
  function startStory() {
    story = { i: 0, t: 0 };
    selected = null; hovered = null; overview = false; touring = false;
    if (!running) running = true;
    zoomTo(0, 2.3);
    announce(T.story + ": " + stepText(0));
  }
  function endStory() {
    story = null;
    zoomTo(null);
    overview = true;
    quiet = performance.now();
  }
  function pick(i) {
    if (story) story = null;
    selected = i;
    overview = i === null;
    zoomTo(i);
    announce(i === null ? T.whole : stepText(i));
  }

  const unitOf = (event) => {
    const node = event.target.closest && event.target.closest("[data-unit]");
    return node ? Number(node.dataset.unit) : null;
  };
  base0.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || zoomed !== null) return;
    const i = unitOf(event);
    if (i !== hovered) { hovered = i; run(); }
  });
  base0.addEventListener("pointerleave", () => { if (hovered === null) return; hovered = null; run(); });
  // On a touch screen a unit on the whole line is a few pixels across: a tap near one picks it.
  const coarse = matchMedia("(pointer: coarse)");
  function nearUnit(event) {
    if (zoomed !== null || !coarse.matches) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(base0.getScreenCTM().inverse());
    const reach = (24 * view.w) / svgPx;
    let best = null, bestD = Infinity;
    for (let i = 0; i < count; i++) {
      const b = unitBox(i);
      if (!b) continue;
      const d = Math.hypot(Math.max(b[0] - p.x, 0, p.x - b[2]), Math.max(b[1] - p.y, 0, p.y - b[3]));
      if (d < reach && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }
  base0.addEventListener("click", (event) => {
    if (story) { story = null; }
    const i = unitOf(event) ?? nearUnit(event);
    takeOver();
    hovered = null;
    pick(i !== null && i !== selected ? i : null);
    afterInput();
    run();
  });
  stage.addEventListener("keydown", (event) => {
    const key = event.key;
    const from = selected !== null ? selected : touring && !overview && tourAt(tourClock) !== null ? tourAt(tourClock) : null;
    let handled = true;
    if (key === "ArrowRight" || key === "ArrowDown") pick(from === null ? 0 : Math.min(count - 1, from + 1));
    else if (key === "ArrowLeft" || key === "ArrowUp") pick(from === null ? count - 1 : Math.max(0, from - 1));
    else if (key === "Home") pick(0);
    else if (key === "End") pick(count - 1);
    else if (key === "Escape") pick(null);
    else if (key === " " || key === "Enter") { running = !running; announce(running ? T.started : T.halted); }
    else if (key === "p" || key === "P") { if (story) endStory(); else startStory(); }
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    takeOver();
    hovered = null;
    afterInput();
    run();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  // Recording a video (page URL ending in #record): time only moves when the recorder advances it, frame by frame,
  // and the CSS animations (water marks, glow) are set to the same clock.
  if (recording) {
    window.__line = {
      advance(dt) {
        clockMs += dt * 1000;
        moveCamera(clockMs);
        update(dt);
      },
      story: startStory,
      get story_done() { return !story; },
    };
  }
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  update(0);
}
