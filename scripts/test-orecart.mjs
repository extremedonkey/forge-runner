// ORE CART (oncoming enemy) + EDGE WARN tests: evaluates the real state/sparks/levels/enemies-v2/flow/simulation fragments with
// 06i-orecart.js, 06j-edge-warn.js and the lab layer (src/client/lab/orecart.js, which stands in for the live hook lines), the
// same way test-enemies-v2.mjs does. Run: node scripts/test-orecart.mjs (also via npm test). Prints the fairness/warning tables.
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import EN from "../src/client/06g-enemies-v2.js";
import OC from "../src/client/06i-orecart.js";
import EW from "../src/client/06j-edge-warn.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LAB from "../src/client/lab/orecart.js";
import { SCRIPT } from "../src/client/index.mjs";
import { buildPokiScript } from "../src/client/poki/script.mjs";
import { labScript } from "./build-lab.mjs";
const POKI = buildPokiScript(), LABS = await labScript("orecart");
const body = (f) => f.slice(1, -1);
const QUIET = process.argv.includes("--quiet");
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   orecart:", name); };
const log = (...a) => { if (!QUIET) console.log(...a); };
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(Math.max(0, d), tm); return 0.05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const DEV = { desktop: { XO: 0, VW: 600, ZM: 1 }, portrait: { XO: 20, VW: 600 / 1.35, ZM: 1.35 } };

