// Sparks browser test: npm run test:sparks-browser (after npm run build; needs `npx playwright install chromium`).
// Runs the sparks smoke (scripts/sparks-smoke.mjs) against BOTH build targets on a local static server
// (site = FR_BUILD 'site' at /, Poki = dist/poki from a subpath with a fake Poki SDK). Beacons and /api/* are aborted.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { serveBuilds, VIEWPORTS } from "./lib/browser.mjs";
import { sparksSmoke } from "./sparks-smoke.mjs";

const oi = process.argv.indexOf("--out"), out = oi >= 0 ? process.argv[oi + 1] : null;
if (out) mkdirSync(out, { recursive: true });
const t0 = Date.now();
const srv = await serveBuilds();
const browser = await chromium.launch();
const failures = [];
try {
  failures.push(...await sparksSmoke(browser, { url: srv.site, build: "site", viewports: VIEWPORTS, out }));
  failures.push(...await sparksSmoke(browser, { url: srv.poki, build: "poki", viewports: VIEWPORTS, out }));
} finally { await browser.close(); await srv.close(); }
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (failures.length) { console.error(`SPARKS BROWSER TEST FAILED (${failures.length})`); process.exit(1); }
console.log("SPARKS BROWSER TEST PASSED");
