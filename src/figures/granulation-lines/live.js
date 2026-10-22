// Live behaviour of the whole-line figure. On first sight the line starts up unit by unit along the material flow,
// and the idle tour walks it, lighting each unit in turn and naming its role; the reader picks a unit by clicking it
// or with the arrow keys, the camera moves in onto it and a card names it with its key figures and a link to its
// page (Escape, or a second click, returns to the whole line). P plays the material path: the camera follows the
// material from the bale to the bag. Space stops and starts the line.
const STEP = 4;            // seconds per unit on the tour: long enough to find the lit unit and read its line
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
  const svg = splitLayers(base0, F);       // the live layer: moving parts and what stands in front of them
  const layers2 = [base0, svg];
  layers2.forEach((layer) => { layer.style.transformOrigin = "0 0"; });
  base0.parentElement.style.overflow = "hidden";
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const count = F.units.length;
  const groups = Array.from({ length: count }, (_, i) => layers2.flatMap((layer) => [...layer.querySelectorAll(`[data-unit="${i}"]`)]));

  // ---------- camera: the viewBox eases between the whole line and the box round a unit
  const base = svg.viewBox.baseVal;
  const full = { x: base.x, y: base.y, w: base.width, h: base.height };
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
  // that holds both the start and the end view, slides and scales that picture with a CSS transform (the compositor
  // does it), and renders the end view sharp when the move is done. A recording keeps exact frames instead.
  let rendered = null, moving = false;
  function setTransform(v) {
    if (!v) { layers2.forEach((layer) => { layer.style.transform = ""; }); return; }
    const W = base0.clientWidth || 1000, sc = W / v.w;
    const t = `translate(${((rendered.x - v.x) * sc).toFixed(2)}px,${((rendered.y - v.y) * sc).toFixed(2)}px) scale(${(rendered.w / v.w).toFixed(5)})`;
    layers2.forEach((layer) => { layer.style.transform = t; });
  }
  function zoomTo(i, k = 1.5) {
    const target = i === null ? full : boxOf(i, k) || full;
    zoomed = i;
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
      setViewBox(rendered);
      setTransform(from);
    }
    run();
  }
  function setViewBox(r) {
    const vb = `${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}`;
    if (vb !== lastVb) { lastVb = vb; layers2.forEach((layer) => layer.setAttribute("viewBox", vb)); }
  }
  function moveCamera(now) {
    const t = still.matches ? 1 : Math.min(1, (now - zoomStart) / ZOOM_MS);
    const e = ease(t);
    view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
    if (!moving) setViewBox(view);
    else if (t < 1) setTransform(view);
    else { moving = false; setViewBox(to); setTransform(null); }
    return t < 1;
  }

  // ---------- rotating parts (data from the build): blades are boxes redrawn from a cache of shapes per
  // quarter degree, shifted along their axis; flights slide along the axis inside their clip.
  const NS = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;
  const { ox, oy, k: KS, sinA, cosA, sinE, cosE } = F.proj;
  const iso = (x, y, z) => [ox + (x * sinA - y * cosA) * KS, oy + ((x * cosA + y * sinA) * sinE - z * cosE) * KS];
  const VW = [cosA * cosE, sinA * cosE, sinE];
  const [lx, ly, lz] = F.light;
  const dotV = (n) => n[0] * VW[0] + n[1] * VW[1] + n[2] * VW[2];
  const toneOf = (s) => { let t = 0; while (t < 4 && s >= F.bands[t]) t++; return t; };
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const FACE = [[4, 5, 7, 6], [0, 1, 3, 2], [2, 3, 7, 6], [0, 1, 5, 4], [1, 3, 7, 5], [0, 2, 6, 4]];
  const EDGES = (() => {
    const list = [];
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) {
      const j = i | bit;
      if (j === i) continue;
      const faces = [];
      FACE.forEach((f, fi) => { if (f.includes(i) && f.includes(j)) faces.push(fi); });
      list.push([i, j, faces[0], faces[1]]);
    }
    return list;
  })();
  const STEPS = 720;
  const unitIndex = (node) => { const u = node && node.closest && node.closest("[data-unit]"); return u ? Number(u.dataset.unit) : -1; };
  let boot = still.matches ? Infinity : 0;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const startOf = (i) => (i < 0 || boot === Infinity ? 1 : smooth((boot - BOOT_STEP * i) / 0.8));
  const rotors = (F.rotors || []).map((R) => {
    const root = svg.querySelector(`[data-rotor="${R.id}"]`);
    if (!root) return null;
    const layers = { back: root.querySelector('[data-l="back"]'), front: root.querySelector('[data-l="front"]') };
    const step = (() => { const a = iso(...R.o), b = iso(R.o[0] + R.a[0], R.o[1] + R.a[1], R.o[2] + R.a[2]); return [b[0] - a[0], b[1] - a[1]]; })();
    const caches = R.types.map(() => new Map());
    const flat = new Array(8);
    function shapeAt(ti, key) {
      const cache = caches[ti];
      let shape = cache.get(key);
      if (shape) return shape;
      const T = R.types[ti];
      const ang = (key / STEPS) * TAU, c = Math.cos(ang), sn = Math.sin(ang);
      const er = [0, 1, 2].map((i) => c * R.u[i] + sn * R.v[i]);
      const et = [0, 1, 2].map((i) => -sn * R.u[i] + c * R.v[i]);
      const cb = Math.cos(T.beta || 0), sb = Math.sin(T.beta || 0);
      const ew = [0, 1, 2].map((i) => cb * R.a[i] + sb * et[i]);
      const en = [er[1] * ew[2] - er[2] * ew[1], er[2] * ew[0] - er[0] * ew[2], er[0] * ew[1] - er[1] * ew[0]];
      const rm = (T.r0 + T.r1) / 2, hr = (T.r1 - T.r0) / 2, hw = T.w / 2, ht = T.t / 2;
      const ctr = [0, 1, 2].map((i) => R.o[i] + rm * er[i]);
      for (let i = 0; i < 8; i++) {
        const a = i & 4 ? hr : -hr, b = i & 2 ? hw : -hw, d = i & 1 ? ht : -ht;
        flat[i] = iso(ctr[0] + a * er[0] + b * ew[0] + d * en[0], ctr[1] + a * er[1] + b * ew[1] + d * en[1], ctr[2] + a * er[2] + b * ew[2] + d * en[2]);
      }
      const normals = [er, er.map((v) => -v), ew, ew.map((v) => -v), en, en.map((v) => -v)];
      const seen = normals.map((n) => dotV(n) > 1e-6);
      const p = (i) => `${f1(flat[i][0])} ${f1(flat[i][1])}`;
      let fill = "";
      const faces = [];
      for (let fi = 0; fi < 6; fi++) {
        if (!seen[fi]) continue;
        const f = FACE[fi];
        const d = `M${p(f[0])}L${p(f[1])}L${p(f[2])}L${p(f[3])}Z`;
        fill += d;
        const n = normals[fi];
        faces.push([d, toneOf(n[0] * lx + n[1] * ly + n[2] * lz)]);
      }
      while (faces.length < 3) faces.push(["", -1]);
      let crease = "", edge = "";
      for (const [i, j, fa, fb] of EDGES) {
        const n = (seen[fa] ? 1 : 0) + (seen[fb] ? 1 : 0);
        if (!n) continue;
        if (n === 2) crease += `M${p(i)}L${p(j)}`; else edge += `M${p(i)}L${p(j)}`;
      }
      shape = { fill, faces, crease, edge, back: dotV(er) < 0, depth: dotV(ctr) };
      cache.set(key, shape);
      return shape;
    }
    const axisDepth = dotV(R.a);
    const blades = R.blades.map((B) => {
      const node = el("g", { class: "iso-solid", transform: `translate(${f1(B.s * step[0])} ${f1(B.s * step[1])})` }, layers.front);
      const fill = el("path", { class: "iso-fill" }, node);
      const faces = [0, 1, 2].map(() => el("path", { class: "iso-shade", "data-shade": "1" }, node));
      const crease = el("path", { class: "iso-line iso-crease", "data-tone": "faint" }, node);
      const edge = el("path", { class: "iso-line iso-edge", "data-tone": "hi" }, node);
      return { ...B, node, fill, faces, crease, edge, layer: "front", depth: 0, key: -1, tones: [-1, -1, -1] };
    });
    const flights = R.flight ? [...root.querySelectorAll("[data-flight]")] : [];
    let box = null;
    function draw(theta) {
      for (const bd of blades) {
        let key = Math.round(((bd.phase + theta) / TAU) * STEPS) % STEPS;
        if (key < 0) key += STEPS;
        if (key === bd.key) continue;
        bd.key = key;
        const sh = shapeAt(bd.type || 0, key);
        for (let slot = 0; slot < 3; slot++) {
          const [d, tone] = sh.faces[slot];
          const path = bd.faces[slot];
          if (tone >= 0 && bd.tones[slot] !== tone) {
            bd.tones[slot] = tone;
            if (tone >= 4) { path.setAttribute("class", "iso-top"); path.removeAttribute("data-shade"); }
            else { path.setAttribute("class", "iso-shade"); path.setAttribute("data-shade", tone); }
          }
          path.setAttribute("d", d);
        }
        bd.fill.setAttribute("d", sh.fill);
        bd.edge.setAttribute("d", sh.edge);
        bd.depth = bd.s * axisDepth + sh.depth;
        const layer = sh.back ? "back" : "front";
        if (layer !== bd.layer) { bd.layer = layer; layers[layer].appendChild(bd.node); }
      }
      for (const name of ["back", "front"]) {
        const list = blades.filter((b) => b.layer === name).sort((a, b) => a.depth - b.depth);
        const nodes = layers[name].children;
        let ordered = nodes.length === list.length;
        for (let i = 0; ordered && i < list.length; i++) if (nodes[i] !== list[i].node) ordered = false;
        if (!ordered) { const frag = document.createDocumentFragment(); list.forEach((b) => frag.appendChild(b.node)); layers[name].appendChild(frag); }
      }
      if (flights.length) {
        const { pitch, hand } = R.flight;
        let off = ((theta / TAU) * pitch * hand) % pitch;
        if (off < 0) off += pitch;
        const t = `translate(${f1(off * R.flight.step[0])} ${f1(off * R.flight.step[1])})`;
        flights.forEach((g) => g.setAttribute("transform", t));
      }
    }
    return { R, root, draw, unit: unitIndex(root), get box() { if (!box) { const b = root.getBBox(); box = { x: b.x, y: b.y, w: b.width, h: b.height }; } return box; } };
  }).filter(Boolean);
  const angles = rotors.map(() => 0);
  const inView = (b) => b.x < view.x + view.w && b.x + b.w > view.x && b.y < view.y + view.h && b.y + b.h > view.y;
  // Rotors are redrawn at most 30 times a second, and 12 times on the whole-line view where they are small; each
  // keeps its own phase, so the redraws of different rotors fall on different frames.
  const due = rotors.map((_, i) => i * 0.0137);
  let svgPx = base0.getBoundingClientRect().width || 1000;
  new ResizeObserver(() => { svgPx = base0.getBoundingClientRect().width || svgPx; }).observe(base0);
  function turn(dt) {
    const wide = view.w > full.w * 0.6;
    const every = still.matches ? 0 : wide ? 1 / 12 : 1 / 30;
    rotors.forEach((r, i) => {
      angles[i] += dt * r.R.speed * TAU * flow * startOf(r.unit);
      if (moving) return;
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

  // ---------- sliding groups (slats, belts, bales, bags)
  const slides = (F.slides || []).map((spec) => {
    const nodes = [...svg.querySelectorAll(`[data-slide="${spec.id}"]`)];
    let off = spec.phase || 0;
    return {
      unit: unitIndex(nodes[0]),
      last: "",
      move(dt) {
        off = (off + dt * spec.speed) % spec.period;
        const t = `translate(${f1(off * spec.step[0])} ${f1(off * spec.step[1])})`;
        if (t === this.last) return;
        this.last = t;
        nodes.forEach((n) => n.setAttribute("transform", t));
      },
    };
  });

  // ---------- material: dots along polylines
  const flows = (F.flows || []).map((spec) => {
    const host = svg.querySelector(`[data-flow="${spec.id}"]`);
    if (!host) return null;
    const pts = spec.points;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const total = cum[cum.length - 1];
    let seed = spec.id.length * 97;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dots = Array.from({ length: spec.count }, (_, i) => ({ u: i / spec.count + rand() * 0.03, j: [rand() * 2 - 1, rand() * 2 - 1], node: el("circle", { r: (spec.size * (0.65 + rand() * 0.7)).toFixed(2), class: `ln-dot ln-${spec.kind}` }, host) }));
    function at(u) {
      const d = u * total;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return [0, 1, 2].map((c) => pts[i - 1][c] + (pts[i][c] - pts[i - 1][c]) * t);
    }
    let acc = 0;
    function move(dt) {
      acc += dt;
      if (dt > 0 && acc < 1 / 30) return;
      dt = acc; acc = 0;
      for (const p of dots) {
        p.u = (p.u + (dt * spec.speed) / total) % 1;
        const w = at(p.u);
        const q = iso(w[0] + p.j[0] * spec.spread, w[1] + p.j[1] * spec.spread, w[2]);
        p.node.setAttribute("cx", f1(q[0]));
        p.node.setAttribute("cy", f1(q[1]));
      }
    }
    return { move, unit: unitIndex(host) };
  }).filter(Boolean);

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
@media (max-width:640px){.ln-info{left:6px;top:6px;padding:6px 8px;font-size:11px;max-width:75%}.ln-info b,.ln-info[data-story] b{font-size:14px}.ln-info[data-story] p{font-size:11px}}`;
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
  function showCard(i, asStory) {
    if (i === cardFor && asStory === cardStory) return;
    cardFor = i; cardStory = asStory;
    if (i === null || i < 0) { card.removeAttribute("data-show"); return; }
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
    showCard(story ? story.i : selected, !!story);
    if (on !== lastOn) {
      lastOn = on;
      groups.forEach((list, i) => list.forEach((node) => node.toggleAttribute("data-on", i === on)));
    }
    if (booting && !story && on == null) say(T.starting);
    else if (on !== null && on !== undefined) say(stepText(on));
    else say(running ? T.run : T.stopped);
  }

  // The drawing changes at most 30 times a second (20 on the whole-line view, where everything is small): between those
  // updates nothing in it changes and the browser repaints nothing; only the camera moves every frame.
  let pending = 0;
  function update(dt) {
    step(dt);
    turn(dt);
    flows.forEach((f) => f.move(dt * flow * startOf(f.unit)));
    slides.forEach((f) => f.move(dt * flow * startOf(f.unit)));
    marks(dt);
    draw();
  }
  let ft = 0, fa = 0, glowT = 0;
  function marks(dt) {
    ft = (ft + dt * flow * 8.2) % 9;
    fa = (fa + dt * flow * 18) % 9;
    glowT += dt * flow;
    const hg = 40 + 35 * Math.sin(glowT * 1.3), mg = 45 + 40 * Math.sin(glowT * 1.75);
    // Set on the few elements that use them, not on the root: a variable on the root restyles the whole layer.
    const fts = `${ft.toFixed(1)}px`, fas = `${fa.toFixed(1)}px`, hgs = `${hg.toFixed(0)}%`, mgs = `${mg.toFixed(0)}%`;
    for (const el of markEls.water) el.style.setProperty("--ft", fts);
    for (const el of markEls.air) el.style.setProperty("--fa", fas);
    for (const el of markEls.hot) el.style.setProperty("--hg", hgs);
    for (const el of markEls.melt) el.style.setProperty("--mg", mgs);
  }
  const shown = (el) => !el.closest("[display=none]");
  const markEls = {
    water: [...svg.querySelectorAll(".ln-flowline:not([data-flow-kind=air])")].filter(shown),
    air: [...svg.querySelectorAll(".ln-flowline[data-flow-kind=air]")].filter(shown),
    hot: [...svg.querySelectorAll(".ln-hot")].filter(shown),
    melt: [...svg.querySelectorAll(".ln-melt")].filter(shown),
  };
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    clockMs += dt * 1000;
    const moving = moveCamera(clockMs);
    pending += dt;
    const every = view.w > full.w * 0.6 ? 1 / 20 : 1 / 30;
    if (pending >= every || still.matches) { update(Math.min(pending, 0.1)); pending = 0; }
    frame = visible && (!still.matches || moving) ? requestAnimationFrame(tick) : 0;
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
  base0.addEventListener("click", (event) => {
    if (story) { story = null; }
    const i = unitOf(event);
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

// The drawing has thousands of paths; if anything in it moves, the browser re-rasters all of it every frame. So it is
// split into two stacked SVGs: the base keeps everything that stands still (the moving parts hidden) and is rastered
// once per camera move; a live copy on top keeps only the moving parts and the still parts painted after them that
// overlap them on screen, so the painter's order holds. The live copy takes no pointer events.
function splitLayers(base, F) {
  if (/nosplit/.test(location.search)) return base;
  const MOVING = "[data-rotor],[data-slide],.ln-flow,.ln-flowline,.ln-hot,.ln-melt";
  const live = base.cloneNode(true);
  live.removeAttribute("aria-label");
  live.setAttribute("aria-hidden", "true");
  live.classList.add("ln-live");
  live.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;will-change:transform";
  base.style.willChange = "transform";
  const host = base.parentElement;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  base.insertAdjacentElement("afterend", live);
  // Lay the live copy exactly over the base, whatever padding the stage has.
  const place = () => { live.style.left = `${base.offsetLeft}px`; live.style.top = `${base.offsetTop}px`; live.style.width = `${base.offsetWidth}px`; live.style.height = `${base.offsetHeight}px`; };
  place();
  new ResizeObserver(place).observe(base);
  const a = [...base.querySelectorAll("*")], b = [...live.querySelectorAll("*")];
  const index = new Map(a.map((el, i) => [el, i]));
  const isLeaf = (el) => el.matches("g.iso-solid, g.tb, g.iso-dots, path, circle, ellipse, polygon, line") && !el.closest("defs, clipPath, mask, linearGradient");
  const moving = new Set(a.filter((el) => el.matches(MOVING) && !el.parentElement.closest(MOVING)));
  // Screen boxes in the drawing's own units; a clip ancestor bounds what can show.
  const back = base.getScreenCTM().inverse();
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    const p = new DOMPoint(r.left, r.top).matrixTransform(back), q = new DOMPoint(r.right, r.bottom).matrixTransform(back);
    let box = [p.x, p.y, q.x, q.y];
    const clipHost = el.closest("[clip-path]");
    if (clipHost) {
      const id = (clipHost.getAttribute("clip-path").match(/#([^)]+)/) || [])[1];
      const shape = id && base.querySelector(`[id="${id}"] path`);
      if (shape) { const c = shape.getBBox(); box = [Math.max(box[0], c.x), Math.max(box[1], c.y), Math.min(box[2], c.x + c.width), Math.min(box[3], c.y + c.height)]; }
    }
    return box[2] > box[0] && box[3] > box[1] ? box : null;
  };
  // A coarse grid of the moving parts' boxes, filled as the walk goes, so a still part only meets moving parts
  // painted before it.
  const CELL = 40, grid = new Map();
  const cells = (box, fn) => { for (let gx = Math.floor(box[0] / CELL); gx <= Math.floor(box[2] / CELL); gx++) for (let gy = Math.floor(box[1] / CELL); gy <= Math.floor(box[3] / CELL); gy++) if (fn(`${gx},${gy}`)) return true; return false; };
  const overlaps = (box) => cells(box, (key) => (grid.get(key) || []).some((m) => m[0] < box[2] && m[2] > box[0] && m[1] < box[3] && m[3] > box[1]));
  // A moving part's footprint: thin lines (the flow marks in the pipes) and the dot trails as strings of small boxes
  // along their path, everything else as its clipped box.
  const { ox, oy, k: KS, sinA, cosA, sinE, cosE } = F.proj;
  const iso = (x, y, z) => [ox + (x * sinA - y * cosA) * KS, oy + ((x * cosA + y * sinA) * sinE - z * cosE) * KS];
  const trail = new Map((F.flows || []).map((f) => [f.id, f]));
  const footprint = (el) => {
    if (el.matches("path.ln-flowline")) {
      const len = el.getTotalLength(), out = [];
      for (let d = 0; d <= len; d += 3) { const q = el.getPointAtLength(d); out.push([q.x - 1.5, q.y - 1.5, q.x + 1.5, q.y + 1.5]); }
      return out;
    }
    if (el.matches(".ln-flow")) {
      const f = trail.get(el.dataset.flow);
      if (!f) return [];
      const pad = f.spread * KS + f.size * 1.4 + 1, out = [];
      for (let i = 1; i < f.points.length; i++) {
        const a = iso(...f.points[i - 1]), b = iso(...f.points[i]);
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
        for (let j = 0; j <= n; j++) { const x = a[0] + ((b[0] - a[0]) * j) / n, y = a[1] + ((b[1] - a[1]) * j) / n; out.push([x - pad, y - pad, x + pad, y + pad]); }
      }
      return out;
    }
    const box = boxOf(el);
    return box ? [box] : [];
  };
  // Flow marks are optional: a stretch of pipe that anything painted later covers keeps still marks in the base, so
  // the live layer does not have to carry copies of whatever stands in front of it.
  const order = new Map();
  let n = 0;
  const leafBoxes = [];
  for (const el of a) {
    order.set(el, n++);
    if (isLeaf(el) && !el.closest(MOVING) && !(el.parentElement && el.parentElement.closest("g.iso-solid, g.tb, g.iso-dots"))) {
      const box = boxOf(el);
      if (box) leafBoxes.push([order.get(el), box]);
    }
  }
  const LG = new Map();
  for (const [i, box] of leafBoxes) cells(box, (key) => { (LG.get(key) || LG.set(key, []).get(key)).push([i, box]); return false; });
  const coveredLater = (el, fp) => { const at = order.get(el); return fp.some((box) => cells(box, (key) => (LG.get(key) || []).some(([i, m]) => i > at && m[0] < box[2] && m[2] > box[0] && m[1] < box[3] && m[3] > box[1]))); };
  for (const el of [...moving]) {
    if (!el.matches(".ln-flowline")) continue;
    if (coveredLater(el, footprint(el))) { moving.delete(el); el.style.animation = "none"; b[index.get(el)].setAttribute("display", "none"); }
  }
  const keepLive = new Set();
  const walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.nextNode(); el; el = walker.nextNode()) {
    if (moving.has(el)) {
      for (const box of footprint(el)) cells(box, (key) => { (grid.get(key) || grid.set(key, []).get(key)).push(box); return false; });
      // Skip the moving subtree: it goes to the live layer whole.
      let next = el;
      while (next && !next.nextElementSibling) next = next.parentElement === base ? null : next.parentElement;
      if (!next) break;
      walker.currentNode = next.nextElementSibling;
      walker.previousNode();
      continue;
    }
    if (!isLeaf(el) || el.closest(MOVING)) continue;
    const box = boxOf(el);
    if (box && overlaps(box)) keepLive.add(el);
    // A leaf's children are drawn with it.
    let next = el;
    while (next && !next.nextElementSibling) next = next.parentElement === base ? null : next.parentElement;
    if (!next) break;
    walker.currentNode = next.nextElementSibling;
    walker.previousNode();
  }
  for (const el of moving) el.setAttribute("display", "none");
  a.forEach((el, i) => {
    if (!isLeaf(el) || el.closest(MOVING) || keepLive.has(el)) return;
    if (el.parentElement && el.parentElement.closest("g.iso-solid, g.tb, g.iso-dots") && el.parentElement !== el) return;
    b[i].setAttribute("display", "none");
  });
  return live;
}

