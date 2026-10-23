// First-run rescue tests (06h-rescue.js; revenue-two-changes-2026-10-24.md §4 acceptance + product-owner additions).
// Real 06-state + 06b-sparks + 06h-rescue + 11-gameflow + 13-simulation via scripts/lib/sim-harness.mjs, 1/240 s sub-steps.
// Run: node scripts/test-rescue.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import RESCUE from "../src/client/06h-rescue.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
import LB from "../src/client/15-leaderboard.js";
import { game, rng } from "./lib/sim-harness.mjs";
const SRC = { state: STATE, sparks: SPARKS, rescue: RESCUE, flow: FLOW, sim: SIM };
const NO_RESCUE = { ...SRC, rescue: null };
const RK = "forge-runner-rescue";
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   rescue:", name); };
const DT = 1 / 240;
const saved = (n, h = 1) => new Map([[RK, JSON.stringify({ n, h })]]);
// step until f() or state leaves "run" or sec elapsed (real seconds = steps * DT)
function run(g, sec, f) { for (let i = 0; i < sec / DT && g.state === "run"; i++) { g.now += DT * 1000; g.update(DT); if (f && f(i * DT)) return true } return false }
// times (runS) at which each crate first reaches the buggy's front edge, with a perfect jumper (the demo autopilot logic)
function arrivals(g, sec, jump = true) {
  const seen = new Set(), out = [];
  run(g, sec, () => {
    if (jump) g.auto();
    for (const e of g.ents) if (e.t !== "k" && e.t !== "u" && !seen.has(e) && e.x <= g.PX + g.PW) { seen.add(e); out.push(+g.runS.toFixed(3)) }
    return false;
  });
  return out;
}
// the leaderboard API ceiling (340 -> 760 px/s at +7/s, score = speed * 0.05 per second)
const nFor = (d) => d <= 60 ? 0.05 * (340 * d + 3.5 * d * d) : 0.05 * (340 * 60 + 3.5 * 3600 + 760 * (d - 60));

