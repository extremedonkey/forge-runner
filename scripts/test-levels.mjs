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
import BG from "../src/client/06f-levels-bg.js";
import BGDATA from "../src/client/07-background.js";
const body = (f) => f.slice(1, -1);
const BODY = body(SRC);
const BGBODY = body(BG);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   levels:", name); };

// env: { build, level (?level=), music: undefined | "fn" | "throw", rm }
function run(env = {}) {
  const calls = { music: [], txt: [], sting: [] };
  const q = env.level === undefined ? null : String(env.level);
  const pre = `"use strict";var window={FR_BUILD:${JSON.stringify(env.build || "site")}};var Q={get:function(k){return k==="level"?${JSON.stringify(q)}:null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,VW=600,H=300,HS=1,state="start",score=0;
    function rm(){return ${!!env.rm}}var ctx={globalAlpha:1,fillStyle:"",fillRect:function(){}};
    function fitPx(s,px){return px}function txt(s){calls.txt.push(s)}` +
    (env.music === "fn" ? "function musicLevel(n){calls.music.push(n)}" : env.music === "throw" ? "function musicLevel(n){calls.music.push(n);throw new Error('boom')}" : "") +
    (env.sting === "fn" ? "function levelSting(n){calls.sting.push(n)}" : env.sting === "throw" ? "function levelSting(n){calls.sting.push(n);throw new Error('boom')}" : "");
  const api = `;return {get lvl(){return lvl},get lvB(){return lvB},get lvT(){return lvT},set state(v){state=v},set score(v){score=v},get score(){return score},
    get lvPrev(){return lvPrev},LV_AT,LV_SEC,LEVELS,LV_PAL,LV_FADE,LVQ,lvFor,currentLevel,getLevelDef,lvTick,lvDraw,lvPL,lvFade}`;
  const g = new Function("calls", pre + BODY + api)(calls);
  // a new run the way start() does it: score=0, state="run" (06d never sees start(), it detects the run in lvTick)
  g.newRun = () => { g.score = 0; g.state = "run"; g.lvTick(1 / 60); };
  return { g, calls };
}

