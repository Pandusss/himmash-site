// Live behaviour of the friction washer figure. The rotor turns (slowed down), its inclined blades are redrawn from
// the build's projection, the flakes are carried up the housing and get cleaner while the hot water is on, the nozzles
// spray, dirty water runs from the trough into the tank and clean flakes drop out of the discharge chute.
// Keys 1-4 (or a click on the rotor) choose the feed, which sets the throughput from the specification;
// Space turns the water on and off.
const TAU = Math.PI * 2;
const NS = "http://www.w3.org/2000/svg";
const FLAKES = 96;
const SPRAY = 30;
const RESIDENCE = 8;
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
  const [AX, UX, VX] = F.axis;
  const O = F.origin;
  const iso = (x, y, z) => [ox + (x * sinA - y * cosA) * k, oy + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
  const at = (s, u, v) => iso(O[0] + AX[0] * s + UX[0] * u + VX[0] * v, O[1] + AX[1] * s + UX[1] * u + VX[1] * v, O[2] + AX[2] * s + UX[2] * u + VX[2] * v);
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const toneOf = (s) => { let t = 0; while (t < 4 && s >= F.bands[t]) t++; return t; };
  const dotV = (n) => n[0] * vx + n[1] * vy + n[2] * vz;
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const rand = (() => { let seed = 11; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();

  // ---------- rotor blades: one picture per quarter degree at s = 0, cached, each blade group shifted along the axis
  const rotor = svg.querySelector("[data-rotor]");
  const layers = { back: rotor.querySelector('[data-layer="back"]'), front: rotor.querySelector('[data-layer="front"]') };
  const PD = F.paddle;
  const hr = (PD.r1 - PD.r0) / 2, hw = PD.w / 2, ht = PD.t / 2, rm = (PD.r0 + PD.r1) / 2;
  const cb = Math.cos(PD.beta), sb = Math.sin(PD.beta);
  const STEPS = 1440;
  const cache = new Map();
  const paddles = F.paddles.map(([s, phase], index) => {
    const node = svg.querySelector(`[data-paddle="${index}"]`);
    node.textContent = "";
    const g = el("g", { class: "iso-solid" }, node);
    const fill = el("path", { class: "iso-fill" }, g);
    const faces = [0, 1, 2].map(() => el("path", { class: "iso-shade", "data-shade": "1" }, g));
    const crease = el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, g);
    const edge = el("path", { class: "iso-line iso-edge", "data-tone": "hi" }, g);
    node.setAttribute("transform", `translate(${f1(s * F.step[0])} ${f1(s * F.step[1])})`);
    return { s, phase, node, fill, faces, crease, edge, layer: node.parentNode === layers.back ? "back" : "front", depth: 0, key: -1, tones: [-1, -1, -1] };
  });
  const axisDepth = dotV(AX);
  const flat = new Array(8);
  function shapeAt(key) {
    let shape = cache.get(key);
    if (shape) return shape;
    const a = (key / STEPS) * TAU, c = Math.cos(a), s = Math.sin(a);
    const er = [0, 1, 2].map((i) => c * UX[i] + s * VX[i]);
    const et = [0, 1, 2].map((i) => -s * UX[i] + c * VX[i]);
    const ew = [0, 1, 2].map((i) => cb * AX[i] + sb * et[i]);
    const en = [er[1] * ew[2] - er[2] * ew[1], er[2] * ew[0] - er[0] * ew[2], er[0] * ew[1] - er[1] * ew[0]];
    const centre = [0, 1, 2].map((i) => O[i] + rm * er[i]);
    for (let i = 0; i < 8; i++) {
      const sr = i & 4 ? hr : -hr, sw = i & 2 ? hw : -hw, st = i & 1 ? ht : -ht;
      flat[i] = iso(centre[0] + sr * er[0] + sw * ew[0] + st * en[0], centre[1] + sr * er[1] + sw * ew[1] + st * en[1], centre[2] + sr * er[2] + sw * ew[2] + st * en[2]);
    }
    const normals = [er, er.map((v) => -v), ew, ew.map((v) => -v), en, en.map((v) => -v)];
    const seen = normals.map((n) => dotV(n) > 1e-6);
    const p = (i) => `${f1(flat[i][0])} ${f1(flat[i][1])}`;
    let fill = "";
    const faces = [];
    for (let fi = 0; fi < 6; fi++) {
      if (!seen[fi]) continue;
      const f = FACE_CORNERS[fi];
      const d = `M${p(f[0])}L${p(f[1])}L${p(f[2])}L${p(f[3])}Z`;
      fill += d;
      const n = normals[fi];
      faces.push([d, toneOf(n[0] * lx + n[1] * ly + n[2] * lz)]);
    }
    while (faces.length < 3) faces.push(["", -1]);
    let crease = "", edge = "";
    for (const [i, j, fa, fb] of EDGES) {
      const count = (seen[fa] ? 1 : 0) + (seen[fb] ? 1 : 0);
      if (!count) continue;
      const d = `M${p(i)}L${p(j)}`;
      if (count === 2) crease += d; else edge += d;
    }
    shape = { fill, faces, crease, edge, back: dotV(er) < 0, depth: dotV(centre) };
    cache.set(key, shape);
    return shape;
  }
  function drawPaddle(pd, theta) {
    let key = Math.round(((pd.phase + theta) / TAU) * STEPS) % STEPS;
    if (key < 0) key += STEPS;
    if (key === pd.key) return;
    pd.key = key;
    const shape = shapeAt(key);
    for (let slot = 0; slot < 3; slot++) {
      const [d, tone] = shape.faces[slot];
      const path = pd.faces[slot];
      if (tone >= 0 && pd.tones[slot] !== tone) {
        pd.tones[slot] = tone;
        if (tone === 4) { path.setAttribute("class", "iso-top"); path.removeAttribute("data-shade"); }
        else { path.setAttribute("class", "iso-shade"); path.setAttribute("data-shade", tone); }
      }
      path.setAttribute("d", d);
    }
    pd.fill.setAttribute("d", shape.fill);
    pd.crease.setAttribute("d", shape.crease);
    pd.edge.setAttribute("d", shape.edge);
    pd.depth = pd.s * axisDepth + shape.depth;
    const layer = shape.back ? "back" : "front";
    if (layer !== pd.layer) { pd.layer = layer; layers[layer].appendChild(pd.node); }
  }
  function sortLayers() {
    for (const name of ["back", "front"]) {
      const list = paddles.filter((p) => p.layer === name).sort((a, b) => a.depth - b.depth);
      const nodes = layers[name].children;
      let ordered = true;
      for (let i = 0; i < list.length; i++) if (nodes[i] !== list[i].node) { ordered = false; break; }
      if (!ordered) {
        const frag = document.createDocumentFragment();
        list.forEach((p) => frag.appendChild(p.node));
        layers[name].appendChild(frag);
      }
    }
  }

  // ---------- flakes, spray, drain, discharge
  const FL = F.flakes;
  const flakeLayer = svg.querySelector("[data-flakes]");
  const flakes = Array.from({ length: FLAKES }, (_, i) => ({ s: i / FLAKES, phi: rand() * TAU, spin: 0.7 + rand() * 0.5, turn: rand() * 360, clean: 0, node: el("path", { "data-c": "0", opacity: "0" }, flakeLayer), c: -1, o: -1 }));
  const sprayLayer = svg.querySelector("[data-spray]");
  const spray = Array.from({ length: SPRAY }, (_, i) => ({ t: -rand() * 0.6, n: i % F.nozzles.length, spread: rand() - 0.5, node: el("ellipse", { rx: "0.7", ry: "1.6", opacity: "0" }, sprayLayer), o: -1 }));
  const drainLayer = svg.querySelector("[data-drain]");
  const drain = Array.from({ length: 6 }, (_, i) => ({ z: F.drain[2] - i * 45, v: 0, node: el("ellipse", { rx: "1", ry: "2", "data-dirty": "", opacity: "0" }, drainLayer), o: -1 }));
  const chuteLayer = svg.querySelector("[data-chute]");
  const out = Array.from({ length: 8 }, (_, i) => ({ age: -i * 0.09, x: 0, y: 0, z: 0, v: 0, turn: 0, node: el("path", { "data-c": "2", opacity: "0" }, chuteLayer), o: -1 }));
  chuteLayer.setAttribute("class", "fw-flakes");
  const inLayer = svg.querySelector("[data-in]");
  const inFlakes = Array.from({ length: 8 }, (_, i) => ({ age: -i * 0.16, x: 0, y: 0, z: 0, v: 0, turn: 0, node: el("path", { "data-c": "0", opacity: "0" }, inLayer), o: -1 }));
  const SHAPES = [
    (L) => `M${-L / 2} ${-L * 0.18}L${L * 0.42} ${-L * 0.3}L${L / 2} ${L * 0.2}L${-L * 0.36} ${L * 0.28}Z`,
    (L) => `M${-L / 2} -0.45L${L / 2} -0.75L${L / 2} 0.45L${-L / 2} 0.75Z`,
    (L) => `M${-L / 2} ${-L * 0.3}L${L * 0.1} ${-L / 2}L${L / 2} ${-L * 0.05}L${L * 0.25} ${L / 2}L${-L * 0.45} ${L * 0.35}Z`,
    (L) => `M${-L / 2} ${-L * 0.35}L${L / 2} ${-L * 0.4}L${L * 0.45} ${L * 0.38}L${-L * 0.48} ${L * 0.3}Z`,
  ];
  const spawnOut = (f) => { const M = F.chute; f.x = M.x[0] + rand() * (M.x[1] - M.x[0]); f.y = M.y[0] + rand() * (M.y[1] - M.y[0]); f.z = M.z; f.v = 200 + rand() * 300; f.turn = rand() * 360; };
  const spawnIn = (f) => { const M = F.hopper; f.x = M.x + (rand() - 0.5) * M.half * 1.4; f.y = (rand() - 0.5) * M.half * 1.4; f.z = M.z + 380; f.v = 0; f.turn = rand() * 360; };
  out.forEach(spawnOut);
  inFlakes.forEach(spawnIn);

  // ---------- state
  const FULL = F.rps * TAU;
  let theta = 0, water = true, wetness = 1, material = 0, touring = !still.matches, quietUntil = 0, clock = 0;
  let last = 0, frame = 0, visible = false, lastText = "", spoken = "";
  const name = () => T.materials[material];
  function say(text) { if (readout && lastText !== text) { lastText = text; readout.textContent = text; } }
  function announce(text) { if (live && spoken !== text) { spoken = text; live.textContent = text; } }
  function choose(index, fromReader) {
    material = (index + 4) % 4;
    if (fromReader) announce(T.picked.replace("{m}", name()).replace("{q}", F.materials[material].q));
    const shape = SHAPES[material](Math.max(3.5, F.materials[material].size * k));
    [...flakes, ...out, ...inFlakes].forEach((f) => f.node.setAttribute("d", shape));
  }
  function toggleWater() {
    water = !water;
    announce(water ? T.waterOn : T.waterOff);
    if (still.matches) wetness = water ? 1 : 0;
  }
  const takeOver = () => { touring = false; quietUntil = clock + 12; };

  function step(dt) {
    clock += dt;
    if (!touring && !still.matches && clock > quietUntil) touring = true;
    if (touring) {
      // Tour: each feed in turn with the water on, then the film again with the water shut off, to show why it is there.
      const cycle = Math.floor(clock / 6.5) % 5;
      const want = cycle === 4 ? 0 : cycle;
      if (want !== material) choose(want, false);
      const dryNow = cycle === 4;
      if (dryNow === water) water = !dryNow;
    }
    wetness += ((water ? 1 : 0) - wetness) * (1 - Math.exp(-dt / 0.5));
    theta = (theta + FULL * dt) % TAU;
    const rate = F.materials[material].q / 900;
    for (const f of flakes) {
      f.s += (dt / RESIDENCE) * (0.75 + 0.25 * rate);
      f.phi += dt * FULL * 0.5 * f.spin;
      // Cleaning follows the water that is reaching the flake: dirty when it enters, clean near the top.
      f.clean = Math.min(1, f.clean + dt * wetness * 0.32);
      if (!water) f.clean = Math.max(0, f.clean - dt * 0.02);
      if (f.s >= 1) { f.s -= 1; f.clean = 0; f.phi = rand() * TAU; f.on = rand() < rate; }
    }
    for (const d of spray) {
      d.t += dt;
      if (d.t > 0.42) { d.t = water ? -rand() * 0.15 : -1e9; d.n = Math.floor(rand() * F.nozzles.length); d.spread = rand() - 0.5; }
      if (water && d.t < -100) d.t = -rand() * 0.3;
    }
    for (const d of drain) {
      if (wetness > 0.2 || d.z < F.drain[2] - 2) {
        d.v += 9.81 * 1000 * 0.12 * dt;
        d.z -= d.v * dt;
        if (d.z <= 160) { d.z = wetness > 0.2 ? F.drain[2] : F.drain[2] + 0.5; d.v = rand() * 150; }
      }
    }
    for (const f of out) {
      f.age += dt;
      if (f.age < 0) continue;
      f.v += 9.81 * 1000 * 0.18 * dt;
      f.z -= f.v * dt;
      if (f.age > 0.6) { spawnOut(f); f.age = -rand() * 0.25 * (1.2 - rate); }
    }
    for (const f of inFlakes) {
      f.age += dt;
      if (f.age < 0) continue;
      f.v += 9.81 * 1000 * 0.35 * dt;
      f.z -= f.v * dt;
      if (f.z <= F.hopper.z) { spawnIn(f); f.age = -rand() * 0.3 * (1.2 - rate); }
    }
  }

  function draw() {
    for (const p of paddles) drawPaddle(p, theta);
    sortLayers();
    rotor.toggleAttribute("data-on", true);
    const [w0, w1] = F.window;
    for (const f of flakes) {
      // Seen only through the window, on the far half of the housing.
      const turn = fract(f.phi / Math.PI);
      const a = (140 / 180) * Math.PI + Math.PI * turn;
      const s = FL.s0 + (FL.s1 - FL.s0) * f.s;
      const inWin = smooth((s - w0) / 80) * smooth((w1 - s) / 80);
      const o = f.on === false ? 0 : Math.round(smooth(turn / 0.1) * smooth((1 - turn) / 0.1) * inWin * 20) / 20;
      if (o !== f.o) { f.o = o; f.node.setAttribute("opacity", o); }
      if (!o) continue;
      const [px, py] = at(s, FL.r * Math.cos(a), FL.r * Math.sin(a));
      f.node.setAttribute("transform", `translate(${f1(px)} ${f1(py)}) rotate(${Math.round(f.turn + f.phi * 40) % 360})`);
      const c = f.clean < 0.33 ? 0 : f.clean < 0.7 ? 1 : 2;
      if (c !== f.c) { f.c = c; f.node.setAttribute("data-c", c); }
    }
    for (const d of spray) {
      const o = d.t < 0 ? 0 : Math.round(smooth(d.t / 0.06) * smooth((0.42 - d.t) / 0.12) * 20) / 20;
      if (o !== d.o) { d.o = o; d.node.setAttribute("opacity", o); }
      if (!o) continue;
      const [s, nu, nv] = F.nozzles[d.n];
      // Down from the nozzle in the top onto the material, fanned a little along the rotor and across.
      const dist = 40 + d.t * 1500;
      const u = nu + dist * (0.32 + d.spread * 0.3), v = nv - dist;
      const [px, py] = at(s + d.spread * dist * 0.5, u, v);
      d.node.setAttribute("cx", f1(px));
      d.node.setAttribute("cy", f1(py));
    }
    for (const d of drain) {
      const o = d.z < F.drain[2] - 1 ? 0.85 : 0;
      if (o !== d.o) { d.o = o; d.node.setAttribute("opacity", o); }
      if (!o) continue;
      const [px, py] = iso(F.drain[0], F.drain[1], d.z);
      d.node.setAttribute("cx", f1(px));
      d.node.setAttribute("cy", f1(py));
    }
    const fallers = (list, life, fade) => {
      for (const f of list) {
        const o = f.age < 0 ? 0 : Math.round(fade(f) * 20) / 20;
        if (o !== f.o) { f.o = o; f.node.setAttribute("opacity", o); }
        if (!o) continue;
        const [px, py] = iso(f.x, f.y, f.z);
        f.node.setAttribute("transform", `translate(${f1(px)} ${f1(py)}) rotate(${Math.round(f.turn + f.age * life) % 360})`);
      }
    };
    fallers(out, 500, (f) => smooth(f.age / 0.05) * smooth((0.6 - f.age) / 0.25));
    fallers(inFlakes, 300, (f) => smooth((F.hopper.z + 380 - f.z) / 120));
    say((water ? T.run : T.dry).replace("{m}", name()).replace("{q}", F.materials[material].q));
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
    run(); draw();
  });
  stage.addEventListener("keydown", (event) => {
    if (["1", "2", "3", "4"].includes(event.key)) { takeOver(); choose(Number(event.key) - 1, true); }
    else if (event.key === " " || event.key === "Enter") { takeOver(); toggleWater(); }
    else return;
    event.preventDefault();
    run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  choose(0, false);
  // Start in steady running: flakes spread along the housing, cleaner the higher they are.
  flakes.forEach((f) => { f.clean = Math.min(1, f.s * RESIDENCE * 0.32); });
  step(0);
  draw();
}
