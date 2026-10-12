// Live behaviour of the storage hopper figure. The dosing screw in the trough under the V bottom carries the
// material to the spout at a rate set by the inverter; the level in the bin falls. When it reaches the low
// level switch, the pneumatic conveying line starts and refills the bin up to the high switch. Time is sped up:
// a real bin of 5–10 m³ takes hours to empty.
const SCREW_REV = 0.5;     // screw turns per second at 100 % on screen (assumed)
const DRAW = 46;           // level fall, mm per second at 100 % (figure time)
const FEED = 115;          // level rise while the conveying line runs, mm per second (figure time)
const SPEED_TAU = 0.6;
const FLOW_TAU = 0.45;
const TOUR = [[0, 0.6], [9, 1], [18, 0.4]];
const TOUR_LEN = 27;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const one = (name) => svg.querySelector(`[data-sh="${name}"]`);
  const screws = [...svg.querySelectorAll('[data-sh="screw"]')];
  const pools = (name) => screws.map((g) => [...g.querySelectorAll(`[data-sh="${name}"]`)]);
  const backs = pools("back"), backEdges = pools("back-edge"), fronts = pools("front"), frontEdges = pools("front-edge");
  const flakeEl = one("flakes"), streamEl = one("stream"), dropEl = one("drop");
  const matTop = one("mat-top"), matFront = one("mat-front"), matClip = one("mat-clip"), hzEl = one("hz");
  screws.forEach((g) => g.setAttribute("data-on", ""));

  const { o, ex, ey, ez } = F.proj;
  const sx = (x, y, z) => o[0] + x * ex[0] + y * ey[0] + z * ez[0];
  const sy = (x, y, z) => o[1] + x * ex[1] + y * ey[1] + z * ez[1];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const pt = (x, y, z) => f1(sx(x, y, z)) + " " + f1(sy(x, y, z));
  const number = (v) => String(Math.round(v));
  const SC = F.screw, N = SC.x.length, AZ = F.az, B = F.box;
  const area = (2 * B.lx * 2 * B.ly) / 1e6;
  const levelOf = (h) => (F.vBottom + (area * (h - B.z0)) / 1000) / (F.vBottom + (area * (B.z1 - B.z0)) / 1000);

  let seed = 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shape = () => { const a = rnd() * Math.PI; return [0, 1, 2, 3].map((j) => { const t = a + (j * Math.PI) / 2 + (j % 2 ? 0.45 : 0); const r = j % 2 ? 0.55 : 1; return [r * Math.cos(t), r * Math.sin(t) * 0.7]; }); };
  const quad = (cx, cy, h, s) => `M${f1(cx + s[0][0] * h)} ${f1(cy + s[0][1] * h)}L${f1(cx + s[1][0] * h)} ${f1(cy + s[1][1] * h)}L${f1(cx + s[2][0] * h)} ${f1(cy + s[2][1] * h)}L${f1(cx + s[3][0] * h)} ${f1(cy + s[3][1] * h)}Z`;
  const front = () => F.view + (rnd() * 2 - 1) * 1.3;
  const flakes = Array.from({ length: 70 }, () => ({ x: F.win[0] - 60 + rnd() * (F.win[1] - F.win[0] + 120), u: 0.2 + rnd() * 0.75, th: front(), s: shape() }));
  const drops = Array.from({ length: 16 }, () => ({ x: F.spout.x[0] + 30 + rnd() * (F.spout.x[1] - F.spout.x[0] - 60), y: (rnd() * 2 - 1) * 80, z: F.spout.to + rnd() * (F.spout.z - F.spout.to), live: true, s: shape() }));
  const stream = Array.from({ length: 26 }, () => ({ x: 0, y: 0, z: 0, vx: 0, vz: 0, live: false, s: shape() }));

  let speed = 0.6, target = 0.6, lastOn = 0.6, h = 2760, filling = false, flow = 0;
  let phi = 0, clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let touring = !still.matches, tourAt = 0, quiet = 0, hovering = false, drawnPhi = NaN;

  function say(text) { if (readout && readout.textContent !== text) readout.textContent = text; }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  function ribbons() {
    const runs = { back: [], front: [] };
    let cur = null, side = null, pa = 0, pf = 0;
    const point = (x, r, a) => [sx(x, r * Math.cos(a), AZ + r * Math.sin(a)), sy(x, r * Math.cos(a), AZ + r * Math.sin(a))];
    const push = (x, a) => { cur.outer.push(point(x, F.flight, a)); cur.inner.push(point(x, F.root, a)); cur.x += x; cur.n++; };
    for (let i = 0; i < N; i++) {
      const x = SC.x[i];
      if (x < F.win[0] - 200 || x > F.win[1] + 200) continue;
      const a = phi - SC.t[i];
      const f = Math.cos(a - F.view);
      const s = f > 0 ? "front" : "back";
      if (cur && s !== side) {
        const u = pf / (pf - f);
        const xx = SC.x[i - 1] + (x - SC.x[i - 1]) * u, aa = pa + (a - pa) * u;
        push(xx, aa);
        runs[side].push(cur);
        cur = { outer: [], inner: [], x: 0, n: 0 };
        push(xx, aa);
      }
      if (!cur) cur = { outer: [], inner: [], x: 0, n: 0 };
      side = s;
      push(x, a);
      pa = a; pf = f;
    }
    if (cur) runs[side].push(cur);
    const line = (list) => "M" + list.map(([x, y]) => f1(x) + " " + f1(y)).join("L");
    const fillOf = (run) => { let out = line(run.outer); for (let j = run.inner.length - 1; j >= 0; j--) out += "L" + f1(run.inner[j][0]) + " " + f1(run.inner[j][1]); return out + "Z"; };
    const order = (list) => list.sort((a, b) => a.x / a.n - b.x / b.n).map((run) => [fillOf(run), line(run.outer) + line(run.inner)]);
    return { back: order(runs.back), front: order(runs.front) };
  }

  function draw() {
    if (phi !== drawnPhi) {
      drawnPhi = phi;
      const r = ribbons();
      const write = (sets, list, part) => sets.forEach((pool) => pool.forEach((el, i) => { const d = list[i] ? list[i][part] : ""; if (el.getAttribute("d") !== d) el.setAttribute("d", d); }));
      write(backs, r.back, 0); write(backEdges, r.back, 1); write(fronts, r.front, 0); write(frontEdges, r.front, 1);
      let d = "";
      for (const p of flakes) { const rr = F.root + p.u * (F.flight - F.root); const y = rr * Math.cos(p.th), z = AZ + rr * Math.sin(p.th); d += quad(sx(p.x, y, z), sy(p.x, y, z), 2.2, p.s); }
      flakeEl.setAttribute("d", d);
    }
    let d = "";
    for (const p of drops) if (p.live) d += quad(sx(p.x, p.y, p.z), sy(p.x, p.y, p.z), 2.2, p.s);
    dropEl.setAttribute("d", d);
    d = "";
    for (const p of stream) if (p.live) d += quad(sx(p.x, p.y, p.z), sy(p.x, p.y, p.z), 2.2, p.s);
    streamEl.setAttribute("d", d);
    // Material: top surface moved to the level, front section up to it.
    matTop.setAttribute("transform", `translate(${f1(ez[0] * h)} ${f1(ez[1] * h)})`);
    const face = `M${pt(-B.lx, B.ly, B.z0)}L${pt(B.lx, B.ly, B.z0)}L${pt(B.lx, B.ly, h)}L${pt(-B.lx, B.ly, h)}Z`;
    matFront.setAttribute("d", face);
    matClip.setAttribute("d", face);
    const Z = F.hz;
    const w = Z.w * speed;
    hzEl.setAttribute("d", w < 1 ? "" : `M${pt(Z.x, Z.y0, Z.z0)}L${pt(Z.x, Z.y0 + w, Z.z0)}L${pt(Z.x, Z.y0 + w, Z.z1)}L${pt(Z.x, Z.y0, Z.z1)}Z`);
    const l = number(levelOf(h) * 100);
    if (filling) say(T.filling.replace("{l}", l));
    else if (target === 0 && speed < 0.02) say(T.stopped.replace("{l}", l));
    else say(T.dosing.replace("{l}", l).replace("{n}", number(speed * 100)));
  }

  function setTarget(v, user) {
    v = clamp(Math.round(v * 10) / 10, 0, 1);
    if (v === target) return;
    const was = target;
    target = v;
    if (v > 0) lastOn = v;
    if (v === 0) announce(T.stop);
    else if (was === 0) announce(T.start.replace("{n}", number(v * 100)));
    else if (user) announce(T.speed.replace("{n}", number(v * 100)));
  }

  function step(dt) {
    clock += dt;
    if (touring) {
      tourAt += dt;
      const t = tourAt % TOUR_LEN;
      let v = TOUR[0][1];
      for (const [at, value] of TOUR) if (t >= at) v = value;
      if (v !== target) setTarget(v, false);
    } else if (!still.matches && !hovering && quiet > 0 && clock - quiet > 10) touring = true;
    const calm = still.matches;
    speed = calm ? target : speed + (target - speed) * (1 - Math.exp(-dt / SPEED_TAU));
    if (Math.abs(speed - target) < 1e-3) speed = target;
    if (calm) return;
    // Level switches drive the conveying line.
    if (!filling && h <= F.low) { filling = true; announce(T.lowSwitch); }
    if (filling && h >= F.high) { filling = false; announce(T.highSwitch); }
    flow += ((filling ? 1 : 0) - flow) * (1 - Math.exp(-dt / FLOW_TAU));
    h += (FEED * flow - DRAW * speed) * dt;
    h = clamp(h, B.z0 + 40, B.z1 - 60);
    phi += 2 * Math.PI * SCREW_REV * speed * dt;
    const adv = F.pitch * SCREW_REV * speed * dt;
    for (const p of flakes) { p.x -= adv; if (p.x < F.win[0] - 60) { p.x = F.win[1] + 60 - rnd() * 40; p.u = 0.2 + rnd() * 0.75; p.th = front(); } }
    for (const p of drops) {
      if (p.live) { p.z -= 650 * dt; if (p.z < F.spout.to) p.live = false; }
      if (!p.live && rnd() < speed * dt * 6) { p.live = true; p.z = F.spout.z - rnd() * 20; p.x = F.spout.x[0] + 30 + rnd() * (F.spout.x[1] - F.spout.x[0] - 60); p.y = (rnd() * 2 - 1) * 80; }
    }
    for (const p of stream) {
      if (p.live) { p.vz -= 2600 * dt; p.x += p.vx * dt; p.z += p.vz * dt; if (p.z < h) p.live = false; }
      if (!p.live && rnd() < flow * dt * 9) { p.live = true; p.x = F.inlet.mouth; p.y = F.inlet.y + (rnd() * 2 - 1) * 45; p.z = F.inlet.z + (rnd() * 2 - 1) * 45; p.vx = -(700 + rnd() * 600); p.vz = -rnd() * 300; }
    }
  }

  function takeOver() { touring = false; quiet = clock || 1e-3; }
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
