// The real combined game for scripts/test-crusher-terrain.mjs part 2 (only imported when Dev's 06i / 06k / 06l are in src/client):
// 06-state, 06b, 06d, 06g, 06i, 06k, 06l, 06h-crusher, 06h-rescue, 11, 13 in index.mjs order, stubbed DOM/audio, seeded Math.random,
// game.ev(src) evaluates in the game scope. combined({seeds, arena}) runs full L5 runs and asserts (see the test's title).
import assert from "node:assert/strict";
const imp = async (f) => (await import(new URL(`../../src/client/${f}`, import.meta.url))).default;
const F = {};
for (const [k, f] of [["STATE", "06-state.js"], ["SPARKS", "06b-sparks.js"], ["LEVELS", "06d-levels.js"], ["EN", "06g-enemies-v2.js"], ["HILLS", "06i-hills.js"], ["GAPS", "06k-gaps.js"], ["FORK", "06l-fork.js"], ["CR", "06h-crusher.js"], ["RESCUE", "06h-rescue.js"], ["FLOW", "11-gameflow.js"], ["SIM", "13-simulation.js"]]) F[k] = await imp(f);
const body = (f) => f.slice(1, -1);
export function game(env = {}) {
  let seed = env.seed || 1;
  const M = Object.create(Math); M.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const calls = { music: [] }, store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",skDebug=false;var Q={get:function(k){return null}};
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=0,OY=0,OB=0,VW=600,ZM=1,HS=1,K=1;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};var ctx={};var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxReforge(){}
    function upShow(){}function upHide(){}function msOn(e){}function sfxAir(){}function sfxGapFall(){}function sfxNearMiss(){}function sfxPlatLand(){}function sfxCombo(){}
    function edgeWarn(){}function enemySfx(){}function bossMusic(on){calls.music.push(on)}function levelSting(){}`;
  const src = pre + body(F.STATE) + body(F.SPARKS) + body(F.LEVELS) + body(F.EN) + body(F.HILLS) + body(F.GAPS) + body(F.FORK) + (env.boss === false ? "" : body(F.CR)) + body(F.RESCUE) + body(F.FLOW) + body(F.SIM) +
    `;var lvDraw=function(){},enDrawAfter=function(){};return {ev:function(s){return eval(s)},step:function(dt){update(dt);typeof lvTick==="function"&&lvTick(dt)},start:start,press:press,release:release}`;
  return { g: new Function("Math", "calls", "localStorage", src)(M, calls, localStorage), calls };
}
// the gap autopilot (a full held jump centred over each gap, 06k gpAuto); everything else: invulnerable (geometry/timing checks)
const gapBot = (g) => { let held = -1; return (i) => { if (held < 0 && g.ev("gpAuto()&&py===0")) { g.press(); held = i } if (held >= 0 && i > held + 72) { g.release(); held = -1 } } };
export async function combined({ seeds = 10, arena = true } = {}) {
  const durs = [], forkAfter = []; let plates = 0, nearGap = 0, nearDeck = 0, gapsInFight = 0, flatMax = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const A = game({ seed }), B = game({ seed, boss: false }), a = A.g, b = B.g; a.start(); b.start();
    const ba = gapBot(a), bb = gapBot(b), seenD = new Set(); let t0 = null, t6 = null, t7 = null, lastPass = null, prev = [];
    for (let i = 0; i < 140 * 240; i++) {
      a.ev("inv=1e9;cores=0"); b.ev("inv=1e9;cores=0"); ba(i); bb(i); a.step(1 / 240); b.step(1 / 240);
      assert.equal(a.ev("state"), "run", `seed ${seed}: run ended at ${a.ev("runS")}`);
      assert.equal(a.ev("score"), b.ev("score"), "score identical"); assert.equal(a.ev("speed"), b.ev("speed"), "speed identical");
      const s = a.ev("crS"), rt = a.ev("runS");
      if (s === 1 && t0 === null) t0 = rt; if (s === 6 && t6 === null) t6 = rt; if (s === 7 && t7 === null) t7 = rt;
      if (s >= 1 && s <= 5) { assert.equal(a.ev("rsSlowT>0||!!rsPrompt||rsCoy>0"), false, "no rescue slow-mo / prompt / coyote in the fight"); if (arena) assert.equal(a.ev("lvGapsBlocked()"), true, "lvGapsBlocked() during the fight"); }
      // new plates: on the ground under them, never within CR_TAU of a gap / deck
      const on = a.ev("crPL.map(function(p){return p.on})");
      for (let k = 0; k < on.length; k++) if (on[k] && !prev[k]) {
        const p = a.ev(`(function(p){var gs=crGS(p.x,p.w),f=speed*vMul(),m=CR_TAU*f+pW();return [p.g,p.b,gs[0],gs[1],!!gapNear(hsc+p.x-m,hsc+p.x+p.w+CR_TAU*f),!!platNear(hsc+p.x-m,hsc+p.x+p.w+CR_TAU*f)]})(crPL[${k}])`);
        plates++; assert.ok(Math.abs(p[0] - p[2]) < 1e-6 && Math.abs(p[1] - p[3]) < 1e-6, "plate on the ground under it");
        if (p[4]) nearGap++; if (p[5]) nearDeck++; flatMax = Math.max(flatMax, p[0]);
      }
      prev = on;
      if (a.ev("crPL.some(function(p){return p.on&&p.x+p.w>=PX})")) lastPass = rt;
      if (t0 !== null && t6 === null) gapsInFight += a.ev(`gpGaps.filter(function(q){return q.t===runS}).length`);
      for (const d of a.ev("fkDecks.filter(function(d){return d.t===1}).map(function(d){return [d.key,d.lv,d.x0,hsc,speed*vMul()]})")) {
        if (seenD.has(d[0])) continue; seenD.add(d[0]);
        if (d[1] === 5) { assert.ok(s === 7, `seed ${seed}: L5 fork placed before CRUSHER DOWN is over (crS ${s})`); const arr = rt + (d[2] - (d[3] + 101)) / d[4]; forkAfter.push(arr - Math.max(t6, lastPass)); }
      }
      if (t7 !== null && rt > t7 + 12) break;
    }
    assert.ok(t0 !== null && t6 !== null, `seed ${seed}: boss down`); durs.push(t6 - t0);
    // chained run: die, next run, one step: no boss / terrain state left
    a.ev("die()"); for (let i = 0; i < 60; i++) a.step(1 / 240); a.start(); a.step(1 / 240);
    assert.deepEqual(a.ev("[crS,crL5,crPL.filter(function(p){return p.on}).length,crBan,crZ0>1e11,crGH,gpGaps.length,fkDecks.length,hsc<10,crI,crKill,crFl(hsc+3000),lvGapsBlocked()]"),
      [0, -1, 0, 0, true, 0, 0, 0, true, 0, 0, 1, false], `seed ${seed}: next run clean`);
  }
  assert.equal(nearGap, 0, "no plate within CR_TAU of a gap"); assert.equal(nearDeck, 0, "no plate within CR_TAU of a deck");
  assert.ok(forkAfter.every((x) => x >= .85), `L5 forks >= 0.85 s after CRUSHER DOWN / the last plate: ${forkAfter.map((x) => x.toFixed(2))}`);
  durs.sort((x, y) => x - y);
  if (arena) { assert.equal(flatMax, 0, "arena: every plate on flat ground"); assert.equal(gapsInFight, 0, "no gap created in the fight"); assert.ok(durs[0] >= 14 && durs[durs.length - 1] <= 22, `fight ${durs[0].toFixed(1)}-${durs[durs.length - 1].toFixed(1)} s`); }
  return { log: `${plates} plates (max ground under a plate ${flatMax.toFixed(1)} px), 0 near a gap/deck, gaps created in the fight ${gapsInFight}, fight ${durs[0].toFixed(1)}-${durs[durs.length - 1].toFixed(1)} s, L5 forks ${forkAfter.length} (>= ${forkAfter.length ? Math.min(...forkAfter).toFixed(2) : "-"} s after DOWN), chained runs clean, score/speed identical` };
}
