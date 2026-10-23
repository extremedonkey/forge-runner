// Levels tests (LEVELS-1): evaluates src/client/06d-levels.js with fake game globals (same pattern as test-sparks.mjs).
// Run: node scripts/test-levels.mjs   (also run by scripts/test-build.mjs, i.e. npm test).
import assert from "node:assert/strict";
import SRC from "../src/client/06d-levels.js";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const BODY = SRC.slice(1, -1);
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
    LV_AT,LV_SEC,LEVELS,LVQ,lvFor,currentLevel,getLevelDef,lvReset,lvTick,lvDraw,lvPL}`;
  return { g: new Function("calls", pre + BODY + api)(calls), calls };
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
t("lvFor maps score to level at the boundaries", () => {
  const { g } = run();
  const m = [[0, 1], [1118.9, 1], [1119, 2], [2789, 2], [2790, 3], [4499, 3], [4500, 4], [6209, 4], [6210, 5], [99999, 5]];
  for (const [s, n] of m) assert.equal(g.lvFor(s), n, `score ${s}`);
});
t("currentLevel()/getLevelDef(): level 1 before any run; getLevelDef clamps", () => {
  const { g } = run();
  assert.equal(g.currentLevel(), 1);
  assert.equal(g.getLevelDef().name, "FOUNDRY");
  assert.equal(g.getLevelDef(9).n, 5);
  assert.equal(g.getLevelDef(3).key, "ember");
});
t("banner triggers once per level; level advances with score during a run only", () => {
  const { g, calls } = run({ music: "fn" });
  g.lvReset(); g.state = "run";
  let banners = 0, prev = 0;
  for (let s = 0; s <= 7000; s += 5) { g.score = s; g.lvTick(1 / 60); if (g.lvB > prev) banners++; prev = g.lvB; }
  assert.equal(g.currentLevel(), 5);
  assert.equal(banners, 4);
  assert.deepEqual(calls.music, [1, 2, 3, 4, 5]);
  g.state = "over"; g.score = 0; g.lvTick(1 / 60);
  assert.equal(g.currentLevel(), 5, "level is not recomputed after death");
});
t("skipping several levels in one tick jumps straight to the right level (one banner)", () => {
  const { g, calls } = run({ music: "fn" });
  g.lvReset(); g.state = "run"; g.score = 5000; g.lvTick(1 / 60);
  assert.equal(g.currentLevel(), 4); assert.deepEqual(calls.music, [1, 4]);
});
t("banner fades: gone after 1.5 s, draws 'LEVEL 2: SLAG PITS' while up", () => {
  const { g, calls } = run();
  g.lvReset(); g.state = "run"; g.score = 1200; g.lvTick(0);
  assert.equal(g.lvB, 1.5);
  g.lvDraw(); assert.equal(calls.txt.at(-1), "LEVEL 2: SLAG PITS");
  for (let i = 0; i < 91; i++) g.lvTick(1 / 60);
  assert.equal(g.lvB, 0);
  const n = calls.txt.length; g.lvDraw(); assert.equal(calls.txt.length, n, "no banner text after it faded");
});
t("reset on new run: back to level 1, banner and burst cleared, musicLevel(1)", () => {
  const { g, calls } = run({ music: "fn" });
  g.lvReset(); g.state = "run"; g.score = 3000; g.lvTick(1 / 60);
  assert.equal(g.currentLevel(), 3); assert.ok(g.lvB > 0); assert.ok([...g.lvPL].some((l) => l > 0));
  g.score = 0; g.lvReset();
  assert.equal(g.currentLevel(), 1); assert.equal(g.lvB, 0); assert.ok([...g.lvPL].every((l) => l === 0)); assert.equal(g.lvT, 0);
  assert.deepEqual(calls.music, [1, 3, 1]);
});
t("missing musicLevel never throws; a throwing musicLevel is swallowed", () => {
  const a = run();
  assert.doesNotThrow(() => { a.g.lvReset(); a.g.state = "run"; for (const s of [0, 1200, 3000, 4600, 6300]) { a.g.score = s; a.g.lvTick(.016); } });
  assert.equal(a.g.currentLevel(), 5);
  const b = run({ music: "throw" });
  assert.doesNotThrow(() => { b.g.lvReset(); b.g.state = "run"; b.g.score = 6300; b.g.lvTick(.016); });
  assert.equal(b.g.currentLevel(), 5); assert.deepEqual(b.calls.music, [1, 5]);
});
t("?level=3 (web, debug): runs start at level 3 with its banner; ignored on Poki and when malformed", () => {
  const w = run({ level: 3 }); w.g.lvReset();
  assert.equal(w.g.currentLevel(), 3); assert.equal(w.g.lvB, 1.5);
  w.g.state = "run"; w.g.score = 1200; w.g.lvTick(.016); assert.equal(w.g.currentLevel(), 3, "never goes down");
  const p = run({ level: 3, build: "poki" }); p.g.lvReset(); assert.equal(p.g.LVQ, 0); assert.equal(p.g.currentLevel(), 1);
  for (const bad of ["0", "6", "2x", ""]) { const b = run({ level: bad }); b.g.lvReset(); assert.equal(b.g.currentLevel(), 1, `?level=${bad}`); }
});
t("reduced motion: no burst particles", () => {
  const { g } = run({ rm: true });
  g.lvReset(); g.state = "run"; g.score = 1200; g.lvTick(0);
  assert.equal(g.currentLevel(), 2); assert.ok([...g.lvPL].every((l) => l === 0));
});
t("cosmetic only: the fragment never assigns score, speed, spawning, enemies or power-ups", () => {
  const code = BODY.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/(^|[^\w.])(score|speed|ents|nextGap|spawnDist|puNext|scroll|runS|hi|shd|inv|spT|bgT|mLT)\s*([+\-*\/]?=[^=]|\+\+|--)/m.test(code));
  assert.ok(!/`|\$\{/.test(BODY), "no backticks / ${...} in the fragment");
});
// integration: the real state/sparks/flow/simulation fragments with and without 06d-levels.js (hooks are typeof-guarded)
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
  const b = (f) => f.slice(1, -1);
  const api = `;return {get score(){return score},get speed(){return speed},set nextGap(v){nextGap=v},get state(){return state},start,update,
    lvl:function(){return typeof currentLevel==="function"?currentLevel():0}}`;
  return { g: new Function("Math", "calls", pre + b(STATE) + b(SPARKS) + (withLevels ? BODY : "") + b(FLOW) + b(SIM) + api)(M, calls), calls };
}
t("integration: score and speed are identical with and without levels for a 200 s run (240 Hz), levels hit 2..5 on time", () => {
  const a = game(false), l = game(true, true);
  a.g.start(); l.g.start();
  const at = [];
  for (let i = 0; i < 200 * 240; i++) {
    a.g.nextGap = 1e9; l.g.nextGap = 1e9; a.g.update(1 / 240); l.g.update(1 / 240);
    if (i % 240 === 0) { assert.equal(l.g.score, a.g.score); assert.equal(l.g.speed, a.g.speed); }
    if (l.g.lvl() > at.length + 1) at.push(i / 240);
  }
  assert.equal(l.g.score, a.g.score); assert.equal(l.g.state, "run");
  assert.deepEqual(l.calls.music, [1, 2, 3, 4, 5]);
  at.forEach((s, i) => assert.ok(Math.abs(s - [45, 90, 135, 180][i]) < .5, `L${i + 2} at ${s.toFixed(2)} s`));
  l.g.start(); assert.equal(l.g.lvl(), 1, "new run -> level 1"); assert.deepEqual(l.calls.music, [1, 2, 3, 4, 5, 1]);
});
console.log(`levels: ${pass} tests passed`);