t("RESCUE_V is a number (1), rescue is on in normal runs and off in ?demo=1", () => {
  assert.equal(game({ src: SRC }).g.rs.V, 1); assert.equal(game({ src: SRC }).g.rs.on, true);
  assert.equal(game({ src: SRC, demo: true }).g.rs.on, false);
  assert.match(RESCUE, /var RESCUE_V=1;/);
});
t("speed/scroll/score/runS lines byte-identical; no Math.random / backticks / ${} in 06h", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM.split(l).length - 1, 1, l.trim());
  const w = (s) => s.split("\n").filter((l) => /(^|[;{(\s])(speed|score|runS)(\+=|=(?!=))/.test(l));
  assert.deepEqual(w(RESCUE.slice(1, -1)), [], "06h never writes speed/score/runS");
  assert.ok(!/Math\.random|`|\$\{/.test(RESCUE.slice(1, -1)));
});
t("crate 1 reaches the buggy no earlier than 4 s and crate 2 no earlier than 7 s, on run 1 and run 50, over 40 seeds", () => {
  for (const n of [0, 50]) for (let s = 1; s <= 40; s++) {
    const { g } = game({ src: SRC, rand: rng(s), store: saved(n), hi: 99999 }); g.start(); g.puNext = 1e9;
    const a = arrivals(g, 9);
    assert.ok(a[0] >= 4 && a[0] < 4.3, `crate 1 at ${a[0]} (seed ${s}, run ${n + 1})`); assert.ok(a[1] >= 7, `crate 2 at ${a[1]}`);
  }
  // before rescue: crate 1 at ~2.95 s
  const { g } = game({ src: NO_RESCUE, rand: rng(1), hi: 99999 }); g.start(); g.puNext = 1e9;
  assert.ok(Math.abs(arrivals(g, 4)[0] - 2.95) < 0.1);
});
t("RAMP_S=12 density ramp: <= 4 obstacles reach the buggy in the first 12 s (pre-rescue 4-5), no gap over ~3 s", () => {
  let worst = 0, cnt = 0;
  for (let s = 1; s <= 40; s++) {
    const { g } = game({ src: SRC, rand: rng(s), store: saved(9), hi: 99999 }); g.start(); g.puNext = 1e9;
    const a = arrivals(g, 30);
    const first = a.filter((x) => x < 12).length; cnt = Math.max(cnt, first);
    for (let i = 1; i < a.length; i++) worst = Math.max(worst, a[i] - a[i - 1]);
    assert.ok(first <= 4, `seed ${s}: ${first} obstacles in 12 s`);
  }
  assert.ok(worst <= 3.05, `largest gap ${worst.toFixed(2)} s`);
  assert.equal(RESCUE.includes("ramp:12"), true);
});
t("early reward: a 4-spark row collected (4 sfxSpark chimes) within the first 3 s of every run", () => {
  for (const n of [0, 7]) {
    const { g, calls } = game({ src: SRC, rand: rng(3), store: saved(n), hi: 99999 }); g.start();
    run(g, 3); assert.equal(calls.spark, 4, `run ${n + 1}`); assert.ok(g.runS <= 3.01);
  }
});
t("runs 1-3: TAP/SPACE prompt + 0.4 s slow-mo just before crate 1; score vs runS stays inside the server ceiling all along", () => {
  const { g } = game({ src: SRC, rand: rng(5), store: saved(0, 0), hi: 99999 }); g.start(); g.puNext = 1e9;
  let promptAt = -1, slowReal = 0, maxRatio = 0;
  run(g, 4.6, (tReal) => {
    const s = g.score, d = g.runS;
    assert.ok(s <= nFor(d) * 1.01 + 5, `score ${s} > ceiling at ${d}`);
    if (d > 1) maxRatio = Math.max(maxRatio, Math.abs(s / nFor(d) - 1));
    if (g.rs.prompt && promptAt < 0) promptAt = d;
    if (g.rs.slowT > 0) slowReal += DT;
    return false;
  });
  assert.ok(promptAt > 3.4 && promptAt < 4.0, `prompt at ${promptAt}`);
  assert.ok(Math.abs(slowReal - 0.4) < 0.02, `slow-mo lasted ${slowReal.toFixed(3)} s real`);
  assert.ok(maxRatio < 1e-3, `score tracks runS exactly as without slow-mo (Euler step error only): max deviation ${maxRatio}`);
  // run 4+: no prompt, no slow-mo
  const r4 = game({ src: SRC, rand: rng(5), store: saved(3), hi: 99999 }).g; r4.start(); r4.puNext = 1e9; let p = 0;
  run(r4, 4.6, () => { p += r4.rs.prompt + (r4.rs.slowT > 0); return false }); assert.equal(p, 0);
});
t("runs 1-3: bounce-back off the first 2 crate hits (knock-up, inv), the 3rd kills; run 4 dies on crate 1; bounced runs skip the board", () => {
  const { g, calls, store } = game({ src: SRC, rand: rng(2), store: saved(0), hi: 99999 }); g.start(); g.puNext = 1e9;
  let b = 0; run(g, 30, () => { if (g.rs.bn > b) { b = g.rs.bn; assert.ok(g.vy > 300 && g.inv > 0.5) } return false });
  assert.equal(g.state, "over"); assert.equal(g.rs.bn, 2); assert.ok(g.runS > 8, `died at ${g.runS}`);
  assert.equal(calls.lb, 0, "a bounced run is not submitted"); assert.equal(JSON.parse(store.get(RK)).n, 1);
  const r4 = game({ src: SRC, rand: rng(2), store: saved(3), hi: 99999 }); r4.g.start(); r4.g.puNext = 1e9; run(r4.g, 10);
  assert.equal(r4.g.state, "over"); assert.ok(r4.g.runS < 4.5); assert.equal(r4.calls.lb, 1);
  // the real 15-leaderboard.js glue has the same guard
  assert.ok(LB.includes('function lbOver(s,runS){\n  if(typeof rsBn!=="undefined"&&rsBn>0)return;'));
});
t("prefers-reduced-motion: the bounce still saves the run, but with no knock-back offset, flash or shake", () => {
  const { g } = game({ src: SRC, rand: rng(2), store: saved(0), hi: 99999, rm: true }); g.start(); g.puNext = 1e9;
  run(g, 10, () => g.rs.bn === 1); assert.equal(g.state, "run"); assert.equal(g.rs.fl, 0); assert.equal(g.rs.kb, 0);
});
t("coyote: after leaving the ground without a jump (bounce), a press 80 ms later still jumps, 120 ms later it doesn't", () => {
  for (const [ms, ok] of [[60, true], [80 - 8, true], [120, false]]) {
    const { g } = game({ src: SRC, rand: rng(2), store: saved(0), hi: 99999 }); g.start(); g.puNext = 1e9;
    run(g, 10, () => g.rs.bn === 1);
    run(g, ms / 1000); const vy0 = g.vy; g.press(); g.release(); g.update(DT);
    assert.equal(g.vy > vy0 + 50, ok, `${ms} ms: vy ${vy0.toFixed(0)} -> ${g.vy.toFixed(0)}`);
  }
});
t("jump buffer: a press 80 ms before landing fires on landing; 160 ms before doesn't", () => {
  for (const [ms, ok] of [[80, true], [160, false]]) {
    const { g } = game({ src: SRC, rand: rng(4), store: saved(9), hi: 99999 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9;
    g.press(); g.release(); g.update(DT); assert.ok(g.py > 0);
    // tap jump: vy=CUT, airtime 2*CUT/G
    const air = 2 * g.CUT / 1800; run(g, air - ms / 1000 - DT); assert.ok(g.py > 0);
    g.press(); g.release(); let jumped = false;
    run(g, ms / 1000 + 0.05, () => { if (g.py === 0) return false; if (g.vy > 300 && g.py < 10) jumped = true; return false });
    assert.equal(jumped, ok, `${ms} ms before landing`);
  }
});
t("hitbox: 2 px per side more forgiving; near-miss fixtures pass, clear hits still kill", () => {
  const probe = (src, dy) => { const { g } = game({ src, rand: rng(1), store: saved(9), hi: 99999 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9;
    g.ents = [{ x: g.PX + 60, w: 30, h: 21, bot: 0, t: "b", v: 0 }]; g.py = 21 * 0.8 - 30 * 0.2 + dy; g.vy = 0;
    // hold the buggy at a fixed height while the crate passes under it
    let dead = false; for (let i = 0; i < 120 && !dead; i++) { const y = g.py; g.update(DT); if (g.state !== "run") dead = true; g.py = y; g.vy = 0 } return dead };
  // a clearance 1 px short of the old box: dies before, survives now; deep overlap dies in both
  assert.equal(probe(NO_RESCUE, -1), true); assert.equal(probe(SRC, -1), false);
  assert.equal(probe(SRC, -8), true); assert.equal(probe(NO_RESCUE, -8), true);
});
t("ghost hint only for a player who has never jumped; gone after the first jump, never again", () => {
  const store = saved(0, 0);
  const a = game({ src: SRC, rand: rng(1), store, hi: 99999 }).g; a.start(); assert.equal(a.rs.hint, true);
  a.press(); a.release(); a.update(DT); assert.equal(a.rs.hint, false); assert.equal(JSON.parse(store.get(RK)).h, 1);
  const b = game({ src: SRC, rand: rng(1), store, hi: 99999 }).g; b.start(); assert.equal(b.rs.hint, false);
});
t("completed runs counted once per run (Poki Continue + 2nd death), memory-only in ?sk= debug, no write in ?pu=", () => {
  const { g, store } = game({ src: SRC, rand: rng(1), store: saved(0), hi: 99999 }); g.start(); g.die(); g.state = "run"; g.die();
  assert.equal(JSON.parse(store.get(RK)).n, 1); g.start(); g.die(); assert.equal(JSON.parse(store.get(RK)).n, 2);
  const d = game({ src: SRC, rand: rng(1), skDebug: true, store: saved(5) }); assert.equal(d.g.rs.save.n, 0, "debug ignores the saved count");
  d.g.start(); assert.equal(d.g.rs.first, true); d.g.die(); assert.equal(d.g.rs.save.n, 1); assert.equal(JSON.parse(d.store.get(RK)).n, 5, "never written");
  const p = game({ src: SRC, rand: rng(1), tpu: "s", store: new Map() }); p.g.start(); p.g.die(); assert.equal(p.store.has(RK), false);
});
t("?demo=1 replays the pre-rescue code exactly (same states, same Math.random calls), and never writes the rescue key", () => {
  for (const seed of [1, 7, 42]) {
    const trace = (src) => { const { g, calls, store } = game({ src, demo: true, rand: rng(seed), hi: 99999 }); const tr = [];
      for (let i = 0; i < 240 * 40; i++) { g.now = i * 1000 / 240; g.update(DT); if (i % 60 === 0) tr.push(g.snap()) }
      return { tr: tr.join("\n"), rand: calls.rand, key: store.has(RK) } };
    const a = trace(SRC), b = trace(NO_RESCUE);
    assert.equal(a.rand, b.rand); assert.ok(a.tr === b.tr, `seed ${seed}: demo trace differs`); assert.equal(a.key, false);
  }
});
console.log(`rescue: ${pass} checks passed`);
