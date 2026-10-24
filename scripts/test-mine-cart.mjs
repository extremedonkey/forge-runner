// MINE CART tests (L7): evaluates src/client/06d-levels.js + 06o-mine-cart.js with fake game globals (same pattern as test-levels.mjs).
// The L7 look must be on at L7 only: L1-L6 (and any later level) keep the normal terrain / gaps / buggy; the crossfade eases it.
// Also checks L7's gameplay data in the other fragments (gaps, carts, no strikes / rollers / decks) and the hook lines.
// Run: node scripts/test-mine-cart.mjs   (also run by scripts/test-build.mjs, i.e. npm test).
import assert from "node:assert/strict";
import LV from "../src/client/06d-levels.js";
import MC from "../src/client/06o-mine-cart.js";
import BG from "../src/client/06f-levels-bg.js";
import ARC from "../src/client/06n-arc-strikes.js";
import OC from "../src/client/06i-orecart.js";
import SR from "../src/client/06m-chaser.js";
import FK from "../src/client/06l-fork.js";
import GP from "../src/client/06k-gaps.js";
import RENDER from "../src/client/14-render.js";
import { SCRIPT, FRAGMENTS } from "../src/client/index.mjs";
import { game as hgame, rng } from "./lib/hills-harness.mjs";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   mine-cart:", name); };

function game(env = {}) {
  const calls = { hl: 0, gp: 0, fill: 0, stroke: 0, rect: 0 };
  const pre = `"use strict";var window={FR_BUILD:"site"};var Q={get:function(){return null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=${env.oy || 0},OB=0,VW=600,W=600,H=300,GY=232,HS=1,state="start",score=0,
      scroll=0,tt=0,speed=760,hsc=0,hlOn=${env.hills !== false},gpOn=true,gpGaps=[{x0:200,x1:280,h0:0,h1:0}];
    function rm(){return false}function vMul(){return 1}function gpDf(){return .689}function hlH(){return 0}function gpHole(x){return x>=200&&x<280}
    function hlDraw(){calls.hl++}function gpDraw(){calls.gp++}
    var ctx={globalAlpha:1,fillStyle:"",strokeStyle:"",lineWidth:1,fillRect:function(){calls.rect++},beginPath:function(){},moveTo:function(){},lineTo:function(){},
      closePath:function(){},fill:function(){calls.fill++},stroke:function(){calls.stroke++},save:function(){},restore:function(){},
      createLinearGradient:function(){return {addColorStop:function(){}}}};`;
  const api = `;return {set state(v){state=v},set lvl(v){lvl=v},set lvPrev(v){lvPrev=v},set lvT(v){lvT=v},mcW,mcOn,mcBg,mcCart,
    hlDraw:function(){hlDraw()},gpDraw:function(){gpDraw()},LEVELS,LV_SEC,GAP_LV}`;
  const g = new Function("calls", pre + body(LV) + body(MC) + api)(calls);
  return { g, calls };
}
const lvAt = (g, n, prev = n, tt = 99) => { g.state = "run"; g.lvl = n; g.lvPrev = prev; g.lvT = tt; };

