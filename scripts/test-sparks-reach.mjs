// Sparks reach tests (reach fix after Reece's playtest, 23 Oct 2026): every spark row/arc is collectable in ONE clean line.
// Evaluates the real 06-state + 06b-sparks + 11-gameflow + 13-simulation fragments (stubbed DOM/audio/render) and plays a
// scripted perfect line with the real update() physics (sub-steps of 1/240 s, like 16-loop.js) at speeds 340-760 px/s:
//   row: no input (ground run); arc: ONE tap jump (vy=CUT, peak 40 px) timed so its peak is over the bug cluster's centre. It must collect 100%,
//   survive (one jump clears the bugs: no pattern needs a second jump), and no spark may overlap an obstacle box.
// Run: node scripts/test-sparks-reach.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   sparks-reach:", name); };
const G = 1800, JV = 620, CUT = 380, PX = 56, PW = 45;
const TAP_PEAK = CUT * CUT / (2 * G), HELD_PEAK = JV * JV / (2 * G); // 40.1 px / 106.8 px (feet height)

function game(env = {}) {
  const calls = { rand: 0, spark: 0 };
  const rand = env.rand || Math.random;
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",skDebug=false;
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=${PX},PW=${PW},G=${G},JV=${JV},CUT=${CUT},START=340,MAXV=760,KEY="forge-runner-hi",hi=99999,chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return 0}};var shB={style:{}},np={style:{}};
    function rm(){return true}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){calls.spark++}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}`;
  const sparks = env.webSparks === false ? body(SPARKS).replace("var WEB_SPARKS=true;", "var WEB_SPARKS=false;") : body(SPARKS);
  const api = `;return {get state(){return state},set score(v){score=v},get speed(){return speed},set speed(v){speed=v},
    get ents(){return ents},set ents(v){ents=v},get nextGap(){return nextGap},set nextGap(v){nextGap=v},set nt(v){nt=v},
    set runS(v){runS=v},set puNext(v){puNext=v},get py(){return py},
    start,update,spawn,skSpawn,press,release}`;
  const g = new Function("calls", "Math", pre + body(STATE) + sparks + body(FLOW) + (env.sim || body(SIM)) + api)(calls, M);
  return { g, calls };
}
const q = (arr, rest = 0.99) => { let i = 0; return () => (i < arr.length ? arr[i++] : rest) };
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.bot < b.bot + b.h && a.bot + a.h > b.bot;

// Spawn one pattern at speed v: n bugs (1-3) with an arc, or a row (n = 0) in a wide gap. Returns the game, ready to play.
function setup(v, n) {
  // rand stream: start() puNext; spawn(): bug count (runS >= 15, score >= 100: 1+floor(r*3)), one colour roll per bug, pick(),
  // gap; skSpawn(): spark roll (< .35), arc/row pick (< .5 = arc). Row: 1 bug, the widest gap.
  const cnt = [0.1, 0.5, 0.9][Math.max(0, n - 1)];
  const seq = n ? [0.5, cnt, ...Array(n).fill(0.3), 0.3, 0.3, 0.1, 0.1] : [0.5, 0.1, 0.3, 0.3, 0.99, 0.1, 0.9];
  const { g, calls } = game({ rand: q(seq) });
  g.start(); g.score = 120; g.runS = 20; g.puNext = 1e9; g.speed = v; g.nt = "b";
  g.spawn();
  const k = g.ents.filter((e) => e.t === "k"), b = g.ents.filter((e) => e.t === "b");
  g.nextGap = 1e9; // nothing else spawns while the pattern plays
  return { g, calls, k, b };
}
// Play until every spark has passed the buggy. jumpAt(g) -> true on the tick to tap (press + release before the update).
// hold = seconds the jump button is held (0 = tap: released before the jump frame).
function play(g, jumpAt, hold = 0, check) {
  let jumped = false, rel = -1, ticks = 0;
  while (g.state === "run" && ticks < 240 * 6) {
    if (!jumped && jumpAt(g)) { jumped = true; g.press(); if (hold <= 0) g.release(); else rel = ticks + Math.round(hold * 240); }
    if (ticks === rel) g.release();
    g.update(1 / 240); ticks++;
    if (check) check(g);
    if (!g.ents.some((e) => e.t === "k" || (e.t === "b" && e.x + e.w > PX - 5))) break;
  }
  return jumped;
}
// perfect line: tap so the peak (CUT/G s after take-off) is when the cluster's centre passes the buggy's centre
const tapAtPeak = (b, lead = 0) => (g) => { const cx = (b[0].x + b[b.length - 1].x + b[b.length - 1].w) / 2; return cx - (PX + PW / 2) <= g.speed * (CUT / G + lead) };
const SPEEDS = []; for (let v = 340; v <= 760; v += 20) SPEEDS.push(v);

t("row: 4 sparks at bot 8 in the gap, a ground run (no input) collects 100% at every speed 340-760", () => {
  for (const v of SPEEDS) {
    const { g, k, calls } = setup(v, 0);
    assert.equal(k.length, 4, "row spawned at " + v); assert.ok(k.every((e) => e.bot === 8));
    g.ents = k; // the obstacle before the gap is not part of the pattern (it has its own jump; covered in the clearance check)
    play(g, () => false); assert.equal(g.state, "run"); assert.equal(calls.spark, 4, "row at " + v);
  }
});
t("arc: ONE tap jump over the bug cluster (1-3 bugs) collects 5/5 and clears the bugs at every speed 340-760", () => {
  for (const v of SPEEDS) for (const n of [1, 2, 3]) {
    const { g, k, b, calls } = setup(v, n);
    assert.equal(b.length, n); assert.equal(k.length, 5, `arc spawned at ${v}/${n}`);
    let air = 0;
    play(g, tapAtPeak(b), 0, (g) => { if (g.py > 0) air = Math.max(air, g.py) });
    assert.equal(g.state, "run", `one jump clears ${n} bugs at ${v}`); assert.equal(calls.spark, 5, `arc 5/5 at ${v}/${n}`);
    assert.ok(air < TAP_PEAK + 0.5, "it was a tap jump (peak " + air.toFixed(1) + ")");
  }
});
t("arc tolerance: a tap up to 25 ms early/late still collects 5/5; every hold up to 80 ms (peak ~84 px) has a timing that does", () => {
  for (const v of [450, 550, 650, 760]) for (const n of [1, 3]) {
    for (const lead of [-0.025, 0.025]) { const { g, b, calls } = setup(v, n); play(g, tapAtPeak(b, lead)); assert.equal(calls.spark, 5, `lead ${lead} at ${v}/${n}`) }
    for (const hold of [0.02, 0.04, 0.06, 0.08]) {
      let best = 0;
      for (let ms = -80; ms <= 80 && best < 5; ms += 5) { const { g, b, calls } = setup(v, n); play(g, tapAtPeak(b, ms / 1000), hold); if (g.state === "run") best = calls.spark }
      assert.equal(best, 5, `hold ${hold * 1000} ms at ${v}/${n}`);
    }
  }
});
t("no spark ever overlaps an obstacle box (full sprite box, any tick) while the pattern plays", () => {
  for (const v of SPEEDS) for (const n of [0, 1, 2, 3]) {
    const { g, b } = setup(v, n);
    play(g, n ? tapAtPeak(b) : () => false, 0, (g) => {
      const ks = g.ents.filter((e) => e.t === "k"), obs = g.ents.filter((e) => e.t !== "k" && e.t !== "u");
      for (const s of ks) for (const o of obs) assert.ok(!overlap(s, o), `spark over ${o.t} at ${v}/${n}`);
    });
  }
});
t("fuzz: 20,000 spawns (random scores/speeds/obstacles): every spark is within a TAP's reach (bot < 40.1+30), never above max jump height, never inside an obstacle", () => {
  let x = 12345;
  const r = () => { x = (x * 16807) % 2147483647; return x / 2147483647 };
  const { g } = game({ rand: r });
  let seen = 0;
  for (let i = 0; i < 20000; i++) {
    g.start(); g.score = 30 + r() * 2000; g.runS = r() * 120; g.speed = 340 + r() * 420; g.puNext = 1e9; g.nt = "bbfdrp"[(r() * 6) | 0];
    g.spawn();
    const ks = g.ents.filter((e) => e.t === "k"), obs = g.ents.filter((e) => e.t !== "k");
    seen += ks.length;
    for (const s of ks) {
      assert.ok(s.bot < TAP_PEAK + 30, "spark at bot " + s.bot); assert.ok(s.bot + s.h <= HELD_PEAK + 30);
      for (const o of obs) assert.ok(!overlap(s, o), "spark inside " + o.t);
    }
    assert.ok(ks.length === 0 || ks.length === 4 || ks.length === 5);
  }
  assert.ok(seen > 1000, "fuzz saw sparks: " + seen);
});
t("SKON off: no spark ents and the same Math.random calls as with skSpawn removed", () => {
  const strip = body(SIM).replace('}else if(SKON&&state==="run"&&score>=30)skSpawn(x,w,t);', "}");
  assert.notEqual(strip, body(SIM));
  for (let s = 0; s < 20; s++) {
    const one = (sim) => { let a = 0.1 + s / 25; const { g, calls } = game({ webSparks: false, rand: () => (a = (a * 7.13 + 0.17) % 1), sim });
      g.start(); g.score = 40 + s * 40; g.runS = s * 3; g.puNext = 1e9; for (let i = 0; i < 5; i++) g.spawn(); return [calls.rand, g.ents.filter((e) => e.t === "k").length] };
    const [r, k] = one(), [r0] = one(strip); assert.equal(k, 0); assert.equal(r, r0);
  }
});
t("speed/scroll/score/runS lines byte-identical (leaderboard anti-cheat)", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(body(SIM).split(l).length - 1, 1, l);
  assert.equal(body(FLOW).split("  shd=0;inv=0;spT=0;bgT=0;runS=0;puNext=150+Math.random()*100;\n").length - 1, 1);
});
console.log(`sparks-reach: ${pass} checks passed`);
