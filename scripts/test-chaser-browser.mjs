// CHASER live check in the REAL built pages (after `npm run build`): the site (/) and Poki (/games/forge-runner/v1/) builds
// spawn slag rollers from L3 through the live 13/14 hook lines (srTick / srWant / srDraw), the LEFT edge glow + enemySfx
// ('roller','warn'/'rumble'/'pass') fire in order and resolve to real 08f sounds, and demo mode spawns rollers (autopilot
// jumps them) but never draws a warning, plays a roller sound or shows the hint. No page errors (catches global-name clashes).
// A read-only probe is injected (test only) just before the IIFE closes; it wraps enemySfx (recording) and update (keeps the
// buggy invulnerable via inv; window.__fast starts each run at the 760 cap so L3 comes at ~25 s). Run: node scripts/test-chaser-browser.mjs
import { chromium } from "playwright";
import { serveBuilds, newContext } from "./lib/browser.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + "chaser-browser: " + m); if (!c) fails++; };
const PROBE = `
;(function(){var S=[],seen={},ewL=0,hint=0,fs=-1;var oE=enemySfx;enemySfx=function(t,e){var r=oE(t,e);S.push([t,e,r,runS]);return r};
var oU=update;update=function(dt){if(window.__god)inv=1e9;if(window.__fast&&state==="run"&&(fs<0||runS<fs))speed=MAXV;fs=state==="run"?runS:-1;oU(dt);for(var i=0;i<SR_N;i++)if(srC[i].a)seen[srC[i].ph]=currentLevel();if(srHT>0)hint++};
var oW=edgeWarnRect;edgeWarnRect=function(side,y,h){var r=oW(side,y,h);if(side==="left")ewL++;return r};
window.__srp={get sfx(){return S},get rollers(){return Object.keys(seen).length},get levels(){var o={};for(var k in seen)o[seen[k]]=1;return Object.keys(o)},get ewL(){return ewL},get hint(){return hint},get state(){return state},get lvl(){return currentLevel()},get runS(){return runS},
  map:function(){return typeof EN_MAP!=="undefined"&&EN_MAP.roller?[typeof EN_MAP.roller.warn,typeof EN_MAP.roller.rumble,typeof EN_MAP.roller.pass]:null}};
})();
`;
const inject = (s) => { const i = s.lastIndexOf("})();"); if (i < 0) throw new Error("IIFE end not found"); return s.slice(0, i) + PROBE + s.slice(i); };
const srv = await serveBuilds(), browser = await chromium.launch();
async function open(url, isPoki) {
  const vp = { width: 1280, height: 720, touch: false }, { ctx, page, errs } = await newContext(browser, vp);
  await ctx.route(isPoki ? "**/game.js" : (u) => new URL(u).pathname === "/", async (route) => {
    const r = await route.fetch(); route.fulfill({ response: r, body: inject(await r.text()) });
  });
  await page.addInitScript(() => { window.__god = true; window.__fast = true; });
  await page.goto(url); await page.waitForFunction(() => !!window.__srp, null, { timeout: 15000 });
  return { ctx, page, errs };
}
async function play(page, secs, start = true, until = null) {
  if (start) { await page.mouse.click(640, 360); await page.waitForTimeout(300); if ((await page.evaluate(() => __srp.state)) !== "run") await page.keyboard.press("Space"); }
  const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { await page.waitForTimeout(500); if (until && (await page.evaluate(until))) { await page.waitForTimeout(1500); break; } }
  return page.evaluate(() => ({ rollers: __srp.rollers, levels: __srp.levels, ewL: __srp.ewL, hint: __srp.hint, sfx: __srp.sfx, state: __srp.state, lvl: __srp.lvl, runS: __srp.runS, map: __srp.map() }));
}
const order = (sfx) => { const r = sfx.filter((s) => s[0] === "roller"), out = []; let cur = [];
  for (const s of r) { cur.push(s[1]); if (s[1] === "pass") { out.push(cur.join(">")); cur = []; } } return out; };
try {
  { const { ctx, page, errs } = await open(srv.site + "?level=3"); const r = await play(page, 180, true, () => __srp.sfx.filter((s) => s[0] === "roller" && s[1] === "pass").length >= 2); // real clearances
    const rl = r.sfx.filter((s) => s[0] === "roller"), seq = order(r.sfx);
    ok(r.state === "run" && r.rollers > 0 && r.levels.every((l) => +l >= 3), `web: rollers spawn on L3+ (${r.rollers} rollers, levels ${r.levels})`);
    ok(r.ewL > 0, `web: left edge glow drawn on ${r.ewL} frames`);
    ok(seq.length > 0 && seq.every((s) => s === "warn>rumble>pass") && rl.every((s) => s[2] === true), `web: sounds per roller ${JSON.stringify(seq)} all resolve to real 08f sounds`);
    ok(JSON.stringify(r.map) === JSON.stringify(["function", "function", "function"]), `web: EN_MAP.roller warn/rumble/pass ${JSON.stringify(r.map)}`);
    ok(r.hint > 0, `web: HOLD JUMP hint shown (${r.hint} steps)`);
    ok(!errs.length, "web: no page errors " + errs.join(" | ")); await ctx.close(); }
  { const { ctx, page, errs } = await open(srv.site + "?demo=1&level=4"); const r = await play(page, 40, false);
    ok(r.rollers > 0, `demo: rollers spawn (${r.rollers})`); ok(r.ewL === 0, `demo: no edge warning (${r.ewL})`); ok(r.hint === 0, "demo: no hint");
    ok(r.sfx.filter((s) => s[0] === "roller").length === 0, "demo: no roller sound"); ok(!errs.length, "demo: no page errors " + errs.join(" | ")); await ctx.close(); }
  // Poki: natural run from L1 at MAXV with carts, real clearances: srGap pacing books the first roller as L3 starts (~40 s)
  { const { ctx, page, errs } = await open(srv.poki, true); const r = await play(page, 150, true, () => __srp.sfx.some((s) => s[0] === "roller" && s[1] === "pass"));
    ok(r.lvl >= 3 && r.rollers > 0 && r.levels.every((l) => +l >= 3), `poki: rollers from L3 (${r.rollers} by ${r.runS.toFixed(1)} s at L${r.lvl}, levels ${r.levels})`);
    ok(r.ewL > 0 && r.sfx.some((s) => s[0] === "roller" && s[1] === "warn" && s[2] === true), `poki: left glow (${r.ewL}) + warn sound resolve`);
    ok(!errs.length, "poki: no page errors " + errs.join(" | ")); await ctx.close(); }
} finally { await browser.close(); await srv.close(); }
console.log(fails ? `CHASER BROWSER TEST FAILED (${fails})` : "CHASER BROWSER TEST PASSED"); process.exit(fails ? 1 : 0);
