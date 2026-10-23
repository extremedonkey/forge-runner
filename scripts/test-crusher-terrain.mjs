// LEVELS-5 THE CRUSHER on Dev's terrain (HILLS 06i / GAPS 06k / FORK 06l, PRs #80 / #87 / #93). Two parts:
//  1. stubbed terrain (runs on main, where 06i/06k/06l are absent): hlH / hsc / hlAct / gapNear / platNear stand-ins, fed to the
//     real 06h through test-crusher.mjs's game(): plates/strip/press on the ground, honest hit on raised ground, no slam near a gap
//     or a deck, plates ride hsc, the flat ARENA (crFl) and crNoGap() timing, chained runs.
//  2. the real combined game (only when 06i, 06k and 06l are in src/client): full L5 runs with hills + gaps + fork + rescue.
//     The ARENA / no-gap checks run only once Dev's hlCurve line and Levels' lvGapsBlocked line are in (else: logged, skipped).
// Run: node scripts/test-crusher-terrain.mjs (also via npm test).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { game } from "./test-crusher.mjs";
let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok   crusher-terrain:", name); };
const GY = 232, PX = 56;
// terrain stand-ins (world x = hsc + screen x); hsc advances at the world speed inside update(), before crTick (as 06i's hlTick)
const stub = (T, extra = "") => `;var hsc=0,hlAct=true,__G=[],__D=[];function hlH(sx){return (${T})(hsc+sx)}
  function gapNear(a,b){for(var i=0;i<__G.length;i++){var g=__G[i];if(g.x1>a&&g.x0<b)return {x0:g.x0,x1:g.x1}}return null}
  function platNear(a,b){for(var i=0;i<__D.length;i++){var d=__D[i];if(d.x1>a&&d.x0<b)return {x0:d.x0,x1:d.x1,tier:1}}return null}
  var __crT=crTick;crTick=function(dt){if(state==="run")hsc+=speed*dt;__crT(dt)};calls.ev=function(s){return eval(s)};${extra}`;
const mk = (T, env = {}) => { const r = game({ boss: true, seed: 3, tune: stub(T, env.extra), ...env }); return { ...r, ev: r.calls.ev }; };
// one isolated slam (as test-crusher isolated()), on terrain T; returns survived, and runs check(ev) every step
function slam(T, n, mode, L, opt = {}) {
  const { g, ev } = mk(T, { portrait: opt.portrait }); g.start(); g.score = 3000; g.speed = 760; g.step(1 / 240);
  ev(`hsc=${opt.h0 || 20000}`);
  g.ents = []; g.cr.s = 2; g.cr.t = 1; g.cr.i = n === 2 ? g.cr.PAT.indexOf(2) : 0;
  const stop = g.cr.i + 1; let fired = -1;
  for (let i = 0; i < 4 * 240; i++) {
    g.speed = 760; g.spawnDist = -1e5; g.ents = [];
    const on = g.cr.plates.filter((p) => p.on), tc = on.length ? Math.min(...on.map((p) => (p.x - (PX + 45)) / g.wv)) : 9;
    if (fired < 0 && on.length && tc <= L) { fired = i; if (mode !== "none") g.press(); }
    if (mode === "tap" && fired >= 0 && i === fired + 1) g.release();
    if (mode === "hold" && fired >= 0 && i === fired + 60) g.release();
    g.step(1 / 240); if (opt.check) opt.check(ev, g);
    if (g.state !== "run") return false;
    if (g.cr.i >= stop && g.cr.plates.every((p) => !p.on || p.x + p.w < PX - 2)) return true;
  }
  return true;
}
const win = (T, n, mode, opt) => { const ok = []; for (let k = 0; k <= 40; k++) if (slam(T, n, mode, k / 100, opt)) ok.push(k / 100); return ok; };
const HILL = "function(x){return 30+25*Math.sin(x/190)+8*Math.sin(x/53)}";

