// Poki build browser test: npm run test:poki-browser (after npm run build; needs `npx playwright install chromium`).
// Serves dist/poki/ from a SUBPATH (/games/forge-runner/v1/) on a local static server and loads it in Chromium twice:
//   1. with a fake PokiSDK at the SDK URL (hermetic: no request to game-cdn.poki.com), and
//   2. with the SDK blocked (ad blocker / offline): the game must still run.
// Fails on page errors, console errors, non-200 assets, requests to absolute "/" asset paths, a missing canvas, or wrong flags.
// The game's own requests (play beacon POST ?event=, leaderboard /api/*) are aborted and listed; POKI-3 removes them.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POKI = join(ROOT, "dist/poki");
const BASE = "/games/forge-runner/v1/";
const SDK = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const FAKE_SDK = `window.__pokiCalls=[];window.PokiSDK={init:function(){__pokiCalls.push("init");return Promise.resolve()},
gameLoadingFinished:function(){__pokiCalls.push("gameLoadingFinished")},gameplayStart:function(){__pokiCalls.push("gameplayStart")},
gameplayStop:function(){__pokiCalls.push("gameplayStop")},commercialBreak:function(){return Promise.resolve()},
rewardedBreak:function(){return Promise.resolve(false)}};`;

const server = createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end("outside base"); }
  const rel = p.slice(BASE.length) || "index.html";
  const f = join(POKI, rel.endsWith("/") ? rel + "index.html" : rel);
  if (!f.startsWith(POKI) || !existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const browser = await chromium.launch();
try {
  for (const mode of ["fake-sdk", "sdk-blocked"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const errs = [], game = [], assets = [];
    await ctx.route("**/*", (route) => {
      const req = route.request(), u = new URL(req.url());
      if (req.url() === SDK) return mode === "fake-sdk" ? route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK }) : route.abort();
      if (req.method() === "POST" || u.searchParams.has("event") || u.pathname.startsWith("/api/")) { game.push(`${req.method()} ${u.pathname}${u.search}`); return route.abort(); }
      if (u.origin !== origin) { errs.push(`unexpected external request: ${req.url()}`); return route.abort(); }
      if (!u.pathname.startsWith(BASE)) errs.push(`absolute-path request outside the subpath: ${u.pathname}`);
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errs.push(`console.error: ${m.text()}`); });
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
    page.on("response", (r) => { if (r.url().startsWith(origin)) assets.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    const resp = await page.goto(origin + BASE, { waitUntil: "load" });
    if (resp?.status() !== 200) errs.push(`HTTP ${resp?.status()}`);
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 10000 }).catch(() => errs.push("no visible <canvas>"));
    const flags = await page.evaluate(() => ({ build: window.FR_BUILD, ads: window.FR_ADS_CONFIG,
      adapter: typeof window.FRAds === "object" && typeof window.FRAds.create === "function",
      backend: window.FRAds ? window.FRAds.create(window.FR_ADS_CONFIG).backend : null, sdk: !!window.PokiSDK }));
    if (flags.build !== "poki") errs.push(`FR_BUILD=${flags.build}`);
    if (!flags.ads || flags.ads.enabled !== true || flags.ads.backend !== "poki") errs.push(`FR_ADS_CONFIG=${JSON.stringify(flags.ads)}`);
    if (!flags.adapter || flags.backend !== "poki") errs.push(`adapter missing or backend=${flags.backend}`);
    if (flags.sdk !== (mode === "fake-sdk")) errs.push(`PokiSDK present=${flags.sdk} in mode ${mode}`);
    await page.keyboard.press("Space"); await page.waitForTimeout(400);
    await page.keyboard.down("Space"); await page.waitForTimeout(150); await page.keyboard.up("Space");
    await page.waitForTimeout(2000);
    const st = await page.evaluate(() => { const c = document.querySelector("canvas"); return !!c && c.width > 0 && c.height > 0 });
    if (!st) errs.push("canvas missing or zero-sized after run start");
    assets.filter((a) => !a.startsWith("200 ")).forEach((a) => errs.push(`asset ${a}`));
    console.log(`${errs.length ? "FAIL" : "ok  "} ${mode}: FR_BUILD=${flags.build} FR_ADS_CONFIG=${JSON.stringify(flags.ads)} adapter backend=${flags.backend}`);
    console.log(`     assets: ${assets.join(", ")}`);
    if (game.length) console.log(`     game requests aborted (POKI-3 removes them): ${[...new Set(game)].join(", ")}`);
    errs.forEach((e) => console.log(`     ${e}`));
    failures.push(...errs.map((e) => `${mode}: ${e}`));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) { console.error(`POKI BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("POKI BROWSER TEST PASSED");
