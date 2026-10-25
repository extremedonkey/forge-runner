// SLAG tests (L8 SLAG PITS II): 06k gap KINDS + 06q SLAG (crumbling bridges, slag tide pools, geysers) + 06s HEAT, on the real
// 06-state / 06i hills / 06k gaps / 11 / 13 in the hills harness (scripts/lib/hills-harness.mjs: slag:true, heat:true).
// L8 runs start at the world x a natural run reaches L8 at (hsc 158000: full-size hills). QUICK=1: fewer seeds.
// Run: node scripts/test-slag.mjs   (also run by scripts/test-build.mjs, i.e. npm test).
import assert from "node:assert/strict";
import { game, rng } from "./lib/hills-harness.mjs";
import LV from "../src/client/06d-levels.js";
import SLAG from "../src/client/06q-slag.js";
import HEAT from "../src/client/06s-heat.js";
import { FRAGMENTS } from "../src/client/index.mjs";
const body = (f) => f.slice(1, -1);
const QUICK = process.env.QUICK === "1", NS = QUICK ? 3 : 6, SECS = QUICK ? 60 : 90, DT = 1 / 240;
let pass = 0;
const t = (name, fn) => { const t0 = Date.now(); fn(); pass++; console.log(`ok   slag: ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); };
const TAB = eval(/var GAP_LV=(\[[\s\S]*?\]);/.exec(LV)[1].replace(/\/\*[\s\S]*?\*\//g, ""));
const L8 = TAB[7], L8TAB = TAB.map(() => L8);
/* per-step probe in the game scope: pool states inside their freeze window, crust state under the buggy, fall collapse times */
const PROBE = `calls.pz=[];calls.cr=0;calls.fl=[];calls.hm=0;calls.ht=function(){return [htH,htG.length]};
  var _sg=sgTick;sgTick=function(dt){_sg(dt);var f=Math.max(1,speed*vMul()),fr=hsc+PX+PW,i,g;
    for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
      if(g.k==="pool"&&g.on===false)calls.pz.push(g.key);
      if((g.k==="crust"||g.k==="fall")&&g.on!==false&&hsc+PX+PW>g.x0&&hsc+PX<g.x1&&g.dropT===runS)calls.cr++;
      if(g.dropT===runS&&!g.__d){g.__d=1;calls.fl.push((g.x0-fr)/f)}}
    if(typeof htH==="number"&&htH>calls.hm)calls.hm=htH;
    if(typeof htG!=="undefined"){var cc=hsc+PX+PW/2;for(i=0;i<htG.length;i++){g=htG[i];if(cc>=g.x0&&cc<=g.x1&&py===0)g.__t=1;if(cc>g.x1&&!g.__d){g.__d=1;if(!g.__t)calls.wm=(calls.wm||0)+1}}}};`;
function l8(seed, secs, extra = {}) {
  const r = game({ gaps: true, slag: true, heat: true, hi: 500, rand: rng(seed * 13), level: 8, gapTab: L8TAB, lvMul: 1.053, post: PROBE + (extra.post || ""), ...extra.env });
  r.g.start(); r.g.speed = 760; r.g.hsc = 158000;
  for (let i = 0; i < secs * 240 && r.g.state === "run"; i++) { r.g.auto(); if (!extra.mortal) r.g.inv = 1e9; r.g.spT = 0; extra.step && extra.step(r.g); r.g.now += DT * 1000; r.g.update(DT); }
  return r;
}

t("static: no top-level var / function declared twice across all client fragments (a shadowed global broke GY once); 06q / 06s draw no Math.random and never write speed / score / scroll / runS", () => {
  const decl = new Map();
  for (const [n, f] of FRAGMENTS) for (const line of f.split("\n")) {
    let m = /^function ([A-Za-z_$][\w$]*)\(/.exec(line); if (m) (decl.get(m[1]) || decl.set(m[1], []).get(m[1])).push(n);
    m = /^var (.*)$/.exec(line); if (!m) continue;
    let depth = 0, cur = ""; const names = [];
    for (const ch of m[1]) { if ("([{".includes(ch)) depth++; else if (")]}".includes(ch)) depth--; if (depth === 0 && (ch === "," || ch === ";")) { names.push(cur); cur = ""; if (ch === ";") break; } else cur += ch; }
    if (cur) names.push(cur);
    for (const s of names) { const k = /^\s*([A-Za-z_$][\w$]*)/.exec(s); if (k) (decl.get(k[1]) || decl.set(k[1], []).get(k[1])).push(n); }
  }
  const dup = [...decl].filter(([, v]) => v.length > 1);
  assert.deepEqual(dup, [], "declared twice: " + JSON.stringify(dup));
  for (const src of [SLAG, HEAT]) { const b = body(src);
    assert.ok(!/Math\.random|`|\$\{/.test(b));
    assert.deepEqual(b.split("\n").filter((l) => /(^|[;{(\s,])(speed|score|runS|scroll)(\+=|-=|=(?!=))/.test(l)), []); }
});
t("L1-L7 unchanged: an L5 run gives the same gap log, Math.random draws and score with and without 06q / 06s (no kinds or heat rows)", () => {
  const run = (on) => { const r = game({ gaps: true, slag: on, heat: on, hi: 500, rand: rng(5), level: 5, gapTab: TAB.map(() => TAB[4]), lvMul: 1.053 }); r.g.start(); r.g.speed = 760;
    for (let i = 0; i < 60 * 240 && r.g.state === "run"; i++) { r.g.auto(); r.g.inv = 1e9; r.g.spT = 0; r.g.now += DT * 1000; r.g.update(DT); }
    return [r.g.gp.log.map((q) => [q.x0.toFixed(3), q.x1.toFixed(3), q.k || ""].join()).join("|"), r.calls.rand, r.g.score]; };
  const a = run(false), b = run(true); assert.ok(a[0].length > 40); assert.deepEqual(b, a);
});
let tot = { pool: 0, crust: 0, fall: 0, geyser: 0, gaps: 0, wet: 0 };
t(`L8 autopilot (${NS} seeds x ${SECS} s, 760 / 800 felt, full hills): never falls; pools and springs appear; a lava pool is always lethal; every spring is jumped on and ridden; the buggy rolls through every coolant pool (no crest float over one)`, () => {
  for (let s = 1; s <= NS; s++) {
    const { g, calls } = l8(s, SECS);
    assert.equal(g.state, "run", "seed " + s + ": the autopilot fell at " + g.runS.toFixed(2)); assert.equal(calls.fall, 0);
    const log = g.gp.log;
    for (const q of log) { if (q.k) tot[q.k]++; tot.gaps++; if (q.k === "pool" && q.on) tot.wet++;
      if (q.k === "geyser") { assert.ok(q.used, "seed " + s + " spring " + q.key + " not ridden"); assert.ok(q.p >= 1.25 - 1e-9 && q.p <= 1.4 + 1e-9, "spring pit width " + q.p); }
      if (q.k === "pool") { assert.equal(q.h0, q.h1, "pool lips level"); assert.ok(q.p <= .9 + 1e-9, "pool width " + q.p); } }
    assert.deepEqual(calls.pz, [], "seed " + s + ": a lava pool was not lethal");
    assert.equal(calls.wm || 0, 0, "seed " + s + ": the buggy skipped a coolant pool");
  }
  console.log(`     L8 kinds over ${NS} x ${SECS} s: ${JSON.stringify(tot)}`);
  for (const k of ["pool", "geyser"]) assert.ok(tot[k] >= 1, "no " + k);
  assert.equal(tot.crust + tot.fall, 0, "bridges are off on L8");
});
t("crumbling bridges (kept for later levels; off on L8): on a kinds row with crust / fall, never a collapse under the buggy, every fall collapses 0.9-1.3 s ahead, the autopilot never falls", () => {
  const BR = { ...L8, kinds: { crust: .3, fall: .5 } };
  let nb = 0;
  for (let s = 1; s <= NS; s++) {
    const { g, calls } = l8(s, SECS, { env: { gapTab: TAB.map(() => BR) } });
    assert.equal(g.state, "run"); assert.equal(calls.fall, 0); nb += g.gp.log.filter((q) => q.k === "crust" || q.k === "fall").length;
    assert.equal(calls.cr, 0, "seed " + s + ": a crust collapsed under the buggy");
    for (const tti of calls.fl) assert.ok(tti >= .9 - 1e-6 && tti <= 1.3 + .02, "fall collapse at tti " + tti.toFixed(3));
  }
  assert.ok(nb >= NS, "bridges placed " + nb);
});
t("springs: rolling over one does not launch (the buggy rolls on into the pit); a jump pressed anywhere on the pad clears it (sgFly); a plain full jump from the lip never clears the pit", () => {
  const post = `calls.gy=function(p){var f=speed*vMul(),x0=hsc+3000,gw=p*gpDf()*f,g={x0:x0,x1:x0+gw,h0:gpCurve(x0),h1:gpCurve(x0+gw),p:p,f:f,k:"geyser",on:true,pad0:x0-GZ.pad-GZ.run*f,key:"t"};
    gpGaps.push(g);var r={drive:sgFly(g,f,null),pad:[],plain:gpWin({x0:g.x0,x1:g.x1,h0:g.h0,h1:g.h1,p:p},f)[0]};for(var x=g.pad0;x<=g.pad0+GZ.pad-6;x+=GZ.js)r.pad.push(sgFly(g,f,x));gpGaps.pop();return r};`;
  const r = game({ gaps: true, slag: true, hi: 500, rand: rng(1), level: 8, lvMul: 1.053, post, hills: false }); r.g.start(); r.g.speed = 760;
  for (let i = 0; i < 240; i++) { r.g.now += 4; r.g.update(DT); }
  for (const p of [1.25, 1.32, 1.4]) { const o = r.calls.gy(p); assert.equal(o.drive, false, "rolling over the spring launched at " + p); assert.ok(o.pad.length >= 5 && o.pad.every(Boolean), "a jump on the pad " + p + ": " + o.pad); assert.equal(o.plain, 0, "a plain jump clears a " + p + " pit"); }
});
t("heat: riding the grates (the autopilot, required jumps only) never overheats; grates are never more than row.gap s apart; with the grates gone a grounded buggy overheats in ~1/row.up s", () => {
  const R = eval("(" + /var HEAT_LV=\[(?:null,)*(\{[^}]*\})\]/.exec(HEAT)[1] + ")");
  for (let s = 1; s <= NS; s++) {
    const gx = [], post = `var _ht=htTick;htTick=function(a,b,c,d){var n=htG.length,r=_ht(a,b,c,d);if(htG.length>n)calls.gx.push([htG[htG.length-1].x0,speed*vMul()]);return r};calls.gx=[];`;
    const { g, calls } = l8(s, SECS, { post });
    assert.equal(g.state, "run"); assert.ok(calls.hm < 1, "seed " + s + " max heat " + calls.hm.toFixed(3));
    const xs = calls.gx; assert.ok(xs.length >= SECS / (R.gap + 1.5), "grates " + xs.length);
    for (let i = 1; i < xs.length; i++) assert.ok((xs[i][0] - xs[i - 1][0] - 110) / xs[i][1] <= R.gap + 2.5, `coolant pools (slid past holes / springs: airborne there, no heat) ${((xs[i][0] - xs[i - 1][0] - 110) / xs[i][1]).toFixed(2)} s apart`);
  }
  /* no grates, no gaps, no jumps: the gauge fills in 1/row.up s; overheat absorb order: inv -> shield -> Spare Core -> die */
  const idle = (setup) => { const r = game({ gaps: false, slag: true, heat: true, hi: 500, rand: rng(2), level: 8, lvMul: 1.053, post: "calls.h=function(){return htH};calls.kill=function(){htG.length=0;htLast=hsc+1e9};" });
    r.g.start(); r.g.speed = 760; setup(r.g); let at = -1;
    for (let i = 0; i < 240 * 12 && r.g.state === "run"; i++) { r.calls.kill(); r.g.ents = []; r.g.now += DT * 1000; r.g.update(DT); if (at < 0 && r.calls.h() >= 1 - 1e-9) at = r.g.runS; if (at < 0 && r.g.state !== "run") at = r.g.runS; if (r.g.state !== "run") break; if (at > 0 && setup.stop) break; }
    return { r, at }; };
  const d = idle(() => {}); assert.equal(d.r.g.state, "over"); assert.ok(Math.abs(d.at - 1 / R.up) < .5, "overheat at " + d.at.toFixed(2) + " s");
  const sh = idle((g) => { g.shd = 1 }); assert.equal(sh.r.g.shd, 0); assert.ok(sh.r.g.runS > d.at + 1, "a shield saves once");
  const co = idle((g) => { g.cores = 1 }); assert.equal(co.r.g.cores, 0); assert.ok(co.r.g.runS > d.at + 1, "a Spare Core saves once");
  const iv = idle((g) => { g.inv = 1e9 }); assert.equal(iv.r.g.state, "run", "invulnerable: no hit");
  /* still learning heat (06t coLearning): an overheat only vents (gauge to HT.vent, no hit) */
  const lr = game({ gaps: false, slag: true, heat: true, hi: 500, rand: rng(2), level: 8, lvMul: 1.053, post: "var coLearning=function(){return true};calls.h=function(){return htH};calls.kill=function(){htG.length=0;htLast=hsc+1e9};" });
  lr.g.start(); lr.g.speed = 760; let vented = 0, pv = 0;
  for (let i = 0; i < 240 * 12 && lr.g.state === "run"; i++) { lr.calls.kill(); lr.g.ents = []; lr.g.now += DT * 1000; lr.g.update(DT); const h = lr.calls.h(); if (pv > .9 && h < .6) vented++; pv = h; }
  assert.equal(lr.g.state, "run", "learning: an overheat never ends the run"); assert.ok(vented >= 1, "it vents");
});
t("look-ahead budget: an L8 gap spawn spends <= 1.6x the steps of an L5 one (max over 3 seeds)", () => {
  const post = `calls.wk=[];var __st=0;var _hk=hlTick;hlTick=function(dt){if(hlSim)__st++;return _hk(dt)};var _gs=gpSpawn;gpSpawn=function(a,b,c){__st=0;_gs(a,b,c);if(__st)calls.wk.push(__st)};`;
  const mx = (lv, tab) => { let m = 0; for (let s = 1; s <= 3; s++) { const r = game({ gaps: true, slag: true, heat: true, hi: 500, rand: rng(500 + s), level: lv, gapTab: tab, lvMul: 1.053, post }); r.g.start(); r.g.speed = 760; r.g.hsc = 158000;
    for (let i = 0; i < 60 * 240 && r.g.state === "run"; i++) { r.g.auto(); r.g.inv = 1e9; r.g.spT = 0; r.g.now += DT * 1000; r.g.update(DT); } m = Math.max(m, ...r.calls.wk); } return m; };
  const m8 = mx(8, L8TAB), m5 = mx(5, TAB.map(() => TAB[4]));
  console.log(`     look-ahead steps per spawn (max): L8 ${m8}, L5 ${m5}`);
  assert.ok(m8 <= 1.6 * m5, `L8 ${m8} vs L5 ${m5}`);
});
console.log(`slag: ${pass} tests passed`);
