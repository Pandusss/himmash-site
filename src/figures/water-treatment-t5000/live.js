// Live behaviour of the T-5000 figure. Wastewater from the washing line flows through five stages in series:
// the step screen lifts coarse debris out of the intake tank, the electrode pack in the flotation tank releases
// fine gas bubbles that float oil and flocs up as froth, the scraper pushes the froth into the trough and on to the
// sludge tote, the filters and the treatment cell polish the water, and the clean tank sends it back to the line
// or to the sewer. The dashes in the pipes run with the flow and get clearer stage by stage.
// The idle tour lights the stages in turn; keys 1–5, the arrows or a click pick one.
const NS = "http://www.w3.org/2000/svg";
const STAGE_FOR = 3.4;     // s per stage in the tour
const RESUME = 8000;       // ms of quiet after the reader's last input before the tour resumes (wall clock)
const DASH = 26;           // flow dash speed, px/s
const BUBBLES = 46;
const FROTH = 34;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mount(stage, { text: T, data: F }) {
  const svg = stage.querySelector("svg");
  if (T.label) svg.setAttribute("aria-label", T.label);
  const plate = stage.closest(".iso-plate, .anatomy-plate") || stage.parentElement;
  const readout = plate.querySelector("[data-readout]");
  const live = stage.querySelector(".anatomy-live");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const layer = (name) => svg.querySelector(`[data-layer="${name}"]`);
  const groups = [1, 2, 3, 4, 5].map((n) => [...svg.querySelectorAll(`[data-stage="${n}"]`)]);
  const flows = [...svg.querySelectorAll("[data-flow]")];

  // ---------- camera
  const C = F.cam;
  const sx = (x, y) => C.ox + (x * C.sinA - y * C.cosA) * C.k;
  const sy = (x, y, z) => C.oy + ((x * C.cosA + y * C.sinA) * C.sinE - z * C.cosE) * C.k;
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const pt = (p) => f1(sx(p[0], p[1])) + " " + f1(sy(p[0], p[1], p[2]));
  const poly = (pts) => "M" + pts.map(pt).join("L") + "Z";
  const line = (a, b) => "M" + pt(a) + "L" + pt(b);
  const circle = (p, r) => {
    const x = sx(p[0], p[1]), y = sy(p[0], p[1], p[2]);
    return `M${f1(x - r)} ${f1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  };
  const make = (name, cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); layer(name).appendChild(p); return p; };
  const cache = new Map();
  const put = (el, d) => { if (cache.get(el) !== d) { cache.set(el, d); el.setAttribute("d", d); } };

  const stepsPath = make("steps", "wt-step");
  const dropPath = make("drop", "wt-debris");
  const binPath = make("debris-bin", "wt-debris");
  const bubblePath = make("bubbles", "wt-bubble");
  const frothPath = make("froth", "wt-froth");
  const totePath = make("tote", "wt-sludge");
  totePath.setAttribute("opacity", "0.6");
  const flightEls = [0, 1, 2].map(() => {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "iso-solid");
    const mk = (cls, extra) => { const p = document.createElementNS(NS, "path"); p.setAttribute("class", cls); if (extra) for (const [k2, v] of Object.entries(extra)) p.setAttribute(k2, v); g.appendChild(p); return p; };
    const parts = { fill: mk("iso-fill"), side: mk("iso-shade", { "data-shade": "2" }), end: mk("iso-shade", { "data-shade": "1" }), top: mk("iso-top"), edge: mk("iso-line iso-edge", { "data-tone": "mid" }) };
    layer("flights").appendChild(g);
    return { g, parts };
  });

  // ---------- model
  const S = F.screen;
  const len = Math.hypot(S.bottom[0] - S.top[0], S.top[1] - S.bottom[1]);
  const ux = (S.top[0] - S.bottom[0]) / len, uz = (S.top[1] - S.bottom[1]) / len;
  const nx = uz, nz = -ux;
  const T2 = F.t2;
  const bubbles = Array.from({ length: BUBBLES }, () => ({ x: rand(T2.plates[0], T2.plates[1]), y: rand(T2.plateY[0], T2.plateY[1]), z: rand(T2.plateTop, T2.water), r: rand(0.5, 1), w: rand(0, 6.28) }));
  const froth = Array.from({ length: FROTH }, () => ({ x: rand(T2.plates[0] - 100, T2.x1 - 40), y: rand(T2.y0 + 40, T2.y1 - 40), s: rand(40, 90), a: rand(0, 6.28) }));
  const debris = [];
  let clock = 0, last = 0, frame = 0, visible = false, phrase = "";
  let selected = 0, touring = !still.matches, quietSince = -1, tourAt = 0, overview = false;
  let tote = 0.35, binLevel = 0.3, dropTimer = 0, offset = 0;

  function say(text) { if (readout && readout.textContent !== text) readout.textContent = text; }
  function announce(text) { if (live && phrase !== text) { phrase = text; live.textContent = text; } }

  function select(n, byUser) {
    selected = n;
    groups.forEach((list, i) => list.forEach((g) => g.toggleAttribute("data-on", i + 1 === n)));
    svg.toggleAttribute("data-focus", !!n);   // isolate the stage; 0 is the whole system
    if (byUser) { overview = !n; touring = false; quietSince = performance.now(); announce(n ? T.stages[n - 1] : T.summary); }
  }

  function step(dt) {
    clock += dt;
    if (!touring && quietSince >= 0 && performance.now() - quietSince > RESUME && !still.matches) { touring = true; tourAt = clock; }
    if (touring && !overview) {
      const n = Math.floor((clock - tourAt) / STAGE_FOR) % 6;
      const want = n;   // the whole system first, then stages 1–5
      if (want !== selected) select(want, false);
    }
    offset = (offset + DASH * dt) % 1000;
    // Bubbles rise from the plates to the surface; froth drifts to the trough under the scraper.
    for (const b of bubbles) {
      b.z += (260 + 90 * b.r) * dt;
      b.w += dt * 3;
      if (b.z >= T2.water) { b.z = T2.plateTop + rand(0, 60); b.x = rand(T2.plates[0], T2.plates[1]); b.y = rand(T2.plateY[0], T2.plateY[1]); }
    }
    for (const f of froth) {
      f.x += (80 + (f.x > T2.plates[1] ? 70 : 0)) * dt;
      f.a += dt * 0.4;
      if (f.x > T2.x1 - 30) { f.x = rand(T2.plates[0] - 80, T2.plates[0] + 300); f.y = rand(T2.y0 + 40, T2.y1 - 40); tote = Math.min(1, tote + 0.004); }
    }
    if (tote >= 1) tote = 0.12;   // the full tote goes for dewatering and a fresh one is set
    // Debris lifted by the screen falls from the head into the bin.
    dropTimer -= dt;
    if (dropTimer <= 0) {
      dropTimer = rand(0.5, 1.3);
      debris.push({ x: rand(F.dropX[0], F.dropX[1]), y: rand(S.y0 + 70, S.y1 - 70), z: S.top[1] - 60, v: 0, s: rand(30, 55) });
    }
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.v += 9800 * dt * 0.35;
      d.z -= d.v * dt;
      if (d.z < F.bin.z - 40) { debris.splice(i, 1); binLevel = Math.min(1, binLevel + 0.01); if (binLevel >= 1) binLevel = 0.2; }
    }
  }

  function flight(x) {
    const y0 = T2.y0 + 10, y1 = T2.y1 - 10, z0 = T2.water + 4, z1 = z0 + 40, w = 18;
    const a = x - w, b = x + w;
    const top = [[a, y0, z1], [b, y0, z1], [b, y1, z1], [a, y1, z1]];
    const side = [[b, y0, z0], [b, y1, z0], [b, y1, z1], [b, y0, z1]];
    const end = [[a, y1, z0], [b, y1, z0], [b, y1, z1], [a, y1, z1]];
    const hull = [[a, y0, z1], [b, y0, z1], [b, y0, z0], [b, y1, z0], [a, y1, z0], [a, y1, z1]];
    return { top: poly(top), side: poly(side), end: poly(end), hull: poly(hull) };
  }

  function draw() {
    flows.forEach((p) => { p.style.strokeDashoffset = still.matches ? "" : (-offset).toFixed(1); });
    // Lamella steps of the screen: lines across the bed moving up.
    let d = "";
    const gap = 150;
    for (let s = (clock * 120) % gap; s < len - 40; s += gap) {
      const x = S.bottom[0] + ux * s + nx * 42, z = S.bottom[1] + uz * s + nz * 42;
      d += line([x, S.y0, z], [x, S.y1, z]);
    }
    put(stepsPath, d);
    d = "";
    for (const p of debris) d += poly([[p.x - p.s, p.y, p.z], [p.x, p.y - p.s, p.z + p.s * 0.6], [p.x + p.s, p.y, p.z], [p.x, p.y + p.s, p.z - p.s * 0.5]]);
    put(dropPath, d);
    const bz = F.bin.z - 420 + 360 * binLevel;
    put(binPath, poly([[F.bin.x0, F.bin.y0, bz], [F.bin.x1, F.bin.y0, bz], [F.bin.x1, F.bin.y1, bz], [F.bin.x0, F.bin.y1, bz]]));
    d = "";
    for (const b of bubbles) d += circle([b.x + Math.sin(b.w) * 12, b.y, b.z], b.r);
    put(bubblePath, d);
    d = "";
    for (const f of froth) {
      const pts = [];
      for (let j = 0; j < 6; j++) {
        const a = f.a + (j * Math.PI) / 3;
        const r = f.s * (j % 2 ? 0.7 : 1);
        pts.push([f.x + r * Math.cos(a), f.y + r * Math.sin(a), T2.water]);
      }
      d += poly(pts);
    }
    put(frothPath, d);
    const span = T2.x1 - T2.plates[0] + 200;
    flightEls.forEach((el, i) => {
      const x = T2.x0 + 120 + (((clock * 140) + (i * span) / 3) % span);
      const fade = clamp((x - T2.x0 - 80) / 160, 0, 1) * clamp((T2.x1 - x) / 160, 0, 1);
      const f = flight(Math.min(x, T2.x1 - 20));
      put(el.parts.fill, f.hull); put(el.parts.edge, f.hull); put(el.parts.top, f.top); put(el.parts.side, f.side); put(el.parts.end, f.end);
      const op = fade.toFixed(2);
      if (el.g.getAttribute("opacity") !== op) el.g.setAttribute("opacity", op);
    });
    const t = F.tote, level = t.z0 + 30 + (t.h - 80) * tote;
    put(totePath, poly([[t.x, t.y + t.d, t.z0 + 30], [t.x + t.w, t.y + t.d, t.z0 + 30], [t.x + t.w, t.y + t.d, level], [t.x, t.y + t.d, level]]) + poly([[t.x + t.w, t.y + t.d, t.z0 + 30], [t.x + t.w, t.y, t.z0 + 30], [t.x + t.w, t.y, level], [t.x + t.w, t.y + t.d, level]]));
    say(selected ? T.stages[selected - 1] : T.summary);
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
    const node = event.target.closest && event.target.closest("[data-stage]");
    if (!node) return;
    const n = Number(node.dataset.stage);
    select(selected === n ? 0 : n, true);
    run(); draw();
  });
  stage.addEventListener("keydown", (event) => {
    let n = -1;
    if (/^[1-5]$/.test(event.key)) n = Number(event.key);
    else if (event.key === "ArrowRight" || event.key === " " || event.key === "Enter") n = (selected % 5) + 1;
    else if (event.key === "ArrowLeft") n = selected <= 1 ? 5 : selected - 1;
    else if (event.key === "Escape" || event.key === "0") n = 0;
    if (n < 0) return;
    event.preventDefault();
    select(n, true);
    run(); draw();
  });
  stage.addEventListener("focus", () => announce(readout ? readout.textContent : ""));
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  select(0, false);
  step(0);
  draw();
}
