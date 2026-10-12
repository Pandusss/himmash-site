// Live behaviour of the balancing figure. The belt turns the shaft (slowed down); the two rows of blades are each one
// template redrawn every frame and placed along the shaft by <use>. Each roller support swings with the unbalance in
// its plane, so its dial needle swings too. A correction weight (keys 1/2, Space, or a click on the shaft) stops the
// shaft, fixes a weight to the end disc opposite the heavy spot and runs it up again: the swing drops to the residual.
const TAU = Math.PI * 2;
const NS = "http://www.w3.org/2000/svg";
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
const START = [{ m: 1, phi: (40 * Math.PI) / 180 }, { m: 0.7, phi: (205 * Math.PI) / 180 }];
const TOLERANCE = 0.05;
const STOP_T = 1.3, FIT_T = 0.9, SPIN_T = 1.3, SETTLE_T = 1.6;

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
  const number = (v) => String(Math.round(v));

  // A box solid with fixed paths, rewritten from its corners each frame.
  function solid(parent, tone) {
    const g = el("g", { class: "iso-solid" }, parent);
    return {
      g,
      fill: el("path", { class: "iso-fill" }, g),
      faces: [0, 1, 2].map(() => el("path", { class: "iso-shade", "data-shade": "1" }, g)),
      crease: el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, g),
      edge: el("path", { class: "iso-line iso-edge", "data-tone": tone }, g),
      tones: [-1, -1, -1],
    };
  }
  const flat = new Array(8);
  // Box from its centre, three unit axes and half sizes; returns whether its first axis faces away from the viewer.
  function drawBox(box, c, axes, half) {
    for (let i = 0; i < 8; i++) {
      const s0 = i & 4 ? half[0] : -half[0], s1 = i & 2 ? half[1] : -half[1], s2 = i & 1 ? half[2] : -half[2];
      flat[i] = iso(c[0] + s0 * axes[0][0] + s1 * axes[1][0] + s2 * axes[2][0], c[1] + s0 * axes[0][1] + s1 * axes[1][1] + s2 * axes[2][1], c[2] + s0 * axes[0][2] + s1 * axes[1][2] + s2 * axes[2][2]);
    }
    const n = [axes[0], axes[0].map((v) => -v), axes[1], axes[1].map((v) => -v), axes[2], axes[2].map((v) => -v)];
    const seen = n.map((a) => a[0] * vx + a[1] * vy + a[2] * vz > 1e-6);
    const p = (i) => `${f1(flat[i][0])} ${f1(flat[i][1])}`;
    let fill = "", slot = 0;
    for (let fi = 0; fi < 6; fi++) {
      if (!seen[fi]) continue;
      const f = FACE_CORNERS[fi];
      const d = `M${p(f[0])}L${p(f[1])}L${p(f[2])}L${p(f[3])}Z`;
      fill += d;
      const tone = toneOf(n[fi][0] * lx + n[fi][1] * ly + n[fi][2] * lz);
      const path = box.faces[slot];
      if (box.tones[slot] !== tone) {
        box.tones[slot] = tone;
        if (tone === 4) { path.setAttribute("class", "iso-top"); path.removeAttribute("data-shade"); }
        else { path.setAttribute("class", "iso-shade"); path.setAttribute("data-shade", tone); }
      }
      path.setAttribute("d", d);
      slot++;
    }
    for (; slot < 3; slot++) box.faces[slot].setAttribute("d", "");
    let crease = "", edge = "";
    for (const [i, j, fa, fb] of EDGES) {
      const count = (seen[fa] ? 1 : 0) + (seen[fb] ? 1 : 0);
      if (!count) continue;
      const d = `M${p(i)}L${p(j)}`;
      if (count === 2) crease += d; else edge += d;
    }
    box.fill.setAttribute("d", fill);
    box.crease.setAttribute("d", crease);
    box.edge.setAttribute("d", edge);
  }
  const frameAt = (angle, beta) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const er = [0, c, s], et = [0, -s, c];
    const ew = [Math.cos(beta), Math.sin(beta) * et[1], Math.sin(beta) * et[2]];
    const en = [er[1] * ew[2] - er[2] * ew[1], er[2] * ew[0] - er[0] * ew[2], er[0] * ew[1] - er[1] * ew[0]];
    return { er, ew, en, et };
  };

  // ---------- blade rows (templates) and their uses
  const rows = F.rows.map((angle, j) => {
    const tpl = svg.querySelector(`#ss-row${j}`);
    const arm = tpl.querySelector('[data-part="arm"]'), over = tpl.querySelector('[data-part="over"]');
    arm.textContent = ""; over.textContent = "";
    return { angle, arm: solid(arm, "hi"), over: solid(over, "mid"), bolts: [...tpl.querySelectorAll("[data-bolts] circle")], layer: "", uses: [...svg.querySelectorAll(`use[data-blade="${j}"]`)] };
  });
  const shaft = svg.querySelector("[data-shaft]");
  const layers = { back: shaft.querySelector(':scope > [data-layer="back"]'), front: shaft.querySelector(':scope > [data-layer="front"]') };
  function drawRows(theta) {
    const B = F.blade, O = F.overlay;
    for (const row of rows) {
      const { er, ew, en } = frameAt(row.angle + theta, B.beta);
      const rm = (B.r0 + B.r1) / 2, om = (O.r0 + O.r1) / 2;
      drawBox(row.arm, [0, er[1] * rm, F.axis + er[2] * rm], [er, ew, en], [(B.r1 - B.r0) / 2, B.w / 2, B.t / 2]);
      const oc = [en[0] * O.offset, er[1] * om + en[1] * O.offset, F.axis + er[2] * om + en[2] * O.offset];
      drawBox(row.over, oc, [er, ew, en], [(O.r1 - O.r0) / 2, O.w / 2, O.t / 2]);
      // Two stainless bolts through the overlay, on whichever face shows.
      const side = en[0] * vx + en[1] * vy + en[2] * vz > 0 ? 1 : -1;
      row.bolts.forEach((bolt, i) => {
        const w = (i ? 1 : -1) * O.w * 0.28;
        const q = [oc[0] + ew[0] * w + en[0] * side * O.t / 2, oc[1] + ew[1] * w + en[1] * side * O.t / 2, oc[2] + ew[2] * w + en[2] * side * O.t / 2];
        const [px, py] = iso(q[0], q[1], q[2]);
        bolt.setAttribute("cx", f1(px));
        bolt.setAttribute("cy", f1(py));
      });
      const layer = er[1] * vy + er[2] * vz < 0 ? "back" : "front";
      if (layer !== row.layer) {
        row.layer = layer;
        // Re-stack both layers: uses sorted by depth (x for a row, then the row's own depth).
        for (const name of ["back", "front"]) {
          const list = rows.filter((r) => r.layer === name).flatMap((r) => r.uses.map((u) => ({ u, d: Number(u.dataset.x) * cosA * cosE })));
          list.sort((a, b) => a.d - b.d);
          const frag = document.createDocumentFragment();
          list.forEach(({ u }) => frag.appendChild(u));
          layers[name].appendChild(frag);
        }
      }
    }
  }

  // ---------- correction weights on the end-disc rims
  const weightLayers = [0, 1].map((j) => ({ back: svg.querySelector(`[data-weights="${j}"][data-layer="back"]`), front: svg.querySelector(`[data-weights="${j}"][data-layer="front"]`) }));
  const planes = [0, 1].map((j) => svg.querySelector(`[data-plane="${j}"]`));
  let weights = [];
  function addWeightNode(j, angle) {
    const g = el("g", {}, weightLayers[j].front);
    weights.push({ j, angle, g, box: solid(g, "hi"), layer: "front" });
  }
  function drawWeights(theta) {
    for (const w of weights) {
      const { er, et } = frameAt(w.angle + theta, 0);
      const r = F.disc.r + 13;
      drawBox(w.box, [F.disc.x[w.j], er[1] * r, F.axis + er[2] * r], [er, et, [1, 0, 0]], [13, 34, 11]);
      const layer = er[1] * vy + er[2] * vz < 0 ? "back" : "front";
      if (layer !== w.layer) { w.layer = layer; weightLayers[w.j][layer].appendChild(w.g); }
    }
  }

  // ---------- supports and gauges
  const swings = [0, 1].map((j) => [...svg.querySelectorAll(`[data-swing="${j}"]`)]);
  const needles = [0, 1].map((j) => svg.querySelector(`[data-needle="${j}"]`));
  function needleD(j, a) {
    const [cx, cy, cz] = F.gauges[j];
    const r = F.gaugeR;
    const tip = iso(cx + r * Math.sin(a), cy, cz + r * Math.cos(a));
    const tail = iso(cx - 8 * Math.sin(a), cy, cz - 8 * Math.cos(a));
    return `M${f1(tail[0])} ${f1(tail[1])}L${f1(tip[0])} ${f1(tip[1])}`;
  }

  // ---------- display: unbalance vectors in the two polar plots
  const vec = svg.querySelector("[data-vec]");
  const vecDots = [...svg.querySelectorAll("[data-vecdots] circle")];
  function drawScreen(scale) {
    let d = "";
    F.screen.x.forEach((cx, j) => {
      const r = F.screen.r * Math.min(1, U[j].m) * scale;
      const y = F.screen.y + 0.5;
      const a = iso(cx, y, F.screen.z), b = iso(cx + r * Math.cos(U[j].phi), y, F.screen.z + r * Math.sin(U[j].phi));
      d += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
      vecDots[j].setAttribute("cx", f1(b[0]));
      vecDots[j].setAttribute("cy", f1(b[1]));
    });
    vec.setAttribute("d", d);
  }

  // ---------- model
  const FULL = F.rps * TAU;
  let U = START.map((p) => ({ ...p }));
  let theta = 0, omega = FULL, phase = "settle", phaseAt = 0, clock = 0, target = -1, targetAngle = 0, measured = 0;
  let touring = !still.matches, quietUntil = 0, last = 0, frame = 0, visible = false, lastText = "", spoken = "";
  const amps = [0, 0];
  const rand = (() => { let seed = 5; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();
  const residual = () => Math.max(U[0].m, U[1].m);
  const say = (text) => { if (readout && lastText !== text) { lastText = text; readout.textContent = text; } };
  const announce = (text) => { if (live && spoken !== text) { spoken = text; live.textContent = text; } };
  const deg = (a) => ((Math.round((a * 180) / Math.PI) % 360) + 360) % 360;

  function correct(j) {
    if (phase === "stop" || phase === "fit" || phase === "spin") return;
    if (j < 0) j = U[0].m >= U[1].m ? 0 : 1;
    target = j;
    targetAngle = U[j].phi + Math.PI;
    announce(T.started.replace("{n}", j + 1));
    phase = "stop"; phaseAt = clock;
    if (still.matches) { fit(); phase = residual() < TOLERANCE ? "done" : "measure"; measured = 1; omega = 0; }
  }
  function fit() {
    const j = target;
    addWeightNode(j, targetAngle);
    // The weight cancels most of the vector: what is left is a small error in mass and angle.
    const f = 0.1 + rand() * 0.08;
    U[j] = { m: U[j].m * f, phi: U[j].phi + (rand() - 0.5) * 0.6 };
    if (residual() < TOLERANCE) announce(T.balanced.replace("{r}", number(residual() * 100)));
  }
  function reset() {
    weights.forEach((w) => w.g.remove());
    weights = [];
    U = START.map((p) => ({ ...p }));
    phase = "settle"; phaseAt = clock; measured = 0;
  }
  const takeOver = () => { touring = false; quietUntil = clock + 12; };

  function step(dt) {
    clock += dt;
    if (!touring && !still.matches && clock > quietUntil && (phase === "measure" || phase === "settle")) touring = true;
    const age = clock - phaseAt;
    if (phase === "stop") { omega = FULL * Math.max(0, 1 - age / STOP_T) ** 2; if (age > STOP_T) { omega = 0; phase = "fit"; phaseAt = clock; fit(); } }
    else if (phase === "fit") { if (age > FIT_T) { phase = "spin"; phaseAt = clock; } }
    else if (phase === "spin") { omega = FULL * Math.min(1, age / SPIN_T) ** 2; if (age > SPIN_T) { omega = FULL; phase = "settle"; phaseAt = clock; measured = 0; } }
    else if (phase === "settle") { omega = FULL; measured = Math.min(1, age / SETTLE_T); if (age > SETTLE_T) { phase = residual() < TOLERANCE ? "done" : "measure"; phaseAt = clock; } }
    else if (phase === "done") { if (touring && age > 5) { phase = "next"; phaseAt = clock; } }
    else if (phase === "next") { omega = FULL * Math.max(0, 1 - age / STOP_T) ** 2; if (age > STOP_T + 0.6) reset(); }
    else if (phase === "measure") { if (touring && age > 2.6) correct(-1); }
    theta = (theta + omega * dt) % TAU;
    // Support swing follows the spin: it grows with speed squared and with the plane's unbalance.
    const sp = (omega / FULL) ** 2;
    amps[0] = U[0].m * sp; amps[1] = U[1].m * sp;
  }

  function draw() {
    drawRows(theta);
    drawWeights(theta);
    for (let j = 0; j < 2; j++) {
      const s = amps[j] * Math.sin(theta + U[j].phi);
      const t = `translate(${f1(F.swing[0] * s * 8)} ${f1(F.swing[1] * s * 8)})`;
      swings[j].forEach((g) => g.setAttribute("transform", t));
      if (needles[j]) needles[j].setAttribute("d", needleD(j, s * 0.9));
    }
    drawScreen(phase === "settle" ? measured : phase === "stop" || phase === "fit" || phase === "spin" || phase === "next" ? 0 : 1);
    // The shaft moves with the mean of its two supports.
    const m = (amps[0] * Math.sin(theta + U[0].phi) + amps[1] * Math.sin(theta + U[1].phi)) / 2;
    shaft.setAttribute("transform", `translate(${f1(F.swing[0] * m * 8)} ${f1(F.swing[1] * m * 8)})`);
    const next = phase === "stop" || phase === "fit" || phase === "spin" ? target : residual() < TOLERANCE ? -1 : U[0].m >= U[1].m ? 0 : 1;
    planes.forEach((p, j) => p.toggleAttribute("data-on", j === next));
    if (phase === "settle") say(measured < 1 && clock > 0.5 ? T.settle : T.measure.replace("{a}", number(U[0].m * 100)).replace("{b}", number(U[1].m * 100)));
    else if (phase === "measure") say(T.measure.replace("{a}", number(U[0].m * 100)).replace("{b}", number(U[1].m * 100)));
    else if (phase === "stop" || phase === "fit" || phase === "spin") say(T.fit.replace("{n}", target + 1).replace("{d}", deg(targetAngle)));
    else if (phase === "done") say(T.done.replace("{r}", number(residual() * 100)));
    else say(T.next);
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
    if (phase === "done") reset(); else correct(-1);
    run(); draw();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key === "1" || event.key === "2") { takeOver(); correct(Number(event.key) - 1); }
    else if (event.key === " " || event.key === "Enter") { takeOver(); if (phase === "done") reset(); else correct(-1); }
    else return;
    event.preventDefault();
    run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  if (still.matches) { phase = "measure"; omega = 0; measured = 1; }
  step(0);
  draw();
}
