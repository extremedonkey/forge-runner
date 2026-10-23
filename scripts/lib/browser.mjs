// Shared helpers for the local browser tests (scripts/test-canvas.mjs, scripts/test-sparks-browser.mjs) and scripts/smoke.mjs.
// - serveBuilds(): one local static server for BOTH build targets (after `npm run build`):
//     /                         -> the site page (FR_BUILD='site'), rendered by the built Lambda handler (dist/index.mjs)
//     /games/forge-runner/v1/   -> dist/poki/ (FR_BUILD='poki'), served from a subpath like Poki does
// - FAKE_SDK / POKI_SDK_URL: hermetic Poki SDK stub (no request to game-cdn.poki.com).
// - newContext(): a Playwright context that never pollutes stats: beacons (POST, ?event=) and /api/* are aborted, the Poki SDK
//   is stubbed, console/page errors are collected.
// - DETERMINISTIC_INIT(seed): init script for seeded, fixed-time rendering (see scripts/test-canvas.mjs).
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { devices } from "playwright";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const POKI_BASE = "/games/forge-runner/v1/";
export const POKI_SDK_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

export const FAKE_SDK = `window.__pokiCalls=[];window.PokiSDK={init:function(){__pokiCalls.push("init");return Promise.resolve()},
gameLoadingFinished:function(){__pokiCalls.push("gameLoadingFinished")},gameplayStart:function(){__pokiCalls.push("gameplayStart")},
gameplayStop:function(){__pokiCalls.push("gameplayStop")},commercialBreak:function(){__pokiCalls.push("commercialBreak");return Promise.resolve()},
rewardedBreak:function(){return Promise.resolve(false)},
getURLParam:function(k){return new URLSearchParams(location.search).get(k)||""},
shareableURL:function(o){return Promise.resolve("https://poki.com/en/g/forge-runner?gdc="+o.c)},
measure:function(){}};`;

export const VIEWPORTS = [
  { name: "portrait-390x844", width: 390, height: 844, touch: true },
  { name: "landscape-844x390", width: 844, height: 390, touch: true },
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
];

export async function serveBuilds() {
  const POKI = join(ROOT, "dist/poki");
  if (!existsSync(join(ROOT, "dist/index.mjs")) || !existsSync(join(POKI, "index.html"))) throw new Error("run `npm run build` first");
  const { handler } = await import(pathToFileURL(join(ROOT, "dist/index.mjs")).href + `?t=${Date.now()}`);
  const site = (await handler({ requestContext: { http: { method: "GET" } }, queryStringParameters: {} })).body;
  const server = createServer((req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    if (p === "/") { res.writeHead(200, { "content-type": TYPES[".html"] }); return res.end(site); }
    if (!p.startsWith(POKI_BASE)) { res.writeHead(404); return res.end("not found"); }
    const rel = p.slice(POKI_BASE.length) || "index.html";
    const f = join(POKI, rel);
    if (!f.startsWith(POKI) || !existsSync(f)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    res.end(readFileSync(f));
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { site: origin + "/", poki: origin + POKI_BASE, close: () => new Promise((r) => server.close(r)) };
}

// opts: { init: [scripts], throwStorage, deviceScaleFactor }
export async function newContext(browser, vp, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: opts.deviceScaleFactor ?? (vp.touch ? 3 : 1),
    userAgent: vp.touch ? devices["iPhone 13"].userAgent : undefined,
  });
  await ctx.addInitScript(() => {
    window.__frBeacons = 0;
    try { Object.defineProperty(navigator, "sendBeacon", { value: () => { window.__frBeacons++; return true; }, configurable: true }); } catch {}
  });
  if (opts.throwStorage) {
    // incognito / blocked storage: every localStorage access throws (Safari private mode, cookies blocked)
    await ctx.addInitScript(() => {
      const no = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
      Object.defineProperty(window, "localStorage", { get: no, configurable: true });
    });
  }
  for (const s of opts.init || []) await ctx.addInitScript(s);
  const stats = { blocked: 0 };
  await ctx.route("**/*", (route) => {
    const req = route.request(), u = new URL(req.url());
    if (req.url() === POKI_SDK_URL) return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK });
    // Beacons (POST /?event=) and the leaderboard API are never hit by tests: aborted (stubbed) at the network layer.
    if (req.method() === "POST" || u.searchParams.has("event") || u.pathname.startsWith("/api/")) { stats.blocked++; return route.abort(); }
    return route.continue();
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/i.test(m.text())) errs.push(`console.error: ${m.text()}`); });
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  return { ctx, page, errs, stats };
}

export function withQuery(url, q) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.href;
}

// Seeded, fixed-time page: Math.random = mulberry32(seed); performance.now()/Date.now() and requestAnimationFrame are driven
// only by window.__frStep(n) (n frames of 1/60 s); canvas text is drawn as font-independent per-glyph bars (system fonts
// differ between machines); sound is muted (fr_snd2=0) so the audio code never draws random numbers.
export const DETERMINISTIC_INIT = (seed) => `(() => {
  let s = ${seed >>> 0};
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000; const T0 = Date.UTC(2026, 9, 23, 0, 0, 0);
  performance.now = () => now; Date.now = () => T0 + Math.round(now);
  let q = [], id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((e) => e[0] !== i); };
  window.__frStep = (n) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const e of c) e[1](now); } return now; };
  const P = CanvasRenderingContext2D.prototype, px = (f) => +((/([\\d.]+)px/.exec(f) || [0, 10])[1]);
  P.measureText = function (t) { const p = px(this.font); return { width: String(t).length * p * 0.6, actualBoundingBoxAscent: p * 0.8, actualBoundingBoxDescent: p * 0.2 }; };
  P.fillText = function (t, x, y) {
    const str = String(t), p = px(this.font), cw = p * 0.6, w = str.length * cw;
    let x0 = x; if (this.textAlign === "center") x0 -= w / 2; else if (this.textAlign === "right" || this.textAlign === "end") x0 -= w;
    for (let i = 0; i < str.length; i++) { const h = p * (0.3 + (str.charCodeAt(i) % 7) / 10); this.fillRect(Math.round(x0 + i * cw), Math.round(y - h), Math.max(1, Math.round(cw - 1)), Math.round(h)); }
  };
  P.strokeText = function () {};
  try { localStorage.setItem("fr_snd2", "0"); } catch (e) {}
})();`;
