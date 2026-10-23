// CHASER (slag roller from behind) tests: evaluates the real state/sparks/levels/enemies-v2/ore-cart/edge-warn/flow/simulation
// fragments with 06k-chaser.js, the live 13/14 hook lines and the lab layer (src/client/lab/chaser.js), the same way
// test-orecart.mjs does. Run: node scripts/test-chaser.mjs (also via npm test). Prints the fairness / timing tables.
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import EN from "../src/client/06g-enemies-v2.js";
import OC from "../src/client/06i-orecart.js";
import EW from "../src/client/06j-edge-warn.js";
import RL from "../src/client/06k-chaser.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LAB from "../src/client/lab/chaser.js";
import RENDER from "../src/client/14-render.js";
import ESFX from "../src/client/08f-enemy-sfx.js";
const R14 = RENDER.slice(1, -1), DE = R14.slice(R14.indexOf("function drawEnts(){"), R14.indexOf("\nfunction drawGhost"));
const HOOK14 = DE.split("\n").filter((l) => /ocDraw\(\)|srDraw\(\)|edgeWarnDraw\(\)/.test(l)).join("\n");
import { SCRIPT } from "../src/client/index.mjs";
import { buildPokiScript } from "../src/client/poki/script.mjs";
import { labScript } from "./build-lab.mjs";
const POKI = buildPokiScript(), LABS = await labScript("chaser");
const body = (f) => f.slice(1, -1);
const QUIET = process.argv.includes("--quiet");
let pass = 0;
const ONLY = process.env.RLONLY ? new RegExp(process.env.RLONLY) : null;
const FAILS = [];
const t = (name, fn) => { if (ONLY && !ONLY.test(name)) return; try { fn(); } catch (e) { if (!process.env.RLKEEP) throw e; FAILS.push(name + ": " + e.message); console.log("FAIL chaser:", name, "--", e.message); return; } pass++; console.log("ok   chaser:", name); };
const log = (...a) => { if (!QUIET) console.log(...a); };
const DEV = { desktop: { XO: 0, VW: 600, ZM: 1, CS: 1.3 }, portrait: { XO: 20, VW: 600 / 1.35, ZM: 1.35, CS: 390 / (600 / 1.35) }, landscape: { XO: 0, VW: 600, ZM: 1, CS: 1.3 } };

