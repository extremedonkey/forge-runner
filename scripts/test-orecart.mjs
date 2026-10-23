// ORE CART (oncoming enemy) + EDGE WARN tests: evaluates the real state/sparks/levels/enemies-v2/flow/simulation fragments with
// 06i-orecart.js, 06j-edge-warn.js and the lab layer (src/client/lab/orecart.js, which stands in for the live hook lines), the
// same way test-enemies-v2.mjs does. Run: node scripts/test-orecart.mjs (also via npm test). Prints the fairness/warning tables.
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import EN from "../src/client/06g-enemies-v2.js";
import CR from "../src/client/06h-crusher.js";
import OC from "../src/client/06i-orecart.js";
import EW from "../src/client/06j-edge-warn.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LAB from "../src/client/lab/orecart.js";
import RENDER from "../src/client/14-render.js";
// the two live 14-render.js drawEnts() hook lines, taken verbatim from the real file (so the harness draws exactly what the game does)
const R14 = RENDER.slice(1, -1), DE = R14.slice(R14.indexOf("function drawEnts(){"), R14.indexOf("\nfunction drawGhost"));
const HOOK14 = DE.split("\n").filter((l) => /ocDraw\(\)|edgeWarnDraw\(\)/.test(l)).join("\n");
import { SCRIPT } from "../src/client/index.mjs";
import { buildPokiScript } from "../src/client/poki/script.mjs";
import { labScript } from "./build-lab.mjs";
const POKI = buildPokiScript(), LABS = await labScript("orecart");
const body = (f) => f.slice(1, -1);
const QUIET = process.argv.includes("--quiet");
let pass = 0;
const ONLY = process.env.OCONLY ? new RegExp(process.env.OCONLY) : null;
const t = (name, fn) => { if (ONLY && !ONLY.test(name)) return; fn(); pass++; console.log("ok   orecart:", name); };
const log = (...a) => { if (!QUIET) console.log(...a); };
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(Math.max(0, d), tm); return 0.05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };
const DEV = { desktop: { XO: 0, VW: 600, ZM: 1, CS: 1.3 }, portrait: { XO: 20, VW: 600 / 1.35, ZM: 1.35, CS: 390 / (600 / 1.35) } };
// screen geometry per real device (Mobile's measurements, main d6247d9): CSS px per unit, canvas left/top offset, OY, clear band
const SCREENS = {
  "390x844": { dev: "portrait", CS: 390 / (600 / 1.35), left: 0, top: 0, OY: 410, band: [370, 390, 360, 563] },
  "360x780": { dev: "portrait", CS: 0.81, left: 0, top: 0, OY: 411, band: [340, 360, 411 * 0.81, (411 + 232) * 0.81] },
  "412x915": { dev: "portrait", CS: 412 / (600 / 1.35), left: 0, top: 0, OY: 426, band: [392, 412, 426 * 412 / 444.44, (426 + 232) * 412 / 444.44] },
  "844x390": { dev: "desktop", CS: 1.3, left: 32, top: 0, OY: 0, band: [792, 811, 160, 302] },          // 811: Poki smears column 811-812
  "1280x720": { dev: "desktop", CS: 1280 / 600, left: 0, top: 40, OY: 0, band: [1280 - 33, 1279, 40 + 115 * 1280 / 600, 40 + 232 * 1280 / 600] },
};

