// Styles of the line drawings (the whole line and the figures of single units cut from it): material, water, glass,
// pipes, flow marks and glow, in both themes; and the thinning of the kit's dense outlines before writing.
import { figureCss } from "../shared.mjs";

const f1 = (v) => (Math.round(v * 10) / 10).toString();
// Douglas-Peucker thinning of the kit's dense outlines and tone sheets (the same for a fill and its outline).
function thin(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let worst = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const dd = len > 1e-6 ? Math.abs((px - ax) * dy - (py - ay) * dx) / len : Math.hypot(px - ax, py - ay);
      if (dd > worst) { worst = dd; idx = i; }
    }
    if (worst > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
function thinPath(d, tol = 0.12) {
  if (/[^MLZ0-9 .\-]/.test(d)) return d;
  return d.split(/(?=M)/).map((sub) => {
    const closed = /Z$/.test(sub);
    const pts = sub.replace(/Z$/, "").slice(1).split("L").map((pair) => pair.trim().split(/\s+/).map(Number));
    let out;
    if (closed && pts.length > 4) {
      let far = 0, best = -1;
      pts.forEach(([x, y], i) => { const dd = Math.hypot(x - pts[0][0], y - pts[0][1]); if (dd > best) { best = dd; far = i; } });
      const a = thin(pts.slice(0, far + 1), tol), b = thin([...pts.slice(far), pts[0]], tol);
      out = [...a, ...b.slice(1, -1)];
    } else out = thin(pts, tol);
    return `M${out.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}`;
  }).join("");
}
export const thinSvg = (markup) => markup.replace(/(<path class="(?:iso-fill|iso-line iso-edge|iso-line iso-crease|iso-line iso-bevel|iso-shade|iso-top|tb-body|tb-shine|tb-shade|iso-line tb-edge)"[^>]*? d=")([^"]*)"/g, (_, head, d) => `${head}${thinPath(d)}"`);

export const CSS = figureCss(`
.fig-svg{overflow:hidden}
/* Lines keep their screen width as the camera moves in, so a close view stays a fine drawing. */
.fig-svg :is(.iso-line,.tb-edge,.ln-ripple,.ln-heat){vector-effect:non-scaling-stroke}
.fig-svg .iso-line{stroke-width:max(var(--anatomy-weight),.75px)}
.ln-dot{stroke:var(--ln-flake-edge);stroke-width:.25px}
.ln-raw{fill:var(--ln-raw)}.ln-wash{fill:var(--ln-wash)}.ln-rinse{fill:var(--ln-rinse)}.ln-clean{fill:var(--ln-cleanflake)}.ln-dry{fill:var(--ln-dry)}.ln-flake{fill:var(--ln-wash)}
.ln-pellet{fill:var(--ln-pellet);stroke:none}
.ln-spray{fill:var(--ln-clean-edge);stroke:none;opacity:.7}
.ln-ripple{fill:none;stroke:var(--ln-ripple);stroke-width:.35px;stroke-linecap:round}
.ln-heat{fill:none;stroke:var(--ln-heat);stroke-width:.6px;stroke-linecap:round}
/* Glow and flow marks follow variables the page writes at its own frame rate (no CSS animations: each frame of one
   repaints the whole live layer). */
.fig-svg .ln-hot .iso-solid>:is(.iso-shade,.iso-top){fill:color-mix(in srgb,var(--ln-hot2) var(--hg,40%),var(--ln-hot1))}
/* Rotor blades: the page sets each face's tone as a variable (no class change per frame); lit, the tone mixes with the
   accent. A stroke of the same colour closes the seams between faces. */
.fig-svg .ln-bf{fill:var(--t);stroke:var(--t);stroke-width:.4;stroke-linejoin:round}
.fig-svg [data-on] .iso-solid>.iso-shade.ln-bf{fill:color-mix(in srgb,var(--t) 35%,var(--anatomy-lit-shade));stroke:color-mix(in srgb,var(--t) 35%,var(--anatomy-lit-shade))}
.ln-cavity{fill:var(--ln-cavity);stroke:none}
.ln-glass{fill:var(--ln-glass);stroke:none}
.ln-water[data-water=clean]{fill:var(--ln-clean-fill);stroke:none}
.ln-water[data-water=dirty]{fill:var(--ln-dirty-fill);stroke:none}
.ln-water[data-water=mid]{fill:var(--ln-mid-fill);stroke:none}
.ln-water[data-water=body]{fill:var(--ln-body);stroke:none}
.ln-fill{fill:var(--ln-flakes);stroke:none}
.ln-melt{fill:color-mix(in srgb,var(--ln-melt2) var(--mg,40%),var(--ln-melt));stroke:none}
.ln-grit{fill:var(--anatomy-hi);stroke:none}
.ln-paper{fill:var(--anatomy-paper);stroke:var(--anatomy-mid);stroke-width:.3px}
[data-pipe=clean] .tb-body{fill:var(--ln-clean-fill)}
[data-pipe=clean] .tb-shine{fill:var(--ln-clean-shine)}
[data-pipe=clean] .tb-shade{fill:var(--ln-clean-shade)}
[data-pipe=clean] .tb-edge{stroke:var(--ln-clean-edge)}
[data-pipe=dirty] .tb-body{fill:var(--ln-dirty-fill)}
[data-pipe=dirty] .tb-shine{fill:var(--ln-dirty-shine)}
[data-pipe=dirty] .tb-shade{fill:var(--ln-dirty-shade)}
[data-pipe=dirty] .tb-edge{stroke:var(--ln-dirty-edge)}
[data-pipe=mid] .tb-body{fill:var(--ln-mid-fill)}
[data-pipe=mid] .tb-edge{stroke:var(--anatomy-mid)}
.ln-flowline[data-flow-kind=mid]{stroke:var(--anatomy-mid)}
.ln-foam{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:.3px}
.ln-bubble{fill:none;stroke:var(--anatomy-mid);stroke-width:.3px}
.ln-flowline{fill:none;stroke-width:.7px;stroke-linecap:round;stroke-dasharray:1.6 7.4;stroke-dashoffset:calc(var(--o) - var(--ft,0px))}
.ln-flowline[data-flow-kind=clean]{stroke:var(--ln-clean-edge)}
.ln-flowline[data-flow-kind=dirty]{stroke:var(--ln-dirty-edge)}
.ln-flowline[data-flow-kind=air]{stroke:var(--anatomy-mid);stroke-dashoffset:calc(var(--o) - var(--fa,0px))}
`, {
  light: "--ln-cavity:#c9d0c7;--ln-glass:#dfe8ea;--ln-clean-fill:#cfe3f4;--ln-clean-shine:#e6f1fb;--ln-clean-shade:#a9c8e6;--ln-clean-edge:#2f6fae;--ln-dirty-fill:#e3d6c3;--ln-dirty-shine:#efe6d8;--ln-dirty-shade:#cdb898;--ln-dirty-edge:#8a6a3c;--ln-mid-fill:#dde3e0;--ln-body:#d9cdb8;--ln-flakes:#d6dcd2;--ln-melt:#e8c9a0;--ln-raw:#8c7454;--ln-wash:#ad9876;--ln-rinse:#cdbfa3;--ln-cleanflake:#e9e4d6;--ln-dry:#fff;--ln-pellet:#4d5c55;--ln-flake-edge:#5a4a35;--ln-ripple:#9f8a68;--ln-heat:#d2793d;--ln-hot1:#f4dcc4;--ln-hot2:#f6b98b;--ln-melt2:#f2a35a",
  dark: "--ln-cavity:#0b100d;--ln-glass:#1f2e31;--ln-clean-fill:#1d3a55;--ln-clean-shine:#2a5378;--ln-clean-shade:#152b40;--ln-clean-edge:#7fb6ee;--ln-dirty-fill:#3d3121;--ln-dirty-shine:#54442d;--ln-dirty-shade:#2c2317;--ln-dirty-edge:#c9a26a;--ln-mid-fill:#24302c;--ln-body:#3a3022;--ln-flakes:#2f3a33;--ln-melt:#5a4128;--ln-raw:#7d6545;--ln-wash:#9b8766;--ln-rinse:#bcae92;--ln-cleanflake:#dcd7c8;--ln-dry:#f2f2ee;--ln-pellet:#a9b7ae;--ln-flake-edge:#1a140c;--ln-ripple:#6d5a3d;--ln-heat:#e08a4e;--ln-hot1:#3a2a1e;--ln-hot2:#7a3e1c;--ln-melt2:#b5602a",
});