await t("on terrain, every plate rests on the highest ground under it and reaches down to the lowest (never sinks, never floats), drawn exactly as its hitbox rect; it rides the world (same ground under it every step); the strip sits on the ground at the landing spot through the wind-up; the press head lands on the plate top", () => {
  let plates = 0, strips = 0, heads = 0;
  for (const portrait of [false, true]) for (const n of [1, 2]) for (let h0 = 20000; h0 < 21200; h0 += 150) slam(HILL, n, "none", 0, { h0, portrait, check: (ev) => {
    const r = ev(`(function(){var o=[],i,p,gs,r;for(i=0;i<CR_NPL;i++){p=crPL[i];if(!p.on)continue;gs=crGS(p.x,p.w);r=crPR(p);o.push([p.g,p.b,gs[0],gs[1],r.y,r.h,crPH()])}
      var s=null;if(crS===3){var q=crStrip(0);gs=crGS(q.x,q.w);s=[q.y,Math.round(GY-gs[0])-(ZM>1?6:4),q.h,(ZM>1?16:8)+Math.round(gs[0]-gs[1])]}
      return {o:o,s:s,s4:crS===4&&crH>0?[crGH,crPL.filter(function(p){return p.on}).sort(function(a,b){return a.p-b.p})[0].g]:null}})()`);
    for (const [g0, b0, ga, gb, y, h, ph] of r.o) {
      plates++; assert.ok(Math.abs(g0 - ga) < 1e-6 && Math.abs(b0 - gb) < 1e-6, `plate rides the world: ground ${g0}/${b0} now ${ga}/${gb}`);
      assert.ok(Math.abs(y - (GY - g0 - 10)) < 1e-9, "top CR_PH above the highest ground"); assert.ok(y + h >= GY - b0 - 1e-9, "reaches the lowest ground (no float)");
      assert.ok(Math.abs(h - (ph + g0 - b0)) < 1e-9);
    }
    if (r.s) { strips++; assert.equal(r.s[0], r.s[1], "strip y on the ground"); assert.equal(r.s[2], r.s[3], "strip spans the slope"); }
    if (r.s4) { heads++; assert.equal(r.s4[0], r.s4[1], "press head rests on the newest plate's ground"); }
  } });
  // drawn = hitbox: the dark rim layer of crDrawPlates is exactly crPR (x, y, w, h), rounded
  const { g, ev } = mk(HILL); g.start(); g.score = 3000; g.speed = 760; g.step(1 / 240); ev("hsc=20333;crPlate(300)");
  const rects = []; g.cr.setCtx({ fillStyle: "", globalAlpha: 1, fillRect(x, y, w, h) { if (this.fillStyle === "#05070d") rects.push([x, y, w, h]); } });
  g.cr.drawPlates();
  const want = ev("(function(){var p=crPL[0],r=crPR(p),y=Math.round(r.y);return [Math.round(p.x),y,p.w,Math.round(r.y+r.h)-y]})()");
  assert.deepEqual(rects[0], want);
  console.log(`     ${plates} plate-steps, ${strips} strip-steps, ${heads} head-steps on a 5-63 px hill (desktop + 390x844)`);
});

await t("honest hit on raised ground: on flat ground lifted 40 px (the buggy and the plate drawn 40 px up) every tap/hold window is identical to flat ground (>= 0.28 s single, >= 0.22 s double at 760), standing still is still hit", () => {
  for (const portrait of [false, true]) for (const n of [1, 2]) {
    const f = win("function(){return 0}", n, "tap", { portrait }), r = win("function(){return 40}", n, "tap", { portrait });
    assert.deepEqual(r, f); assert.ok(f[f.length - 1] - f[0] >= (n === 1 ? .28 : .22) - 1e-9, `${n} tap ${f[0]}-${f[f.length - 1]}`);
    assert.deepEqual(win("function(){return 40}", n, "hold", { portrait }), win("function(){return 0}", n, "hold", { portrait }));
    assert.equal(slam("function(){return 40}", n, "none", 0, { portrait }), false);
  }
});

