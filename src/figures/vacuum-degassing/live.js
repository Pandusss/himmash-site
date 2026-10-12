// Live behaviour of the vacuum degassing figure. The screw turns (its flights travel along the barrel) and
// carries the melt; moisture forms vapour bubbles in it. With the pump on, the chamber is under vacuum: the
// bubbles rise, burst at the melt surface, and the vapour goes up through the vent into the chamber and out
// through the port to the tank, where the condensate level rises (sped up). With the pump off, the vacuum
// decays, the bubbles stay in the melt and travel on with it. The gauge needle follows the vacuum (relative).
const FLIGHT_SPEED = 30;    // mm/s the flights appear to travel at (slowed down)
const SPAWN = 16;           // bubbles per second
const ON_FOR = 10, OFF_FOR = 6;
const TAU = Math.PI * 2;
const RESTART_MS = 6000;    // a pump stop made by the reader switches itself back on after this (wall clock)
const RESUME_MS = 8000;     // the tour resumes this long after the last input (wall clock)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const C = F.cam;
  const q = (name) => svg.querySelector(`[data-live="${name}"]`);
  const flightsEl = q("flights"), pools = q("pools");
  const backs = [...svg.querySelectorAll("[data-flight]")];
  const needle = q("needle"), level = q("level"), vapour = q("vapour"), bubblesEl = q("bubbles"), rims = q("bubbles-rim");
  const chamber = svg.querySelector('[data-part="chamber"]'), pumpPart = svg.querySelector('[data-part="pump"]');

  const iso = (x, y, z) => [C.ox + (x * C.sa - y * C.ca) * C.k, C.oy + ((x * C.ca + y * C.sa) * C.se - z * C.ce) * C.k];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const path = (pts, closed) => (pts.length ? "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + (closed ? "Z" : "") : "");

  const [x0, x1] = F.cut;
  const [o0, o1] = F.vent.open;
  const sc = F.screw, poolLen = F.pool.share * (sc.pitch - sc.t), zRoot = F.axis + sc.root, zPool = zRoot + F.pool.h;
  let pumpOn = true, vac = 1, shift = 0, tank = 0.35, draining = false;
  let clock = 0, last = 0, frame = 0, visible = false, shown = "", phrase = "", hover = "", spawnDebt = 0, seed = 5;
  let touring = !still.matches, tourAt = 0, quiet = 0;
  let restartAt = 0, restartTimer = 0;
  const bubbles = [], wisps = [];
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  function say(value) {
    if (restartAt) value += " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000)));
    if (readout && shown !== value) { shown = value; readout.textContent = value; }
  }
  function announce(value) { if (live && phrase !== value) { phrase = value; live.textContent = value; } }
  function setPump(on) {
    if (on === pumpOn) return;
    pumpOn = on;
    announce(on ? T.started : T.stopped);
    if (still.matches) vac = on ? 1 : 0;
  }

  // Path of a vapour wisp: from the burst point through the bore to the vent, up into the chamber, to the port.
  function wispAt(w) {
    const vx = clamp(w.x, o0 + 12, o1 - 12);
    const legs = [[w.x, 0, zPool], [vx, -10, F.axis + F.bore + 4], [vx, -24, F.vent.top + 6], [F.chamber.cx + (w.x - F.chamber.cx) * 0.3, -46, F.chamber.z - 40], F.port];
    const s = clamp(w.t / w.life, 0, 0.999) * (legs.length - 1);
    const i = Math.floor(s), u = smooth(s - i), a = legs[i], b = legs[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, b[0] - a[0], b[1] - a[1], b[2] - a[2], false];
  }

  function step(dt) {
    clock += dt;
    if (touring) {
      tourAt += dt;
      const phaseT = tourAt % (ON_FOR + OFF_FOR);
      setPump(phaseT < ON_FOR);
    } else if (!still.matches && quiet > 0 && performance.now() - quiet >= RESUME_MS) { touring = true; tourAt = 0; disarmRestart(); }
    const goal = pumpOn ? 1 : 0;
    vac = still.matches ? goal : vac + (goal - vac) * (1 - Math.exp(-dt / (pumpOn ? 1.1 : 2.2)));
    if (Math.abs(vac - goal) < 0.002) vac = goal;
    shift = (shift + FLIGHT_SPEED * dt) % F.screw.pitch;
    spawnDebt += SPAWN * dt;
    while (spawnDebt >= 1) {
      spawnDebt -= 1;
      // In the pool ahead of a flight: offset from the flight's leading face along its length.
      const x = x0 + 8 + random() * (x1 - x0 - 40), m = (((x - x0 - shift) % sc.pitch) + sc.pitch) % sc.pitch;
      if (m < sc.t / 2 + 4 || m > sc.t / 2 + poolLen - 5) continue;
      bubbles.push({ x, y: 0, z: zRoot + 3 + random() * (F.pool.h - 7), r: 1.2, g: 0.6 + random() * 0.8 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.x += FLIGHT_SPEED * dt;
      b.r = Math.min(2 + 1.4 * b.g + 2.2 * vac * b.g, b.r + 4 * dt);
      b.z = Math.min(zPool - b.r, b.z + (0.6 + 16 * vac * vac) * dt);
      if (vac > 0.35 && b.z >= zPool - b.r - 0.01) { wisps.push({ x: b.x, t: 0, life: 1.9 + random() * 0.6 }); bubbles.splice(i, 1); continue; }
      if (b.x > x1 - 6) bubbles.splice(i, 1);
    }
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i];
      w.t += dt;
      if (w.t >= w.life) { wisps.splice(i, 1); if (!draining) tank = Math.min(1, tank + 0.0016); }
    }
    if (!draining && tank >= 0.82) { draining = true; announce(T.drain); }
    if (draining) { tank -= 0.3 * dt; if (tank <= 0.2) { tank = 0.2; draining = false; announce(T.drained); } }
  }

  function draw() {
    // Flight sections: above the root, and half a pitch further on below it (one helix), clamped to the cut.
    let fd = "";
    const h = sc.t / 2;
    for (let xf = x0 - sc.pitch + (shift % sc.pitch); xf < x1 + sc.pitch; xf += sc.pitch) {
      for (const [xc, za, zb] of [[xf, F.axis + sc.root, F.axis + sc.flight], [xf + sc.pitch / 2, F.axis - sc.flight, F.axis - sc.root]]) {
        const xa = Math.max(x0, xc - h), xb = Math.min(x1, xc + h);
        if (xb - xa < 0.5) continue;
        fd += path([iso(xa, 0, za), iso(xb, 0, za), iso(xb, 0, zb), iso(xa, 0, zb)], true);
      }
    }
    flightsEl.setAttribute("d", fd);
    // Melt pools ahead of the flights above the root.
    let pd = "";
    for (let xf = x0 - sc.pitch + (shift % sc.pitch); xf < x1 + sc.pitch; xf += sc.pitch) {
      const a = Math.max(x0, xf + h), b = Math.min(x1, xf + h + poolLen), c = Math.min(x1, xf + h + poolLen * 0.82);
      if (b - a < 0.5) continue;
      pd += path([iso(a, 0, zRoot), iso(b, 0, zRoot), iso(Math.max(a, c), 0, zPool), iso(a, 0, zPool)], true);
    }
    pools.setAttribute("d", pd);
    backs.forEach((el, i) => {
      const xf = x0 - sc.pitch + (shift % sc.pitch) + (i - 1) * sc.pitch;
      el.setAttribute("transform", `translate(${f1(sc.step[0] * xf)} ${f1(sc.step[1] * xf)})`);
    });
    // Bubbles in the melt, and the vapour going to the port.
    let bd = "";
    for (const b of bubbles) {
      const [sx, sy] = iso(b.x, b.y, b.z), r = Math.max(0.6, b.r * C.k * 0.9);
      bd += `M${f1(sx - r)} ${f1(sy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
    }
    bubblesEl.setAttribute("d", bd);
    rims.setAttribute("d", bd);
    let vd = "";
    for (const w of wisps) {
      const [x, y, z, dx, dy, dz, hidden] = wispAt(w);
      if (hidden) continue;
      const l = Math.hypot(dx, dy, dz) || 1, h = 5;
      vd += path([iso(x - (dx / l) * h, y - (dy / l) * h, z - (dz / l) * h), iso(x + (dx / l) * h, y + (dy / l) * h, z + (dz / l) * h)]);
    }
    vapour.setAttribute("d", vd);
    // Gauge needle: zero at the lower left, clockwise with the vacuum.
    const a = (-135 + 270 * 0.92 * vac) * Math.PI / 180, g = F.gauge;
    needle.setAttribute("d", path([iso(g.x - 8 * Math.sin(a), g.y + 0.5, g.z - 8 * Math.cos(a)), iso(g.x + g.r * Math.sin(a), g.y + 0.5, g.z + g.r * Math.cos(a))]));
    // Condensate in the level glass.
    const lv = F.level, zt = lv.z[0] + (lv.z[1] - lv.z[0]) * tank;
    const [bx, by] = iso(lv.x, lv.y, lv.z[0]), [tx, ty] = iso(lv.x, lv.y, zt), hw = lv.r * C.k;
    level.setAttribute("d", `M${f1(bx - hw)} ${f1(by)}L${f1(tx - hw)} ${f1(ty)}L${f1(tx + hw)} ${f1(ty)}L${f1(bx + hw)} ${f1(by)}Z`);
    chamber.toggleAttribute("data-on", hover !== "pump");
    pumpPart.toggleAttribute("data-on", hover === "pump");
    const v = String(Math.round(vac * 100));
    say(draining ? T.drain : pumpOn ? (vac < 0.97 ? T.pumping : T.on).replace("{v}", v) : (vac > 0.05 ? T.venting : T.off).replace("{v}", v));
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
    bubbles.length = 0; wisps.length = 0;
    vac = pumpOn ? 1 : 0;
    for (let i = 0; i < 150; i++) step(1 / 30);
    draw();
  }
  function takeOver() { touring = false; quiet = performance.now(); }
  // A pump stop made by the reader comes back on by itself RESTART_MS later; any further input restarts the wait.
  function armRestart() { restartAt = performance.now() + RESTART_MS; clearTimeout(restartTimer); restartTimer = setTimeout(restartTick, 1005); }
  function disarmRestart() { restartAt = 0; clearTimeout(restartTimer); restartTimer = 0; }
  function restartTick() {
    const left = restartAt - performance.now();
    if (left > 20) { if (still.matches) draw(); restartTimer = setTimeout(restartTick, (left % 1000 || 1000) + 5); return; }
    disarmRestart();
    setPump(true);
    run();
  }
  const afterInput = () => (pumpOn ? disarmRestart() : armRestart());
  const partOf = (event) => { const n = event.target.closest && event.target.closest("[data-part]"); return n ? n.dataset.part : ""; };
  svg.addEventListener("pointermove", (event) => { hover = partOf(event); if (still.matches) draw(); });
  svg.addEventListener("pointerleave", () => { hover = ""; if (still.matches) draw(); });
  svg.addEventListener("click", (event) => { if (partOf(event)) { takeOver(); setPump(!pumpOn); afterInput(); run(); } });
  stage.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") setPump(!pumpOn);
    else if (event.key === "1") setPump(true);
    else if (event.key === "0") setPump(false);
    else return;
    takeOver(); afterInput();
    event.preventDefault();
    run();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  if (still.matches) settleStill(); else { const tour = touring; touring = false; for (let i = 0; i < 90; i++) step(1 / 30); touring = tour; draw(); }
}
