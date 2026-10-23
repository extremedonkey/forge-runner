// Seeded canvas-hash test: npm run test:canvas (after npm run build; needs `npx playwright install chromium`).
// Replaces the old "served HTML has the same md5" equivalence rule (SECTIONS.md), which can't hold once sparks changes the game:
// equivalence is now checked by BEHAVIOUR. Each case loads a build (site = FR_BUILD 'site' at /, poki = dist/poki from a subpath)
// with a seeded Math.random (mulberry32), a fixed clock and a manual requestAnimationFrame (scripts/lib/browser.mjs
// DETERMINISTIC_INIT), steps known frames, and hashes the canvas pixels (SHA-256 of getImageData RGBA). Hashes are compared
// with the committed baselines in scripts/canvas-baselines.json.
//
// Frames per build and viewport (390x844 touch, 844x390 touch, 1280x800 desktop; deviceScaleFactor 1):
//   start   title screen, 30 frames after load
//   run     1.5 s into a run started with Space (no jumps)
//   over    game-over screen, 1 s after the (deterministic) death; the death frame number is part of the baseline
//   demo-4s / demo-12s  (site only) ?demo=1 autopilot run, which includes spark pickups (SKON on) and power-ups
// Text is drawn as font-independent glyph bars and sound is muted, so the hashes don't depend on the machine's fonts.
//
// Intentional visual/gameplay change? Update the baselines and commit them with the change:
//   npm run build && npm run test:canvas -- --update     (rewrites scripts/canvas-baselines.json; review the diff)
// On a mismatch the actual frames are written to canvas-actual/ (CI uploads them as an artifact). A frame whose exact hash
// differs but whose 16x16 block signature is within +-2 per channel of the baseline counts as a NEAR match (1-bit rasteriser
// differences between CPUs) and passes with a note; anything else fails.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, VIEWPORTS, serveBuilds, newContext, withQuery, DETERMINISTIC_INIT } from "./lib/browser.mjs";

const UPDATE = process.argv.includes("--update"), PNG = process.argv.includes("--png"); // --png: always write canvas-actual/*.png
const FILE = join(ROOT, "scripts/canvas-baselines.json");
const OUT = join(ROOT, "canvas-actual");
const SEED = 20261023;
const TOL = 2;
const base = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : { cases: {} };
const got = {};
let failed = 0, near = 0;

async function shot(page) {
  return page.evaluate(async () => {
    const c = document.getElementById("c"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data;
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", d));
    const N = 16, sum = new Float64Array(N * N * 3), cnt = new Float64Array(N * N);
    for (let y = 0; y < c.height; y++) { const by = Math.floor((y * N) / c.height);
      for (let xx = 0; xx < c.width; xx++) { const b = by * N + Math.floor((xx * N) / c.width), i = (y * c.width + xx) * 4;
        sum[b * 3] += d[i]; sum[b * 3 + 1] += d[i + 1]; sum[b * 3 + 2] += d[i + 2]; cnt[b]++; } }
    const sig = new Uint8Array(N * N * 3); for (let i = 0; i < sig.length; i++) sig[i] = Math.round(sum[i] / cnt[Math.floor(i / 3)]);
    return { size: `${c.width}x${c.height}`, sha: [...h].map((v) => v.toString(16).padStart(2, "0")).join("").slice(0, 32),
      sig: btoa(String.fromCharCode(...sig)), png: c.toDataURL("image/png") };
  });
}
const over = (page) => page.evaluate(() => getComputedStyle(document.getElementById("sh")).display !== "none");

async function runCase(browser, build, url, vp, demo) {
  const { ctx, page, errs } = await newContext(browser, vp, { init: [DETERMINISTIC_INIT(SEED)], deviceScaleFactor: 1 });
  const frames = {};
  const take = async (name) => { frames[name] = await shot(page); };
  try {
    await page.goto(demo ? withQuery(url, { demo: "1" }) : url, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => typeof window.__frStep === "function" && !!document.getElementById("c"));
    if (demo) {
      await page.evaluate(() => __frStep(240)); await take("demo-4s");
      await page.evaluate(() => __frStep(480)); await take("demo-12s");
    } else {
      await page.evaluate(() => __frStep(30)); await take("start");
      await page.keyboard.down("Space"); await page.keyboard.up("Space");
      await page.evaluate(() => __frStep(90)); await take("run");
      let f = 90;
      while (!(await over(page)) && f < 3600) { await page.evaluate(() => __frStep(10)); f += 10; }
      frames.deathFrame = f < 3600 ? f : null;
      await page.evaluate(() => __frStep(60)); await take("over");
    }
  } finally { await ctx.close(); }
  if (errs.length) { failed++; console.log(`FAIL ${build} ${vp.name}${demo ? " demo" : ""}: ${errs.join("; ")}`); }
  return frames;
}

function decode(b64) { return Uint8Array.from(Buffer.from(b64, "base64")); }
function compare(key, name, a, b) {
  if (!b) { failed++; console.log(`FAIL ${key} ${name}: no baseline (run npm run test:canvas -- --update)`); return false; }
  if (a.size !== b.size) { failed++; console.log(`FAIL ${key} ${name}: canvas ${a.size}, baseline ${b.size}`); return false; }
  if (a.sha === b.sha) { console.log(`ok   ${key} ${name} ${a.sha.slice(0, 12)} (${a.size})`); return true; }
  const x = decode(a.sig), y = decode(b.sig); let m = 0; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i] - y[i]));
  if (m <= TOL) { near++; console.log(`ok   ${key} ${name} NEAR match (hash ${a.sha.slice(0, 12)} != ${b.sha.slice(0, 12)}, block diff ${m} <= ${TOL})`); return true; }
  failed++; console.log(`FAIL ${key} ${name}: hash ${a.sha.slice(0, 12)} != baseline ${b.sha.slice(0, 12)} (block diff ${m})`); return false;
}

