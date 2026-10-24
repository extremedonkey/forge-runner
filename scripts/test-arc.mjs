// ARC STRIKES (L6 ARC FURNACE, src/client/06n-arc-strikes.js) sim suite. Evaluates the REAL state / sparks / levels / enemies /
// rescue / crusher / hills / ore cart / edge warn / chaser / gaps / fork / arc strikes / flow / simulation fragments in
// index.mjs order (stubbed DOM / audio / canvas, a seeded Math.random that counts draws), steps them like 16-loop.js
// (<= 1/240 s update() sub-steps + lvTick per frame) and checks spec section 9 cases a-k for section 4.
// Run: node scripts/test-arc.mjs (QUICK: a balanced slice of the bot matrix, < 60 s) or FULL=1 node scripts/test-arc.mjs (the
// whole matrix: 2 fps x 3 felt speeds x 2 viewports x 4 strike bots x boots on/off, longer and more natural runs).
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { SCRIPT } from "../src/client/index.mjs";
import { buildPokiScript, POKI_FORBIDDEN } from "../src/client/poki/script.mjs";
import { labScript } from "./build-lab.mjs";

const imp = async (f) => (await import(new URL(`../src/client/${f}`, import.meta.url))).default;
const F = {};
for (const [k, f] of [["STATE", "06-state.js"], ["SPARKS", "06b-sparks.js"], ["LEVELS", "06d-levels.js"], ["EN", "06g-enemies-v2.js"], ["RESCUE", "06h-rescue.js"],
  ["CR", "06h-crusher.js"], ["HILLS", "06i-hills.js"], ["OC", "06i-orecart.js"], ["EW", "06j-edge-warn.js"], ["RL", "06m-chaser.js"], ["GAPS", "06k-gaps.js"],
  ["FORK", "06l-fork.js"], ["AZ", "06n-arc-strikes.js"], ["FLOW", "11-gameflow.js"], ["SIM", "13-simulation.js"], ["RENDER", "14-render.js"], ["LAB", "lab/arc.js"]]) F[k] = await imp(f);
const body = (f) => f.slice(1, -1);
const FULL = !!process.env.FULL;
const MAIN = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());  // importable (scratch tooling) without running; [\\/]: Windows paths too
let pass = 0;
const T0 = Date.now();
const t = (name, fn) => { if (!MAIN) return; const t1 = Date.now(); fn(); pass++; console.log(`ok   arc: ${name} (${((Date.now() - t1) / 1000).toFixed(1)} s)`); };
const log = (...a) => { if (MAIN) console.log(...a); };
const nFor = (d) => { const tm = (760 - 340) / 7, a = Math.min(d, tm); return .05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, d - tm)); };  // server ceiling (test-lb-dur maxScoreFor)

// viewports: desktop / landscape 600x300 and 390x844 portrait (web portrait zoom PZW 1.12, camera PXO 44; OY from 10-layout fit())
export const DEV = { desktop: { XO: 0, VW: 600, ZM: 1, CS: 1.3, OY: 0 }, portrait: { XO: 44, VW: 600 / 1.12, ZM: 1.12, CS: 390 * 1.12 / 600, OY: 636 } };