t("thresholds: 20/40/65/90 s of base-curve distance = 410/960/1840/2790", () => {
  const { g } = run();
  assert.deepEqual(g.LV_SEC, [0, 20, 40, 65, 90]);
  assert.deepEqual(g.LV_AT, [0, 410, 960, 1840, 2790]);
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
  const m = [[0, 1], [409.9, 1], [410, 2], [959, 2], [960, 3], [1839, 3], [1840, 4], [2789, 4], [2790, 5], [99999, 5]];
  for (const [s, n] of m) { assert.equal(g.lvFor(s), n, `score ${s}`); g.score = s; assert.equal(g.currentLevel(), n); }
  g.score = 1200; assert.equal(g.currentLevel(), 3); g.score = 10; assert.equal(g.currentLevel(), 1, "no hidden state");
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
  g.newRun(); g.score = 2000; g.lvTick(1 / 60);
  assert.equal(g.lvl, 4); assert.deepEqual(calls.music, [1, 4]);
});
t("banner fades: gone after 1.5 s, draws 'LEVEL 2: SLAG PITS' while up", () => {
  const { g, calls } = run();
  g.newRun(); g.score = 600; g.lvTick(0);
  assert.equal(g.lvB, 1.5);
  g.lvDraw(); assert.equal(calls.txt.at(-1), "LEVEL 2: SLAG PITS");
  for (let i = 0; i < 91; i++) g.lvTick(1 / 60);
  assert.equal(g.lvB, 0);
  const n = calls.txt.length; g.lvDraw(); assert.equal(calls.txt.length, n, "no banner text after it faded");
});
t("new run detected in lvTick (distance went down): level 1, banner and burst cleared, musicLevel(1)", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun(); g.score = 1200; g.lvTick(1 / 60);
  assert.equal(g.lvl, 3); assert.ok(g.lvB > 0); assert.ok([...g.lvPL].some((l) => l > 0));
  g.state = "over"; g.lvTick(1 / 60);
  g.newRun();
  assert.equal(g.lvl, 1); assert.equal(g.lvB, 0); assert.ok([...g.lvPL].every((l) => l === 0)); assert.equal(g.lvT, 0);
  assert.deepEqual(calls.music, [1, 3, 1]);
  // restart straight from a run (distance drops without an over state)
  g.score = 700; g.lvTick(1 / 60); g.score = 0.5; g.lvTick(1 / 60);
  assert.equal(g.lvl, 1); assert.deepEqual(calls.music, [1, 3, 1, 2, 1]);
});
t("Poki rewarded Continue (over -> run with the score kept) is not a new run", () => {
  const { g, calls } = run({ music: "fn" });
  g.newRun(); g.score = 1200; g.lvTick(1 / 60); g.state = "over"; g.lvTick(1 / 60); g.state = "run"; g.lvTick(1 / 60);
  assert.equal(g.lvl, 3); assert.deepEqual(calls.music, [1, 3]);
});
t("missing musicLevel never throws; a throwing musicLevel is swallowed", () => {
  const a = run();
  assert.doesNotThrow(() => { a.g.newRun(); for (const s of [0, 600, 1200, 2000, 3000]) { a.g.score = s; a.g.lvTick(.016); } });
  assert.equal(a.g.lvl, 5);
  const b = run({ music: "throw" });
  assert.doesNotThrow(() => { b.g.newRun(); b.g.score = 3000; b.g.lvTick(.016); });
  assert.equal(b.g.lvl, 5); assert.deepEqual(b.calls.music, [1, 5]);
});
t("?level=3 (web, debug): level floor 3 with its banner at run start; ignored on Poki and when malformed", () => {
  const w = run({ level: 3, music: "fn" }); w.g.newRun();
  assert.equal(w.g.lvl, 3); assert.equal(w.g.currentLevel(), 3); assert.equal(w.g.lvB, 1.5); assert.deepEqual(w.calls.music, [3]);
  w.g.score = 600; w.g.lvTick(.016); assert.equal(w.g.lvl, 3, "never goes down");
  const p = run({ level: 3, build: "poki" }); p.g.newRun(); assert.equal(p.g.LVQ, 0); assert.equal(p.g.lvl, 1);
  for (const bad of ["0", "6", "2x", ""]) { const b = run({ level: bad }); b.g.newRun(); assert.equal(b.g.lvl, 1, `?level=${bad}`); }
});
t("reduced motion: no burst particles", () => {
  const { g } = run({ rm: true });
  g.newRun(); g.score = 600; g.lvTick(0);
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
  return { g: new Function("Math", "calls", pre + body(STATE) + body(SPARKS) + (withLevels ? BODY + BGBODY : "") + body(FLOW) + body(SIM) + api)(M, calls), calls };
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
  at.forEach((s, i) => assert.ok(Math.abs(s - [20, 40, 65, 90][i]) < .5, `L${i + 2} at ${s.toFixed(2)} s`));
  l.g.start(); l.g.frame(1 / 60); assert.equal(l.g.lvl(), 1, "new run -> level 1"); assert.deepEqual(l.calls.music, [1, 2, 3, 4, 5, 1]);
});