const srv = await serveBuilds();
const browser = await chromium.launch({ args: ["--disable-gpu", "--disable-accelerated-2d-canvas", "--font-render-hinting=none"] });
const t0 = Date.now();
try {
  for (const [build, url] of [["site", srv.site], ["poki", srv.poki]]) {
    for (const vp of VIEWPORTS) {
      const key = `${build}/${vp.name}`;
      const fr = { ...(await runCase(browser, build, url, vp, false)), ...(build === "site" ? await runCase(browser, build, url, vp, true) : {}) };
      got[key] = { deathFrame: fr.deathFrame };
      for (const [name, v] of Object.entries(fr)) {
        if (name === "deathFrame") continue;
        got[key][name] = { size: v.size, sha: v.sha, sig: v.sig };
        if (PNG) { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, `${build}-${vp.name}-${name}.png`), Buffer.from(v.png.split(",")[1], "base64")); }
        if (UPDATE) { console.log(`set  ${key} ${name} ${v.sha.slice(0, 12)} (${v.size})`); continue; }
        const b = base.cases[key];
        if (!compare(key, name, v, b && b[name])) {
          mkdirSync(OUT, { recursive: true });
          writeFileSync(join(OUT, `${build}-${vp.name}-${name}.png`), Buffer.from(v.png.split(",")[1], "base64"));
        }
      }
      if (!UPDATE) {
        const bd = base.cases[key]?.deathFrame;
        if (fr.deathFrame == null) { failed++; console.log(`FAIL ${key}: no death within 60 s of frames`); }
        else if (bd !== fr.deathFrame) console.log(`note ${key}: death at frame ${fr.deathFrame}, baseline ${bd} (the frame hashes decide)`);
      }
    }
  }
} finally { await browser.close(); await srv.close(); }

if (UPDATE) {
  writeFileSync(FILE, JSON.stringify({ seed: SEED, note: "seeded canvas hashes: npm run test:canvas; update with npm run test:canvas -- --update", cases: got }, null, 1) + "\n");
  console.log(`wrote ${FILE} (${Object.keys(got).length} cases) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(failed ? 1 : 0);
}
console.log(`${near ? near + " near match(es); " : ""}${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (failed) { console.error(`CANVAS HASH TEST FAILED (${failed}); actual frames in canvas-actual/. Intended change? npm run test:canvas -- --update`); process.exit(1); }
console.log("CANVAS HASH TEST PASSED");
