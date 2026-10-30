// t454u: screenshots of the start hill (site build, real run, fixed-step clock as test-first30). Not part of CI.
// Usage: npm run build && node scripts/shot-first30.mjs [outDir]   (default /home/box/Grokbot/forge-runner/feedback/t454u/)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, newContext } from "./lib/browser.mjs";

const OUT = process.argv[2] || "/home/box/Grokbot/forge-runner/feedback/t454u/";
const SUFFIX = process.env.SUFFIX || "";   // e.g. SUFFIX=-v2 -> desktop-0.1s-v2.png
const VPS =[{ name: "desktop", width: 1280, height: 720, touch: false }, { name: "phone", width: 390, height: 844, touch: true }];
const CLOCK = (seed) => `(() => {
  let s = ${seed >>> 0};
  Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000; performance.now = () => now; let q = [], id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((e) => e[0] !== i); };
  window.__frStep = (n) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const e of c) e[1](now); } return now; };
  try { localStorage.setItem("fr_snd2", "0"); } catch (e) {}
})();`;
mkdirSync(OUT, { recursive: true });
const srv = await serveBuilds(), browser = await chromium.launch();
try {
  for (const vp of VPS) {
    const { ctx, page, errs } = await newContext(browser, vp, { init: [CLOCK(9001)] });
    await page.goto(srv.site, { waitUntil: "load" });
    await page.evaluate(() => window.__frStep(5));
    if (vp.touch) await page.touchscreen.tap(vp.width / 2, vp.height / 2);
    else await page.keyboard.press("Space");
    let frames = 0;
    for (const t of [0.1, 1.0, 1.2, 2.0, 2.5]) {
      const to = Math.round(t * 60), file = join(OUT, `${vp.name}-${t}s${SUFFIX}.png`);
      await page.evaluate((n) => window.__frStep(n), to - frames); frames = to;
      await page.screenshot({ path: file });
      console.log("saved", file);
    }
    if (errs.length) console.error(errs.join("\n"));
    await ctx.close();
  }
} finally { await browser.close(); await srv.close() }
