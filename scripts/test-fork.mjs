// FORK tests (06l-fork.js: optional raised decks, research/dkc-mine-cart-madness.md item 4, fairness rules 1-15 and its auto-test
// plan). Real 06-state + 06b-sparks + 06h-rescue + 06i-hills + 06k-gaps + 06l-fork + 11-gameflow + 13-simulation via
// scripts/lib/hills-harness.mjs (gaps:true, fork:true), 1/240 s sub-steps (as 16-loop.js) unless noted.
// Run: node scripts/test-fork.mjs           (npm test: SEEDS geometry seeds (default 8) per level x felt speed, 20 ms input sweep)
//      FULL=1 node scripts/test-fork.mjs    (the research plan: 500 seeds x L1-L5 x felt {289,442,620,800}, 10 ms input sweep)
import assert from "node:assert/strict";
import FORK from "../src/client/06l-fork.js";
import SIM from "../src/client/13-simulation.js";
import RENDER from "../src/client/14-render.js";
import HILLS from "../src/client/06i-hills.js";
import LBF from "../src/client/15-leaderboard.js";
import { game, rng } from "./lib/hills-harness.mjs";
const LB = LBF.slice(1, -1);
const FULL = process.env.FULL === "1", QUICK = !FULL && process.env.QUICK === "1", SEEDS = +(process.env.SEEDS || (FULL ? 500 : QUICK ? 3 : 8)), SW = FULL ? 0.01 : QUICK ? 0.04 : 0.02, SURV = QUICK ? 12 : 40;
let pass = 0;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const t = (name, fn) => { if (ONLY && !ONLY.test(name)) return; const t0 = Date.now(); fn(); pass++; console.log("ok   fork:", name, "(" + ((Date.now() - t0) / 1000).toFixed(1) + " s)"); };
const DT = 1 / 240, PX = 56, PW = 45, DF = 0.689, LZ = 1.5 * DF + 0.6;
// a boarding press is held a short 0.3 s (decks are above a bare tap's apex); released by step()
const tap = (g, s = 0.3) => { g.press(); g._rel = Math.round(s / DT) };
const step = (g, n = 1) => { for (let i = 0; i < n && g.state === "run"; i++) { if (g._rel > 0 && --g._rel === 0) g.release(); g.now += DT * 1000; g.update(DT) } };
// test hooks evaluated in the game scope (post): force a fork now (t2: set piece), reset the buggy to a world x on flat ground
const POST = `calls.force=function(t2,ab){var c=FK.ch,o=FK.t2,a=FK.ab;FK.ch=1;FK.t2=[t2,t2,t2,t2,t2,t2];FK.ab=ab?1:0;fkCnt=[0,0,0,0,0,0];fkLast=-1e9;fkNoUntil=-1e9;fkTry();FK.ch=c;FK.t2=o;FK.ab=a;fkFilter()};
  calls.reset=function(h){hsc=h;py=0;vy=0;fkT=0;fkDk=null;fkNo=null;hlLG=hlB();hlLTV=0;hlJ=0;hlCr=0;hlCL=0;hlOff=0;hlDeep=0;hlSm=0;hlF=1;hlCW=0;hlPS=0;held=false;jb=0;duck=false;ents=[];state="run";fkRun=null;gpGaps=[];inv=0};
  calls.st=function(){return {T:fkT,py:py,vy:vy,hsc:hsc,f:speed*vMul()}};`;
