// Level HUD marker browser test: npm run test:lvmarker-browser (after npm run build; needs `npx playwright install chromium`).
// Loads BOTH builds (site at /, Poki from its subpath, fake SDK, beacons and /api aborted) on touch phones and checks the Levels
// HUD marker ("LV2".."LV5"/"MAX", 06d-levels.js lvHud() at lvHudY()):
//  1. Portrait (PZ #66 follow-up): at 360x640, 375x667, 390x844 and 412x915, at main's zoom (ZM 1.35) and #66's (ZM 1.12; the
//     layout's "ZM=tall?..:1" is rewritten in the served script, so both zooms are covered on any branch), the gap between the
//     marker's tight glyph box (actualBoundingBox of the real fillText, recorded where the game canvas draws that text image) and
//     the #mute button's getBoundingClientRect() must be >= 8 CSS px.
//  2. Landscape (Mobile's Poki 844x390 apex shot): at 844x390, 667x375 and 640x360, a held jump (site: also with spring boots,
//     ?pu=j) is sampled every frame. At the apex frame (highest robot body, mapped from the real drawImage through the canvas
//     transform) the marker box (glyph + bar) must either clear the robot box or be drawn faded (alpha <= 0.3); on the ground
//     before the jump it must be drawn at full alpha (>= 0.8).
// Fails on page/console errors or a marker that is never drawn.
//   node scripts/test-lvmarker-browser.mjs [--shots <dir>]   saves <build>-z<zoom>-<w>x<h>.png / <build>[-boots]-<w>x<h>-apex.png
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, POKI_SDK_URL, FAKE_SDK } from "./lib/browser.mjs";

const MIN = 8, FADED = 0.3, FULL = 0.8;
const VPS = [[360, 640], [375, 667], [390, 844], [412, 915]];
const LVPS = [[844, 390], [667, 375], [640, 360]];
const ZOOMS = [1.35, 1.12];
const ai = process.argv.indexOf("--shots"), SHOTS = ai > 0 ? process.argv[ai + 1] : "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ZRE = /ZM=tall\?[A-Za-z0-9_.]+:1/g;

// Tags every txt() cache canvas with its string + the tight glyph box of the fill (cache px). On the game canvas (#c), backing px:
// - the robot's anvil body (drawImage(body, -23, -18, 48, 20) in drawPlayer) -> its box through the current transform, widened to
//   the wheels (local y +13 = the ground in the airborne body frame);
// - each level-marker text image -> glyph box + alpha, and the bar's backing fillRect right after it -> bar box.
// Each marker draw pushes a frame { robot (this frame's, drawn before the HUD), marker box, alpha } to window.__lvf (last 240).
const INSTRUMENT = () => {
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage, fr = P.fillRect;
  window.__lv = null; window.__lvf = []; let rob = null, pend = null;
  const box = (c, pts) => { const t = c.getTransform(), xs = [], ys = [];
    for (const [x, y] of pts) { xs.push(t.a * x + t.c * y + t.e); ys.push(t.b * x + t.d * y + t.f); }
    return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }; };
  P.fillText = function (s, x, y, ...a) {
    const m = this.measureText(s), l = x - m.actualBoundingBoxLeft; // txt() fills its cache left-aligned, alphabetic baseline
    this.canvas.__s = String(s);
    this.canvas.__g = { l, r: x + m.actualBoundingBoxRight, t: y - m.actualBoundingBoxAscent, b: y + m.actualBoundingBoxDescent };
    return ft.call(this, s, x, y, ...a);
  };
  P.drawImage = function (img, x, y, ...a) {
    if (this.canvas.id === "c") {
      if (a.length === 2 && x === -23 && y === -18 && a[0] === 48 && a[1] === 20) rob = box(this, [[-23, -18], [25, -18], [25, 13 / Math.abs(this.getTransform().d / this.getTransform().a || 1)], [-23, 13]]);
      if (img && img.__g && a.length === 0 && /^(LV[2-5]|MAX)$/.test(img.__s)) {
        const g = img.__g; window.__lv = { s: img.__s, l: x + g.l, r: x + g.r, t: y + g.t, b: y + g.b, a: this.globalAlpha, at: performance.now() };
        pend = { m: { ...window.__lv }, robot: rob }; rob = null;
      }
    }
    return di.call(this, img, x, y, ...a);
  };
  P.fillRect = function (x, y, w, h) {
    if (pend && this.canvas.id === "c") {
      const b = box(this, [[x, y], [x + w, y + h]]), m = pend.m;
      const f = { ...pend, box: { l: Math.min(m.l, b.l), r: Math.max(m.r, b.r), t: Math.min(m.t, b.t), b: Math.max(m.b, b.b) }, a: m.a, at: m.at };
      pend = null; window.__lvf.push(f); if (window.__lvf.length > 240) window.__lvf.shift();
    }
    return fr.call(this, x, y, w, h);
  };
};

