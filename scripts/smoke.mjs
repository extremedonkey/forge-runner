// Smoke test: npm run smoke -- <url> [--out dir]
// Loads the game in Playwright Chromium, fails on console/page errors, checks the canvas,
// starts a run and jumps (Space on desktop, tap on touch), waits, and saves screenshots.
// Beacon requests (POST /?event=...) are BLOCKED so tests never pollute play stats.
// Then the sparks smoke (scripts/sparks-smoke.mjs, sparks PR10): ?sk=500 row/tile-buy/one-tap retry at the same 3 viewports,
// earn + save + load, and a throwing localStorage; /api/* is aborted there (no leaderboard traffic). --no-sparks skips it.
// Concurrency: the 3 viewports and the sparks smoke all run at once in the one browser, each in its own context (own
// storage, own routes), so they share nothing but the counters below. Results print in the fixed order once done.
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { sparksSmoke } from "./sparks-smoke.mjs";

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a));
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : "screenshots";
if (!url) { console.error("usage: npm run smoke -- <url> [--out dir]"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "portrait-390x844", width: 390, height: 844, touch: true },
  { name: "landscape-844x390", width: 844, height: 390, touch: true },
  { name: "desktop-1280x800", width: 1280, height: 800, touch: false },
];

const failures = [];
let blocked = 0, stubbed = 0;
const browser = await chromium.launch();
try {
  // The sparks smoke starts now, beside the viewports; its lines are held back so they still print after the viewport lines.
  const sparksLines = [];
  const sparks = args.includes("--no-sparks") ? null
    : sparksSmoke(browser, { url, build: "site", viewports: VIEWPORTS, out: OUT, log: (l) => sparksLines.push(l) });
  sparks?.catch(() => {}); // if a viewport throws first, the finally closes the browser under it: report that first error only
  const results = await Promise.all(VIEWPORTS.map(async (vp) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: vp.touch ? 3 : 1,
      userAgent: vp.touch ? devices["iPhone 13"].userAgent : undefined,
    });
    // Belt and braces: stub sendBeacon AND abort any beacon request at the network layer.
    await ctx.addInitScript(() => {
      window.__frBeacons = 0;
      try { Object.defineProperty(navigator, "sendBeacon", { value: () => { window.__frBeacons++; return true; }, configurable: true }); } catch {}
    });
    await ctx.route("**/*", (route) => {
      const req = route.request();
      const u = new URL(req.url());
      if (req.method() === "POST" || u.searchParams.has("event")) { blocked++; return route.abort(); }
      return route.continue();
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // Our own aborted beacons show up as failed loads; they are expected.
      if (/net::ERR_FAILED/i.test(m.text())) return;
      errs.push(`console.error: ${m.text()}`);
    });
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));

    const resp = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    if (!resp || resp.status() !== 200) errs.push(`HTTP ${resp?.status()}`);
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 10000 }).catch(() => errs.push("no visible <canvas>"));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${vp.name}-start.png` });

    // Start a run, then jump.
    const box = await canvas.boundingBox();
    const cx = box ? box.x + box.width / 2 : vp.width / 2;
    const cy = box ? box.y + box.height / 2 : vp.height / 2;
    if (vp.touch) {
      await page.touchscreen.tap(cx, cy);           // start
      await page.waitForTimeout(400);
      await page.touchscreen.tap(cx, cy);           // jump
    } else {
      await page.keyboard.press("Space");           // start
      await page.waitForTimeout(400);
      await page.keyboard.down("Space"); await page.waitForTimeout(150); await page.keyboard.up("Space"); // jump
    }
    await page.waitForTimeout(2500);
    const healthy = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return !!c && c.width > 0 && c.height > 0;
    });
    if (!healthy) errs.push("canvas missing or zero-sized after run start");
    const n = await page.evaluate(() => window.__frBeacons || 0);
    stubbed += n; // not `stubbed += await ...`: that reads stubbed before the await and drops the other viewports' adds
    await page.screenshot({ path: `${OUT}/${vp.name}.png` });

    await ctx.close();
    return {
      line: `${errs.length ? "FAIL" : "ok  "} ${vp.name}${errs.length ? "\n    " + errs.join("\n    ") : ""}`,
      fails: errs.map((e) => `${vp.name}: ${e}`),
    };
  }));
  for (const r of results) { console.log(r.line); failures.push(...r.fails); }
  if (sparks) { const f = await sparks; for (const l of sparksLines) console.log(l); failures.push(...f); }
} finally {
  await browser.close();
}
console.log(`beacons swallowed in-page: ${stubbed}; beacon requests aborted at network: ${blocked}; screenshots in ${OUT}/`);
if (failures.length) { console.error(`SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log(`SMOKE PASSED: ${url}`);
