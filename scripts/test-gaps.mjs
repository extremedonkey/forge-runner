// GAPS tests (06k-gaps.js: holes in the ground, research D1-D3 / §5). Real 06-state + 06b-sparks + 06h-rescue + 06i-hills +
// 06k-gaps + 11-gameflow + 13-simulation via scripts/lib/hills-harness.mjs (gaps:true), 1/240 s sub-steps (as 16-loop.js).
// Run: node scripts/test-gaps.mjs   (npm test runs it from scripts/test-build.mjs)
import assert from "node:assert/strict";
import GAPS from "../src/client/06k-gaps.js";
import SIM from "../src/client/13-simulation.js";
import RENDER from "../src/client/14-render.js";
import FLOW from "../src/client/11-gameflow.js";
import { game, rng } from "./lib/hills-harness.mjs";
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   gaps:", name); };
const DT = 1 / 240, PX = 56, PW = 45, DF = 0.689;
const step = (g, n = 1) => { for (let i = 0; i < n && g.state === "run"; i++) { g.now += DT * 1000; g.update(DT) } };
// Levels #78 table (06d GAP_LV) and a stress table: every level at the 0.65 cap, a gap every slot, minimum spacing
const LV78 = [
  { wMin: .20, wMax: .25, minClear: 2.0, chanceMin: 0, chance: .10, noGapBefore: 12 }, { wMin: .25, wMax: .35, minClear: 1.6, chanceMin: .15, chance: .15, noGapBefore: 0 },
  { wMin: .30, wMax: .45, minClear: 1.3, chanceMin: .20, chance: .20, noGapBefore: 0 }, { wMin: .40, wMax: .55, minClear: 1.0, chanceMin: .25, chance: .25, noGapBefore: 0 },
  { wMin: .45, wMax: .60, minClear: .85, chanceMin: .30, chance: .30, noGapBefore: 0 }];
const STRESS = [1, 2, 3, 4, 5].map(() => ({ wMin: .65, wMax: .65, minClear: .85, chanceMin: 1, chance: 1, noGapBefore: 0 }));
const LVM = [.85, .92, .95, 1, 1.053], LVS = [340, 480, 600, 700, 760];
// a player run: the real autopilot (auto(): obstacles + gpAuto) on a non-demo run, hazards ignored (inv) so only gaps can end it
function play(env, sec, pre) {
  const r = game({ gaps: true, hi: 500, ...env }); const { g } = r; g.start(); if (pre) pre(g);
  for (let i = 0; i < sec * 240 && g.state === "run"; i++) { g.auto(); g.inv = 1e9; step(g) }
  return r;
}
const TAPF = 0.45, TAPD = 2 * 380 / 1800;   // a pure tap jump (CUT 380, G 1800) = 0.422 s of felt travel
let tapMin = 9, warnMin = 9; const tapLv = [9, 9, 9, 9, 9];
const curv =(g, x) => g.gpc(x);
function checkGaps(g, calls, n, tab, label) {
  const log = g.gp.log, f0 = [];
  for (let i = 0; i < log.length; i++) {
    const q = log[i], T = tab ? tab[q.lv - 1] : null, w = q.x1 - q.x0;
    assert.ok(q.p <= 0.65 + 1e-9, label + " cap " + q.p);
    assert.ok(Math.abs(w - q.p * DF * q.f) < 0.01, label + " width = p x Dfull at the lip");
    assert.ok(w <= TAPF * TAPD * q.f + 0.01, label + " width " + w.toFixed(1) + " > .45 of a tap jump " + (TAPF * TAPD * q.f).toFixed(1));
    assert.ok(q.h1 <= q.h0 + 1e-9, label + " far edge higher than the near edge: " + q.h0 + " -> " + q.h1);
    assert.ok(q.win >= 0.2, label + " full-jump window " + q.win + " s < 0.2");
    assert.ok(q.tap >= 0.1 - 1e-9, label + " single-tap window " + q.tap + " s < 0.10");
    tapMin = Math.min(tapMin, q.tap); tapLv[q.lv - 1] = Math.min(tapLv[q.lv - 1], q.tap);
    if (q.lv === 1) assert.ok(q.t >= 12 - 1e-9, label + " L1 gap before 12 s (" + q.t + ")");
    if (q.lv < 4) assert.ok((curv(g, q.x0) - curv(g, q.x0 - 30)) / 30 <= 0.04 + 1e-9, label + " uphill lip below L4");
    for (let u = q.x0 - 160; u <= q.x0 + 10; u += 10) { const k = (curv(g, u + 10) - 2 * curv(g, u) + curv(g, u - 10)) / 100; assert.ok(-k * q.f * q.f <= 1800 * g.hl.HL.cr, label + " lip in the crest-launch zone") }
    if (i) { const p = log[i - 1];
      assert.ok((q.x0 - p.x1) / q.f >= 0.85 - 1e-6, label + " < 0.85 s between required jumps: " + ((q.x0 - p.x1) / q.f).toFixed(3));
      if (T) assert.ok((q.x0 - p.x1) / q.f >= T.minClear - 1e-6, label + " minClear " + T.minClear + " vs " + ((q.x0 - p.x1) / q.f).toFixed(3)) }
    const w1 = calls.warn.filter((c) => c[0] === q.key);
    if (q.x0 < g.hsc + PX + PW) assert.ok(w1.length > 0, label + " edgeWarn never called for " + q.key);
    if (w1.length) { warnMin = Math.min(warnMin, w1[0][1]); assert.ok(w1[0][1] >= 0.9, label + " edgeWarn lead " + w1[0][1].toFixed(3) + " s < 0.9"); assert.equal(w1[0][2], "gap"); assert.equal(w1[0][3], "R");
      for (let j = 1; j < w1.length; j++) assert.ok(w1[j][1] <= w1[j - 1][1] + 1e-9, "tti counts down") }
  }
  assert.ok(log.filter((q) => q.lv === 1).length <= 3, label + " > 3 gaps on L1");
  return log.length;
}

