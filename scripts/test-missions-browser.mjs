// Missions chips browser test (MISSIONS-2): npm run test:missions-browser (after npm run build; needs `npx playwright install chromium`).
// Serves the site build (dist/index.mjs handler) at / and the Poki build (dist/poki/) at /poki/ on a local server, seeds 3 missions with
// progress (+ a sparks bank (the upgrade row is pit-stop only since 25 Oct 2026, so none shows here), + a 5-digit HI) and, at 390x844, 360x800, 844x390 (touch), 640x360 and 1280x720, on
//   web and Poki (Poki game over: the chip row, read from the canvas pixels, stays left of / clear of the HUD score + HI):
//   start screen -> start a run -> die (no input) -> game over: Retry is still the first and largest element (Poki: the DOM #rt is
//   above and at least as large as Share / Continue / every upgrade tile; web: no DOM control above the canvas "tap to retry"),
//   and one Space (desktop) or one tap (touch) restarts. Fails on page errors / console errors. Beacons and /api are stubbed.
//   MISSIONS-7: at 390x844 (Poki + web) a mission completing at death leaves no toast on the game-over screen.
//   node scripts/test-missions-browser.mjs [--shots <dir>]   saves <target>-<w>x<h>-start.png / -over.png (+ late-<target>-390x844-over.png)
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
const VPS = [{ w: 390, h: 844, touch: true }, { w: 360, h: 800, touch: true }, { w: 844, h: 390, touch: true }, { w: 640, h: 360 }, { w: 1280, h: 720 }];
// MISSIONS-4: a 5-digit HI (pad() always prints 5 digits, so this is the widest the HUD gets) on every game over
SEED["forge-runner-hi"] = "12345";
// chip row + HUD (score/HI) boxes, recorded from the real canvas calls (backing-store px): an init script tags each txt() cache canvas
// with the string drawn into it (fillText) and records where the game canvas draws the "HI 12345" / "00051" images (drawImage), and
// every chip box (fillRect with the chip fill rgba(5,7,13,.78), mapped through the current transform). Latest frame only.
const INSTRUMENT = () => {
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage, fr = P.fillRect;
  window.__ms = { chips: [], hud: {}, toast: [] };
  // MISSIONS-7: every mission-toast draw ("\u2726+N  label") on the game canvas, flagged if a game-over screen (#rt / #sh) was up
  const toastAt = () => { const e = document.querySelector(location.pathname.startsWith("/poki/") ? "#rt" : "#sh"); window.__ms.toast.push({ at: performance.now(), over: !!e && getComputedStyle(e).display !== "none" }) };
  P.fillText = function (s, ...a) { this.canvas.__s = String(s); if (this.canvas.id === "c" && /^\u2726\+/.test(this.canvas.__s)) toastAt(); return ft.call(this, s, ...a) };
  P.drawImage = function (img, x, y, ...a) {
    if (img && img.__s && this.canvas.id === "c" && /^\u2726\+/.test(img.__s)) toastAt();
    if (img && img.__s && this.canvas.id === "c" && a.length === 0 && (/^HI \d{5}$/.test(img.__s) || /^\d{5}$/.test(img.__s)))
      window.__ms.hud[/^HI/.test(img.__s) ? "hi" : "score"] = { l: x, r: x + img.width, t: y, b: y + img.height, s: img.__s, at: performance.now() };
    return di.call(this, img, x, y, ...a);
  };
  P.fillRect = function (x, y, w, h) {
    if (this.canvas.id === "c" && String(this.fillStyle).replace(/\s/g, "") === "rgba(5,7,13,0.78)") {
      const m = this.getTransform(), now = performance.now();
      window.__ms.chips = window.__ms.chips.filter((r) => now - r.at < 8).concat([{ l: m.a * x + m.e, r: m.a * (x + w) + m.e, t: m.d * y + m.f, b: m.d * (y + h) + m.f, at: now }]);
    }
    return fr.call(this, x, y, w, h);
  };
};
const measure = (page) => page.evaluate(() => {
  const c = window.__ms.chips, h = window.__ms.hud;
  if (!c.length || !h.hi || !h.score) return null;
  return { n: c.length, chip: { l: Math.min(...c.map((r) => r.l)), r: Math.max(...c.map((r) => r.r)), t: Math.min(...c.map((r) => r.t)), b: Math.max(...c.map((r) => r.b)) },
    hud: { l: Math.min(h.hi.l, h.score.l), r: Math.max(h.hi.r, h.score.r), t: Math.min(h.hi.t, h.score.t), b: Math.max(h.hi.b, h.score.b), hi: h.hi.s, score: h.score.s },
    W: document.querySelector("canvas").width, H: document.querySelector("canvas").height };
});
const failures = [];
const browser = await chromium.launch();
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0 && r.width > 0 && r.height > 0 }, sel);
try {
  for (const target of ["web", "poki"]) for (const vp of VPS) {
    const name = `${target}-${vp.w}x${vp.h}`, errs = [];
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: vp.touch ? 2 : 1 });
    await ctx.addInitScript(INSTRUMENT);
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
    if (target === "poki") {
      const m = await measure(page);
      if (!m) errs.push("chip row or HUD score/HI not drawn on game over");
      else {
        if (m.hud.hi !== "HI 12345") errs.push(`HUD shows ${m.hud.hi}, expected the 5-digit HI 12345`);
        if (m.n !== 3) errs.push(`${m.n} chips drawn`);
        const overlapY = m.chip.t <= m.hud.b && m.chip.b >= m.hud.t;
        // portrait (MISSIONS-4; Mobile: since the Poki chips moved below the mute/HI row, under Retry): the row must end above the
        // HUD's top or start below its bottom (or, if it ever shares the HUD band, end left of the HUD's left edge); and it must
        // clear the mute button, the Poki Pill zone and Retry
        if (vp.h > vp.w && !(m.chip.b < m.hud.t || m.chip.t > m.hud.b || m.chip.r < m.hud.l)) errs.push(`portrait: chip row (${m.chip.l}-${m.chip.r} x ${m.chip.t}-${m.chip.b}) not clear of the HUD (${m.hud.l}+ x ${m.hud.t}-${m.hud.b})`);
        const dom = await page.evaluate(() => { const k = document.querySelector("canvas").width / document.querySelector("canvas").getBoundingClientRect().width, cr = document.querySelector("canvas").getBoundingClientRect();
          return ["#mute", "#rt"].map((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.width ? { s, l: (r.left - cr.left) * k, r: (r.right - cr.left) * k, t: (r.top - cr.top) * k, b: (r.bottom - cr.top) * k } : null }).filter(Boolean)
            .concat([{ s: "Poki Pill zone", l: -cr.left * k, r: (46 - cr.left) * k, t: (24 - cr.top) * k, b: (86 - cr.top) * k }]) });
        for (const d of dom) if (m.chip.l < d.r && m.chip.r > d.l && m.chip.t < d.b && m.chip.b > d.t) errs.push(`chip row overlaps ${d.s}`);
        if (overlapY && !(m.chip.r < m.hud.l)) errs.push(`chip row overlaps the HUD`);
        console.log(`     ${name}: chips x ${Math.round(m.chip.l)}-${Math.round(m.chip.r)} y ${Math.round(m.chip.t)}-${Math.round(m.chip.b)} | HUD "${m.hud.hi}" "${m.hud.score}" x ${Math.round(m.hud.l)}-${Math.round(m.hud.r)} y ${Math.round(m.hud.t)}-${Math.round(m.hud.b)} (canvas ${m.W}x${m.H})`);
      }
    }
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
  // MISSIONS-7 (toast over game over): a mission completing at the very end of a run (here 'Survive 30 s', seeded at 30 so the
  // run-end judgement completes it at death, the same path every survive/distance/level completion takes) must not leave its
  // toast on the game-over screen: no toast draw while #rt / #sh is up, yet the mission did complete (d 4 -> 5)
  for (const target of ["poki", "web"]) {
    const vp = { w: 390, h: 844 }, name = `late-${target}-${vp.w}x${vp.h}`, errs = [];
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(INSTRUMENT);
    const seed = { ...SEED, "forge-runner-missions": JSON.stringify({ v: 1, a: [{ id: "surv30", p: 30 }, { id: "sparkT100", p: 37 }, { id: "dist25k", p: 9400 }], n: 5, d: 4, s: 7 }) };
    await ctx.addInitScript((sd) => { if (!sessionStorage.getItem("seeded")) { for (const k in sd) localStorage.setItem(k, sd[k]); sessionStorage.setItem("seeded", "1") } }, seed);
    await ctx.route("**/*", (route) => {
      const req = route.request(), u = new URL(req.url());
      if (req.url() === SDK) return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK });
      if (req.method() === "POST" || u.searchParams.has("event") || u.origin !== origin) return route.abort();
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
    await page.goto(origin + (target === "poki" ? "/poki/" : "/"), { waitUntil: "load" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(700);
    const b = await page.locator("canvas").first().boundingBox(); await page.touchscreen.tap(b.x + b.width * .5, b.y + b.height * .3);
    const overSel = target === "poki" ? "#rt" : "#sh";
    await page.waitForFunction((s) => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== "none" }, overSel, { timeout: 30000 })
      .catch(() => errs.push(`no game over (${overSel} never shown)`));
    await page.waitForTimeout(200);                                       // while a toast would still be up (unfixed: until 1.5 s)
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}-over.png`) });
    await page.waitForTimeout(1400);
    const r = await page.evaluate(() => ({ toast: window.__ms.toast, st: JSON.parse(localStorage.getItem("forge-runner-missions") || "{}") }));
    if (r.st.d !== 5) errs.push(`late mission did not complete (d=${r.st.d})`);
    const bad = r.toast.filter((t) => t.over).length;
    if (bad) errs.push(`mission toast drawn on ${bad} game-over frame(s)`);
    console.log(`${errs.length ? "FAIL" : "ok  "} ${name}: mission completed at death, no toast on the game-over screen`);
    errs.forEach((e) => console.log(`     ${e}`));
    failures.push(...errs.map((e) => `${name}: ${e}`));
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
if (failures.length) { console.error(`MISSIONS BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("MISSIONS BROWSER TEST PASSED");
