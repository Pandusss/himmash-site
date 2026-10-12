// Live behaviour of the flotation machine figure. Shredded flakes and dirt fall from the feed chute into the
// bath. Two longitudinal shafts turn their pitched paddles: they stir the mix, knock the dirt off and push the
// floating polyolefin flakes along the surface to the outlet weir. Sand, stones and other particles heavier than
// water sink into the V bottom; when the layer builds up, the sludge valve lets it out into the bin.
// The paddles turn in 3D, so they are projected here from the camera numbers the build writes into the data.
const NS = "http://www.w3.org/2000/svg";
const BANDS = [0, 0.2, 0.42, 0.62];
const TURN = 0.3;          // shaft speed shown, rev/s
const FLOW = 430;          // surface travel at full speed, mm/s (figure time)
const SINK = 260;          // settling speed of heavy particles, mm/s (figure time)
const FEED = 4.2;          // flakes per second at the rated 500 kg/h
const GRIT = 2.2;          // heavy particles per second
const BED_MAX = 80;        // sediment depth (mm above the apex) that counts as 100 %
const PER_GRIT = 0.9;       // sediment growth per particle, mm (accelerated)
const DRAIN = 16;          // mm of sediment let out per second while the valve is open
const MAX_FLAKES = 90;
const MAX_GRIT = 40;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const layer = (name) => svg.querySelector(`[data-layer="${name}"]`);
  const layers = { back0: layer("back0"), mid: layer("mid"), front1: layer("front1"), over: layer("over") };
  const shaftGroups = [...svg.querySelectorAll("[data-shaft]")];
  const valve = svg.querySelector("[data-valve]");
  const number = (v) => String(Math.round(v));

  // ---------- camera
  const C = F.cam, B = F.bath, Lt = F.light;
  const V = [C.cosA * C.cosE, C.sinA * C.cosE, C.sinE];
  const sx = (p) => C.ox + (p[0] * C.sinA - p[1] * C.cosA) * C.k;
  const sy = (p) => C.oy + ((p[0] * C.cosA + p[1] * C.sinA) * C.sinE - p[2] * C.cosE) * C.k;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const poly = (pts) => (pts.length ? "M" + pts.map((p) => f1(sx(p)) + " " + f1(sy(p))).join("L") + "Z" : "");
  const polyFlat = (pts) => (pts.length ? "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + "Z" : "");
  const band = (n) => {
    const score = dot(n, Lt);
    let tone = 0;
    while (tone < BANDS.length && score >= BANDS[tone]) tone++;
    return tone;
  };
  function hull(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  // Clip a 3D polygon to one side of the water plane (side +1 keeps z >= W, -1 keeps z <= W).
  function clip(points, side) {
    const out = [];
    const W = B.water;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const ia = (a[2] - W) * side >= 0, ib = (b[2] - W) * side >= 0;
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (W - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, W]);
      }
    }
    return out;
  }

  // ---------- paddles: a root block and a pitched blade on each, both drawn as solids
  // Each paddle part is one path: its silhouette, filled with the tone of the face that shows most, and outlined.
  function solidNode() {
    const g = document.createElementNS(NS, "path");
    g.setAttribute("class", "fm-pad");
    return { g, d: "", tone: -1, key: 0, home: null, empty: false };
  }
  function writeSolid(node, d, tone) {
    if (node.d !== d) { node.d = d; node.g.setAttribute("d", d); }
    if (tone >= 0 && node.tone !== tone) { node.tone = tone; node.g.setAttribute("data-shade", tone); }
  }
  const area = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a);
  };

  const twist = (F.paddle.twist * Math.PI) / 180;
  const shafts = F.shafts.y.map((y, s) => ({ y, s, dir: s === 0 ? -1 : 1, angle: s === 0 ? 0.4 : 1.1 }));
  const parts = [];
  shafts.forEach((shaft) => {
    for (let i = 0; i < F.shafts.count; i++) {
      const x = F.shafts.first + i * F.shafts.pitch;
      const step = -shaft.dir * (Math.PI / 2);
      ["root", "blade"].forEach((kind) => {
        const dims = F.paddle[kind];
        const part = { shaft, x, step: i * step, dims, kind, under: solidNode(), over: kind === "blade" ? solidNode() : null };
        parts.push(part);
      });
    }
  });

  // The 8 corners of one paddle part at its shaft's angle, written into the part's own arrays.
  const QUADS = [[4, 5, 6, 7], [0, 3, 2, 1], [1, 2, 6, 5], [0, 4, 7, 3], [3, 7, 6, 2], [0, 1, 5, 4]];
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cosT = Math.cos(twist), sinT = Math.sin(twist);
  parts.forEach((part) => { part.v = Array.from({ length: 8 }, () => [0, 0, 0]); part.p = Array.from({ length: 8 }, () => [0, 0]); part.n = Array.from({ length: 6 }, () => [0, 0, 0]); });
  function corners(part) {
    const th = part.shaft.angle + part.step;
    const c = Math.cos(th), s = Math.sin(th);
    const dir = part.shaft.dir;
    // r = (0, c, s), t = (0, -s, c), w = cos·x − sin·dir·t, n = r × w
    const w0 = cosT, w1 = sinT * dir * s, w2 = -sinT * dir * c;
    const n0 = c * w2 - s * w1, n1 = s * w0, n2 = -c * w0;
    const [r0, r1, width, thick] = part.dims;
    const hw = width / 2, ht = thick / 2;
    const ox = part.x, oy = part.shaft.y, oz = F.shafts.z;
    let i = 0;
    for (const rr of [r0, r1]) {
      for (const [a, b] of [[-hw, -ht], [hw, -ht], [hw, ht], [-hw, ht]]) {
        const q = part.v[i];
        q[0] = ox + w0 * a + n0 * b;
        q[1] = oy + c * rr + w1 * a + n1 * b;
        q[2] = oz + s * rr + w2 * a + n2 * b;
        const sp = part.p[i];
        sp[0] = sx(q); sp[1] = sy(q);
        i++;
      }
    }
    const N = part.n;
    N[0][0] = 0; N[0][1] = c; N[0][2] = s;
    N[1][0] = 0; N[1][1] = -c; N[1][2] = -s;
    N[2][0] = w0; N[2][1] = w1; N[2][2] = w2;
    N[3][0] = -w0; N[3][1] = -w1; N[3][2] = -w2;
    N[4][0] = n0; N[4][1] = n1; N[4][2] = n2;
    N[5][0] = -n0; N[5][1] = -n1; N[5][2] = -n2;
    return c * V[1] + s * V[2];
  }
  function drawPart(part) {
    const facing = corners(part);
    const v = part.v, p = part.p, W = B.water;
    let lo = Infinity, hi = -Infinity;
    for (const q of v) { if (q[2] < lo) lo = q[2]; if (q[2] > hi) hi = q[2]; }
    const sides = part.over ? [-1, 1] : [-1];
    for (const side of sides) {
      const node = side < 0 ? part.under : part.over;
      const empty = side < 0 ? lo >= W : hi <= W;
      if (empty) { if (!node.empty) { writeSolid(node, "", -1); node.empty = true; } continue; }
      node.empty = false;
      const whole = side < 0 ? hi <= W : lo >= W;
      const out = [];
      let flat, cx = 0, cy = 0, cz = 0;
      if (whole) {
        for (let f = 0; f < 6; f++) if (dot(part.n[f], V) > 1e-6) out.push({ a: area(QUADS[f].map((i) => p[i])), tone: band(part.n[f]) });
        flat = hull(p);
        for (const q of v) { cx += q[0]; cy += q[1]; cz += q[2]; }
        cx /= 8; cy /= 8; cz /= 8;
      } else {
        const pts = v.filter((q) => (q[2] - W) * side >= 0);
        for (const [a, b] of EDGES) {
          const za = v[a][2] - W, zb = v[b][2] - W;
          if ((za < 0) !== (zb < 0)) {
            const t = za / (za - zb);
            pts.push([v[a][0] + (v[b][0] - v[a][0]) * t, v[a][1] + (v[b][1] - v[a][1]) * t, W]);
          }
        }
        for (let f = 0; f < 6; f++) {
          if (dot(part.n[f], V) <= 1e-6) continue;
          const q = clip(QUADS[f].map((i) => v[i]), side);
          if (q.length >= 3) out.push({ a: area(q.map((r) => [sx(r), sy(r)])), tone: band(part.n[f]) });
        }
        flat = hull(pts.map((q) => [sx(q), sy(q)]));
        for (const q of pts) { cx += q[0]; cy += q[1]; cz += q[2]; }
        cx /= pts.length; cy /= pts.length; cz /= pts.length;
      }
      let best = out[0];
      for (const face of out) if (face.a > best.a) best = face;
      writeSolid(node, polyFlat(flat) + (part.kind === "blade" ? bolts(part, side, whole) : ""), best ? best.tone : 3);
      node.key = cx * V[0] + cy * V[1] + cz * V[2];
      node.home = side > 0 ? "over" : part.shaft.s === 0 ? (facing < 0 ? "back0" : "mid") : facing < 0 ? "mid" : "front1";
    }
  }
  // Two bolt heads near the root of each blade, on the face turned to the viewer: rings drawn by the blade's own stroke.
  function bolts(part, side, whole) {
    const n = part.n[4];
    const facing = dot(n, V);
    if (Math.abs(facing) < 0.3) return "";
    const v = part.v, sign = facing > 0 ? 1 : -1;
    let out = "";
    for (const [i0, i1] of [[0, 3], [1, 2]]) {
      // corners at the root: i0 = (−hw, −ht) / (hw, −ht), i1 = (−hw, ht) / (hw, ht); take the visible face and pull in.
      const a = sign > 0 ? v[i1] : v[i0];
      const b = sign > 0 ? v[i1 + 4] : v[i0 + 4];
      const p = [a[0] + (b[0] - a[0]) * 0.22, a[1] + (b[1] - a[1]) * 0.22, a[2] + (b[2] - a[2]) * 0.22];
      const q = sign > 0 ? v[i1 === 3 ? 2 : 3] : v[i0 === 0 ? 1 : 0];
      const c = [p[0] + (q[0] - a[0]) * 0.28, p[1] + (q[1] - a[1]) * 0.28, p[2] + (q[2] - a[2]) * 0.28];
      if (!whole && (c[2] - B.water) * side < 0) continue;
      const x = sx(c), y = sy(c), r = 0.55;
      out += `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    }
    return out;
  }
  const nodes = [];
  parts.forEach((part) => { nodes.push(part.under); if (part.over) nodes.push(part.over); });
  const orders = { back0: [], mid: [], front1: [], over: [] };
  function sortLayers() {
    const lists = { back0: [], mid: [], front1: [], over: [] };
    for (const node of nodes) if (node.home) lists[node.home].push(node);
    for (const name in lists) {
      const list = lists[name].sort((a, b) => a.key - b.key);
      const prev = orders[name];
      let same = prev.length === list.length;
      for (let i = 0; same && i < list.length; i++) if (prev[i] !== list[i]) same = false;
      if (!same) {
        const frag = document.createDocumentFragment();
        list.forEach((n) => frag.appendChild(n.g));
        layers[name].appendChild(frag);
        orders[name] = list;
      }
    }
  }

  // ---------- flakes, grit, sediment, bin
  const flakesPath = document.createElementNS(NS, "path"); flakesPath.setAttribute("class", "fm-flake"); layer("flakes").appendChild(flakesPath);
  const feedPath = document.createElementNS(NS, "path"); feedPath.setAttribute("class", "fm-flake"); layer("feed").appendChild(feedPath);
  const feedGrit = document.createElementNS(NS, "path"); feedGrit.setAttribute("class", "fm-grit"); layer("feed").appendChild(feedGrit);
  const chutePath = document.createElementNS(NS, "path"); chutePath.setAttribute("class", "fm-flake"); layer("chute").appendChild(chutePath);
  const gritPath = document.createElementNS(NS, "path"); gritPath.setAttribute("class", "fm-grit"); layer("grit").appendChild(gritPath);
  const siltPath = document.createElementNS(NS, "path"); siltPath.setAttribute("class", "fm-silt"); layer("silt").appendChild(siltPath);
  const binPath = document.createElementNS(NS, "path"); binPath.setAttribute("class", "fm-silt"); layer("bin").appendChild(binPath);
  const cache = { flakes: "", feed: "", feedGrit: "", chute: "", grit: "", silt: "", bin: "" };
  const put = (el, key, d) => { if (cache[key] !== d) { cache[key] = d; el.setAttribute("d", d); } };

  const cot = B.HW / (B.ZW - B.ZA);
  const fz = F.feed;
  const flakes = [], grit = [];
  function spawnFlake(x, y) {
    if (flakes.length >= MAX_FLAKES) return;
    const size = rand(28, 46);
    flakes.push({ x: x ?? rand(fz.x + 40, fz.x + 200), y: y ?? rand(-fz.half + 30, fz.half - 30), z: x === undefined && !still.matches ? B.water + rand(60, 140) : B.water, lane: rand(-B.HW + 70, B.HW - 70), turn: rand(0, 6.28), spin: rand(-0.6, 0.6), size, shape: [1, rand(0.55, 0.9), rand(0.8, 1.1), rand(0.5, 0.85)], state: "surface", wob: rand(0, 6.28) });
  }
  function spawnGrit(x, y, z) {
    if (grit.length >= MAX_GRIT) return;
    grit.push({ x: x ?? rand(fz.x + 30, fz.x + 220), y: y ?? rand(-fz.half + 30, fz.half - 30), z: z ?? (still.matches ? B.water - rand(80, 500) : B.water + rand(40, 140)), vz: 0, size: rand(18, 28), drift: rand(0.02, 0.08) });
  }

  // ---------- state
  let clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let running = true, speed = 1, bed = 0.42 * BED_MAX, draining = false, binFill = 0.25;
  let feedDebt = 0, gritDebt = 0;
  const L = B.L;

  // Pre-fill the bath so the first frame already shows the process.
  for (let i = 0; i < 46; i++) spawnFlake(rand(fz.x + 100, L - 80), rand(-B.HW + 60, B.HW - 60));
  for (let i = 0; i < 12; i++) spawnGrit(rand(fz.x + 50, 2600), rand(-300, 300), rand(B.ZA + 200, B.water - 40));

  function say(text) { if (readout && readout.textContent !== text) readout.textContent = text; }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  function step(dt) {
    clock += dt;
    const target = running ? 1 : 0;
    speed = still.matches ? target : speed + (target - speed) * (1 - Math.exp(-dt / 0.6));
    if (Math.abs(speed - target) < 0.002) speed = target;
    shafts.forEach((sh) => { sh.angle += sh.dir * speed * TURN * 2 * Math.PI * dt; });
    // Feed, interlocked with the shafts: the rated 500 kg/h arrives as a steady stream of flakes and dirt.
    if (running) { feedDebt += FEED * dt; gritDebt += GRIT * dt; }
    while (feedDebt >= 1) { feedDebt -= 1; spawnFlake(); }
    while (gritDebt >= 1) { gritDebt -= 1; spawnGrit(); }
    const v = FLOW * speed;
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.turn += f.spin * dt * (0.3 + speed);
      if (f.state === "surface") {
        if (f.z > B.water) { f.z = Math.max(B.water, f.z - 900 * dt); continue; }
        f.wob += dt * 2.2;
        const near = f.x > L - 750;
        const goal = near ? clamp(f.lane, -B.notch + 40, B.notch - 40) : f.lane;
        f.y += (goal - f.y) * (1 - Math.exp(-dt * (near ? 1.6 : 0.5) * (0.2 + speed))) + Math.sin(f.wob) * 18 * speed * dt;
        f.x += v * dt * (0.85 + 0.3 * Math.sin(f.wob * 0.7));
        if (f.x >= L - 10) {
          if (Math.abs(f.y) < B.notch - 20) { f.state = "chute"; f.x = F.chute.x0 - 10; }
          else f.x = L - 10;
        }
      } else {
        f.x += (v * 0.6 + 380) * dt;
        f.y *= 1 - dt * 0.5;
        if (f.x > F.chute.x1 - 20) flakes.splice(i, 1);
      }
    }
    for (let i = grit.length - 1; i >= 0; i--) {
      const g = grit[i];
      if (g.z > B.water) { g.z -= 900 * dt; continue; }
      g.z -= SINK * dt;
      g.x += v * g.drift * dt;
      const floor = B.ZA + bed;
      const reach = clamp((B.water - g.z) / (B.water - floor), 0, 1);
      g.y *= 1 - dt * 0.9 * reach;
      if (g.z <= floor + Math.abs(g.y) / cot) {
        grit.splice(i, 1);
        if (!draining) bed = Math.min(BED_MAX * 1.02, bed + PER_GRIT);
      }
    }
    if (draining) {
      const out = Math.min(bed, DRAIN * dt);
      bed -= out;
      binFill = Math.min(1, binFill + out / 260);
      if (bed <= 2) { bed = 2; draining = false; announce(T.closed); }
    } else if (bed >= BED_MAX) {
      openValve();
    }
    if (binFill >= 0.98 && !draining) binFill = 0.2;   // the full bin is swapped for an empty one
  }

  function openValve() {
    if (draining || bed < 8) return false;
    draining = true;
    announce(T.opened);
    if (still.matches) { binFill = Math.min(1, binFill + bed / 260); bed = 2; draining = false; }
    return true;
  }
  function toggleShafts() {
    running = !running;
    announce(running ? T.started : T.stopped);
  }
  // Shafts stopped by the reader start again by themselves 6 s after the reader's last input (wall clock, so it also
  // works with reduced motion, where there is no animation loop and the readout is redrawn by a timer instead).
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
    if (!running) { running = true; announce(T.started); }
    run(); draw();
  }
  const countdown = () => (restartAt ? " · " + T.restart.replace("{s}", Math.max(1, Math.ceil((restartAt - performance.now()) / 1000))) : "");
  function drop() {
    for (let i = 0; i < 18; i++) spawnFlake();
    for (let i = 0; i < 8; i++) spawnGrit();
    announce(T.portion);
  }

  function flakeShape(f, z) {
    const pts = [];
    for (let j = 0; j < 4; j++) {
      const a = f.turn + (j * Math.PI) / 2;
      const r = f.size * f.shape[j];
      pts.push([f.x + r * Math.cos(a), f.y + r * Math.sin(a), z]);
    }
    return poly(pts);
  }
  // The paddles are re-projected on alternate frames, half of them each frame, and not at all once the shafts rest.
  let tickNo = 0, drawnAt = "";
  function draw(all) {
    const pose = shafts.map((sh) => sh.angle.toFixed(4)).join();
    if (pose !== drawnAt) {
      tickNo++;
      const every = all || still.matches || speed < 0.05;
      parts.forEach((part, i) => { if (every || (i + tickNo) % 2 === 0) drawPart(part); });
      sortLayers();
      drawnAt = every ? pose : "";
    }
    let surf = "", fall = "", chute = "", g = "", gf = "";
    for (const f of flakes) {
      if (f.state === "chute") {
        const z = F.chute.z0 - (f.x - F.chute.x0) * F.chute.drop + 8;
        chute += flakeShape(f, z);
      } else if (f.z > B.water) fall += flakeShape(f, f.z);
      else surf += flakeShape(f, B.water);
    }
    for (const p of grit) {
      const h = p.size;
      const d = poly([[p.x - h, p.y, p.z], [p.x, p.y - h, p.z + h * 0.4], [p.x + h, p.y, p.z], [p.x, p.y + h, p.z - h * 0.4]]);
      if (p.z > B.water) gf += d; else g += d;
    }
    put(flakesPath, "flakes", surf);
    put(feedPath, "feed", fall);
    put(chutePath, "chute", chute);
    put(gritPath, "grit", g);
    put(feedGrit, "feedGrit", gf);
    const h = Math.max(0, bed);
    const half = h * cot;
    const zt = B.ZA + h;
    put(siltPath, "silt", h > 1 ? poly([[B.T, -half, zt], [L, -half, zt], [L, half, zt], [B.T, half, zt]]) : "");
    const bz = F.bin.z0 + (F.bin.z1 - F.bin.z0) * binFill;
    put(binPath, "bin", poly([[F.bin.x0, F.bin.y0, bz], [F.bin.x1, F.bin.y0, bz], [F.bin.x1, F.bin.y1, bz], [F.bin.x0, F.bin.y1, bz]]));
    const lit = draining ? "valve" : "paddles";
    for (const name of ["back0", "mid", "front1", "over"]) layers[name].toggleAttribute("data-on", lit === "paddles");
    shaftGroups.forEach((group) => group.toggleAttribute("data-on", lit === "paddles"));
    if (valve) valve.toggleAttribute("data-on", lit === "valve");
    const pct = number((100 * Math.max(0, bed - 2)) / (BED_MAX - 2));
    if (draining) say(T.drain.replace("{p}", pct) + countdown());
    else if (!running) say(T.idleStop.replace("{p}", pct) + countdown());
    else say(T.run.replace("{q}", number(F.rate)).replace("{p}", pct));
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
    const target = event.target.closest ? event.target : null;
    if (!target) return;
    if (target.closest("[data-valve]")) { openValve(); holdOff(); run(); draw(); }
    else if (target.closest("[data-shaft]") || target.closest('[data-layer="over"],[data-layer="mid"],[data-layer="front1"],[data-layer="back0"]')) { toggleShafts(); holdOff(); run(); draw(); }
  });
  stage.addEventListener("keydown", (event) => {
    let act = null;
    if (event.key === "1") act = drop;
    if (event.key === "2") act = toggleShafts;
    if (event.key === " " || event.key === "Enter") act = openValve;
    if (!act) return;
    event.preventDefault();
    act(); holdOff(); run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  step(0);
  draw(true);
}
