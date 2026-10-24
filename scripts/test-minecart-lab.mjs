// MINE CART lab: registered in LABS, builds a self-contained page with the lab markers and no network calls.
// Portrait: the mine shaft covers the extra sky (OY). The day-sky gradient must not leave a band above the scaffold.
// Landscape: the 600x300 frame stays letterboxed (or exact 2:1) and the shaft still covers that frame.
// Run: npm run build:lab && node scripts/test-minecart-lab.mjs
//      node scripts/test-minecart-lab.mjs --shots   (also writes screenshots/minecart-lab/*.png)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { LABS } from "./build-lab.mjs";

assert.ok(LABS.some(([v]) => v === "minecart"), "LABS includes minecart");
const html = readFileSync(new URL("../dist/lab/minecart/index.html", import.meta.url), "utf8");
for (const m of ["FR_LAB='minecart'", "LAB PROTOTYPE", "MINE CART"]) assert.ok(html.includes(m), "missing " + m);
for (const m of ["sendBeacon", "fetch("]) assert.ok(!html.includes(m), "forbidden " + m);
console.log("ok   minecart lab");

const ROOT = dirname(fileURLToPath(import.meta.url));
const SHOTS = process.argv.includes("--shots") ? join(ROOT, "../screenshots/minecart-lab") : "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// Upper shaft, above the portrait title block (~0.22) and clear of the right-hand HUD.
// Day sky is blue-led (b > ~40). The shaft is near-black (#07060a .. #0a0808), including the sparse timber.
const SAMPLE = `(() => {
  const c = document.getElementById("c"), g = c.getContext("2d"), w = c.width, h = c.height;
  const d = g.getImageData(0, 0, w, h).data;
  const wrap = document.getElementById("wrap").getBoundingClientRect();
  function at(xf, yf) {
    const x = Math.min(w - 1, Math.max(0, Math.round(xf * (w - 1))));
    const y = Math.min(h - 1, Math.max(0, Math.round(yf * (h - 1))));
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }
  function kind(r, gc, b, a) {
    if (a < 250) return "empty";
    const mx = Math.max(r, gc, b);
    if (mx >= 165) return "ink";
    if (b > 40 && b > r + 12 && b > gc - 8) return "sky";
    if (mx < 80) return "mine";
    return "other";
  }
  const band = { sky: 0, mine: 0, ink: 0, empty: 0, other: 0, n: 0 };
  const xs = [0.12, 0.28, 0.45, 0.62, 0.78];
  for (let i = 0; i <= 8; i++) {
    const yf = 0.03 + (0.16 - 0.03) * (i / 8);
    for (const xf of xs) {
      band[kind(...at(xf, yf))]++;
      band.n++;
    }
  }
  return {
    cw: w, ch: h, band,
    wrap: { x: wrap.x, y: wrap.y, w: wrap.width, h: wrap.height },
    vw: document.documentElement.clientWidth, vh: window.innerHeight,
  };
})()`;

function serve(pageHtml) {
  const server = createServer((req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    if (p !== "/" && p !== "/index.html") { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(pageHtml);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const VPS = [
  { name: "360x640", width: 360, height: 640, portrait: true },
  { name: "390x844", width: 390, height: 844, portrait: true },
  { name: "844x390", width: 844, height: 390, portrait: false },
  { name: "1280x800", width: 1280, height: 800, portrait: false },
];

const server = await serve(html);
const origin = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
let failed = 0;
const say = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) failed++; };
try {
  for (const vp of VPS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      hasTouch: vp.portrait,
      isMobile: vp.portrait,
    });
    const errs = [];
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(origin, { waitUntil: "load", timeout: 20000 });
    await page.waitForFunction(() => { const c = document.getElementById("c"); return c && c.height > 300; });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(SAMPLE);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, vp.name + ".png") });
    const bg = m.band.n - m.band.ink;
    const sky = bg ? m.band.sky / bg : 1;
    const mine = bg ? m.band.mine / bg : 0;
    if (vp.portrait) {
      say(Math.abs(m.wrap.w - m.vw) <= 1 && Math.abs(m.wrap.h - m.vh) <= 1,
        `${vp.name}: canvas fills the phone (${m.wrap.w}x${m.wrap.h} in ${m.vw}x${m.vh})`);
    } else {
      const aspect = m.wrap.h ? m.wrap.w / m.wrap.h : 0;
      say(Math.abs(aspect - 2) < 0.03 && m.wrap.w <= m.vw + 1 && m.wrap.h <= m.vh + 1,
        `${vp.name}: landscape frame stays 2:1 (${m.wrap.w}x${m.wrap.h} in ${m.vw}x${m.vh})`);
    }
    say(m.band.empty === 0 && sky < 0.05 && mine > 0.9,
      `${vp.name}: upper frame is the mine shaft, not the day sky (sky ${(sky * 100).toFixed(0)}% mine ${(mine * 100).toFixed(0)}% of ${bg}, empty ${m.band.empty}, other ${m.band.other})`);
    say(!errs.length, `${vp.name}: no page errors${errs.length ? " " + errs.join(" | ") : ""}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
if (failed) { console.error(`MINECART LAB TEST FAILED (${failed})`); process.exit(1); }
console.log("ok   minecart lab portrait background");
