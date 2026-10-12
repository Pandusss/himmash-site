// Live behaviour of the dewatering centrifuge figure. The rotor turns (slowed down: the real one runs at 1 500 rpm),
// its inclined paddles are redrawn every frame from the build's projection, the flakes travel along the screen from the
// feed end to the discharge end and dry on the way, water drips through the screen into the trough, the sludge screw
// turns and the V-belt pulleys turn with the rotor. Keys 1-3 (or a click on the rotor) choose the feed, which sets the
// inlet moisture from the feed table; Space starts and stops the machine with its two-stage start and a coast-down.
const TAU = Math.PI * 2;
const NS = "http://www.w3.org/2000/svg";
const FLAKES = 76;
const DROPS = 22;
const SLUDGE = 4;
const RESIDENCE = 7.5;     // seconds of figure time for a flake to travel the rotor
const FACE_CORNERS = [[4, 5, 7, 6], [0, 1, 3, 2], [2, 3, 7, 6], [0, 1, 5, 4], [1, 3, 7, 5], [0, 2, 6, 4]];
const EDGES = (() => {
  const list = [];
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) {
    const j = i | bit;
    if (j === i) continue;
    const faces = [];
    FACE_CORNERS.forEach((f, fi) => { if (f.includes(i) && f.includes(j)) faces.push(fi); });
    list.push([i, j, faces[0], faces[1]]);
  }
  return list;
})();

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const fract = (v) => v - Math.floor(v);

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const { ox, oy, k, sinA, cosA, sinE, cosE } = F.proj;
  const [vx, vy, vz] = F.view;
  const [lx, ly, lz] = F.light;
  const iso = (x, y, z) => [ox + (x * sinA - y * cosA) * k, oy + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const toneOf = (s) => { let t = 0; while (t < 4 && s >= F.bands[t]) t++; return t; };
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };

  // ---------- rotor paddles: one fixed set of paths each, rewritten every frame
  const rotor = svg.querySelector("[data-rotor]");
  const layers = { back: rotor.querySelector('[data-layer="back"]'), front: rotor.querySelector('[data-layer="front"]') };
  const PD = F.paddle;
  const hr = (PD.r1 - PD.r0) / 2, hw = PD.w / 2, ht = PD.t / 2, rm = (PD.r0 + PD.r1) / 2;
  const cb = Math.cos(PD.beta), sb = Math.sin(PD.beta);
  const paddles = F.paddles.map(([x, phase], index) => {
    const node = svg.querySelector(`[data-paddle="${index}"]`);
    node.textContent = "";
    const g = el("g", { class: "iso-solid" }, node);
    const fill = el("path", { class: "iso-fill" }, g);
    const faces = [0, 1, 2].map(() => el("path", { class: "iso-shade", "data-shade": "1" }, g));
    const crease = el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, g);
    const edge = el("path", { class: "iso-line iso-edge", "data-tone": "hi" }, g);
    return { x, phase, node, fill, faces, crease, edge, layer: node.parentNode === layers.back ? "back" : "front", depth: 0, tones: [-1, -1, -1] };
  });
  // Every paddle is the same blade at its own angle, shifted along the rotor; its picture at x = 0 is cached per
  // quarter degree (the blade tip moves about 0.2 px per step) and the group is translated to its place once.
  const STEPS = 1440;
  const cache = new Map();
  const ax = [sinA * k, cosA * sinE * k];
  const corner = new Array(8);
  const flat = new Array(8);
  function shapeAt(key) {
    let shape = cache.get(key);
    if (shape) return shape;
    const a = (key / STEPS) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    // er = (0, c, s); et = (0, -s, c); ew = cb·x + sb·et; en = er × ew
    const er = [0, c, s];
    const ew = [cb, -sb * s, sb * c];
    const en = [c * ew[2] - s * ew[1], s * ew[0], -c * ew[0]];
    const cy = rm * c, cz = F.axis + rm * s;
    for (let i = 0; i < 8; i++) {
      const sr = i & 4 ? hr : -hr, sw = i & 2 ? hw : -hw, st = i & 1 ? ht : -ht;
      corner[i] = [sr * er[0] + sw * ew[0] + st * en[0], cy + sr * er[1] + sw * ew[1] + st * en[1], cz + sr * er[2] + sw * ew[2] + st * en[2]];
      flat[i] = iso(corner[i][0], corner[i][1], corner[i][2]);
    }
    const normals = [er, [0, -c, -s], ew, [-ew[0], -ew[1], -ew[2]], en, [-en[0], -en[1], -en[2]]];
    const seen = normals.map((n) => n[0] * vx + n[1] * vy + n[2] * vz > 1e-6);
    const pt = (i) => `${f1(flat[i][0])} ${f1(flat[i][1])}`;
    let fill = "";
    const faces = [];
    for (let fi = 0; fi < 6; fi++) {
      if (!seen[fi]) continue;
      const f = FACE_CORNERS[fi];
      const d = `M${pt(f[0])}L${pt(f[1])}L${pt(f[2])}L${pt(f[3])}Z`;
      fill += d;
      const n = normals[fi];
      faces.push([d, toneOf(n[0] * lx + n[1] * ly + n[2] * lz)]);
    }
    while (faces.length < 3) faces.push(["", -1]);
    let crease = "", edge = "";
    for (const [i, j, fa, fb] of EDGES) {
      const count = (seen[fa] ? 1 : 0) + (seen[fb] ? 1 : 0);
      if (!count) continue;
      const d = `M${pt(i)}L${pt(j)}`;
      if (count === 2) crease += d; else edge += d;
    }
    shape = { fill, faces, crease, edge, back: c * vy + s * vz < 0, depth: cy * sinA * cosE + cz * sinE };
    cache.set(key, shape);
    return shape;
  }
  paddles.forEach((p) => {
    p.node.setAttribute("transform", `translate(${f1(p.x * ax[0])} ${f1(p.x * ax[1])})`);
    p.key = -1;
  });
  function drawPaddle(p, theta) {
    let key = Math.round(((p.phase + theta) / TAU) * STEPS) % STEPS;
    if (key < 0) key += STEPS;
    if (key === p.key) return;
    p.key = key;
    const shape = shapeAt(key);
    for (let slot = 0; slot < 3; slot++) {
      const [d, tone] = shape.faces[slot];
      const path = p.faces[slot];
      if (tone >= 0 && p.tones[slot] !== tone) {
        p.tones[slot] = tone;
        if (tone === 4) { path.setAttribute("class", "iso-top"); path.removeAttribute("data-shade"); }
        else { path.setAttribute("class", "iso-shade"); path.setAttribute("data-shade", tone); }
      }
      path.setAttribute("d", d);
    }
    p.fill.setAttribute("d", shape.fill);
    p.crease.setAttribute("d", shape.crease);
    p.edge.setAttribute("d", shape.edge);
    p.depth = p.x * cosA * cosE + shape.depth;
    const layer = shape.back ? "back" : "front";
    if (layer !== p.layer) { p.layer = layer; layers[layer].appendChild(p.node); }
  }
  function sortLayers() {
    for (const name of ["back", "front"]) {
      const list = paddles.filter((p) => p.layer === name);
      const nodes = layers[name].children;
      let ordered = true;
      list.sort((a, b) => a.depth - b.depth);
      for (let i = 0; i < list.length; i++) if (nodes[i] !== list[i].node) { ordered = false; break; }
      if (!ordered) {
        const frag = document.createDocumentFragment();
        list.forEach((p) => frag.appendChild(p.node));
        layers[name].appendChild(frag);
      }
    }
  }

  // ---------- flakes, drops, sludge
  const flakeLayer = svg.querySelector("[data-flakes]");
  const dropLayer = svg.querySelector("[data-drops]");
  const sludgeLayer = svg.querySelector("[data-sludge]");
  const B = F.basket;
  const rand = (() => { let seed = 7; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();
  const flakes = Array.from({ length: FLAKES }, (_, i) => ({ s: i / FLAKES, phi: rand() * TAU, spin: 0.75 + rand() * 0.4, turn: rand() * 360, node: el("path", { "data-w": "0", opacity: "0" }, flakeLayer), w: -1, o: -1 }));
  const drops = Array.from({ length: DROPS }, () => ({ x: 0, y: 0, z: 0, v: 0, alive: false, wait: rand() * 1.2, node: el("ellipse", { rx: "0.75", ry: "1.7", opacity: "0" }, dropLayer) }));
  const sludge = Array.from({ length: SLUDGE }, (_, i) => ({ z: F.trough.spoutZ - i * 30, v: 0, node: el("ellipse", { rx: "0.9", ry: "1.9", opacity: "0" }, sludgeLayer) }));
  // Wet flakes dropping into the hopper from the feed conveyor above it, dry flakes thrown out of the discharge duct.
  const inLayer = svg.querySelector("[data-in]");
  const outLayer = svg.querySelector("[data-out]");
  const spawnIn = (f) => { f.x = F.mouthIn.x + (rand() - 0.5) * F.mouthIn.half * 1.2; f.y = (rand() - 0.5) * F.mouthIn.half * 1.2; f.z = F.mouthIn.z + 380; f.v = 0; f.turn = rand() * 360; };
  const spawnOut = (f) => { f.x = F.mouthOut.x[0] + rand() * (F.mouthOut.x[1] - F.mouthOut.x[0]); f.y = F.mouthOut.y[0] + rand() * (F.mouthOut.y[1] - F.mouthOut.y[0]); f.z = F.mouthOut.z; f.v = 1500 + rand() * 700; f.vy = -200 - rand() * 400; f.turn = rand() * 360; };
  const inFlakes = Array.from({ length: 9 }, (_, i) => { const f = { node: el("path", { "data-w": "0", opacity: "0" }, inLayer), age: -i * 0.17 }; spawnIn(f); return f; });
  const outFlakes = Array.from({ length: 10 }, (_, i) => { const f = { node: el("path", { "data-w": "2", opacity: "0" }, outLayer), age: -i * 0.06 }; spawnOut(f); return f; });
  const SHAPES = [
    (L) => `M${-L / 2} ${-L * 0.18}L${L * 0.42} ${-L * 0.3}L${L / 2} ${L * 0.2}L${-L * 0.36} ${L * 0.28}Z`,
    (L) => `M${-L / 2} -0.45L${L / 2} -0.75L${L / 2} 0.45L${-L / 2} 0.75Z`,
    (L) => `M${-L / 2} ${-L * 0.3}L${L * 0.1} ${-L / 2}L${L / 2} ${-L * 0.05}L${L * 0.25} ${L / 2}L${-L * 0.45} ${L * 0.35}Z`,
  ];

  // ---------- pulleys and screw
  const spokes = svg.querySelector("[data-spokes]");
  const spokePaths = spokes ? [...spokes.querySelectorAll("path")] : [];
  const hubDots = [...svg.querySelectorAll("[data-hub] circle")];
  const mhubDots = [...svg.querySelectorAll("[data-mhub] circle")];
  const screw = svg.querySelector("[data-screw]");
  const PU = F.pulley;
  function windowD(cy, cz, a) {
    const S = PU.spoke;
    let d = "";
    for (let i = 0; i <= 8; i++) {
      const t = a - S.half + (2 * S.half * i) / 8;
      const [x, y] = iso(PU.x, cy + S.r1 * Math.cos(t), cz + S.r1 * Math.sin(t));
      d += `${i ? "L" : "M"}${f1(x)} ${f1(y)}`;
    }
    for (let i = 8; i >= 0; i--) {
      const t = a - S.half * 0.8 + (2 * S.half * 0.8 * i) / 8;
      const [x, y] = iso(PU.x, cy + S.r0 * Math.cos(t), cz + S.r0 * Math.sin(t));
      d += `L${f1(x)} ${f1(y)}`;
    }
    return d + "Z";
  }
  function hub(dots, cy, cz, r, angle, x) {
    dots.forEach((dot, i) => {
      const a = angle + (i * TAU) / dots.length;
      const [px, py] = iso(x, cy + r * Math.cos(a), cz + r * Math.sin(a));
      dot.setAttribute("cx", f1(px));
      dot.setAttribute("cy", f1(py));
    });
  }

  // ---------- state
  const FULL = F.shownRps * TAU;          // shown angular speed at 1 500 rpm (slowed down)
  let theta = 0, omega = FULL, running = true, phase = "run", phaseAt = 0, clock = 0;
  let material = 0, touring = !still.matches, lastInput = 0, screwTurn = 0;
  let last = 0, frame = 0, visible = false, lastText = "", spoken = "";

  const materialName = () => T.materials[material];
  function say(text) { if (readout && lastText !== text) { lastText = text; readout.textContent = text; } }
  function announce(text) { if (live && spoken !== text) { spoken = text; live.textContent = text; } }
  function choose(index, fromReader) {
    material = (index + 3) % 3;
    if (fromReader) announce(T.picked.replace("{m}", materialName()).replace("{i}", F.materials[material].inlet));
    const shape = SHAPES[material](Math.max(3.5, F.materials[material].size * k));
    flakes.forEach((f) => f.node.setAttribute("d", shape));
    inFlakes.forEach((f) => f.node.setAttribute("d", shape));
    outFlakes.forEach((f) => f.node.setAttribute("d", shape));
  }
  function toggle() {
    if (phase === "run" || phase === "start1" || phase === "start2") { phase = "coast"; phaseAt = clock; running = false; announce(T.halted); }
    else { phase = "start1"; phaseAt = clock; running = true; announce(T.started); }
    if (still.matches) { phase = running ? "run" : "stop"; omega = running ? FULL : 0; }
  }
  // The idle tour resumes 8 s after the reader's last input (wall clock).
  const RESUME = 8000;
  const takeOver = () => { touring = false; lastInput = performance.now(); };
  // A stop by the reader starts again by itself 6 s after the reader's last input (wall clock, so it also works with
  // reduced motion, where there is no animation loop and the readout is redrawn by a timer instead).
  const RESTART = 6000;
  let restartAt = 0, restartTimer = 0, countTimer = 0;
  function dropRestart() { clearTimeout(restartTimer); clearInterval(countTimer); restartAt = 0; }
  function holdOff() {
    dropRestart();
    if (running) return;
    restartAt = performance.now() + RESTART;
    restartTimer = setTimeout(restart, RESTART);
    if (still.matches) countTimer = setInterval(() => draw(), 500);
  }
  function restart() {
    dropRestart();
    if (!running) toggle();
    run(); draw();
  }
  const countdown = () => (restartAt ? " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000))) : "");

  function step(dt) {
    clock += dt;
    if (!touring && !still.matches && performance.now() - lastInput > RESUME) touring = true;
    if (touring) {
      const want = Math.floor(clock / 7) % 3;
      if (want !== material) choose(want, false);
    }
    // Two-stage start: the motor reaches part speed on the first stage, full speed on the second; coast-down when stopped.
    const [s1, s2] = F.start;
    if (phase === "start1") { omega += (FULL * 0.62 - omega) * (1 - Math.exp(-dt / (s1 / 3))); if (clock - phaseAt > s1) { phase = "start2"; phaseAt = clock; } }
    else if (phase === "start2") { omega += (FULL - omega) * (1 - Math.exp(-dt / (s2 / 3))); if (clock - phaseAt > s2) { phase = "run"; omega = FULL; } }
    else if (phase === "coast") { omega *= Math.exp(-dt / (F.stopTime / 4)); if (omega < 0.02) { omega = 0; phase = "stop"; } }
    theta = (theta + omega * dt) % TAU;
    const speed = omega / FULL;
    screwTurn = fract(screwTurn + dt * 0.35 * (running || phase === "coast" ? Math.max(speed, running ? 1 : 0) : 0));

    // Flakes ride round the screen and along it; they dry as they go (wet, damp, dry thirds).
    const feed = running && phase === "run" ? 1 : 0;
    for (const f of flakes) {
      f.s += (dt / RESIDENCE) * speed;
      f.phi += dt * omega * 0.55 * f.spin;
      if (f.s >= 1) { f.s -= 1; f.phi = Math.PI + rand() * 1.6; if (!feed) f.s = 1.5; }
    }
    // Water drips off the outside of the lower screen panels into the trough; less as the feed gets drier.
    const wet = F.materials[material].inlet / 17;
    for (const d of drops) {
      if (d.alive) {
        d.v += 9.81 * 1000 * 0.18 * dt;
        d.z -= d.v * dt;
        if (d.z <= F.trough.pool) { d.alive = false; d.wait = (0.2 + rand() * 0.9) / wet; }
      } else if (speed > 0.3) {
        d.wait -= dt;
        if (d.wait <= 0) {
          const a = ((232 + rand() * 36) * Math.PI) / 180;
          d.x = B.x0 + rand() * (B.x1 - B.x0) * 0.85;
          d.y = (F.basket.r / 0.9) * Math.cos(a);
          d.z = F.axis + (F.basket.r / 0.9) * Math.sin(a);
          d.v = 0;
          d.alive = true;
        }
      }
    }
    for (const f of inFlakes) {
      f.age += dt;
      if (f.age < 0) continue;
      f.v += 9.81 * 1000 * 0.35 * dt;
      f.z -= f.v * dt;
      if (f.z <= F.mouthIn.z) { if (feed) { spawnIn(f); f.age = 0; } else f.age = -1e9; }
    }
    for (const f of outFlakes) {
      f.age += dt;
      if (f.age < 0) continue;
      f.z += f.v * dt;
      f.y += f.vy * dt;
      f.v -= 9.81 * 1000 * 0.4 * dt;
      if (f.age > 0.42) { if (speed > 0.6 && feed) { spawnOut(f); f.age = 0; } else f.age = -1e9; }
    }
    for (const d of sludge) {
      if (speed > 0.3 || d.z < F.trough.spoutZ - 2) {
        d.v += 9.81 * 1000 * 0.12 * dt;
        d.z -= d.v * dt;
        if (d.z <= F.trough.tray) { d.z = F.trough.spoutZ; d.v = rand() * 200; }
      }
    }
  }

  function draw() {
    for (const p of paddles) drawPaddle(p, theta);
    sortLayers();
    rotor.toggleAttribute("data-on", omega > 0.05 || phase === "start1");
    for (const f of flakes) {
      // Only the back half of the screen is there to see (y < 0): each flake is drawn on its way round that half,
      // fading in at the top bar and out at the cut along the bottom.
      const turn = fract(f.phi / Math.PI);
      const a = Math.PI / 2 + Math.PI * turn;
      const c = Math.cos(a), sn = Math.sin(a);
      const edgeIn = smooth(f.s / 0.04) * smooth((1 - f.s) / 0.06);
      const o = f.s > 1 ? 0 : Math.round(smooth(turn / 0.08) * smooth((1 - turn) / 0.1) * edgeIn * 20) / 20;
      if (o !== f.o) { f.o = o; f.node.setAttribute("opacity", o); }
      if (!o) continue;
      const x = B.x0 + (B.x1 - B.x0) * f.s;
      const [px, py] = iso(x, B.r * c, F.axis + B.r * sn);
      f.node.setAttribute("transform", `translate(${f1(px)} ${f1(py)}) rotate(${Math.round(f.turn + f.phi * 40) % 360})`);
      const w = f.s < 0.34 ? 0 : f.s < 0.68 ? 1 : 2;
      if (w !== f.w) { f.w = w; f.node.setAttribute("data-w", w); }
    }
    for (const f of inFlakes) {
      const o = f.age < 0 ? 0 : Math.round(smooth((F.mouthIn.z + 380 - f.z) / 120) * 20) / 20;
      if (f.o !== o) { f.o = o; f.node.setAttribute("opacity", o); }
      if (!o) continue;
      const [px, py] = iso(f.x, f.y, f.z);
      f.node.setAttribute("transform", `translate(${f1(px)} ${f1(py)}) rotate(${Math.round(f.turn + f.z * 0.4) % 360})`);
    }
    for (const f of outFlakes) {
      const o = f.age < 0 ? 0 : Math.round(smooth(f.age / 0.05) * smooth((0.42 - f.age) / 0.2) * 20) / 20;
      if (f.o !== o) { f.o = o; f.node.setAttribute("opacity", o); }
      if (!o) continue;
      const [px, py] = iso(f.x, f.y, f.z);
      f.node.setAttribute("transform", `translate(${f1(px)} ${f1(py)}) rotate(${Math.round(f.turn + f.age * 900) % 360})`);
    }
    for (const d of drops) {
      const o = d.alive ? 0.9 : 0;
      if (d.o !== o) { d.o = o; d.node.setAttribute("opacity", o); }
      if (!d.alive) continue;
      const [px, py] = iso(d.x, d.y, d.z);
      d.node.setAttribute("cx", f1(px));
      d.node.setAttribute("cy", f1(py));
    }
    for (const d of sludge) {
      const on = d.z < F.trough.spoutZ - 1;
      if (d.on !== on) { d.on = on; d.node.setAttribute("opacity", on ? "0.85" : "0"); }
      if (!on) continue;
      const [px, py] = iso(F.trough.spoutX, -35, d.z);
      d.node.setAttribute("cx", f1(px));
      d.node.setAttribute("cy", f1(py));
    }
    if (screw) screw.setAttribute("transform", `translate(${f1(F.screwStep[0] * screwTurn)} ${f1(F.screwStep[1] * screwTurn)})`);
    if (spokePaths.length) {
      let d = "";
      for (let i = 0; i < 5; i++) d += windowD(PU.big[0], PU.big[1], theta + (i * TAU) / 5);
      spokePaths.forEach((path) => path.setAttribute("d", d));
    }
    hub(hubDots, PU.big[0], PU.big[1], 48, theta, PU.x + 20);
    hub(mhubDots, PU.small[0], PU.small[1], 30, theta * PU.ratio, PU.x + 24);
    // Readout from the same instant as the motion.
    const m = F.materials[material];
    if (phase === "start1") say(T.start1);
    else if (phase === "start2") say(T.start2);
    else if (phase === "coast") say(T.coast + countdown());
    else if (phase === "stop") say(T.stopped.replace("{m}", materialName()) + countdown());
    else say(T.run.replace("{m}", materialName()).replace("{i}", m.inlet).replace("{o}", `${F.outlet[0]}–${F.outlet[1]}`).replace("{q}", F.capacity));
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    step(dt);
    draw();
    frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
  }
  const run = () => {
    if (still.matches) { draw(); return; }
    if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
  };

  svg.addEventListener("click", (event) => {
    if (!event.target.closest || !event.target.closest("[data-hit]")) return;
    takeOver();
    choose(material + 1, true);
    holdOff();
    run(); draw();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "1" || event.key === "2" || event.key === "3") { takeOver(); choose(Number(event.key) - 1, true); }
    else if (event.key === " " || event.key === "Enter") { takeOver(); toggle(); }
    else return;
    event.preventDefault();
    holdOff();
    run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  choose(0, false);
  // Start with the flakes spread along the rotor, as in steady running.
  step(0);
  draw();
}