const FELT = [[289, 340, 0.85], [442, 480, 0.92], [620, 620, 1], [800, 760, 1.06]];   // felt = speed x lv (pinned)
const tall = (e) => e.t === "p" || e.t === "d" || e.t === "h" || (e.t === "f" && e.bot >= 18) || e.sk === "v";
// one generated level: level n pinned, speed pinned (felt fixed), 120 s, invulnerable autopilot (Spare Cores cover gap falls)
function gen(n, sp, m, seed, sec = 120, dt = 1 / 60) {
  const r = game({ gaps: true, fork: true, level: n, lvMul: m, rand: rng(seed), hi: 500, post: POST }); const { g, calls } = r;
  g.start(); g.runS = 30; const bad = []; const snap = new Map(); const revive = []; let c0 = g.cores;
  g.cores = 99; c0 = 99;
  for (let i = 0; i < sec / dt && g.state === "run"; i++) {
    g.speed = sp; g.inv = 1e9; g.auto(); g.now += dt * 1000; g.update(dt);
    if (g.cores < c0) revive.push(g.runS); c0 = g.cores;
    const f = g.speed * g.vMul();
    for (const d of g.fk.decks) {
      const k = d.key, s = JSON.stringify([d.x0, d.xe, d.xm, d.H, d.t]);
      if (!snap.has(k)) { snap.set(k, { s, d, f, at: g.runS });
        for (let x = d.x0 - 0.689 * f; x <= d.xm + 0.85 * f; x += 25) if (Math.abs(g.hl.W(x)) > 1e-9) { bad.push("rule 14: ground under " + k + " not flat at " + x.toFixed(0)); break } }
      else if (snap.get(k).s !== s) bad.push("rule 1: " + k + " moved");
      if (d.t !== 1) continue;
      const fr = g.hsc + PX + PW;
      for (const e of g.ents) { if (e.fk || e.t === "u" || e.t === "k") continue; const a = g.hsc + e.x, b = a + e.w;
        if (a > fr + 0.5 * f || b < g.hsc + PX - 10) continue;   /* only what the buggy meets (rollers drive back through the world) */
        if (b > d.x0 && a < d.xm && (tall(e) || e.bot + e.h > 26)) bad.push("rule 9: " + e.t + "/" + e.bot + " under " + k);
        const top = d.up || d, ends = [d, top];
        for (const q of ends) if (b > q.xe && a < q.xm + 0.85 * f) bad.push("rule 11: hazard " + e.t + "/" + e.bot + " at " + a.toFixed(0) + " (xe " + q.xe.toFixed(0) + " xm " + q.xm.toFixed(0) + ", t " + g.runS.toFixed(2) + " placed " + snap.get(q.key).at.toFixed(2) + ", tag " + (e.fkc || 0) + ") under the taper / within .85 s of the merge of " + q.key);
        if (d.first && b > d.x0 && a < d.x0 + LZ * f) bad.push("rule 14: hazard under the first deck's landing zone " + k);
      }
    }
  }
  return { g, calls, bad, snap, revive };
}
function checkDecks(res, n, label) {
  const { g, calls, bad, snap, revive } = res; assert.deepEqual(bad.slice(0, 3), [], label);
  const gaps = g.gp.log, decks = [...snap.values()];
  if (n < 3) assert.equal(decks.length, 0, label + ": a fork before L3");
  const t1 = decks.filter((q) => q.d.t === 1);
  assert.ok(t1.length <= [0, 0, 0, 1, 1, 2][n], label + ": " + t1.length + " forks on L" + n);
  for (const { d, f, at } of decks) {
    const len = (d.xm - d.x0) / f, tp = (d.xm - d.xe) / f;
    assert.ok(d.H === g.fk.FK.h[d.t] && g.fk.FK.h[1] >= 52 && g.fk.FK.h[2] >= 95, label + " rule 1/2 height");
    assert.ok(len >= Math.max(1.8, 2 * DF) - 1e-6 && len <= 5 + 1e-6, label + " rule 6 length " + len.toFixed(2) + " s");
    if (d.xm > d.xe) { assert.ok(!d.drop, label + " soft deck marked drop"); assert.ok(tp >= 0.35 - 1e-6 && d.H / (d.xm - d.xe) <= 0.11 * Math.max(1, 800 / f) + 1e-9, label + " rule 11 taper " + tp.toFixed(2) + " s, slope (<= .11 at 800, the same descent time below) " + (d.H / (d.xm - d.xe)).toFixed(3)) }
    else { assert.ok(d.xm === d.xe && d.drop === true, label + " abrupt deck: xm === xe and drop"); nAb++ }
    nAll++;
    for (const q of gaps) assert.ok(!(q.x1 > d.x0 - DF * f && q.x0 < d.xm + Math.max(DF, 1.0) * f), label + " rule 8/11: gap " + q.key + " near " + d.key);
    if (d.t === 2) { const lo = decks.find((q) => q.d.key + "t2" === d.key).d;
      assert.ok(d.x0 >= lo.x0 + LZ * f - 1e-6, label + " rule 4: tier 2 starts inside tier 1's landing zone");
      assert.ok(lo.xe >= d.x0 + DF * f - 1e-6, label + " rule 8: tier 1 solid under tier 2's entry"); }
    for (const r of revive) assert.ok(!(at > r && at < r + 2), label + " rule 14: fork placed " + (at - r).toFixed(2) + " s after a revive");
    const w = calls.warn.filter((c) => c[0] === d.key);
    assert.ok(w.length > 0, label + " rule 7: no edgeWarn for " + d.key);
    assert.ok(w[0][1] >= 0.9 && w[0][2] === "fork" && w[0][3] === "R" && Number.isFinite(w[0][4]), label + " rule 7: first warn " + JSON.stringify(w[0]));
    // the edge itself on screen (portrait 363 / landscape 500 units ahead of the front) or the cue: >= .9 s either way
    for (const L of [363, 500]) assert.ok(Math.max(w[0][1], 0) >= 0.9, label + " cue lead with L " + L);
  }
  return decks.length;
}