// env: { oc: include 06i/06j + lab layer, seed, demo, level, felt (fixed felt world speed via a vMul() stub; 13's e.x line
// patched to use it like Dev's hook), sdFelt (spawnDist also at felt speed), god (base obstacles harmless; carts still hit),
// dev: "desktop"|"portrait" }
function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { sfx: [], ew: [], fr: [], ms: [] };
  const d = DEV[env.dev || "desktop"], q = { level: env.level };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false,__god=${!!env.god};
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined?null:String(v)}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${d.XO},OY=0,OB=0,VW=${d.VW},ZM=${d.ZM},HS=1,K=1,SX=0,SY=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};
    var ctx={globalAlpha:1,fillStyle:"",fillRect:function(x,y,w,h){calls.fr.push([x,y,w,h,ctx.globalAlpha,ctx.fillStyle])},save:function(){},restore:function(){},translate:function(){},scale:function(){},rotate:function(){}};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}function sparks(){}function dust(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxReforge(){}
    function upShow(){}function upHide(){}function msOn(e){calls.ms.push(e)}
    function enemySfx(ty,ev){calls.sfx.push([ty,ev,runS])}` +
    (env.felt ? `function vMul(){return ${env.felt}/speed}` : "");
  let sim = body(SIM);
  if (env.felt) {
    sim = sim.replace("e.x-=(speed+(e.vx||0))*dt;", "e.x-=(speed*(typeof vMul===\"function\"?vMul():1)+(e.vx||0))*dt;");
    if (env.sdFelt) sim = sim.replace("spawnDist+=speed*dt;", "spawnDist+=speed*vMul()*dt;");
  }
  if (env.god) sim = sim.replace("if(inv>0)continue;", "if(inv>0||__god)continue;");
  const api = `;return {get score(){return score},get speed(){return speed},set speed(v){speed=v},get state(){return state},set state(v){state=v},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},get vy(){return vy},get jb(){return jb},get runS(){return runS},get tt(){return tt},set tt(v){tt=v},
    set inv(v){inv=v},get shd(){return shd},set shd(v){shd=v},set spawnDist(v){spawnDist=v},set nextGap(v){nextGap=v},get nextGap(){return nextGap},get nt(){return nt},set SX(v){SX=v},set SY(v){SY=v},
    press,release,start,update,die,pW,PX,W,GY,lv:function(){return currentLevel()},
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    ${env.oc ? `oc:{C:ocC,V:ocV,Vc:ocVc,TTI:ocTTI,vis:ocVis,solid:ocSolid,drawCart:ocDrawCart,draw:function(){drawEnts()},OC_V:OC_V,OC_W:OC_W,OC_H:OC_H,OC_SP:OC_SP,OC_WARN:OC_WARN,OC_MINT:OC_MINT,OC_CLR:OC_CLR,
      want:ocWant,space:ocSpace},
    ew:{warn:edgeWarn,draw:edgeWarnDraw,clear:edgeWarnClear,live:edgeWarnLive,rect:edgeWarnRect,spy:function(){var o=edgeWarn;edgeWarn=function(k,a,b,c,d){calls.ew.push([k,a,runS]);return o(k,a,b,c,d)}}}` : "oc:null,ew:null"}}`;
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + body(EN) + (env.oc ? body(OC) + body(EW) : "") + body(FLOW) + sim + (env.oc ? body(LAB) : "") + api;
  const g = new Function("Math", "calls", src)(M, calls);
  calls.rn = () => rn;
  return { g, calls };
}

// one frame = n sub-steps (16-loop.js: <= 1/240 s each) + the draw (ocDraw + edgeWarnDraw via the lab drawEnts wrapper)
function frame(g, fps) { const n = Math.max(1, Math.ceil(240 / fps - 1e-6)); for (let i = 0; i < n; i++) g.update(1 / fps / n); g.oc && g.oc.draw(); }

// jump-only bot: TAP (press + release in the same frame) when a hazard's centre is LEAD s from the buggy's centre. Carts use
// the cart closing speed; base ground hazards (bugs, rollers, pillars/vents, low flyers) are tapped too so the buggy's air
// state is realistic (base hits are switched off with env.god: this counts CART deaths only). Never ducks.
const LEAD = 0.21;
function bot(g) {
  if (g.state !== "run" || g.py !== 0 || g.jb > 0) return;
  const cx = g.PX + g.pW() / 2, Vc = g.oc.Vc(), V = g.oc.V();
  for (const c of g.oc.C) if (c.a) { const m = (c.x + g.oc.OC_W / 2 - cx) / Vc; if (m > 0 && m <= LEAD) { g.press(); g.release(); return; } }
  for (const e of g.ents) {
    if (e.t === "k" || e.t === "u" || e.t === "d" || e.t === "h" || (e.t === "f" && e.bot > 10)) continue;
    const m = (e.x + e.w / 2 - cx) / (V + (e.vx || 0)); if (m > 0 && m <= LEAD) { g.press(); g.release(); return; }
  }
}

// a full run with carts; per cart: level at first sight, approach time, first visible time, contact time, hit/pass
function run(env, secs, fps, useBot = true) {
  const { g, calls } = game({ oc: true, ...env }); g.ew.spy(); g.start();
  const cs = new Map(); let deaths = 0, frames = 0, gaps = 0;
  for (let f = 0; f < secs * fps && g.state === "run"; f++) {
    if (useBot) bot(g);
    if (env.inv) g.inv = 1e9;
    calls.ew.length = 0;
    frame(g, fps); frames++;
    const warned = new Set(calls.ew.map((w) => w[0]));
    for (const c of g.oc.C) {
      if (!c.a && !c.hit) continue;
      let r = cs.get(c.ph); if (!r) { r = { lv: g.lv(), seen: g.runS, appr: null, vis: null, contact: null, hit: 0, passed: 0, gapFrames: 0 }; cs.set(c.ph, r); }
      const front = g.PX + g.pW();
      if (r.appr === null && warned.has("oc" + c.ph)) r.appr = g.runS;
      if (r.vis === null && g.oc.vis(c)) r.vis = g.runS;
      if (r.contact === null && c.x <= front) r.contact = g.runS - (front - c.x) / g.oc.Vc();
      // between the first warning and contact: every frame shows the edge glow or the cart itself
      if (r.appr !== null && r.contact === null && !warned.has("oc" + c.ph) && !g.oc.vis(c)) { r.gapFrames++; gaps++; }
      if (c.hit) r.hit = 1;
      if (c.x + g.oc.OC_W < g.PX) r.passed = 1;
    }
    if (g.state !== "run") deaths++;
  }
  return { g, calls, cs: [...cs.values()], deaths, gaps, frames };
}

// ---------------------------------------------------------------- determinism / hard rules
t("200 s invulnerable run: score, speed, Math.random count and the spawn timeline are identical with and without the ore cart; score under the ceiling", () => {
  const a = game({ level: 0 }), b = game({ oc: true });
  const la = [], lb = [];
  a.g.wrapSpawn((n, tt, nt) => la.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w, e.h, e.bot].join())].join("|")));
  b.g.wrapSpawn((n, tt, nt) => lb.push([tt.toFixed(6), nt, n.map((e) => [e.t, e.x, e.w, e.h, e.bot].join())].join("|")));
  a.g.start(); b.g.start(); const seen = new Set();
  for (let f = 0; f < 200 * 60; f++) {
    a.g.inv = 1e9; b.g.inv = 1e9; frame(a.g, 60); frame(b.g, 60);
    if (f % 60 === 0) {
      assert.equal(b.g.score, a.g.score); assert.equal(b.g.speed, a.g.speed); assert.equal(b.calls.rn(), a.calls.rn(), `RNG draws at ${f / 60} s`);
      assert.ok(b.g.score <= nFor(b.g.runS) * 1.01 + 5, `ceiling at ${b.g.runS}`);
    }
    for (const c of b.g.oc.C) if (c.a) seen.add(c.ph);
  }
  const carts = seen.size;
  assert.deepEqual(lb, la, "same spawns, same times, same positions"); assert.ok(la.length > 100);
  assert.ok(carts > 20, `carts appeared (${carts})`);
  log(`   200 s run: ${la.length} base spawns identical, ${carts} carts, Math.random draws ${a.calls.rn()} = ${b.calls.rn()}`);
});
t("static: 06i/06j never call Math.random and never assign score/speed/scroll/runT/spawnDist/nextGap/nt/ents", () => {
  const nc = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [n, s] of [["06i", nc(body(OC))], ["06j", nc(body(EW))]]) {
    assert.ok(!/Math\.random/.test(s), n + " Math.random");
    assert.ok(!/(^|[^.\w])(score|speed|scroll|runT|spawnDist|nextGap|nt|ents)\s*(=[^=]|\+=|-=|\+\+|--)/m.test(s), n + " writes a sim global");
  }
});
t("enemy RNG stream: same seed -> identical cart timeline; carts are deterministic per run", () => {
  const tl = (seed) => { const r = run({ seed, inv: true, god: true }, 120, 60, false); return r.cs.filter((c) => c.contact !== null).map((c) => c.contact.toFixed(4)).join(","); };
  assert.equal(tl(7), tl(7)); assert.equal(tl(11), tl(11)); assert.notEqual(tl(7), tl(11));
});

// ---------------------------------------------------------------- spacing per level
t("spacing: no cart on L1; L2 >= 2.5 s, L3 >= 2.03 s, L4 >= 1.57 s, L5 >= 1.1 s between contacts", () => {
  const nat = run({ seed: 3, inv: true, god: true }, 150, 60, false);
  assert.ok(nat.cs.length > 10); for (const c of nat.cs) assert.ok(c.lv >= 2, "cart seen on L1 at " + c.seen);
  assert.ok(Math.min(...nat.cs.filter((c) => c.contact !== null).map((c) => c.contact)) >= 20, "nothing before L2 (20 s)");
  const one = game({ oc: true, level: 1 }); one.g.start(); for (let f = 0; f < 19 * 60; f++) { one.g.inv = 1e9; frame(one.g, 60); }
  assert.equal(one.g.oc.C.filter((c) => c.a).length, 0, "L1: none in the first 19 s");
  const rows = [];
  for (const L of [2, 3, 4, 5]) {
    const sp = [0, 2.5, 2.0333, 1.5667, 1.1][L - 1], gaps = [];
    for (const seed of [1, 2, 3, 4]) for (const felt of [0, 500, 760]) {
      const r = run({ seed, level: L, felt: felt || undefined, inv: true, god: true }, 40, 60, false);
      const cc = r.cs.filter((c) => c.lv === L && c.contact !== null).map((c) => c.contact).sort((a, b) => a - b);
      for (let i = 1; i < cc.length; i++) { gaps.push(cc[i] - cc[i - 1]); }
    }
    const mn = Math.min(...gaps), avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    assert.ok(mn >= sp - 0.02, `L${L} min spacing ${mn.toFixed(3)} >= ${sp}`);
    rows.push(`   L${L}: min ${mn.toFixed(2)} s (rule ${sp.toFixed(2)}), mean ${avg.toFixed(2)} s over ${gaps.length} pairs`);
  }
  log(rows.join("\n"));
});

// ---------------------------------------------------------------- tap / hold windows
// one cart, nothing else; press `off` s before the cart's centre is over the buggy's centre (sweep), tap or full hold
function trial(F, mode, off, fps) {
  const { g } = game({ oc: true, felt: F, level: 2 }); g.start(); g.update(1 / 240);
  g.spawnDist = -1e9; g.ents = []; g.oc.C.forEach((c) => (c.a = 0));
  const c = g.oc.C[0], cx = g.PX + g.pW() / 2; Object.assign(c, { a: 1, ar: 1, s1: 1, s2: 0, hit: 0, ph: 99 });
  c.x = cx - g.oc.OC_W / 2 + g.oc.Vc() * 0.8; let pressed = false;
  for (let f = 0; f < 2 * fps; f++) {
    g.spawnDist = -1e9;
    const m = (c.x + g.oc.OC_W / 2 - cx) / g.oc.Vc();
    if (!pressed && m <= off) { pressed = true; g.press(); if (mode === "tap") g.release(); }
    frame(g, fps); if (g.state !== "run") return false; if (!c.a || c.x + g.oc.OC_W < g.PX - 5) return true;
  }
  return true;
}
function windowOf(F, mode, fps) {
  const ok = []; for (let off = 0; off <= 0.7 + 1e-9; off += 0.0025) if (trial(F, mode, +off.toFixed(4), fps)) ok.push(off);
  if (!ok.length) return null; return [Math.min(...ok), Math.max(...ok)];
}
const FELT = [340, 400, 442, 500, 570, 589, 650, 700, 722, 760, 800];
t("tap/hold windows vs one cart at 340-800 felt (closing 660-1120 u/s), 240 fps; LEAD 0.21 s is inside every tap window", () => {
  const rows = ["   felt  closing  tap window (s before centre)     hold window"];
  for (const F of FELT) {
    const tw = windowOf(F, "tap", 240), hw = windowOf(F, "hold", 240);
    assert.ok(tw && tw[0] < LEAD && tw[1] > LEAD, `tap window at ${F}: ${tw}`); assert.ok(hw && hw[1] - hw[0] > 0.4, `hold window at ${F}: ${hw}`);
    rows.push(`   ${F}   ${F + 320}     ${tw[0].toFixed(3)}-${tw[1].toFixed(3)} (${(tw[1] - tw[0]).toFixed(3)} s)     ${hw[0].toFixed(3)}-${hw[1].toFixed(3)} (${(hw[1] - hw[0]).toFixed(3)} s)`);
  }
  log(rows.join("\n"));
});

// ---------------------------------------------------------------- fairness: jump-only, 60 + 240 fps
t("jump-only bot (taps only) across 340-800 felt, 60 and 240 fps, L2-L5, desktop + portrait: 0 cart deaths", () => {
  const rows = ["   felt  fps  carts  cart deaths  min warn (s)  min on-screen (s)"]; let total = 0;
  for (const F of FELT) for (const fps of [60, 240]) {
    let n = 0, dead = 0, mw = 9, mv = 9;
    for (const L of [2, 3, 4, 5]) for (const seed of [1, 2]) {
      const r = run({ seed, level: L, felt: F, god: true, sdFelt: seed === 2, dev: seed === 2 ? "portrait" : "desktop" }, 30, fps);
      for (const c of r.cs) if (c.contact !== null || c.hit) { n++; if (c.hit) dead++; if (c.appr !== null && c.contact !== null) mw = Math.min(mw, c.contact - c.appr); if (c.vis !== null && c.contact !== null) mv = Math.min(mv, c.contact - c.vis); }
      if (r.deaths) console.log("DEATH", F, fps, L, seed, JSON.stringify(r.cs.filter((c) => c.hit)), r.g.runS, JSON.stringify(r.g.ents.filter((e) => e.t !== "k").map((e) => [e.t, Math.round(e.x), e.bot])), JSON.stringify(r.g.oc.C.filter((c) => c.a).map((c) => Math.round(c.x))), r.g.py);
      assert.equal(r.deaths, 0, `run ended at felt ${F} ${fps} fps L${L} seed ${seed}`);
    }
    assert.equal(dead, 0, `cart deaths at ${F}/${fps}`); assert.ok(n > 10, `carts at ${F}/${fps}: ${n}`); total += n;
    rows.push(`   ${F}   ${fps}   ${n}     ${dead}           ${mw.toFixed(3)}         ${mv.toFixed(3)}`);
  }
  log(rows.join("\n")); log(`   total carts jumped: ${total}`);
});

// ---------------------------------------------------------------- warning time per device and level speed
t("warning >= 0.9 s before contact at 390x844 portrait and desktop at every level speed (glow or cart on screen every frame from approach to contact)", () => {
  const rows = ["   device    felt(level)   warn min/max (s)   on-screen before contact (s)   glow-gap frames"];
  const LVS = [[442, "L2 lo"], [570, "L2 hi"], [589, "L3 lo"], [722, "L3 hi"], [760, "L4"], [800, "L5"], [340, "start"]];
  for (const dev of ["portrait", "desktop"]) for (const [F, nm] of LVS) for (const fps of [60]) {
    let mn = 9, mx = 0, vmin = 9, gaps = 0, n = 0;
    for (const seed of [1, 2, 3]) {
      const r = run({ seed, level: 3, felt: F, god: true, dev, inv: true }, 30, fps, false);
      for (const c of r.cs) if (c.contact !== null) { n++; assert.ok(c.appr !== null, "warned"); const w = c.contact - c.appr; mn = Math.min(mn, w); mx = Math.max(mx, w); vmin = Math.min(vmin, c.contact - (c.vis ?? c.contact)); }
      gaps += r.gaps;
    }
    assert.ok(n > 5); assert.ok(mn >= 0.9, `${dev} ${F}: warn ${mn}`); assert.equal(gaps, 0, `${dev} ${F}: frames with neither glow nor cart`);
    rows.push(`   ${dev.padEnd(9)} ${String(F).padEnd(4)}(${nm.padEnd(5)})   ${mn.toFixed(3)} / ${mx.toFixed(3)}        ${vmin.toFixed(3)}                          ${gaps}`);
  }
  log(rows.join("\n"));
});

// ---------------------------------------------------------------- sound
t("sound: enemySfx('orecart','approach') once per cart at its first warning (>= 0.9 s before contact), 'pass' once when it is behind the buggy; none in demo", () => {
  const r = run({ seed: 5, level: 4, felt: 700, god: true }, 40, 60);
  const ap = r.calls.sfx.filter((s) => s[0] === "orecart" && s[1] === "approach"), ps = r.calls.sfx.filter((s) => s[0] === "orecart" && s[1] === "pass");
  const passed = r.cs.filter((c) => c.passed).length, warned = r.cs.filter((c) => c.appr !== null).length;
  assert.ok(passed > 5); assert.equal(ap.length, warned); assert.equal(ps.length, passed);
  for (const c of r.cs) if (c.contact !== null) assert.ok(c.contact - c.appr >= 0.9);
  const d = run({ seed: 5, level: 4, felt: 700, god: true, demo: true, inv: true }, 30, 60, false);
  assert.ok(d.cs.length > 3); assert.equal(d.calls.sfx.length, 0, "demo: no sfx");
});

// ---------------------------------------------------------------- collisions / hitbox
t("hitbox 40x26 = sprite: opaque pixels inside the hitbox (overhang 0 % < 5 %), opaque silhouette == ocSolid, covers >= 80 % of the box", () => {
  const { g, calls } = game({ oc: true }); g.start();
  const c = { a: 1, x: 200, ph: 0 }; calls.fr.length = 0; g.oc.drawCart(c);
  const cell = new Set(), sol = new Set();
  for (const [x, y, w, h, a] of calls.fr) if (a >= 0.6) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) cell.add((x + i) + "," + (y + j));
  for (const r of g.oc.solid(c)) for (let i = 0; i < r.w; i++) for (let j = 0; j < r.h; j++) sol.add((r.x + i) + "," + (r.y + j));
  const box = (k) => { const [x, y] = k.split(",").map(Number); return x >= 200 && x < 240 && y >= g.GY - 26 && y < g.GY; };
  const out = [...cell].filter((k) => !box(k)).length;
  assert.ok(out / (40 * 26) < 0.05, `overhang ${out}`); assert.equal(out, 0);
  assert.deepEqual([...cell].sort(), [...sol].sort(), "opaque draw == ocSolid");
  assert.ok(cell.size / (40 * 26) >= 0.8, `coverage ${(cell.size / 1040).toFixed(2)}`);
  log(`   opaque ${cell.size}/1040 px of the hitbox (${(100 * cell.size / 1040).toFixed(1)} %), overhang ${out} px`);
});
t("absorb order: inv ignores a cart, a shield absorbs it, otherwise the run ends (ducking into one = death)", () => {
  const place = (g) => { g.spawnDist = -1e9; g.ents = []; const c = g.oc.C[0]; Object.assign(c, { a: 1, ar: 1, s1: 1, s2: 0, hit: 0, ph: 5 }); c.x = g.PX + 10; return c; };
  let { g } = game({ oc: true }); g.start(); g.update(1 / 240); let c = place(g); g.inv = 5; frame(g, 240); assert.equal(g.state, "run"); assert.equal(c.a, 1);
  ({ g } = game({ oc: true })); g.start(); g.update(1 / 240); c = place(g); g.inv = 0; g.shd = 1; frame(g, 240); assert.equal(g.state, "run", "shield absorbs"); assert.equal(g.shd, 0);
  ({ g } = game({ oc: true })); g.start(); g.update(1 / 240); c = place(g); g.inv = 0; frame(g, 240); assert.equal(g.state, "over"); assert.equal(c.hit, 1);
});

// ---------------------------------------------------------------- EDGE WARN API (Dev's three requirements)
t("edgeWarn 1: demo mode and before a run: nothing recorded, nothing drawn, no sfx", () => {
  const { g, calls } = game({ oc: true }); // state "start"
  calls.fr.length = 0; g.ew.warn("gap1", 0.8, "gap", "right", { sfx: ["gaps", "warn"] }); assert.equal(g.ew.draw(), 0);
  assert.equal(calls.fr.length, 0); assert.equal(calls.sfx.length, 0); assert.equal(g.ew.live(), 0);
  const d = game({ oc: true, demo: true }); d.g.start();
  for (let i = 0; i < 30; i++) { d.g.ew.warn("gap1", 0.8, "gap", "right", { sfx: ["gaps", "warn"] }); d.calls.fr.length = 0; assert.equal(d.g.ew.draw(), 0); assert.equal(d.calls.fr.length, 0); }
  assert.equal(d.calls.sfx.length, 0); assert.equal(d.g.ew.live(), 0);
});
t("edgeWarn 2: stale keys drop after 2 frames without a call; sfx once per key; cleared on run start and on death", () => {
  const { g, calls } = game({ oc: true }); g.start(); g.update(1 / 240);
  g.ew.warn("gap1", 0.8, "gap", "right", { sfx: ["gaps", "warn"] }); g.ew.warn("gap2", 0.5, "enemy", "left");
  assert.equal(g.ew.draw(), 2); assert.equal(g.ew.draw(), 2, "one missed frame: still on"); assert.equal(g.ew.draw(), 0, "two missed: dropped");
  g.ew.warn("gap1", 0.7, "gap", "right", { sfx: ["gaps", "warn"] }); assert.equal(g.ew.draw(), 1);
  assert.deepEqual(calls.sfx.map((s) => s.slice(0, 2)), [["gaps", "warn"]], "sfx once per key per run");
  g.die(); assert.equal(g.ew.draw(), 0, "death clears"); assert.equal(g.ew.live(), 0);
  g.start(); g.update(1 / 240); assert.equal(g.ew.live(), 0);
  g.ew.warn("gap1", 0.7, "gap", "right", { sfx: ["gaps", "warn"] }); assert.equal(g.ew.draw(), 1); assert.equal(calls.sfx.length, 2, "new run: fires again");
  for (let i = 0; i < 60; i++) { g.ew.warn("gap1", 0.7, "gap"); frame(g, 60); }  /* 1 s of frames (update + draw) */
  const r0 = g.runS; g.start(); g.update(1 / 240); assert.ok(g.runS < r0); assert.equal(g.ew.draw(), 0, "run start clears");
  for (let i = 0; i < 12; i++) g.ew.warn("k" + i, 1, "gap"); assert.equal(g.ew.draw(), 8, "fixed 8 slots, extra keys ignored");
});
t("edgeWarn 3: no Math.random; the pulse is a pure function of time (same tt -> same pixels)", () => {
  assert.ok(!/Math\.random/.test(body(EW).replace(/\/\*[\s\S]*?\*\//g, "")));
  const { g, calls } = game({ oc: true }); g.start(); g.update(1 / 240); const r0 = calls.rn();
  const shot = (tt) => { g.tt = tt; g.ew.warn("a", 0.6, "enemy"); calls.fr.length = 0; g.ew.draw(); return JSON.stringify(calls.fr); };
  const a = shot(3.21), b = shot(3.21), c = shot(3.29);
  assert.equal(a, b); assert.notEqual(a, c); for (let i = 0; i < 500; i++) shot(i / 60); assert.equal(calls.rn(), r0, "no RNG draws");
});
t("edge glow placement: inside Mobile's clear bands at 390x844 (x 370-390, y 360-563) and 844x390 (x 792-812, y 160-302), off the last column, shake-proof", () => {
  const cases = [["portrait", 390 / (600 / 1.35), 0, 410, 370, 390, 360, 563], ["desktop", 1.3, 32, 0, 792, 812, 160, 302]];
  for (const [dev, CS, left, OYs, x0, x1, y0, y1] of cases) for (const sh of [0, 2.4, -2.4]) {
    const { g, calls } = game({ oc: true, dev }); g.start(); g.update(1 / 240); g.SX = sh; g.SY = sh;
    g.ew.warn("a", 0.6, "enemy"); g.ew.warn("b", 0.6, "gap"); calls.fr.length = 0; g.ew.draw(); assert.ok(calls.fr.length > 4);
    const XO = DEV[dev].XO;
    for (const [x, y, w, h] of calls.fr) {
      const sx0 = left + (x + sh - XO) * CS, sx1 = left + (x + w + sh - XO) * CS, sy0 = (y + sh + OYs) * CS, sy1 = (y + h + sh + OYs) * CS;
      assert.ok(sx0 >= x0 && sx1 <= x1 - 1, `${dev} x ${sx0.toFixed(1)}-${sx1.toFixed(1)}`); assert.ok(sy0 >= y0 && sy1 <= y1 + 0.5, `${dev} y ${sy0.toFixed(1)}-${sy1.toFixed(1)}`);
    }
  }
});
t("inert outside the lab: the site/Poki script defines the API but nothing calls ocTick/ocDraw/ocWant/edgeWarnDraw/edgeWarn; the lab script does", () => {
  const cnt = (s, f) => s.split(f + "(").length - 1;
  for (const f of ["ocTick", "ocDraw", "ocWant", "edgeWarnDraw"]) {
    assert.equal(cnt(SCRIPT, "function " + f), 1, f + " defined"); assert.equal(cnt(SCRIPT, f), 1, f + " never called in the site script");
    assert.equal(cnt(POKI, f), 1, f + " never called in the Poki script");
    assert.ok(cnt(LABS, f) >= 2, f + " hooked in the lab");
  }
});

// ---------------------------------------------------------------- run chaining (Playtest's Crusher lesson: no state leaks)
t("chained runs via the real start()/die(): reach L5 with carts + glows live, die, restart; first frame (draw-first OR update-first) and all of L1: no carts, no glows, no keys, no sfx", () => {
  const { g, calls } = game({ oc: true, seed: 9 }); g.ew.spy();
  const live = () => g.oc.C.filter((c) => c.a).length;
  for (let k = 0; k < 3; k++) {
    g.start();
    // first frame of the new run, both hook orders: the draw runs before any update (k even) or after one (k odd)
    calls.fr.length = 0; calls.sfx.length = 0;
    if (k % 2 === 0) { g.oc.draw(); assert.equal(live(), 0, `run ${k}: draw-first saw old carts`); assert.equal(g.ew.live(), 0); assert.equal(calls.fr.length, 0, "no stale glow drawn"); }
    g.update(1 / 240); assert.equal(live(), 0, `run ${k}: carts after the first step`); assert.equal(g.ew.live(), 0, `run ${k}: stale keys`);
    assert.equal(g.lv(), 1, "a new run is L1");
    // L1 (to 19.5 s): nothing at all
    let seenL1 = 0, ewL1 = 0;
    while (g.runS < 19.5) { g.inv = 1e9; calls.ew.length = 0; frame(g, 60); seenL1 += live(); ewL1 += g.ew.live() + calls.ew.length; }
    assert.equal(seenL1, 0, `run ${k}: carts on L1`); assert.equal(ewL1, 0, `run ${k}: warnings on L1`);
    assert.equal(calls.sfx.filter((s) => s[0] === "orecart").length, 0, `run ${k}: cart sfx on L1`);
    // on to L5 with a cart in flight and a glow up (gap glow too: edgeWarn from another caller), then die there
    let up = false;
    for (let f = 0; f < 200 * 60 && !up; f++) { g.inv = 1e9; g.ew.warn("gap7", 0.8, "gap", "right"); frame(g, 60); up = g.lv() === 5 && live() > 0 && g.ew.live() >= 2; }
    assert.ok(up, `run ${k}: reached L5 with a cart warning live`);
    g.inv = 0; g.die(); assert.equal(g.state, "over"); g.oc.draw(); assert.equal(g.ew.live(), 0, "death clears the glows");
  }
});
console.log(`orecart: ${pass} tests passed`);