t("L7 is MINE CART at 180 s (score 6210); L8 (placeholder) follows at 225 s", () => {
  const { g } = game();
  assert.equal(g.LEVELS.length, 8); assert.equal(g.LEVELS[6].key, "mine"); assert.equal(g.LV_SEC[6], 180); assert.equal(g.LV_SEC[7], 225);
});
t("theme weight mcW(): 1 on L7 only; 0 on L1-L6, on a later level (8) and outside a run (attract)", () => {
  const { g } = game();
  for (let n = 1; n <= 8; n++) { lvAt(g, n); assert.equal(g.mcW(), n === 7 ? 1 : 0, `L${n}`); assert.equal(g.mcOn(), n === 7, `mcOn L${n}`); }
  lvAt(g, 7); g.state = "start"; assert.equal(g.mcW(), 0, "attract screen: normal look");
  g.state = "over"; assert.equal(g.mcW(), 1, "game over on L7 keeps the L7 look");
});
t("crossfade: L6 -> L7 eases in over LV_FADE (swap at half way), L7 -> L8 eases back out", () => {
  const { g } = game();
  lvAt(g, 7, 6, 0); assert.equal(g.mcW(), 0); lvAt(g, 7, 6, .3); assert.ok(Math.abs(g.mcW() - .25) < 1e-9); assert.equal(g.mcOn(), false);
  lvAt(g, 7, 6, .6); assert.ok(Math.abs(g.mcW() - .5) < 1e-9); assert.equal(g.mcOn(), true); lvAt(g, 7, 6, 1.2); assert.equal(g.mcW(), 1);
  lvAt(g, 8, 7, .3); assert.ok(Math.abs(g.mcW() - .75) < 1e-9); lvAt(g, 8, 7, 1.2); assert.equal(g.mcW(), 0);
  lvAt(g, 6, 5, .6); assert.equal(g.mcW(), 0, "L5 -> L6: untouched");
});
t("hlDraw / gpDraw: the original 06i / 06k draws run unchanged off L7; on L7 the rails and open gaps replace them", () => {
  for (let n = 1; n <= 8; n++) {
    const { g, calls } = game(); lvAt(g, n); g.hlDraw(); g.gpDraw();
    if (n === 7) { assert.deepEqual([calls.hl, calls.gp], [0, 0], "L7: originals not called"); assert.ok(calls.stroke >= 2 && calls.rect > 0, "rails + ties + gap arc drawn"); }
    else { assert.deepEqual([calls.hl, calls.gp], [1, 1], `L${n}: originals called`); assert.equal(calls.stroke + calls.rect + calls.fill, 0, `L${n}: no mine drawing`); }
  }
  const off = game({ hills: false }); lvAt(off.g, 7); off.g.hlDraw(); assert.ok(off.calls.stroke >= 2, "?hills=0: flat rails still drawn on L7");
});
t("mcCart (drawPlayer hook): draws the cart tub on L7 only; mcBg fills the shaft (portrait too)", () => {
  for (let n = 1; n <= 8; n++) { const { g, calls } = game(); lvAt(g, n); g.mcCart(); assert.equal(calls.fill > 0, n === 7, `L${n}`); }
  for (const oy of [0, 300]) { const { g, calls } = game({ oy }); g.mcBg(1); assert.ok(calls.rect > 20, `shaft drawn (OY ${oy})`); }
});
t("hooks: 06f lvLayer hands L7 to mcBg; drawPlayer calls mcCart once; 06o sits after 06n and wraps hlDraw / gpDraw once", () => {
  assert.match(BG, /if\(n===7\)\{if\(typeof mcBg==="function"\)mcBg\(al\);return\}/);
  assert.equal(RENDER.split('typeof mcCart==="function"&&mcCart();').length, 2);
  const names = FRAGMENTS.map(([n]) => n); assert.equal(names.indexOf("06o-mine-cart.js"), names.indexOf("06n-arc-strikes.js") + 1);
  assert.equal(SCRIPT.split("function mcCart(").length, 2); assert.equal(SCRIPT.split("hlDraw=function(){if(mcOn())").length, 2);
  assert.ok(!/Math\.random|`|\$\{/.test(body(MC)), "06o: no Math.random, backticks or ${");
  assert.ok(!/\b(score|speed|scroll|runS|py|vy|state|lvl|lvPrev)\s*=[^=]/.test(body(MC)), "06o writes no game state");
});
t("L7 gameplay data: more gaps than L5, ore carts every slot 1.0 s apart, no strikes (06n is L6 only), no rollers, no decks", () => {
  const { g } = game(), L5 = g.GAP_LV[4], L7 = g.GAP_LV[6];
  assert.ok(L7.chance > L5.chance && L7.wMax > L5.wMax && L7.minClear >= .85 && L7.wMax <= 1);
  const gp = /var GP_DEF=(\[[\s\S]*?\]);/.exec(GP)[1]; assert.deepEqual(eval(gp)[6], L7, "06k GP_DEF fallback matches GAP_LV L7");
  const arr = (src, name) => eval(new RegExp(name + "(\\[[^\\]]*\\])").exec(src)[1]);
  assert.equal(arr(OC, "OC_P=")[6], 1); assert.equal(arr(OC, "OC_SP=")[6], 1); assert.equal(arr(OC, "OC_ML=").length, 8);
  assert.equal(arr(SR, "var CHASER_LV=").length, 9); assert.equal(eval(/var CHASER_LV=(\[.*?\]);/.exec(SR)[1])[7], null);
  assert.equal(arr(FK, "cap:")[7], 0);
  assert.match(ARC, /&&azLvl\(\)===6&&!azBoss\(\)/, "azOn gates on exactly L6");
});

// ---------------------------------------------------------------- L7 terrain (06i HL.mc humps)
const HPOST = `calls.mc=function(){return {x0:hlMx0,x1:hlMx1,n:hlMH.length,c:hlCurve,m:hlMine,w:hlMcW,tv:hlTvC}};`;
const hrun = (lv, secs, post = "") => { const r = hgame({ gaps: true, hi: 500, rand: rng(7), level: lv, lvMul: 1.053, post: HPOST + post }); r.g.start(); r.g.speed = 760;
  for (let i = 0; i < secs * 240 && r.g.state === "run"; i++) { r.g.auto(); r.g.inv = 1e9; r.g.spT = 0; r.g.now += 1000 / 240; r.g.update(1 / 240); } return r; };
t("L7 terrain: the humps start only on L7, past everything already generated; L1-L6 never set it (their hills are unchanged)", () => {
  for (let lv = 1; lv <= 6; lv++) { const { calls } = hrun(lv, 20); const m = calls.mc(); assert.equal(m.x0, Infinity, "L" + lv); assert.equal(m.n, 0); }
  const r = hgame({ gaps: true, hi: 500, rand: rng(7), level: 7, lvMul: 1.053, post: HPOST }); r.g.start(); r.g.speed = 760; r.g.now += 4; r.g.update(1 / 240);
  const m = r.calls.mc(), HL = r.g.hl.HL; assert.ok(m.x0 >= r.g.hsc + 600 + HL.ahead + HL.mc.lead - 1, "x0 past the generated track");
  for (let x = 0; x < m.x0; x += 37) assert.equal(m.w(x), 0, "nothing changes before x0");
});
t("L7 humps: continuous, slopes up to .38 and steep most of the time, crest h'' under the crest-launch threshold at the 800 felt cap, heights 60-150", () => {
  const { calls, g } = hrun(7, 1), m = calls.mc(), HL = g.hl.HL; let p = m.m(0), ps = 0, mxS = 0, mxK = 0, mxH = 0, steep = 0, N = 0;
  for (let x = 1; x < 40000; x++) { const h = m.m(x), sl = h - p; assert.ok(Math.abs(sl - ps) < 0.004, "slope continuous at " + x); mxS = Math.max(mxS, Math.abs(sl)); mxK = Math.max(mxK, -(sl - ps)); mxH = Math.max(mxH, h); if (Math.abs(sl) > 0.15) steep++; N++; p = h; ps = sl; assert.ok(h >= -1e-9) }
  assert.ok(mxS <= 0.381 && mxS >= 0.37, "max slope " + mxS); assert.ok(mxH <= 150.01 && mxH > 120, "max height " + mxH);
  assert.ok(mxK * 800 * 800 < 0.95 * 1800 * HL.cr, "crest h'' " + mxK + ": under the crest-launch threshold at 800 felt (5% margin)");
  assert.ok(steep / N > 0.5, "steeper than .15 for " + (steep / N).toFixed(2) + " of the track");
});
t("L7 humps blend back out after a later level (8): the normal curve returns past hlMx1 + ramp; jumps inherit the slope only on the humps", () => {
  const r = hgame({ gaps: true, hi: 500, rand: rng(7), level: "fn", lvMul: 1.053, post: HPOST + "var __lv=7;currentLevel=function(){return __lv};calls.set=function(v){__lv=v};" });
  r.g.start(); r.g.speed = 760; const step = (n) => { for (let i = 0; i < n; i++) { r.g.auto(); r.g.inv = 1e9; r.g.now += 1000 / 240; r.g.update(1 / 240) } };
  step(240 * 5); r.calls.set(8); step(2); const m = r.calls.mc(), HL = r.g.hl.HL;
  assert.ok(m.x1 < Infinity && m.x1 >= m.x0 + HL.mc.ramp); assert.equal(m.w(m.x1 + HL.mc.ramp + 1), 0); assert.equal(m.w(m.x0 + HL.mc.ramp + 1), 1);
  assert.equal(m.tv(m.x0 + HL.mc.ramp + 10), HL.mc.tvC); assert.equal(m.tv(m.x1 + HL.mc.ramp + 10), HL.tvC); assert.equal(m.tv(m.x0 - 10), HL.tvC);
});
t("a pit deck on the L7 humps (the L8 pit stop is booked late in L7): the humps flatten over HL.mc.fe, never into a launching crest", () => {
  const post = `calls.pit=function(o){var z0=hlMx0+o;fkDecks.length=0;fkDecks.push({t:1,H:FK.h[1],x0:z0+700,xe:z0+1500,xm:z0+1700,z0:z0,z1:z0+2400,pit:1});return z0};`;
  const r = hgame({ gaps: true, fork: true, hi: 500, rand: rng(3), level: 7, lvMul: 1.053, post: HPOST + post }); r.g.start(); r.g.speed = 760;
  for (let i = 0; i < 240; i++) { r.g.now += 4; r.g.update(1 / 240); }
  const c = r.calls.mc().c; let worst = 0;
  for (let o = 6000; o < 9500; o += 173) { const z0 = r.calls.pit(o); let p = c(z0 - 4500), ps = p - c(z0 - 4501);
    for (let x = z0 - 4499; x < z0 + 7000; x++) { const h = c(x), sl = h - p; worst = Math.max(worst, -(sl - ps)); p = h; ps = sl; } }
  assert.ok(worst * 800 * 800 < 1800 * r.g.hl.HL.cr, "crest vertical accel at 800 felt " + (worst * 640000).toFixed(0) + " vs launch " + 1800 * r.g.hl.HL.cr);
});
t("L8 placeholder: reuses the L2 SLAG PITS background (06f lvBgN), palette and music; the mine look and humps are off on it", () => {
  assert.match(BG, /var LVB_N=\{8:2\};/); assert.match(BG, /n=lvBgN\(n\);/);
  const { g } = game(); lvAt(g, 8); assert.equal(g.mcW(), 0); assert.equal(g.LEVELS[7].pal, g.LEVELS[1].pal);
});
console.log(`mine-cart: ${pass} tests passed`);
