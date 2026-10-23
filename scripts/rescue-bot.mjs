// "Real-style" bot: before/after medians for the first-run rescue (Playtest 2026-10-23 method, run in Node on the real sim).
//   node scripts/rescue-bot.mjs [seeds=200] [runsPerSession=5] [beforeRef=origin/main]
// Model (per Playtest's casual profile, plus what that report says bots lacked: perception and onboarding):
//  - perception: an obstacle is only seen once on screen (desktop 600 logical px, mobile 444), then a 250-350 ms reaction
//    delay before the bot can act on it; all timing is in REAL time (slow-mo gives a human more real time, not the bot more sim)
//  - timing: aim at the ideal take-off (0.2 s of sim travel before contact) with +-50 ms anticipation error; 22% mistimes of
//    +-150-300 ms; hold 0.12-0.4 s; ducks drones / mid flyers, ignores high flyers (as Playtest)
//  - misses: 10% of obstacles get no press at all (distracted)
//  - onboarding: until the player's first successful jump or first crate hit, each crate has a 50% chance of no press
//    ("didn't know to tap"); a visible TAP/SPACE prompt is noticed and pressed after a 250-350 ms reaction instead
//  - session: N runs per seed with one shared localStorage, 120 s cap per run; no shop buys (same for before/after)
// Prints medians of run length (real seconds) for all runs and runs 1-3, desktop and mobile, before and after.
import { execFileSync } from "node:child_process";
import { game, rng } from "./lib/sim-harness.mjs";
const SEEDS = +(process.argv[2] || 200), RUNS = +(process.argv[3] || 5), REF = process.argv[4] || "origin/main";
const show = (ref, f) => execFileSync("git", ["show", `${ref}:src/client/${f}`], { encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] });
const load = async (ref) => { const m = {}; for (const [k, f] of [["state", "06-state.js"], ["sparks", "06b-sparks.js"], ["rescue", "06h-rescue.js"], ["flow", "11-gameflow.js"], ["sim", "13-simulation.js"]]) {
  if (ref === "WORKTREE") m[k] = (await import(`../src/client/${f}`)).default;
  else { try { const s = show(ref, f); m[k] = (await import("data:text/javascript," + encodeURIComponent(s))).default } catch { m[k] = null } } } return m };
const DT = 1 / 240, CAP = 120, ONBOARD = process.env.ONBOARD !== "0"; // ONBOARD=0: skill-only (no "didn't know to tap")
function session(src, seed, mobile) {
  const R = rng(seed * 7919 + (mobile ? 1 : 0)), rr = (a, b) => a + R() * (b - a);
  const store = new Map(), out = [];
  let naive = true;
  const { g } = game({ src, rand: rng(seed), store, hi: 99999 });
  const VIEW = mobile ? 444 : 600;
  for (let r = 0; r < RUNS; r++) {
    g.start();
    let real = 0, holdUntil = -1, prompt0 = -1, promptPlan = null; const plan = new Map(); let bn0 = 0;
    while (g.state === "run" && real < CAP) {
      real += DT; g.now += DT * 1000;
      if (holdUntil > 0 && real >= holdUntil) { holdUntil = -1; g.release() }
      const k = g.rs && g.rs.slowT > 0 ? g.rs.RS.slowK : 1;
      let wantDuck = false; const PXr = g.PX + g.pW();
      // the rescue prompt: noticed after a reaction delay, then pressed (only while it is showing)
      if (g.rs && g.rs.prompt) { if (prompt0 < 0) { prompt0 = real; promptPlan = rr(0.25, 0.35) }
        if (real - prompt0 >= promptPlan && g.py === 0 && holdUntil < 0) { g.press(); holdUntil = real + rr(0.12, 0.4); naive = false; for (const e of g.ents) if (e.t === "b" && e.x + e.w > g.PX) { const p = plan.get(e) || {}; p.done = 1; plan.set(e, p); break } } }
      for (const e of g.ents) {
        if (e.t === "u" || e.t === "k") continue;
        if (e.x + e.w < g.PX + 4) continue;
        if (e.t === "b" && g.big()) continue;
        if (e.t === "f" && e.bot >= 50) continue;
        let p = plan.get(e);
        if (!p) {
          if (e.x > VIEW) continue; // not on screen yet
          const mis = R() < 0.22;
          p = { seen: real, react: rr(0.25, 0.35), err: mis ? (R() < 0.5 ? -1 : 1) * rr(0.15, 0.3) : rr(-0.05, 0.05), skip: R() < 0.1 || (ONBOARD && naive && e.t === "b" && R() < 0.5) };
          plan.set(e, p);
          for (const o of g.ents) if (o !== e && o.t === e.t && Math.abs(o.x - e.x) <= 102 && !plan.get(o)) plan.set(o, p); // a cluster is one decision
        }
        if (p.skip) continue;
        const rel = g.speed + (e.vx || 0), ttiReal = (e.x - PXr) / rel / k;
        if (real - p.seen < p.react) continue; // still reacting
        const duckT = e.t === "d" ? 0.4 : (e.t === "f" && e.bot === 18 ? 0.3 : -1);
        if (duckT > 0) { if (ttiReal < duckT / k - p.err && ttiReal > -0.3) wantDuck = true; continue }
        if (!p.done && ttiReal <= 0.2 / k - p.err && g.py === 0 && !g.duck) { p.done = 1; g.press(); holdUntil = real + rr(0.12, 0.4); if (e.t === "b") naive = false }
      }
      g.duck = wantDuck && g.py === 0 ? true : (wantDuck ? g.duck : false);
      g.update(DT);
      if (g.rs && g.rs.bn > bn0) { bn0 = g.rs.bn; naive = false }
    }
    if (g.state === "run") g.die();
    out.push({ real, runS: g.runS, bounces: g.rs ? g.rs.bn : 0, capped: real >= CAP });
    naive = false; // a death teaches that crates kill
    g.release(); g.duck = false;
  }
  return out;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN };
const before = await load(REF), after = await load("WORKTREE");
const res = {};
for (const [name, src] of [["before", before], ["after", after]]) for (const mobile of [false, true]) {
  const all = [], first3 = [], firstDeath = [], cr1 = [];
  for (let s = 1; s <= SEEDS; s++) { const o = session(src, s, mobile); o.forEach((x, i) => { all.push(x.real); if (i < 3) first3.push(x.real) }); firstDeath.push(o[0].real) }
  const le6 = all.filter((x) => x <= 6).length / all.length;
  res[`${name} ${mobile ? "mobile " : "desktop"}`] = { median: med(all), median13: med(first3), run1: med(firstDeath), le6: le6, n: all.length, capped: all.filter((x) => x >= CAP).length };
}
console.log(`real-style bot${ONBOARD ? "" : " (ONBOARD=0, skill only)"}, ${SEEDS} seeds x ${RUNS} runs, cap ${CAP} s, before=${REF} after=worktree`);
console.log("build/viewport     median all  median runs1-3  median run1  runs<=6s  capped  n");
for (const [k, v] of Object.entries(res)) console.log(`${k.padEnd(18)} ${v.median.toFixed(1).padStart(8)} s ${v.median13.toFixed(1).padStart(10)} s ${v.run1.toFixed(1).padStart(10)} s ${(v.le6 * 100).toFixed(0).padStart(7)}% ${String(v.capped).padStart(7)} ${v.n}`);
