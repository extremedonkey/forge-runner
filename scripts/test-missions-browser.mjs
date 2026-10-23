// Missions chips browser test (MISSIONS-2): npm run test:missions-browser (after npm run build; needs `npx playwright install chromium`).
// Serves the site build (dist/index.mjs handler) at / and the Poki build (dist/poki/) at /poki/ on a local server, seeds 3 missions with
// progress (+ a sparks bank so the upgrade row shows) and, at 390x844, 844x390 (touch), 640x360 and 1280x720, on web and Poki:
//   start screen -> start a run -> die (no input) -> game over: Retry is still the first and largest element (Poki: the DOM #rt is
//   above and at least as large as Share / Continue / every upgrade tile; web: no DOM control above the canvas "tap to retry"),
//   and one Space (desktop) or one tap (touch) restarts. Fails on page errors / console errors. Beacons and /api are stubbed.
//   node scripts/test-missions-browser.mjs [--shots <dir>]   saves <target>-<w>x<h>-start.png / -over.png
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POKI = join(ROOT, "dist/poki");
const SDK = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const ai = process.argv.indexOf("--shots"), SHOTS = ai > 0 ? process.argv[ai + 1] : "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const FAKE_SDK = `window.PokiSDK={init:function(){return Promise.resolve()},gameLoadingFinished:function(){},gameplayStart:function(){},
gameplayStop:function(){},commercialBreak:function(){return Promise.resolve()},rewardedBreak:function(){return Promise.resolve(false)},
getURLParam:function(){return ""},shareableURL:function(){return Promise.resolve("")},measure:function(){}};`;
const { handler } = await import(pathToFileURL(join(ROOT, "dist/index.mjs")).href);
const server = createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/poki/")) {
    const rel = u.pathname.slice(6) || "index.html", f = join(POKI, rel);
    if (!f.startsWith(POKI) || !existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); return res.end(readFileSync(f));
  }
  if (u.pathname.startsWith("/api/") || req.method !== "GET") { res.writeHead(204); return res.end(); }
  const r = await handler({ rawPath: u.pathname, requestContext: { http: { method: "GET", path: u.pathname } }, queryStringParameters: Object.fromEntries(u.searchParams), headers: {} });
  res.writeHead(r.statusCode, r.headers || {}); res.end(r.body || "");
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const SEED = { "forge-runner-missions": JSON.stringify({ v: 1, a: [{ id: "jump40", p: 12 }, { id: "sparkT100", p: 37 }, { id: "dist25k", p: 9400 }], n: 5, d: 4, s: 7 }),
  "forge-runner-sparks": JSON.stringify({ v: 1, b: 140, l: { m: 1, c: 0, d: 0, p: 0, r: 0 }, e: 160, n: 5 }) };
const VPS = [{ w: 390, h: 844, touch: true }, { w: 844, h: 390, touch: true }, { w: 640, h: 360 }, { w: 1280, h: 720 }];
const failures = [];
const browser = await chromium.launch();
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0 && r.width > 0 && r.height > 0 }, sel);
try {
  for (const target of ["web", "poki"]) for (const vp of VPS) {
    const name = `${target}-${vp.w}x${vp.h}`, errs = [];
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: vp.touch ? 2 : 1 });
    await ctx.addInitScript((seed) => { if (!sessionStorage.getItem("seeded")) { for (const k in seed) localStorage.setItem(k, seed[k]); sessionStorage.setItem("seeded", "1") } }, SEED);
    await ctx.route("**/*", (route) => {
      const req = route.request(), u = new URL(req.url());
      if (req.url() === SDK) return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK });
      if (req.method() === "POST" || u.searchParams.has("event")) return route.abort();
      if (u.origin !== origin) return route.abort();
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errs.push(`console.error: ${m.text()}`); });
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
    await page.goto(origin + (target === "poki" ? "/poki/" : "/"), { waitUntil: "load" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(700);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}-start.png`) });
    const tapAt = async () => { const b = await page.locator("canvas").first().boundingBox(); await page.touchscreen.tap(b.x + b.width * .5, b.y + b.height * .3) };
    const go = async () => (vp.touch ? tapAt() : page.keyboard.press("Space"));
    await go();                                   // start; then no input: the runner dies on an obstacle
    const overSel = target === "poki" ? "#rt" : "#sh";
    await page.waitForFunction((s) => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== "none" }, overSel, { timeout: 30000 })
      .catch(() => errs.push(`no game over (${overSel} never shown)`));
    await page.waitForTimeout(1000);
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}-over.png`) });
    const boxes = await page.evaluate(() => [...document.querySelectorAll("#wrap button, #wrap .ui")].map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return { id: e.id === "up" ? "up-row" : e.closest("#up") ? "up" : (e.id || e.className), top: r.top, area: r.width * r.height, on: cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0 } }).filter((b) => b.on));
    if (target === "poki") {
      const rt = boxes.find((b) => b.id === "rt");
      if (!rt) errs.push("Retry (#rt) not visible on game over");
      else for (const b of boxes) {
        if (b.id === "rt" || b.id === "mute" || b.id === "toast") continue;   // mute sits under the Pill, top-left (not in the action column)
        // the #up row container is a group, not a target (5 tiles since sparks PR6): only its position counts; each tile is checked on its own
        if (b.id === "up-row") { if (b.top < rt.top) errs.push("up row above Retry"); continue }
        if (b.area > rt.area + 1) errs.push(`${b.id} (${Math.round(b.area)} px²) larger than Retry (${Math.round(rt.area)} px²)`);
        if (b.top < rt.top) errs.push(`${b.id} above Retry`);
      }
    } else {
      // web: the retry prompt is canvas text at the upper middle; only #sh / #up (ground band) and #mute may be visible
      for (const b of boxes) if (!["sh", "mute", "up", "up-row", "toast"].includes(b.id)) errs.push(`unexpected control on game over: ${b.id}`);
    }
    await go();                                   // ONE Space / tap restarts
    await page.waitForTimeout(700);
    const restarted = !(await vis(page, overSel)) && !(await vis(page, "#sh"));
    if (!restarted) errs.push(`one ${vp.touch ? "tap" : "Space"} did not restart`);
    console.log(`${errs.length ? "FAIL" : "ok  "} ${name}: retry first+largest, one ${vp.touch ? "tap" : "Space"} restarts`);
    errs.forEach((e) => console.log(`     ${e}`));
    failures.push(...errs.map((e) => `${name}: ${e}`));
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
if (failures.length) { console.error(`MISSIONS BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("MISSIONS BROWSER TEST PASSED");
