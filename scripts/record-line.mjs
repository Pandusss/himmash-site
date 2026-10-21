// Records the whole-line figure's material path as an MP4: a 1920×1080 page with the drawing, the time advanced frame
// by frame through the figure's #record hook, JPEG frames piped into ffmpeg. Needs puppeteer and ffmpeg-static
// (not project dependencies: install them next to this script or run it from a folder that has them).
// Build the figure first (node figures/granulation-lines/build.mjs --light), then:
//   node scripts/record-line.mjs . out.mp4 30 ru      (about 11 minutes for 1 min 48 s of video)
import puppeteer from "puppeteer";
import ffmpeg from "ffmpeg-static";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [site, out, fpsArg = "30", lang = "ru"] = process.argv.slice(2);
const fps = Number(fpsArg);
const svg = readFileSync(`${site}/public/figures/granulation-lines.svg`, "utf8");
const data = JSON.parse(readFileSync(`${site}/src/figures/granulation-lines/figure.json`, "utf8"));
const { TEXT } = await import(pathToFileURL(`${site}/src/figures/granulation-lines/text.js`).href);
const T = TEXT[lang];
const live = readFileSync(`${site}/src/figures/granulation-lines/live.js`, "utf8").replace(/^export /gm, "");
const { width, height, ...rest } = data;
const head = lang === "ru" ? ["НПО «Химмаш»", "Комплекс переработки полиолефиновых отходов ТКО · КПТБО-300", "химмаш24.рф", "Мойка 500 кг/ч · грануляция 300 кг/ч · вода по кругу до 20 раз · принципиальная схема"] : ["NPO Himmash", "KPTBO-300 complex for recycling polyolefin waste", "himmash24.com", "Washing 500 kg/h · pelletizing 300 kg/h · water reused up to 20 times · principal drawing"];
const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
:root{--white:#fff;--line:#d9dfd7;--ink:#202d28;--muted:#5e6b63;--green:#145445;--font-mono:Menlo,monospace}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f3f4ef;font-family:"Helvetica Neue",Arial,sans-serif;color:#202d28}
.top{position:absolute;left:60px;right:60px;top:34px;display:flex;align-items:baseline;gap:28px}
.top b{font-size:34px;letter-spacing:-.01em}.top span{font-size:22px;color:#5e6b63}.top i{margin-left:auto;font-style:normal;font:20px Menlo,monospace;color:#145445}
.anatomy-plate{position:absolute;left:40px;right:40px;top:110px;bottom:80px;background:#fff;border:1px solid #d9dfd7;border-radius:14px;overflow:hidden}
.anatomy-stage{position:absolute;left:0;right:0;top:0;bottom:0}
.anatomy-stage svg{width:100%;height:100%;display:block}
.anatomy-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.foot{position:absolute;left:60px;right:60px;bottom:26px;font:22px Menlo,monospace;color:#5e6b63;letter-spacing:.03em}
.ln-info{left:28px!important;top:28px!important;padding:18px 22px!important;max-width:620px!important}
.ln-info .n{font-size:16px!important}.ln-info b{font-size:38px!important}.ln-info p{font-size:22px!important}.ln-info a{display:none!important}
</style></head><body>
<div class="top"><b>${head[0]}</b><span>${head[1]}</span><i>${head[2]}</i></div>
<div class="anatomy-plate"><div class="anatomy-stage">${svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}<span class="anatomy-live"></span></div></div>
<div class="foot">${head[3]}</div>
<script type="module">${live}
mount(document.querySelector(".anatomy-stage"), { text: ${JSON.stringify({ ...T.live, label: T.label })}, data: ${JSON.stringify(rest)} });
</script></body></html>`;
const page_path = out.replace(/\.mp4$/, ".html");
writeFileSync(page_path, html);
const browser = await puppeteer.launch({ headless: "shell", args: ["--force-device-scale-factor=1"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(page_path).href + "#record", { waitUntil: "load" });
await page.waitForFunction(() => window.__line, { timeout: 20000 });
const enc = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "19", "-movflags", "+faststart", out], { stdio: ["pipe", "ignore", "inherit"] });
const dt = 1 / fps;
const shot = async () => { const buf = await page.screenshot({ type: "jpeg", quality: 92 }); if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r)); };
let frames = 0;
const t0 = Date.now();
const run = async (seconds) => { for (let i = 0; i < Math.round(seconds * fps); i++) { await page.evaluate((d) => window.__line.advance(d), dt); await shot(); frames++; if (frames % 150 === 0) console.log(`${frames} frames · ${((Date.now() - t0) / 1000).toFixed(0)} s`); } };
if (process.env.QUICK) { await run(Number(process.env.QUICK)); await page.evaluate(() => window.__line.story()); await run(Number(process.env.QUICK)); enc.stdin.end(); await new Promise((r) => enc.on('close', r)); await page.screenshot({ path: out.replace(/\.mp4$/, '.png') }); await browser.close(); console.log('quick', frames); process.exit(0); }
await run(7.5);                 // the line starts up on the overview
await page.evaluate(() => window.__line.story());
let guard = 0;
while (!(await page.evaluate(() => window.__line.story_done)) && guard++ < 200) await run(1);
await run(3);                   // back on the whole line
enc.stdin.end();
await new Promise((r) => enc.on("close", r));
await browser.close();
console.log("done", out, frames, "frames");