async function open(browser, build, w, h, z, query = "") {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
    userAgent: devices["iPhone 13"].userAgent });
  await ctx.addInitScript(() => { try { Object.defineProperty(navigator, "sendBeacon", { value: () => true, configurable: true }); } catch {} });
  await ctx.addInitScript(INSTRUMENT);
  const st = { hits: 0 };
  await ctx.route("**/*", async (route) => {
    const req = route.request(), u = new URL(req.url());
    if (req.url() === POKI_SDK_URL) return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK });
    if (req.method() === "POST" || u.searchParams.has("event") || u.pathname.startsWith("/api/")) return route.abort();
    if (z && (u.pathname === "/" || u.pathname.endsWith("/game.js"))) {
      const r = await route.fetch(), body = await r.text();
      return route.fulfill({ response: r, body: body.replace(ZRE, () => { st.hits++; return `ZM=tall?${z}:1`; }) });
    }
    return route.continue();
  });
  const page = await ctx.newPage(), errs = [];
  page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/i.test(m.text())) errs.push(`console.error: ${m.text()}`); });
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  await page.goto((build === "site" ? srv.site : srv.poki) + query, { waitUntil: "load" });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
  return { ctx, page, errs, st };
}

const srv = await serveBuilds();
const browser = await chromium.launch();
const failures = [], rows = [];
try {
  // 1. portrait: marker glyph box vs #mute
  for (const build of ["site", "poki"]) for (const z of ZOOMS) for (const [w, h] of VPS) {
    const tag = `${build} ZM ${z} ${w}x${h}`;
    const { ctx, page, errs, st } = await open(browser, build, w, h, z);
    if (!st.hits) failures.push(`${tag}: portrait zoom rewrite found no "ZM=tall?..:1" in the served script`);
    await page.touchscreen.tap(Math.round(w / 2), Math.round(h * 0.6));
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const c = document.getElementById("c"), cr = c.getBoundingClientRect(), k = cr.width / c.width, lv = window.__lv;
      const mu = document.getElementById("mute").getBoundingClientRect(), pb = document.getElementById("pb");
      if (!lv || performance.now() - lv.at > 200) return { none: true };
      const g = { l: cr.left + lv.l * k, r: cr.left + lv.r * k, t: cr.top + lv.t * k, b: cr.top + lv.b * k };
      // rect separation: the larger of the horizontal and vertical gaps (negative = overlap)
      const sep = (a, b) => Math.max(a.l - b.right, b.left - a.r, a.t - b.bottom, b.top - a.b);
      const pr = pb && getComputedStyle(pb).display !== "none" ? pb.getBoundingClientRect() : null;
      return { s: lv.s, g, mute: { l: mu.left, t: mu.top, r: mu.right, b: mu.bottom }, gap: sep(g, mu), pgap: pr ? sep(g, pr) : null };
    });
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${build}-z${z}-${w}x${h}.png`) });
    if (m.none) failures.push(`${tag}: level marker not drawn during the run`);
    else {
      rows.push(`${tag.padEnd(28)} ${m.s}  glyph top ${m.g.t.toFixed(1)}  mute bottom ${m.mute.b.toFixed(1)}  gap ${m.gap.toFixed(1)} px` +
        (m.pgap != null ? `  (pause ${m.pgap.toFixed(1)})` : ""));
      if (!(m.gap >= MIN)) failures.push(`${tag}: LV marker ${m.gap.toFixed(1)} px from mute (< ${MIN})`);
    }
    for (const e of errs) failures.push(`${tag}: ${e}`);
    await ctx.close();
  }
  // 2. landscape: held jump, marker vs robot at the apex
  for (const [build, boots] of [["site", false], ["site", true], ["poki", false]]) for (const [w, h] of LVPS) {
    const tag = `${build}${boots ? "+boots" : ""} ${w}x${h}`;
    const { ctx, page, errs } = await open(browser, build, w, h, 0, boots ? "?pu=j" : "");
    await page.touchscreen.tap(Math.round(w / 2), Math.round(h * 0.6));
    await page.waitForTimeout(700);
    const g0 = await page.evaluate(() => { const f = window.__lvf.at(-1); window.__lvf = []; return f ? f.a : null; });
    await page.keyboard.down("Space"); await page.waitForTimeout(boots ? 700 : 600); await page.keyboard.up("Space");
    const r = await page.evaluate(() => {
      const c = document.getElementById("c"), cr = c.getBoundingClientRect(), k = cr.width / c.width;
      const fs = window.__lvf.filter((f) => f.robot);
      if (!fs.length) return null;
      const ap = fs.reduce((a, f) => (f.robot.t < a.robot.t ? f : a));
      const css = (b) => ({ l: cr.left + b.l * k, r: cr.left + b.r * k, t: cr.top + b.t * k, b: cr.top + b.b * k });
      const R = css(ap.robot), M = css(ap.box);
      return { R, M, a: ap.a, n: fs.length, sep: Math.max(M.l - R.r, R.l - M.r, M.t - R.b, R.t - M.b), lift: css(fs[0].robot).t - R.t };
    });
    if (SHOTS) {
      // re-jump and grab the apex on screen
      await page.waitForTimeout(400); await page.keyboard.down("Space"); await page.waitForTimeout(boots ? 380 : 330);
      await page.screenshot({ path: join(SHOTS, `${build}${boots ? "-boots" : ""}-${w}x${h}-apex.png`) }); await page.keyboard.up("Space");
    }
    if (g0 == null || !r) failures.push(`${tag}: level marker / robot not drawn during the run`);
    else {
      rows.push(`${tag.padEnd(28)} apex: robot top ${r.R.t.toFixed(1)} (lift ${r.lift.toFixed(0)})  marker ${r.M.l.toFixed(0)}..${r.M.r.toFixed(0)} x ${r.M.t.toFixed(1)}..${r.M.b.toFixed(1)}` +
        `  sep ${r.sep.toFixed(1)} px  alpha ${r.a.toFixed(2)} (ground ${g0.toFixed(2)})`);
      if (r.lift < 20) failures.push(`${tag}: the jump didn't happen (robot lift ${r.lift.toFixed(0)} px)`);
      if (r.sep < 0 && !(r.a <= FADED)) failures.push(`${tag}: robot overlaps the LV marker at the apex by ${(-r.sep).toFixed(1)} px and the marker is not faded (alpha ${r.a.toFixed(2)})`);
      if (!(g0 >= FULL)) failures.push(`${tag}: marker dimmed (alpha ${g0.toFixed(2)}) with the robot on the ground`);
    }
    for (const e of errs) failures.push(`${tag}: ${e}`);
    await ctx.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log(rows.join("\n"));
if (failures.length) { console.error(failures.join("\n")); console.error(`LV MARKER BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("LV MARKER BROWSER TEST PASSED");