t("FORK_ON flag: on by default, ?fork=0 off (no forks, same run as without the fragment), never in demo or tpu", () => {
  assert.match(FORK, /var FORK_ON=true;/);
  const tr = (env) => { const { g, calls } = game({ gaps: true, rand: rng(3), hi: 500, realLv: true, ...env }); g.start(); const o = [];
    let up = -1, r = [];
    for (let i = 0; i < 240 * 110 && g.state === "run"; i++) { g.auto(); g.inv = 1e9; step(g); r.push(calls.rand); if (up < 0 && g.fk && g.fk.log.length) up = i; if (i % 24 === 0) o.push([g.score, g.runS, g.py, g.ents.length, g.hsc].join("|")) } return { g, o, calls, up, r } };
  const on = tr({ fork: true }), off = tr({ fork: true, q: { fork: "0" } }), none = tr({});
  assert.ok(on.g.fk.log.length > 0, "forks appear by 110 s"); assert.equal(off.g.fk.on, false); assert.equal(off.g.fk.log.length, 0);
  assert.equal(off.o.join("\n"), none.o.join("\n"), "?fork=0 = the game without 06l");
  // 06l draws no random numbers: the stream is identical until the first fork is placed (from then on the ground lane under it
  // lacks rule 9 / 11 hazards, so the jumps, dust and particles they cause differ, as with any other change of play)
  assert.ok(on.up > 0); assert.equal(on.r.slice(0, on.up).join(), none.r.slice(0, on.up).join(), "same Math.random stream up to the first fork");
  const d = game({ gaps: true, fork: true, demo: true, rand: rng(3), hi: 500, realLv: true }).g; d.start(); assert.equal(d.fk.on, false);
});
t("speed/scroll/runT/score lines byte-identical; 06l never writes them; no Math.random / backticks / ${} in 06l; guarded hooks in 06i, 06k, 13, 14", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    runT+=speed*dt/34;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM.split(l).length - 1, 1, l.trim());
  const b = FORK.slice(1, -1);
  assert.deepEqual(b.split("\n").filter((l) => /(^|[;{(\s,])(speed|score|runS|scroll|runT)(\+=|-=|=(?!=))/.test(l)), []);
  assert.ok(!/Math\.random|`|\$\{/.test(b));
  for (const h of ['typeof fkSpawn==="function"&&fkSpawn();', 'typeof fkTick==="function"&&fkTick(dt);']) assert.equal(SIM.split(h).length - 1, 1, h);
  assert.equal(RENDER.split('typeof fkDraw==="function"&&fkDraw();').length - 1, 1);
  for (const h of ['typeof fkStand==="function"&&fkStand(gh,tv,dt)', 'typeof fkLand==="function"&&fkLand(gh,tv,p0)', 'typeof fkCanJump==="function"&&fkCanJump()', 'typeof fkFl==="function"?fkFl(wx):1', 'typeof fkStart==="function"&&fkStart();']) assert.equal(HILLS.split(h).length - 1, 1, h);
});
t("rule 15 + leaderboard: score/runS/speed/scroll identical with forks on and off for the same inputs (130 s, 3 seeds) and every step inside the server's scoreCeiling", () => {
  const START = 340, ACC = 7, MAXV = 760, RATE = 0.05, T_MAX = (MAXV - START) / ACC;
  const maxScoreFor = (t) => t <= 0 ? 0 : t <= T_MAX ? RATE * (START * t + (ACC / 2) * t * t) : RATE * (START * T_MAX + (ACC / 2) * T_MAX * T_MAX) + RATE * MAXV * (t - T_MAX);
  const scoreCeiling = (dur) => Math.min(99999, Math.floor(maxScoreFor(dur + 1) * 1.01 + 5));
  const durOf = new Function("dur", (LB.match(/(dur = Math\.max\(0, Math\.min\(36000, Math\.ceil\(dur \|\| 0\)\)\);)/) || [])[1] + "return dur;");
  let upAll = 0;
  for (const s of [1, 2, 3]) {
    const tr = (fork) => { const { g } = game({ gaps: true, fork: true, q: fork ? {} : { fork: "0" }, rand: rng(s), hi: 500, realLv: true }); g.start(); const o = []; let up = 0;
      for (let i = 0; i < 240 * 130 && g.state === "run"; i++) { g.auto(); g.inv = 1e9; step(g); if (g.fk.T) up++; o.push(g.runS + "|" + g.score + "|" + g.speed + "|" + g.scroll);
        const sc = Math.floor(g.score), d = durOf(g.runS); if (sc >= 1) assert.ok(sc <= scoreCeiling(d), `score ${sc} > ceiling at runS ${g.runS}`) }
      return { o, up, g } };
    const a = tr(true), b = tr(false);
    // the autopilot never boards on purpose (only incidental jump landings), so deck time is checked over all seeds
    assert.ok(a.g.fk.log.length > 0, "seed " + s + ": forks placed"); upAll += a.up;
    assert.equal(a.o.join("\n"), b.o.join("\n"), "seed " + s + ": score/runS/speed/scroll depend on forks");
  }
  assert.ok(upAll > 120, "the runs spent time on decks (" + (upAll / 240).toFixed(1) + " s)");
});
let nDeck = 0, nAb = 0, nAll = 0;
t("geometry + telegraph pass (G, rules 1, 4-12, 14): " + SEEDS + " seeds x L1-L5 x felt {289,442,620,800}, 120 s each", () => {
  for (let n = 1; n <= 5; n++) for (const [fv, sp, m] of FELT) for (let s = 1; s <= SEEDS; s++) {
    if (n < 3 && s > 2) continue;   /* L1-L2: a couple of seeds prove there are none */
    nDeck += checkDecks(gen(n, sp, m, 1000 * n + s), n, "L" + n + "/" + fv + "/" + s);
  }
  assert.ok(nDeck >= SEEDS * 3 * 4, "decks generated " + nDeck);
  assert.ok(nAb > 0 && nAb < nAll && (nAll < 100 || nAb > 0.35 * nAll && nAb < 0.75 * nAll),"abrupt share " + nAb + "/" + nAll);
  console.log("     " + nDeck + " decks checked, " + nAb + " abrupt (" + (100 * nAb / nAll).toFixed(0) + " %)");
});
// ---- input sweep (P): the real update() at 1/240 s on a forced fork; every take-off time x press length x latency ends, within
// 1.0 s of the take-off, on a deck or on the ground, alive. Exits: ride to the end, duck every 50 ms, jump every 50 ms over the taper.
function rig(sp, m, t2, n = 4, ab = 0) {
  const { g, calls } = game({ gaps: true, fork: true, level: n, lvMul: m, rand: rng(9), hi: 500, post: POST }); g.start(); g.runS = 30; g.speed = sp; step(g, 2);
  g.ents = []; calls.force(t2 ? 1 : 0, ab); const ds = g.fk.decks.slice(); assert.ok(ds.length === (t2 ? 2 : 1), "forced fork");
  g.nextGap = 1e9; g.puNext = 1e9; return { g, calls, d1: ds[0], d2: ds[1], H: g.fk.FK.h };
}
// run from world x 'from' (buggy front), press at front = x0 + tau*f (+ latency), held 'hold' s (0 = released on press), until 'until' s
function shot(R, sp, from, x0, tau, lat, hold, opt = {}) {
  const { g, calls } = R; calls.reset(from - PX - PW); if (opt.onDeck) { opt.onDeck(g) } let pressed = false, rel = -1, took = -1, landed = -1, t = 0, wasUp = false, dk = false;
  const f = sp * g.vMul();
  for (let i = 0; i < 240 * 4; i++) { g.speed = sp; g.nextGap = 1e9; t = i * DT;
    const fr = g.hsc + PX + PW;
    if (!pressed && fr >= x0 + (tau + lat) * f) { pressed = true; g.press(); if (hold <= 0) g.release(); else rel = i + Math.round(hold / DT) }
    if (i === rel) g.release();
    if (opt.duckAt != null && fr >= opt.duckAt) g.duck = true;
    const st = calls.st(); const up = st.py > 0 && st.T === 0;
    step(g); const s2 = calls.st(); if (pressed && s2.T >= 1) dk = true; const air = s2.py > 0 && s2.T === 0;
    if (pressed && took < 0 && air) took = t; if (took >= 0 && landed < 0 && !air) landed = t; wasUp = up;
    if (g.state !== "run") return { dead: true, t };
    if (landed >= 0 && t > landed + 1.0) break;
    if (opt.until && fr > opt.until) break;
  }
  const s = calls.st(); return { dead: false, dk, T: s.T, py: s.py, took, landed, air: s.py > 0 && s.T === 0 };
}
const PRESS = [0, 0.05, 0.1, 0.4], LAT = [0, 0.1];
t("input sweep (P, rules 2, 3, 13): take-off from edge - 0.8 s to the end of the landing zone every " + (SW * 1000) + " ms x press {0,50,100,hold} x latency {0,100 ms}: every run ends on a deck or on the ground, alive, within 1.0 s; any take-off under the deck lands on it", () => {
  let runs = 0, onDeck = 0;
  for (const [fv, sp, m] of FELT) for (const t2 of [0, 1]) {
    const R = rig(sp, m, t2), f = sp * R.g.vMul(), d = R.d1;
    for (let tau = -0.8; tau <= LZ + 1e-9; tau += SW) for (const hold of PRESS) for (const lat of LAT) {
      const r = shot(R, sp, d.x0 - 1.2 * f, d.x0, tau, lat, hold); runs++;
      assert.ok(!r.dead && !r.air, `felt ${fv} t2 ${t2} tau ${tau.toFixed(2)} hold ${hold} lat ${lat}: ${JSON.stringify(r)}`);
      assert.ok(r.landed - r.took <= 1.0 + 1e-9, "landed within 1.0 s");
      if (hold >= 0.4 && tau + lat > 0.01 && tau + lat < LZ) { assert.ok(r.dk, `take-off under the deck did not land on it: felt ${fv} tau ${tau.toFixed(2)} hold ${hold} lat ${lat} ${JSON.stringify(r)}`); onDeck++ }
    }
    if (t2) { // tier 1 -> tier 2: from riding tier 1, the same sweep over tier 2's entry
      const u = R.d2, put = (g) => { R.calls.reset(u.x0 - 1.2 * f - PX - PW); g.py = R.H[1]; };
      for (let tau = -0.8; tau <= LZ - 0.2 + 1e-9; tau += SW * 2) for (const hold of PRESS) for (const lat of LAT) {
        // board tier 1 first (a tap 0.5 s after its edge), then the shot over tier 2; it must land on tier 2 when taken off from tier 1's flat top (tier 2 is reachable only from there)
        const g = R.g; R.calls.reset(d.x0 - 1.2 * f - PX - PW); let k = 0, ok = false;
        for (let i = 0; i < 240 * 6 && !ok; i++) { g.speed = sp; if (!k && g.hsc + PX + PW >= d.x0 + 0.5 * f) { k = 1; tap(g) } step(g); if (k && g.fk.T === 1 && g.hsc + PX + PW >= u.x0 - 0.9 * f) ok = true }
        assert.ok(ok, "boarded tier 1");
        let pressed = false, rel = -1, took = -1, landed = -1;
        for (let i = 0; i < 240 * 5; i++) { g.speed = sp; const fr = g.hsc + PX + PW;   // 5 s: a short tap can fall back off tier 1's drop (tier 2 is 0.5 H = 84 px above tier 1: only a held jump reaches it)
          if (!pressed && fr >= u.x0 + (tau + lat) * f) { pressed = true; g.press(); if (hold <= 0) g.release(); else rel = i + Math.round(hold / DT) }
          if (i === rel) g.release(); step(g); const s = R.calls.st(), air = s.py > 0 && s.T === 0;
          if (pressed && took < 0 && air) took = i; if (took >= 0 && landed < 0 && !air) landed = i; if (landed >= 0 && i > landed + 240 && !air) break }
        const s = R.calls.st(); runs++;
        assert.ok(g.state === "run" && !(s.py > 0 && s.T === 0), "tier 2 sweep: alive and not airborne " + JSON.stringify({ st: g.state, s, felt: fv, t2, tau, hold, lat, ok, H: R.H, fr: g.hsc + PX + PW, ux0: u.x0, uxe: u.xe, uxm: u.xm, dxe: d.xe, dxm: d.xm, drop: u.drop }));
        if (hold >= 0.4 && tau + lat > 0.01 && tau + lat < Math.min(LZ - 0.3, (d.xe - u.x0) / f)) assert.equal(s.T, 2, `tier 1 -> 2 take-off under tier 2 lands on it: felt ${fv} tau ${tau.toFixed(2)} hold ${hold} lat ${lat}`);
      }
    }
  }
  console.log("     " + runs + " entry runs, " + onDeck + " take-offs under a deck all landed on it");
});
t("exit sweep (P, rules 11, 12): ride to the end, duck every 50 ms along the deck, jump every 50 ms over the taper (tap / hold): all end on safe ground, alive", () => {
  let runs = 0;
  for (const [fv, sp, m] of FELT) for (const t2 of [0, 1]) {
    const R = rig(sp, m, t2), f = sp * R.g.vMul(), d = R.d1, top = t2 ? R.d2 : R.d1, g = R.g;
    const board = (tier) => { R.calls.reset(d.x0 - 1.2 * f - PX - PW); let k = 0;
      for (let i = 0; i < 240 * 8; i++) { g.speed = sp; const fr = g.hsc + PX + PW;
        if (k === 0 && fr >= d.x0 + 0.4 * f) { k = 1; tap(g) }
        if (tier === 2 && k === 1 && g.fk.T === 1 && fr >= top.x0 + 0.3 * f) { k = 2; tap(g) }
        step(g); if (g.fk.T === tier && (tier === 1 || k === 2)) return true } return false };
    const runTo = (x, fn) => { for (let i = 0; i < 240 * 12; i++) { g.speed = sp; fn && fn(g.hsc + PX + PW, i); step(g); if (g.state !== "run") return false; if (g.hsc + PX > x && g.py === 0 && g.fk.T === 0) return true } return false };
    for (const tier of t2 ? [1, 2] : [1]) {
      const q = tier === 2 ? top : d;
      assert.ok(board(tier), "boarded tier " + tier); assert.ok(runTo(q.xm + 0.85 * f), "rode tier " + tier + " to the end"); runs++;
      for (let x = q.x0 + 0.5 * f; x < q.xm; x += 0.05 * f) { assert.ok(board(tier)); let dk = false;
        assert.ok(runTo(x + 0.6 * f, (fr) => { if (fr >= x && g.fk.T === tier) { g.duck = true; dk = true } }), "duck at " + (x - q.x0).toFixed(0)); g.duck = false; runs++ }
      for (let x = q.xe; x < q.xm + 0.2 * f; x += 0.05 * f) for (const hold of [0, 0.4]) { assert.ok(board(tier)); let p = 0, rl = -1;
        assert.ok(runTo(q.xm + 1.2 * f, (fr, i) => { if (!p && fr >= x) { p = 1; g.press(); if (!hold) g.release(); else rl = i + 96 } if (i === rl) g.release() }), "jump over the taper"); runs++ }
    }
  }
  // abrupt exit: ride past xe, run off the ledge (coyote), land alive on the flat floor; a jump at the lip or after it also ends safe
  for (const [fv, sp, m] of FELT) for (const t2 of [0, 1]) {
    const R = rig(sp, m, t2, 4, 1), f = sp * R.g.vMul(), g = R.g, d = R.d1, top = t2 ? R.d2 : R.d1;
    assert.ok(d.drop && top.drop && d.xm === d.xe && top.xm === top.xe, "forced abrupt");
    assert.equal(g.fk.ht(top, top.xe + 1), -1, "abrupt: nothing past xe"); assert.equal(g.fk.ht(top, top.xe), top.H);
    for (const tier of t2 ? [1, 2] : [1]) { const q = tier === 2 ? top : d;
      for (const jx of [null, -0.1, 0, 0.15]) {
        R.calls.reset(d.x0 - 1.2 * f - PX - PW); let k = 0, ran = false, p = 0, ok = false;
        for (let i = 0; i < 240 * 14 && g.state === "run"; i++) { g.speed = sp; const fr = g.hsc + PX + PW;
          if (k === 0 && fr >= d.x0 + 0.4 * f) { k = 1; tap(g) }
          if (tier === 2 && k === 1 && g.fk.T === 1 && fr >= top.x0 + 0.3 * f) { k = 2; tap(g) }
          if (jx != null && !p && g.fk.T === tier && fr >= q.xe + jx * f) { p = 1; g.press(); g.release() }
          step(g); if (g.fk.T === tier) ran = true;
          if (ran && g.fk.T === 0 && g.py === 0 && g.hsc + PX > q.xe + 0.3 * f && !(g.fk.T)) { ok = true; break } }
        assert.ok(ran && ok && g.state === "run", `abrupt ride-off felt ${fv} t2 ${t2} tier ${tier} jump ${jx}: alive on the floor`); runs++ }
    }
  }
  console.log("     " + runs + " exit runs");
});
t("rule 12 + 3: duck on a deck drops through to the ground lane (3G fast fall); holding duck never lands on a deck; ledge assist 6 px; jump buffer 120 ms works on a deck", () => {
  const R = rig(620, 1, 0), g = R.g, d = R.d1, f = 620 * g.vMul();
  R.calls.reset(d.x0 + 0.6 * f - PX - PW); g.py = R.H[1]; g.press(); g.release();
  for (let i = 0; i < 240 && g.fk.T === 0; i++) step(g); assert.equal(g.fk.T, 1, "lands on top from above");
  g.duck = true; let t0 = 0; for (let i = 0; i < 240 && g.py > 0; i++) { step(g); t0++ } assert.equal(g.py, 0); assert.ok(t0 / 240 < 0.13 * Math.sqrt(R.H[1] / 40), "fast fall " + t0 / 240);
  g.duck = false; R.calls.reset(d.x0 + 0.6 * f - PX - PW); g.duck = true; g.press(); g.release(); for (let i = 0; i < 240; i++) { step(g); assert.equal(g.fk.T, 0, "never lands while ducking") } g.duck = false;
  R.calls.reset(d.x0 + 0.6 * f - PX - PW); g.py = R.H[1] - 5; for (let i = 0; i < 3; i++) step(g); assert.equal(g.fk.T, 1, "ledge assist from 5 px under the top");
  // jump buffer: press 100 ms before landing on the deck -> jumps on touch-down
  R.calls.reset(d.x0 + 0.6 * f - PX - PW); g.py = R.H[1] + 40; let jumped = false, down = false;
  for (let i = 0; i < 240; i++) { if (!down && g.vy < 0 && g.py - R.H[1] < -g.vy * 0.08) { down = true; g.press() } step(g); if (down && g.fk.T === 0 && g.vy > 300) { jumped = true; break } }
  assert.ok(jumped, "buffered press jumps off the deck");
});
t("hooks: sfxPlatLand(tier) on each deck landing (1 and 2), sfxCombo(2) once for a clean floor -> tier 1 -> tier 2 -> merge, none after a drop or a hit; never in demo", () => {
  const R = rig(700, 1, 1, 5), g = R.g, d = R.d1, u = R.d2, f = 700 * g.vMul();
  R.calls.reset(d.x0 - 1.2 * f - PX - PW); let k = 0;
  for (let i = 0; i < 240 * 10; i++) { g.speed = 700; const fr = g.hsc + PX + PW; if (!k && fr >= d.x0 + 0.4 * f) { k = 1; tap(g) } if (k === 1 && g.fk.T === 1 && fr >= u.x0 + 0.3 * f) { k = 2; tap(g) } step(g); if (k === 2 && g.hsc > u.xm + 200) break }
  assert.deepEqual(R.calls.plat, [1, 2]); assert.deepEqual(R.calls.combo, [2]);
  R.calls.plat.length = 0; R.calls.combo.length = 0; R.calls.reset(d.x0 - 1.2 * f - PX - PW); k = 0;
  for (let i = 0; i < 240 * 10; i++) { g.speed = 700; const fr = g.hsc + PX + PW; if (!k && fr >= d.x0 + 0.4 * f) { k = 1; tap(g) } if (k === 1 && g.fk.T === 1 && fr >= u.x0 + 0.3 * f) { k = 2; tap(g) }
    if (k === 2 && g.fk.T === 2 && fr > u.x0 + 1.5 * f && fr < u.x0 + 1.6 * f) g.inv = 1; step(g); if (k === 2 && g.hsc > u.xm + 200) break }
  assert.deepEqual(R.calls.combo, [], "a hit (inv) breaks the clean run");
  const D = game({ gaps: true, fork: true, demo: true, rand: rng(4), hi: 500, realLv: true }); D.g.start();
  for (let i = 0; i < 240 * 120; i++) { D.g.update(DT); D.g.now += 4 } assert.equal(D.calls.plat.length + D.calls.combo.length + D.calls.warn.filter((w) => w[2] === "fork").length, 0, "never in demo");
  assert.equal(D.g.state, "run", "the demo autopilot survives 120 s");
});
t("platNear(x0,x1) (Levels #91 chaser roller): world px, first deck span overlapping the range as exactly {x0,x1,tier} or null; argument order free; ?fork=0 null", () => {
  const R = rig(620, 1, 1), g = R.g, d = R.d1, u = R.d2, near = g.fk.near;
  assert.deepEqual(Object.keys(near(d.x0 + 10, d.x0 + 20)).sort(), ["tier", "x0", "x1"]);
  assert.deepEqual(near(d.x0 + 10, d.x0 + 20), { x0: d.x0, x1: d.xm, tier: 1 }, "inside tier 1");
  assert.deepEqual(near(d.x0 + 20, d.x0 + 10), { x0: d.x0, x1: d.xm, tier: 1 }, "reversed arguments");
  assert.deepEqual(near(d.x0 - 300, d.x0 + 1), { x0: d.x0, x1: d.xm, tier: 1 }, "overlaps the entry edge");
  assert.deepEqual(near(u.x0 + 5, u.x0 + 50), { x0: d.x0, x1: d.xm, tier: 1 }, "over both tiers: the first (lowest x0) span");
  assert.deepEqual(near(d.xm + 1, d.xm + 40), { x0: u.x0, x1: u.xm, tier: 2 }, "past tier 1's merge, only tier 2");
  assert.equal(near(d.x0 - 500, d.x0), null, "ends at the entry edge: no overlap");
  assert.equal(near(u.xm, u.xm + 500), null, "starts at the last merge: no overlap");
  assert.equal(near(-1e9, -1e9 + 10), null);
  const S = rig(620, 1, 0); assert.deepEqual(S.g.fk.near(S.d1.x0, S.d1.xm), { x0: S.d1.x0, x1: S.d1.xm, tier: 1 }, "single deck");
  const { g: off } = game({ gaps: true, fork: true, q: { fork: "0" }, level: 4, rand: rng(9), hi: 500 }); off.start(); step(off, 10);
  assert.equal(off.fk.near(-1e9, 1e9), null, "?fork=0");
  const { g: nf } = game({ gaps: true, rand: rng(9), hi: 500 }); assert.equal(nf.fk, null, "no 06l: the guarded typeof check is what #91 uses");
});
t("rewards: a deck pays sparks only (no power-ups up there), riding it collects every deck spark (live loop, " + "5/5-style), not magnet-pulled from below; upper route ~1.5x the floor's spark rate", () => {
  const rows = [];
  for (const [fv, sp, m] of FELT) for (const t2 of [0, 1]) {
    const R = rig(sp, m, t2), g = R.g, d = R.d1, u = R.d2, f = sp * g.vMul();
    const deckSp = () => g.ents.filter((e) => e.fk);
    assert.ok(!g.ents.some((e) => e.t === "u" && e.bot >= 40), "no pickups on a deck");
    for (const tier of t2 ? [1, 2] : [1]) {
      const R2 = rig(sp, m, t2), g2 = R2.g, q = tier === 2 ? R2.d2 : R2.d1; const all = g2.ents.filter((e) => e.fk && e.dk === tier).length;
      R2.calls.reset(R2.d1.x0 - 1.2 * f - PX - PW); g2.ents = []; R2.calls.force(t2); /* re-place the same fork's sparks */
      const q2 = g2.fk.decks.find((x) => x.t === tier); const n0 = g2.ents.filter((e) => e.fk && e.dk === tier).length; let k = 0; const e0 = R2.calls.spark;
      for (let i = 0; i < 240 * 10; i++) { g2.speed = sp; const fr = g2.hsc + PX + PW; if (!k && fr >= q2.x0 + 0.1 * f - (tier === 2 ? 0 : 0) && (tier === 1 || g2.fk.T === 1)) { k = 1; tap(g2) }
        if (tier === 2 && !k && g2.fk.T === 0 && fr >= R2.g.fk.decks[0].x0 + 0.2 * f) { tap(g2) } step(g2); if (g2.hsc > q2.xm) break }
      const left = g2.ents.filter((e) => e.fk && e.dk === tier).length;
      assert.equal(left, 0, `felt ${fv} tier ${tier}: ${left}/${n0} deck sparks not collected by riding it`);
    }
    const route = ((t2 ? u.xm : d.xm) - d.x0) / f, nUp = t2 ? g.ents.filter((e) => e.fk && e.dk === 1 && e.x + g.hsc < u.x0).length + u.ns : d.ns;
    rows.push({ felt: fv, set: !!t2, t1_sparks: d.ns, t2_sparks: t2 ? u.ns : 0, route_s: +route.toFixed(2), up_rate: +(nUp / route).toFixed(2) });
  }
  // the floor's own rate (sparks spawned per s at L3-L5, forks off), as measured for FK.sr
  let n = 0, T = 0; for (let s = 1; s <= 6; s++) { const { g } = game({ gaps: true, fork: true, q: { fork: "0" }, realLv: true, rand: rng(50 + s), hi: 500 }); g.start(); const seen = new WeakSet();
    for (let i = 0; i < 240 * 125 && g.state === "run"; i++) { g.inv = 1e9; g.auto(); step(g); if (g.level < 3) continue; T += DT; for (const e of g.ents) if (e.t === "k" && !seen.has(e)) { seen.add(e); n++ } } }
  const fl = n / T; for (const r of rows) r.x_floor = +(r.up_rate / fl).toFixed(2);
  console.table(rows); console.log("     floor spark rate L3-L5: " + fl.toFixed(3) + " /s");
  const xs = rows.map((r) => r.x_floor), mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(mean >= 1.3 && mean <= 1.7, "upper route x floor rate " + mean.toFixed(2));
});
t("optional route (P, rule 10): the autopilot that never goes up (ducks off any deck) survives as well as with ?fork=0 (+-1 %), real levels, 40 seeds x 130 s", () => {
  const surv = (fork) => { let tot = 0;
    for (let s = 1; s <= SURV; s++) { const { g } = game({ gaps: true, fork: true, q: fork ? {} : { fork: "0" }, realLv: true, rand: rng(300 + s), hi: 500 }); g.start(); g.cores = 0;
      for (let i = 0; i < 240 * 130 && g.state === "run"; i++) { g.auto(); if (g.fk && g.fk.T) g.duck = true; step(g) } tot += g.runS }
    return tot / SURV };
  const a = surv(true), b = surv(false);
  console.log("     mean survival: ground-only with forks " + a.toFixed(2) + " s, ?fork=0 " + b.toFixed(2) + " s (" + ((a / b - 1) * 100).toFixed(2) + " %)");
  assert.ok(a >= b * 0.99, "the floor got harder: " + a.toFixed(2) + " vs " + b.toFixed(2));
});
t("composes: ?hills=0 (flat), ?gaps=0, RESCUE first runs (forks are L3+); no L5 fork until CRUSHER DOWN; gaps never inside a fork zone (gpRej.fork counted)", () => {
  for (const env of [{ hills: false }, { q: { gaps: "0" } }]) { const { g } = game({ gaps: true, fork: true, realLv: true, rand: rng(8), hi: 500, ...env }); g.start(); let up = 0;
    for (let i = 0; i < 240 * 110 && g.state === "run"; i++) { g.auto(); g.inv = 1e9; step(g); if (g.fk.T) up++ }
    assert.ok(g.fk.log.length > 0 && up > 0, JSON.stringify(env) + ": forks placed and ridden") }
  const { g } = game({ gaps: true, fork: true, realLv: true, rand: rng(8), hi: 0 }); g.start(); for (let i = 0; i < 240 * 20 && g.state === "run"; i++) { g.auto(); step(g) }
  assert.equal(g.fk.log.length, 0, "no fork in a rescue (first run) start");
  // LEVELS-5 crusher (06h): no fork at L5 while the boss is pending or on (crS < 7), one again after CRUSHER DOWN (crS 7)
  for (const [cs, want] of [[0, 0], [3, 0], [7, 1]]) {
    const { g, calls } = game({ gaps: true, fork: true, level: 5, rand: rng(9), hi: 500, post: POST + `;var crS=${cs};function crOn(){return crS>=1&&crS<=6}` });
    g.start(); g.runS = 30; g.speed = 620; step(g, 2); g.ents = []; calls.force(0);
    assert.equal(g.fk.decks.length, want, "crusher crS " + cs + ": " + g.fk.decks.length + " decks");
  }
});
console.log("fork: " + pass + " passed (" + nDeck + " decks in the geometry pass)");