await t("no slam within CR_TAU (0.75 s of contact time) of a ground gap (gapNear) or a deck (platNear), on either side; without them crFair is unchanged", () => {
  for (const kind of ["__G", "__D"]) {
    const { g, ev } = mk("function(){return 0}"); g.start(); g.score = 3000; g.speed = 760; g.step(1 / 240); g.ents = []; g.spawnDist = -1e5;
    // the landing window in world x for a single: plates land crLd() s of contact out, CR_TW + CR_TD s from now
    const w = ev("(function(){var v=crV(),fw=pW(),tw=CR_TW+CR_TD,tc=crLd(),tb=tc+(crW()+fw)/v;return [hsc+PX+fw+v*(tw+tc),hsc+PX+fw+v*(tw+tb),v]})()");
    const v = w[2], put = (x0, x1) => ev(`${kind}=[{x0:${x0},x1:${x1}}]`);
    assert.equal(g.cr.fair(1), true, "nothing near");
    put(w[0] + 10, w[0] + 200); assert.equal(g.cr.fair(1), false, "under the plate");
    put(w[1] + v * .75 - 5, w[1] + v * .75 + 200); assert.equal(g.cr.fair(1), false, "just inside CR_TAU after");
    put(w[1] + v * .75 + 5, w[1] + v * .75 + 200); assert.equal(g.cr.fair(1), true, "just past CR_TAU after");
    put(w[0] - 45 - v * .75 - 300, w[0] - 45 - v * .75 + 5); assert.equal(g.cr.fair(1), false, "just inside CR_TAU before");
    put(w[0] - 45 - v * .75 - 300, w[0] - 45 - v * .75 - 5); assert.equal(g.cr.fair(1), true, "just past CR_TAU before");
  }
});

await t("plates ride the world when Dev's terrain runs it (hsc, hlAct): a GAPS Spare Core skip of 300 px moves them 300 px; without hlAct they move at crV()", () => {
  const { g, ev } = mk("function(){return 0}"); g.start(); g.score = 3000; g.speed = 760; g.step(1 / 240); ev("crS=2;crPlate(500);inv=1e9");
  g.step(1 / 240); const x0 = ev("crPL[0].x"); ev("hsc+=300"); g.step(1 / 240); const x1 = ev("crPL[0].x");
  assert.ok(Math.abs(x0 - x1 - 300 - 760 / 240) < 1e-6, `${x0 - x1}`);
  ev("hlAct=false"); g.step(1 / 240); const x2 = ev("crPL[0].x"); assert.ok(Math.abs(x1 - x2 - 760 / 240) < 1e-6, `${x1 - x2}`);
});

