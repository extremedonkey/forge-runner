// Levels tests (LEVELS-1): evaluates src/client/06d-levels.js with fake game globals (same pattern as test-sparks.mjs).
// Run: node scripts/test-levels.mjs   (also run by scripts/test-build.mjs, i.e. npm test).
import assert from "node:assert/strict";
import SRC from "../src/client/06d-levels.js";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LOOP from "../src/client/16-loop.js";
import RENDER from "../src/client/14-render.js";
const body = (f) => f.slice(1, -1);
const BODY = body(SRC);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   levels:", name); };

// env: { build, level (?level=), music: undefined | "fn" | "throw", rm }
function run(env = {}) {
  const calls = { music: [], txt: [] };
  const q = env.level === undefined ? null : String(env.level);
  const pre = `"use strict";var window={FR_BUILD:${JSON.stringify(env.build || "site")}};var Q={get:function(k){return k==="level"?${JSON.stringify(q)}:null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,VW=600,H=300,HS=1,state="start",score=0;
    function rm(){return ${!!env.rm}}var ctx={globalAlpha:1,fillStyle:"",fillRect:function(){}};
    function fitPx(s,px){return px}function txt(s){calls.txt.push(s)}` +
    (env.music === "fn" ? "function musicLevel(n){calls.music.push(n)}" : env.music === "throw" ? "function musicLevel(n){calls.music.push(n);throw new Error('boom')}" : "");
  const api = `;return {get lvl(){return lvl},get lvB(){return lvB},get lvT(){return lvT},set state(v){state=v},set score(v){score=v},get score(){return score},
    LV_AT,LV_SEC,LEVELS,LVQ,lvFor,currentLevel,getLevelDef,lvTick,lvDraw,lvPL}`;
  const g = new Function("calls", pre + BODY + api)(calls);
  // a new run the way start() does it: score=0, state="run" (06d never sees start(), it detects the run in lvTick)
  g.newRun = () => { g.score = 0; g.state = "run"; g.lvTick(1 / 60); };
  return { g, calls };
}

