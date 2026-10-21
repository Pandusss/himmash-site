// The pelletizing row, right to left: storage hopper with its Ø400 screw doser (company sketch: 5000 long,
// 2000 tall on a 1500 frame, 8–10 m³), side screw feeder, extruder Ø125–135 L/D 32–36 with seven heating
// zones and two vacuum vents, slide-plate screen changer with its hydraulic station, hot face cutting head,
// pellet water separator and centrifugal dryer, pellet hopper with the weighing doser, big-bag frame and the
// 25 kg bagging station with a sewing head, finished goods on pallets.
import { YF, YE, ZE } from "./layout.mjs";

export function pelletizingRow(L) {
  const { box, cylX, cylY, cylZ, rod, prismX, prismY, frustum, hopper, motor, gearbox, leg, legs, path3, S, G, P, depth, turned } = L;
  const units = [];
  const unit = (id, center, parts, extra = {}) => units.push({ id, items: [{ key: depth(center), svg: parts.join("") }], ...extra });

  // ---------- 14 Storage hopper behind the extruder drive.
  {
    const p = [];
    const x = 34000, w = 5000, y0 = 1750, d = 1600, z0 = 1500, z1 = 3500;
    const [far, near] = legs(x, y0, w, d, z0, { s: 120, inset: 80 });
    p.push(far);
    // Doser trough under the V bottom, gear motor on the right, outlet chute on the left.
    p.push(prismX(x, x + w, [[y0, z0], [y0 + d, z0], [y0 + d / 2 + 260, z0 - 300], [y0 + d / 2 - 260, z0 - 300]], "mid"));
    p.push(cylX(x - 600, x + w + 120, y0 + d / 2, z0 - 420, 200, "hi"));
    p.push(gearbox(x + w + 120, y0 + d / 2 - 200, 300, 400, z0 - 700, 520));
    p.push(motor([x + w + 270, y0 + d / 2, z0 - 120], [x + w + 270, y0 + d / 2, z0 + 380], 150));
    p.push(`<g data-rotor="doser"></g>`);
    p.push(box(x, y0, w, d, z0, z1 - z0, "hi", { seam: z0 + 140, r: 20 }));
    const wins = [x + 900, x + 2200, x + 3500].map((wx) => path3([[wx, y0 + d, z0 + 900], [wx + 600, y0 + d, z0 + 900], [wx + 600, y0 + d, z0 + 1500], [wx, y0 + d, z0 + 1500]])).join("");
    p.push(`<path class="ln-glass" d="${wins}"/>`, L.L(wins, { tone: "lo" }));
    p.push(box(x - 30, y0 - 30, w + 60, d + 60, z1, 60, "mid", { bevel: 0.4 }));
    p.push(cylZ(x + w - 500, y0 + d / 2, z1 + 60, z1 + 180, 140, "mid"));
    p.push(cylZ(x + 600, y0 + d / 2, z1 + 60, z1 + 130, 160, "mid"));
    p.push(turned(x + 600, y0 + d / 2, z1 + 130, [[0, 140], [300, 140, 1], [380, 100, 1], [430, 0, 1]], "hi"));
    p.push(frustum([x - 560, y0 + d / 2 - 160, 320, 320], z0 - 640, [x - 520, y0 + d / 2 - 120, 240, 240], 1300, "mid"));
    p.push(near);
    unit("hopper", [x + w / 2, y0 + d / 2, 2400], p);
  }

  // ---------- 15 Side screw feeder: red hopper, conical blue body pressing into the barrel's feed block.
  {
    const p = [];
    const fx = 33100;
    p.push(box(fx - 260, 2100, 520, 1700, 0, 120, "lo", { bevel: 0.3 }));
    for (const ly of [2300, 3500]) p.push(leg(fx - 200, ly, 120, 700, 70), leg(fx + 200, ly, 120, 700, 70));
    p.push(box(fx - 260, 2100, 520, 1700, 700, 80, "mid", { bevel: 0.3 }));
    p.push(gearbox(fx - 220, 2120, 440, 380, 780, 420));
    p.push(motor([fx, 2250, 320], [fx, 2750, 320], 160));
    p.push(cylY(2500, 3000, fx, ZE, 260, "hi"));
    p.push(hopper([fx - 200, 2550, 400, 400], ZE + 260, [fx - 330, 2420, 660, 660], ZE + 700, "mid"));
    p.push(S(G.solidOf([[0, 260], [1050, 130], [1150, 130]], G.frameOf([fx, 3000, ZE], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "hi" }));
    p.push(`<g data-rotor="feeder"></g>`);
    unit("feeder", [fx, 3000, ZE], p);
  }

  // ---------- 16 Extruder: bed, drive (motor, gearbox, thrust), feed block, barrel with seven heater zones,
  // two vacuum vents with their pump behind the bed, control cabinet in front.
  {
    const p = [];
    const xb0 = 28300, xb1 = 33500, r = 140;
    p.push(box(31200, YE - 1300, 700, 500, 0, 700, "mid", { seam: 560 }));
    for (const vx of [30500, 29300]) p.push(L.pipe([[vx, YE, ZE + 420], [vx, YE - 760, ZE + 420], [vx, YE - 760, 700], [31300, YE - 760, 700]].slice(0, 3).concat([[vx, YE - 760, 760]]), 32, { bend: 4, tone: "mid" }).map((i) => i.svg).join(""));
    p.push(box(28100, YE - 450, 8100, 900, 0, 620, "mid", { seam: 480, r: 30 }));
    p.push(box(33600, YE - 400, 1100, 800, 620, 760, "mid", { seam: 1200, r: 30 }));
    p.push(cylX(33500, 33600, YE, ZE, 260, "mid"));
    p.push(motor([34750, YE, 1050], [36100, YE, 1050], 300));
    p.push(box(xb1 - 200, YE - 300, 400, 600, 620, ZE - 620 + r + 60, "hi", { bevel: 0.5 }));
    p.push(cylX(xb0, xb1, YE, ZE, r, "hi"));
    p.push(`<g data-rotor="screw"></g>`);
    for (let i = 0; i < 7; i++) {
      const hx = xb0 + 200 + i * 640;
      if (hx > 30350 && hx < 30650 || hx > 29150 && hx < 29450) continue;
      p.push(cylX(hx, hx + 460, YE, ZE, r + 50, "mid"));
    }
    for (const vx of [30500, 29300]) p.push(cylZ(vx, YE, ZE + r, ZE + 380, 90, "mid"), cylZ(vx, YE, ZE + 380, ZE + 440, 120, "mid"));
    for (const sx of [29000, 31600]) p.push(box(sx - 50, YE - 80, 100, 160, 620, ZE - r - 620, "lo", { bevel: 0.3 }));
    p.push(box(34300, YE + 900, 900, 450, 0, 1900, "mid", { seam: 1700 }));
    unit("extruder", [31000, YE, ZE], p);
  }

  // ---------- 17 Screen changer with its hydraulic station.
  {
    const p = [];
    const x0 = 27700, x1 = 28300;
    p.push(box(x0, YE - 450, x1 - x0, 900, 620, 760, "mid", { seam: 1200 }));
    for (const py of [YE - 220, YE + 220]) {
      p.push(box(x0 + 200, py - 110, 200, 220, 1380, 220, "hi", { bevel: 0.4 }));
      p.push(cylZ(x0 + 300, py, 1600, 2150, 70, "hi"));
      p.push(cylZ(x0 + 300, py, 2150, 2230, 95, "mid"));
    }
    const st = { x: 27500, y: YE + 650, w: 700, d: 380 };
    p.push(box(st.x, st.y, st.w, st.d, 80, 450, "mid", { seam: 330 }));
    p.push(motor([st.x + 500, st.y + st.d / 2, 530], [st.x + 500, st.y + st.d / 2, 880], 90));
    unit("changer", [28000, YE, 1300], p);
  }

  // ---------- 18 Hot face cutting head: adapter, die, cutter housing with its water ring, coaxial motor.
  {
    const p = [];
    p.push(cylX(27400, 27700, YE, ZE, 170, "mid"));
    p.push(cylX(27250, 27400, YE, ZE, 330, "hi"));
    p.push(cylX(26700, 27250, YE, ZE, 400, "hi"));
    p.push(`<g data-rotor="knives"></g>`);
    p.push(cylX(26550, 26700, YE, ZE, 300, "mid"));
    p.push(motor([26550, YE, ZE], [25850, YE, ZE], 230));
    p.push(box(25800, YE - 350, 1500, 700, 0, ZE - 420, "lo", { bevel: 0.3 }));
    p.push(cylY(YE + 400, YE + 560, 26950, ZE - 200, 90, "mid"));
    unit("head", [26700, YE, ZE], p);
  }

  // ---------- 19 Pellet water separator and centrifugal dryer, pellet water tank with its pump.
  {
    const p = [];
    p.push(L.pipe([[26950, YE + 560, ZE - 200], [26950, YE + 900, ZE - 200], [25200, YE + 900, ZE - 200], [24900, YE + 900, 1500]], 80, { bend: 4, tone: "hi" }).map((i) => i.svg).join(""));
    p.push(box(23400, YE - 300, 1200, 900, 0, 600, "mid", { seam: 450 }));
    p.push(cylZ(24600, YE + 900, 0, 1300, 380, "hi"));
    p.push(turned(24600, YE + 900, 1300, [[0, 380], [200, 380, 1], [360, 200, 1], [420, 0, 1]], "hi"));
    p.push(motor([24600, YE + 900, 1720], [24600, YE + 900, 2150], 150));
    p.push(cylY(YE + 520, YE + 600, 24900, 1100, 80, "mid"));
    p.push(motor([23700, YE + 650, 250], [24100, YE + 650, 250], 110));
    p.push(L.pipe([[24600, YE + 520, 900], [23800, YE + 520, 900], [23800, YE, 900], [23800, YE, 2600], [21900, YE, 2600], [21900, YE, 2900]], 70, { bend: 4, tone: "hi" }).map((i) => i.svg).join(""));
    unit("pelletdry", [24300, YE + 300, 900], p);
  }

  // ---------- 20 Pellet hopper with the weighing doser, big-bag frame, bagging station, pallets.
  {
    const p = [];
    const hx = 21900, hy = YE;
    for (const [lx, ly] of [[hx - 500, hy - 500], [hx + 500, hy - 500]]) p.push(leg(lx, ly, 0, 2000, 90));
    p.push(turned(hx, hy, 1400, [[0, 120], [700, 650], [1300, 650], [1350, 700], [1400, 0]], "hi"));
    p.push(box(hx - 250, hy - 250, 500, 500, 1050, 350, "mid", { bevel: 0.4 }));
    for (const [lx, ly] of [[hx - 500, hy + 500], [hx + 500, hy + 500]]) p.push(leg(lx, ly, 0, 2000, 90));
    // Big-bag frame beside it.
    const bx = 19700;
    for (const [lx, ly] of [[bx - 550, hy - 550], [bx + 550, hy - 550]]) p.push(leg(lx, ly, 0, 2200, 80));
    p.push(box(bx - 600, hy - 600, 1200, 1200, 2200, 90, "mid", { bevel: 0.3 }));
    p.push(box(bx - 520, hy - 480, 1040, 960, 120, 1250, "hi", { bevel: 1, r: 160, steps: 6 }));
    p.push(box(bx - 600, hy - 560, 1200, 1120, 0, 120, "lo", { bevel: 0.4 }));
    for (const [lx, ly] of [[bx - 550, hy + 550], [bx + 550, hy + 550]]) p.push(leg(lx, ly, 0, 2200, 80));
    // Bagging station: a scale with a 25 kg bag and the sewing head, a belt out to the pallets.
    const sx = 17700;
    p.push(box(sx - 400, hy - 350, 800, 700, 0, 650, "mid", { seam: 520 }));
    p.push(box(sx - 230, hy - 160, 460, 320, 650, 700, "hi", { bevel: 0.8, r: 80, steps: 5 }));
    p.push(box(sx - 150, hy - 600, 300, 250, 1200, 260, "mid", { bevel: 0.3 }));
    p.push(leg(sx, hy - 480, 0, 1200, 70));
    p.push(box(15600, hy - 300, 1700, 600, 450, 90, "hi", { bevel: 0.4 }));
    for (const lx of [15800, 16900]) p.push(leg(lx, hy - 250, 0, 450, 60), leg(lx, hy + 250, 0, 450, 60));
    // Pallets of finished bags.
    for (const [px, py] of [[13300, hy - 600], [13300, hy + 700]]) {
      p.push(box(px, py, 1200, 1000, 0, 140, "lo", { bevel: 0.3 }));
      for (let row = 0; row < 4; row++) for (const [ox, oy] of [[40, 40], [620, 40], [40, 520], [620, 520]]) {
        p.push(box(px + ox, py + oy + (row % 2) * 0, 540, 440, 140 + row * 170, 160, "hi", { bevel: 0.6, r: 70, steps: 4 }));
      }
    }
    unit("bagging", [18500, YE, 1000], p);
  }

  return { units };
}
