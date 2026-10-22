// The pelletizing row, right to left: storage hopper with its Ø400 screw doser (company sketch: 5 m long,
// 8–10 m³), side screw feeder, extruder Ø125–135 L/D 32–36 with seven heating zones and two vacuum vents (presentation),
// hydraulic slide-plate screen changer with four Ø200 screens, hot face cutter with three floating knives up to 300 rpm,
// pellet water separation and centrifugal dryer on their own water loop, pellet hopper, 600 kg big bag and the 25 kg
// bagging station with a scale and a sewing head, finished goods on pallets.
import { YE, ZE } from "./layout.mjs";
import { screwConveyor, beltConveyor } from "./units/conveyors.mjs";

const faceWindow = (L, y, x0, x1, z0, z1) => L.path3([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);

export function pelletizingRow(L) {
  const { box, cylX, cylY, cylZ, rod, prismX, prismY, frustum, hopper, motor, gearbox, leg, legs, brace, bolts, path3, S, G, P, depth, turned, rotor, clipped, flow, slide, pipe } = L;
  const units = [];
  const unit = (id, center, parts) => units.push({ id, items: [{ key: depth(center), svg: parts.join("") }] });
  const pipeSvg = (route, r, opts) => pipe(route, r, opts).filter((i) => i.svg).map((i) => i.svg).join("");
  const FX = 33100;            // feed throat
  const yb = 2550;             // storage hopper and doser axis

  // ---------- 14 Storage hopper: box on a braced frame, windows showing the flake level, V bottom, screw doser.
  {
    const p = [];
    const x = 34000, w = 5000, y0 = yb - 800, d = 1600, z0 = 2200, z1 = 3700, zd = 1750;
    const [far, near] = legs(x, y0, w, d, z0, { s: 120, inset: 80 });
    p.push(far, brace([x + 80, y0 + 80, 300], [x + w / 2, y0 + 80, z0 - 200], 70), brace([x + w - 80, y0 + 80, 300], [x + w / 2, y0 + 80, z0 - 200], 70));
    // Doser trough with a window on its near side, gear motor on the right, outlet chute at the left end.
    p.push(prismX(x, x + w, [[y0, z0], [y0 + d, z0], [yb + 260, zd + 200], [yb - 260, zd + 200]], "mid"));
    p.push(...screwConveyor(L, "doser", [x - 700, yb, zd], [x + w + 100, yb, zd], 200, { stands: [], inlet: false, speed: 0.5, pitch: 300, kind: "dry" }).slice(0, -1));
    p.push(frustum([x - 640, yb - 180, 360, 360], zd - 200, [FX - 160, yb + 300, 320, 320], 1520, "mid"));
    p.push(box(x, y0, w, d, z0, z1 - z0, "hi", { seams: [z0 + 120, z1 - 100], r: 20 }));
    // Panel joints and windows on the near face: the lower part of each window is filled with flakes.
    const fy = y0 + d;
    p.push(L.L([1, 2, 3, 4].map((i) => path3([[x + i * 1000, fy, z0], [x + i * 1000, fy, z1]], false)).join(""), { tone: "faint" }));
    for (const wx of [x + 300, x + 2200, x + 4100]) {
      const glass = faceWindow(L, fy, wx, wx + 600, z0 + 300, z1 - 300);
      p.push(`<path class="ln-glass" d="${glass}"/>`);
      p.push(`<path class="ln-fill" d="${faceWindow(L, fy, wx, wx + 600, z0 + 300, z0 + 300 + (z1 - z0 - 600) * 0.55)}"/>`);
      p.push(L.L(glass, { tone: "lo" }));
    }
    // Roof: rim, the inlet of the pneumatic line with its cyclone hat, a filter sock, a ladder on the right end.
    p.push(box(x - 30, y0 - 30, w + 60, d + 60, z1, 60, "mid", { bevel: 0.4 }));
    p.push(cylZ(38500, yb, z1 + 60, z1 + 200, 160, "mid"));
    p.push(cylZ(x + 700, yb, z1 + 60, z1 + 120, 170, "mid"), turned(x + 700, yb, z1 + 120, [[0, 150], [320, 150, 1], [400, 110, 1], [460, 0, 1]], "hi"));
    const lx = x + w + 60;
    p.push(...[yb - 250, yb + 250].map((ly) => box(lx, ly - 25, 50, 50, 0, z1 + 900, "mid", { bevel: 0.2, r: 4, steps: 2 })));
    p.push(...Array.from({ length: 12 }, (_, i) => box(lx, yb - 250, 50, 500, 300 + i * 300, 30, "lo", { bevel: 0.1, r: 3, steps: 2 })));
    p.push(near, brace([x + 80, fy - 80, 300], [x + w / 2, fy - 80, z0 - 200], 70), brace([x + w - 80, fy - 80, 300], [x + w / 2, fy - 80, z0 - 200], 70));
    unit("hopper", [x + w / 2, yb, 2400], p);
  }

  // ---------- 15 Side screw feeder: hopper, cylinder with a window on the flight, cone pressing into the feed block.
  {
    const p = [];
    const ya = 2350, yc = 2950, yd = YE - 150;
    p.push(box(FX - 300, ya - 400, 600, yd - ya + 300, 0, 120, "lo", { bevel: 0.3 }));
    for (const ly of [ya - 250, yc + 300]) p.push(leg(FX - 220, ly, 120, ZE - 300, 70), leg(FX + 220, ly, 120, ZE - 300, 70));
    p.push(box(FX - 300, ya - 400, 600, 500, ZE - 300, 80, "mid", { bevel: 0.3 }));
    p.push(gearbox(FX - 230, ya - 380, 460, 380, ZE - 220, 440));
    p.push(box(FX + 230, ya - 360, 160, 340, 220, ZE - 120, "hi", { bevel: 0.5, r: 30 }));
    p.push(motor([FX + 480, ya - 190, 300], [FX + 480, ya + 330, 300], 150));
    const Fy = G.frameOf([FX, ya, ZE], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    p.push(S(G.disc(0, yc - ya, 260, Fy, P), { tone: "hi" }));
    p.push(S(G.solidOf([[0, 260], [yd - yc - 120, 120], [yd - yc, 120]], G.frameOf([FX, yc, ZE], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "hi" }));
    p.push(S(G.disc(yd - ya - 30, yd - ya + 20, 210, Fy, P), { tone: "mid" }));
    const win = path3([[FX - 200, ya + 120, ZE + 180], [FX + 200, ya + 120, ZE + 180], [FX + 200, yc - 40, ZE + 180], [FX - 200, yc - 40, ZE + 180]]);
    p.push(clipped(win, `<path class="ln-cavity" d="${win}"/>` + rotor("feeder", { o: [FX, ya, ZE], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], speed: 0.8, flight: { s0: 60, s1: yc - ya + 200, r0: 70, r1: 230, pitch: 220 }, shaft: { s0: 0, s1: yc - ya + 240, r: 70 } })));
    p.push(L.L(win, { tone: "lo" }));
    p.push(hopper([FX - 200, ya + 130, 400, 400], ZE + 260, [FX - 330, ya, 660, 660], 1500, "mid"));
    unit("feeder", [FX, 2900, ZE], p);
  }

  // ---------- 16 Extruder.
  {
    const p = [];
    const xb0 = 28300, xb1 = FX + 200, r = 140;
    // Vacuum station behind the bed: tank, pump, gauge; the vacuum hoses from both vents.
    const vac = { x: 30600, y: YE - 1400 };
    p.push(box(vac.x - 500, vac.y - 300, 1100, 600, 0, 120, "lo", { bevel: 0.3 }));
    p.push(cylZ(vac.x - 200, vac.y, 120, 1000, 220, "hi"), turned(vac.x - 200, vac.y, 1000, [[0, 220], [100, 200, 1], [160, 0, 1]], "hi"));
    p.push(motor([vac.x + 150, vac.y, 300], [vac.x + 550, vac.y, 300], 120));
    p.push(cylY(vac.y + 220, vac.y + 260, vac.x - 200, 800, 70, "mid"));
    for (const vx of [30700, 29500]) p.push(pipeSvg([[vx, YE, ZE + 440], [vx, YE, ZE + 600], [vx, vac.y + 60, ZE + 600], [vac.x - 200, vac.y + 60, ZE + 600], [vac.x - 200, vac.y, 1200]].slice(0, 4), 30, { bend: 4, tone: "mid" }));
    // Bed with access panels.
    p.push(box(28100, YE - 450, FX + 3000 - 28100, 900, 0, 620, "mid", { seams: [120, 500], r: 30 }));
    p.push(L.L([29400, 30700, 32000, 33300, 34600].map((px) => path3([[px, YE + 450, 120], [px, YE + 450, 500]], false)).join(""), { tone: "faint" }));
    // Drive: gearbox with cooling fins and oil cooler, coupling guard, main motor.
    p.push(box(FX + 300, YE - 420, 1100, 840, 620, 800, "mid", { seams: [900, 1250], r: 30 }));
    p.push(L.L(Array.from({ length: 8 }, (_, i) => path3([[FX + 380 + i * 120, YE + 420, 900], [FX + 380 + i * 120, YE + 420, 1250]], false)).join(""), { tone: "faint" }));
    p.push(cylZ(FX + 1250, YE + 300, 1420, 1700, 90, "mid"));
    p.push(box(FX + 1400, YE - 260, 400, 520, 760, 520, "hi", { bevel: 0.5, r: 30 }));
    p.push(motor([FX + 1800, YE, 1050], [FX + 3000, YE, 1050], 310));
    p.push(cylX(FX + 200, FX + 300, YE, ZE, 270, "mid"));
    // Feed block with its cooling water hoses.
    p.push(box(FX - 250, YE - 320, 500, 640, 620, ZE - 620 + r + 80, "hi", { bevel: 0.5, seam: ZE }));
    // Barrel: seven heater zones with terminal boxes and blowers underneath; a window on the second zone shows the screw.
    p.push(cylX(xb0, xb1, YE, ZE, r, "hi"));
    const zones = [];
    for (let i = 0; i < 7; i++) zones.push(xb0 + 150 + i * 650);
    const vents = [30700, 29500];
    zones.forEach((hx, i) => {
      if (vents.some((v) => Math.abs(hx + 230 - v) < 350)) return;
      if (i >= 5) return;
      p.push(`<g class="ln-hot" style="animation-delay:${(-i * 0.37).toFixed(2)}s">${cylX(hx, hx + 460, YE, ZE, r + 55, "mid")}</g>`);
      p.push(box(hx + 170, YE - 50, 120, 100, ZE + r + 50, 80, "mid", { bevel: 0.3, r: 10 }));
      p.push(cylZ(hx + 230, YE, 650, ZE - r - 60, 110, "lo"));
    });
    const wz = zones[6];
    const win = path3([[wz - 520, YE - 20, ZE + r], [wz + 460, YE - 20, ZE + r], [wz + 460, YE + r * 0.92, ZE + r * 0.4], [wz - 520, YE + r * 0.92, ZE + r * 0.4]]);
    p.push(clipped(win, `<path class="ln-melt" d="${win}"/>` + rotor("screw", { o: [xb0, YE, ZE], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 1.2, flight: { s0: wz - xb0 - 620, s1: wz - xb0 + 560, r0: 70, r1: 128, pitch: 150, hand: -1 }, shaft: { s0: wz - xb0 - 640, s1: wz - xb0 + 580, r: 70 } })));
    p.push(L.L(win, { tone: "lo" }));
    for (const vx of vents) p.push(cylZ(vx, YE, ZE + r, ZE + 380, 90, "mid"), turned(vx, YE, ZE + 380, [[0, 130], [40, 130], [60, 90, 1], [90, 0, 1]], "hi"));
    for (const sx of [29000, 31900]) p.push(box(sx - 60, YE - 90, 120, 180, 620, ZE - r - 620, "lo", { bevel: 0.3 }));
    // Control cabinet with its operator panel and signal tower.
    const cx = 34600, cy = YE + 950;
    p.push(box(cx, cy, 1000, 450, 0, 100, "lo", { bevel: 0.3 }), box(cx, cy, 1000, 450, 100, 1900, "mid", { seam: 1850 }));
    p.push(L.L(path3([[cx + 500, cy + 450, 150], [cx + 500, cy + 450, 1850]], false), { tone: "lo" }));
    p.push(`<path class="ln-glass" d="${faceWindow(L, cy + 450, cx + 100, cx + 420, 1300, 1620)}"/>`);
    p.push(bolts([[cx + 580, cy + 450, 1450], [cx + 680, cy + 450, 1450], [cx + 780, cy + 450, 1450]], 0.6));
    p.push(cylZ(cx + 850, cy + 225, 2000, 2350, 40, "mid"), cylZ(cx + 850, cy + 225, 2350, 2600, 55, "hi"));
    unit("extruder", [31000, YE, ZE], p);
  }

  // ---------- 17 Screen changer with its hydraulic station and hoses.
  {
    const p = [];
    const x0 = 27700, x1 = 28300;
    const st = { x: 27350, y: YE + 700, w: 800, d: 420 };
    p.push(box(st.x, st.y, st.w, st.d, 80, 480, "mid", { seam: 340 }));
    p.push(motor([st.x + 560, st.y + st.d / 2, 560], [st.x + 560, st.y + st.d / 2, 900], 90));
    p.push(cylZ(st.x + 200, st.y + st.d / 2, 560, 640, 50, "mid"));
    p.push(box(x0, YE - 450, x1 - x0, 900, 620, 760, "mid", { seam: 1220 }));
    for (const py of [YE - 220, YE + 220]) {
      p.push(box(x0 + 180, py - 120, 240, 240, 1380, 220, "hi", { bevel: 0.4 }));
      p.push(cylZ(x0 + 300, py, 1600, 2150, 75, "hi"), cylZ(x0 + 300, py, 2150, 2240, 100, "mid"));
    }
    p.push(L.L(G.circleOf(L.FY(x0 + 300, ZE), YE + 450, 100, P) + "", { tone: "lo" }));
    for (const [i, pz] of [[0, 1700], [1, 2080]]) p.push(pipeSvg([[st.x + 300 + i * 100, st.y + 100, 560], [st.x + 300 + i * 100, st.y + 100, pz], [x0 + 300, YE + 300, pz]], 16, { bend: 6, tone: "mid" }));
    unit("changer", [28000, YE, 1300], p);
  }

  // ---------- 18 Hot face cutter: adapter, die plate, cutter hood with a window on the three knives, coaxial motor.
  {
    const p = [];
    p.push(box(25700, YE - 380, 1700, 760, 0, ZE - 420, "lo", { bevel: 0.3, seam: 300 }));
    p.push(cylX(27400, 27700, YE, ZE, 170, "mid"));
    p.push(cylX(27250, 27400, YE, ZE, 340, "hi"));
    p.push(cylX(26750, 27250, YE, ZE, 400, "hi"));
    const win = faceWindow(L, YE + 400, 26820, 27180, ZE - 200, ZE + 200);
    const knives = [0, 1, 2].map((i) => ({ s: 20, phase: i * (Math.PI * 2 / 3), type: 0 }));
    p.push(clipped(win, `<path class="ln-cavity" d="${win}"/>` + rotor("knives", { o: [27200, YE, ZE], a: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], speed: 2.5, types: [{ r0: 40, r1: 300, w: 20, t: 60, beta: 0.3 }], blades: knives, shaft: { s0: 0, s1: 400, r: 40, tone: "mid" } }) + flow("pellets-ring", [[27100, YE + 300, ZE + 100], [27100, YE + 300, ZE - 250]], { speed: 700, count: 6, size: 25, kind: "pellet" })));
    p.push(L.L(win, { tone: "hi" }));
    p.push(cylX(26600, 26750, YE, ZE, 300, "mid"));
    for (const py of [YE - 220, YE + 220]) p.push(L.rod([26600, py, ZE + 150], [26200, py, ZE + 150], 30, "lo"));
    p.push(motor([26200, YE, ZE], [25600, YE, ZE], 230));
    unit("head", [26700, YE, ZE], p);
  }

  // ---------- 19 Pellet water separator, centrifugal dryer and the pellet water loop (tank, pump).
  {
    const p = [];
    const dx = 24600, dy = YE + 900;
    // Pellet water tank with its pump; clean (blue) loop up to the cutter's water ring and back.
    p.push(box(23300, YE - 400, 1300, 900, 0, 700, "mid", { seam: 560 }));
    p.push(motor([23500, YE + 650, 260], [23950, YE + 650, 260], 110));
    p.push(cylY(YE + 500, YE + 650, 24050, 260, 120, "mid"));
    p.push(pipeSvg([[24050, YE + 500, 380], [24050, YE + 500, 600], [26900, YE + 500, 600], [26900, YE + 420, 600], [26900, YE + 420, ZE - 300]], 30, { cls: "clean", bend: 4 }));
    // Slurry pipe from the water ring down to the separator.
    p.push(pipeSvg([[27000, YE + 400, ZE - 300], [27000, YE + 950, ZE - 300], [25200, YE + 950, ZE - 300], [25000, YE + 950, 1500]], 70, { bend: 4, tone: "hi" }));
    // Centrifugal dryer: a tall cylinder with a window on its rotor, fan and motor on top.
    p.push(cylZ(dx, dy, 0, 1400, 400, "hi"));
    const win = path3([[dx - 250, dy + 320, 300], [dx + 250, dy + 320, 300], [dx + 250, dy + 320, 1150], [dx - 250, dy + 320, 1150]]);
    const vanes = [];
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) vanes.push({ s: 200 + i * 150, phase: k * (Math.PI / 2) + i * 0.4, type: 0 });
    p.push(clipped(win, `<path class="ln-cavity" d="${win}"/>` + rotor("pelletdry", { o: [dx, dy, 100], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], speed: 3, types: [{ r0: 60, r1: 330, w: 90, t: 20, beta: 0.7 }], blades: vanes, shaft: { s0: 100, s1: 1200, r: 60, tone: "mid" } })));
    p.push(L.L(win, { tone: "hi" }));
    p.push(turned(dx, dy, 1400, [[0, 400], [150, 400, 1], [300, 220, 1], [360, 0, 1]], "hi"));
    p.push(motor([dx, dy, 1760], [dx, dy, 2200], 150));
    p.push(cylY(dy - 400, dy - 520, dx, 1000, 90, "mid"));
    // Dry pellets blown up over the pellet hopper and down into its roof; drawn without the hopper (a figure of this
    // unit alone), the line ends in a flange, heading for it.
    if (L.alone && !L.alone.has("bagging")) {
      p.push(pipeSvg([[dx, dy - 520, 1000], [dx, dy - 760, 1000], [dx, dy - 760, 2500], [dx - 700, dy - 760, 2500]], 70, { bend: 4, tone: "hi" }));
      p.push(L.flange([dx - 700, dy - 760, 2500], [-1, 0, 0], 110));
    } else p.push(pipeSvg([[dx, dy - 520, 1000], [dx, dy - 760, 1000], [dx, dy - 760, 3700], [21900, dy - 760, 3700], [21900, YE, 3700], [21900, YE, 3460]], 70, { bend: 4, tone: "hi" }));
    unit("pelletdry", [24300, YE + 300, 900], p);
  }

  // ---------- 20 Pellet hopper on a tall frame with a weighing doser; under it two spouts: a 600 kg big bag in its frame
  // and the 25 kg bagging station with its scale and sewing head; bags ride a belt to the pallets.
  {
    const p = [];
    const hx = 21900, hy = YE, zo = 2050;
    const posts = [[hx - 650, hy - 650], [hx + 650, hy - 650], [hx - 650, hy + 650], [hx + 650, hy + 650]];
    for (const [lx, ly] of posts.slice(0, 2)) p.push(leg(lx, ly, 0, zo + 900, 100));
    p.push(brace([hx - 650, hy - 650, 300], [hx + 650, hy - 650, zo - 200], 60));
    p.push(...[hy - 650, hy + 650].map((ly) => box(hx - 700, ly - 45, 1400, 90, zo + 500, 90, "lo", { bevel: 0.2 })));
    p.push(turned(hx, hy, zo, [[0, 120], [700, 620], [1300, 620], [1350, 660], [1410, 0]], "hi"));
    p.push(box(hx - 240, hy - 240, 480, 480, zo - 380, 380, "mid", { bevel: 0.4, seam: zo - 190 }));
    // Y-chute to the two filling points.
    const bx = 20300, sx = 23550;
    p.push(frustum([hx - 120, hy - 120, 240, 240], zo - 380, [hx - 100, hy - 100, 200, 200], zo - 560, "mid"));
    p.push(L.rod([hx - 60, hy, zo - 560], [bx, hy, 1520], 70, "mid"), L.rod([hx + 60, hy, zo - 560], [sx, hy - 200, 1520], 70, "mid"));
    p.push(flow("bigbag-chute", [[hx - 60, hy, zo - 600], [bx, hy, 1500], [bx, hy, 1420]], { speed: 700, count: 6, size: 25, kind: "pellet" }));
    for (const [lx, ly] of posts.slice(2)) p.push(leg(lx, ly, 0, zo + 900, 100));
    p.push(brace([hx - 650, hy + 650, 300], [hx + 650, hy + 650, zo - 200], 60));
    // Big bag frame and a big bag filling.
    for (const [lx, ly] of [[bx - 560, hy - 560], [bx + 560, hy - 560]]) p.push(leg(lx, ly, 0, 1700, 90));
    p.push(box(bx - 620, hy - 620, 1240, 1240, 1600, 100, "mid", { bevel: 0.3 }));
    p.push(box(bx - 520, hy - 480, 1040, 960, 140, 1150, "hi", { bevel: 1, r: 160, steps: 6 }));
    p.push(...[[bx - 400, hy - 480], [bx + 320, hy - 480]].map(([lx, ly]) => L.L(path3([[lx, ly, 1290], [lx, ly, 1600], [lx + 80, ly, 1600], [lx + 80, ly, 1290]], false), { tone: "lo" })));
    p.push(cylZ(bx, hy, 1500, 1600, 90, "mid"));
    p.push(box(bx - 600, hy - 560, 1200, 1120, 0, 140, "lo", { bevel: 0.4 }));
    for (const [lx, ly] of [[bx - 560, hy + 560], [bx + 560, hy + 560]]) p.push(leg(lx, ly, 0, 1700, 90));
    // Bagging station on the other side: scale, spout, a bag on the scale, the sewing head on its post.
    p.push(box(sx - 420, hy - 580, 840, 760, 0, 600, "mid", { seam: 480 }));
    p.push(box(sx - 250, hy - 370, 500, 340, 600, 720, "hi", { bevel: 0.8, r: 80, steps: 5 }));
    p.push(frustum([sx - 100, hy - 300, 200, 200], 1330, [sx - 170, hy - 370, 340, 340], 1560, "mid"));
    p.push(leg(sx + 520, hy - 600, 0, 1500, 70), box(sx + 300, hy - 700, 300, 200, 1350, 220, "mid", { bevel: 0.3 }));
    // Belt carrying the filled bags to the pallets.
    p.push(...beltConveyor(L, "bagbelt", [sx - 2300, hy + 600, 520], [sx - 300, hy + 600, 520], 650, { legsAt: [0.2, 0.8], flakes: false, cleats: 1600, speed: 160, motorSide: 1 }));
    p.push(slide("bags", [sx - 2200, sx - 1400].map((bx2) => box(bx2, hy + 400, 520, 400, 525, 180, "hi", { bevel: 0.6, r: 60, steps: 4 })).join(""), { dir: [-1, 0, 0], speed: 160, period: 800, clip: L.pathOf(G.hullOf([[sx - 2350, hy + 270, 520], [sx - 250, hy + 270, 520], [sx - 250, hy + 930, 520], [sx - 2350, hy + 930, 520], [sx - 2350, hy + 270, 760], [sx - 250, hy + 270, 760], [sx - 250, hy + 930, 760], [sx - 2350, hy + 930, 760]].map(L.at))) }));
    // Pallets of finished bags.
    for (const [px, py] of [[17400, hy - 300], [17400, hy + 900], [15800, hy + 300]]) {
      p.push(box(px, py, 1200, 1000, 0, 140, "lo", { bevel: 0.3, seam: 70 }));
      for (let row = 0; row < 4; row++) for (const [ox, oy] of [[40, 40], [620, 40], [40, 520], [620, 520]]) p.push(box(px + ox, py + oy, 540, 440, 140 + row * 170, 160, "hi", { bevel: 0.6, r: 70, steps: 4 }));
    }
    unit("bagging", [21000, YE, 1200], p);
  }

  return { units };
}