// env: { seed, level, demo, dev, rm, az (false = without 06n: the A/B leaderboard runs), q: extra ?params, tune: source run after
// the fragments (e.g. "CR_THIN=0;"), vmul: constant vMul() override (felt = speed x vmul), noEnemySfx: no enemySfx defined (the
// music unit's EN_MAP.arc may be absent), lab: append the lab layer }
export function game(env = {}) {
  let seed = env.seed || 1, rn = 0;
  const M = Object.create(Math); M.random = () => { rn++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const calls = { sfx: [], combo: 0, txt: [], fr: [], arcs: 0, rec: false, now: () => performance.now() };
  const d = DEV[env.dev || "desktop"], q = { level: env.level, ...(env.q || {}) };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false;
    var Q={get:function(k){var v=${JSON.stringify(q)}[k];return v===undefined||v===null?null:String(v)}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=${d.XO},OY=${d.OY},OB=0,VW=${d.VW},ZM=${d.ZM},CS=${d.CS},HS=${d.ZM > 1 ? 1.5 / d.ZM : 1},K=1,SX=0,SY=0;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0,MONO="m",SANS="s";var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    var __rm=${!!env.rm};function rm(){return __rm}
    var ctx={globalAlpha:1,fillStyle:"",fillRect:function(x,y,w,h){if(calls.rec)calls.fr.push([x,y,w,h,ctx.globalAlpha,ctx.fillStyle])},beginPath:function(){if(calls.rec)calls.fr.push(["path"])},
      arc:function(){if(calls.rec)calls.arcs++},fill:function(){},save:function(){},restore:function(){},translate:function(){},scale:function(){},rotate:function(){},setTransform:function(){},drawImage:function(){}};
    function txt(s,x,y,px,c,al,mo,bo,st,gl,id){if(calls.rec)calls.txt.push([s,x,y,px,c,id,runS]);return 10}function fitPx(s,p){return p}function base(){}
    function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}function spr(){}function drawEnts(){}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}function sfxReboot(){}function sfxReforge(){}
    function upShow(){}function upHide(){}function msOn(e){}function sfxAir(){}function sfxGapFall(){}function sfxNearMiss(){}function sfxPlatLand(){}function sfxSwell(){}
    function sfxCombo(n){calls.combo++}function bossMusic(on){}function levelSting(){}function musicLevel(){}
    ${env.noEnemySfx ? "" : "function enemySfx(ty,ev){calls.sfx.push([ty,ev,runS,demo]);return false}"}`;
  const AZAPI = env.az === false ? "null" : `{P:azP,get L6(){return azL6},get last(){return azLast},get hn(){return azHn},get cnt(){return azCnt},TTI:azTTI,V:azV,Vp:azVp,Vl:azVl,on:azOn,boss:azBoss,
      draw:function(){azDraw()},PL:azPL,PXs:azPX,PYs:azPY,PA:azPA,get ON(){return AZ_ON},set ON(v){AZ_ON=v},
      wrapHit:function(fn){var o=azHit;azHit=function(p,pw,ph,pt){fn(p,pw,ph,pt);return o(p,pw,ph,pt)}},
      wrapGap:function(fn){var o=azGap;azGap=function(){var c0=azCnt,s={V:azVp(),vl:azVl(),pw:pW(),ng:nextGap,sd:spawnDist,nt:nt,hsc:hsc,spT:spT,runS:runS,gb:typeof lvGapsBlocked==="function"&&lvGapsBlocked(),boss:azBoss(),slow:typeof rsSlowT==="number"&&rsSlowT>0,
        ents:ents.map(function(e){return {x:e.x,w:e.w,t:e.t,vx:e.vx||0,k:e.k,sk:e.sk,v:e.v,ax:e.ax,fk:e.fk,bot:e.bot}})},r=o();
        fn(r,azCnt>c0?azP.filter(function(p){return p.a&&p.id===azCnt-1})[0]:null,s);return r}},
      get wk(){return azWk},
      fair:function(wm,ts,V,vl){for(var i=0;i<AZ_FMN;i++)azFM[i]=0;azS0k=0;var w=azWk,C=wm-hsc-V*ts;azWk=-1e12;
        var r=azFairI(0,ts,C,V,vl,0)&&azFairI(0,ts,C,V,vl,1);azWk=w;return r},
      C:{CLR:AZ_CLR,DW:AZ_DW,VIS:AZ_VIS,GLOW:AZ_GLOW,L1:AZ_L1,L2:AZ_L2,L3:AZ_L3,LB:AZ_LB,LA:AZ_LA,DBL:AZ_DBL,WARN:AZ_WARN,MINT:AZ_MINT,G:AZ_G,PB:AZ_PB,SP:AZ_SP,P:AZ_P,PD:AZ_PD,XS:AZ_XS,
        AIR:AZ_AIR,AIRB:AZ_AIRB,BS:AZ_BS,GND:AZ_GND,CUE:AZ_CUE,M:AZ_M,DK:AZ_DK,GM:AZ_GM,STK:AZ_STK,PST:AZ_PST,GLAND:AZ_GLAND,GTO:AZ_GTO,DECK:AZ_DECK,TT:AZ_TT,TH:AZ_TH,TTB:AZ_TTB,THB:AZ_THB,FM:AZ_FM,FH:AZ_FH,
        HINT:AZ_HINT,N:AZ_N,NP:AZ_NP,KN:AZ_KN,SD:AZ_SD,DF:AZ_DF,DC:AZ_DC,WB:AZ_WB}}`;
  const api = `;var lvDraw=function(){},enDrawAfter=function(){};return {
    step:function(dt){update(dt);typeof lvTick==="function"&&lvTick(dt)},
    frame:function(fps,dr){var n=Math.max(1,Math.ceil(240/fps-1e-6));for(var i=0;i<n;i++)update(1/fps/n);lvTick(1/fps);if(dr){${env.az === false ? "" : "azDraw();"}edgeWarnDraw()}},
    start:start,press:press,release:release,die:function(){die()},update:update,lvTick:lvTick,
    get state(){return state},set state(v){state=v},get runS(){return runS},get score(){return score},set score(v){score=v},get speed(){return speed},set speed(v){speed=v},
    get py(){return py},set py(v){py=v},get vy(){return vy},set vy(v){vy=v},get held(){return held},get jb(){return jb},get ents(){return ents},set ents(v){ents=v},
    get spT(){return spT},set spT(v){spT=v},get inv(){return inv},set inv(v){inv=v},get cores(){return cores},set cores(v){cores=v},get shd(){return shd},set shd(v){shd=v},set shdP(v){shdP=v},
    get hsc(){return hsc},get tt(){return tt},PX:PX,PW:PW,GY:GY,W:W,JV:JV,CUT:CUT,JMUL:JMUL,pW:pW,big:big,wv:function(){return speed*vMul()},
    get spawnDist(){return spawnDist},set spawnDist(v){spawnDist=v},get nextGap(){return nextGap},get nt(){return nt},
    lvl:function(){return currentLevel()},gb:function(){return lvGapsBlocked()},gpAuto:gpAuto,ocWant:ocWant,srWant:srWant,
    get hlCr(){return hlCr},get hlJ(){return hlJ},get hlOn(){return hlOn},hlCurve:function(x){return hlCurve(x)},hlH:function(x){return hlH(x)},gapNear:gapNear,platNear:platNear,HL:HL,G:G,
    get gaps(){return gpLog},get decks(){return fkLog},
    az:${AZAPI},
    oc:{C:ocC,W:OC_W},rl:{C:srC,W:SR_W},cr:{get s(){return crS},set s(v){crS=v},get L5(){return crL5},set L5(v){crL5=v},get I(){return crI},set I(v){crI=v}},
    ev:function(s){return eval(s)},set rm(v){__rm=v}}`;
  const parts = [pre, F.STATE, F.SPARKS, F.LEVELS, F.EN, F.RESCUE, F.CR, F.HILLS, F.OC, F.EW, F.RL, F.GAPS, F.FORK].map((f, i) => i ? body(f) : f);
  if (env.az !== false) parts.push(body(F.AZ));
  parts.push(body(F.FLOW), body(F.SIM));
  if (env.lab) parts.push(body(F.LAB));
  if (env.vmul) parts.push(`;vMul=function(){return ${env.vmul}};`);
  if (env.tune) parts.push(";" + env.tune);
  parts.push(api);
  const g = new Function("Math", "calls", parts.join("\n"))(M, calls);
  calls.rn = () => rn;
  return { g, calls };
}

// ---------------------------------------------------------------- bots
// The fairness promise (06n header, AZ_TT / AZ_TH / AZ_TTB / AZ_THB): every press at these times to strike (s, azTTI at the press)
// clears the sheet on any ground, with or without spring boots: the flat-ground windows (tap .025-.333 s, held .013-.613 s on the
// 1/240 s grid) less a sub-step of slack. Literal here, so narrowing the promise in 06n fails the bots and the audit.
export const PROMISE = { tap: [0.03, 0.325], hold: [0.03, 0.6] };
// Base obstacles: a jump-only autopilot with auto()'s jump logic (13-simulation.js auto(); demo turns strikes off, so it is
// copied, not called): jump an obstacle 0.2 s before contact, hold to the apex, jump each gap with 06k's gpAuto, carts / rollers
// with their own want functions, never duck (drones / mid flyers pass under inv). Strikes: "tap3" / "hold3" = press on lamp 3 (tap
// = release in the same frame, hold = to the apex); "rtap" / "rhold" = press at a time to strike drawn uniformly in PROMISE.tap /
// PROMISE.hold (seeded, per strike; the draw starts a frame above the range: the press comes on the first frame at or below it,
// up to 1/fps s later); "etap" / "ehold" = press at the EARLIEST time the promise allows (the first frame with time to
// strike <= PROMISE.tap[1] / .hold[1] at which the buggy can take the jump: grounded or floating off a crest); "idle" = never
// presses for a strike. A random press planned while the buggy is in the air comes on landing (as a player's would: a press in the
// air is only buffered for 0.12 s, so a double's second mark can come up before the first jump is down); lamp 3 presses come when
// the lamp lights. log (optional): [time to strike] of each press.
export function bot(g, mode, seed = 7, log = null, fps = 240) {
  let s = seed >>> 0 || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let edge = 0; if (mode.includes("@")) { edge = +mode.split("@")[1]; mode = mode.split("@")[0]; }   // "etap@.345": a custom edge (controls)
  const done = new Set(), want = new Map();
  let holding = false, up = false;
  return () => {
    if (g.state !== "run") { holding = false; return; }
    let jump = false, strike = false, tapNow = false;
    const pw = g.pW(), wv = g.wv();
    for (const e of g.ents) {
      if (e.x + e.w < g.PX + 4) continue;
      if (e.t === "u" || e.t === "k" || (e.t === "b" && g.big())) continue;
      if (e.t === "d" || e.t === "h" || (e.t === "f" && (e.bot >= 50 || e.bot === 18))) continue;
      if (e.x - (g.PX + pw) > (wv + (e.vx || 0)) * 0.2) continue;
      jump = true;
    }
    if (g.ocWant() || g.srWant() || g.gpAuto()) jump = true;
    const canJump = (g.py === 0 || (g.hlCr && !g.hlJ)) && g.jb <= 0;
    if (g.az && mode !== "idle") for (const p of g.az.P) {
      if (!p.a || p.k >= p.n) continue;
      const key = p.id * 4 + p.k;
      if (done.has(key)) continue;
      let go;
      const tap = mode === "tap3" || mode === "rtap" || mode === "etap", R = tap ? PROMISE.tap : PROMISE.hold;
      if (mode === "tap3" || mode === "hold3") go = p.c >= 3;
      else if (mode === "etap" || mode === "ehold") go = canJump && !holding && g.az.TTI(p) <= (edge || R[1]);
      else { if (!want.has(key)) want.set(key, R[0] + 1 / fps + (R[1] - R[0] - 1 / fps) * rnd()); go = canJump && !holding && g.az.TTI(p) <= want.get(key); }
      if (go) { done.add(key); strike = true; if (tap) tapNow = true; if (log) log.push(g.az.TTI(p)); }
    }
    // airborne at a lamp 3 press: pressed anyway (13's 0.12 s jump buffer may still take it); a hold is kept until the jump it
    // started has reached its apex
    if (strike) { g.press(); if (tapNow) { g.release(); holding = false; } else { holding = true; up = false; } return; }
    if (holding) {
      if (g.vy > 0) up = true;
      if (up && g.vy <= 0) { g.release(); holding = false; }
      else if (!up && g.jb <= 0 && g.py === 0) { g.release(); holding = false; }  // the buffered press expired: no jump came of it
      return;
    }
    if (jump && (g.py === 0 || (g.hlCr && !g.hlJ)) && g.jb <= 0) { g.press(); holding = true; up = false; }
  };
}

// one run: ?level=6 (fast: speed = MAXV at the start, like the lab's ?fast=1; l6terrain: the world starts 100000 px in, where a
// natural run is at L6, so the hills are full L6 size) or a natural run (level undefined). inv protects from base obstacles and
// Spare Cores keep a gap fall from ending the run; would-be strike hits are counted by wrapping azHit (before its inv check).
export function run(env, secs, opt = {}) {
  const fps = opt.fps || 240, { g, calls } = game(env), presses = [], b = bot(g, opt.mode || "tap3", opt.botSeed || 7, presses, fps);
  const hits = [], strikes = [], plates = new Map(), books = [], cancelled = [], work = []; let deaths = 0, l6 = null;
  g.az.wrapHit((p) => { hits.push({ id: p.id, k: p.k, runS: g.runS, py: g.py }); });
  // phase: literal 20 s (spec section 2: phase A = the first 20 s of L6, singles only), not the constant under test; work: azGap's
  // work units (azWk) after each call (a call that returned before its candidate loop leaves the previous value: no larger)
  g.az.wrapGap((r, p, s) => { work.push(g.az.wk); if (p) { const rec = { id: p.id, n: p.n, at: g.runS, add: r, ph: g.runS - g.az.L6 >= 20 ? 1 : 0, ann: 0, k: 0, ts: [], done: 0,
    m1: p.m1, m2: p.m2, x0: p.x0, x1: p.x1, la: p.la, s, ter: terrain(g, p, s) }; plates.set(p.id, rec); books.push(rec); } if (opt.onGap) opt.onGap(g, r, p, s); });
  g.start(); if (opt.fast) g.speed = 760; if (opt.l6terrain) g.ev("hsc=100000;hlSeg=[];hlFill()");
  for (let f = 0; f < secs * fps; f++) {
    if (!opt.noInv) { g.inv = 1e9; g.cores = 99; } if (opt.boots) g.spT = 1e9;
    if (opt.pre) opt.pre(g, f);
    b();
    g.frame(fps, !!opt.draw);
    if (g.state !== "run") { deaths++; if (opt.noRestart) break; g.start(); if (opt.fast) g.speed = 760; continue; }
    if (l6 === null && g.lvl() >= 6) l6 = g.runS;
    const live = new Set();
    for (const p of g.az.P) if (p.a) { live.add(p.id); const r = plates.get(p.id); if (!r) continue; if (p.ar) r.ann = 1;
      if (p.k > r.k) { r.k = p.k; r.ts.push(p.st); strikes.push({ id: p.id, k: p.k, runS: p.st, lv: g.lvl() }); if (opt.onStrike) opt.onStrike(g, p, r); } }
    for (const r of plates.values()) if (!r.done && !live.has(r.id)) { r.done = 1; if (r.k < r.n) cancelled.push(r); }
    if (opt.post) opt.post(g, f);
  }
  return { g, calls, hits, strikes, plates, books, cancelled, deaths, l6, presses, work };
}

// the terrain under a plate as it was at booking (hlCurve also depends on fork decks / the crusher arena, which change later):
// 1 px samples from 640 px before mark 1 to 120 px after the last mark (null without hills)
function terrain(g, p, s) {
  if (!g.hlOn) return null;
  const x0 = Math.floor(s.hsc + p.m1 - 640), n = Math.ceil(s.hsc + p.m1 + (p.n === 2 ? s.V * 1.1 : 0) + 120 - x0) + 2, a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = g.hlCurve(x0 + i);
  return { x0, a, H: (x) => { const u = x - x0, i = Math.floor(u), f = u - i; assert.ok(i >= 0 && i + 1 < n, "terrain sample range"); return a[i] + (a[i + 1] - a[i]) * f; } };
}
// independent terrain replay for the placement audit (test-side code, NOT 06n's azJump): a press T s before the strike at the
// mark's world x wm, at felt speed v, jump speed v0 (inherit = the ground speed capped at HL.tvC; float = no inherit, from h0 px
// up), hlPhys's soft cap; the lowest height above the ground through the dwell (< 0: landed before it ended). H = ground(world x)
export function replay(g, H, wm, v, T, v0, float, h0) {
  const dt = 1 / 240, x0 = wm - v * T, tv = (H(x0) - H(x0 - v * dt)) / dt, c = g.HL.tvC;
  if (float && tv >= 0) return 1e9;
  let vy = float ? v0 : v0 + Math.max(-c, Math.min(c, tv)), y = H(x0) + (h0 || 0), lo = 1e9;
  for (let i = 1; i <= Math.round((T + 0.06) * 240); i++) {
    const t = i * dt, gr = H(x0 + v * t); vy -= g.G * dt; y += vy * dt; const yc = Math.max(g.HL.yMax, gr + g.HL.yUp); if (y > yc) { y = yc; if (vy > 0) vy = 0; }
    const p = y - gr; if (p <= 0) return t >= T - 1e-9 ? p : -1; if (t >= T - 1e-9 && p < lo) lo = p;
  }
  return lo;
}

// ---------------------------------------------------------------- (a) static
const RAW = readFileSync(new URL("../src/client/06n-arc-strikes.js", import.meta.url), "utf8");
const AZB = body(F.AZ), CODE = AZB.replace(/\/\*[\s\S]*?\*\//g, "");
t("a) static: no Math.random / backtick / dollar-brace; never assigns the sim globals; Poki/lab text rules; no sr* / SR_* / CHASER_LV, no storage; no allocation in the per-frame functions", () => {
  assert.ok(!/Math\.random/.test(CODE), "no Math.random");
  assert.equal(RAW.split("`").length - 1, 2, "the only backticks are the String.raw delimiters");
  assert.ok(!RAW.includes("${"), "no dollar-brace");
  assert.ok(!/(^|[^.\w])(score|speed|scroll|runT|runS|spawnDist|nextGap|nt|ents|hsc)\s*(=[^=]|\+=|-=|\*=|\/=|\+\+|--)/m.test(CODE), "06n writes no sim global");
  assert.ok(!/(\+\+|--)\s*(score|speed|scroll|runT|runS|spawnDist|nextGap|nt|ents|hsc)\b/.test(CODE), "no prefix ++/--");
  for (const [re, w] of [[/if\(demo\)/, "if(demo)"], [/demo=1/, "demo=1"], [/<a /, "<a "], [/https?:\/\//, "URL"], [/leaderboard|supporter|initials/i, "leaderboard/supporter/initials"], [/\bpid\b|\butm\b/i, "pid/utm"], [/localStorage|\blsg\(|\blss\(/, "storage"]])
    assert.ok(!re.test(RAW), `no ${w} in 06n`);
  for (const m of POKI_FORBIDDEN) assert.ok(!RAW.includes(m), `no POKI_FORBIDDEN marker ${m}`);
  for (const a of ["function update(dt){", "function draw(){", "  lbDraw();", "function die(){", "function press(){", "function start(){", "function fit(){", "function placeShare(){", "if(demo)"])
    assert.ok(!RAW.includes(a), `no Poki EDIT anchor text ${JSON.stringify(a)}`);
  assert.deepEqual(RAW.match(/\b(sr[A-Z]\w*|SR_\w+|CHASER_LV)\b/g), null, "no 06m names anywhere in 06n, comments included");
  // per-frame functions (sim + draw paths) allocate nothing: no [] {} new .push( function( or object literals
  const fns = [...CODE.matchAll(/function (az\w+)\(/g)].map((m) => m[1]);
  assert.ok(fns.includes("azGap") && fns.includes("azTick") && fns.includes("azDraw") && fns.length > 15);
  for (const f of fns) {
    const i = CODE.indexOf("{", CODE.indexOf(`function ${f}(`)); let k = i, dp = 0;
    for (; k < CODE.length; k++) { if (CODE[k] === "{") dp++; else if (CODE[k] === "}" && --dp === 0) break; }
    const b = CODE.slice(i + 1, k);
    assert.ok(!/\[\]|\{\}|\bnew\s|\.push\(|function\s*\(|[(,=:?]\s*\{\s*\w+\s*:/.test(b), `${f}: no allocation in its body`);
  }
  assert.ok(!/[^.\w]sparks\(/.test(CODE), "never the RNG-drawing sparks()");
});

// ---------------------------------------------------------------- (b) hooks
const POKI = buildPokiScript(), LABS = await labScript("arc");
const L13 = { gap: '  typeof azGap==="function"&&(nextGap+=azGap());  /* ARC STRIKES (06n): maybe book an L6 strike plate behind this obstacle (stretches this gap) */',
  tick: '    typeof azTick==="function"&&azTick(dt,pw,ph,pt);  /* ARC STRIKES (06n): move L6 plates, count-in lamps, strikes, hits */' };
const L14 = '  typeof azDraw==="function"&&azDraw();  /* ARC STRIKES (06n): plates, lamps, bolts, hint, sounds */';
t("b) hooks: azGap/azTick/azDraw defined once with exactly one call site in the site, Poki and lab scripts; the exact lines in their places; the lab layer calls none", () => {
  const cnt = (s, f) => s.split(f + "(").length - 1;
  for (const f of ["azGap", "azTick", "azDraw"]) for (const [nm, src] of [["site", SCRIPT], ["poki", POKI], ["lab", LABS]]) {
    assert.equal(cnt(src, "function " + f), 1, `${nm}: ${f} defined once`); assert.equal(cnt(src, f), 2, `${nm}: ${f} has one call site`);
  }
  const s13 = body(F.SIM).split("\n"), s14 = body(F.RENDER).split("\n");
  const ig = s13.indexOf(L13.gap), it = s13.indexOf(L13.tick), id = s14.indexOf(L14);
  assert.ok(ig > 0 && it > 0 && id > 0, "the three lines, byte for byte");
  assert.ok(/typeof fkSpawn==="function"&&fkSpawn\(\);/.test(s13[ig - 1]) && /typeof crGap==="function"&&\(nextGap\+=crGap\(\)\);/.test(s13[ig + 1]), "azGap between fkSpawn and crGap");
  assert.ok(/typeof srGap==="function"&&srGap\(\);/.test(s13[ig + 2]) && s13[ig + 3] === "}", "crGap -> srGap -> } stay last in spawn()");
  assert.ok(/srTick\(dt,pw,ph,pt\)/.test(s13[it - 1]) && /ocTick\(dt,pw,ph,pt\)/.test(s13[it - 2]) && s13[it + 1] === "    if(rb)skClear(pw);", "azTick right after srTick (ocTick -> srTick adjacent), before skClear");
  assert.ok(/crDraw\(\)/.test(s14[id - 1]) && /enDrawAfter\(\)/.test(s14[id - 2]) && /ocDraw\(\)/.test(s14[id + 1]) && /srDraw\(\)/.test(s14[id + 2]) && /edgeWarnDraw\(\)/.test(s14[id + 3]), "azDraw between crDraw and ocDraw");
  for (const l of [L13.gap, L13.tick, L14]) {
    assert.ok(!/currentLevel|\blv[A-Z]\w*\(|\bcr[A-Z]\w*\(|\ben(Pre|Post|TagAll|Draw|DrawAfter)\b|\b(sr[A-Z]\w*|SR_\w+|CHASER_LV)\b/.test(l), l);
    assert.ok(!/score|speed/.test(l), "no score/speed on a hook line");
  }
  assert.ok(!/azGap|azTick|azDraw/.test(body(F.LAB).replace(/\/\*[\s\S]*?\*\//g, "")), "the lab layer calls no hook");
  assert.ok(LABS.includes(body(F.LAB)) && !SCRIPT.includes("LAB: ARC FURNACE") && !POKI.includes("LAB: ARC FURNACE"), "the lab layer only in the lab build");
  assert.ok(SCRIPT.includes("function azTick(") && POKI.includes("function azTick("), "06n in both builds");
});

// ---------------------------------------------------------------- shared runs
// natural runs (from 0 s: the L5 boss, then L6 at 135 s): A = the full game, B = without 06n, the same base bot; compared step
// by step (c); A also feeds d (inert before L6), e (audit), f (natural bots), j and k
const NAT = FULL ? [[1, "tap3"], [2, "rhold"], [3, "rtap"], [4, "hold3"], [5, "rhold"], [6, "tap3"]] : [[1, "rhold"], [2, "tap3"]];
const NAT_S = FULL ? 300 : 230;
const L7_S = 180;  // L7 MINE CART (06d LV_SEC[6]): strikes are L6 only
const natural = [];
export function naturalAB(seed, mode) {
  const A = game({ seed }), B = game({ seed, az: false }), a = A.g, b = B.g, ba = bot(a, mode, seed * 31), bb = bot(b, mode, seed * 31);
  const hits = [], strikes = [], books = [], plates = new Map(), cancelled = []; let firstBook = null, l6 = null, drawPre = 0, diverged = null, maxRatio = 0, cartL6 = 0, rollL6 = 0;
  const contacts = [];
  a.az.wrapHit((p) => hits.push({ id: p.id, runS: a.runS }));
  a.az.wrapGap((r, p, s) => { if (s.gb || s.boss) assert.equal(r, 0, "nothing booked while lvGapsBlocked() / the crusher is up or pending");
    if (p) { const rec = { id: p.id, n: p.n, at: a.runS, add: r, ph: a.runS - a.az.L6 >= 20 ? 1 : 0, ann: 0, k: 0, ts: [], done: 0, m1: p.m1, m2: p.m2, x0: p.x0, x1: p.x1, la: p.la, s, ter: terrain(a, p, s) };
      books.push(rec); plates.set(p.id, rec); if (firstBook === null) firstBook = a.runS; } });
  a.start(); b.start();
  for (let i = 0; i < NAT_S * 240; i++) {
    a.inv = 1e9; a.cores = 99; b.inv = 1e9; b.cores = 99; ba(); bb();
    const ra = A.calls.rn(), rb = B.calls.rn();
    a.step(1 / 240); b.step(1 / 240);
    assert.equal(a.state, "run"); assert.equal(b.state, "run");
    assert.equal(a.score, b.score, `score identical at step ${i}`); assert.equal(a.speed, b.speed, `speed identical at step ${i}`); assert.equal(a.runS, b.runS);
    maxRatio = Math.max(maxRatio, a.score / (nFor(a.runS) * 1.01 + 5));
    if (diverged === null && A.calls.rn() - ra !== B.calls.rn() - rb) diverged = a.runS;
    if (l6 === null && a.lvl() >= 6) l6 = a.runS;
    if (a.lvl() < 6) {
      assert.equal(a.az.P.filter((p) => p.a).length, 0, "no plate before L6");
      if (i % 4 === 3) { A.calls.rec = true; A.calls.fr.length = 0; A.calls.txt.length = 0; A.calls.arcs = 0; a.az.draw(); A.calls.rec = false; drawPre += A.calls.fr.length + A.calls.txt.length + A.calls.arcs; }
    }
    const live = new Set();
    for (const p of a.az.P) if (p.a) { live.add(p.id); const r = plates.get(p.id); if (!r) continue; if (p.ar) r.ann = 1;
      if (p.k > r.k) { r.k = p.k; r.ts.push(p.st); strikes.push({ id: p.id, k: p.k, runS: p.st, lv: a.lvl() }); } }
    for (const r of plates.values()) if (!r.done && !live.has(r.id)) { r.done = 1; if (r.k < r.n) cancelled.push(r); }
    const pw = a.pW();
    for (const c of a.oc.C) if (c.a && c.x < a.PX + pw && c.x + a.oc.W > a.PX) { contacts.push(a.runS); if (a.lvl() === 6) cartL6++; }
    for (const r of a.rl.C) if (r.a && r.x < a.PX + pw && r.x + a.rl.W > a.PX) { contacts.push(a.runS); if (a.lvl() === 6) rollL6++; }
  }
  return { seed, mode, hits, strikes, books, cancelled, firstBook, l6, drawPre, diverged, maxRatio, cartL6, rollL6, contacts, g: a };
}
if (MAIN) for (const [s, m] of NAT) natural.push(naturalAB(s, m));

t(`c) leaderboard: ${NAT.length} natural ${NAT_S} s inv runs with and without 06n: score / speed / runS identical every step, score <= nFor(runS)*1.01+5; Math.random draws identical until the first plate (>= L6 + 2.7 s)`, () => {
  for (const r of natural) {
    assert.ok(r.l6 !== null && Math.abs(r.l6 - 135) < 0.05, `seed ${r.seed}: L6 at ${r.l6}`);
    assert.ok(r.maxRatio <= 1, `score ceiling ratio ${r.maxRatio}`);
    assert.ok(r.firstBook !== null && r.firstBook >= r.l6 + 2.7, `seed ${r.seed}: first plate ${r.firstBook} (L6 ${r.l6})`);
    assert.ok(r.diverged === null || r.diverged >= r.firstBook, `seed ${r.seed}: Math.random stream diverged at ${r.diverged}, before the first plate ${r.firstBook}`);
    log(`   seed ${r.seed}: L6 ${r.l6.toFixed(2)} s, first plate ${r.firstBook.toFixed(2)} s, random stream first differs at ${r.diverged === null ? "never" : r.diverged.toFixed(2) + " s"}, ${r.strikes.length} strikes`);
  }
});

// ---------------------------------------------------------------- (d) inert
t("d) inert: nothing before L6 (no plate, 0 azDraw ctx calls), no strike before L6 + 5 s; nothing in demo, with ?arcs=0, while lvGapsBlocked() or the first-run slow-mo (both forced on after L6 + 5 s), or with the crusher stalled / pending on L6; no plate near a gap; an unannounced plate under a new gap is dropped, an announced one never", () => {
  for (const r of natural) {
    assert.equal(r.drawPre, 0, "azDraw draws nothing before L6");
    assert.ok(r.strikes.length && r.strikes[0].runS >= r.l6 + 5, `first strike ${r.strikes[0]?.runS} >= L6 + 5`);
    assert.ok(r.strikes.every((s) => s.lv >= 6));
  }
  const quiet = (env, opt, what) => {
    const { g, calls } = game(env); g.start(); if (opt.fast) g.speed = 760; let az = 0;
    for (let f = 0; f < 40 * 60; f++) { g.inv = 1e9; g.cores = 99; if (opt.pre) opt.pre(g); g.frame(60); calls.rec = true; g.az.draw(); calls.rec = false; if (g.state !== "run") g.start();
      az += g.ev("ewS.filter(function(s){return /^az/.test(s.k)}).length"); }
    assert.equal(g.az.cnt, 0, `${what}: no plate`); assert.equal(calls.sfx.filter((s) => s[0] === "arc").length, 0, `${what}: no arc sfx`);
    assert.equal(calls.fr.length + calls.txt.length + calls.arcs, 0, `${what}: azDraw draws nothing`); assert.equal(az, 0, `${what}: no arc edge glow`);
  };
  quiet({ level: 6, demo: true }, { fast: true }, "demo");
  quiet({ level: 6, q: { arcs: "0" } }, { fast: true }, "?arcs=0");
  quiet({ level: 6 }, { fast: true, pre: (g) => { g.cr.s = 2; } }, "crusher stalled (crS 2) on L6");
  quiet({ level: 6 }, { fast: true, pre: (g) => { g.cr.s = 0; g.cr.L5 = 1; } }, "crusher pending (crS 0, crL5 set) on L6");
  // ?level=6: the banner / crossfade window books nothing (lvGapsBlocked), the first strike >= 5 s
  let blocked = 0;
  const r = run({ level: 6, seed: 4 }, 30, { fast: true, fps: 60, onGap: (g, res, p, s) => { if (s.gb) { blocked++; assert.equal(res, 0); assert.equal(p, null); } } });
  assert.ok(blocked > 0, "spawns happened while lvGapsBlocked()"); assert.ok(r.strikes[0].runS >= 5, `?level=6 first strike ${r.strikes[0].runS}`);
  // the window above ends before the first possible plate (the earliest strike lead), so it alone cannot fail: force the gates on
  // well after L6 + 5 s. lvGapsBlocked() true over runS 8-20 s, and rsSlowT > 0 (first-run slow-mo: it slows the clock) over 8-14 s:
  // nothing booked there, and plates again afterwards (the gate, not the clock, held them)
  for (const [what, env, pre, key] of [["lvGapsBlocked() forced", { tune: "var __lgb=lvGapsBlocked;lvGapsBlocked=function(){return runS>=8&&runS<20||__lgb()};" }, null, "gb"],
    ["rsSlowT forced", {}, (g) => { if (g.runS >= 8 && g.runS < 14) g.ev("rsSlowT=1"); }, "slow"]]) {
    let forced = 0, booked = 0, after = 0;
    for (const seed of [4, 5, 6]) run({ level: 6, seed, ...env }, 40, { fast: true, fps: 60, pre, onGap: (g, res, p, s) => {
      if (s[key] && s.runS >= 8) { forced++; assert.equal(res, 0, `${what}: no stretch`); assert.equal(p, null, `${what}: no plate at ${s.runS}`); }
      if (p) { booked++; if (s.runS >= 20) after++; } } });
    assert.ok(forced >= 6 && booked > 0 && after > 0, `${what}: ${forced} forced spawns, ${booked} plates, ${after} after the window`);
  }
  // a gap near the plate refuses the slot (azGap's gapNear veto): a fake gap zone over every other 3000 px of world x; no plate is
  // booked whose margins [x0 - GLAND, x1 + GTO] (world x) reach a zone (06k's own spacing keeps real gaps from ever testing this)
  { const Z = 3000, fake = (a, b) => b - a >= Z || (((a % (2 * Z)) + 2 * Z) % (2 * Z)) < Z || (((a % (2 * Z)) + 2 * Z) % (2 * Z)) + (b - a) >= 2 * Z;
    let books = 0;
    for (const seed of [7, 8]) { const r2 = run({ level: 6, seed, q: { hills: "0" }, tune: `var __gn=gapNear;gapNear=function(a,b){var u=((a%${2 * Z})+${2 * Z})%${2 * Z};return b-a>=${Z}||u<${Z}||u+(b-a)>=${2 * Z}||__gn(a,b)};` }, 60, { fast: true, fps: 60,
      onGap: (g, res, p, s) => { if (!p) return; books++; const C = g.az.C; assert.ok(!fake(s.hsc + p.x0 - s.V * C.GLAND, s.hsc + p.x1 + s.V * C.GTO), `plate ${s.hsc + p.x0}-${s.hsc + p.x1} near a (fake) gap`); } });
      assert.deepEqual(r2.cancelled.filter((p) => p.ann), [], "never cancelled once announced"); }
    assert.ok(books >= 4, `${books} plates beside the fake gaps`); }
  // a plate not yet announced is dropped when a gap appears over it (azTick); an announced one never is (staged, flat ground)
  for (const [ar, gap, keep] of [[0, 1, 0], [1, 1, 1], [0, 0, 1]]) {
    const st = staged(), g = st.g, p = st.p, C0 = g.PX + g.PW / 2, V = g.wv(), m = C0 + V * 2.2;
    Object.assign(p, { m1: m, m2: m + 1e5, x0: m - 360, x1: m + 240, c: 0, ar });
    if (gap) g.ev(`var __gw=[hsc+${p.x0 + 50},hsc+${p.x0 + 60}],__gn2=gapNear;gapNear=function(a,b){return b>__gw[0]&&a<__gw[1]||__gn2(a,b)}`);
    for (let i = 0; i < 4; i++) { g.spawnDist = -1e9; g.step(1 / 240); }
    assert.equal(p.a, keep, `announced ${ar}, gap ${gap}: plate ${keep ? "kept" : "dropped"}`);
  }
  if (FULL) {  // CR_THIN=0: a natural run whose boss may stall; never a plate while it is up or pending
    const n = run({ seed: 2, tune: "CR_THIN=0;" }, 175, { fps: 60, onGap: (g, res, p, s) => { if (s.boss) assert.equal(res, 0, "CR_THIN=0: nothing while the boss is up / pending"); } });
    log(`   CR_THIN=0: boss state at 175 s ${n.g.cr.s}, ${n.strikes.length} strikes`);
  }
});

// ---------------------------------------------------------------- (f) bots
// matrix rows: [dev, vmul (0 = natural L6 felt 800), fps, mode, boots]
const MODES = ["tap3", "hold3", "rtap", "rhold"], MAT = [];
for (const dev of ["desktop", "portrait"]) for (const vm of [0, 1, 1.15]) for (const fps of [60, 240]) for (const mode of MODES) for (const boots of [false, true]) MAT.push([dev, vm, fps, mode, boots]);
// QUICK: a balanced slice of 16: every bot with both viewports, all three felt speeds, both frame rates and boots on and off
const QM = FULL ? MAT : MODES.flatMap((mode, m) => [0, 1, 2, 3].map((j) => [j & 1 ? "portrait" : "desktop", [0, 1, 1.15, 0][j], (j + m) % 2 ? 240 : 60, mode, ((j >> 1) + m) % 2 === 1]));
const MAT_S = FULL ? 150 : 75, MAT_SEEDS = FULL ? [1, 2] : [1];
const matrix = [];
if (MAIN) for (const [dev, vm, fps, mode, boots] of QM) for (const seed of MAT_SEEDS) {
  const r = run({ level: 6, seed: seed * 11 + MAT.length, dev, vmul: vm || undefined }, MAT_S, { fast: true, l6terrain: true, fps, mode, boots, botSeed: seed * 97 + fps + (boots ? 5 : 0) });
  matrix.push({ dev, vm, fps, mode, boots, seed, r });
}
t(`f) bots: 0 strike deaths over ${matrix.length} ?level=6 runs (fps 60/240, felt 760/800/874, 600x300 / 390x844, tap3/hold3/rtap/rhold, boots on/off, L6 hills + gaps) and ${natural.length} natural runs; the idle bot is hit by every strike`, () => {
  let st = 0;
  for (const m of matrix) {
    assert.deepEqual(m.r.hits, [], `${JSON.stringify([m.dev, m.vm, m.fps, m.mode, m.boots, m.seed])}: strike deaths at ${m.r.hits.map((h) => h.runS.toFixed(3))}`);
    assert.equal(m.r.deaths, 0); st += m.r.strikes.length;
  }
  for (const r of natural) assert.deepEqual(r.hits, [], `natural seed ${r.seed} ${r.mode}: strike deaths`);
  assert.ok(st > matrix.length * 4, `strikes in the matrix ${st}`);
  const modes = new Set(matrix.map((m) => m.mode)), cfg = (k) => new Set(matrix.map((m) => m[k]));
  assert.equal(modes.size, 4); assert.equal(cfg("fps").size, 2); assert.equal(cfg("vm").size, 3); assert.equal(cfg("dev").size, 2); assert.equal(cfg("boots").size, 2);
  const idle = run({ level: 6, seed: 5 }, 60, { fast: true, l6terrain: true, fps: 60, mode: "idle" });
  assert.ok(idle.strikes.length >= 4, `idle strikes ${idle.strikes.length}`); assert.equal(idle.hits.length, idle.strikes.length, "the idle bot is hit by every strike");
  log(`   ${st} strikes in the matrix, ${natural.reduce((s, r) => s + r.strikes.length, 0)} in natural runs: 0 would-be hits; idle bot ${idle.hits.length}/${idle.strikes.length}`);
});

// ---------------------------------------------------------------- (f2) the promise's edges
// The earliest presses the promise allows (06n header, PROMISE): etap / ehold press on the first frame with time to strike <= .325 /
// .60 s at which the buggy can take the jump. On L6 hills these are the presses the terrain shortens (a jump that lands on rising
// ground, or is clipped by hlPhys's soft cap): 0 would-be hits at 240 and 60 fps, plain, with spring boots held, and with the big
// cart (its centre is 7.5 px ahead of the strike reference). Seeds 3 and 17 are the reviewed cases (a boots tap at .34 s and a held
// press at .5792 s were hit before the fix). Controls: the same bots on ?hills=0, and a tap past the flat window (.345 s) on ?hills=0
// IS hit (the edge is real, the bots are not too gentle).
const EDGE = [], EDGE_S = FULL ? 120 : 60, big = (g) => g.ev("bgT=1e9");
if (MAIN) for (const seed of FULL ? [3, 17, 24, 31] : [3, 17]) for (const mode of ["etap", "ehold"]) for (const [fps, boots, pre, nm] of [[240, false, null, "plain"], [240, true, null, "boots"], [60, false, big, "big"], [60, true, null, "boots"]]) {
  EDGE.push({ seed, mode, fps, nm, r: run({ level: 6, seed }, EDGE_S, { fast: true, l6terrain: true, fps, mode, boots, pre }) });
  if (nm === "plain") EDGE.push({ seed, mode, fps, nm: "flat", r: run({ level: 6, seed, q: { hills: "0" } }, EDGE_S, { fast: true, fps, mode }) });
}
t(`f2) the promise's edges: ${EDGE.length} ?level=6 runs pressing at the earliest promised time (tap .325 s, held .60 s; 240 / 60 fps; plain / spring boots / big cart; L6 hills and flat): 0 strike deaths; a tap past the flat window (.345 s) is hit on flat ground`, () => {
  let near = 0;
  for (const e of EDGE) {
    const R = e.mode === "etap" ? PROMISE.tap : PROMISE.hold;
    assert.deepEqual(e.r.hits, [], `${JSON.stringify([e.seed, e.mode, e.fps, e.nm])}: strike deaths at ${e.r.hits.map((h) => h.runS.toFixed(3) + " py " + h.py.toFixed(2))}`);
    assert.ok(e.r.presses.every((x) => x <= R[1] + 1e-9), "presses inside the promise");
    const nr = e.r.presses.filter((x) => x > R[1] - 1 / e.fps - 1e-9).length; near += nr;
    assert.ok(nr >= 3, `${JSON.stringify([e.seed, e.mode, e.fps, e.nm])}: ${nr} presses at the edge`);
  }
  const ctl = run({ level: 6, seed: 5, q: { hills: "0" } }, 60, { fast: true, fps: 240, mode: "etap@0.345" });
  assert.ok(ctl.hits.length >= 4, `control: a tap at .345 s is hit (${ctl.hits.length}/${ctl.strikes.length})`);
  log(`   ${near} presses within a frame of the edge, 0 would-be hits; control past the flat window: ${ctl.hits.length}/${ctl.strikes.length} hit`);
});

// ---------------------------------------------------------------- (e) audit
t("e) placement audit (every plate): time to strike >= 1.35 s, pre / post rules, no gap / deck / power-up / spark row near it (also ones created later), every press of the promised ranges clears on the terrain (independent replay, every step the strike can fire on), doubles 1.1 s apart, never cancelled once announced", () => {
  let n = 0, rep = 0;
  const runs = [...matrix.map((m) => m.r), ...natural];
  const C = runs[0].g.az.C;
  for (const r of runs) {
    const g = r.g, gaps = g.gaps, decks = g.decks;
    assert.deepEqual(r.cancelled.filter((p) => p.ann), [], "no announced plate is ever cancelled");
    for (const b of r.books) {
      // the strike reference is the buggy's ground point (06i hlB: PX + PW/2, also with the big cart); the front is PX + pW()
      n++; const s = b.s, V = s.V, Cx = g.PX + g.PW / 2, Fx = g.PX + s.pw, ts1 = (b.m1 - Cx) / V, tsN = ts1 + (b.n === 2 ? C.DBL : 0), x0 = b.x0, x1 = b.x1;
      assert.ok(ts1 >= C.MINT - 1e-9, `time to strike ${ts1}`);
      // pre: every obstacle (must-jump) and the plate start after it; flat airtime (boots: longer) is the lower bound of 06n's terrain airtime
      for (const e of s.ents) { if (e.t === "k" || e.t === "u") continue; const rr = V + e.vx, ti = (e.x - Fx) / rr, to = (e.x + e.w - g.PX) / rr;
        if (ti > -.2) assert.ok(ts1 >= ti - .2 + (s.spT > ti - .3 ? C.AIRB : C.AIR) + .45 - 1e-9, `pre rule: strike ${ts1} vs in ${ti}`);
        assert.ok(ts1 >= to + C.LB + C.PST - 1e-9, "plate starts after the obstacle has passed");
        if (e.t === "b" && (e.sk === "l" || e.v === 1)) assert.ok(ts1 >= to + C.STK + C.GND + C.M - 1e-9, "stomp rule"); }
      // post: the next spawn (after the stretch) arrives after the last strike's held jump + 0.6 s (+ a duck lead)
      { const tB = (s.ng + b.add - s.sd) / V + (g.W + 20 - Fx) / (V + (s.nt === "r" ? 110 : 0));
        assert.ok(tB >= tsN - .2 + C.AIR + .6 + (s.nt === "d" || s.nt === "f" ? C.DK : 0) - 1e-6, `post rule ${tB} vs ${tsN}`); assert.ok(b.add <= C.XS[b.n - 1] * V + 1e-6, "stretch cap"); }
      // power-ups / ground spark rows
      for (const e of s.ents) if ((e.t === "u" || (e.t === "k" && e.ax == null && !e.fk)) && e.x + e.w > x0 && e.x < x1) assert.fail(`a ${e.t} lies on the plate`);
      // gaps / decks, including every one created later (world x is rigid)
      const w0 = s.hsc + x0, w1 = s.hsc + x1;
      for (const q of gaps) if (q.x1 > w0 - V * C.GLAND && q.x0 < w1 + V * C.GTO) assert.fail(`gap ${q.x0}-${q.x1} near plate ${w0}-${w1}`);
      for (const q of decks) if (q.xm > w0 - V * C.DECK && q.x0 < w1 + V * C.DECK) assert.fail(`deck near plate`);
      // doubles: 1.1 s apart at the planning speed (later at a slower felt speed), never sooner
      if (b.n === 2 && b.ts.length === 2) { const d = b.ts[1] - b.ts[0]; assert.ok(d >= C.DBL - 2 / 240, `double ${d}`); assert.ok(d <= C.DBL * V / s.vl + 2 / 240, `double ${d}`); }
      // terrain: an independent replay of the PROMISE (literal ranges, the same with spring boots) at 3 felt speeds, jumps off the
      // ground and off a crest float. A press at time to strike T fires the strike ceil(T x 240) update steps later, one more when T
      // lands on the grid or the world slows a little: every k from floor(lo x 240) to ceil(hi x 240) + 1 is replayed (a replay only
      // up to round(hi x 240) let a held press at .5792 s die). The mark moves one step in the booking step and the strike step's
      // ground point lies within one step's travel past it: both ends, wm - v/240 and wm at felt speed v. Spring boots: only boots
      // jumps when boots surely outlast the strike, both when they may be on (running out / a pickup)
      if (b.ter && rep < (FULL ? 400 : 60)) { rep++;
        for (const [wb, ts] of b.n === 2 ? [[s.hsc + b.m1, ts1], [s.hsc + b.m2, tsN]] : [[s.hsc + b.m1, ts1]]) for (const end of [1, 0]) {
          // boots at a take-off t s from now: still running then (spT > t - BS) or a boots pickup reached by then (the game's own rule)
          const bootsAt = (tt) => s.spT > tt - C.BS || s.ents.some((e) => e.t === "u" && e.k === "j" && (e.x - Fx) / V <= tt + C.BS);
          const sure = s.spT > ts + C.BS, maybe = bootsAt(ts - PROMISE.hold[1] - .02) || bootsAt(ts), muls = sure ? [g.JMUL] : maybe ? [1, g.JMUL] : [1];
          for (const v of [V, (V + s.vl) / 2, s.vl]) for (const mul of muls) { const wm = wb - end * v / 240;
            for (const [[lo, hi], v0] of [[PROMISE.tap, g.CUT], [PROMISE.hold, g.JV]]) for (let k = Math.floor(lo * 240 + 1e-6); k <= Math.ceil(hi * 240 - 1e-6) + 1; k++)
              for (const [fl, h0] of [[0, 0], [1, 0], [1, C.FH]]) { const m = replay(g, b.ter.H, wm, v, k / 240, v0 * mul, fl, h0);
                assert.ok(m >= C.CLR, `terrain replay: press ${k}/240 s at ${v.toFixed(0)} x${mul} (float ${fl},${h0}) min ${m.toFixed(2)} px; run ${runs.indexOf(r)} plate ${b.id} n ${b.n} V ${V} vl ${s.vl} ts ${ts} spT ${s.spT} sure ${sure} maybe ${maybe} wm-wb ${(wm - wb).toFixed(2)}`); } }
        }
      }
    }
  }
  assert.ok(n > 40, `${n} plates audited`);
  assert.deepEqual([C.TT, C.TH, C.TTB, C.THB], [PROMISE.tap, PROMISE.hold, PROMISE.tap, PROMISE.hold], "06n replays the promised ranges");
  log(`   ${n} plates audited (${rep} with the full terrain replay)`);
});

// ---------------------------------------------------------------- (e2) azFair at the fair / unfair boundaries + azGap's cost
// The plates above rarely sit where a spot just turns fair, and there a short cut in azFair (a press, an end or a speed it skips)
// lets a strike through. Scan L6-size hills: 06n's own verdict (azFair, both passes, no work budget) every 24 px of world x, and
// at every verdict change every 1 px between; each FAIR mark next to an unfair one gets the independent replay of every promised
// press (both ends, 3 felt speeds, off the ground and off a crest float): it must clear the sheet + the 1 px margin 06n keeps
// (AZ_FM: other frame rates fly a little differently). Without boots, with boots on for sure and with boots that may run out.
// azGap's cost: its work units (replayed steps, ground samples) per call stay within the budget (AZ_WB) + one airtime check, and
// the budget stays small enough for ~11 ms per spawn on a 4x throttled CPU (the hills replay is refused, not run, past it).
t("e2) azFair at the fair / unfair boundaries of L6 hills: every fair mark next to an unfair one clears every promised press by the sheet + 1 px (independent replay; boots off / on / may run out); azGap's work per call stays within its budget", () => {
  const COARSE = 24, N = FULL ? 4000 : 1200;
  let marks = 0, edges = 0;
  for (const [mode, vmul, n] of [["none", 0, N], ["sure", 0, N], ["maybe", 0, N], ...(FULL ? [["none", 1.15, N]] : [])]) {
    const { g } = game({ level: 6, seed: 1, vmul: vmul || undefined }); g.start(); g.speed = 760; g.ev("hsc=100000;hlSeg=[];hlFill()"); g.step(1 / 240);
    const ts = 2, C = g.az.C; g.ents = []; g.spT = mode === "sure" ? 1e9 : mode === "maybe" ? ts - .3 : 0;   // maybe: on at the earliest press, off by the strike
    const V = g.az.Vp(), vl = g.az.Vl(), muls = mode === "sure" ? [g.JMUL] : mode === "maybe" ? [1, g.JMUL] : [1], H = (x) => g.hlCurve(x), fine = [];
    const worst = (wm) => { let w = 1e9, at = "";
      for (const end of [1, 0]) for (const v of [V, (V + vl) / 2, vl]) for (const mul of muls) { const x = wm - end * v / 240;
        for (const [[lo, hi], v0] of [[PROMISE.tap, g.CUT], [PROMISE.hold, g.JV]]) for (let k = Math.floor(lo * 240 + 1e-6); k <= Math.ceil(hi * 240 - 1e-6) + 1; k++)
          for (const [fl, h0] of [[0, 0], [1, 0], [1, C.FH]]) { const m = replay(g, H, x, v, k / 240, v0 * mul, fl, h0); if (m < w) { w = m; at = `end ${end} v ${v.toFixed(0)} x${mul} press ${k}/240 float ${fl},${h0}`; } } }
      return [w, at]; };
    let prev = null, fair = 0, ed = 0; const x0 = g.hsc + 300;
    for (let i = 0; i < n; i++) { const wm = x0 + i * COARSE, ok = g.az.fair(wm, ts, V, vl); fair += ok;
      if (prev !== null && ok !== prev) {
        fine[0] = prev; fine[COARSE] = ok; for (let d = 1; d < COARSE; d++) fine[d] = g.az.fair(wm - COARSE + d, ts, V, vl);
        for (let d = 0; d <= COARSE; d++) if (fine[d] && ((d > 0 && !fine[d - 1]) || (d < COARSE && !fine[d + 1]))) { ed++;
          const [w, at] = worst(wm - COARSE + d);
          assert.ok(w >= C.CLR + 1 - 1e-6, `${mode} x${vmul || 1}: fair mark at world x ${(wm - COARSE + d).toFixed(1)} clears only ${w.toFixed(3)} px (${at})`); }
      }
      prev = ok; }
    // (not vacuous: boots that may run out must clear both plain and boots presses, so far fewer marks are fair there)
    assert.ok(fair > n * 0.015 && fair < n * 0.6 && ed >= 8, `${mode}: ${fair}/${n} coarse marks fair, ${ed} boundary marks`);
    marks += n; edges += ed;
  }
  // the per-spawn work: within AZ_WB + one airtime check (2 flights of <= 480 steps x 24) + one ground sampling and step past it
  const C = matrix[0].r.g.az.C; let mx = 0, over = 0, calls = 0;
  for (const r of [...matrix.map((m) => m.r), ...EDGE.map((e) => e.r)]) for (const w of r.work) { calls++; mx = Math.max(mx, w); if (w > C.WB) over++; }
  assert.ok(C.WB <= 4e5, `the work budget ${C.WB}`); assert.ok(mx <= C.WB + 3e4, `azGap work ${mx} past the budget ${C.WB}`);
  // the budget binds rarely at its own size, so force a small one: work stays within it (+ the same slack), refused slots leave the
  // plate wanted (some are still placed) and nothing unfair gets through (the earliest-press held bot)
  { const r = run({ level: 6, seed: 3, tune: "AZ_WB=1.5e5;" }, 60, { fast: true, l6terrain: true, fps: 60, mode: "ehold" }), m = Math.max(...r.work);
    assert.ok(m <= 1.5e5 + 3e4 && r.work.some((w) => w > 1.5e5), `a 1.5e5 budget: work max ${m}`);
    assert.ok(r.books.length > 0, "plates still placed under a small budget"); assert.deepEqual(r.hits, [], "no strike deaths under a small budget"); }
  log(`   ${marks} marks scanned, ${edges} fair marks at a boundary replayed: all clear; azGap work max ${mx} (budget ${C.WB}, ${over} of ${calls} calls reached it)`);
});

// ---------------------------------------------------------------- (g) sprite = hitbox
t("g) sprite equals hitbox: the lethal rects are exactly AZ_CLR tall from the local ground over [x0,x1] (in view), the steps they are drawn are exactly the lethal steps; py 7.99 is hit, 8 is not", () => {
  for (const dev of ["desktop", "portrait"]) {
    const { g, calls } = game({ level: 6, seed: 3, dev }), b = bot(g, "tap3"); g.start(); g.speed = 760; g.ev("hsc=100000;hlSeg=[];hlFill()");
    const per = new Map(); let fil = 0;
    for (let i = 0; i < 70 * 240 && per.size < 4; i++) {
      g.inv = 1e9; g.cores = 99; b(); g.step(1 / 240);
      calls.rec = true; calls.fr.length = 0; g.az.draw(); calls.rec = false;
      const sheet = calls.fr.filter((f) => f[5] === "#a5b4fc" && f[4] === 0.6), fl = calls.fr.filter((f) => f[5] === "#f0f9ff" && f[4] === 0.9 && f[2] === 1).length;
      assert.ok(!fl || sheet.length, "filaments only on the sheet"); fil += fl;
      // lethal = the strike is live and unresolved (13's collision test runs this step: the tap bot is airborne, so nothing resolves it early)
      const live = g.az.P.filter((p) => p.a && !p.hd && g.runS - p.st >= 0 && g.runS - p.st < g.az.C.DW);
      assert.equal(sheet.length > 0, live.length > 0, `step ${i}: sheet drawn <=> a lethal step`);
      if (live.length) { const p = live[0], XO = DEV[dev].XO, VW = DEV[dev].VW, key = p.id * 4 + p.k; per.set(key, (per.get(key) || 0) + 1);
        let cover = Math.max(Math.round(p.x0), Math.round(XO - 8)), end = Math.min(Math.round(p.x1), XO + VW + 8);
        for (const [x, y, w, h] of sheet.sort((a, c) => a[0] - c[0])) { assert.equal(h, g.az.C.CLR); assert.ok(Math.abs(y + h - (g.GY - g.hlH(x + 4))) <= 1, "on the local ground (rounded)"); assert.ok(x <= cover + 8 && x + w >= cover, "contiguous"); cover = Math.max(cover, x + w); }
        assert.ok(cover >= end - 1, `covers the plate to ${end}: ${cover}`); }
    }
    assert.ok(per.size >= 3, `${per.size} strikes`); assert.ok(fil > 0, "the sheet's static filaments are drawn (motion on)");
    for (const n of [...per.values()].slice(0, -1)) assert.equal(n, Math.ceil(g.az.C.DW * 240), "lethal (= drawn) steps per strike: the whole dwell");
  }
  // the exact vertical boundary, at the strike step: py 7.99 -> hit, py 8 -> clear (no inv)
  for (const [py, hit] of [[7.99, 1], [8, 0]]) {
    const { g } = game({ level: 6, seed: 1, q: { hills: "0", gaps: "0", fork: "0" } }); let n = 0; g.az.wrapHit(() => n++);
    g.start(); g.step(1 / 240); g.ents = []; g.spawnDist = -1e9;
    const p = g.az.P[0], C = g.PX + g.pW() / 2; Object.assign(p, { a: 1, id: 0, n: 1, m1: C + 1, m2: C + 1e4, x0: C - 360, x1: C + 240, la: 240, k: 0, c: 3, st: -1e9, hd: 1, hh: 0, ar: 1, q: 0, gl: 0, hit: 0, cl: 0 });
    g.ev(`azTick=(function(o){return function(a,b,c,d){py=${py};vy=0;return o(a,b,c,d)}})(azTick)`);
    for (let i = 0; i < 30; i++) { g.inv = 1e9; g.spawnDist = -1e9; g.step(1 / 240); }
    assert.equal(n, hit, `py ${py}`);
  }
});

// ---------------------------------------------------------------- (h) reduced motion
t("h) rm(): no spark-pool writes, no afterglow, no filaments, a straight bolt, no halo; the sheet (alpha .7), lamps and the JUMP word at lamp 3 on every strike are drawn", () => {
  const { g, calls } = game({ level: 6, seed: 2, rm: true }), b = bot(g, "tap3"); g.start(); g.speed = 760;
  let strikes = 0, jumpWord = 0, bolts = 0, sheetA = new Set(), lamps = 0; const seen = new Set();
  for (let i = 0; i < 60 * 240; i++) {
    g.inv = 1e9; g.cores = 99; b(); g.step(1 / 240);
    for (let j = 0; j < g.az.C.NP; j++) { assert.equal(g.az.PL[j], 0); assert.equal(g.az.PXs[j], 0); }
    for (const p of g.az.P) if (p.a) { assert.equal(p.gl, 0, "no afterglow"); if (p.k && !seen.has(p.id * 4 + p.k)) { seen.add(p.id * 4 + p.k); strikes++; } }
    calls.rec = true; calls.fr.length = 0; calls.txt.length = 0; calls.arcs = 0; g.az.draw(); calls.rec = false;
    assert.equal(calls.arcs, 0, "no halo arc");
    const bolt = calls.fr.filter((f) => f[5] === "#e0f2fe" && f[2] === 3); if (bolt.length) { bolts++; assert.equal(bolt.length, 1, "one straight column"); assert.equal(bolt[0][4], 0.9); }
    assert.equal(calls.fr.filter((f) => (f[5] === "#6b8cff" && f[4] === 0.6) || (f[5] === "#f8fafc" && f[2] === 2)).length, 0, "no zigzag bolt");
    for (const f of calls.fr) if (f[5] === "#a5b4fc" && f[3] === 8) sheetA.add(f[4]);
    assert.equal(calls.fr.filter((f) => f[5] === "#f0f9ff" && f[4] === 0.9 && f[2] === 1).length, 0, "no filaments under rm()");
    lamps += calls.fr.filter((f) => f[2] === 6 && f[3] === 3).length;
    for (const p of g.az.P) if (p.a && p.k < p.n && p.c === 3) { assert.ok(calls.txt.some((x) => x[0] === "JUMP" && x[5] === "azj"), "JUMP at lamp 3"); jumpWord++; }
  }
  assert.ok(strikes >= 4 && bolts >= strikes, `${strikes} strikes, ${bolts} bolt frames`); assert.deepEqual([...sheetA], [0.7]); assert.ok(lamps > 100 && jumpWord > 0);
});

// ---------------------------------------------------------------- (i) absorb order
function staged(opt = {}) {
  const { g, calls } = game({ level: 6, seed: 1, q: { hills: "0", gaps: "0", fork: "0" } }); let n = 0; g.az.wrapHit(() => n++);
  g.start(); g.step(1 / 240); g.ents = []; g.spawnDist = -1e9;
  const p = g.az.P[0], C = g.PX + g.pW() / 2; Object.assign(p, { a: 1, id: 0, n: 1, m1: C + 1, m2: C + 1e4, x0: C - 360, x1: C + 240, la: 240, k: 0, c: 3, st: -1e9, hd: 1, hh: 0, ar: 1, q: 0, gl: 0, hit: 0, cl: 0 });
  Object.assign(g, opt);
  return { g, calls, p, n: () => n };
}
t("i) absorb order: inv ignores; a shield breaks once per strike; a Spare Core clears plates < 300 px and runs skClear; otherwise die() (no bolt left hanging on the game-over screen); chained runs leave nothing (L6 clock, RNG reseeded); a Continue drops the plate that killed", () => {
  let s = staged({ inv: 5 }); for (let i = 0; i < 40; i++) { s.g.spawnDist = -1e9; s.g.step(1 / 240); }
  assert.equal(s.g.state, "run"); assert.equal(s.n(), 1); assert.equal(s.p.hd, 1); assert.equal(s.p.cl, 0, "an ignored strike is not 'cleared'");
  s = staged({ inv: 0, shd: 1 }); for (let i = 0; i < 40; i++) { s.g.spawnDist = -1e9; s.g.step(1 / 240); }
  assert.equal(s.g.state, "run"); assert.equal(s.g.shd, 0); assert.ok(s.g.inv > 1, "skShieldBreak's invulnerability covers the dwell"); assert.equal(s.n(), 1, "one hit per strike"); assert.equal(s.p.hh, 1);
  // (the near crate sits beyond the first-run rescue prompt's 0.45 s lead, whose slow-mo would delay the strike, and inside skClear's 300 px)
  s = staged({ inv: 0, shd: 0, cores: 1 }); s.g.ents = [{ x: s.g.PX + 250, w: 30, h: 21, bot: 0, t: "b", v: 0, tg: 1 }, { x: s.g.PX + 520, w: 30, h: 21, bot: 0, t: "b", v: 0, tg: 1 }];
  const far = s.g.az.P[1]; Object.assign(far, { a: 1, id: 1, n: 1, m1: 2000, m2: 3e4, x0: s.g.PX + 400, x1: 2300, la: 240, k: 0, c: 0, st: -1e9, hd: 1, hh: 0, ar: 1, q: 0, gl: 0, hit: 0, cl: 0 });
  for (let i = 0; i < 4 && s.n() === 0; i++) { s.g.spawnDist = -1e9; s.g.step(1 / 240); }
  assert.equal(s.n(), 1, "the strike hit");
  assert.equal(s.g.state, "run"); assert.equal(s.g.cores, 0); assert.equal(s.p.a, 0, "the striking plate is cleared"); assert.equal(far.a, 1, "a plate starting >= 300 px ahead stays");
  assert.deepEqual(s.g.ents.map((e) => Math.round(e.x - s.g.PX)).filter((x) => x < 300), [], "skClear removed obstacles < 300 px ahead"); assert.equal(s.g.ents.length, 1);
  s = staged({ inv: 0, shd: 0, cores: 0 }); s.g.spawnDist = -1e9; s.g.step(1 / 240);
  assert.equal(s.g.state, "over"); assert.equal(s.p.hit, 1);
  // the game-over screen: runS stops, so the strike stays "live" (e = 0): no bolt / halo / sparks may hang behind the text; the 8 px
  // sheet stays (what ended the run, like the other hazards frozen there)
  for (let f = 0; f < 30; f++) s.g.frame(60);
  s.calls.rec = true; s.calls.fr.length = 0; s.calls.arcs = 0; s.g.az.draw(); s.calls.rec = false;
  assert.deepEqual(s.calls.fr.filter((f) => f.length > 4 && f[3] > 20 && ["#f8fafc", "#6b8cff", "#e0f2fe"].includes(f[5])).map((f) => f.slice(0, 4)), [], "no bolt on the game-over screen");
  assert.equal(s.calls.arcs, 0, "no halo"); assert.equal(s.calls.fr.filter((f) => f[2] === 2 && f[3] === 2 && f[5] === "#e0f2fe").length, 0, "no frozen sparks");
  assert.ok([...s.g.az.PL].some((x) => x > 0), "(the strike did throw sparks)"); assert.ok(s.calls.fr.some((f) => f[5] === "#a5b4fc" && f[3] === 8), "the sheet stays");
  // Poki Continue (poki/ads.js continueRun: state "run", inv 1.5, runS kept): the plate that killed is dropped on the next tick
  s.g.state = "run"; s.g.inv = 1.5; s.g.spawnDist = -1e9; s.g.step(1 / 240); assert.equal(s.p.a, 0); assert.equal(s.g.state, "run");
  // chained runs via the real start()/die(): nothing carries over (plates, L6 clock, counts, sparks)
  const r = run({ level: 6, seed: 3 }, 40, { fast: true, fps: 60, mode: "idle", noInv: true, noRestart: true });
  const g = r.g; for (let k = 0; k < 4; k++) { g.start(); g.speed = 760; g.step(1 / 240);
    assert.deepEqual([g.az.P.filter((p) => p.a).length, g.az.cnt, g.az.hn, g.az.last < -1e8, g.az.L6 < 0.01, [...g.az.PL].some((x) => x > 0)], [0, 0, 0, true, true, false], `run ${k}`);
    for (let f = 0; f < 30 * 60 && g.state === "run"; f++) { g.inv = k & 1 ? 1e9 : 0; g.frame(60); } g.die(); }
  // a chained level-1 start after an L6 run: the L6 clock is cleared (-1 until L6, not re-set on a ?level=6 start) and the RNG reseeded
  { const { g: n } = game({ seed: 3 }); n.start(); for (let f = 0; f < 60; f++) n.frame(60);
    n.ev("azL6=50;azLast=99;azCnt=3;azHn=2;azRS=12345"); n.die(); n.start(); n.step(1 / 240);
    assert.equal(n.lvl(), 1); assert.deepEqual([n.az.L6, n.az.last < -1e8, n.az.cnt, n.az.hn, n.ev("azRS") === n.ev("AZ_SEED")], [-1, true, 0, 0, true], "a new run resets the L6 clock and reseeds azR"); }
});

// ---------------------------------------------------------------- (j) rate and timing
t("j) rate: 8-20 strikes/min on L6 at 800 felt (?level=6 on L6-size hills, no forced boots, and on ?hills=0), first strike after 5 s, phase B doubles share .2-.6, phase A (first 20 s) singles only; natural L6 / boots logged", () => {
  // the 800-felt matrix rows without forced spring boots, plus extra runs (QUICK) for a steadier estimate
  const m800 = matrix.filter((m) => m.vm === 0 && !m.boots).map((m) => [m.r, MAT_S - 5]);
  const extra = (FULL ? [] : [1, 2, 3, 4]).map((seed) => [run({ level: 6, seed: 40 + seed }, 120, { fast: true, l6terrain: true, fps: 60, mode: "tap3" }), 115]);
  let st = 0, T = 0, pb = 0, db = 0;
  for (const [r, secs] of [...m800, ...extra]) { st += r.strikes.length; T += secs; assert.ok(r.strikes[0].runS >= 5, `first strike ${r.strikes[0].runS}`); for (const p of r.books) if (p.ph) { pb++; db += p.n === 2; } }
  const rate = st / (T / 60), share = db / pb;
  /* natural L6 ends where L7 MINE CART begins (180 s, 06d LV_SEC): no strikes there */
  let nst = 0, nT = 0; for (const r of natural) { nst += r.strikes.length; nT += Math.min(NAT_S, L7_S) - r.l6 - 5; }
  let bst = 0, bT = 0; for (const m of matrix.filter((m) => m.vm === 0 && m.boots)) { bst += m.r.strikes.length; bT += MAT_S - 5; }
  log(`   ?level=6 at 800 felt: ${rate.toFixed(1)} strikes/min, phase B doubles ${db}/${pb} = ${share.toFixed(2)}; natural L6: ${(nst / (nT / 60)).toFixed(1)} strikes/min; with spring boots held on: ${(bst / (bT / 60)).toFixed(1)} strikes/min`);
  assert.ok(rate >= 8 && rate <= 20, `rate ${rate}`); assert.ok(share >= 0.2 && share <= 0.6, `doubles share ${share}`);
  assert.ok(nst / (nT / 60) >= 5, "natural L6 keeps a steady strike rate");
  // ?hills=0 (flat, no terrain refusals): a refused plate stays wanted (one roll per plate), so flat ground lands in the same
  // bands instead of overshooting; the random-press bots clear every strike there too
  let fst = 0, fT = 0, fpb = 0, fdb = 0;
  for (const [seed, mode] of FULL ? [[51, "rhold"], [52, "rtap"], [53, "rhold"], [54, "rtap"]] : [[51, "rhold"], [52, "rtap"]]) {
    const r = run({ level: 6, seed, q: { hills: "0" } }, 120, { fast: true, fps: 60, mode });
    assert.deepEqual(r.hits, [], `flat ${mode}: strike deaths`); fst += r.strikes.length; fT += 115; for (const p of r.books) if (p.ph) { fpb++; fdb += p.n === 2; }
  }
  const frate = fst / (fT / 60), fshare = fdb / fpb;
  log(`   ?hills=0 at 800 felt: ${frate.toFixed(1)} strikes/min, phase B doubles ${fdb}/${fpb} = ${fshare.toFixed(2)}`);
  assert.ok(frate >= 8 && frate <= 20, `flat rate ${frate}`); assert.ok(fshare >= 0.2 && fshare <= 0.6, `flat doubles share ${fshare}`);
  // ?level=6 from the start (base speed 340): the first strike >= 5 s after L6 began
  const slow = run({ level: 6, seed: 9 }, 40, { fps: 60 }); assert.ok(slow.strikes.length && slow.strikes[0].runS >= 5, `?level=6 slow first strike ${slow.strikes[0]?.runS}`);
  // phase A (the first 20 s of L6, spec section 2): singles only. Every plate booked before L6 + 20 s in every run of this file is a
  // single; and with azR forced to 0 (every roll wants a plate, every phase-B plate a double) phase A still books only singles and
  // phase B only doubles (on flat ground every double fits)
  assert.equal(m800[0][0].g.az.C.PB, 20, "phase B from 20 s");
  let pa = 0; for (const r of [...matrix.map((m) => m.r), ...natural, ...m800.map((x) => x[0]), ...extra.map((x) => x[0])]) for (const p of r.books) if (!p.ph) { pa++; assert.equal(p.n, 1, `phase A plate ${p.id} at ${p.at} is a double`); }
  const forced = run({ level: 6, seed: 12, q: { hills: "0" }, tune: "azR=function(){return 0};" }, 45, { fast: true, fps: 60 });
  const fa = forced.books.filter((p) => !p.ph), fb = forced.books.filter((p) => p.ph);
  assert.ok(pa > 10 && fa.length >= 2, `phase A plates ${pa}; forced run A ${fa.length} / B ${fb.length}`);
  assert.deepEqual(fa.map((p) => p.n), fa.map(() => 1), "forced rolls: singles before L6 + 20 s");
  assert.ok(fb.filter((p) => p.n === 2).length >= 2, "forced rolls: doubles after L6 + 20 s");
});

// ---------------------------------------------------------------- (k) carts / rollers
t(`k) no carts or rollers: 0 cart and 0 roller contacts at L6 (${natural.length} natural runs), none within 1 s of any strike`, () => {
  for (const r of natural) {
    assert.equal(r.cartL6, 0, `seed ${r.seed}: cart contacts at L6`); assert.equal(r.rollL6, 0, `seed ${r.seed}: roller contacts at L6`);
    for (const s of r.strikes) for (const c of r.contacts) assert.ok(Math.abs(c - s.runS) > 1, `contact at ${c} within 1 s of a strike at ${s.runS}`);
    assert.ok(r.contacts.length > 0, "carts / rollers did appear before L6");
  }
});

// ---------------------------------------------------------------- telegraph / sounds / draw path
// lamps (spec 4.5 step 4, literal .80 / .50 / .20 s, not the constants under test): every frame each live mark shows lamp level
// c = TTI <= .20 ? 3 : <= .50 ? 2 : <= .80 ? 1 : 0, and a level comes on exactly on the frame its threshold is crossed (the time to
// strike was above it on the frame before), with its tick sound queued on that frame
const LAMPS = [0.8, 0.5, 0.2], lampState = new WeakMap();
function lampCheck(g, fps) {
  let st = lampState.get(g); if (!st) lampState.set(g, (st = { prev: new Map(), lit: [0, 0, 0] }));
  const seen = new Set();
  for (const p of g.az.P) { if (!p.a || p.k >= p.n) continue;
    const tti = g.az.TTI(p), want = tti <= LAMPS[2] ? 3 : tti <= LAMPS[1] ? 2 : tti <= LAMPS[0] ? 1 : 0, key = p.id * 4 + p.k; seen.add(key);
    assert.equal(p.c, want, `lamp level at time to strike ${tti.toFixed(4)}`);
    const pr = st.prev.get(key);
    if (pr) for (let c = pr.c + 1; c <= p.c; c++) { st.lit[c - 1]++;
      assert.ok(pr.tti > LAMPS[c - 1] && pr.tti - tti < 2 / fps, `lamp ${c} came on at ${tti.toFixed(4)} (${pr.tti.toFixed(4)} the frame before)`);
      assert.ok(p.q & (1 << (c - 1)), `tick${c} queued on the frame lamp ${c} came on`); }
    st.prev.set(key, { c: p.c, tti }); }
  for (const k of st.prev.keys()) if (!seen.has(k)) st.prev.delete(k);
  return st.lit;
}
t("telegraph: right-edge glow from <= 1.35 s while the plate is off screen (key az<id>, sfx arc/warn once), lamps 1-2-3 light at .80 / .50 / .20 s (the frame they are crossed) and queue tick1-3, the strike zap, sounds only from the draw path (demo: case d); the hint shows for the first 2 strikes; the x2 badge on a double from its announce to its first strike; works without enemySfx", () => {
  const C = game({ level: 6 }).g.az.C;
  assert.deepEqual([C.L1, C.L2, C.L3], LAMPS, "the count-in lamps at .80 / .50 / .20 s");
  // 240 fps: one update step per frame, so each lamp comes on on the exact step its threshold is crossed
  { const { g } = game({ level: 6, seed: 6 }), b = bot(g, "tap3"); g.start(); g.speed = 760; let lit;
    for (let f = 0; f < 40 * 240; f++) { g.inv = 1e9; g.cores = 99; b(); g.frame(240); lit = lampCheck(g, 240); g.az.draw(); }
    assert.ok(lit.every((n) => n >= 4), `lamps lit ${lit}`); }
  for (const noE of [false, true]) {
    const { g, calls } = game({ level: 6, seed: 6, noEnemySfx: noE }), b = bot(g, "tap3"); g.start(); g.speed = 760;
    const ew = []; g.ev("var __ew=edgeWarn;edgeWarn=function(k,t,kind,side,o){calls.ew=calls.ew||[];if(/^az/.test(k))calls.ew.push([k,t,kind,side,o.sfx[0],o.sfx[1],o.c]);return __ew(k,t,kind,side,o)}");
    let hintStrikes = new Set(), tick = 0;
    for (let f = 0; f < 50 * 60; f++) {
      g.inv = 1e9; g.cores = 99; b();
      const n0 = calls.sfx.length; g.frame(60); assert.ok(calls.sfx.slice(n0).every((s) => s[0] !== "arc"), "no arc sound from the sim path");
      lampCheck(g, 60);
      calls.rec = true; calls.txt.length = 0; g.az.draw(); calls.rec = false;
      for (const x of calls.txt) if (x[0] === "JUMP ON 3") hintStrikes.add(g.az.hn);
      for (const p of g.az.P) if (p.a && p.x0 > DEV.desktop.VW && p.k < p.n && g.az.TTI(p) <= 1.35) tick++;
    }
    const E = calls.ew || [];
    assert.ok(E.length > 0 && E.every((e) => /^az\d+$/.test(e[0]) && e[1] <= 1.35 + 1e-9 && e[2] === "enemy" && e[3] === "right" && e[4] === "arc" && e[5] === "warn" && e[6] === "#a5b4fc"), "edge glow calls");
    assert.ok(tick > 0);
    assert.deepEqual([...hintStrikes].sort(), [0, 1], "JUMP ON 3 only before the first 2 strikes");
    if (!noE) {
      const ev = calls.sfx.filter((s) => s[0] === "arc").map((s) => s[1]);
      const zaps = ev.filter((e) => e === "zap").length;
      assert.ok(zaps >= 3, `zaps ${zaps}`); for (const k of ["tick1", "tick2", "tick3"]) assert.ok(ev.filter((e) => e === k).length >= zaps - 1, k);
      assert.ok(ev.includes("warn"), "edgeWarn's once-per-key arc/warn");
    }
  }
  // demo: the glow, sounds and plates never happen (azOn needs !demo); a clean double plays sfxCombo(2) once (sound only)
  const { g, calls } = game({ level: 6, seed: 8 }), b = bot(g, "tap3"); g.start(); g.speed = 760; let dbl = 0; const cd = new Set();
  let badge = 0;
  for (let f = 0; f < 120 * 60; f++) { g.inv = 1e9; g.cores = 99; b(); g.frame(60, true); for (const p of g.az.P) if (p.a && p.n === 2 && p.k === 2 && p.cl === 2 && !cd.has(p.id)) { cd.add(p.id); dbl++; }
    // the x2 badge: drawn for each announced double before its first strike whose badge spot is in view, and for nothing else
    calls.rec = true; calls.txt.length = 0; g.az.draw(); calls.rec = false;
    const n = calls.txt.filter((x) => x[5] === "azx2").length, want = g.az.P.filter((p) => p.a && p.n === 2 && p.k === 0 && p.ar && p.x0 + 18 < DEV.desktop.VW && p.x0 + 18 > -8).length;
    assert.equal(n, want, `x2 badges at ${g.runS.toFixed(3)}`); badge += n; }
  assert.ok(dbl >= 1 && calls.combo >= dbl - 1 && calls.combo <= dbl, `combo ${calls.combo} for ${dbl} clean doubles`);
  assert.ok(badge > 30, `x2 badge frames ${badge}`);
});

t("lab layer: ?l6=1 sets the L6 floor; ?fast=1 starts at MAXV; ?azdbg=1 exposes a read-only window.__az; it calls no hook", () => {
  const mk = (q) => { const { g } = game({ lab: true, q }); return g; };
  let g = mk({ l6: "1" }); g.start(); g.step(1 / 240); assert.equal(g.lvl(), 6);
  g = mk({ level: "3", l6: "1" }); g.start(); g.step(1 / 240); assert.equal(g.lvl(), 3, "?level wins over ?l6");
  g = mk({ fast: "1", level: "6" }); g.start(); assert.equal(g.speed, 760);
  g = mk({ azdbg: "1", level: "6" }); g.start(); g.speed = 760; for (let i = 0; i < 20 * 60; i++) { g.inv = 1e9; g.cores = 99; g.frame(60); }
  const w = g.ev("window.__az"); assert.ok(Array.isArray(w.azP) && w.azL6 >= 0 && w.state === "run" && w.lvl === 6 && typeof w.py === "number" && w.speed === 760);
  assert.equal(Reflect.set(w, "speed", 1), false); assert.equal(g.speed, 760, "read-only");
});

console.log(`arc: ${pass} tests passed (${((Date.now() - T0) / 1000).toFixed(1)} s, ${FULL ? "FULL" : "QUICK"})`);
