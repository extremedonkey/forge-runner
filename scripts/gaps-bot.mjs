// "Real-style" bot for GAPS: gaps on vs ?gaps=0 (= dev/hills) medians; scripts/hills-bot.mjs + gap perception.
//   node scripts/gaps-bot.mjs [seeds=200] [runsPerSession=5]   TAB=78 uses Levels' #78 GAP_LV (default: 06k's own table)
// Gaps are perceived like obstacles (on screen -> 250-350 ms reaction, same 22% mistime / 10% miss model) and jumped at the
// centre of the gap's take-off window (g.mid) with a longer hold (0.2-0.45 s). Hills on in both arms; levels by base-curve time.
// Same player model as rescue-bot.mjs (perception, 250-350 ms reaction, +-50 ms error, 22% mistimes, 10% misses, onboarding),
// with two hills changes: obstacles close at the FELT speed (speed*hlF), and a jump is allowed while floating off a crest
// (hlCanJump), as for a player. No rescue here (06h is not on main), so both arms are main + 06i, only the flag differs.
import { game, rng } from "./lib/hills-harness.mjs";
const LV78 = [
  { wMin: .20, wMax: .25, minClear: 2.0, chanceMin: 0, chance: .10, noGapBefore: 12 }, { wMin: .25, wMax: .35, minClear: 1.6, chanceMin: .15, chance: .15, noGapBefore: 0 },
  { wMin: .30, wMax: .45, minClear: 1.3, chanceMin: .20, chance: .20, noGapBefore: 0 }, { wMin: .40, wMax: .55, minClear: 1.0, chanceMin: .25, chance: .25, noGapBefore: 0 },
  { wMin: .45, wMax: .60, minClear: .85, chanceMin: .30, chance: .30, noGapBefore: 0 }];
const TAB = process.env.TAB === "78" ? LV78 : process.env.TAB ? JSON.parse(process.env.TAB) : undefined;
const SEEDS = +(process.argv[2] || 200), RUNS = +(process.argv[3] || 5);
const DT = 1 / 240, CAP = 120, ONBOARD = process.env.ONBOARD !== "0"; // ONBOARD=0: skill-only (no "didn't know to tap")
function session(gaps, seed, mobile) {
  const R = rng(seed * 7919 + (mobile ? 1 : 0)), rr = (a, b) => a + R() * (b - a);
  const store = new Map(), out = [];
  let naive = true;
  const { g } = game({ gaps: true, q: gaps ? {} : { gaps: "0" }, rand: rng(seed), store, hi: 0, level: "time", gapTab: TAB });
  let air = 0;
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
        const rel = g.speed * (g.hl ? g.hl.F : 1) + (e.vx || 0), ttiReal = (e.x - PXr) / rel / k;
        if (real - p.seen < p.react) continue; // still reacting
        const duckT = e.t === "d" ? 0.4 : (e.t === "f" && e.bot === 18 ? 0.3 : -1);
        if (duckT > 0) { if (ttiReal < duckT / k - p.err && ttiReal > -0.3) wantDuck = true; continue }
        if (!p.done && ttiReal <= 0.2 / k - p.err && (g.py === 0 || (g.hl && g.hl.Cr && !g.hl.J)) && !g.duck) { p.done = 1; g.press(); holdUntil = real + rr(0.12, 0.4); if (e.t === "b") naive = false }
      }
      if (g.gp && g.gp.on) for (const q of g.gp.gaps) {
        if (q.x1 < g.hsc + g.PX) continue;
        let p = plan.get(q.key);
        if (!p) { if (q.x0 - g.hsc > VIEW) break; const mis = R() < 0.22;
          p = { seen: real, react: rr(0.25, 0.35), err: mis ? (R() < 0.5 ? -1 : 1) * rr(0.15, 0.3) : rr(-0.05, 0.05), skip: R() < 0.1 }; plan.set(q.key, p) }
        if (p.skip || p.done) break;
        const tti = (q.x0 - (g.hsc + PXr)) / (g.speed * g.vMul()) / k;
        if (real - p.seen >= p.react && tti <= (q.mid || 0.1) / k - p.err && (g.py === 0 || (g.hl && g.hl.Cr && !g.hl.J))) { p.done = 1; g.press(); holdUntil = real + rr(0.2, 0.45) }
        break;
      }
      g.duck = wantDuck;  // a duck in the air is a fast fall (G x 3), as a player pressing down
      g.update(DT);
      if (g.rs && g.rs.bn > bn0) { bn0 = g.rs.bn; naive = false }
    }
    if (g.state === "run") g.die();
    gapN += g.gp ? g.gp.n : 0; if (g.gp && g.gp.deep) fellN++;
    out.push({ real, runS: g.runS, air: g.hl ? g.hl.air : 0, airS: g.hl ? g.hl.airS : 0, capped: real >= CAP });
    naive = false; // a death teaches that crates kill
    g.release(); g.duck = false;
  }
  return out;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN };
const res = {}; let gapN = 0, fellN = 0;
for (const [name, hills] of [["gaps off", false], ["gaps on", true]]) for (const mobile of [false, true]) {
  const all = [], first3 = [], firstDeath = []; let air = 0, airS = 0; gapN = 0; fellN = 0;
  for (let s = 1; s <= SEEDS; s++) { const o = session(hills, s, mobile); o.forEach((x, i) => { all.push(x.real); air += x.air; airS += x.airS; if (i < 3) first3.push(x.real) }); firstDeath.push(o[0].real) }
  res[`${name} ${mobile ? "mobile " : "desktop"}`] = { gaps: gapN / all.length, fell: fellN, median: med(all), median13: med(first3), run1: med(firstDeath), le6: all.filter((x) => x <= 6).length / all.length, n: all.length, capped: all.filter((x) => x >= CAP).length, air: air / all.length, airS: airS / all.length };
}
console.log(`real-style bot (gaps, table ${process.env.TAB || "06k default"})${ONBOARD ? "" : " (ONBOARD=0, skill only)"}, ${SEEDS} seeds x ${RUNS} runs, cap ${CAP} s`);
console.log("arm/viewport         median all  median runs1-3  median run1  runs<=6s  capped  gaps/run  gap deaths  n");
for (const [k, v] of Object.entries(res)) console.log(`${k.padEnd(20)} ${v.median.toFixed(1).padStart(8)} s ${v.median13.toFixed(1).padStart(10)} s ${v.run1.toFixed(1).padStart(10)} s ${(v.le6 * 100).toFixed(0).padStart(7)}% ${String(v.capped).padStart(7)} ${v.gaps.toFixed(2).padStart(9)} ${String(v.fell).padStart(10)} ${v.n}`);
