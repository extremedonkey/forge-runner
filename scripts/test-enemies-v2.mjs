// ENEMIES v2 tests: evaluates the real state/sparks/levels/flow/simulation fragments with 06g-enemies-v2.js and the lab layer
// (src/client/lab/enemies-v2.js), the same way test-levels.mjs does. Run: node scripts/test-enemies-v2.mjs (also via npm test).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import EN from "../src/client/06g-enemies-v2.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LAB from "../src/client/lab/enemies-v2.js";
import RENDER from "../src/client/14-render.js";
import ESFX from "../src/client/08f-enemy-sfx.js";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   enemies-v2:", name); };

// env: { v2: include 06g + lab layer, demo, seed, sfx: "fn"|"throw"|undefined, level, en, felt }
// felt: stub Dev's vMul() (HILLS) so the world moves at felt px/s (vMul = felt/speed). On a 13 without the HILLS hook, the
// hook is emulated in a copy of 13 (spawnDist and entity x at speed*vMul(), exactly as HILLS #80 applies it); score/speed untouched.
const SIMV = (() => { let s = body(SIM); for (const [a, b] of [["    spawnDist+=speed*dt;\n", "    spawnDist+=speed*dt*(typeof vMul===\"function\"?vMul():1);\n"],
  ["      e.x-=(speed+(e.vx||0))*dt;\n", "      e.x-=(speed*(typeof vMul===\"function\"?vMul():1)+(e.vx||0))*dt;\n"]]) if (s.includes(a)) s = s.replace(a, b); return s; })();
