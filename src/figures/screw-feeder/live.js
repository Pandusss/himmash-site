// Live behaviour of the screw feeder figure. The conical screw takes film flakes from the throat, carries them
// along at one pitch per turn (the pitch falls along the cone, so the flakes slow down and pack together) and
// forces them into the feed port of the extruder. The inverter sets the screw speed; the feed rate follows it
// (up to 500 kg/h), and the section of the extruder barrel shows how full its screw channel is.
const RATE_REV = 0.6;      // screw turns per second at 100 % (shown in real time, assumed)
const EXT_REV = 0.7;       // extruder screw turns per second (assumed)
const SPOKE_REV = 1.6;     // drive pulley turns per second on screen (slowed down)
const SPEED_TAU = 0.7;     // inverter ramp
const FILL_TAU = 1.6;      // the extruder channel fills or empties
const TOUR = [[0, 1], [7, 0.6], [12, 0], [17, 1]];
const TOUR_LEN = 20;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const all = (sel) => [...svg.querySelectorAll(sel)];
  const screws = all('[data-sf="screw"]');
  const pools = (name) => screws.map((g) => [...g.querySelectorAll(`[data-sf="${name}"]`)]);
  const backs = pools("back"), backEdges = pools("back-edge");
  const fronts = pools("front"), frontEdges = pools("front-edge");
  const flakeEls = all('[data-sf="flakes"]');
  const throatEl = svg.querySelector('[data-sf="throat"]');
  const hopperEl = svg.querySelector('[data-sf="hopper"]');
  const extFill = svg.querySelector('[data-sf="ext-fill"]');
  const extFlight = svg.querySelector('[data-sf="ext-flight"]');
  const spokeEl = svg.querySelector('[data-sf="spokes"]');
  screws.forEach((g) => g.setAttribute("data-on", ""));

  const { o, ex, ey, ez } = F.proj;
  const sx = (x, y, z) => o[0] + x * ex[0] + y * ey[0] + z * ez[0];
  const sy = (x, y, z) => o[1] + x * ex[1] + y * ey[1] + z * ez[1];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const AZ = F.az;
  const SC = F.screw;
  const N = SC.x.length;
  const cone = F.cone;
  const pitchAt = (x) => (x >= cone.x1 ? F.pitch[0] : F.pitch[0] - ((F.pitch[0] - F.pitch[1]) * (cone.x1 - x)) / (cone.x1 - cone.x0));
  const flightAt = (x) => (x >= F.housing[0] ? F.housingR : cone.r0 + ((cone.r1 - cone.r0) * (x - cone.x0)) / (cone.x1 - cone.x0)) - F.gap;
  const number = (v) => String(Math.round(v)).replace(".", T.decimal);

  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shape = () => { const a = rnd() * Math.PI; return [0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.45 : 0); const r = j % 2 ? 0.55 : 1; return [r * Math.cos(t), r * Math.sin(t) * 0.7]; }); };
  const front = () => F.view + (rnd() * 2 - 1) * 1.25;
  const spawnX = () => F.spawn[0] + rnd() * (F.spawn[1] - F.spawn[0]);
  const flakes = Array.from({ length: 78 }, () => ({ x: F.screwX[0] + rnd() * (F.spawn[1] - F.screwX[0]), u: 0.25 + rnd() * 0.7, th: front(), s: shape() }));
  const fall = Array.from({ length: 22 }, () => ({ x: F.throat.x[0] + rnd() * (F.throat.x[1] - F.throat.x[0]), y: F.throat.y[0] + rnd() * (F.throat.y[1] - F.throat.y[0]), z: F.throat.z[1] + rnd() * (F.throat.z[0] - F.throat.z[1]), s: shape() }));
  const edge = () => { const a = rnd() * 2 * Math.PI; const c = Math.cos(a), s = Math.sin(a); const m = Math.max(Math.abs(c), Math.abs(s)); return [(c / m) * 0.96, (s / m) * 0.96]; };
  const drift = Array.from({ length: 22 }, () => { const [a, b] = edge(); const k = 0.2 + rnd() * 0.8; return { u: a * k, v: b * k, s: shape() }; });

  let speed = 1, target = 1, lastOn = 1, fill = 1;
  let phi = 0, psi = 0, beta = 0;
  let clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let touring = !still.matches, tourAt = 0, quiet = 0, hovering = false;
  let drawnPhi = NaN;

  function say(text) { if (readout && readout.textContent !== text) readout.textContent = text; }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  const quad = (cx, cy, h, s) => `M${f1(cx + s[0][0] * h)} ${f1(cy + s[0][1] * h)}L${f1(cx + s[1][0] * h)} ${f1(cy + s[1][1] * h)}L${f1(cx + s[2][0] * h)} ${f1(cy + s[2][1] * h)}L${f1(cx + s[3][0] * h)} ${f1(cy + s[3][1] * h)}Z`;

  // Flight ribbons: the helix at the flight tip and at the root, split where the surface turns from the viewer.
  function ribbons() {
    const runs = { back: [], front: [] };
    let cur = null, side = null;
    const point = (x, r, a) => [sx(x, r * Math.cos(a), AZ + r * Math.sin(a)), sy(x, r * Math.cos(a), AZ + r * Math.sin(a))];
    const push = (x, R, a) => { cur.outer.push(point(x, R, a)); cur.inner.push(point(x, F.root, a)); cur.x += x; cur.n++; };
    let pa = 0, pf = 0;
    for (let i = 0; i < N; i++) {
      const a = phi - SC.t[i];
      const f = Math.cos(a - F.view);
      const s = f > 0 ? "front" : "back";
      if (i && s !== side) {
        const u = pf / (pf - f);
        const x = SC.x[i - 1] + (SC.x[i] - SC.x[i - 1]) * u, R = SC.r[i - 1] + (SC.r[i] - SC.r[i - 1]) * u, aa = pa + (a - pa) * u;
        push(x, R, aa);
        runs[side].push(cur);
        cur = null;
        side = s;
        cur = { outer: [], inner: [], x: 0, n: 0 };
        push(x, R, aa);
      }
      if (!cur) { side = s; cur = { outer: [], inner: [], x: 0, n: 0 }; }
      push(SC.x[i], SC.r[i], a);
      pa = a; pf = f;
    }
    if (cur) runs[side].push(cur);
    const line = (list) => "M" + list.map(([x, y]) => f1(x) + " " + f1(y)).join("L");
    const edge = (run) => line(run.outer) + line(run.inner);
    const fillOf = (run) => {
      let out = line(run.outer);
      for (let j = run.inner.length - 1; j >= 0; j--) out += "L" + f1(run.inner[j][0]) + " " + f1(run.inner[j][1]);
      return out + "Z";
    };
    const order = (list) => list.sort((a, b) => a.x / a.n - b.x / b.n).map((run) => [fillOf(run), edge(run)]);
    return { back: order(runs.back), front: order(runs.front) };
  }

  function drawScrew() {
    if (phi === drawnPhi) return;
    drawnPhi = phi;
    const r = ribbons();
    const write = (sets, list, part) => sets.forEach((pool) => pool.forEach((el, i) => { const d = list[i] ? list[i][part] : ""; if (el.getAttribute("d") !== d) el.setAttribute("d", d); }));
    write(backs, r.back, 0); write(backEdges, r.back, 1);
    write(fronts, r.front, 0); write(frontEdges, r.front, 1);
    let d = "";
    for (const p of flakes) {
      const R = flightAt(p.x), rr = F.root + p.u * (R - F.root);
      const y = rr * Math.cos(p.th), z = AZ + rr * Math.sin(p.th);
      d += quad(sx(p.x, y, z), sy(p.x, y, z), 2.7 * Math.pow(R / F.housingR, 0.8), p.s);
    }
    flakeEls.forEach((el) => el.setAttribute("d", d));
    let t = "";
    for (const p of fall) t += quad(sx(p.x, p.y, p.z), sy(p.x, p.y, p.z), 2.7, p.s);
    if (throatEl) throatEl.setAttribute("d", t);
    let h = "";
    const H = F.hopper;
    const frac = (H.z - H.z0) / (H.z1 - H.z0);
    const hx = H.b[0] + (H.t[0] - H.b[0]) * frac, hy = H.b[1] + (H.t[1] - H.b[1]) * frac;
    for (const p of drift) { const x = H.cx + p.u * hx, y = p.v * hy; h += quad(sx(x, y, H.z), sy(x, y, H.z), 2.4, p.s); }
    if (hopperEl) hopperEl.setAttribute("d", h);
  }

  function drawDrive() {
    const E = F.ext;
    const pt = (r, a) => [sx(E.x + r * Math.cos(a), E.y, E.z + r * Math.sin(a)), sy(E.x + r * Math.cos(a), E.y, E.z + r * Math.sin(a))];
    const r0 = E.root, r1 = E.bore - 1;
    const bar = [pt(r0, psi - 6 / r0), pt(r1, psi - 5 / r1), pt(r1, psi + 5 / r1), pt(r0, psi + 6 / r0)];
    extFlight.setAttribute("d", "M" + bar.map(([x, y]) => f1(x) + " " + f1(y)).join("L") + "Z");
    const span = fill * 2 * Math.PI * 0.94;
    if (span < 0.03) extFill.setAttribute("d", "");
    else {
      const steps = Math.max(2, Math.ceil(span / 0.15));
      const outer = [], inner = [];
      for (let i = 0; i <= steps; i++) { const a = psi - 0.06 - (span * i) / steps; outer.push(pt(r1, a)); inner.push(pt(r0, a)); }
      extFill.setAttribute("d", "M" + [...outer, ...inner.reverse()].map(([x, y]) => f1(x) + " " + f1(y)).join("L") + "Z");
    }
    const W = F.spokes;
    const sp = (r, a) => [sx(W.x, r * Math.cos(a), W.z + r * Math.sin(a)), sy(W.x, r * Math.cos(a), W.z + r * Math.sin(a))];
    let d = "";
    for (let i = 0; i < W.n; i++) {
      const a = beta + (i * 2 * Math.PI) / W.n;
      const q = [sp(W.r0, a - (W.w * 0.65) / W.r0), sp(W.r1 + 2, a - (W.w * 0.4) / W.r1), sp(W.r1 + 2, a + (W.w * 0.4) / W.r1), sp(W.r0, a + (W.w * 0.65) / W.r0)];
      d += "M" + q.map(([x, y]) => f1(x) + " " + f1(y)).join("L") + "Z";
    }
    spokeEl.setAttribute("d", d);
  }

  function readoutNow() {
    const f = number(fill * 100);
    if (target === 0 && speed < 0.02) return T.stop.replace("{f}", f);
    return T.feed.replace("{q}", number(Math.round((F.rate * speed) / 10) * 10)).replace("{f}", f);
  }

  function step(dt) {
    clock += dt;
    if (touring) {
      tourAt += dt;
      const t = tourAt % TOUR_LEN;
      let v = TOUR[0][1];
      for (const [at, value] of TOUR) if (t >= at) v = value;
      if (v !== target) setTarget(v, false);
    } else if (!still.matches && !hovering && quiet > 0 && clock - quiet > 10) {
      touring = true;
    }
    const calm = still.matches;
    speed = calm ? target : speed + (target - speed) * (1 - Math.exp(-dt / SPEED_TAU));
    if (Math.abs(speed - target) < 1e-3) speed = target;
    fill = calm ? speed : fill + (speed - fill) * (1 - Math.exp(-dt / FILL_TAU));
    if (Math.abs(fill - speed) < 1e-3) fill = speed;
    if (calm) return;
    const w = 2 * Math.PI * RATE_REV * speed;
    phi += w * dt;
    psi += 2 * Math.PI * EXT_REV * dt;
    beta += 2 * Math.PI * SPOKE_REV * speed * dt;
    const turn = (RATE_REV * speed * dt);   // turns this frame
    for (const p of flakes) {
      p.x -= pitchAt(p.x) * turn;
      if (p.x < F.screwX[0]) { p.x = spawnX(); p.u = 0.25 + rnd() * 0.7; p.th = front(); }
    }
    for (const p of fall) {
      p.z -= 420 * speed * dt;
      if (p.z < F.throat.z[1]) { p.z = F.throat.z[0] + rnd() * 30; p.x = F.throat.x[0] + rnd() * (F.throat.x[1] - F.throat.x[0]); p.y = F.throat.y[0] + rnd() * (F.throat.y[1] - F.throat.y[0]); }
    }
    const k = Math.exp(-0.35 * speed * dt);
    for (const p of drift) {
      p.u *= k; p.v *= k;
      if (Math.abs(p.u) < 0.12 && Math.abs(p.v) < 0.12) { const [a, b] = edge(); p.u = a; p.v = b; }
    }
  }

  function draw() {
    drawScrew();
    drawDrive();
    say(readoutNow());
  }

  function setTarget(v, user) {
    v = clamp(Math.round(v * 10) / 10, 0, 1);
    if (v === target) return;
    const was = target;
    target = v;
    if (v > 0) lastOn = v;
    if (was === 0 && v > 0) announce(T.started);
    else if (v === 0) announce(T.stopped);
    else if (user) announce(T.speed.replace("{n}", number(v * 100)));
  }

  function takeOver() {
    touring = false;
    quiet = clock || 1e-3;
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

  const toggle = () => setTarget(target > 0 ? 0 : lastOn, true);
  svg.addEventListener("click", (event) => {
    if (!event.target.closest || !event.target.closest("[data-hit]")) return;
    takeOver(); toggle(); run(); if (still.matches) draw();
  });
  stage.addEventListener("keydown", (event) => {
    let handled = true;
    if (event.key === " " || event.key === "Enter") toggle();
    else if (event.key === "ArrowUp" || event.key === "ArrowRight") setTarget(target + 0.1, true);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setTarget(target - 0.1, true);
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    takeOver(); run(); if (still.matches) draw();
  });
  stage.addEventListener("pointerenter", () => { hovering = true; if (touring) takeOver(); });
  stage.addEventListener("pointerleave", () => { hovering = false; quiet = clock || 1e-3; });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  draw();
}