t("thresholds: 45/90/135/180 s of base-curve distance = 1119/2790/4500/6210", () => {
  const { g } = run();
  assert.deepEqual(g.LV_SEC, [0, 45, 90, 135, 180]);
  assert.deepEqual(g.LV_AT, [0, 1119, 2790, 4500, 6210]);
  assert.deepEqual(g.LEVELS.map((d) => d.name), ["FOUNDRY", "SLAG PITS", "EMBER VENTS", "HAMMER WORKS", "CRUSHER"]);
  assert.deepEqual(g.LEVELS.map((d) => d.at), g.LV_AT);
});
t("thresholds match the real update() integration (240 Hz sub-steps, +7/s to 760, score += speed*dt*.05) within 0.5 s", () => {
  const { g } = run();
  let speed = 340, score = 0, ts = 0, i = 1; const dt = 1 / 240;
  while (i < 5) { ts += dt; speed = Math.min(760, speed + 7 * dt); score += speed * dt * .05; if (score >= g.LV_AT[i]) { assert.ok(Math.abs(ts - g.LV_SEC[i]) < .5, `L${i + 1} at ${ts.toFixed(2)} s`); i++; } }
});
t("currentLevel() is a pure function of the distance; boundaries", () => {
  const { g } = run();
  const m = [[0, 1], [1118.9, 1], [1119, 2], [2789, 2], [2790, 3], [4499, 3], [4500, 4], [6209, 4], [6210, 5], [99999, 5]];
  for (const [s, n] of m) { assert.equal(g.lvFor(s), n, `score ${s}`); g.score = s; assert.equal(g.currentLevel(), n); }
  g.score = 3000; assert.equal(g.currentLevel(), 3); g.score = 10; assert.equal(g.currentLevel(), 1, "no hidden state");
  assert.equal(g.getLevelDef(9).n, 5); assert.equal(g.getLevelDef(3).key, "ember"); assert.equal(g.getLevelDef().name, "FOUNDRY");
});
t("banner triggers once per level; musicLevel once at run start and on each change", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun();
  let banners = 0, prev = 0;
  for (let s = 0; s <= 7000; s += 5) { g.score = s; g.lvTick(1 / 60); if (g.lvB > prev) banners++; prev = g.lvB; }
  assert.equal(g.lvl, 5); assert.equal(banners, 4);
  assert.deepEqual(calls.music, [1, 2, 3, 4, 5]);
  g.state = "over"; for (let i = 0; i < 120; i++) g.lvTick(1 / 60);
  assert.deepEqual(calls.music, [1, 2, 3, 4, 5], "nothing while game over");
});
t("skipping several levels in one tick jumps straight to the right level (one banner)", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun(); g.score = 5000; g.lvTick(1 / 60);
  assert.equal(g.lvl, 4); assert.deepEqual(calls.music, [1, 4]);
});
t("banner fades: gone after 1.5 s, draws 'LEVEL 2: SLAG PITS' while up", () => {
  const { g, calls } = run();
  g.newRun(); g.score = 1200; g.lvTick(0);
  assert.equal(g.lvB, 1.5);
  g.lvDraw(); assert.equal(calls.txt.at(-1), "LEVEL 2: SLAG PITS");
  for (let i = 0; i < 91; i++) g.lvTick(1 / 60);
  assert.equal(g.lvB, 0);
  const n = calls.txt.length; g.lvDraw(); assert.equal(calls.txt.length, n, "no banner text after it faded");
});
t("new run detected in lvTick (distance went down): level 1, banner and burst cleared, musicLevel(1)", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun(); g.score = 3000; g.lvTick(1 / 60);
  assert.equal(g.lvl, 3); assert.ok(g.lvB > 0); assert.ok([...g.lvPL].some((l) => l > 0));
  g.state = "over"; g.lvTick(1 / 60);
  g.newRun();
  assert.equal(g.lvl, 1); assert.equal(g.lvB, 0); assert.ok([...g.lvPL].every((l) => l === 0)); assert.equal(g.lvT, 0);
  assert.deepEqual(calls.music, [1, 3, 1]);
  // restart straight from a run (distance drops without an over state)
  g.score = 1500; g.lvTick(1 / 60); g.score = 0.5; g.lvTick(1 / 60);
  assert.equal(g.lvl, 1); assert.deepEqual(calls.music, [1, 3, 1, 2, 1]);
});
t("Poki rewarded Continue (over -> run with the score kept) is not a new run", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun(); g.score = 3000; g.lvTick(1 / 60); g.state = "over"; g.lvTick(1 / 60); g.state = "run"; g.lvTick(1 / 60);
  assert.equal(g.lvl, 3); assert.deepEqual(calls.music, [1, 3]);
});
t("missing musicLevel never throws; a throwing musicLevel is swallowed", () => {
  const a = run();
  assert.doesNotThrow(() => { a.g.newRun(); for (const s of [0, 1200, 3000, 4600, 6300]) { a.g.score = s; a.g.lvTick(.016); } });
  assert.equal(a.g.lvl, 5);
  const b = run({ music: "throw" });
  assert.doesNotThrow(() => { b.g.newRun(); b.g.score = 6300; b.g.lvTick(.016); });
  assert.equal(b.g.lvl, 5); assert.deepEqual(b.calls.music, [1, 5]);
});
t("?level=3 (web, debug): level floor 3 with its banner at run start; ignored on Poki and when malformed", () => {
  const w = run({ level: 3, music: "fn" }); w.g.newRun();
  assert.equal(w.g.lvl, 3); assert.equal(w.g.currentLevel(), 3); assert.equal(w.g.lvB, 1.5); assert.deepEqual(w.calls.music, [3]);
  w.g.score = 1200; w.g.lvTick(.016); assert.equal(w.g.lvl, 3, "never goes down");
  const p = run({ level: 3, build: "poki" }); p.g.newRun(); assert.equal(p.g.LVQ, 0); assert.equal(p.g.lvl, 1);
  for (const bad of ["0", "6", "2x", ""]) { const b = run({ level: bad }); b.g.newRun(); assert.equal(b.g.lvl, 1, `?level=${bad}`); }
});
t("reduced motion: no burst particles", () => {
  const { g } = run({ rm: true });
  g.newRun(); g.score = 1200; g.lvTick(0);
  assert.equal(g.lvl, 2); assert.ok([...g.lvPL].every((l) => l === 0));
});
t("cosmetic only: the fragment never assigns score, speed, spawning, enemies or power-ups; no backticks / ${}", () => {
  const code = BODY.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/(^|[^\w.])(score|speed|ents|nextGap|spawnDist|puNext|scroll|runS|hi|shd|inv|spT|bgT|mLT|state)\s*([+\-*\/]?=[^=]|\+\+|--)/m.test(code));
  assert.ok(!/`|\$\{/.test(BODY));
});
t("hooks: one typeof-guarded line each in 16-loop.js (after update) and 14-render.js (end of drawHud); none in 06/11/13", () => {
  assert.match(body(LOOP), /for\(var i=0;i<n;i\+\+\)update\(dt\/n\);\n  typeof lvTick==="function"&&lvTick\(dt\);/);
  assert.match(body(RENDER), /typeof lvDraw==="function"&&lvDraw\(\);[^\n]*\n\}\nfunction draw\(\)\{/);
  for (const f of [STATE, FLOW, SIM]) assert.ok(!/\blv[A-Z]\w*\(|currentLevel/.test(body(f)));
});
// integration: the real state/sparks/flow/simulation fragments with and without 06d-levels.js, lvTick per frame like 16-loop.js
function game(withLevels, music) {
  let seed = 1; const M = Object.create(Math); M.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const calls = { music: [] };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",skDebug=false;var Q={get:function(){return null}};
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="k",hi=0,chal=0,XO=0,OY=0,VW=600,HS=1;
    var CY="#22d3ee",OR="#f97316",VI="#a855f7",snd=false,AU=null,ac=null,mLT=0,dn=0;var performance={now:function(){return 0}};
    var shB={style:{}},np={style:{}};
    function rm(){return false}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function upShow(){}function upHide(){}` + (music ? "function musicLevel(n){calls.music.push(n)}" : "");
  const api = `;return {get score(){return score},get speed(){return speed},set nextGap(v){nextGap=v},get state(){return state},start,update,
    frame:function(dt){for(var i=0;i<4;i++)update(dt/4);typeof lvTick==="function"&&lvTick(dt)},
    lvl:function(){return typeof lvl==="number"?lvl:0}}`;
  return { g: new Function("Math", "calls", pre + body(STATE) + body(SPARKS) + (withLevels ? BODY : "") + body(FLOW) + body(SIM) + api)(M, calls), calls };
}
t("integration: score and speed identical with and without levels for a 200 s run; levels 2..5 on time; restart -> 1", () => {
  const a = game(false), l = game(true, true);
  a.g.start(); l.g.start();
  const at = [];
  for (let i = 0; i < 200 * 60; i++) {
    a.g.nextGap = 1e9; l.g.nextGap = 1e9; a.g.frame(1 / 60); l.g.frame(1 / 60);
    if (i % 60 === 0) { assert.equal(l.g.score, a.g.score); assert.equal(l.g.speed, a.g.speed); }
    if (l.g.lvl() > at.length + 1) at.push((i + 1) / 60);
  }
  assert.equal(l.g.score, a.g.score); assert.equal(l.g.state, "run");
  assert.deepEqual(l.calls.music, [1, 2, 3, 4, 5]);
  at.forEach((s, i) => assert.ok(Math.abs(s - [45, 90, 135, 180][i]) < .5, `L${i + 2} at ${s.toFixed(2)} s`));
  l.g.start(); l.g.frame(1 / 60); assert.equal(l.g.lvl(), 1, "new run -> level 1"); assert.deepEqual(l.calls.music, [1, 2, 3, 4, 5, 1]);
});
console.log(`levels: ${pass} tests passed`);