// world speed for a test at base speed S (felt when vMul is stubbed)
const WV = (S, felt) => felt || S;
function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { ms: [], earn: [], sfx: [], spawns: [] };
  const ES = env.sfx === "real" ? body(ESFX) + "var __og=enGo;enGo=function(k,cd){calls.sfx.push(k);return __og(k,cd)};" : env.sfx === "enemySfx" ? "function enemySfx(t,e){calls.sfx.push(t+':'+e)}" : "";
  const SFX = ["sfxBlobHop", "sfxBlobPop", "sfxDroneWhirr", "sfxDroneWindup", "sfxDroneClang", "sfxVentHiss", "sfxVentWhoosh"];
  const sfx = env.sfx === "fn" ? SFX.map((n) => `function ${n}(){calls.sfx.push("${n}")}`).join("") :
    env.sfx === "throw" ? SFX.map((n) => `function ${n}(){calls.sfx.push("${n}");throw new Error("x")}`).join("") : "";
  const q = { level: env.level, en: env.en };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false;
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined?null:String(v)}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${env.portrait ? 20 : 0},OY=0,OB=0,VW=${env.portrait ? 444 : 600},ZM=${env.portrait ? 1.35 : 1},HS=1,K=1;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};var ctx={};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function upShow(){}function upHide(){}function msOn(e){calls.ms.push(e)}` + sfx + ES +
    (env.felt ? `function vMul(){return ${env.felt}/speed}` : "") + (env.dyn ? "var VMX=1;function vMul(){return Math.min(VMX,800/speed)}" : "");
  const api = `;return {get score(){return score},set score(v){score=v},get speed(){return speed},set speed(v){speed=v},get state(){return state},set state(v){state=v},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},set py(v){py=v},get vy(){return vy},set vy(v){vy=v},set inv(v){inv=v},set bgT(v){bgT=v},
    get tt(){return tt},press,release,set duck(v){duck=v},set spawnDist(v){spawnDist=v},get PX(){return PX},buggyLR:function(){var ph=pH(duck&&py===0);return {x:PX,y:GY-py-ph,w:pW(),h:ph,py:py,dk:!!(duck&&py===0)}},buggyRect:function(){var ph=pH(duck&&py===0);return {x:PX-8,y:GY-py-ph-16,w:pW()+16,h:ph+18}},get nt(){return nt},get rn(){return calls.rn()},start,update,
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    skEarnSpy:function(){var o=skEarn;skEarn=function(n){calls.earn.push(n);o(n)}},
    lv:function(){return currentLevel()},set vmx(v){if(typeof VMX!=="undefined")VMX=v},vmul:function(){return typeof vMul==="function"?vMul():1},v2:${env.v2 ? `{enV:enV,enHSD:enHSD,EN_AT:EN_AT,EN_SEC:EN_SEC,EN_VT:EN_VT,EN_HT:EN_HT,enOn:enOn,enTag:enTag,enPre:enPre,enPost:enPost,enSnd:enSnd,enVentT:enVentT,enHamT:enHamT,enJetRect:enJetRect,enHVis:enHVis,enSolid:typeof enSolid==="function"?enSolid:function(){return null},enHX:enHX,enHR:enHR,EN_VC:EN_VC,EN_BP:EN_BP,EN_OUT:EN_OUT}` : "null"}}`;
  calls.rn = () => rn;
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + (env.v2 ? body(EN) : "") + body(FLOW) + (env.felt || env.dyn ? SIMV : body(SIM)) + (env.v2 ? body(LAB) : "") + api;
  const g = new Function("Math", "calls", src)(M, calls);
  return { g, calls };
}
const orig = (e) => (e.t === "h" ? "d" : e.t);

t("200 s invulnerable run: score, speed, Math.random call count and the spawn timeline are identical with and without v2", () => {
  const a = game(), b = game({ v2: true });
  const la = [], lb = [];
  a.g.wrapSpawn((n, tt, nt) => la.push([tt.toFixed(6), nt, n.map((e) => [orig(e), e.x, e.w, e.h, e.t === "h" ? "d" : e.t].join())].join("|")));
  b.g.wrapSpawn((n, tt, nt) => lb.push([tt.toFixed(6), nt, n.map((e) => [orig(e), e.x, e.w, e.h, e.t === "h" ? "d" : e.t].join())].join("|")));
  a.g.start(); b.g.start();
  const sk = { l: 0, v: 0, h: 0 };
  for (let i = 0; i < 200 * 240; i++) {
    a.g.inv = 1e9; b.g.inv = 1e9;
    a.g.update(1 / 240); b.g.update(1 / 240);
    if (i % 240 === 0) { assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed); assert.equal(b.calls.rn(), a.calls.rn(), `RNG draws at ${i / 240} s`); }
    for (const e of b.g.ents) { if (e.sk === "l" && !e._c) { e._c = 1; sk.l++; } if (e.sk === "v" && !e._c) { e._c = 1; sk.v++; } if (e.t === "h" && !e._c) { e._c = 1; sk.h++; } }
  }
  assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed); assert.equal(b.calls.rn(), a.calls.rn());
  assert.ok(la.length > 100); assert.deepEqual(lb, la, "same spawns, same times, same positions/sizes");
  assert.ok(sk.l > 5 && sk.v > 0 && sk.h > 0, `v2 enemies appeared: ${JSON.stringify(sk)}`);
});
t("unlock one at a time: base-curve 40/50/60 s = score 960/1287/1650, or the level (L2/L3/L4)", () => {
  const { g } = game({ v2: true });
  assert.deepEqual(g.v2.EN_AT, { l: 960, v: 1287, h: 1650 });
  const on = (s) => { g.score = s; return ["l", "v", "h"].map((k) => +g.v2.enOn(k)).join(""); };
  // rule: base-curve time OR level floor, whichever comes first (thresholds read from 06d, so a threshold change can't break this)
  const LV = { l: 2, v: 3, h: 4 };
  for (let sc = 0; sc <= 4000; sc += 25) { g.score = sc; const lv = g.lv(); assert.equal(on(sc), ["l", "v", "h"].map((k) => +(sc >= g.v2.EN_AT[k] || lv >= LV[k])).join(""), `score ${sc} L${lv}`); }
  assert.equal(on(0), "000"); assert.equal(on(1650), "111");
  const seen = []; for (let sc = 0; sc <= 4000; sc += 5) { const o = on(sc); if (seen[seen.length - 1] !== o) seen.push(o); }
  assert.deepEqual(seen, ["000", "100", "110", "111"], "one at a time, in order");
  const l3 = game({ v2: true, level: 3 }); l3.g.score = 0; assert.ok(l3.g.v2.enOn("l") && l3.g.v2.enOn("v") && !l3.g.v2.enOn("h"));
  const l4 = game({ v2: true, level: 4 }); l4.g.score = 0; assert.ok(l4.g.v2.enOn("h"));
});
t("skins: bug v=1 -> slag blob (all bugs in L2), pillar -> ember vent, drone -> hammer drone; hitboxes unchanged; nothing before unlock", () => {
  const { g } = game({ v2: true });
  const mk = () => [{ t: "b", w: 30, h: 21, bot: 0, v: 0 }, { t: "b", w: 30, h: 21, bot: 0, v: 1 }, { t: "p", w: 26, h: 50, bot: 0 }, { t: "d", w: 30, h: 15, bot: 60 }, { t: "f", w: 33, h: 18, bot: 4 }, { t: "k", w: 12, h: 12, bot: 8 }];
  const exp = () => { const on = (k) => g.v2.enOn(k), l2 = g.lv() === 2; return [on("l") && l2 ? "l" : "b", on("l") ? "l" : "b", on("v") ? "v" : "p", on("h") ? "h" : "d", "f", "k"]; };
  let es; g.score = 100; es = mk(); es.forEach(g.v2.enTag); assert.deepEqual(es.map((e) => e.sk || e.t), ["b", "b", "p", "d", "f", "k"], "nothing before any unlock");
  for (let sc = 0; sc <= 4000; sc += 50) { g.score = sc; es = mk(); es.forEach(g.v2.enTag); assert.deepEqual(es.map((e) => e.sk || e.t), exp(), `score ${sc}`); }
  const l2 = game({ v2: true, level: 2 }); l2.g.score = 0; es = mk(); es.forEach(l2.g.v2.enTag);
  assert.deepEqual(es.map((e) => e.sk || e.t), ["l", "l", "p", "d", "f", "k"], "L2 Slag Pits: every bug is a blob, vent/drone not yet");
  g.score = 3000; es = mk(); es.forEach(g.v2.enTag); assert.deepEqual(es.map((e) => e.sk || e.t), ["b", "l", "v", "h", "f", "k"], "late: half the bugs (v roll), all pillars/drones");
  assert.deepEqual(es.map((e) => [e.w, e.h]), [[30, 21], [30, 21], [26, 50], [30, 15], [33, 18], [12, 12]]);
});
t("stomp: falling onto a slag blob removes it, bounces, skEarn(3) and msOn('stomp'); side contact / ground / big cart = no stomp", () => {
  const { g, calls } = game({ v2: true }); g.skEarnSpy(); g.start(); g.score = 1500;
  const blob = () => ({ t: "b", sk: "l", x: 56, w: 30, h: 21, bot: 0, v: 1 });
  g.ents = [blob()]; g.py = 22; g.vy = -150; g.v2.enPre(1 / 240);
  assert.equal(g.ents.length, 0); assert.ok(g.vy > 300); assert.deepEqual(calls.earn, [3]); assert.deepEqual(calls.ms.filter((m) => m === "stomp"), ["stomp"]);
  g.ents = [blob()]; g.py = 0; g.vy = 0; g.v2.enPre(1 / 240); assert.equal(g.ents.length, 1, "on the ground: no stomp (the bug rule applies)");
  g.ents = [blob()]; g.py = 22; g.vy = 150; g.v2.enPre(1 / 240); assert.equal(g.ents.length, 1, "rising: no stomp");
  g.ents = [blob()]; g.py = 22; g.vy = -150; g.bgT = 5; g.v2.enPre(1 / 240); assert.equal(g.ents.length, 1, "big cart: flattened by the bug rule instead");
  const d = game({ v2: true, demo: true }); d.g.start(); d.g.ents = [blob()]; d.g.py = 22; d.g.vy = -150; d.g.v2.enPre(1 / 240);
  assert.equal(d.g.ents.length, 0); assert.deepEqual(d.calls.ms.filter((m) => m === "stomp"), [], "no mission progress in demo");
});
t("hammer drone at 800 px/s felt (vMul stub; 760 base): hovers with no hitbox, wind-up >= 0.5 s from the x=W+20 spawn, slam lead 104 px (0.13 s), slams within 0.05 s", () => {
  const { g, calls } = game({ v2: true, sfx: "fn", felt: 800 }); g.start(); g.score = 3000; g.speed = 760;
  const e = { t: "h", x: 620, w: 30, h: 15, bot: 999, vb: 162, hs: 0, ph: 0 }; g.ents = [e];
  let tw = 0, tsl = 0, dt = 1 / 240, slamDx = null;
  while (e.x > -40) {
    g.v2.enPre(dt); if (e.hs === 1) tw += dt; if (e.hs === 2) { if (slamDx === null) slamDx = e.x - (56 + 45); tsl += dt; }
    if (e.hs < 3) assert.equal(e.bot, 999); if (e.hs === 3) assert.ok(Math.abs(e.bot - 16) <= 1.5);
    e.x -= 800 * dt; g.v2.enPost(dt); g.v2.enSnd();
  }
  assert.ok(tw >= .5 && tw < .53, `wind-up ${tw.toFixed(3)} s`); assert.ok(tsl <= .05 + 1e-9); assert.ok(Math.abs(slamDx - 104) <= 800 / 240 + 1e-9, "slam lead " + slamDx);
  assert.equal(g.v2.enV(), 800); assert.equal(e.hs, 3); assert.equal(calls.sfx.filter((s) => s === "sfxDroneWindup").length, 1);
  console.log(`     800 felt: wind-up ${tw.toFixed(3)} s, slam at ${slamDx.toFixed(1)} px (${(slamDx / 800).toFixed(3)} s) before contact`);
});
// Playtest #82: min visible wind-up 0.493 s at L5 with hills on: the downhill boost sped the world up mid wind-up. vMul stubbed
// (min(VMX, 800/speed)); the world (drone x) moves at speed*vMul each step; VMX switches from an uphill value to the 1.10 crest
// boost at various times after the spawn, or stays at 1.10 (800 felt). The visible wind-up must stay >= 0.5 s.
function windup(portrait, fps, S, vA, vB, tSw, phase) {
  const { g } = game({ v2: true, portrait, dyn: true }); g.start(); g.score = 3000; g.speed = S; g.vmx = vA;
  const dt = 1 / fps, e = { t: "d", x: 620 - phase * S * g.vmul() / fps, w: 30, h: 15, bot: 60, ph: 0 }; g.v2.enTag(e); g.ents = [e];
  let vis = 0, t = 0, slamDx = null, first = null;
  while (e.x > -40) {
    g.speed = S; g.vmx = t >= tSw ? vB : vA;
    g.v2.enPre(dt); if (e.hs === 1) { if (first === null) first = g.v2.enHVis(e); if (g.v2.enHVis(e)) vis += dt; } if (e.hs >= 2 && slamDx === null) slamDx = e.x - (56 + 45);
    e.x -= S * g.vmul() * dt; t += dt;
  }
  return { vis, slamDx, first, hs: e.hs };
}
t("drone wind-up >= 0.5 s with vMul stubbed at 1.10 (800 felt) and with a 1.10 crest boost arriving mid wind-up (uphill 0.8/0.9 -> 1.10), 390x844 + desktop, 240/60 fps, spawn phases", () => {
  let worst = 9, wc = "", n = 0, minLead = 1e9;
  const cases = [[727.3, 1.1, 1.1, 0], [760, 1.1, 1.1, 0]];
  for (const S of [700, 760]) for (const vA of [0.8, 0.9, 1.0]) for (const tSw of [0, .05, .1, .2, .3, .4, .5]) cases.push([S, vA, 1.1, tSw]);
  for (const portrait of [true, false]) for (const fps of [240, 60]) for (const [S, vA, vB, tSw] of cases) for (const phase of [0, .5, .999]) {
    const r = windup(portrait, fps, S, vA, vB, tSw, phase); n++;
    assert.equal(r.first, true, "wind-up began on screen"); assert.equal(r.hs, 3, "slammed");
    if (r.vis < worst) { worst = r.vis; wc = `${portrait ? "390x844" : "desktop"} ${fps}fps base ${S} vMul ${vA}->${vB} at +${tSw}s phase ${phase}`; }
    minLead = Math.min(minLead, r.slamDx);
    assert.ok(r.vis >= .5 - 1e-9, `visible wind-up ${r.vis.toFixed(3)} s: ${portrait ? "390x844" : "desktop"} ${fps}fps base ${S} vMul ${vA}->${vB} at +${tSw}s phase ${phase}`);
  }
  assert.ok(minLead >= 90, "slam lead " + minLead);
  console.log(`     ${n} wind-ups: worst visible ${worst.toFixed(3)} s (${wc}); min slam lead ${minLead.toFixed(1)} px`);
});
t("enHSD slam lead: v*0.15 up to 760 (unchanged), continuous above, 104 px at 800", () => {
  const { g } = game({ v2: true });
  for (const v of [340, 515, 620, 760]) assert.ok(Math.abs(g.v2.enHSD(v) - v * .15) < 1e-9);
  assert.ok(Math.abs(g.v2.enHSD(800) - 104) < 1e-9);
  for (let v = 700; v < 800; v += .5) { const a = g.v2.enHSD(v), b = g.v2.enHSD(v + .5); assert.ok(Math.abs(b - a) < .2, `continuous at ${v}`); }
});
t("hammer drone spawned at x=W+20 at the 760 px/s cap: hovers high with no hitbox, full 0.53 s wind-up, slams to bot 16 within 0.05 s and stays; msOn('drone') once when dodged; SFX once each", () => {
  const { g, calls } = game({ v2: true, sfx: "fn" }); g.start(); g.score = 3000; g.speed = 760;
  const e = { t: "h", x: 620, w: 30, h: 15, bot: 999, vb: 162, hs: 0, ph: 0 }; g.ents = [e];
  let tw = 0, tsl = 0, dt = 1 / 240;
  while (e.x > -40) {
    g.v2.enPre(dt); if (e.hs === 1) tw += dt; if (e.hs === 2) tsl += dt;
    if (e.hs < 3) assert.equal(e.bot, 999, "no hitbox while hovering / winding up / diving"); if (e.hs === 3) assert.ok(Math.abs(e.bot - 16) <= 1.5);
    e.x -= g.speed * dt; g.v2.enPost(dt); g.v2.enSnd();
  }
  assert.ok(Math.abs(tw - .53) < .01, `wind-up ${tw.toFixed(3)} s`); assert.ok(tsl <= .05 + 1e-9, `slam ${tsl.toFixed(3)} s`);
  assert.equal(e.w, 30); assert.equal(e.h, 15); assert.equal(e.hs, 3);
  assert.deepEqual(calls.ms.filter((m) => m === "drone"), ["drone"]);
  assert.equal(calls.sfx.filter((s) => s === "sfxDroneWindup").length, 1); assert.equal(calls.sfx.filter((s) => s === "sfxDroneClang").length, 1);
});
// Jump-only / duck-only players vs ONE drone (old 'd' vs new 'h'), at the speeds drones appear at. The input fires when the
// drone is L seconds from contact (dx/speed); sweep L 0..0.60 s. Every L that survives the old drone must survive the new one.
function vsDrone(v2, S, mode, L, felt) {
  const { g } = game({ v2, seed: 3, felt }); g.start(); g.score = 3000;
  const e = { t: "d", x: 620, w: 30, h: 15, bot: 60, ph: 0 }; if (v2) g.v2.enTag(e); g.ents = [e];
  let fired = -1, dt = 1 / 240;
  for (let i = 0; i < 2 * 240; i++) {
    g.speed = S; g.spawnDist = 0;
    const ttc = (e.x - (g.PX + 45)) / WV(S, felt);
    if (fired < 0 && ttc <= L) { fired = i; if (mode === "duck") g.duck = true; else if (mode !== "none") g.press(); }
    if (mode === "tap" && fired >= 0 && i === fired + 1) g.release();
    if (mode === "hold" && fired >= 0 && i === fired + 60) g.release();
    g.update(dt);
    if (g.state !== "run") return false;
    if (!g.ents.includes(e)) return true;
  }
  return true;
}
// Clean clears in portrait: per frame, the enemy's hitbox position, its enSolid() rects and the buggy's state,
// so a drawn silhouette can be tested against the drawn buggy afterwards. kind "l" = blob (jumps; stomps don't count
// as clears), "h" = low hammer drone (jumps and ducks). Input times sweep 0..0.60 s before contact in 0.01 s steps.
function clears(kind, portrait) {
  const out = [], Ls = Array.from({ length: 61 }, (_, i) => i / 100);
  const speeds = kind === "l" ? [480, 620, 760] : [515, 620, 690, 760], modes = kind === "l" ? ["tap", "hold"] : ["tap", "hold", "duck"];
  for (const S of speeds) for (const mode of modes) for (const L of Ls) {
    const { g } = game({ v2: true, seed: 3, portrait }); g.start(); g.score = 3000;
    const e = kind === "l" ? { t: "b", sk: "l", x: 620, w: 30, h: 21, bot: 0, v: 1 } : { t: "d", x: 620, w: 30, h: 15, bot: 60, ph: 0 };
    if (kind === "h") g.v2.enTag(e); g.ents = [e];
    let fired = -1, dt = 1 / 240, fr = [], dead = false;
    for (let i = 0; i < 2 * 240; i++) {
      g.speed = S; g.spawnDist = 0;
      const ttc = (e.x - (g.PX + 45)) / S;
      if (fired < 0 && ttc <= L) { fired = i; if (mode === "duck") g.duck = true; else g.press(); }
      if (mode === "tap" && fired >= 0 && i === fired + 1) g.release();
      if (mode === "hold" && fired >= 0 && i === fired + 60) g.release();
      g.update(dt);
      if (g.state !== "run") { dead = true; break; }
      if (!g.ents.includes(e)) break;
      if (kind === "h" && e.hs !== 3) continue; // hover / dive: no hitbox, and the dive starts >= 77 px ahead of the buggy
      const b = g.buggyLR(), so = g.v2.enSolid(e);
      if (e.x < b.x + b.w + 40 && e.x + e.w > b.x - 40) fr.push({ b, so, x: e.x, bot: e.bot });
    }
    if (dead || (kind === "l" && !g.ents.includes(e) && e.x > 0)) continue; // died or stomped
    out.push({ S, mode, L, fr });
  }
  return out;
}
// the buggy as drawn (14-render drawPlayer, rbM=1): two r=7 wheels centred 13 px either side of PX+22.5 at 7 px up, the
// chassis beam (26x2 at 8 up) and the anvil body 48x20 from 11 to 31 px up (ducking: squashed to 4.6..18.6 px up)
const rr = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rc = (a, cx, cy, r) => { const dx = Math.max(a.x - cx, 0, cx - (a.x + a.w)), dy = Math.max(a.y - cy, 0, cy - (a.y + a.h)); return dx * dx + dy * dy < r * r; };
function buggyHit(a, b) {
  if (!a) return false; const g = 232 - b.py, cx = b.x + 22.5;
  return rc(a, cx - 13, g - 7, 7) || rc(a, cx + 13, g - 7, 7) || rr(a, { x: cx - 13, y: g - 8, w: 26, h: 2 }) ||
    rr(a, b.dk ? { x: cx - 23, y: g - 18.6, w: 48, h: 14 } : { x: cx - 23, y: g - 31, w: 48, h: 20 });
}
const ov = (a, b) => (Array.isArray(a) ? a.some((r) => buggyHit(r, b)) : buggyHit(a, b));
const pct = (cs, rectOf) => { const n = cs.filter((c) => c.fr.some((f) => ov(rectOf(f), f.b))).length; return { n, of: cs.length, p: 100 * n / cs.length }; };
// the r3 (#57) portrait drawing, for the before number: blob = 30x21 sprite + opaque 3 px dark outline left/right/top;
// low drone = chassis 36x17 (x-3..x+33, y-3..y+14) + solid rotor (46 wide, from y-10), x1.2 about (x+15, y+15)
const before = {
  l: (f) => ({ x: f.x - 3, y: 232 - f.bot - 24, w: 36, h: 24 }), // spr() draws in device px, so the r3 1.2x never applied to it
  h: (f) => { const s = 1.2, cx = f.x + 15, by = 232 - f.bot, top = by - 15 - 10; return { x: cx - 23 * s, y: by - (by - top) * s, w: 46 * s, h: (by - top) * s }; },
};
const WIN = {};
t("jump-only (tap and hold) and duck-only players survive the hammer drone at every input time that beat the old drone, at 515/620/690/760 px/s; standing still still dies", () => {
  const Ls = Array.from({ length: 61 }, (_, i) => i / 100);
  for (const S of [515, 620, 690, 760]) for (const mode of ["tap", "hold", "duck"]) {
    const o = Ls.filter((L) => vsDrone(false, S, mode, L)), n = Ls.filter((L) => vsDrone(true, S, mode, L));
    for (const L of o) assert.ok(n.includes(L), `${mode} at ${S} px/s, input ${L}s before contact beat the old drone but not the new one`);
    assert.ok(n.length >= 8, `${mode} at ${S}: survivable window too small (${n.length})`);
    WIN[`${S} ${mode}`] = { old: o.length ? `${o[0]}-${o[o.length - 1]}s (${o.length})` : "none", new: n.length ? `${n[0]}-${n[n.length - 1]}s (${n.length})` : "none" };
  }
  for (const S of [515, 760]) { assert.equal(vsDrone(false, S, "none", 0), false); assert.equal(vsDrone(true, S, "none", 0), false); }
  // felt 800 (vMul stub at 760 base): the same rule against the old drone moving at 800
  for (const mode of ["tap", "hold", "duck"]) {
    const o = Ls.filter((L) => vsDrone(false, 760, mode, L, 800)), n = Ls.filter((L) => vsDrone(true, 760, mode, L, 800));
    for (const L of o) assert.ok(n.includes(L), `${mode} at 800 felt, input ${L}s beat the old drone but not the new one`);
    assert.ok(n.length >= 8, `${mode} at 800 felt: window ${n.length}`);
    WIN[`800f ${mode}`] = { old: o.length ? `${o[0]}-${o[o.length - 1]}s (${o.length})` : "none", new: n.length ? `${n[0]}-${n[n.length - 1]}s (${n.length})` : "none" };
  }
  assert.equal(vsDrone(true, 760, "none", 0, 800), false);
  console.log("     input-time windows (seconds before contact that survive; count of 0.01 s steps):");
  for (const k in WIN) console.log(`     ${k.padEnd(9)} old ${WIN[k].old.padEnd(16)} new ${WIN[k].new}`);
});
// Successful jumps over a bursting vent: the drawn flame-jet rect (enJetRect, a bound on everything the jet draws) must
// never overlap a generous bound of the drawn buggy (PX-8 .. PX+pW+8, wheels to antenna) at any step.
function vsVent(S, mode, L, felt) {
  const { g } = game({ v2: true, seed: 5, felt }); g.start(); g.score = 3000;
  const e = { t: "p", x: 620, w: 26, h: 50, bot: 0 }; g.v2.enTag(e); g.ents = [e];
  let fired = -1, dt = 1 / 240, jet = 0, bad = 0, oldBad = 0;
  for (let i = 0; i < 2 * 240; i++) {
    g.speed = S; g.spawnDist = 0;
    const ttc = (e.x - (g.PX + 45)) / WV(S, felt);
    if (fired < 0 && ttc <= L) { fired = i; g.press(); }
    if (mode === "tap" && i === fired + 1) g.release();
    if (mode === "hold" && fired >= 0 && i === fired + 60) g.release();
    g.update(dt);
    if (g.state !== "run") return { ok: false };
    const j = g.v2.enJetRect(e), b = g.buggyRect();
    if (j) { jet++; if (j.x < b.x + b.w && j.x + j.w > b.x && j.y < b.y + b.h && j.y + j.h > b.y) bad++; }
    const tv = g.v2.enVentT(e);
    if (tv <= 0) { const x = Math.round(e.x), jh = Math.round(48 * Math.min(1, -tv / .05)), o = { x: x - 2, y: 232 - 50 - jh - 34, w: 32, h: jh + 34 };
      if (o.x < b.x + b.w && o.x + o.w > b.x && o.y < b.y + b.h && o.y + o.h > b.y) oldBad++; }
    if (e.x < -60) break;
  }
  return { ok: true, jet, bad, oldBad };
}
t("vent flame jet never overlaps the drawn buggy on any successful jump (tap/hold, 515/620/690/760 px/s), and it does erupt", () => {
  const Ls = Array.from({ length: 61 }, (_, i) => i / 100); const out = []; let clears = 0, oldHit = 0, newHit = 0;
  for (const [S, felt] of [[515], [620], [690], [760], [760, 800]]) for (const mode of ["tap", "hold"]) {
    let n = 0;
    for (const L of Ls) { const r = vsVent(S, mode, L, felt); if (!r.ok) continue; n++; clears++; if (r.oldBad) oldHit++; if (r.bad) newHit++; assert.ok(r.jet > 0, `jet shown (${S} ${mode} ${L})`); assert.equal(r.bad, 0, `jet overlapped the buggy at ${S} px/s, ${mode} jump ${L}s before contact`); }
    assert.ok(n >= 5, `${felt ? felt + "f" : S} ${mode}: ${n} successful timings`); out.push(`${felt ? felt + " felt" : S} ${mode}: ${n}`);
  }
  console.log("     successful jump timings checked (0.01 s steps): " + out.join(", "));
  console.log(`     jet drawn over the buggy: before (r2 full jet from the burst) ${oldHit}/${clears} = ${(100 * oldHit / clears).toFixed(0)}% of clears; now ${newHit}/${clears} = ${(100 * newHit / clears).toFixed(0)}%`);
  assert.ok(oldHit > 0, "the before-measure must see the old problem"); assert.equal(newHit, 0);
});
// WCAG contrast (same helpers as test-levels.mjs). Worst case for these light sprite colours is the BRIGHTEST lane-band pixel;
// test-levels asserts every level's lane band (0-70 px above ground) is no brighter than L1's (city silhouette rgb 40,30,72).
const lin = (v) => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const lumH = (c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255); return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b); };
const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
const BAND = .2126 * lin(40 / 255) + .7152 * lin(30 / 255) + .0722 * lin(72 / 255);
t("contrast >= 3:1 on the lane band: cold ember-vent stack (body, rims, cap, cold slats, ember line) and the slag blob body; blob outline vs its body >= 3:1", () => {
  const { g } = game({ v2: true }), rows = [];
  for (const k in g.v2.EN_VC) { const r = ratio(lumH(g.v2.EN_VC[k]), BAND); rows.push(`vent ${k} ${r.toFixed(2)}`); assert.ok(r >= 3, `cold vent ${k} ${g.v2.EN_VC[k]}: ${r.toFixed(2)}:1`); }
  g.v2.EN_BP.forEach((pal, v) => { for (const k of ["o", "y", "r"]) { const r = ratio(lumH(pal[k]), BAND), ro = ratio(lumH(pal[k]), lumH(g.v2.EN_OUT.o)); rows.push(`blob${v} ${k} ${r.toFixed(2)}`);
    assert.ok(r >= 3, `blob v${v} ${k} ${pal[k]}: ${r.toFixed(2)}:1`); assert.ok(ro >= 3, `blob outline vs ${k}: ${ro.toFixed(2)}`); } });
  console.log("     " + rows.join(", "));
});
t("hammer drone wind-up starts only once it is fully on screen and >= 0.50 s of it is visible, at 390x844 and desktop, 515-760 px/s and 800 felt (vMul stub), at 240 and 60 fps", () => {
  const out = [], W800 = [9, 9]; let worst = 9;
  for (const fps of [240, 60]) for (const portrait of [true, false]) for (const [S, felt] of [[515], [620], [690], [760], [760, 800]]) for (const x0 of [620, 620 - WV(S, felt) / fps / 2, 620 - WV(S, felt) / fps + 1e-6]) {
    const { g } = game({ v2: true, portrait, felt }); g.start(); g.score = 3000; g.speed = S;
    const e = { t: "d", x: x0, w: 30, h: 15, bot: 60, ph: 0 }; g.v2.enTag(e); g.ents = [e];
    let vis = 0, first = null, dt = 1 / fps;
    while (e.x > -40) { g.speed = S; g.v2.enPre(dt); if (e.hs === 1) { if (first === null) first = g.v2.enHVis(e); if (g.v2.enHVis(e)) vis += dt; } e.x -= WV(S, felt) * dt; }
    const lb = `${portrait ? "390x844" : "desktop"} ${felt ? felt + "felt" : S}@${fps}`;
    assert.equal(first, true, "wind-up began on screen"); assert.ok(vis >= .5 - 1e-9, `${lb}: visible wind-up ${vis.toFixed(3)} s`);
    worst = Math.min(worst, vis); if (felt) W800[portrait ? 1 : 0] = Math.min(W800[portrait ? 1 : 0], vis); if (x0 === 620) out.push(`${lb}: ${vis.toFixed(3)}s`);
  }
  console.log("     visible wind-up: " + out.join(", ") + "; worst case over spawn phases " + worst.toFixed(3) + " s; at 800 felt worst desktop " + W800[0].toFixed(3) + " s, 390x844 " + W800[1].toFixed(3) + " s");
});
// Portrait (390x844) "fit": in clean clears (the buggy survives and the enemy passes it), does the enemy's drawn OPAQUE
// silhouette (06g enSolid) overlap the buggy as drawn (buggyHit)? Clears = jumps (tap/hold) over the blob (stomps excluded),
// jumps + ducks vs the low hammer drone, at the speeds they appear at; input times = the middle 80% of each answer's
// surviving window (frame-perfect edge timings excluded: the 20% hitbox trim on both boxes makes those graze by design).
// The before number replays the same clears against the r3 (#57) drawing: blob 30x21 + opaque 3 px outline, low drone at
// 1.2x with its opaque 36x17 chassis + rotor.
function mid80(cs) { const gs = {}, out = []; for (const c of cs) (gs[c.S + c.mode] ||= []).push(c);
  for (const k in gs) { const g = gs[k], lo = Math.min(...g.map((c) => c.L)), hi = Math.max(...g.map((c) => c.L)), m = (hi - lo) * .1; out.push(...g.filter((c) => c.L >= lo + m - 1e-9 && c.L <= hi - m + 1e-9)); }
  return out; }
t("390x844 fit: clean clears where the drawn solid silhouette overlaps the drawn buggy are < 3% for the slag blob and the low hammer drone (was ~11% / ~65% with the r3 sprites)", () => {
  const rows = [];
  for (const k of ["l", "h"]) {
    const cs = mid80(clears(k, true)), b = pct(cs, before[k]), a = pct(cs, (f) => f.so);
    rows.push(`${k === "l" ? "blob" : "low drone"}: before ${b.n}/${b.of} = ${b.p.toFixed(1)}%, now ${a.n}/${a.of} = ${a.p.toFixed(1)}%`);
    assert.ok(cs.length > 100, "enough clears"); assert.ok(cs.every((c) => c.fr.length > 0 && c.fr.every((f) => f.so)), "enSolid defined while passing");
    assert.ok(a.p < 3, rows[rows.length - 1]); assert.ok(b.p > 5, "the before geometry did overhang");
  }
  // and the opaque silhouette sits inside the hitbox
  const { g } = game({ v2: true, portrait: true }); g.start(); g.score = 3000;
  const bl = { t: "b", sk: "l", x: 300, w: 30, h: 21, bot: 0, v: 1 }, dr = { t: "h", x: 300, w: 30, h: 15, bot: 16, vb: 16, hs: 3, hw: 1 };
  for (const e of [bl, dr]) for (const r of g.v2.enSolid(e)) assert.ok(r.x >= e.x && r.x + r.w <= e.x + e.w && r.y >= 232 - e.bot - e.h && r.y + r.h <= 232 - e.bot, JSON.stringify(r));
  console.log("     " + rows.join("; "));
});
t("ember vent: full 0.6 s telegraph even at the 760 px/s cap, then the burst 0.08 s before it reaches the buggy; hitbox stays the pillar's 26x50; SFX once each", () => {
  const { g, calls } = game({ v2: true, sfx: "fn" }); g.start(); g.speed = 760;
  const e = { t: "p", sk: "v", x: 620, w: 26, h: 50, bot: 0 }; g.ents = [e];
  let tt = 0, tb = 0, dt = 1 / 240;
  while (e.x > PXc()) { const v = g.v2.enVentT(e); if (v <= .6 && v > 0) tt += dt; if (v <= 0) tb += dt; e.x -= g.speed * dt; g.v2.enPost(dt); g.v2.enSnd(); }
  function PXc() { return 56 + 45; }
  assert.ok(Math.abs(tt - .6) < .01, `telegraph ${tt.toFixed(3)} s`); assert.ok(Math.abs(tb - .08) < .01, `burst lead ${tb.toFixed(3)} s`);
  assert.deepEqual([e.w, e.h, e.bot], [26, 50, 0]);
  assert.equal(calls.sfx.filter((s) => s === "sfxVentHiss").length, 1); assert.equal(calls.sfx.filter((s) => s === "sfxVentWhoosh").length, 1);
});
t("ember vent at 800 px/s felt (vMul stub): telegraph >= 0.5 s from the x=W+20 spawn (the full 0.6 s needs 544 px), burst 0.08 s before contact", () => {
  const out = [];
  for (const fps of [240, 60]) for (const ph of [0, 1]) {
    const { g } = game({ v2: true, felt: 800 }); g.start(); g.speed = 760;
    const e = { t: "p", sk: "v", x: 620 - ph * 800 / fps + (ph ? 1e-6 : 0), w: 26, h: 50, bot: 0 }; g.ents = [e];
    let tt = 0, tb = 0, dt = 1 / fps;
    while (e.x > 101) { const v = g.v2.enVentT(e); if (v <= .6 && v > 0) tt += dt; if (v <= 0) tb += dt; e.x -= 800 * dt; }
    assert.ok(tt >= .5, `telegraph ${tt.toFixed(3)} s @${fps}`); assert.ok(Math.abs(tb - .08) <= dt + 1e-9, `burst lead ${tb.toFixed(3)}`);
    out.push(`${fps}fps${ph ? " late phase" : ""} ${tt.toFixed(3)} s`);
  }
  console.log("     vent telegraph at 800 felt: " + out.join(", "));
});
t("Audio's enemySfx(type,event) is preferred when present: drone telegraph/swing/hover, vent telegraph/burst, slag telegraph/burst", () => {
  const { g, calls } = game({ v2: true, sfx: "enemySfx" }); g.start(); g.speed = 760; g.score = 3000;
  const h = { t: "h", x: 620, w: 30, h: 15, bot: 60, hs: 0 }, v = { t: "p", sk: "v", x: 640, w: 26, h: 50, bot: 0 }, l = { t: "b", sk: "l", x: 560, w: 30, h: 21, bot: 0, v: 1 };
  g.ents = [h, v, l]; const dt = 1 / 240;
  for (let i = 0; i < 240; i++) { g.v2.enPre(dt); for (const e of g.ents) e.x -= g.speed * dt; g.v2.enPost(dt); g.v2.enSnd(); }
  const n = (k) => calls.sfx.filter((s) => s === k).length;
  for (const k of ["drone:telegraph", "drone:swing", "vent:telegraph", "vent:burst", "slag:telegraph"]) assert.equal(n(k), 1, k);
  assert.ok(n("drone:hover") > 10, "hover every on-screen frame (cooldown lives in enemySfx)");
  g.ents = [{ t: "b", sk: "l", x: 56, w: 30, h: 21, bot: 0, v: 1 }]; g.py = 22; g.vy = -150; g.v2.enPre(dt);
  assert.equal(n("slag:burst"), 0, "nothing from the sim step"); g.v2.enSnd(); assert.equal(n("slag:burst"), 1, "stomp pop plays from the draw path");
});
t("with Audio's real 08f enemySfx on main: the 7 events reach their sounds exactly once each (hover per frame), nothing plays twice via the fallback", () => {
  const { g, calls } = game({ v2: true, sfx: "real" }); g.start(); g.speed = 760; g.score = 3000;
  const h = { t: "d", x: 620, w: 30, h: 15, bot: 60, ph: 0 }; g.v2.enTag(h);
  const v = { t: "p", sk: "v", x: 640, w: 26, h: 50, bot: 0 }, l = { t: "b", sk: "l", x: 560, w: 30, h: 21, bot: 0, v: 1 };
  g.ents = [h, v, l]; const dt = 1 / 240;
  for (let i = 0; i < 240; i++) { g.v2.enPre(dt); for (const e of g.ents) e.x -= g.speed * dt; g.v2.enPost(dt); g.v2.enSnd(); }
  g.ents = [{ t: "b", sk: "l", x: 56, w: 30, h: 21, bot: 0, v: 1 }]; g.py = 22; g.vy = -150; g.v2.enPre(dt); g.v2.enSnd();
  const n = (k) => calls.sfx.filter((s) => s === k).length;
  // keys: du wind-up, dc clang, dw whirr, vh hiss, vw whoosh, bh hop, bp pop
  assert.deepEqual({ du: n("du"), dc: n("dc"), vh: n("vh"), vw: n("vw"), bh: n("bh"), bp: n("bp") }, { du: 1, dc: 1, vh: 1, vw: 1, bh: 1, bp: 1 });
  assert.ok(n("dw") > 10, "hover whirr offered every on-screen frame (its own 0.25 s cooldown thins it)");
});
t("SFX are optional: missing or throwing functions never break a run", () => {
  for (const sfx of [undefined, "throw"]) {
    const { g } = game({ v2: true, sfx, level: 4, en: "h" }); g.start();
    assert.doesNotThrow(() => { for (let i = 0; i < 30 * 240; i++) { g.inv = 1e9; g.update(1 / 240); g.v2.enSnd(); } });
    assert.equal(g.state, "run");
  }
});
t("demo autopilot survives the v2 enemies (L5 mix, 120 s, 3 seeds)", () => {
  for (const seed of [1, 7, 42]) {
    const { g } = game({ v2: true, demo: true, level: 5, seed }); g.start();
    let deaths = 0, was = "run";
    for (let i = 0; i < 120 * 240; i++) { g.update(1 / 240); if (g.state === "over" && was === "run") deaths++; was = g.state; }
    assert.ok(deaths <= 1, `seed ${seed}: ${deaths} deaths`);
  }
});
t("hooks in 13/14 are short typeof-guarded lines (plus the autopilot 'h' case) and touch no score/speed line", () => {
  const hk = (src) => src.split("\n").filter((l) => /\ben(Pre|Post|TagAll|Draw|DrawAfter)\b|e\.t==="h"/.test(l));
  const h13 = hk(SIM), h14 = hk(RENDER);
  assert.equal(h13.length, 4); assert.equal(h14.length, 2);
  for (const l of [...h13, ...h14]) {
    assert.ok(/typeof en\w+==="function"&&en\w+\(/.test(l) || /if\(e\.t==="h"\)\{if\(d<rel\*\.45\)wantDuck=true;continue\}/.test(l), l);
    assert.ok(!/score|speed/.test(l.replace(/\/\*.*\*\//, "")), l);
  }
});
t("06g: no Math.random, never assigns score/speed/spawn state; lab layer only in the lab build", () => {
  const code = body(EN).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/Math\.random/.test(code));
  assert.ok(!/(^|[^\w.])(score|speed|spawnDist|nextGap|nt|runS|scroll|tt|state|hi|lastM)\s*([+\-*\/]?=[^=]|\+\+|--)/m.test(code));
  assert.ok(!/`|\$\{/.test(body(EN) + body(LAB)));
  // the shipped site/Poki builds include 06g but never call it (inert until the hook lines land after Dev's PR6)
  const bundles = ["dist/index.mjs", "dist/poki/game.js"].filter((f) => existsSync(f)).map((f) => readFileSync(f, "utf8"));
  for (const b of bundles) { assert.ok(!/EN_FORCE|if\(r\)enPre\(dt\)|enTag\(ents\[/.test(b), "lab layer leaked into a shipped build"); }
  if (existsSync("dist/lab/enemies-v2/index.html")) {
    const lab = readFileSync("dist/lab/enemies-v2/index.html", "utf8");
    assert.ok(/EN_FORCE/.test(lab) && /noindex/.test(lab) && !/sendBeacon|\/api\/score/.test(lab), "lab page: layer on, noindex, no beacons/leaderboard");
  }
});
console.log(`enemies-v2: ${pass} tests passed`);
