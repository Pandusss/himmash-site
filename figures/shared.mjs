// Shared pieces of the site's anatomy figures: the site palette, the drawing styles, the output files
// and a standalone preview page for the checks. Every figure lives in figures/<id>/build.mjs and writes
//   public/figures/<id>.svg            the drawing with its styles, fetched by the page near the viewport;
//   src/figures/<id>/figure.json       data for its live script, plus width and height;
//   figures/<id>/out/preview*.html     a page for capture.mjs / drive.mjs / lines.mjs (not committed).
// Its texts are src/figures/<id>/text.js and its behaviour src/figures/<id>/live.js (export function mount).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

export const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SVG_CLASS = "fig-svg";

// Kit tokens mapped onto the site palette (light page, white card; dark page, deep green card).
export const LIGHT = "--anatomy-paper:var(--white,#fff);--anatomy-face:var(--white,#fff);--anatomy-top:var(--white,#fff);--anatomy-shade-0:#dfe4dc;--anatomy-shade-1:#e7ebe4;--anatomy-shade-2:#eef1ec;--anatomy-shade-3:#f5f7f3;--anatomy-lit-top:#fff;--anatomy-lit-shade:#ecf2ee;--anatomy-hi:#202d28;--anatomy-mid:#86918a;--anatomy-lo:#b3bdb5;--anatomy-faint:#d5dcd4;--anatomy-lit:var(--green,#145445);--anatomy-halo:#7f8a7c;--anatomy-halo-opacity:.3;--anatomy-dot:#2c3a33;--anatomy-weight:.6px;--anatomy-red:#c8463b;--anatomy-green:#2f8a5b;--anatomy-blue:#3e6fb5";
export const DARK = "--anatomy-paper:var(--white,#182019);--anatomy-shade-0:#121914;--anatomy-shade-1:#151d17;--anatomy-shade-2:#18211b;--anatomy-shade-3:#1c251f;--anatomy-face:#1e2822;--anatomy-top:#1f2a23;--anatomy-lit-top:#25332b;--anatomy-lit-shade:#203028;--anatomy-hi:#d6e0d9;--anatomy-mid:#6e7c73;--anatomy-lo:#3e4a43;--anatomy-faint:#2a3530;--anatomy-lit:var(--green,#7fcfa9);--anatomy-halo:#040605;--anatomy-halo-opacity:.85;--anatomy-dot:#dfe8e2;--anatomy-red:#ff8f85;--anatomy-green:#7fcfa9;--anatomy-blue:#8fb4ff";

const DRAW_CSS = k.ISO_CSS.split("\n").filter((line) => /^(\.(iso-(fill|solid|shade|top|line|halo|dots|face-text|wire|crease|edge|bevel)|tb-)|@keyframes iso-|@media \(prefers-reduced-motion)/.test(line.trim())).join("\n");

// Anything inside an element with data-on becomes the lit accent; data-hit marks parts the reader can click.
const LIT_CSS = `
.${SVG_CLASS} [data-on] .iso-solid>.iso-edge{stroke:var(--anatomy-lit)}
.${SVG_CLASS} [data-on] .iso-solid>.iso-top{fill:var(--anatomy-lit-top)}
.${SVG_CLASS} [data-on] .iso-solid>.iso-shade{fill:var(--anatomy-lit-shade)}
.${SVG_CLASS} [data-hit]{cursor:pointer}`;

// The whole stylesheet of a figure. `light` and `dark` add the figure's own tokens for each theme.
export function figureCss(extra = "", { light = "", dark = "" } = {}) {
  const d = DARK + (dark ? `;${dark}` : "");
  return `.${SVG_CLASS}{${LIGHT}${light ? `;${light}` : ""}}
:root[data-theme=dark] .${SVG_CLASS}{${d}}
@media (prefers-color-scheme:dark){:root:not([data-theme]) .${SVG_CLASS}{${d}}}
${DRAW_CSS}${LIT_CSS}
${extra}`;
}

// Writes the drawing (with its styles inside) and the data for the live script. Returns the SVG markup.
export function writeFigure({ id, svg, css, data = {}, width, height }) {
  const file = svg.replace(/^<svg([^>]*)>/, `<svg$1><style>${css.replace(/\s*\n\s*/g, "")}</style>`);
  mkdirSync(join(SITE, "public", "figures"), { recursive: true });
  mkdirSync(join(SITE, "src", "figures", id), { recursive: true });
  writeFileSync(join(SITE, "public", "figures", `${id}.svg`), file);
  writeFileSync(join(SITE, "src", "figures", id, "figure.json"), JSON.stringify({ ...data, width, height }));
  return file;
}

const attr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

// A standalone page with the kit card, the drawing and the live script inlined, for the browser checks.
export async function writePreview({ id, file, data = {}, theme = "light", lang = "ru" }) {
  const src = join(SITE, "src", "figures", id);
  const { TEXT } = await import(join(src, "text.js"));
  const T = TEXT[lang];
  const live = readFileSync(join(src, "live.js"), "utf8").replace(/^export /gm, "");
  const card = k.plateHtml({
    fig: T.fig,
    title: T.title,
    hint: T.hint,
    readout: T.idle,
    keys: T.keys,
    caption: T.caption,
    body: `<div class="iso-stage anatomy-stage" tabindex="0" role="group" aria-label="${attr(T.aria)}">${file}<span class="anatomy-live" aria-live="polite"></span></div>`,
  });
  const boot = `\nmount(document.querySelector(".anatomy-stage"), { text: ${JSON.stringify({ ...T.live, label: T.label })}, data: ${JSON.stringify(data)} });\n`;
  const out = join(SITE, "figures", id, "out");
  mkdirSync(out, { recursive: true });
  const name = theme === "light" ? "preview-light.html" : "preview.html";
  const style = `<style>.anatomy-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.iso[data-theme="light"]{--anatomy-card:#fff}.iso[data-theme="dark"]{--anatomy-card:#182019;--anatomy-page:#111613}</style>`;
  const dark = theme === "dark" ? `document.documentElement.dataset.theme = "dark";\n` : "";
  writeFileSync(join(out, name), k.pageHtml({ title: T.title, theme, body: `${style}${card}`, script: dark + live + boot, width: 560 }));
  return join(out, name);
}