// env: { oc: include 06i/06j + lab layer, seed, demo, level, felt (fixed felt world speed via a vMul() stub; 13's e.x line
// patched to use it like Dev's hook), sdFelt (spawnDist also at felt speed), god (base obstacles harmless; carts still hit),
// dev: "desktop"|"portrait" }
function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { sfx: [], ew: [], fr: [], ms: [], combo: [] };
  const d = DEV[env.dev || "desktop"], q = { level: env.level };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false,__god=${!!env.god};
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined?null:String(v)}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${d.XO},OY=0,OB=0,VW=${d.VW},ZM=${d.ZM},CS=${env.CS || d.CS},HS=1,K=1,SX=0,SY=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};
    var ctx={globalAlpha:1,fillStyle:"",fillRect:function(x,y,w,h){calls.fr.push([x,y,w,h,ctx.globalAlpha,ctx.fillStyle])},save:function(){},restore:function(){},translate:function(){},scale:function(){},rotate:function(){}};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){${HOOK14}}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}function sparks(){}function dust(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxReforge(){}
    function upShow(){}function upHide(){}function msOn(e){calls.ms.push(e)}
    function enemySfx(ty,ev){calls.sfx.push([ty,ev,runS])}function sfxCombo(n){calls.combo.push([n,runS,demo,state])}` +
    (env.felt ? `function vMul(){return ${env.felt}/speed}` : "") +
    (env.gapNull ? "function gapNear(){calls.gn=(calls.gn||0)+1;return null}" : "") +
    (env.gaps ? `function gapNear(a,b){calls.gn=(calls.gn||0)+1;var P=${env.gaps.period},Wd=${env.gaps.width},O=${env.gaps.off},A=a+scroll,B=b+scroll,k=Math.floor((A-O)/P);
      for(var j=k-1;j<=k+2;j++){var g0=O+j*P,g1=g0+Wd;if(g1>A&&g0<B)return {x0:g0-scroll,x1:g1-scroll}}return null}` : "");
  let sim = body(SIM);
  if (env.felt) {
    sim = sim.replace("e.x-=(speed+(e.vx||0))*dt;", "e.x-=(speed*(typeof vMul===\"function\"?vMul():1)+(e.vx||0))*dt;");
    if (env.sdFelt) sim = sim.replace("spawnDist+=speed*dt;", "spawnDist+=speed*vMul()*dt;");
  }
  if (env.god) sim = sim.replace("if(inv>0)continue;", "if(inv>0||__god)continue;");
  const api = `;return {get score(){return score},get speed(){return speed},set speed(v){speed=v},get state(){return state},set state(v){state=v},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},get vy(){return vy},get jb(){return jb},get runS(){return runS},get tt(){return tt},set tt(v){tt=v},get scroll(){return scroll},auto,
    ocOff:function(){ocPlace=function(){}},set inv(v){inv=v},set duck(v){duck=v},get duck(){return duck},set spT(v){spT=v},get spT(){return spT},get held(){return held},get shd(){return shd},set shd(v){shd=v},set spawnDist(v){spawnDist=v},set nextGap(v){nextGap=v},get nextGap(){return nextGap},get nt(){return nt},set SX(v){SX=v},set SY(v){SY=v},
    press,release,start,update,die,pW,PX,W,GY,lv:function(){return currentLevel()},get crS(){return typeof crS==="number"?crS:-1},get crPL(){return typeof crPL!=="undefined"?crPL:[]},
    wrapSpawn:function(fn){var o=spawn;spawn=function(){var n0=ents.length;o();fn(ents.slice(n0),tt,nt)}},
    ${env.oc ? `oc:{C:ocC,V:ocV,Vc:ocVc,TTI:ocTTI,vis:ocVis,solid:ocSolid,drawCart:ocDrawCart,draw:function(){drawEnts()},spy:function(){var n={tick:0,want:0,draw:0,ew:0},a=ocTick,b=ocWant,c=ocDraw,d=edgeWarnDraw;ocTick=function(){n.tick++;return a.apply(null,arguments)};ocWant=function(){n.want++;return b()};ocDraw=function(){n.draw++;return c()};edgeWarnDraw=function(){n.ew++;return d()};return n},OC_V:OC_V,OC_W:OC_W,OC_H:OC_H,OC_SP:OC_SP,OC_WARN:OC_WARN,OC_MINT:OC_MINT,OC_CLR:OC_CLR,
      want:ocWant,space:ocSpace,cnt:function(){return ocCnt},cb:function(){return {kk:ocK.filter(function(s){return s.k!==null}).length,cq:ocCQ,ck:ocCK}},cbSet:function(k,n){ocK[0].k=k;ocK[0].n=n;ocK[0].d=0},parts:function(){var o=[];for(var j=0;j<OC_NP;j++)if(ocPL[j]>0)o.push({x:ocPX[j],y:ocPY[j],vx:ocVX[j],fw:ocPF[j]});return o}},
    ew:{warn:edgeWarn,draw:edgeWarnDraw,clear:edgeWarnClear,live:edgeWarnLive,rect:edgeWarnRect,spy:function(){var o=edgeWarn;edgeWarn=function(k,a,b,c,d){calls.ew.push([k,a,runS]);return o(k,a,b,c,d)}}}` : "oc:null,ew:null"}}`;
  const src = pre + body(STATE) + body(SPARKS) + body(LEVELS) + body(EN) + (env.cr ? body(CR) : "") + (env.oc ? body(OC) + body(EW) : "") + body(FLOW) + sim + (env.oc ? body(LAB) : "") + api;
  const g = new Function("Math", "calls", src)(M, calls);
  calls.rn = () => rn;
  return { g, calls };
}

// one frame = n sub-steps (16-loop.js: <= 1/240 s each) + the draw (drawEnts = the real 14 hook lines: ocDraw + edgeWarnDraw)
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

// HOLD bots (Playtest's profiles): press at TTI <= 0.2 s (front to front; carts at closing speed) and HOLD to the apex (full
// height, 0.69 s airtime; 0.83 s with spring boots, JMUL 1.2). boots: spT kept up every frame. Never ducks.
function holdBot(boots) {
  return (g) => {
    if (boots) g.spT = 9;
    if (g.held && g.vy <= 0) g.release();
    if (g.state !== "run" || g.py !== 0 || g.jb > 0) return;
    const front = g.PX + g.pW(), V = g.oc.V();
    for (const c of g.oc.C) if (c.a) { const m = (c.x - front) / g.oc.Vc(); if (m > -0.05 && m <= 0.2) { g.press(); return; } }
    for (const e of g.ents) {
      if (e.t === "k" || e.t === "u" || e.t === "d" || e.t === "h" || (e.t === "f" && e.bot > 10)) continue;
      const m = (e.x - front) / (V + (e.vx || 0)); if (m > -0.05 && m <= 0.2) { g.press(); return; }
    }
  };
}
// a full run with carts; per cart: level at first sight, approach time, first visible time, contact time, hit/pass
function run(env, secs, fps, useBot = true) {
  const { g, calls } = game({ oc: true, ...env }); g.ew.spy(); g.start();
  const cs = new Map(), obsSeen = new WeakSet(), obs = []; let deaths = 0, frames = 0, gaps = 0;
  for (let f = 0; f < secs * fps && g.state === "run"; f++) {
    /* AIRBORNE check (Playtest's trap): at the first frame a cart is <= 0.2 s from contact, before the bot acts, the buggy must be
       on the ground (it can still jump it) */
    { const front = g.PX + g.pW(); for (const c of g.oc.C) if (c.a && !c.hit) { const tt = (c.x - front) / g.oc.Vc(); let r = cs.get(c.ph); if (r && r.air === undefined && tt <= 0.2) r.air = g.py > 0 ? 1 : 0; }
      /* the same check for the base obstacle right AFTER a cart (holding over the cart must not trap the next one) */
      const V = g.oc.V(); for (const e of g.ents) { if (e.t === "k" || e.t === "u" || e.t === "d" || e.t === "h" || (e.t === "f" && e.bot > 10) || obsSeen.has(e)) continue;
        const tt = (e.x - front) / (V + (e.vx || 0)); if (tt <= 0.2) { obsSeen.add(e); const lastC = Math.max(-1e9, ...[...cs.values()].filter((q) => q.contact !== null).map((q) => q.contact)); if (!g.ents.some((o) => o !== e && o.t === e.t && o.x < e.x && o.x > e.x - 110)) obs.push({ air: g.py > 0 ? 1 : 0, vy: Math.round(g.vy), afterCart: g.runS - lastC < 1.3 ? 1 : 0, dt: g.runS - lastC, t: e.t, x: Math.round(e.x), lj: g.lastJ, rs: g.runS }); } } }
    if (typeof useBot === "function") useBot(g); else if (useBot) bot(g);
    if (env.inv) g.inv = 1e9;
    calls.ew.length = 0;
    frame(g, fps); frames++;
    const warned = new Set(calls.ew.map((w) => w[0]));
    for (const c of g.oc.C) {
      if (!c.a && !c.hit) continue;
      let r = cs.get(c.ph); if (!r) { r = { air: undefined, lv: g.lv(), seen: g.runS, appr: null, vis: null, contact: null, hit: 0, passed: 0, gapFrames: 0 }; cs.set(c.ph, r); }
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
  return { g, calls, cs: [...cs.values()], deaths, gaps, frames, obs };
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
  assert.ok(carts >= 5, `carts appeared (${carts})`);
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
  assert.ok(nat.cs.length >= 4, `natural run carts ${nat.cs.length}`); for (const c of nat.cs) assert.ok(c.lv >= 2, "cart seen on L1 at " + c.seen);
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
      assert.equal(r.deaths, 0, `run ended at felt ${F} ${fps} fps L${L} seed ${seed}`);
    }
    assert.equal(dead, 0, `cart deaths at ${F}/${fps}`); assert.ok(n > 10, `carts at ${F}/${fps}: ${n}`); total += n;
    rows.push(`   ${F}   ${fps}   ${n}     ${dead}           ${mw.toFixed(3)}         ${mv.toFixed(3)}`);
  }
  log(rows.join("\n")); log(`   total carts jumped: ${total}`);
});

t("HOLD bots (Playtest's trap): full-hold and spring-boots jumpers are NEVER airborne 0.2 s before a cart's contact (nor before the base obstacle after it); 0 cart deaths", () => {
  const rows = ["   bot    felt  carts  airborne@0.2s  cart deaths  next obstacle airborne@0.2s (first of a cluster)"];
  for (const boots of [false, true]) for (const F of [340, 500, 650, 760, 800]) {
    let n = 0, air = 0, dead = 0, oa = 0, on = 0;
    for (const L of [2, 3, 4, 5]) for (const seed of [1, 2]) {
      const r = run({ seed, level: L, felt: F, god: true, sdFelt: seed === 2, dev: seed === 2 ? "portrait" : "desktop" }, 30, 60, holdBot(boots));
      for (const c of r.cs) if (c.contact !== null || c.hit) { n++; if (c.air) air++; if (c.hit) dead++; }
      for (const o of r.obs) if (o.afterCart) { on++; if (o.air) { oa++; if (process.env.OCDBG) console.log(JSON.stringify(o)); } }
    }
    assert.equal(air, 0, `${boots ? "boots" : "hold"} ${F}: airborne at TTI 0.2 for ${air}/${n} carts`); assert.equal(dead, 0, `${boots ? "boots" : "hold"} ${F}: cart deaths ${dead}`);
    assert.ok(n > 10); assert.equal(oa, 0, `${boots ? "boots" : "hold"} ${F}: airborne before the obstacle after a cart ${oa}/${on}`);
    rows.push(`   ${boots ? "boots" : "hold "}  ${F}   ${String(n).padEnd(5)}  ${String(air).padEnd(13)}  ${String(dead).padEnd(11)}  ${oa}/${on}`);
  }
  log(rows.join("\n"));
});
// ---------------------------------------------------------------- PLAYTEST BOTS (port of playtest/pr-85/harness-pr85/inject.js botStep)
// Same profiles and rules as Playtest's real-game harness, on sim time inside each 1/240 s sub-step, with its own seeded RNG (the
// game's Math.random stream is untouched): jump at tti <= 0.2 - err when grounded (no jump buffer), hold for the profile's time
// (perfect: to the apex), duck drones/low flyers; a crate cluster shares one decision; carts use the cart closing speed.
const PROF = { perfect: { err: () => 0, mis: 0, hold: null }, decent: { err: (r) => 0.02 * r.g(), mis: 0.05, hold: [0.25, 0.5] }, tapper: { err: () => 0, mis: 0, hold: [0.05, 0.05] } };
function botRng(seed) { let a = seed >>> 0; const u = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { u, rr: (x, y) => x + u() * (y - x), g: () => Math.sqrt(-2 * Math.log(u() + 1e-9)) * Math.cos(6.283 * u()) }; }
function ptBot(prof, seed) {
  const p = PROF[prof], R = botRng(seed), plan = new WeakMap(); let bt = 0, holdUntil = -1, duckOn = false;
  const mk = () => { const pl = { err: p.err(R), mis: R.u() < p.mis }; if (pl.mis) pl.err = (R.u() < 0.5 ? -1 : 1) * R.rr(0.15, 0.3); return pl; };
  const jump = (g) => { g.press(); holdUntil = p.hold ? bt + R.rr(p.hold[0], p.hold[1]) : -2; };
  return (g, dt) => {
    bt += dt; if (g.state !== "run") return;
    if (holdUntil > 0 && bt >= holdUntil) { holdUntil = -1; g.release(); }
    if (p.hold === null && holdUntil === -2 && g.vy <= 0) { holdUntil = -1; g.release(); }
    let wantDuck = false; const fr = g.PX + g.pW(), V = g.oc ? g.oc.V() : g.speed;
    for (const e of g.ents) {
      if (e.t === "u" || e.t === "k" || e.x + e.w < g.PX + 4 || (e.t === "b" && g.bigOn) || (e.t === "f" && e.bot >= 50)) continue;
      const tti = (e.x - fr) / (V + (e.vx || 0)); let pl = plan.get(e);
      if (!pl) { pl = mk(); plan.set(e, pl); for (const o of g.ents) if (o !== e && o.t === e.t && Math.abs(o.x - e.x) <= 102 && !plan.get(o)) plan.set(o, pl); }
      const duckT = e.t === "d" ? 0.4 : (e.t === "f" && e.bot === 18 ? 0.3 : -1);  /* like Playtest: the hammer drone is jumped */
      if (duckT > 0) { if (tti < duckT - pl.err && tti > -0.3) wantDuck = true; continue; }
      if (!pl.done && tti <= 0.2 - pl.err && g.py === 0 && !duckOn) { pl.done = 1; jump(g); }
    }
    if (g.oc) for (const c of g.oc.C) { if (!c.a || c.x + g.oc.OC_W < g.PX) continue; let pl = plan.get(c); if (!pl || pl.ph !== c.ph) { pl = mk(); pl.ph = c.ph; plan.set(c, pl); }
      if (!pl.done && g.oc.TTI(c) <= 0.2 - pl.err && g.py === 0 && !duckOn) { pl.done = 1; jump(g); } }
    for (const q of g.crPL) { if (!q.on || q.x + q.w < g.PX + 4) continue; let pl = plan.get(q); if (!pl || q.x > pl.lx) { pl = mk(); plan.set(q, pl); } pl.lx = q.x;  /* crusher plates (like Playtest's pr-76 bot) */
      if (!pl.done && (q.x - fr) / V <= 0.2 - pl.err && g.py === 0 && !duckOn) { pl.done = 1; jump(g); } }
    if (wantDuck && !duckOn && g.py === 0) { duckOn = true; g.duck = true; } else if (!wantDuck && duckOn) { duckOn = false; g.duck = false; }
  };
}
/* one real-game run (from score 0, no level floor, power-ups on): returns run seconds and what killed it */
function ptRun(prof, seed, cap, oc, boots, cr = true) {  /* cr: THE CRUSHER on (live on L5 since main #76) */
  const { g } = game({ oc: true, cr, seed, dev: seed % 2 ? "portrait" : "desktop" });
  if (!oc) g.ocOff(); const b = ptBot(prof, seed * 7919 + 1); g.start(); let byCart = 0, crMax = -1, crOverlap = 0;
  for (let f = 0; f < cap * 240 && g.state === "run"; f++) { if (boots) g.spT = 9; b(g, 1 / 240); g.update(1 / 240); if (f % 4 === 3) g.oc.draw();
    const s = g.crS; crMax = Math.max(crMax, s); if (s >= 1 && s <= 6 && g.oc.C.some((c) => c.a)) crOverlap++; }
  if (g.state !== "run") byCart = g.oc.C.some((c) => c.hit) ? 1 : 0;
  return { s: g.state === "run" ? cap : g.runS, dead: g.state !== "run", byCart, carts: g.oc.cnt(), crMax, crOverlap };
}
const med = (a) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
t("Playtest bots: perfect (full hold) reaches the 180 s cap 3/3 with carts (and with spring boots); decent median >= 120 s (cap 150); carts on vs off", () => {
  const rows = ["   bot (cap)            carts  runs  capped  median s  deaths (by cart)  carts placed (all runs)"];
  const cell = (prof, cap, oc, boots, seeds) => { const rs = seeds.map((sd) => ptRun(prof, sd, cap, oc, boots)); const r = { capped: rs.filter((x) => !x.dead).length, med: med(rs.map((x) => x.s)), dead: rs.filter((x) => x.dead).length, cart: rs.filter((x) => x.byCart).length, n: rs.length, carts: rs.reduce((a, x) => a + x.carts, 0) };
    rows.push(`   ${(prof + (boots ? "+boots" : "") + " (" + cap + ")").padEnd(20)} ${oc ? "on " : "off"}    ${String(r.n).padEnd(4)}  ${String(r.capped).padEnd(6)}  ${r.med.toFixed(1).padEnd(8)}  ${r.dead} (${r.cart})       ${r.carts}`); return r; };
  const S3 = [1, 2, 3], S10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const pOn = cell("perfect", 180, true, false, S3); cell("perfect", 180, false, false, S3);
  const bOn = cell("perfect", 180, true, true, S3); cell("perfect", 180, false, true, S3);
  cell("perfect", 180, true, false, S10); cell("perfect", 180, false, false, S10);
  const S30 = Array.from({ length: 30 }, (_, i) => i + 1);  /* decent: 30 seeds (its bot RNG forks once carts appear, so on/off differ by run-to-run noise) */
  const dOn = cell("decent", 150, true, false, S30); cell("decent", 150, false, false, S30);
  cell("tapper", 150, true, false, S3);
  log(rows.join("\n"));
  assert.equal(pOn.capped, 3, "perfect bot caps 3/3 with carts"); assert.equal(bOn.cart, 0, "boots: no cart deaths");
  assert.ok(dOn.med >= 120, `decent median ${dOn.med}`);
});
t("THE CRUSHER (06h, live on L5): no cart on track while the boss is on; perfect bot still caps 180 s 3/3 with carts + crusher", () => {
  const rs = [1, 2, 3].map((sd) => ptRun("perfect", sd, 180, true, false, true));
  log("   crusher+carts perfect 180: " + rs.map((r) => `${r.dead ? r.s.toFixed(1) + " s dead" : "capped"} carts ${r.carts} crS max ${r.crMax} overlap frames ${r.crOverlap}`).join("; "));
  for (const r of rs) { assert.equal(r.crOverlap, 0, "cart on track during the boss"); assert.ok(!r.dead, "perfect bot capped"); }
  assert.ok(rs.some((r) => r.crMax >= 6), "the boss fight happened in at least one run");
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
t("motion read: hot headlamp on the front (opaque, inside the box) + translucent beam ahead; sparks thrown FORWARD toward the buggy (faster than the cart) from a fixed pool, deterministic", () => {
  const { g, calls } = game({ oc: true }); g.start(); g.update(1 / 240);
  const c = { a: 1, x: 300, ph: 0 }; calls.fr.length = 0; g.oc.drawCart(c);
  const lamp = calls.fr.filter(([x, y, w, h, a, col]) => a >= 0.99 && col === "#fff7d6" && x <= 302 && y >= g.GY - 13 && y + h <= g.GY - 8);
  assert.ok(lamp.length >= 1, "white-hot headlamp core on the front");
  const beam = calls.fr.filter(([x, , w, , a]) => x + w <= 300 && a > 0 && a < 0.6);
  assert.ok(beam.length >= 4, "translucent beam ahead of the cart");
  const sim = (seed) => {
    const { g } = game({ oc: true, seed }); g.start(); g.update(1 / 240); g.spawnDist = -1e9; g.ents = [];
    const k = g.oc.C[0]; Object.assign(k, { a: 1, ar: 1, s1: 1, s2: 0, hit: 0, ph: 3 }); k.x = 420;
    let fw = 0, ahead = 0, maxN = 0;
    for (let f = 0; f < 18; f++) { g.inv = 1e9; g.spawnDist = -1e9; frame(g, 60); const ps = g.oc.parts(); maxN = Math.max(maxN, ps.length);
      for (const p of ps) if (p.fw) { fw++; assert.ok(p.vx < -g.oc.Vc(), "forward sparks outrun the cart"); if (p.x < k.x) ahead++; } }
    return { fw, ahead, maxN, sig: JSON.stringify(g.oc.parts().map((p) => [p.x.toFixed(3), p.y.toFixed(3)])) };
  };
  const a = sim(1), b = sim(2);
  assert.ok(a.fw > 10 && a.ahead > 10, `forward sparks ${a.fw}, ahead of the cart ${a.ahead}`); assert.ok(a.maxN <= 32, "fixed pool");
  assert.equal(a.sig, b.sig, "sparks are independent of the base RNG seed (time/cart-id hash only)");
});
// ---------------------------------------------------------------- GAPS (Dev's gapNear stub)
function gapRun(env, secs) {
  const { g, calls } = game({ oc: true, ...env }); g.start(); const seen = new Map();
  for (let f = 0; f < secs * 60 && g.state === "run"; f++) {
    g.inv = 1e9; frame(g, 60);
    for (const c of g.oc.C) if (c.a && !seen.has(c.ph)) seen.set(c.ph, { G: c.gx + g.scroll, V: g.oc.V(), lv: g.lv(), ar: c.ar });
    for (const c of g.oc.C) if (c.a && c.ar && seen.has(c.ph)) seen.get(c.ph).ar = 1;
  }
  return { g, calls, carts: [...seen.values()] };
}
t("gaps: with gapNear stubbed, no cart impact in a takeoff window (0.6 s before the lip / over it) or within 0.85 s after landing; L2-L3 never after a gap (2 s); from L4 carts may follow a gap", () => {
  const GP = { period: 2600, width: 140, off: 1500 }, rows = [];
  const gapsIn = (G0, G1) => { const out = []; for (let j = -2; j < 400; j++) { const g0 = GP.off + j * GP.period, g1 = g0 + GP.width; if (g1 > G0 && g0 < G1) out.push([g0, g1]); } return out; };
  for (const L of [2, 3, 4, 5]) {
    let n = 0, follow = 0, dropped = 0;
    for (const seed of [1, 2, 3]) {
      const r = gapRun({ seed, level: L, gaps: GP }, 60);
      assert.ok(r.calls.gn > 0, "gapNear consulted");
      for (const c of r.carts) {
        if (!c.ar) { dropped++; continue; }
        n++;
        const back = c.lv >= 4 ? 0.85 : 2, hit = gapsIn(c.G - c.V * back, c.G + c.V * 0.6);
        assert.equal(hit.length, 0, `L${c.lv} impact at ${c.G.toFixed(0)} vs gaps ${JSON.stringify(hit)}`);
        if (gapsIn(c.G - c.V * 2, c.G).length) follow++;
      }
    }
    assert.ok(n > 5, `L${L}: carts still placed between gaps (${n})`);
    if (L < 4) assert.equal(follow, 0, `L${L}: no cart follows a gap`); else assert.ok(follow > 0, `L${L}: carts may follow a gap (${follow})`);
    rows.push(`   L${L}: ${n} carts, ${follow} within 2 s after a gap (>= 0.85 s), ${dropped} placed-then-dropped`);
  }
  log(rows.join("\n"));
});
t("gaps: gapNear undefined vs gapNear always null -> identical cart timeline (behaviour unchanged without GAPS)", () => {
  const tl = (env) => { const r = gapRun({ seed: 4, level: 2, ...env }, 90); return JSON.stringify(r.carts.map((c) => c.G.toFixed(3))); };
  const a = tl({}), b = tl({ gapNull: true }); assert.ok(JSON.parse(a).length >= 4, a); assert.equal(a, b);
});
t("gaps: a gap appearing over a not-yet-announced cart's impact point drops that cart silently (no glow, no sfx)", () => {
  const { g, calls } = game({ oc: true, level: 4, gaps: { period: 1e9, width: 0, off: 1e12 } }); g.start(); g.update(1 / 240);
  g.spawnDist = -1e9; g.ents = []; const c = g.oc.C[0]; Object.assign(c, { a: 1, ar: 0, s1: 0, s2: 0, hit: 0, ph: 1 });
  c.x = g.PX + g.pW() + g.oc.Vc() * 1.5; c.gx = g.PX + g.pW() + g.oc.V() * 1.5;
  frame(g, 60); assert.equal(c.a, 1, "no gap: kept");
  const G = c.gx + g.scroll; const s2 = game({ oc: true, level: 4, gaps: { period: 1e9, width: 200, off: G - 100 } });
  s2.g.start(); s2.g.update(1 / 240); s2.g.spawnDist = -1e9; s2.g.ents = []; const d = s2.g.oc.C[0]; Object.assign(d, { a: 1, ar: 0, s1: 0, s2: 0, hit: 0, ph: 1 });
  d.x = s2.g.PX + s2.g.pW() + s2.g.oc.Vc() * 1.5; d.gx = s2.g.PX + s2.g.pW() + s2.g.oc.V() * 1.5;
  frame(s2.g, 60); assert.equal(d.a, 0, "gap over the impact point: dropped"); assert.equal(s2.calls.sfx.length, 0); assert.equal(s2.g.ew.live(), 0);
});
// ---------------------------------------------------------------- COMBO (Audio's sfxCombo)
function comboRun(env, secs, step) {
  const { g, calls } = game({ oc: true, god: true, ...env }); g.start(); const keys = new Map(); let fired = 0, shHits = 0;
  for (let f = 0; f < secs * 60 && g.state === "run"; f++) {
    if (step) shHits += step(g); else g.inv = 0;
    frame(g, 60);
    for (const c of g.oc.C) if (c.a && c.ck !== null && c.cl) keys.set(c.ph, c.ck);
  }
  return { g, calls, keys, shHits };
}
const CGAPS = { period: 2600, width: 140, off: 1500 };
t("combo: a clean gap-then-cart run from L4 -> sfxCombo(n) once (n = gap + carts cleared >= 2), never twice per run; none on L2-L3 or without gapNear", () => {
  const rows = [];
  for (const L of [4, 5]) {
    let n = 0, chains = 0;
    for (const seed of [1, 2, 3]) {
      const r = comboRun({ seed, level: L, gaps: CGAPS }, 60, (g) => { bot(g); return 0; });
      assert.equal(r.g.state, "run", "jump-only bot survives");
      chains += new Set(r.keys.values()).size;
      for (const [k, rs, dm, st] of r.calls.combo) { assert.ok(k >= 2, `n=${k}`); assert.equal(dm, false); assert.equal(st, "run"); }
      const at = r.calls.combo.map((c) => c[1]); assert.equal(new Set(at).size, at.length);
      assert.equal(r.calls.combo.length, new Set(r.keys.values()).size, "exactly one combo per gap-then-cart chain");
      n += r.calls.combo.length;
    }
    assert.ok(n > 3, `L${L}: combos fired (${n})`);
    rows.push(`   L${L}: ${n} combos for ${chains} gap-then-cart chains (3 x 60 s, jump-only bot)`);
  }
  for (const env of [{ level: 2, gaps: CGAPS }, { level: 3, gaps: CGAPS }, { level: 5 }, { level: 5, gapNull: true }]) {
    const r = comboRun({ seed: 2, ...env }, 60, (g) => { bot(g); return 0; });
    assert.equal(r.calls.combo.length, 0, JSON.stringify(env));
  }
  log(rows.join("\n"));
});
t("combo: not after a hit (shield absorbs the cart), not on death, not in demo; a repeat of the same chain key never fires again", () => {
  /* no jumping, shield refilled each frame: carts hit the shield -> chain dirty -> no combo */
  let hk = 0, hh = 0;
  for (const seed of [1, 2, 3, 4, 5]) { const h = comboRun({ seed, level: 5, gaps: CGAPS }, 60, (g) => { g.inv = 0; if (!g.shd) { g.shd = 1; return 1; } return 0; });
    hk += h.keys.size; hh += h.shHits; assert.equal(h.calls.combo.length, 0, "hit -> no combo"); }
  assert.ok(hk >= 1 && hh > 2, `combo carts ${hk}, shield hits ${hh}`);
  /* no jumping, no shield: the first combo cart ends the run -> no combo */
  const d = comboRun({ seed: 1, level: 5, gaps: CGAPS }, 60, (g) => { g.inv = 0; return 0; });
  assert.notEqual(d.g.state, "run"); assert.equal(d.calls.combo.length, 0, "death -> no combo");
  /* demo (autopilot jumps carts): never */
  const m = game({ oc: true, god: true, demo: true, level: 5, gaps: CGAPS, seed: 1 }); m.g.start(); let mk = 0;
  for (let f = 0; f < 60 * 60 && m.g.state === "run"; f++) { m.g.auto(); frame(m.g, 60); for (const c of m.g.oc.C) if (c.a && c.ck !== null) mk++; }
  assert.ok(mk > 0, "demo had combo carts"); assert.equal(m.calls.combo.length, 0, "demo -> no combo");
  /* repeat guard: re-queue the chain key that just fired -> nothing */
  const r = comboRun({ seed: 1, level: 5, gaps: CGAPS }, 60, (g) => { bot(g); return 0; });
  assert.ok(r.calls.combo.length > 0); const cb = r.g.oc.cb(); assert.notEqual(cb.ck, null);
  const n0 = r.calls.combo.length; r.g.oc.cbSet(cb.ck, 2); for (const c of r.g.oc.C) c.a = 0;
  frame(r.g, 60); frame(r.g, 60); assert.equal(r.calls.combo.length, n0, "same chain key -> never twice");
  /* pre-run / new run: a queued combo is dropped, keys cleared */
  r.g.die(); r.g.start(); frame(r.g, 60); const z = r.g.oc.cb(); assert.equal(z.cq, 0); assert.equal(z.ck, null); assert.equal(z.kk, 0);
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
// screen rects (CSS px) of everything edgeWarnDraw draws for one key, under shake sh; also the union bbox and chevron rects
function glowRects(nm, side, kind, sh = 0) {
  const S = SCREENS[nm], { g, calls } = game({ oc: true, dev: S.dev, CS: S.CS }); g.start(); g.update(1 / 240); g.SX = sh; g.SY = sh;
  g.ew.warn("a", 0.6, kind, side); calls.fr.length = 0; g.ew.draw();
  const XO = DEV[S.dev].XO;
  const rs = calls.fr.map(([x, y, w, h, a, c]) => ({ x0: S.left + (x + sh - XO) * S.CS, x1: S.left + (x + w + sh - XO) * S.CS, y0: S.top + (y + sh + S.OY) * S.CS, y1: S.top + (y + h + sh + S.OY) * S.CS, a, c }));
  const bb = rs.reduce((b, r) => ({ x0: Math.min(b.x0, r.x0), x1: Math.max(b.x1, r.x1), y0: Math.min(b.y0, r.y0), y1: Math.max(b.y1, r.y1) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
  const chev = rs.filter((r) => r.c === "#ffffff");
  const cb = chev.reduce((b, r) => ({ y0: Math.min(b.y0, r.y0), y1: Math.max(b.y1, r.y1), x0: Math.min(b.x0, r.x0), x1: Math.max(b.x1, r.x1) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
  return { rs, bb, cb, S };
}
t("edge glow placement: right side inside Mobile's clear bands (390x844 x 370-390 y 360-563; 844x390 x 792-811 y 160-302), all phones + desktop, shake-proof; left side mirrored and clear of the top-left HUD", () => {
  const rows = ["   screen     side  glow rect (CSS px)               chevron (CSS px)"];
  for (const nm of Object.keys(SCREENS)) for (const sh of [0, 2.4, -2.4]) for (const kind of ["enemy", "gap"]) {
    const { rs, bb, cb, S } = glowRects(nm, "right", kind, sh), [x0, x1, y0, y1] = S.band, e = 0.01;
    assert.ok(rs.length > 10);
    assert.ok(bb.x0 >= x0 - e && bb.x1 <= x1 + e, `${nm} ${kind} x ${bb.x0.toFixed(1)}-${bb.x1.toFixed(1)}`);
    assert.ok(bb.y0 >= y0 - e && bb.y1 <= y1 + 0.5, `${nm} ${kind} y ${bb.y0.toFixed(1)}-${bb.y1.toFixed(1)}`);
    if (sh === 0 && kind === "enemy") rows.push(`   ${nm.padEnd(9)}  R     x ${bb.x0.toFixed(1)}-${bb.x1.toFixed(1)}, y ${bb.y0.toFixed(1)}-${bb.y1.toFixed(1)}   x ${cb.x0.toFixed(1)}-${cb.x1.toFixed(1)}, y ${cb.y0.toFixed(1)}-${cb.y1.toFixed(1)}`);
    // left: the mirror image against the left edge (Poki's first column kept clear in landscape), never up in the HUD rows
    const l = glowRects(nm, "left", kind, sh), W = S.band[1] - S.band[0], lx0 = nm.includes("x844") || nm === "1280x720" ? S.left + 1 : S.left;
    assert.ok(l.bb.x0 >= (S.dev === "portrait" ? S.left : lx0) - e && l.bb.x1 <= S.left + W + 1 + e, `${nm} left x ${l.bb.x0.toFixed(1)}-${l.bb.x1.toFixed(1)}`);
    assert.ok(Math.abs((l.bb.y0 - bb.y0)) < 0.01 && Math.abs(l.bb.y1 - bb.y1) < 0.01, "same height as the right side");
    const hudBottom = S.dev === "portrait" ? 140 + S.top : 56 + S.top;   // Poki portrait mute/pause end at y 140; landscape at 56
    assert.ok(l.bb.y0 > hudBottom, `${nm} left glow clear of the top-left HUD (${l.bb.y0.toFixed(0)} > ${hudBottom})`);
    if (sh === 0 && kind === "enemy") rows.push(`   ${nm.padEnd(9)}  L     x ${l.bb.x0.toFixed(1)}-${l.bb.x1.toFixed(1)}, y ${l.bb.y0.toFixed(1)}-${l.bb.y1.toFixed(1)}`);
  }
  log(rows.join("\n"));
});
t("edge glow size at 390x844: band >= 18 x 100 CSS px (20 x ~150), '<<' >= 12 CSS px tall at track height; >= 18 x 100 on 360x780 / 412x915 too", () => {
  for (const nm of ["390x844", "360x780", "412x915"]) {
    const { bb, cb, S } = glowRects(nm, "right", "enemy");
    assert.ok(bb.x1 - bb.x0 >= 18 && bb.y1 - bb.y0 >= 100, `${nm} glow ${(bb.x1 - bb.x0).toFixed(1)}x${(bb.y1 - bb.y0).toFixed(1)}`);
    assert.ok(bb.y1 - bb.y0 <= 160 + 1, `${nm} glow <= ~160 px tall`);
    assert.ok(cb.y1 - cb.y0 >= 12, `${nm} chevron ${(cb.y1 - cb.y0).toFixed(1)} px tall`);
    const ground = S.top + (232 + S.OY) * S.CS, cart = ground - 26 * S.CS;   // the cart spans ground-26u .. ground
    assert.ok(cb.y0 < ground && cb.y1 > cart, `${nm} chevron at the cart's track height`);
    if (nm === "390x844") { assert.ok(bb.x1 - bb.x0 >= 19.9, "full 20 px band"); log(`   390x844: glow ${(bb.x1 - bb.x0).toFixed(1)}x${(bb.y1 - bb.y0).toFixed(1)} CSS px, '<<' ${(cb.x1 - cb.x0).toFixed(1)}x${(cb.y1 - cb.y0).toFixed(1)}`); }
  }
  // two chevrons (a double '<<'): white strokes in two separate x clusters
  const { rs } = glowRects("390x844", "right", "enemy"); const xs = [...new Set(rs.filter((r) => r.c === "#ffffff").map((r) => Math.round(r.x0)))].sort((a, b) => a - b);
  assert.ok(xs[xs.length - 1] - xs[0] > 8, "double chevron spans the band");
});
t("chevron readability (Playtest #85): portrait '<<' 20-24 CSS px tall, white core off the bright edge strip (>= 1/6 band in), 2 px dark outline round every stroke, cyan inner-edge line", () => {
  for (const nm of ["390x844", "360x780", "412x915", "844x390"]) for (const side of ["right", "left"]) {
    const { rs, bb, cb, S } = glowRects(nm, side, "enemy"), tall = S.dev === "portrait", h = cb.y1 - cb.y0;
    if (tall) assert.ok(h >= 20 - 0.01 && h <= 24 + 0.01, `${nm} chevron ${h.toFixed(1)} px`); else assert.ok(h >= 16, `${nm} chevron ${h.toFixed(1)}`);
    const strip = (bb.x1 - bb.x0) / 6, edgeGap = side === "right" ? bb.x1 - cb.x1 : cb.x0 - bb.x0;
    assert.ok(edgeGap >= strip - 0.01, `${nm} ${side}: core ${edgeGap.toFixed(2)} px from the edge (strip ${strip.toFixed(2)})`);
    const core = rs.filter((r) => r.c === "#ffffff"), dark = rs.filter((r) => r.c === "#05070d" && r.y1 - r.y0 < 20);
    assert.equal(dark.length, core.length, "one outline square per core square");
    for (let i = 0; i < core.length; i++) { const c = core[i], d = dark[i]; assert.ok(Math.abs((c.x0 - d.x0) - 2) < 0.01 && Math.abs((d.x1 - c.x1) - 2) < 0.01 && Math.abs((c.y0 - d.y0) - 2) < 0.01, `${nm}: 2 px outline`); }
    assert.ok(rs.some((r) => r.c === "#22d3ee" && r.y1 - r.y0 > 100 && r.x1 - r.x0 >= 1.49) && rs.some((r) => r.c === "#05070d" && r.y1 - r.y0 > 100), `${nm}: dark + cyan inner-edge line`);
  }
});
t("edge glow: hot gradient fades in from the edge (alpha rises toward the edge); pulse rate rises as tti falls", () => {
  const S = SCREENS["390x844"], { g, calls } = game({ oc: true, dev: "portrait", CS: S.CS }); g.start(); g.update(1 / 240);
  g.ew.warn("a", 0.6, "enemy"); calls.fr.length = 0; g.tt = 1.234; g.ew.draw();
  const cols = calls.fr.filter((r) => r[5] !== "#ffffff" && r[5] !== "#05070d" && r[5] !== "#22d3ee").slice(0, 18);
  const byX = {}; for (const [x, , , , a] of cols) byX[x.toFixed(2)] = Math.max(byX[x.toFixed(2)] || 0, a);
  const xs = Object.keys(byX).map(Number).sort((a, b) => a - b); assert.equal(xs.length, 6);
  for (let i = 1; i < xs.length; i++) assert.ok(byX[xs[i].toFixed(2)] > byX[xs[i - 1].toFixed(2)], "alpha rises toward the right edge");
  // pulse rate = d(phase)/dt with tti falling 1:1 with time: 6 + 4/(tti+.2)^2
  const rate = (tti) => 6 + 4 / (tti + 0.2) ** 2; assert.ok(rate(0.3) > 2 * rate(1.1));
  const src = body(EW); assert.ok(/function ewPulse\(t,tti\)\{return \.6\+\.4\*Math\.abs\(Math\.sin\(6\*t\+4\/\(Math\.max\(0,tti\)\+\.2\)\)\)\}/.test(src), "pulse formula");
});
t("live hooks: each of ocTick/ocWant/ocDraw/edgeWarnDraw is called exactly once (defined once, one call site) in the site, Poki and lab scripts; lab adds none (Poki: no ocWant call, no autopilot)", () => {
  const cnt = (s, f) => s.split(f + "(").length - 1;
  for (const f of ["ocTick", "ocWant", "ocDraw", "edgeWarnDraw"]) for (const [nm, src] of [["site", SCRIPT], ["poki", POKI], ["lab", LABS]]) {
    assert.equal(cnt(src, "function " + f), 1, `${nm}: ${f} defined once`); assert.equal(cnt(src, f), nm === "poki" && f === "ocWant" ? 1 : 2, `${nm}: ${f} has exactly one call site (Poki has no autopilot: auto() is stripped, so ocWant is never called there)`);
  }
  assert.ok(!/ocTick|ocDraw|edgeWarnDraw|ocWant/.test(body(LAB).replace(/\/\*[\s\S]*?\*\//g, "")), "the lab layer calls no hook");
});
t("live hooks at run time: per update() step ocTick runs once, per auto() ocWant once, per drawEnts() ocDraw + edgeWarnDraw once (real 13 + the real 14 lines + lab layer)", () => {
  const { g } = game({ oc: true, level: 3, demo: true }); g.start(); const n = g.oc.spy();
  for (let f = 0; f < 600; f++) { const a = { ...n }; g.update(1 / 240); assert.equal(n.tick - a.tick, g.state === "run" ? 1 : 0); assert.equal(n.want - a.want, g.state === "run" ? 1 : 0, "demo: auto() once per step -> ocWant once"); const b = { ...n }; g.oc.draw(); assert.equal(n.draw - b.draw, 1); assert.equal(n.ew - b.ew, 1); }
  assert.ok(n.tick >= 590);
});
t("pinned lines: 13-simulation.js speed/scroll/runT/score lines byte-identical to main d6247d9", () => {
  const pin = ["    speed=Math.min(MAXV,speed+7*dt);", "    scroll+=speed*dt;", "    runT+=speed*dt/34;", "    score=Math.min(99999,score+speed*dt*.05);", "    spawnDist+=speed*dt;", "      e.x-=(speed+(e.vx||0))*dt;"];
  const lines = body(SIM).split("\n"); for (const l of pin) assert.equal(lines.filter((x) => x === l).length, 1, l);
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