t("GAPS_ON flag: on by default, ?gaps=0 turns it off (no gaps in 150 s), and tpu runs have none", () => {
  assert.match(GAPS, /var GAPS_ON=true;/);
  const a = play({ rand: rng(1), level: "time" }, 150).g; assert.equal(a.gp.on, true); assert.ok(a.gp.n > 0, "gaps appear");
  const b = play({ rand: rng(1), level: "time", q: { gaps: "0" } }, 150).g; assert.equal(b.gp.on, false); assert.equal(b.gp.n, 0); assert.equal(b.state, "run");
});
t("speed/scroll/score/runS lines byte-identical; 06k never writes them; no Math.random / backticks / ${} in 06k; 4 guarded hooks in 13, 1 in 14", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM.split(l).length - 1, 1, l.trim());
  const b = GAPS.slice(1, -1);
  assert.deepEqual(b.split("\n").filter((l) => /(^|[;{(\s,])(speed|score|runS|scroll)(\+=|-=|=(?!=))/.test(l)), []);
  assert.ok(!/Math\.random|`|\$\{/.test(b));
  for (const h of ['typeof gpSpawn==="function"&&gpSpawn(gp0,x,w);', 'if(typeof gpAuto==="function"&&gpAuto())wantJump=true;', 'if(typeof gpTick==="function"&&gpTick(dt))return;']) assert.equal(SIM.split(h).length - 1, 1, h);
  assert.equal(RENDER.split('typeof gpDraw==="function"&&gpDraw();').length - 1, 1);
});
t("same Math.random stream: rand calls / score / runS / speed identical with gaps on and off (gap = a replaced spawn slot, own LCG)", () => {
  for (const s of [1, 2, 3]) {
    const tr = (gaps) => { const { g, calls } = game({ gaps, rand: rng(s), hi: 500, level: "time" }); g.start(); const o = []; let first = -1;
      for (let i = 0; i < 240 * 150 && g.state === "run"; i++) { g.auto(); g.inv = 1e9; step(g); if (gaps && first < 0 && g.gp.n) first = i; o.push(g.runS + "|" + g.score + "|" + g.speed + "|" + g.scroll) }
      return { o, first, calls }; };
    const a = tr(true), b = tr(false);
    assert.ok(a.first > 0);
    assert.equal(a.o.slice(0, a.first).join("\n"), b.o.slice(0, a.first).join("\n"), "identical up to the first gap");
    assert.equal(a.o.length, b.o.length); assert.equal(a.o.join("\n"), b.o.join("\n"), "score/runS/speed/scroll never depend on gaps");
  }
});
let total = 0;
t("seed x level sweep (default table, #78 table; hills on/off; 24 seeds x 150 s): cap, L1 >= 12 s and <= 3, separation >= 0.85 s and minClear, edgeWarn lead >= 0.9 s, no crest lip, uphill only L4+, full window >= 0.2 s, every gap cleared", () => {
  for (const [tab, nm] of [[null, "default"], [LV78, "#78"]]) for (const hills of [true, false]) for (let s = 1; s <= 6; s++) {
    const { g, calls } = play({ rand: rng(100 + s), level: "time", gapTab: tab || undefined, hills }, 150);
    assert.equal(g.state, "run", nm + " hills " + hills + " seed " + s + ": the autopilot fell at " + g.runS.toFixed(2));
    total += checkGaps(g, calls, null, tab || null, nm + "/" + hills + "/" + s);
    assert.equal(calls.fall, 0);
  }
  assert.ok(total > 150, "gaps placed: " + total);
});
t("stress (every slot a gap at the 0.65 cap, minClear 0.85) at each level's speed and lvSpeedMul (L1 .85 @340 .. L5 1.053 @760->800 cap), 4 seeds: all clearable and cleared", () => {
  for (let lv = 1; lv <= 5; lv++) for (let s = 1; s <= 4; s++) {
    const { g, calls } = play({ rand: rng(s * 7 + lv), level: lv, gapTab: STRESS, lvMul: LVM[lv - 1] }, 40, (g) => { g.speed = LVS[lv - 1] });
    assert.equal(g.state, "run", "L" + lv + " seed " + s + " fell");
    const n = checkGaps(g, calls, lv, STRESS, "stress L" + lv + "/" + s); assert.ok(n >= (lv === 1 ? 3 : 10), "L" + lv + " gaps " + n);
    if (lv === 1) assert.equal(n, 3);
  }
});
// real update() take-off sweep: the first gap of a run, jump (full hold) when the front is d s (felt) before the lip; every
// other input is the autopilot. A gap passes when the surviving take-offs span >= 0.2 s (phone margin).
const sweepRes = [];
t("real update() take-off sweep per level (stress widths, 0.65 cap): >= 0.2 s of successful full-jump take-off times", () => {
  for (let lv = 1; lv <= 5; lv++) for (const hills of [true, false]) {
    const ok = [];
    for (let d = 0.8; d >= -0.1; d -= 0.01) {
      const post = `var __d=${d.toFixed(2)},__j=0;gpAuto=function(){var g=gpLog[0];if(!g||__j)return false;var f=speed*vMul();if(g.x0-(hsc+PX+PW)<=__d*f){__j=1;return true}return false};`;
      const { g } = game({ gaps: true, hi: 500, rand: rng(lv), level: lv, gapTab: STRESS, lvMul: LVM[lv - 1], hills, post }); g.start(); g.speed = LVS[lv - 1];
      let held = 0;
      for (let i = 0; i < 240 * 25 && g.state === "run"; i++) {
        const q = g.gp.log[0]; if (q && g.hsc + PX > q.x1 + 40 && g.py === 0) break;
        g.inv = 1e9; g.ents = g.ents.filter((e) => e.t === "k"); g.auto(); step(g);
        if (q && !held && g.vy > 0) { g.press(); held = 1 }  // hold the jump (no early release)
      }
      if (g.state === "run" && g.gp.log[0]) ok.push(+d.toFixed(2));
    }
    let run = 0, best = 0; for (let i = 0; i < ok.length; i++) { run = i && Math.abs(ok[i - 1] - ok[i] - 0.01) < 1e-6 ? run + 0.01 : 0.01; best = Math.max(best, run) }
    sweepRes.push({ lv, hills, window: +best.toFixed(2), from: ok[0], to: ok[ok.length - 1] });
    assert.ok(best >= 0.2 - 1e-9, "L" + lv + " hills " + hills + ": real take-off window " + best.toFixed(2));
  }
  console.log("     take-off windows (s):", sweepRes.map((r) => "L" + r.lv + (r.hills ? "h" : "f") + " " + r.window + " [" + r.from + ".." + r.to + "]").join(", "));
});
// single tap: press + release on the next frame (a pure tap, vy cut to CUT). Felt speed = 760 (L5 cap) and 874 (downhill/boost), 60 and 240 fps.
const tapRes = [];
t("real update() single-tap take-off sweep per level (stress widths): window >= 0.10 s at felt 760 / 874, 60 / 240 fps, hills on/off", () => {
  for (let lv = 1; lv <= 5; lv++) for (const felt of [760, 874]) for (const fps of [60, 240]) for (const hills of [true, false]) {
    const dt = 1 / fps, ok = [];
    for (let d = 0.8; d >= -0.1; d -= 0.01) {
      const post = `var __d=${d.toFixed(2)},__j=0;gpAuto=function(){var g=gpLog[0];if(!g||__j)return false;var f=speed*vMul();if(g.x0-(hsc+PX+PW)<=__d*f){__j=1;return true}return false};`;
      const { g } = game({ gaps: true, hi: 500, rand: rng(lv), level: lv, gapTab: STRESS, lvMul: felt / 760, hills, post }); g.start(); g.speed = 760;
      let tapped = 0;
      for (let i = 0; i < fps * 25 && g.state === "run"; i++) {
        const q = g.gp.log[0]; if (q && g.hsc + PX > q.x1 + 40 && g.py === 0) break;
        g.inv = 1e9; g.ents = g.ents.filter((e) => e.t === "k"); g.auto(); g.now += dt * 1000; g.update(dt);
        if (q && !tapped && g.vy > 0) { g.release(); tapped = 1 }
      }
      if (g.state === "run" && g.gp.log[0]) ok.push(+d.toFixed(2));
    }
    let run = 0, best = 0; for (let i = 0; i < ok.length; i++) { run = i && Math.abs(ok[i - 1] - ok[i] - 0.01) < 1e-6 ? run + 0.01 : 0.01; best = Math.max(best, run) }
    tapRes.push({ lv, felt, fps, hills, window: +best.toFixed(2) });
    assert.ok(best >= 0.1 - 1e-9, "L" + lv + " felt " + felt + " " + fps + " fps hills " + hills + ": real tap window " + best.toFixed(2));
  }
  console.log("     tap windows (s) min per level:", [1, 2, 3, 4, 5].map((l) => "L" + l + " " + Math.min(...tapRes.filter((r) => r.lv === l).map((r) => r.window)).toFixed(2)).join(", "));
});
t("gapNear(x0,x1) (public, world px): first gap overlapping the span as {x0,x1}, else null; null with ?gaps=0; edgeWarnDraw() guarded last in drawEnts", () => {
  const { g } = game({ gaps: true, hi: 500, rand: rng(4), level: 3, gapTab: STRESS }); g.start();
  for (let i = 0; i < 240 * 30 && g.state === "run" && !g.gp.gaps.some((q) => q.x0 > g.hsc); i++) { g.auto(); g.inv = 1e9; step(g) }
  const r0 = g.gp.gaps.find((q) => q.x0 > g.hsc); assert.ok(r0, "a real pending gap"); g.gp.gaps.splice(0, g.gp.gaps.length, r0, { x0: r0.x1 + 400, x1: r0.x1 + 520, h0: 0, h1: 0, p: .3, f: 400, lv: 3, key: "t2" });
  const gs = g.gp.gaps;
  const [a, b] = gs;
  assert.deepEqual(g.gapNear(a.x0 - 50, a.x0 + 1), { x0: a.x0, x1: a.x1 }); assert.deepEqual(g.gapNear(a.x1 - 1, b.x0 + 1), { x0: a.x0, x1: a.x1 }, "first one");
  assert.deepEqual(g.gapNear(a.x0 + 5, a.x0 + 6), { x0: a.x0, x1: a.x1 }, "inside"); assert.deepEqual(g.gapNear(b.x0 + 2, a.x1 - 2), { x0: a.x0, x1: a.x1 }, "reversed args");
  assert.equal(g.gapNear(a.x0 - 50, a.x0), null, "touching the lip is not overlapping"); assert.equal(g.gapNear(a.x1, b.x0), null, "the ground between");
  assert.deepEqual(g.gapNear(b.x0 - 1, b.x0 + 1), { x0: b.x0, x1: b.x1 });
  const r = g.gapNear(a.x0, a.x1); r.x0 = 0; assert.equal(gs[0].x0, a.x0, "returns a copy");
  const off = play({ rand: rng(4), level: 3, gapTab: STRESS, q: { gaps: "0" } }, 6).g; assert.equal(off.gapNear(-1e9, 1e9), null);
  const i1 = RENDER.indexOf('typeof enDrawAfter==="function"&&enDrawAfter();'), i2 = RENDER.indexOf('typeof edgeWarnDraw==="function"&&edgeWarnDraw();');
  assert.ok(i1 > 0 && i2 > i1 && RENDER.split("edgeWarnDraw()").length === 2);
  assert.ok(/typeof edgeWarn==="function"&&edgeWarn\(/.test(GAPS) && !/[^.\w"]edgeWarn\((?![^)]*\)\s*\{)/.test(GAPS.replace(/typeof edgeWarn==="function"&&edgeWarn\(/g, "")), "edgeWarn only typeof-guarded");
});
t("near miss: sfxNearMiss() once for a gap cleared within 12 px of a lip (late take-off) and for a crate cleared within 12 px; never for a comfortable clear, a hit, or in demo", () => {
  const run = (d, demo = false) => { const post = `var __d=${d},__j=0;gpAuto=function(){var g=gpLog[0];if(!g||__j)return false;var f=speed*vMul();if(g.x0-(hsc+PX+PW)<=__d*f){__j=1;return true}return false};`;
    const { g, calls } = game({ gaps: true, hi: 500, rand: rng(2), level: 3, gapTab: STRESS, post, demo }); g.start(); g.speed = 600;
    for (let i = 0; i < 240 * 20 && g.state === "run"; i++) { const q = g.gp.log[0]; if (q && g.hsc + PX > q.x1 + 60 && g.py === 0) break; g.inv = 1e9; g.ents = g.ents.filter((e) => e.t === "k"); g.auto(); step(g) }
    return { g, calls, q: g.gp.log[0] }; };
  const late = run(0.01); assert.equal(late.g.state, "run"); assert.ok(late.q.to <= 12, "take-off margin " + late.q.to); assert.equal(late.calls.nm, 1, "late take-off = near miss, once");
  const mid = run(late.q.mid); assert.equal(mid.g.state, "run"); assert.ok(mid.q.to > 12 && mid.q.ld > 12, "comfortable: " + mid.q.to + "/" + mid.q.ld); assert.equal(mid.calls.nm, 0);
  // crates: a single crate ahead, jump at a sweep of times; near miss iff passed unhit with <= 12 px clearance, once each
  let seen = 0, clean = 0;
  for (let k = 0; k < 40; k++) {
    const { g, calls } = game({ gaps: true, q: { gaps: "0" }, hi: 500, rand: rng(3), hills: false }); g.start(); g.puNext = 1e9; g.nextGap = 1e9; g.ents = [{ x: 400, w: 30, h: 21, bot: 0, t: "b", v: 0 }];
    const c = g.ents[0]; let hitSeen = false;
    for (let i = 0; i < 240 * 2 && g.state === "run"; i++) { if (i === 40 + k * 2) g.press(); if (i === 40 + k * 2 + 60) g.release(); g.inv = 0; g.shd = 9; step(g); if (g.shd < 9) { hitSeen = true; g.shd = 9 } if (c.x + c.w < 0) break }
    if (c.nmD == null) continue;
    assert.equal(calls.nm, !hitSeen && c.nmD <= 12 ? 1 : 0, "k " + k + " d " + c.nmD + " hit " + hitSeen); seen += calls.nm; if (!hitSeen && c.nmD > 12) clean++;
  }
  assert.ok(seen >= 1 && clean >= 1, "both near misses and clean clears in the sweep: " + seen + "/" + clean);
  assert.equal(run(0.01, true).calls.nm, 0, "never in demo");
});
t("no gaps while lvGapsBlocked(); none on L1 before 12 s with the default table", () => {
  const { g } = play({ rand: rng(5), level: "time", blocked: () => true }, 150); assert.equal(g.gp.n, 0);
  for (let s = 1; s <= 8; s++) { const r = play({ rand: rng(s), level: 1, gapTab: [{ ...STRESS[0], noGapBefore: 12 }] }, 30).g; assert.ok(r.gp.log.every((q) => q.t >= 12)); assert.ok(r.gp.n >= 1 && r.gp.n <= 3) }
});
function fallRun(pre) {
  const { g, calls } = game({ gaps: true, hi: 500, rand: rng(3), level: 3, gapTab: STRESS }); g.start(); pre && pre(g);
  const tr = []; let fellAt = -1, dieAt = -1;
  for (let i = 0; i < 240 * 20 && g.state === "run"; i++) { g.ents = g.ents.filter((e) => e.t === "k"); const f0 = calls.fall; step(g); if (calls.fall > f0 && fellAt < 0) fellAt = i; if (g.state !== "run" && dieAt < 0) dieAt = i; tr.push([g.runS, g.score]) }
  return { g, calls, fellAt, dieAt, tr };
}
t("no jump -> falls in: sfxGapFall once, before die(); a shield (pickup or Plate) does NOT save you; inv does not either", () => {
  const a = fallRun(); assert.equal(a.g.state, "over"); assert.equal(a.calls.fall, 1); assert.ok(a.fellAt >= 0 && a.fellAt < a.dieAt);
  const b = fallRun((g) => { g.shd = 1 }); assert.equal(b.g.state, "over", "shield must not save"); assert.equal(b.calls.fall, 1);
  const c = fallRun((g) => { g.inv = 1e9 }); assert.equal(c.g.state, "over", "inv must not save");
});
t("die(): Audio's sfxDeath() when present (ducks only the crash after a gap fall), the old inline crash as the fallback", () => {
  assert.ok(FLOW.includes('if(snd&&AU){if(typeof sfxDeath==="function")sfxDeath();else{noise(AU,ac.currentTime,.4,.25,.25);sfx(520,60,.45,2,.09)}}'));
  const ev = (withDeath) => { const log = []; const f = new Function("log", "var snd=true,AU={},ac={currentTime:0};function noise(){log.push('noise')}function sfx(){log.push('sfx')}" + (withDeath ? "function sfxDeath(){log.push('death')}" : "") +
    FLOW.match(/if\(snd&&AU\)\{if\(typeof sfxDeath[^\n]*/)[0]); f(log); return log.join() };
  assert.equal(ev(true), "death"); assert.equal(ev(false), "noise,sfx");
});
t("Spare Core revives on the far edge: grounded past the hole, core spent, survives >= 2 s, score/runS keep counting (never skipped)", () => {
  const r = fallRun((g) => { g.cores = 1 });
  assert.equal(r.calls.fall >= 1, true);
  const g = r.g; assert.equal(g.cores, 0, "core spent");
  // it lived past the revive: the run went on (20 s cap or the next gap), at least 2 s after the fall
  assert.ok((r.dieAt < 0 ? r.tr.length : r.dieAt) - r.fellAt >= 240 * 2, "survived >= 2 s after the revive");
  for (let i = 1; i < r.tr.length; i++) { const ds = r.tr[i][1] - r.tr[i - 1][1]; assert.ok(ds >= 0 && ds < 2, "score never jumps at the revive") }
  const q = g.gp.log[0]; assert.ok(q && g.hsc + PX > q.x1, "past the far edge");
  assert.equal(r.calls.reboot, 1, "sfxReboot() once at the revive (via skReboot)");
});
t("demo autopilot: clears every gap (150 s, 8 seeds, hills on/off) and is deterministic; no warnings / fall sfx in demo", () => {
  for (const hills of [true, false]) for (let s = 1; s <= 8; s++) {
    const run = () => { const { g, calls } = game({ gaps: true, demo: true, hills, rand: rng(s), hi: 500, level: "time" }); for (let i = 0; i < 240 * 150; i++) { g.now += DT * 1000; g.update(DT); if (g.state !== "run") break }
      return { g, calls, sig: g.gp.log.map((q) => q.key + q.x0.toFixed(3) + q.x1.toFixed(3)).join() + "|" + g.score + "|" + g.runS }; };
    const a = run(), b = run();
    assert.equal(a.g.state, "run", "demo fell, hills " + hills + " seed " + s + " at " + a.g.runS.toFixed(2)); assert.ok(a.g.gp.n > 4);
    assert.equal(a.sig, b.sig, "deterministic"); assert.equal(a.calls.warn.length, 0); assert.equal(a.calls.fall, 0);
  }
});
t("?hills=0 with gaps: flat ground, gaps still placed and cleared (hsc runs: hlAct)", () => {
  const { g, calls } = play({ rand: rng(9), level: "time", q: { hills: "0" } }, 150); assert.equal(g.hl.on, false); assert.equal(g.state, "run"); assert.ok(g.gp.n > 5); checkGaps(g, calls, null, null, "hills=0");
});
t("06h RESCUE composes: rescue runs still bounce and finish with gaps on", () => {
  const store = new Map();
  for (let r = 0; r < 3; r++) { const { g } = game({ gaps: true, rand: rng(20 + r), hi: 0, store, level: "time" }); g.start(); for (let i = 0; i < 240 * 30 && g.state === "run"; i++) { g.auto(); step(g) } assert.ok(g.runS > 3) }
});
console.log("     gpWin tap window min (s) per level:", tapLv.map((v, i) => "L" + (i + 1) + " " + v).join(", "), "; min edgeWarn lead (s):", warnMin.toFixed(3));
console.log(`gaps: ${pass} passed (${total} gaps in the sweep)`);