t("levelSting(n): once per level change for n = 2..5, never at run start / level 1 / ?level start; absent or throwing is safe", () => {
  const { g, calls } = run({ music: "fn", sting: "fn" });
  g.newRun(); assert.deepEqual(calls.sting, [], "not at run start");
  for (let s = 0; s <= 7000; s += 5) { g.score = s; g.lvTick(1 / 60); }
  assert.deepEqual(calls.sting, [2, 3, 4, 5]); assert.deepEqual(calls.music, [1, 2, 3, 4, 5], "musicLevel unchanged");
  g.state = "over"; g.lvTick(.1); g.newRun(); assert.deepEqual(calls.sting, [2, 3, 4, 5], "new run (back to L1): no sting");
  g.score = 2000; g.lvTick(0); assert.deepEqual(calls.sting, [2, 3, 4, 5, 4], "skip to L4: one sting");
  const q = run({ level: 3, sting: "fn" }); q.g.newRun(); assert.deepEqual(q.calls.sting, [], "?level=3 start banner: no sting");
  const a = run(); assert.doesNotThrow(() => { a.g.newRun(); a.g.score = 1200; a.g.lvTick(0); }); assert.equal(a.g.lvl, 3);
  const b = run({ sting: "throw", music: "fn" }); assert.doesNotThrow(() => { b.g.newRun(); b.g.score = 600; b.g.lvTick(0); });
  assert.equal(b.g.lvl, 2); assert.deepEqual(b.calls.sting, [2]); assert.equal(b.g.lvB, 1.5, "banner still fires");
});
// ---------- LEVELS-2: palettes, crossfade, background layer ----------
t("palettes: L1 = none (original look); L2..L5 each have a full, distinct palette via getLevelDef(n).pal", () => {
  const { g } = run();
  assert.equal(g.getLevelDef(1).pal, null);
  const keys = ["sk0", "sk1", "hz", "gd", "ln", "gl", "pr", "pe", "hot"];
  for (let n = 2; n <= 5; n++) { const P = g.getLevelDef(n).pal; assert.ok(P && keys.every((k) => typeof P[k] === "string" && P[k]), `L${n}`); }
  assert.equal(new Set([2, 3, 4, 5].map((n) => g.getLevelDef(n).pal.ln)).size, 4, "distinct ground line colours");
  assert.equal(new Set([2, 3, 4, 5].map((n) => g.getLevelDef(n).pal.sk1)).size, 4, "distinct sky tints");
});
t("crossfade: lvFade() 0 -> 1 over LV_FADE (1.2 s), clamped, previous level kept until done; none at run start", () => {
  const { g } = run();
  g.newRun(); assert.equal(g.lvFade(), 1); assert.equal(g.lvPrev, 1);
  g.score = 600; g.lvTick(0);
  assert.equal(g.lvl, 2); assert.equal(g.lvPrev, 1); assert.equal(g.lvFade(), 0);
  g.lvTick(.6); assert.ok(Math.abs(g.lvFade() - .5) < 1e-9);
  g.lvTick(.3); assert.ok(g.lvFade() > .7 && g.lvFade() < 1 && g.lvPrev === 1);
  g.lvTick(.4); assert.equal(g.lvFade(), 1); assert.equal(g.lvPrev, 2, "fade done -> prev = current");
  g.lvTick(5); assert.equal(g.lvFade(), 1, "clamped");
  g.state = "over"; g.lvTick(.1); g.newRun(); assert.equal(g.lvPrev, 1); assert.equal(g.lvFade(), 1, "new run: hard cut to L1, no fade");
  const w = run({ level: 4 }); w.g.newRun(); assert.equal(w.g.lvPrev, 3); assert.equal(w.g.lvFade(), 0, "?level=4 fades in from L3");
});
// background layer: 06d + 06f with a recording ctx; drawWorld() is wrapped by lvBgInit() (the 07-background.js hook)
function bg(env = {}) {
  const rec = { fill: 0, off: 0, img: 0, canv: 0, world: 0, alphas: [] };
  const pre = `"use strict";var window={FR_BUILD:"site"};var Q={get:function(k){return k==="level"?${JSON.stringify(env.level ? String(env.level) : null)}:null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,OB=0,VW=600,W=600,H=300,GY=232,HS=1,K=1,state="start",score=0,scroll=0;
    function rm(){return false}var performance={now:function(){return 1000}};
    function grad(){return {addColorStop:function(){}}}
    var ctx={set globalAlpha(v){rec.alphas.push(v)},get globalAlpha(){return 1},fillStyle:"",fillRect:function(){rec.fill++},drawImage:function(){rec.img++},save:function(){},restore:function(){},beginPath:function(){},rect:function(){},clip:function(){}};
    var document={createElement:function(){rec.canv++;return {width:0,height:0,getContext:function(){return {setTransform:function(){},clearRect:function(){},fillRect:function(){rec.off++},createLinearGradient:grad,fillStyle:""}}}}};
    function fitPx(s,px){return px}function txt(){}
    function drawWorld(){rec.world++}`;
  const api = `;return {set state(v){state=v},set score(v){score=v},set K(v){K=v},set scroll(v){scroll=v},get lvl(){return lvl},lvTick,lvBgInit,lvBg,draw:function(){drawWorld()},
    newRun:function(){score=0;state="run";lvTick(1/60)}}`;
  return { g: new Function("rec", pre + BODY + BGBODY + api)(rec), rec };
}
t("background: lvBgInit wraps drawWorld once (original first); L1 draws nothing extra; start screen untouched", () => {
  const { g, rec } = bg();
  g.lvBgInit(); g.lvBgInit();
  g.draw(); assert.equal(rec.world, 1); assert.equal(rec.fill + rec.off + rec.img, 0, "start screen: no overlay");
  g.newRun(); g.draw(); assert.equal(rec.world, 2); assert.equal(rec.fill + rec.off + rec.img, 0, "L1 Foundry = original look");
});
t("background: each level L2..L5 draws its tint + props; tint canvas cached per level + one shared prop canvas, rebuilt only on view change", () => {
  const { g, rec } = bg();
  g.lvBgInit(); g.newRun();
  for (const [s, n] of [[600, 2], [1200, 3], [2000, 4], [3000, 5]]) {
    g.score = s; g.lvTick(0); g.lvTick(2); assert.equal(g.lvl, n);
    const f0 = rec.fill + rec.off, i0 = rec.img; g.draw(); assert.ok(rec.fill + rec.off - f0 > 10 && rec.img - i0 === 2, `L${n} draws (tint + prop blits)`);
  }
  assert.equal(rec.canv, 5, "one tint canvas per level + one shared prop canvas");
  for (let i = 0; i < 100; i++) { g.scroll = i * 7; g.draw(); }
  assert.equal(rec.canv, 5, "no per-frame canvas allocation");
  g.K = 2; g.draw(); assert.equal(rec.canv, 5, "resize re-renders the cached canvas, no new one");
});
t("background: mid-crossfade draws both levels (prev at 1-f, new at f)", () => {
  const { g, rec } = bg();
  g.lvBgInit(); g.newRun(); g.score = 1200; g.lvTick(0); g.lvTick(2); g.score = 2000; g.lvTick(0); g.lvTick(.3);
  const i0 = rec.img; rec.alphas.length = 0; g.draw();
  assert.equal(rec.img - i0, 4, "two layers (tint + props each)");
  assert.ok(rec.alphas.includes(.75) && rec.alphas.includes(.25), `alphas ${rec.alphas.slice(0, 4)}`);
});
t("background: 06f is cosmetic only and 07-background.js has exactly one guarded hook line", () => {
  const code = BGBODY.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/(^|[^\w.])(score|speed|ents|nextGap|spawnDist|puNext|scroll|runS|hi|shd|inv|spT|bgT|mLT|state|dn|lvl|lvPrev|lvT)\s*([+\-*\/]?=[^=]|\+\+|--)/m.test(code));
  assert.ok(!/Math\.random/.test(code), "no Math.random (does not shift the game's random stream)");
  assert.ok(!/`|\$\{/.test(BGBODY));
  assert.equal((body(BGDATA).match(/lvBgInit/g) || []).length, 2, "one line: typeof check + call");
  assert.match(body(BGDATA), /\ntypeof lvBgInit==="function"&&lvBgInit\(\);[^\n]*\n$/);
});

// ---------- levels-fix-1: lane-band readability (contrast) + props out of the gameplay bands ----------
// A tiny software rasteriser for what 06f draws (axis-aligned fillRects, linear gradients, rgba/hex colours, globalAlpha,
// source-over / destination-out, rect clips, drawImage of the cached tint canvas). It composites the level layer over the
// L1 lane-band backdrop and returns the colour of any logical pixel, so the test measures the real draw code, not a copy.
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
function rgba(c) {
  if (c[0] === "#") return hex(c);
  const m = c.match(/rgba?\(([^)]+)\)/); const v = m[1].split(",").map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
}
function rctx() {
  const c = { ops: [], clips: [], clip: null, globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000", tx: 0, ty: 0,
    setTransform(a, b, cc, d, e, f) { this.tx = e; this.ty = f; }, clearRect() { this.ops.length = 0; },
    createLinearGradient(x0, y0, x1, y1) { const g = { x0, y0, x1, y1, st: [], addColorStop(o, col) { g.st.push([o, rgba(col)]); } }; return g; },
    fillRect(x, y, w, h) { this.ops.push({ x: x + this.tx, y: y + this.ty, w, h, s: this.fillStyle, a: this.globalAlpha, op: this.globalCompositeOperation, clip: this.clip }); },
    drawImage(img, x, y) { this.ops.push({ img, x, y, a: this.globalAlpha, op: "source-over", clip: this.clip }); },
    save() { this.clips.push(this.clip); }, restore() { this.clip = this.clips.pop() ?? null; },
    beginPath() { this._r = null; }, rect(x, y, w, h) { this._r = { x, y, w, h }; }, clip() { this.clip = this._r; } };
  return c;
}
function styleAt(s, px, py) {
  if (typeof s === "string") return rgba(s);
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, t = Math.max(0, Math.min(1, ((px - s.x0) * dx + (py - s.y0) * dy) / (dx * dx + dy * dy || 1)));
  const st = s.st; if (t <= st[0][0]) return st[0][1]; if (t >= st.at(-1)[0]) return st.at(-1)[1];
  for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [o0, a] = st[i - 1], [o1, b] = st[i], k = (t - o0) / (o1 - o0); return a.map((v, j) => v + (b[j] - v) * k); }
}
// premultiplied [r,g,b,a] (0..1) of the ops at logical pixel centre (px+.5, py+.5), over dst
function paint(ops, px, py, dst) {
  let [r, g, b, A] = dst; const cx = px + .5, cy = py + .5;
  for (const o of ops) {
    if (cx < o.x || cy < o.y || (o.w !== undefined && (cx >= o.x + o.w || cy >= o.y + o.h))) continue;
    if (o.clip && (cx < o.clip.x || cy < o.clip.y || cx >= o.clip.x + o.clip.w || cy >= o.clip.y + o.clip.h)) continue;
    let s;
    if (o.img) { const q = paint(o.img.ops, px - o.x, py - o.y, [0, 0, 0, 0]); s = q.map((v) => v * o.a); }
    else { const c = styleAt(o.s, cx, cy), sa = c[3] * o.a; s = [c[0] / 255 * sa, c[1] / 255 * sa, c[2] / 255 * sa, sa]; }
    if (o.op === "destination-out") { const k = 1 - s[3]; r *= k; g *= k; b *= k; A *= k; }
    else { const k = 1 - s[3]; r = s[0] + r * k; g = s[1] + g * k; b = s[2] + b * k; A = s[3] + A * k; }
  }
  return [r, g, b, A];
}
const lin = (v) => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
const ratio = (l1, l2) => (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
// L1 lane-band backdrop: the city silhouette colour C_C at dusk (14-render.js drawSky, rgb 40,30,72; luminance 0.018 = the
// playtest's measured L1 band median). Obstacle colours: bug purple/cyan, drone grey, roller grey; spark cyan/orange.
const L1BG = [40 / 255, 30 / 255, 72 / 255, 1];
const SPRITES = { "bug purple": "#a855f7", "bug/spark cyan": "#22d3ee", "drone grey": "#a3b1c6", "spark orange": "#f97316", "roller grey": "#94a3b8" };
function laneBand(bgBody, n, opt = {}) {
  const GY = 232, main = rctx();
  const pre = `"use strict";var window={FR_BUILD:"site"};var Q={get:function(k){return k==="level"?"${n}":null}};
    var START=340,MAXV=760,OR="#f97316",CY="#22d3ee",VI="#a855f7",XO=0,OY=0,OB=0,VW=600,W=600,H=300,GY=${GY},HS=1,K=1,state="start",score=0,scroll=0,TT=1000;
    function rm(){return false}var performance={now:function(){return TT}};
    var document={createElement:function(){var o=mk();return {width:0,height:0,ops:o.ops,getContext:function(){return o}}}};
    function fitPx(s,px){return px}function txt(){}function drawWorld(){}`;
  const api = `;return {newRun:function(){score=0;state="run";lvTick(1/60);lvTick(5)},set scroll(v){scroll=v},set TT(v){TT=v},lvBg,LVB_RIDGE:typeof LVB_RIDGE==="number"?LVB_RIDGE:0}`;
  const g = new Function("ctx", "mk", pre + BODY + bgBody + api)(main, rctx);
  g.newRun();
  const out = { min: {}, med: {}, maxLum: 0, varies: 0, ridge: g.LVB_RIDGE }, Ls = [];
  for (const k in SPRITES) out.min[k] = Infinity;
  const ref = new Map(), top = opt.top || 70;
  for (const [sc, tt] of [[0, 1000], [137, 1001.3], [911, 1002.7], [2400, 1004.1]]) {
    main.ops.length = 0; g.scroll = sc; g.TT = tt; g.lvBg();
    for (let y = GY - top; y <= GY - 4; y += 2) for (let x = 0; x < 600; x += 3) {
      const c = paint(main.ops, x, y, L1BG.slice()), L = lum(c);
      const key = x + "," + y; if (ref.has(key) && Math.abs(ref.get(key) - L) > 1e-6) out.varies++; else ref.set(key, L);
      if (y < GY - 70) continue;
      out.maxLum = Math.max(out.maxLum, L); Ls.push(L);
      for (const k in SPRITES) out.min[k] = Math.min(out.min[k], ratio(L, lum(hex(SPRITES[k]).map((v, j) => (j < 3 ? v / 255 : v)))));
    }
  }
  Ls.sort((a, b) => a - b); out.medLum = Ls[Ls.length >> 1];
  for (const k in SPRITES) out.med[k] = ratio(out.medLum, lum(hex(SPRITES[k]).map((v, j) => (j < 3 ? v / 255 : v))));
  return out;
}
t("lane band contrast: L2..L5 background 0-70 px above the ground line vs obstacle + spark colours >= 3:1 (and as dark as L1)", () => {
  const l1 = lum(L1BG), base = {};
  for (const k in SPRITES) base[k] = ratio(l1, lum(hex(SPRITES[k]).map((v, j) => (j < 3 ? v / 255 : v))));
  const rows = [["L1", base, l1, base]];
  for (let n = 2; n <= 5; n++) {
    const r = laneBand(BGBODY, n);
    rows.push(["L" + n, r.min, r.maxLum, r.med]);
    for (const k in SPRITES) assert.ok(r.min[k] >= 3, `L${n} ${k}: ${r.min[k].toFixed(2)}:1 < 3:1`);
    assert.ok(r.maxLum <= l1 + 1e-9, `L${n} lane band luminance ${r.maxLum.toFixed(4)} brighter than L1 ${l1.toFixed(4)}`);
  }
  // LV_CONTRAST=1 node scripts/test-levels.mjs prints the table: worst band pixel (min) and band median per colour
  if (process.env.LV_CONTRAST) for (const [l, m, L, md] of rows) console.log("     ", l, "max lum", L.toFixed(4), Object.keys(m).map((k) => k + " " + m[k].toFixed(2) + " (med " + md[k].toFixed(2) + ")").join(", "));
});
t("props stay out of crate/pillar/flyer/drone/spark heights: nothing moving in 0-90 px above the ground line; ridge >= 90 px", () => {
  for (let n = 2; n <= 5; n++) {
    const r = laneBand(BGBODY, n, { top: 90 });
    assert.ok(r.ridge >= 90, `ridge ${r.ridge}`);
    assert.equal(r.varies, 0, `L${n}: ${r.varies} band pixels change with scroll/time (a prop or pool is in the gameplay band)`);
    assert.ok(laneBand(BGBODY, n, { top: 200 }).varies > 50, `L${n}: props do draw (and move) above the ridge`);
  }
});
console.log(`levels: ${pass} tests passed`);