// env: { rl: include 06k (+ lab layer), oc: include 06i (default true), seed, demo, level, vm (vMul() stub, constant; 13's e.x
// line patched to use it, like Dev's hook), fast (speed = 760 at start), god (base obstacles harmless; carts/rollers still hit),
// dev, store: object = working localStorage, "throw" = storage that throws, undefined = none (lsg null), boss: [t0,t1] Crusher stub,
// gaps: {period,width,off} gapNear stub, gapNull }
function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { sfx: [], ew: [], fr: [], txt: [], st: [] };
  const d = DEV[env.dev || "desktop"], q = { level: env.level }, oc = env.oc !== false;
  const store = env.store;
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false,__god=${!!env.god};
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined?null:String(v)}};
    var localStorage=${store === "throw" ? "{getItem:function(){throw new Error('no storage')},setItem:function(){throw new Error('no storage')},removeItem:function(){throw new Error('x')}}" : "{getItem:function(k){return null},setItem:function(){},removeItem:function(){}}"};
    function lsg(k){${store === "throw" ? "try{return localStorage.getItem(k)}catch(e){return null}" : store ? "calls.st.push(['g',k]);return Object.prototype.hasOwnProperty.call(calls.store,k)?calls.store[k]:null" : "return null"}}
    function lss(k,v){${store === "throw" ? "try{localStorage.setItem(k,v)}catch(e){}" : store ? "calls.st.push(['s',k,v]);calls.store[k]=v" : ""}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${d.XO},OY=0,OB=0,VW=${d.VW},ZM=${d.ZM},CS=${env.CS || d.CS},HS=1,K=1,SX=0,SY=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};
    var ctx={globalAlpha:1,fillStyle:"",fillRect:function(x,y,w,h){calls.fr.push([x,y,w,h,ctx.globalAlpha,ctx.fillStyle])},save:function(){},restore:function(){},translate:function(){},scale:function(){},rotate:function(){}};
    function txt(s,x,y,px,c,al){calls.txt.push([s,x,y,px,ctx.globalAlpha,runS])}
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){${HOOK14}}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}function sparks(){}function dust(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxReforge(){}
    function upShow(){}function upHide(){}function msOn(e){}function sfxCombo(){}
    function enemySfx(ty,ev){calls.sfx.push([ty,ev,runS,demo,state])}` +
    (env.vm ? `function vMul(){return ${env.vm}}` : "") +
    (env.boss ? `var crS=0;function crOn(){crS=runS<${env.boss[0]}?0:runS<${env.boss[1]}?3:7;return crS>=1&&crS<=6}function crReady(){return false}` : "") +
    (env.gapNull ? "function gapNear(){calls.gn=(calls.gn||0)+1;return null}" : "") +
    (env.gaps ? `function gapNear(a,b){calls.gn=(calls.gn||0)+1;var P=${env.gaps.period},Wd=${env.gaps.width},O=${env.gaps.off},A=a+scroll,B=b+scroll,k=Math.floor((A-O)/P);
      for(var j=k-1;j<=k+2;j++){var g0=O+j*P,g1=g0+Wd;if(g1>A&&g0<B)return {x0:g0-scroll,x1:g1-scroll}}return null}` : "");
  let sim = body(SIM);
  if (env.vm) { sim = sim.replace("e.x-=(speed+(e.vx||0))*dt;", "e.x-=(speed*(typeof vMul===\"function\"?vMul():1)+(e.vx||0))*dt;"); sim = sim.replace("spawnDist+=speed*dt;", "spawnDist+=speed*vMul()*dt;"); }
  if (env.god) sim = sim.replace("if(inv>0)continue;", "if(inv>0||__god)continue;");
  const api = `;return {get score(){return score},get speed(){return speed},set speed(v){speed=v},get state(){return state},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},get vy(){return vy},get jb(){return jb},get held(){return held},get runS(){return runS},get tt(){return tt},set tt(v){tt=v},get scroll(){return scroll},auto,
    set inv(v){inv=v},set spT(v){spT=v},get spT(){return spT},get shd(){return shd},set shd(v){shd=v},get cores(){return cores},set cores(v){cores=v},set spawnDist(v){spawnDist=v},get spawnDistV(){return spawnDist},get nextGap(){return nextGap},set duck(v){duck=v},
    press,release,start,update,die,pW,PX,W,GY,XO,VW,lv:function(){return currentLevel()},LV_HL:function(){return LV_HL},
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    oc:${oc ? "{C:ocC,TTI:ocTTI,Vc:ocVc,V:ocV,OC_W:OC_W}" : "null"},
    ${env.rl ? `rl:{C:srC,TTI:srTTI,vis:srVis,solid:srSolid,drawR:srDrawR,V:srV,want:srWant,hop:srHop,get hint(){return srHT},set hs(v){srHS=v},draw:function(){drawEnts()},
      spy:function(){var n={tick:0,want:0,draw:0},a=srTick,b=srWant,c=srDraw;srTick=function(){n.tick++;return a.apply(null,arguments)};srWant=function(){n.want++;return b()};srDraw=function(){n.draw++;return c()};return n},
      SR_V:SR_V,SR_W:SR_W,SR_H:SR_H,SR_WARN:SR_WARN,SR_RUM:SR_RUM,SR_MINT:SR_MINT,SR_CLR:SR_CLR,SR_CLA:SR_CLA,SR_CLAB:SR_CLAB,LV:CHASER_LV,AL:SR_AL,parts:function(){var o=[];for(var j=0;j<SR_NP;j++)if(srPL[j]>0)o.push({x:srPX[j],y:srPY[j],vx:srVX[j]});return o}},
      ew:{live:edgeWarnLive,spy:function(){var o=edgeWarn;edgeWarn=function(k,a,b,c,d){calls.ew.push([k,a,runS,b,c,d]);return o(k,a,b,c,d)}}}` : "rl:null,ew:null"}}`;
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + body(EN) + (oc || env.rl ? (env.noCart ? body(OC).replace("OC_P=[0,.55,.65,.75,.85]", "OC_P=[0,0,0,0,0]") : body(OC)) : "") + (oc || env.rl ? body(EW) : "") + (env.rl ? body(RL) : "") + body(FLOW) + sim + (env.rl ? body(LAB) : "") + api;
  calls.store = typeof store === "object" ? store : {};
  const g = new Function("Math", "calls", src)(M, calls);
  calls.rn = () => rn;
  return { g, calls };
}
function frame(g, fps) { const n = Math.max(1, Math.ceil(240 / fps - 1e-6)); for (let i = 0; i < n; i++) g.update(1 / fps / n); g.rl ? g.rl.draw() : 0; }

// jump-only bot. Rollers: press when the roller's centre is `lead` s behind the buggy's centre; mode "tap" (press + release in
// the same frame) or "hold" (held to the apex). Carts + base ground hazards: taps at 0.21 s (base hits off with env.god).
const LEAD = { tap: 0.2, hold: 0.2 }, OLEAD = 0.21;
function bot(g, mode) {
  if (g.state !== "run") return;
  if (g.held && g.vy <= 0) g.release();
  if (g.py !== 0 || g.jb > 0) return;
  const cx = g.PX + g.pW() / 2;
  for (const r of g.rl.C) if (r.a) { const m = (cx - (r.x + g.rl.SR_W / 2)) / g.rl.SR_V; if (m > 0 && m <= LEAD[mode === "fullhold" ? "hold" : mode]) { g.press(); if (mode === "tap") g.release(); return; } }
  const tapO = () => { g.press(); if (mode !== "fullhold") g.release(); };
  if (g.oc) { const Vc = g.oc.Vc(); for (const c of g.oc.C) if (c.a) { const m = (c.x + g.oc.OC_W / 2 - cx) / Vc; if (m > 0 && m <= OLEAD) { tapO(); return; } } }
  const V = g.rl.V();
  for (const e of g.ents) {
    if (e.t === "k" || e.t === "u" || e.t === "d" || e.t === "h" || (e.t === "f" && e.bot > 10)) continue;
    const m = (e.x + e.w / 2 - cx) / (V + (e.vx || 0)); if (m > 0 && m <= OLEAD) { tapO(); return; }
  }
}

// a run; per roller: level, first warning, first visible, contact (front reaches PX), exit, hit, sfx times
function run(env, secs, fps, mode) {
  const { g, calls } = game({ rl: true, ...env }); g.ew.spy(); g.start(); if (env.fast) g.speed = 760;
  const rs = new Map(), carts = new Map(), base = [], lvT = {}; let deaths = 0, gaps = 0;
  for (let f = 0; f < secs * fps && g.state === "run"; f++) {
    if (mode) bot(g, mode);
    if (env.inv) g.inv = 1e9;
    calls.ew.length = 0; const s0 = calls.sfx.length;
    frame(g, fps); lvT[g.lv()] = (lvT[g.lv()] || 0) + 1 / fps;
    const warned = new Set(calls.ew.map((w) => w[0]));
    for (const r of g.rl.C) {
      if (!r.a && !r.hit) continue;
      let o = rs.get(r.ph); if (!o) { o = { lv: g.lv(), seen: g.runS, appr: null, vis: null, contact: null, out: null, hit: 0, gapFrames: 0, tc: r.tc }; rs.set(r.ph, o); }
      if (o.appr === null && warned.has("sr" + r.ph)) o.appr = g.runS;
      if (o.vis === null && g.rl.vis(r)) o.vis = g.runS;
      if (o.contact === null && r.x + g.rl.SR_W >= g.PX) o.contact = g.runS - (r.x + g.rl.SR_W - g.PX) / g.rl.SR_V;
      if (o.out === null && r.x >= g.XO + g.VW) o.out = g.runS;
      if (o.appr !== null && o.contact === null && !warned.has("sr" + r.ph) && !g.rl.vis(r)) { o.gapFrames++; gaps++; }
      if (r.hit) o.hit = 1;
    }
    if (g.oc) for (const c of g.oc.C) if (c.a) { let o = carts.get(c.ph); if (!o) { o = { a: null, b: null }; carts.set(c.ph, o); } const ft = g.PX + g.pW();
      if (o.a === null && c.x <= ft) o.a = g.runS - (ft - c.x) / g.oc.Vc(); if (o.b === null && c.x + g.oc.OC_W <= g.PX) o.b = g.runS; }
    for (const e of g.ents) if (e.t !== "k" && e.t !== "u" && !e.__in && e.x <= g.PX + g.pW()) { e.__in = g.runS; base.push(e); }
    for (const e of base) if (!e.__out && e.x + e.w <= g.PX) e.__out = g.runS;
    if (g.state !== "run") deaths++;
  }
  return { g, calls, rs: [...rs.values()], carts: [...carts.values()], base, deaths, gaps, lvT };
}

// ---------------------------------------------------------------- determinism / hard rules
t("200 s invulnerable run at 760: score, speed, Math.random draws and spawn timeline identical with and without chasers (carts on in both)", () => {
  const a = game({ level: 0 }), b = game({ rl: true });
  const la = [], lb = [];
  a.g.wrapSpawn((n, tt, nt) => la.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w, e.h, e.bot].join())].join("|")));
  b.g.wrapSpawn((n, tt, nt) => lb.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w, e.h, e.bot].join())].join("|")));
  a.g.start(); b.g.start(); const seen = new Set();
  for (let f = 0; f < 200 * 60; f++) {
    a.g.inv = 1e9; b.g.inv = 1e9; frame(a.g, 60); frame(b.g, 60);
    if (f % 60 === 0) { assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed); assert.equal(b.calls.rn(), a.calls.rn(), `RNG draws at ${f / 60} s`); }
    for (const r of b.g.rl.C) if (r.a) seen.add(r.ph);
  }
  assert.deepEqual(lb, la, "same spawns, same times, same positions"); assert.ok(la.length > 100);
  assert.ok(seen.size >= 1, `rollers appeared (${seen.size})`);
  log(`   200 s run: ${la.length} base spawns identical, ${seen.size} rollers, Math.random draws ${a.calls.rn()} = ${b.calls.rn()}, score ${a.g.score.toFixed(3)} = ${b.g.score.toFixed(3)}`);
});
t("static: 06k never calls Math.random, never assigns score/speed/scroll/runT/spawnDist/nextGap/nt/ents; no 'if(demo)' / backticks / ${ in 06k + lab layer", () => {
  const nc = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const s = nc(body(RL));
  assert.ok(!/Math\.random/.test(s)); assert.ok(!/(^|[^.\w])(score|speed|scroll|runT|spawnDist|nextGap|nt|ents)\s*(=[^=]|\+=|-=|\+\+|--)/m.test(s), "writes a sim global");
  for (const f of [RL, LAB]) { assert.ok(!f.includes("if(demo)")); assert.ok(!body(f).includes("`")); assert.ok(!body(f).includes("${")); }
  assert.ok(!POKI.includes("if(demo)"), "Poki script has no 'if(demo)'");
});
t("names: every sr*/SR_*/CHASER_LV name of 06k is used nowhere else in the site, Poki or lab script except the three hook lines (no prefix clash, e.g. Audio's rl* rail clack)", () => {
  const names = [...new Set(body(RL).replace(/\/\*[\s\S]*?\*\//g, "").match(/\b(sr[A-Z]\w*|SR_\w+|CHASER_LV)\b/g))];
  assert.ok(names.length > 40);
  for (const [nm, src, extra] of [["site", SCRIPT, ""], ["poki", POKI, ""], ["lab", LABS, body(LAB)]]) {
    const rest = src.replace(body(RL), "").replace(extra, "");
    for (const n of names) { const k = rest.split(new RegExp("\\b" + n + "\\b")).length - 1;
      assert.equal(k, ["srTick", "srWant", "srDraw"].includes(n) ? (nm === "poki" && n === "srWant" ? 0 : 2) : 0, `${nm}: ${n} appears ${k}x outside 06k`); }
  }
});
t("enemy RNG stream: same seed -> identical roller timeline; different seed differs", () => {
  const tl = (seed) => run({ seed, level: 3, inv: true, god: true }, 120, 60).rs.filter((r) => r.contact !== null).map((r) => r.contact.toFixed(4)).join(",");
  assert.equal(tl(7), tl(7)); assert.notEqual(tl(7), tl(11));
});

// ---------------------------------------------------------------- spacing per level
t("spacing: none on L1-L2 (natural run: nothing before L3 at 40 s); L3 >= 4 s, L4 >= 2.4 s, L5 >= 1.8 s between overtakes; tighter at L4/L5", () => {
  const nat = { rs: [1, 2, 3].flatMap((seed) => run({ seed, inv: true, god: true, noCart: true }, 200, 60).rs) };
  assert.ok(nat.rs.length >= 3, `natural rollers ${nat.rs.length}`); for (const r of nat.rs) assert.ok(r.lv >= 3, "roller on L" + r.lv + " at " + r.seen);
  assert.ok(Math.min(...nat.rs.map((r) => r.seen)) >= 39, "nothing before L3");
  for (const L of [1, 2]) { const r = run({ seed: 2, level: L, inv: true, god: true }, 38, 60); assert.equal(r.rs.length, 0, `L${L}: none`); }
  const rows = [], means = [];
  for (const L of [3, 4, 5]) {
    const sp = [4, 2.4, 1.8][L - 3], gs = []; let n = 0;
    for (const seed of [1, 2, 3, 4]) for (const vm of [0, 1.15]) {
      const r = run({ seed, level: L, fast: true, vm: vm || undefined, inv: true, god: true, noCart: true }, 60, 60);
      const cc = r.rs.filter((c) => c.contact !== null && c.lv === L).map((c) => c.contact).sort((a, b) => a - b); n += cc.length;
      for (let i = 1; i < cc.length; i++) gs.push(cc[i] - cc[i - 1]);
    }
    const mn = Math.min(...gs), avg = gs.reduce((a, b) => a + b, 0) / gs.length; means.push(avg);
    assert.ok(mn >= sp - 0.02, `L${L} min spacing ${mn.toFixed(3)} >= ${sp}`);
    rows.push(`   L${L}: ${n} rollers in 8 x 60 s, min ${mn.toFixed(2)} s (rule ${sp.toFixed(1)}), mean ${avg.toFixed(2)} s`);
  }
  assert.ok(means[2] < means[0], "L5 rollers come more often than L3");
  log(rows.join("\n"));
});

t("rate per level at 760 / 874 felt, with and without ore carts (carts are placed first, so they take most long gaps): without carts L3 < L4 < L5", () => {
  const rows = ["   level  felt  per min (with carts)  per min (no carts)   (4 x 60 s from the level floor, fast start)"];
  for (const vm of [0, 1.15]) { const nc = [];
    for (const L of [3, 4, 5]) { const k = [false, true].map((noCart) => { let n = 0, s = 0;
        for (const seed of [1, 2, 3, 4]) { const r = run({ seed, level: L, fast: true, vm: vm || undefined, inv: true, god: true, noCart }, 60, 60); const c = r.rs.filter((x) => x.lv === L && x.contact !== null); n += c.length; s += r.lvT[L] || 0; }
        return 60 * n / s; });
      nc.push(k[1]); rows.push(`   L${L}     ${vm ? 874 : 760}   ${k[0].toFixed(1).padEnd(20)}  ${k[1].toFixed(1)}`); }
    assert.ok(nc[0] < nc[1] && nc[1] < nc[2], "no carts: rate rises L3 < L4 < L5"); }
  log(rows.join("\n"));
});

// ---------------------------------------------------------------- tap / hold windows (one roller, nothing else)
function trial(vm, mode, off, fps) {
  const { g } = game({ rl: true, level: 3, vm }); g.start(); g.speed = 760; g.update(1 / 240);
  g.spawnDist = -1e9; g.ents = []; g.rl.C.forEach((c) => (c.a = 0)); g.oc.C.forEach((c) => (c.a = 0));
  const r = g.rl.C[0], cx = g.PX + g.pW() / 2; Object.assign(r, { a: 1, ar: 1, s1: 1, s2: 1, s3: 0, hit: 0, ph: 99, d: 0 });
  r.x = cx - g.rl.SR_W / 2 - g.rl.SR_V * 0.8; let pressed = false;
  for (let f = 0; f < 3 * fps; f++) {
    g.spawnDist = -1e9;
    if (pressed && mode === "hold" && g.vy <= 0 && g.held) g.release();
    const m = (cx - (r.x + g.rl.SR_W / 2)) / g.rl.SR_V;
    if (!pressed && m <= off) { pressed = true; g.press(); if (mode === "tap") g.release(); }
    frame(g, fps); if (g.state !== "run") return false; if (!r.a || r.x > g.PX + g.pW() + 5) return true;
  }
  return true;
}
function windowOf(vm, mode, fps) {
  const ok = []; for (let off = 0; off <= 0.8 + 1e-9; off += 0.0025) if (trial(vm, mode, +off.toFixed(4), fps)) ok.push(off);
  if (!ok.length) return null; return [Math.min(...ok), Math.max(...ok)];
}
const WIN = {};
t("tap window >= 0.22 s and hold window at 760 and 874 felt (vMul 1.15), 60 + 240 fps; the bot leads sit inside them", () => {
  const rows = ["   felt  fps  tap window (s before centre)    hold window"];
  for (const vm of [0, 1.15]) for (const fps of [240, 60]) {
    const tw = windowOf(vm || undefined, "tap", fps), hw = windowOf(vm || undefined, "hold", fps), F = vm ? 874 : 760;
    assert.ok(tw && tw[1] - tw[0] >= 0.22, `tap window at ${F}/${fps}: ${tw}`); assert.ok(hw && hw[1] - hw[0] >= 0.22, `hold window at ${F}/${fps}: ${hw}`);
    assert.ok(tw[0] < LEAD.tap && tw[1] > LEAD.tap && hw[0] < LEAD.hold && hw[1] > LEAD.hold, "bot leads inside");
    assert.ok(hw[0] < g0AL()[0] && hw[1] > g0AL()[1], "demo autopilot band inside the hold window");
    WIN[F + "/" + fps] = { tw, hw };
    rows.push(`   ${F}   ${fps}   ${tw[0].toFixed(3)}-${tw[1].toFixed(3)} (${(tw[1] - tw[0]).toFixed(3)} s)     ${hw[0].toFixed(3)}-${hw[1].toFixed(3)} (${(hw[1] - hw[0]).toFixed(3)} s)`);
  }
  log(rows.join("\n"));
});
function g0AL() { return game({ rl: true }).g.rl.AL; }

// ---------------------------------------------------------------- fairness: jump-only bot
t("fairness: jump-only bot, taps only AND holds, 760 + 874 felt, 60 + 240 fps, L3-L5, desktop + 390x844 portrait: 0 roller deaths in >= 500 rollers; warning >= 1.2 s; 0 frames with neither glow nor roller", () => {
  const rows = ["   felt  mode  fps  rollers  deaths  min warn (s)  min on-screen before contact (s)  glow-gap frames"]; let total = 0;
  for (const vm of [0, 1.15]) for (const mode of ["tap", "hold"]) for (const fps of [60, 240]) {
    let n = 0, dead = 0, mw = 9, mv = 9, gp = 0;
    for (const L of [3, 4, 5]) for (const seed of [1, 2, 3, 4, 5, 6, 7]) for (const noCart of [false, true]) {
      const dev = seed % 2 === 0 ? "portrait" : "desktop";
      const r = run({ seed, level: L, fast: true, vm: vm || undefined, god: true, dev, noCart }, fps === 240 ? 50 : 90, fps, mode);
      for (const c of r.rs) if (c.contact !== null || c.hit) { n++; if (c.hit) dead++; if (c.appr !== null && c.contact !== null) mw = Math.min(mw, c.contact - c.appr); if (c.vis !== null && c.contact !== null) mv = Math.min(mv, c.contact - c.vis); }
      gp += r.gaps;
      assert.equal(r.deaths, 0, `run ended at ${vm ? 874 : 760} ${mode} ${fps} fps L${L} seed ${seed}`);
    }
    assert.equal(dead, 0); assert.ok(mw >= 1.2, `warn ${mw}`); assert.equal(gp, 0); total += n;
    rows.push(`   ${vm ? 874 : 760}   ${mode.padEnd(4)}  ${fps}   ${String(n).padEnd(7)}  ${dead}       ${mw.toFixed(3)}         ${mv.toFixed(3)}                              ${gp}`);
  }
  assert.ok(total >= 500, `rollers jumped: ${total}`);
  log(rows.join("\n")); log(`   total rollers jumped: ${total}, deaths 0`);
});
t("warning >= 1.2 s on every viewport (desktop, 390x844 portrait, 844x390 landscape) at 760 and 874, glow or roller visible every frame from warning to contact", () => {
  const rows = ["   device     felt  warn min/max (s)  on-screen before contact (s)  glow-gap frames"];
  for (const dev of ["desktop", "portrait", "landscape"]) for (const vm of [0, 1.15]) {
    let mn = 9, mx = 0, vmin = 9, gaps = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = run({ seed, level: 4, fast: true, vm: vm || undefined, god: true, dev, inv: true, noCart: true }, 60, 60);
      for (const c of r.rs) if (c.contact !== null) { n++; assert.ok(c.appr !== null, "warned"); const w = c.contact - c.appr; mn = Math.min(mn, w); mx = Math.max(mx, w); vmin = Math.min(vmin, c.contact - (c.vis ?? c.contact)); }
      gaps += r.gaps;
    }
    assert.ok(n > 8, `${dev} ${vm}: ${n}`); assert.ok(mn >= 1.2, `${dev}: warn ${mn}`); assert.equal(gaps, 0);
    rows.push(`   ${dev.padEnd(9)}  ${vm ? 874 : 760}   ${mn.toFixed(3)} / ${mx.toFixed(3)}     ${vmin.toFixed(3)}                         ${gaps}`);
  }
  log(rows.join("\n"));
});

// ---------------------------------------------------------------- clearance: base obstacles, carts, gaps, Crusher
t("no overlap: every overtake keeps >= 0.8 s clear after the last obstacle / cart and >= 0.65 s before the next (room to land a held jump and tap again)", () => {
  let n = 0, mb = 9, ma = 9;
  for (const L of [3, 4, 5]) for (const seed of [1, 2, 3, 4]) for (const vm of [0, 1.15]) {
    const r = run({ seed, level: L, fast: true, vm: vm || undefined, inv: true, god: true }, 60, 60);
    const pass = (30 + 45) / 440, iv = [...r.base.filter((e) => e.__out).map((e) => [e.__in, e.__out]), ...r.carts.filter((c) => c.a !== null && c.b !== null).map((c) => [c.a, c.b])];
    for (const c of r.rs) { if (c.contact === null) continue; n++; const a = c.contact, b = a + pass;
      for (const [i0, i1] of iv) { if (i1 <= a) mb = Math.min(mb, a - i1); else if (i0 >= b) ma = Math.min(ma, i0 - b); else assert.fail(`overlap at ${a.toFixed(3)} vs [${i0.toFixed(3)}, ${i1.toFixed(3)}]`); } }
  }
  assert.ok(mb >= 0.8 && ma >= 0.65 - 0.02, `before ${mb}, after ${ma}`);
  log(`   ${n} overtakes: min clear before ${mb.toFixed(3)} s, after ${ma.toFixed(3)} s (carts included)`);
});
// airborne check (Playtest's #85 lesson): full-hold bot (every jump held to the apex) and boots bot (spring boots on all run,
// every jump held): at the moment the bot must press for a roller (its centre SR_V*lead behind the buggy's centre), the buggy
// has been on the ground for >= 0.2 s
function airRun(env, secs, boots) {
  const { g } = game({ rl: true, ...env }); g.start(); g.speed = 760; const hist = []; const chk = new Map(); let n = 0, worst = 9;
  const cx = () => g.PX + g.pW() / 2;
  for (let f = 0; f < secs * 240 && g.state === "run"; f++) {
    g.inv = 1e9; if (boots) g.spT = 9;
    for (const r of g.rl.C) if (r.a && !chk.has(r.ph)) { const m = (cx() - (r.x + g.rl.SR_W / 2)) / g.rl.SR_V; if (m > 0 && m <= LEAD.hold) {
      let gt = 0; for (let k = hist.length - 1; k >= 0 && hist[k][1] === 0; k--) gt = g.runS - hist[k][0];
      chk.set(r.ph, gt); n++; worst = Math.min(worst, gt); } }
    bot(g, "fullhold"); frame(g, 240); hist.push([g.runS, g.py]); if (hist.length > 600) hist.shift();
  }
  return { n, worst, bad: [...chk.values()].filter((v) => v < 0.2).length };
}
t("airborne: full-hold bot and boots bot (boots on all run, 0.83 s jumps) are on the ground >= 0.2 s before every roller jump (L3-L5, 760 + 874; carts off: cart-then-obstacle cascades are #85's fix)", () => {
  const rows = ["   bot        felt  rollers  min ground time before the roller press (s)"];
  for (const boots of [false, true]) for (const vm of [0, 1.15]) {
    let n = 0, worst = 9, bad = 0;
    for (const L of [3, 4, 5]) for (const seed of [1, 2, 3, 4, 5, 6]) { const r = airRun({ seed, level: L, vm: vm || undefined, god: true, noCart: true }, 60, boots); n += r.n; worst = Math.min(worst, r.worst); bad += r.bad; }
    assert.ok(n >= 8, `rollers ${n}`); assert.equal(bad, 0, `${boots ? "boots" : "full-hold"} ${vm ? 874 : 760}: ${bad} rollers with < 0.2 s on the ground (min ${worst.toFixed(3)})`);
    rows.push(`   ${(boots ? "boots" : "full-hold").padEnd(9)}  ${vm ? 874 : 760}   ${String(n).padEnd(7)}  ${worst.toFixed(3)}`);
  }
  log(rows.join("\n"));
});
// perfect bot = the game's own autopilot (auto(): ducks drones, jumps everything incl. carts via ocWant and rollers via srWant),
// run as a NON-demo player (real hits, real sfx/hint path) from a fresh start to the 180 s cap
t("perfect bot (auto() as a non-demo player, real hits, rollers on, carts off): reaches the 180 s cap 3/3; with carts on, every death is logged (none by a roller)", () => {
  const rows = [];
  for (const noCart of [true, false]) for (const seed of [1, 2, 3]) {
    const { g } = game({ rl: true, seed, noCart }); g.start(); const seen = new Set();
    for (let f = 0; f < 180 * 60 && g.state === "run"; f++) { g.auto(); frame(g, 60); for (const r of g.rl.C) if (r.a) seen.add(r.ph); }
    const why = g.state === "run" ? "" : g.rl.C.some((r) => r.hit) ? "roller" : g.oc.C.some((c) => c.hit) ? "cart" : "base";
    assert.notEqual(why, "roller", `seed ${seed}: a roller killed the perfect bot at ${g.runS.toFixed(2)} s`);
    if (noCart) { assert.equal(g.state, "run", `seed ${seed}: died at ${g.runS.toFixed(2)} s by ${why}`); assert.ok(g.runS >= 179.9); }
    rows.push(`   ${noCart ? "carts off" : "carts on "} seed ${seed}: ${g.state === "run" ? "180 s cap reached" : "died at " + g.runS.toFixed(1) + " s by " + why} (L${g.lv()}), ${seen.size} rollers`);
  }
  log(rows.join("\n"));
});
// held roller jump, then the tightest follow-up placement allows (an obstacle entering SR_CLA after the pass): press the hold
// anywhere in its window, then tap the obstacle 0.21 s before its centre (buffered if still airborne): always survivable?
function followTrial(vm, off, kind, cla, boots) {
  const { g } = game({ rl: true, level: 3, vm }); g.start(); g.speed = 760; g.update(1 / 240);
  g.spawnDist = -1e9; g.ents = []; g.rl.C.forEach((c) => (c.a = 0)); g.oc.C.forEach((c) => (c.a = 0));
  const r = g.rl.C[0], cx = g.PX + g.pW() / 2, V = g.rl.V(); Object.assign(r, { a: 1, ar: 1, s1: 1, s2: 1, s3: 0, hit: 0, ph: 99, d: 0 });
  r.x = cx - g.rl.SR_W / 2 - g.rl.SR_V * 0.8;
  const tc = (g.PX - (r.x + g.rl.SR_W)) / g.rl.SR_V, pass = (g.rl.SR_W + g.pW()) / g.rl.SR_V, ent = tc + pass + (cla ?? (boots ? g.rl.SR_CLAB : g.rl.SR_CLA));
  const e = kind === "crate3" ? [0, 1, 2].map((i) => ({ x: g.PX + g.pW() + V * ent + i * 34, w: 30, h: 21, bot: 0, t: "b", v: 0 })) : kind === "pillar" ? [{ x: g.PX + g.pW() + V * ent, w: 26, h: 50, bot: 0, t: "p" }] : [{ x: g.PX + g.pW() + V * ent, w: 30, h: 21, bot: 0, t: "b", v: 0 }];
  g.ents = e; let pressed = false, tapped = false; const ew = e[e.length - 1].x + e[e.length - 1].w - e[0].x;
  for (let f = 0; f < 3 * 240; f++) {
    g.spawnDist = -1e9; if (boots) g.spT = 9;
    if (pressed && g.vy <= 0 && g.held) g.release();
    const m = (cx - (r.x + g.rl.SR_W / 2)) / g.rl.SR_V;
    if (!pressed && m <= off) { pressed = true; g.press(); }
    const mo = (e[0].x + ew / 2 - cx) / V;
    if (pressed && !tapped && mo <= 0.21 && (r.x > g.PX + g.pW())) { tapped = true; g.press(); g.release(); }
    frame(g, 240); if (g.state !== "run") return false; if (e[e.length - 1].x + 30 < g.PX - 5) return true;
  }
  return true;
}
t("held jump: from anywhere in the hold window, the next obstacle at the tightest allowed spacing (SR_CLA 0.65 s after the pass; SR_CLAB 0.8 s with boots) is still tap-clearable (crate, 3 crates, pillar; 760 + 874; boots too)", () => {
  const rows = [];
  for (const boots of [false, true]) for (const vm of [0, 1.15]) for (const kind of ["crate", "crate3", "pillar"]) {
    const hw = WIN[(vm ? 874 : 760) + "/240"].hw; let bad = [];
    for (let off = hw[0]; off <= hw[1] + 1e-9; off += 0.01) if (!followTrial(vm || undefined, off, kind, undefined, boots)) bad.push(+off.toFixed(3));
    rows.push(`   ${boots ? "boots" : "     "} ${vm ? 874 : 760} ${kind.padEnd(6)} hold ${hw[0].toFixed(3)}-${hw[1].toFixed(3)}: ${bad.length ? "FAILS at " + bad.join(",") : "all clear"}`);
    assert.equal(bad.length, 0, rows[rows.length - 1]);
  }
  log(rows.join("\n"));
});
t("gaps: with gapNear stubbed, no impact point in a takeoff window (0.6 s before the lip / over it) or within 0.85 s after landing; gapNear undefined == always null", () => {
  const GP = { period: 2600, width: 140, off: 1500 };
  const gapsIn = (G0, G1) => { const out = []; for (let j = -2; j < 600; j++) { const g0 = GP.off + j * GP.period, g1 = g0 + GP.width; if (g1 > G0 && g0 < G1) out.push([g0, g1]); } return out; };
  let n = 0;
  for (const L of [3, 4, 5]) for (const seed of [1, 2, 3]) {
    const { g, calls } = game({ rl: true, seed, level: L, gaps: GP, noCart: true }); g.start(); g.speed = 760; const seen = new Map();
    for (let f = 0; f < 60 * 60 && g.state === "run"; f++) { g.inv = 1e9; frame(g, 60);
      for (const r of g.rl.C) if (r.a && r.ar && !seen.has(r.ph)) seen.set(r.ph, { G: r.gx + g.scroll, V: g.rl.V() }); }
    assert.ok(calls.gn > 0);
    for (const c of seen.values()) { n++; assert.equal(gapsIn(c.G - c.V * 0.85, c.G + c.V * 0.6).length, 0, `impact at ${c.G}`); }
  }
  assert.ok(n >= 10, `rollers between gaps: ${n}`);
  const tl = (env) => JSON.stringify(run({ seed: 4, level: 4, fast: true, inv: true, god: true, ...env }, 60, 60).rs.map((c) => (c.contact || 0).toFixed(3)));
  assert.equal(tl({}), tl({ gapNull: true }));
  log(`   ${n} announced rollers, 0 impacts in a takeoff / 0.85 s landing window`);
});
t("Crusher: no roller placed while crOn() or while the boss is pending on L5; none overtakes after the boss intro (1.4 s) until it is done", () => {
  let pl5 = 0, bef = 0, aft = 0;
  for (const seed of [1, 2, 3, 4]) {
    const r = run({ seed, level: 4, fast: true, inv: true, god: true, boss: [20, 40], noCart: true }, 160, 60);
    const c = r.rs.filter((x) => x.contact !== null).map((x) => x.contact);
    bef += c.filter((x) => x < 20).length; aft += c.filter((x) => x >= 40).length;
    for (const x of c) assert.ok(x < 20 + 1.35 || x >= 40, `overtake at ${x.toFixed(2)} during the fight`);
    for (const x of r.rs) assert.ok(x.seen < 20 || x.seen >= 40, "placed during the fight");
    const p = run({ seed, level: 5, fast: true, inv: true, god: true, boss: [30, 45], noCart: true }, 90, 60);
    for (const x of p.rs) assert.ok(x.seen >= 45, `L5: placed at ${x.seen.toFixed(2)} before the boss was done`);
    pl5 += p.rs.length;
  }
  assert.ok(bef > 0 && aft > 0, `rollers before (${bef}) and after (${aft}) the window`); assert.ok(pl5 >= 3, `L5 after the boss: rollers (${pl5})`);
  log(`   boss window: ${bef} overtakes before, ${aft} after, 0 inside; L5: 0 before the boss is done, ${pl5} after`);
});

// ---------------------------------------------------------------- sound
const TIM = {};
t("sound: warn (edge glow's first frame) -> rumble (TTI 1.2 s) -> pass (centre crossing), each once per roller, in that order; none in demo or before a run", () => {
  let wl = [9, 0], rl = [9, 0], pl = [9, -9], os = [9, 0], nr = 0;
  for (const seed of [5, 6, 7, 8]) {
  const r = run({ seed, level: 4, fast: true, god: true, noCart: true }, 120, 60, "tap");
  for (const [ty, ev, at, dm, st] of r.calls.sfx) { if (ty !== "roller") continue; assert.equal(dm, false); assert.equal(st, "run"); }
  const evs = r.calls.sfx.filter((s) => s[0] === "roller");
  const rs = r.rs.filter((c) => c.contact !== null && c.out !== null); nr += rs.length;
  assert.equal(evs.filter((e) => e[1] === "warn").length, r.rs.filter((c) => c.appr !== null).length);
  assert.equal(evs.filter((e) => e[1] === "rumble").length, r.rs.filter((c) => c.appr !== null).length);
  // match events to rollers by time order (rollers never overlap: spacing >= 2.4 s on L4)
  const W = evs.filter((e) => e[1] === "warn").map((e) => e[2]), R = evs.filter((e) => e[1] === "rumble").map((e) => e[2]), P = evs.filter((e) => e[1] === "pass").map((e) => e[2]);
  rs.forEach((c, i) => {
    const w = c.contact - W[i], u = c.contact - R[i], p = P[i] - c.contact;
    assert.ok(W[i] < R[i] && R[i] < P[i], "order warn < rumble < pass");
    wl = [Math.min(wl[0], w), Math.max(wl[1], w)]; rl = [Math.min(rl[0], u), Math.max(rl[1], u)]; pl = [Math.min(pl[0], p), Math.max(pl[1], p)]; os = [Math.min(os[0], c.out - c.vis), Math.max(os[1], c.out - c.vis)];
  });
  }
  const rs = { length: nr }; assert.ok(nr > 8, `rollers ${nr}`);
  assert.ok(wl[0] >= 1.2 && wl[1] <= 1.32, `warn lead ${wl}`); assert.ok(rl[0] >= 1.17 && rl[1] <= 1.21, `rumble lead ${rl}`);
  Object.assign(TIM, { wl, rl, pl, os });
  log(`   ${rs.length} rollers: warn ${wl[0].toFixed(3)}-${wl[1].toFixed(3)} s before contact, rumble ${rl[0].toFixed(3)}-${rl[1].toFixed(3)} s before, pass ${pl[0].toFixed(3)}-${pl[1].toFixed(3)} s after contact (centre crossing), on screen ${os[0].toFixed(3)}-${os[1].toFixed(3)} s (left edge -> right edge)`);
  const d = run({ seed: 5, level: 4, fast: true, god: true, demo: true, inv: true, noCart: true }, 150, 60);
  assert.ok(d.rs.length > 3); assert.equal(d.calls.sfx.length, 0, "demo: no sfx"); assert.equal(d.calls.txt.length, 0, "demo: no hint");
  assert.equal(d.rs.filter((c) => c.appr !== null).length, 0, "demo: no glow");
  const s = game({ rl: true, level: 4 }); for (let f = 0; f < 300; f++) frame(s.g, 60); assert.equal(s.g.state, "start"); assert.equal(s.calls.sfx.length, 0);
});

t("audio map: 08f EN_MAP has roller warn / rumble / pass (the three events 06k fires)", () => {
  assert.ok(/roller:\{warn:\w+,rumble:\w+,pass:\w+\}/.test(ESFX), "roller:{warn,rumble,pass}");
});

// ---------------------------------------------------------------- hint
t("hint: first roller ever -> HOLD JUMP next to the buggy once (2.4 s), forge-runner-chaser-hint saved; never again; never in demo; no crash without storage", () => {
  const store = {};
  const a = run({ seed: 5, level: 3, fast: true, god: true, store, noCart: true }, 120, 60, "hold");
  assert.equal(store["forge-runner-chaser-hint"], "1");
  const ts = a.calls.txt.filter((x) => x[0] === "HOLD JUMP"); assert.ok(ts.length > 60, "shown for ~2.4 s");
  const first = a.rs.find((c) => c.appr !== null); assert.ok(Math.abs(ts[0][5] - first.appr) < 0.05, "shown with the first warning");
  assert.ok(ts[ts.length - 1][5] - ts[0][5] <= 2.45);
  assert.ok(a.rs.filter((c) => c.appr !== null).length > 3, "more rollers after, no more hints");
  assert.ok(ts.every((x) => x[1] >= 56 + 45 && x[1] <= 56 + 45 + 20 && x[2] < 232 - 40 && x[2] > 232 - 80), "just ahead of the buggy, at cab height");
  const b = run({ seed: 6, level: 3, fast: true, god: true, store, noCart: true }, 120, 60, "hold");
  assert.equal(b.calls.txt.filter((x) => x[0] === "HOLD JUMP").length, 0, "stored: never again");
  const dm = {}; const d = run({ seed: 5, level: 3, fast: true, god: true, demo: true, inv: true, store: dm }, 120, 60);
  assert.equal(d.calls.txt.length, 0); assert.equal(dm["forge-runner-chaser-hint"], undefined, "demo never marks it");
  const n = run({ seed: 5, level: 3, fast: true, god: true, store: "throw", noCart: true }, 120, 60, "hold");
  assert.equal(n.deaths, 0); assert.ok(n.calls.txt.filter((x) => x[0] === "HOLD JUMP").length > 0, "no storage: still shown once this session");
  const n2 = run({ seed: 5, level: 3, fast: true, god: true }, 120, 60, "hold"); assert.equal(n2.deaths, 0);
  // same session, chained runs, storage throwing: shown once only
  const { g, calls } = game({ rl: true, level: 3, store: "throw", god: true, noCart: true }); const per = [];
  for (let k = 0; k < 2; k++) { calls.txt.length = 0; g.start(); g.speed = 760; for (let f = 0; f < 120 * 60 && g.state === "run"; f++) { g.inv = 1e9; frame(g, 60); } if (g.state === "run") { g.inv = 0; g.die(); } per.push(calls.txt.filter((x) => x[0] === "HOLD JUMP").length); }
  assert.ok(per[0] > 0 && per[1] === 0, `once per session (${per})`);
});

// ---------------------------------------------------------------- collisions / hitbox
t("hitbox 30x22 = sprite: opaque pixels == srSolid, all inside the box (0 px overhang), coverage >= 75 %", () => {
  const { g, calls } = game({ rl: true }); g.start();
  for (const d of [0, 7, 19, 33]) {
    const r = { a: 1, x: 300, ph: 0, d }; calls.fr.length = 0; g.rl.drawR(r);
    const cell = new Set(), sol = new Set();
    for (const [x, y, w, h, a] of calls.fr) if (a >= 0.6) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) cell.add((x + i) + "," + (y + j));
    for (const q of g.rl.solid(r)) for (let i = 0; i < q.w; i++) for (let j = 0; j < q.h; j++) sol.add((q.x + i) + "," + (q.y + j));
    const out = [...cell].filter((k) => { const [x, y] = k.split(",").map(Number); return !(x >= 300 && x < 330 && y >= g.GY - 22 && y < g.GY); }).length;
    assert.equal(out, 0, `overhang ${out}`); assert.deepEqual([...cell].sort(), [...sol].sort());
    assert.ok(cell.size / 660 >= 0.75); if (!d) log(`   opaque ${cell.size}/660 px (${(100 * cell.size / 660).toFixed(1)} %), overhang ${out} px`);
  }
});
t("absorb order: inv ignores a roller, a shield absorbs it, a Spare Core reboots (rollers cleared), otherwise the run ends; ducking under one is always a hit", () => {
  const place = (g) => { g.spawnDist = -1e9; g.ents = []; const r = g.rl.C[0]; Object.assign(r, { a: 1, ar: 1, s1: 1, s2: 1, s3: 0, hit: 0, ph: 5, d: 0 }); r.x = g.PX + 4; return r; };
  let { g } = game({ rl: true }); g.start(); g.update(1 / 240); let r = place(g); g.inv = 5; frame(g, 240); assert.equal(g.state, "run"); assert.equal(r.a, 1);
  ({ g } = game({ rl: true })); g.start(); g.update(1 / 240); r = place(g); g.inv = 0; g.shd = 1; frame(g, 240); assert.equal(g.state, "run", "shield absorbs"); assert.equal(g.shd, 0);
  ({ g } = game({ rl: true })); g.start(); g.update(1 / 240); r = place(g); g.inv = 0; g.shd = 0; g.cores = 1; frame(g, 240); assert.equal(g.state, "run", "core reboots"); assert.equal(g.cores, 0); assert.equal(r.a, 0);
  ({ g } = game({ rl: true })); g.start(); g.update(1 / 240); r = place(g); g.inv = 0; frame(g, 240); assert.equal(g.state, "over"); assert.equal(r.hit, 1);
  for (const x of [-60, -30, -10, 0, 10, 25]) { ({ g } = game({ rl: true })); g.start(); g.update(1 / 240); r = place(g); r.x = g.PX + x; g.inv = 0; for (let f = 0; f < 60 && g.state === "run"; f++) { g.duck = true; g.spawnDist = -1e9; frame(g, 240); } assert.equal(g.state, "over", `duck from ${x}`); assert.equal(r.hit, 1); }
});
t("art: rolling molten cracks change with ground distance; ember trail streams behind (slower than the roller) from a fixed pool, deterministic", () => {
  const { g, calls } = game({ rl: true }); g.start();
  const sig = (d) => { calls.fr.length = 0; g.rl.drawR({ a: 1, x: 300, ph: 0, d }); return JSON.stringify(calls.fr.filter((f) => f[5] === "#fb923c" && f[4] === 1)); };
  assert.notEqual(sig(0), sig(9));
  const tr = calls.fr.filter(([x, , w, , a]) => x + w <= 300 && a > 0 && a < 0.6); assert.ok(tr.length >= 2, "translucent molten streak behind");
  const sim = (seed) => {
    const { g } = game({ rl: true, seed }); g.start(); g.update(1 / 240); g.spawnDist = -1e9; g.ents = [];
    const r = g.rl.C[0]; Object.assign(r, { a: 1, ar: 1, s1: 1, s2: 1, s3: 1, hit: 0, ph: 3, d: 0 }); r.x = -10; let behind = 0, n = 0, mx = 0;
    for (let f = 0; f < 10; f++) { g.inv = 1e9; g.spawnDist = -1e9; frame(g, 60); const ps = g.rl.parts(); mx = Math.max(mx, ps.length); for (const p of ps) { n++; assert.ok(p.vx < g.rl.SR_V); if (p.x < r.x + 10) behind++; } }
    return { n, behind, mx, s: JSON.stringify(g.rl.parts().map((p) => [p.x.toFixed(2), p.y.toFixed(2)])) };
  };
  const a = sim(1), b = sim(2); assert.ok(a.n > 10 && a.behind / a.n > 0.8, `embers behind ${a.behind}/${a.n}`); assert.ok(a.mx <= 40); assert.equal(a.s, b.s);
});

// ---------------------------------------------------------------- live hooks
t("live hooks: srTick/srWant/srDraw each defined once with exactly one call site in the site, Poki and lab scripts (Poki: no srWant call, no autopilot); lab adds none", () => {
  const cnt = (s, f) => s.split(f + "(").length - 1;
  for (const f of ["srTick", "srWant", "srDraw"]) for (const [nm, src] of [["site", SCRIPT], ["poki", POKI], ["lab", LABS]]) {
    assert.equal(cnt(src, "function " + f), 1, `${nm}: ${f} defined once`); assert.equal(cnt(src, f), nm === "poki" && f === "srWant" ? 1 : 2, `${nm}: ${f} call sites`);
  }
  assert.ok(!/srTick|srDraw|srWant/.test(body(LAB).replace(/\/\*[\s\S]*?\*\//g, "")), "the lab layer calls no hook");
  const s13 = body(SIM).split("\n"), s14 = R14.split("\n");
  assert.equal(s13.findIndex((l) => l.includes("srTick(dt,pw,ph,pt)")) - 1, s13.findIndex((l) => l.includes("ocTick(dt,pw,ph,pt)")), "srTick right after ocTick");
  assert.equal(s13.findIndex((l) => l.includes("srWant()")) - 1, s13.findIndex((l) => l.includes("ocWant()")), "srWant right after ocWant");
  const iD = s14.findIndex((l) => l.includes("srDraw()")); assert.ok(s14[iD - 1].includes("ocDraw()") && s14[iD + 1].includes("edgeWarnDraw()"), "srDraw between ocDraw and edgeWarnDraw");
});
t("live hooks at run time: per update() step srTick once, per auto() srWant once, per drawEnts() srDraw once; demo autopilot (auto() via the live srWant line) clears rollers: 0 roller deaths", () => {
  const { g } = game({ rl: true, level: 4, demo: true, god: true }); g.start(); g.speed = 760; const n = g.rl.spy();
  for (let f = 0; f < 600; f++) { const a = { ...n }; g.update(1 / 240); assert.equal(n.tick - a.tick, g.state === "run" ? 1 : 0); assert.equal(n.want - a.want, g.state === "run" ? 1 : 0); const b = { ...n }; g.rl.draw(); assert.equal(n.draw - b.draw, 1); }
  let dead = 0, seen = new Set();
  for (const seed of [1, 2, 3]) for (const vm of [0, 1.15]) { const d = game({ rl: true, level: 5, demo: true, god: true, seed, vm: vm || undefined }); d.g.start(); d.g.speed = 760;
    for (let f = 0; f < 60 * 60; f++) { frame(d.g, 60); for (const r of d.g.rl.C) { if (r.a) seen.add(seed + ":" + vm + ":" + r.ph); if (r.hit) dead++; } if (d.g.state !== "run") break; }
    assert.equal(dead, 0, `demo roller deaths seed ${seed} vm ${vm}`); }
  assert.equal(dead, 0); assert.ok(seen.size >= 8, `demo rollers ${seen.size}`); log(`   demo autopilot: ${seen.size} rollers, 0 roller deaths`);
});
t("pinned lines: 13-simulation.js speed/scroll/runT/score/spawnDist/e.x lines byte-identical", () => {
  const pin = ["    speed=Math.min(MAXV,speed+7*dt);", "    scroll+=speed*dt;", "    runT+=speed*dt/34;", "    score=Math.min(99999,score+speed*dt*.05);", "    spawnDist+=speed*dt;", "      e.x-=(speed+(e.vx||0))*dt;"];
  const lines = body(SIM).split("\n"); for (const l of pin) assert.equal(lines.filter((x) => x === l).length, 1, l);
});
t("lab: ?level=N -> currentLevel() N and the HUD label reads LVN (the lab names the current level; site HUD unchanged)", () => {
  for (const L of [1, 3, 4, 5]) { const { g } = game({ rl: true, level: L }); g.start(); g.update(1 / 240); assert.equal(g.lv(), L); assert.equal(g.LV_HL()[L], "LV" + L); }
  const s = game({}); assert.equal(s.g.LV_HL()[4], "LV5", "site: the marker names the NEXT level (LV5 while on L4)");
});

// ---------------------------------------------------------------- run chaining
t("chained runs via the real start()/die(): rollers + glow + sounds live at L4+, die, restart; first frame (draw-first OR update-first) and L1-L2: no roller, glow, sfx or hint carries over", () => {
  const { g, calls } = game({ rl: true, seed: 9, store: {}, noCart: true }); g.ew.spy();
  const live = () => g.rl.C.filter((c) => c.a).length;
  for (let k = 0; k < 4; k++) {
    g.start();
    calls.fr.length = 0; calls.sfx.length = 0; calls.txt.length = 0;
    if (k % 2 === 0) { g.rl.draw(); assert.equal(live(), 0, `run ${k}: draw-first saw old rollers`); assert.equal(g.ew.live(), 0); assert.equal(calls.fr.length, 0); }
    g.update(1 / 240); assert.equal(live(), 0); assert.equal(g.ew.live(), 0); assert.equal(g.rl.hint, 0); assert.equal(g.lv(), 1);
    let seen = 0, ew = 0;
    while (g.runS < 39) { g.inv = 1e9; calls.ew.length = 0; frame(g, 60); seen += live(); ew += calls.ew.filter((e) => e[0].startsWith("sr")).length; }
    assert.equal(seen, 0, `run ${k}: rollers before L3`); assert.equal(ew, 0); assert.equal(calls.sfx.filter((s) => s[0] === "roller").length, 0); assert.equal(calls.txt.length, 0);
    let up = false;
    for (let f = 0; f < 600 * 60 && !up; f++) { g.inv = 1e9; calls.ew.length = 0; frame(g, 60); up = g.lv() >= 4 && live() > 0 && calls.ew.some((e) => e[0].startsWith("sr")); }
    assert.ok(up, `run ${k}: reached L4+ with a roller warning live`);
    g.inv = 0; g.die(); assert.equal(g.state, "over"); g.rl.draw(); assert.equal(g.ew.live(), 0);
  }
});
console.log(`chaser: ${pass} tests passed`);
