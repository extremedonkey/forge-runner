// ORE CART live check in the REAL built pages (after `npm run build`): the site (/) and Poki (/games/forge-runner/v1/) builds
// spawn carts from L2 through the live 13/14 hook lines, the edge glow + enemySfx('orecart','approach'/'pass') fire and resolve
// to real 08f sounds, and demo mode spawns carts but never draws a warning or plays a cart sound.
// A read-only probe is injected (test only) just before the IIFE closes; it wraps enemySfx (recording) and update (keeps the
// buggy invulnerable via inv so the run reaches L2+). Run: node scripts/test-orecart-browser.mjs
import { chromium } from "playwright";
import { serveBuilds, newContext, POKI_BASE } from "./lib/browser.mjs";
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + "orecart-browser: " + m); if (!c) fails++; };
const PROBE = `
;(function(){var S=[],seen={},mx=0,ewN=0;var oE=enemySfx;enemySfx=function(t,e){var r=oE(t,e);S.push([t,e,r]);return r};
var oU=update;update=function(dt){if(window.__god)inv=1e9;oU(dt);for(var i=0;i<OC_N;i++)if(ocC[i].a)seen[ocC[i].ph+":"+Math.floor(runS/1e3)+":"+lvSeen()]=1};
function lvSeen(){return currentLevel()}
var oW=edgeWarnDraw;edgeWarnDraw=function(){var n=oW();if(n>0)ewN++;return n};
window.__ocp={get sfx(){return S},get carts(){return Object.keys(seen).length},get levels(){var o={};for(var k in seen)o[k.split(":")[2]]=1;return Object.keys(o)},get ew(){return ewN},get state(){return state},get lvl(){return currentLevel()},get runS(){return runS},get score(){return score},
  map:function(){return typeof EN_MAP!=="undefined"&&EN_MAP.orecart?[typeof EN_MAP.orecart.approach,typeof EN_MAP.orecart.pass,EN_MAP.orecart.approach===(typeof sfxWarnOrecart==="function"?sfxWarnOrecart:0),EN_MAP.orecart.pass===(typeof sfxOrecartPass==="function"?sfxOrecartPass:0)]:null}};
})();
`;
const inject = (s) => { const i = s.lastIndexOf("})();"); if (i < 0) throw new Error("IIFE end not found"); return s.slice(0, i) + PROBE + s.slice(i); };
const srv = await serveBuilds(), browser = await chromium.launch();
async function open(url, isPoki) {
  const vp = { width: 1280, height: 720, touch: false }, { ctx, page, errs } = await newContext(browser, vp);
  await ctx.route(isPoki ? "**/game.js" : (u) => new URL(u).pathname === "/", async (route) => {
    const r = await route.fetch(); route.fulfill({ response: r, body: inject(await r.text()) });
  });
  await page.addInitScript(() => { window.__god = true; });
  await page.goto(url); await page.waitForFunction(() => !!window.__ocp, null, { timeout: 15000 });
  return { ctx, page, errs };
}
async function play(page, secs, start = true, upTo = 0) {
  if (start) { await page.mouse.click(640, 360); await page.waitForTimeout(300); if ((await page.evaluate(() => __ocp.state)) !== "run") await page.keyboard.press("Space"); }
  const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) await page.waitForTimeout(500);
  /* upTo: carts are rarer since the held-jump clearance (Playtest #85): keep playing until one has passed (max upTo s) */
  if (upTo) { let pass = -1; while (Date.now() - t0 < upTo * 1000) { const q = await page.evaluate(() => [__ocp.carts, __ocp.sfx.filter((x) => x[0] === "orecart" && x[1] === "pass").length, __ocp.state]); if (q[2] !== "run") break; if (q[1] > 0) { if (pass < 0) pass = Date.now(); if (Date.now() - pass > 1500) break; } await page.waitForTimeout(500); } }
  return page.evaluate(() => ({ carts: __ocp.carts, levels: __ocp.levels, ew: __ocp.ew, sfx: __ocp.sfx, state: __ocp.state, lvl: __ocp.lvl, runS: __ocp.runS, map: __ocp.map() }));
}
try {
  // web: ?level=2 floor (cosmetic), non-demo, real input
  { const { ctx, page, errs } = await open(srv.site + "?level=2"); const r = await play(page, 14);
    const ap = r.sfx.filter((s) => s[0] === "orecart" && s[1] === "approach"), ps = r.sfx.filter((s) => s[0] === "orecart" && s[1] === "pass");
    ok(r.state === "run" && r.carts > 0 && r.levels.every((l) => +l >= 2), `web: carts spawn on L2+ (${r.carts} carts, levels ${r.levels})`);
    ok(r.ew > 0, `web: edge glow drawn on ${r.ew} frames`);
    ok(ap.length > 0 && ps.length > 0 && ap.concat(ps).every((s) => s[2] === true), `web: enemySfx('orecart','approach') x${ap.length} / 'pass' x${ps.length} resolve to real sounds (returned true)`);
    ok(JSON.stringify(r.map) === JSON.stringify(["function", "function", true, true]), `web: 08f EN_MAP.orecart = {approach: sfxWarnOrecart, pass: sfxOrecartPass} ${JSON.stringify(r.map)}`);
    ok(!errs.length, "web: no page errors " + errs.join(" | ")); await ctx.close(); }
  // web demo: carts spawn (autopilot jumps them) but no warning and no cart sound
  { const { ctx, page, errs } = await open(srv.site + "?demo=1&level=3"); const r = await play(page, 12, false);
    ok(r.carts > 0, `demo: carts spawn (${r.carts})`); ok(r.ew === 0, `demo: no edge warning drawn (${r.ew} frames)`);
    ok(r.sfx.filter((s) => s[0] === "orecart").length === 0, "demo: no cart sound"); ok(!errs.length, "demo: no page errors " + errs.join(" | ")); await ctx.close(); }
  // Poki: no ?level / ?demo there, so a real run to L2 (20 s of base curve; first carts usually ~21-30 s), invulnerable
  { const { ctx, page, errs } = await open(srv.poki, true); const r = await play(page, 45, true, 110);
    ok(r.lvl >= 2 && r.carts > 0 && r.levels.every((l) => +l >= 2), `poki: carts spawn from L2 (${r.carts} carts by ${r.runS.toFixed(1)} s at L${r.lvl}, levels ${r.levels}, map ${JSON.stringify(r.map)})`);
    ok(r.ew > 0 && r.sfx.some((s) => s[0] === "orecart" && s[1] === "approach" && s[2] === true), `poki: glow (${r.ew} frames) + approach sound resolve`);
    ok(!errs.length, "poki: no page errors " + errs.join(" | ")); await ctx.close(); }
} finally { await browser.close(); await srv.close(); }
console.log(fails ? `ORECART BROWSER TEST FAILED (${fails})` : "ORECART BROWSER TEST PASSED"); process.exit(fails ? 1 : 0);
