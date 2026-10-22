// The moving parts of the line drawings, shared by the whole-line figure and the figures of single units cut from it:
// rotors (blades redrawn from a cache of box shapes per half degree, screw flights slid along their axis), sliding
// groups (slats, belts, bags), material dots along polylines, the flow marks and heater glow, and the split into a still
// base and a live layer. Every part keeps the index of the unit it belongs to (data-unit), or -1.
const STEPS = 720;
const FACE = [[4, 5, 7, 6], [0, 1, 3, 2], [2, 3, 7, 6], [0, 1, 5, 4], [1, 3, 7, 5], [0, 2, 6, 4]];
const unitIndex = (node) => { const u = node && node.closest && node.closest("[data-unit]"); return u ? Number(u.dataset.unit) : -1; };

// The camera of the build: world millimetres to drawing units, the view vector, light bands, element factory.
export function projector(F) {
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
  return { NS, TAU, iso, VW, dotV, toneOf, f1, el, EDGES, light: [lx, ly, lz] };
}

// Rotating parts (data from the build): each has draw(theta) and a lazily measured box. A blade is three faces and an
// outline (the faces are opaque and seamless, so no silhouette fill under them); a blade wholly outside the window its
// rotor is seen through is not drawn.
export function makeRotors(svg, F) {
  const { TAU, iso, dotV, toneOf, f1, el, EDGES, light: [lx, ly, lz] } = projector(F);
  return (F.rotors || []).map((R) => {
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
      const faces = [];
      for (let fi = 0; fi < 6; fi++) {
        if (!seen[fi]) continue;
        const f = FACE[fi];
        const d = `M${p(f[0])}L${p(f[1])}L${p(f[2])}L${p(f[3])}Z`;
        const n = normals[fi];
        faces.push([d, toneOf(n[0] * lx + n[1] * ly + n[2] * lz)]);
      }
      while (faces.length < 3) faces.push(["", -1]);
      let edge = "";
      for (const [i, j, fa, fb] of EDGES) if (seen[fa] !== seen[fb]) edge += `M${p(i)}L${p(j)}`;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of flat) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      shape = { faces, edge, back: dotV(er) < 0, depth: dotV(ctr), box: [x0, y0, x1, y1] };
      cache.set(key, shape);
      return shape;
    }
    const axisDepth = dotV(R.a);
    // The window: the box of the nearest clip round the rotor, in drawing units.
    const clipHost = root.closest("[clip-path]");
    const clipId = clipHost && (clipHost.getAttribute("clip-path").match(/#([^)]+)/) || [])[1];
    const clipShape = clipId && svg.querySelector(`[id="${clipId}"] path`);
    const win = clipShape ? (({ x, y, width, height }) => [x - 1, y - 1, x + width + 1, y + height + 1])(clipShape.getBBox()) : null;
    const TONES = [0, 1, 2, 3].map((t) => `var(--anatomy-shade-${t})`).concat("var(--anatomy-top)");
    const blades = R.blades.map((B) => ({ ...B, dx: B.s * step[0], dy: B.s * step[1], sh: null, depth: 0 }));
    // Slots: fixed blade drawings in painter's order in each half (behind and in front of the shaft), added as needed.
    // A redraw writes the sorted blades' shapes into them, so no node is ever moved (a moved node had its style and
    // layout rebuilt), and a face's tone is a variable on it rather than a class (a class change restyles by rule).
    const EMPTY = { faces: [["", -1], ["", -1], ["", -1]], edge: "" };
    const slots = { back: [], front: [] };
    function slot(name, j) {
      const list = slots[name];
      while (list.length <= j) {
        const node = el("g", { class: "iso-solid" }, layers[name]);
        const faces = [0, 1, 2].map(() => el("path", { class: "iso-shade ln-bf" }, node));
        const edge = el("path", { class: "iso-line iso-edge", "data-tone": "hi" }, node);
        list.push({ node, faces, edge, sh: EMPTY, dx: NaN, dy: NaN, tones: [-1, -1, -1] });
      }
      return list[j];
    }
    function put(sl, sh, dx, dy) {
      if (sh !== EMPTY && (sl.dx !== dx || sl.dy !== dy)) { sl.dx = dx; sl.dy = dy; sl.node.setAttribute("transform", `translate(${f1(dx)} ${f1(dy)})`); }
      const prev = sl.sh;
      if (prev === sh) return;
      sl.sh = sh;
      for (let k = 0; k < 3; k++) {
        const [d, tone] = sh.faces[k];
        if (prev.faces[k][0] !== d) sl.faces[k].setAttribute("d", d);
        if (tone >= 0 && sl.tones[k] !== tone) { sl.tones[k] = tone; sl.faces[k].style.setProperty("--t", TONES[tone]); }
      }
      if (prev.edge !== sh.edge) sl.edge.setAttribute("d", sh.edge);
    }
    const flights = R.flight ? [...root.querySelectorAll("[data-flight]")] : [];
    let box = null;
    const halves = { back: [], front: [] };
    function draw(theta) {
      halves.back.length = 0; halves.front.length = 0;
      for (const b of blades) {
        let key = Math.round(((b.phase + theta) / TAU) * STEPS) % STEPS;
        if (key < 0) key += STEPS;
        const sh = shapeAt(b.type || 0, key);
        if (win) {
          const [x0, y0, x1, y1] = sh.box;
          if (x1 + b.dx < win[0] || x0 + b.dx > win[2] || y1 + b.dy < win[1] || y0 + b.dy > win[3]) continue;
        }
        b.sh = sh;
        b.depth = b.s * axisDepth + sh.depth;
        halves[sh.back ? "back" : "front"].push(b);
      }
      for (const name of ["back", "front"]) {
        const list = halves[name].sort((a, c) => a.depth - c.depth), have = slots[name];
        const n = Math.max(list.length, have.length);
        for (let j = 0; j < n; j++) {
          if (j < list.length) put(slot(name, j), list[j].sh, list[j].dx, list[j].dy);
          else put(have[j], EMPTY);
        }
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
}

// Sliding groups (slats, belts, bales, bags): move(dt) shifts them along their direction by their speed.
export function makeSlides(svg, F) {
  const { f1 } = projector(F);
  return (F.slides || []).map((spec) => {
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

}

// Material: dots along polylines; the caller sets how often they move.
export function makeFlows(svg, F) {
  const { iso, f1, el } = projector(F);
  return (F.flows || []).map((spec) => {
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
    function move(dt) {
      for (const p of dots) {
        p.u = (p.u + (dt * spec.speed) / total) % 1;
        const w = at(p.u);
        const q = iso(w[0] + p.j[0] * spec.spread, w[1] + p.j[1] * spec.spread, w[2]);
        p.node.setAttribute("cx", f1(q[0]));
        p.node.setAttribute("cy", f1(q[1]));
      }
    }
    // The trail's box in drawing units, for culling on a close view.
    const pad = spec.spread * Math.abs(iso(1, 0, 0)[0] - iso(0, 0, 0)[0]) * 1.5 + spec.size * 2;
    const flat = pts.map((p) => iso(...p));
    const xs = flat.map((q) => q[0]), ys = flat.map((q) => q[1]);
    const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
    return { move, unit: unitIndex(host), box };
  }).filter(Boolean);

}

// Flow marks in the pipes and the heater and melt glow follow variables written on the few elements that use them
// (a variable on the root restyles the whole layer). marks(dt, flow) advances them; flow is 0 (stopped) … 1.
export function makeMarks(svg) {
  let ft = 0, fa = 0, glowT = 0;
  function marks(dt, flow) {
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
  return marks;
}

// The drawing has thousands of paths; if anything in it moves, the browser re-rasters all of it every frame. So it is
// split into two stacked SVGs: the base keeps everything that stands still (the moving parts hidden) and is rastered
// once per camera move; a live copy on top keeps only the moving parts and the still parts painted after them that
// overlap them on screen, so the painter's order holds. The live copy takes no pointer events.
export function splitLayers(base, F) {
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