await t("ARENA: crFl = 1 until THIS run reaches L5, then 0 from crZ0 (>= CR_FAR + CR_EASE ahead, past every gap) to CRUSHER DOWN (crZ1 past the right edge); the visible terrain never changes; every plate is on flat ground; crNoGap() and lvGapsBlocked() from L5 until DOWN; the next run starts with no arena; demo: none", () => {
  const T = "function(x){return (typeof crFl===\"function\"?crFl(x):1)*(30+25*Math.sin(x/190))}";
  const { g, ev } = mk(T, { extra: "__G=[{x0:0,x1:0}];" }); g.start(); let l5 = null, down = null, maxG = 0, ng = []; const seen = new Map();
  for (let i = 0; i < 140 * 240; i++) {
    g.inv = 1e9;
    if (l5 === null && ev("crL5>=0") === false) ev(`__G=[{x0:hsc+1500,x1:hsc+1800}]`);   // a gap placed far ahead before L5: the arena starts past it
    g.step(1 / 240);
    // the visible terrain (world x on screen 0..W+40, a 20 px world grid) never changes once seen
    if (i % 6 === 0) for (const [wx, h] of ev("(function(){var o=[],x;for(x=Math.ceil(hsc/20)*20;x<=hsc+W+40;x+=20)o.push([x,hlH(x-hsc)]);return o})()")) {
      if (seen.has(wx)) assert.ok(Math.abs(seen.get(wx) - h) < 1e-6, `terrain changed on screen at world ${wx}`); else seen.set(wx, h); }
    if (l5 === null && ev("crL5>=0")) { l5 = ev("[runS,hsc,crZ0,__G[0].x1]"); assert.ok(l5[2] >= l5[1] + 1700 + 700 - 1e-6 && l5[2] >= l5[3] + 700, "arena past the screen, the spawns and the gap"); }
    if (ev("crS>=1&&crS<=5")) { ng.push(ev("crNoGap()&&lvGapsBlocked()")); maxG = Math.max(maxG, ev("crPL.reduce(function(m,p){return p.on?Math.max(m,p.g):m},0)")); }
    if (down === null && ev("crS===6")) { down = ev("[hsc,crZ1,XO+VW]"); assert.ok(down[1] >= down[0] + down[2] + 40 - 1e-6); assert.equal(ev("crNoGap()"), false); }
    if (ev("crS===7")) break;
  }
  assert.ok(l5 && down, "boss ran"); assert.equal(maxG, 0, "every plate on flat ground"); assert.ok(ng.length > 0 && ng.every(Boolean), "crNoGap() and 06d lvGapsBlocked() true through the fight");
  assert.equal(ev("lvB>0||lvGapsBlocked()"), ev("lvB>0"), "after DOWN lvGapsBlocked is back to the banner/crossfade rule");
  g.state = "over"; g.start(); g.step(1 / 240); assert.equal(ev("crFl(hsc+3000)"), 1); assert.equal(ev("crNoGap()"), false); assert.equal(ev("crZ0>1e11"), true);
  const d = mk(T, { demo: true }); d.g.start(); for (let i = 0; i < 100 * 240; i++) { d.g.inv = 1e9; d.g.step(1 / 240); } assert.equal(d.ev("crZ0>1e11&&!crNoGap()"), true, "demo: no arena");
  console.log(`     L5 at ${l5[0].toFixed(1)} s, arena from ${(l5[2] - l5[1]).toFixed(0)} px ahead; down at hsc ${down[0].toFixed(0)}, arena ends ${(down[1] - down[0]).toFixed(0)} px ahead`);
});

// ---------- 2. the real combined game (Dev's HILLS + GAPS + FORK in src/client) ----------
const C = (f) => new URL(`../src/client/${f}`, import.meta.url);
if (["06i-hills.js", "06k-gaps.js", "06l-fork.js", "06h-rescue.js"].every((f) => existsSync(C(f)))) {
  const { combined } = await import("./lib/crusher-terrain-harness.mjs");
  const arena = /crFl\(wx\)/.test(readFileSync(C("06i-hills.js"), "utf8")), nogap = /crNoGap\(\)/.test(readFileSync(C("06d-levels.js"), "utf8"));
  if (!arena || !nogap) console.log(`     combined: ${arena ? "" : "06i hlCurve has no crFl factor (Dev line); "}${nogap ? "" : "06d lvGapsBlocked does not ask crNoGap (Levels line); "}arena / no-gap checks skipped`);
  await t("combined (hills + gaps + fork + rescue), 10 seeds x full L5 runs: plates on the ground; none within CR_TAU of a gap or deck; with the arena + no-gap lines: all plates on flat ground, no gap created in the fight, fight 14-22 s; no L5 fork before CRUSHER DOWN + 0.85 s; no rescue slow-mo/prompt/bounce in the fight; the next run has no boss or terrain left; score and speed identical to the same run without the boss", async () => {
    const r = await combined({ seeds: 10, arena: arena && nogap });
    console.log("     " + r.log);
  });
} else console.log("     combined part skipped (06i/06k/06l not in src/client: main)");
console.log(`crusher-terrain: ${pass} tests passed`);
