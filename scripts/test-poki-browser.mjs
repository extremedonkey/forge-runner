// Poki build browser test: npm run test:poki-browser (after npm run build; needs `npx playwright install chromium`).
// Serves dist/poki/ from a SUBPATH (/games/forge-runner/v1/) on a local static server and loads it in Chromium twice:
//   1. with a fake PokiSDK at the SDK URL (hermetic: no request to game-cdn.poki.com), and
//   2. with the SDK blocked (ad blocker / offline): the game must still run.
// Fails on page errors, console errors, non-200 assets, requests to absolute "/" asset paths, a missing canvas, or wrong flags.
// The game's own requests (play beacon POST ?event=, leaderboard /api/*) are aborted and FAIL the test (removed in POKI-3).
// POKI-4: loads with ?c=&n=&demo=&pu=&utm_*, lets the runner die, clicks Share: the share link must come from
// PokiSDK.shareableURL({c}) (score only), the challenge from PokiSDK.getURLParam('c'), and no pid/UTM/name key may be stored.
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
rewardedBreak:function(){__pokiCalls.push("rewardedBreak");return Promise.resolve(false)},
getURLParam:function(k){__pokiCalls.push("getURLParam:"+k);return new URLSearchParams(location.search).get(k)||""},
shareableURL:function(o){__pokiCalls.push("shareableURL:"+JSON.stringify(o));return Promise.resolve("https://poki.com/en/g/forge-runner?gdc="+o.c)},
measure:function(c,w,a){__pokiCalls.push("measure:"+[c,w,a].join("/"))}};`;
// POKI-4: loaded with the site's URL switches and a named challenge; none of them may have an effect but ?c= (score only)
const QUERY = "?c=742&n=Bob&demo=1&pu=s&utm_source=test&utm_campaign=x";

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
    const resp = await page.goto(origin + BASE + QUERY, { waitUntil: "load" });
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
    // POKI-4: die (no input), then Share: score only through PokiSDK.shareableURL; no pid/UTM/name keys; no name prompt
    await page.locator("#sh").waitFor({ state: "visible", timeout: 30000 }).catch(() => errs.push("Share button not shown after death"));
    await page.locator("#sh").click({ timeout: 2000 }).catch(() => errs.push("Share button not clickable"));
    await page.waitForTimeout(300);
    const p4 = await page.evaluate(() => ({ keys: Object.keys(localStorage), np: !!document.getElementById("np"), calls: window.__pokiCalls || [] }));
    const badKeys = p4.keys.filter((k) => /pid|utm|name/.test(k));
    if (badKeys.length) errs.push(`localStorage keys in the Poki build: ${badKeys.join(", ")}`);
    if (p4.np) errs.push("name prompt #np present");
    if (mode === "fake-sdk") {
      const sh = p4.calls.filter((c) => c.startsWith("shareableURL:"));
      if (!p4.calls.includes("getURLParam:c")) errs.push("challenge not read via PokiSDK.getURLParam('c')");
      if (sh.length !== 1 || !/^shareableURL:\{"c":"\d+"\}$/.test(sh[0])) errs.push(`share: expected one shareableURL({c}) call, got ${JSON.stringify(sh)}`);
      if (!p4.calls.includes("measure:button/share/interact")) errs.push("PokiSDK.measure('button','share','interact') not called");
    }
    // POKI-7: rewarded 🎬 Continue / Double are OFF by default: no 🎬 button in the DOM, no rewardedBreak call after a death
    const rw = await page.evaluate(() => ({ btn: document.querySelectorAll("#cn,#db,.rw").length, txt: document.body.textContent.includes("🎬") }));
    if (rw.btn || rw.txt) errs.push(`rewarded OFF: found ${rw.btn} 🎬 button(s) in the DOM`);
    if (p4.calls.includes("rewardedBreak")) errs.push("rewarded OFF: PokiSDK.rewardedBreak was called");
    console.log(`     POKI-4: keys=${p4.keys.join(",") || "-"} calls=${p4.calls.filter((c) => !/^(init|gameplay|gameLoading)/.test(c)).join(" ") || "-"}`);
    assets.filter((a) => !a.startsWith("200 ")).forEach((a) => errs.push(`asset ${a}`));
    console.log(`${errs.length ? "FAIL" : "ok  "} ${mode}: FR_BUILD=${flags.build} FR_ADS_CONFIG=${JSON.stringify(flags.ads)} adapter backend=${flags.backend}`);
    console.log(`     assets: ${assets.join(", ")}`);
    // POKI-3: the Poki build makes no play-beacon or leaderboard requests at all
    [...new Set(game)].forEach((g) => errs.push(`game request (beacon/leaderboard) in the Poki build: ${g}`));
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
