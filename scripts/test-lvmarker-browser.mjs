// Level HUD marker vs mute browser test: npm run test:lvmarker-browser (after npm run build; needs `npx playwright install chromium`).
// PZ #66 follow-up: in portrait the Levels HUD marker ("LV2".."LV5"/"MAX", 06d-levels.js lvHud() at lvHudY()) sat ~4.5-5 CSS px
// below the mute button. This loads BOTH builds (site at /, Poki from its subpath, fake SDK, beacons and /api aborted) at
// 360x640, 375x667, 390x844 and 412x915 (touch), at the portrait zoom of main (ZM 1.35) and of #66 (ZM 1.12; the layout's
// "ZM=tall?..:1" is rewritten in the served script, so the test covers both zooms on any branch), starts a run with a tap and
// measures, in CSS px, the gap between the marker's tight glyph box (actualBoundingBox of the real fillText, recorded where the
// game canvas draws that text image) and the #mute button's getBoundingClientRect(). Fails if any gap is < 8 px, the marker is
// never drawn, the zoom rewrite misses, or on page/console errors.
//   node scripts/test-lvmarker-browser.mjs [--shots <dir>]   saves <build>-z<zoom>-<w>x<h>.png of each running HUD
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, POKI_SDK_URL, FAKE_SDK } from "./lib/browser.mjs";

const MIN = 8;
const VPS = [[360, 640], [375, 667], [390, 844], [412, 915]];
const ZOOMS = [1.35, 1.12];
const ai = process.argv.indexOf("--shots"), SHOTS = ai > 0 ? process.argv[ai + 1] : "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const ZRE = /ZM=tall\?[A-Za-z0-9_.]+:1/g;

// tags every txt() cache canvas with its string + the tight glyph box of the fill (cache px), then records where the game canvas
// (#c) draws a level-marker image (backing px). Latest draw only.
const INSTRUMENT = () => {
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, di = P.drawImage;
  window.__lv = null;
  P.fillText = function (s, x, y, ...a) {
    const m = this.measureText(s), l = x - m.actualBoundingBoxLeft; // txt() fills its cache left-aligned, alphabetic baseline
    this.canvas.__s = String(s);
    this.canvas.__g = { l, r: x + m.actualBoundingBoxRight, t: y - m.actualBoundingBoxAscent, b: y + m.actualBoundingBoxDescent };
    return ft.call(this, s, x, y, ...a);
  };
  P.drawImage = function (img, x, y, ...a) {
    if (img && img.__g && this.canvas.id === "c" && a.length === 0 && /^(LV[2-5]|MAX)$/.test(img.__s)) {
      const g = img.__g; window.__lv = { s: img.__s, l: x + g.l, r: x + g.r, t: y + g.t, b: y + g.b, at: performance.now() };
    }
    return di.call(this, img, x, y, ...a);
  };
};

const srv = await serveBuilds();
const browser = await chromium.launch();
const failures = [], rows = [];
try {
  for (const build of ["site", "poki"]) for (const z of ZOOMS) for (const [w, h] of VPS) {
    const tag = `${build} ZM ${z} ${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
      userAgent: devices["iPhone 13"].userAgent });
    await ctx.addInitScript(() => { try { Object.defineProperty(navigator, "sendBeacon", { value: () => true, configurable: true }); } catch {} });
    await ctx.addInitScript(INSTRUMENT);
    let hits = 0;
    await ctx.route("**/*", async (route) => {
      const req = route.request(), u = new URL(req.url());
      if (req.url() === POKI_SDK_URL) return route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_SDK });
      if (req.method() === "POST" || u.searchParams.has("event") || u.pathname.startsWith("/api/")) return route.abort();
      if (u.pathname === "/" || u.pathname.endsWith("/game.js")) {
        const r = await route.fetch(), body = await r.text();
        const out = body.replace(ZRE, () => { hits++; return `ZM=tall?${z}:1`; });
        return route.fulfill({ response: r, body: out });
      }
      return route.continue();
    });
    const page = await ctx.newPage(), errs = [];
    page.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/i.test(m.text())) errs.push(`console.error: ${m.text()}`); });
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
    await page.goto(build === "site" ? srv.site : srv.poki, { waitUntil: "load" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);
    if (!hits) failures.push(`${tag}: portrait zoom rewrite found no "ZM=tall?..:1" in the served script`);
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
      rows.push(`${tag.padEnd(26)} ${m.s}  glyph top ${m.g.t.toFixed(1)}  mute bottom ${m.mute.b.toFixed(1)}  gap ${m.gap.toFixed(1)} px` +
        (m.pgap != null ? `  (pause ${m.pgap.toFixed(1)})` : ""));
      if (!(m.gap >= MIN)) failures.push(`${tag}: LV marker ${m.gap.toFixed(1)} px from mute (< ${MIN})`);
    }
    for (const e of errs) failures.push(`${tag}: ${e}`);
    await ctx.close();
  }
} finally { await browser.close(); await srv.close(); }
console.log(rows.join("\n"));
if (failures.length) { console.error(failures.join("\n")); console.error(`LV MARKER BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("LV MARKER BROWSER TEST PASSED");
