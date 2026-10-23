// "Real-style" bot for HILLS: hills on vs ?hills=0 medians (the #65 scripts/rescue-bot.mjs model, run on the real sim).
//   node scripts/hills-bot.mjs [seeds=200] [runsPerSession=5]
// Same player model as rescue-bot.mjs (perception, 250-350 ms reaction, +-50 ms error, 22% mistimes, 10% misses, onboarding),
// with two hills changes: obstacles close at the FELT speed (speed*hlF), and a jump is allowed while floating off a crest
// (hlCanJump), as for a player. No rescue here (06h is not on main), so both arms are main + 06i, only the flag differs.
import { game, rng } from "./lib/hills-harness.mjs";
const SEEDS = +(process.argv[2] || 200), RUNS = +(process.argv[3] || 5);
// LV=1: levels by base-curve time with #78's lvSpeedMul per level (.85/.92/.95/1/1.053) and deaths per 100 obstacles per level
const LVM = process.env.LV === "1" ? [.85, .92, .95, 1, 1.053] : null, LVS = { obs: {}, die: {}, cause: {} };
const DT = 1 / 240, CAP = 120, ONBOARD = process.env.ONBOARD !== "0"; // ONBOARD=0: skill-only (no "didn't know to tap")
function session(hills, seed, mobile) {
  const R = rng(seed * 7919 + (mobile ? 1 : 0)), rr = (a, b) => a + R() * (b - a);
  const store = new Map(), out = [];
  let naive = true;
  const { g } = game({ q: hills ? {} : { hills: "0" }, rand: rng(seed), store, hi: 0, ...(LVM ? { level: "time", lvMul: LVM } : {}) });
  const key = (n) => (hills ? "on" : "off") + (mobile ? "-m" : "-d") + "-L" + n;
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
          const mis = R() < (process.env.SKILL ? 0.02 : 0.22);
          p = { seen: real, react: rr(0.25, 0.35), err: mis ? (R() < 0.5 ? -1 : 1) * rr(0.15, 0.3) : rr(-0.05, 0.05), skip: R() < (process.env.SKILL ? 0 : 0.1) || (ONBOARD && naive && e.t === "b" && R() < 0.5) };
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
      if (LVM) for (const e of g.ents) if (e.t !== "u" && e.t !== "k" && !e.cnt && e.x + e.w < g.PX) { e.cnt = 1; const kk = key(g.level); LVS.obs[kk] = (LVS.obs[kk] || 0) + 1 }
      g.duck = wantDuck;  // a duck in the air is a fast fall (G x 3), as a player pressing down
      g.update(DT);
      if (g.rs && g.rs.bn > bn0) { bn0 = g.rs.bn; naive = false }
    }
    if (LVM && g.state !== "run") { const kk = key(g.level); LVS.die[kk] = (LVS.die[kk] || 0) + 1;
      const near = g.ents.filter((e) => e.t !== "u" && e.t !== "k" && e.x < g.PX + 80 && e.x + e.w > g.PX - 20).map((e) => e.t + (e.t === "f" ? e.bot : "") + (e.sk || "")).join("+") || "?";
      const ck = kk + " " + near; LVS.cause[ck] = (LVS.cause[ck] || 0) + 1 }
    if (g.state === "run") g.die();
    out.push({ real, runS: g.runS, air: g.hl ? g.hl.air : 0, airS: g.hl ? g.hl.airS : 0, capped: real >= CAP });
    naive = false; // a death teaches that crates kill
    g.release(); g.duck = false;
  }
  return out;
}
const med = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN };
const res = {};
for (const [name, hills] of [["hills off", false], ["hills on", true]]) for (const mobile of [false, true]) {
  const all = [], first3 = [], firstDeath = []; let air = 0, airS = 0;
  for (let s = 1; s <= SEEDS; s++) { const o = session(hills, s, mobile); o.forEach((x, i) => { all.push(x.real); air += x.air; airS += x.airS; if (i < 3) first3.push(x.real) }); firstDeath.push(o[0].real) }
  res[`${name} ${mobile ? "mobile " : "desktop"}`] = { median: med(all), median13: med(first3), run1: med(firstDeath), le6: all.filter((x) => x <= 6).length / all.length, n: all.length, capped: all.filter((x) => x >= CAP).length, air: air / all.length, airS: airS / all.length };
}
console.log(`real-style bot (hills)${ONBOARD ? "" : " (ONBOARD=0, skill only)"}, ${SEEDS} seeds x ${RUNS} runs, cap ${CAP} s`);
console.log("arm/viewport         median all  median runs1-3  median run1  runs<=6s  capped  BIG AIR/run  sparks/run  n");
for (const [k, v] of Object.entries(res)) console.log(`${k.padEnd(20)} ${v.median.toFixed(1).padStart(8)} s ${v.median13.toFixed(1).padStart(10)} s ${v.run1.toFixed(1).padStart(10)} s ${(v.le6 * 100).toFixed(0).padStart(7)}% ${String(v.capped).padStart(7)} ${v.air.toFixed(2).padStart(11)} ${v.airS.toFixed(2).padStart(11)} ${v.n}`);
if (LVM) { console.log("deaths per 100 obstacles (passed) by level:");
  for (const a of ["off-d", "on-d", "off-m", "on-m"]) console.log(a.padEnd(6), [1, 2, 3, 4, 5].map((n) => { const o = LVS.obs[a + "-L" + n] || 0, d = LVS.die[a + "-L" + n] || 0; return "L" + n + " " + (o ? (100 * d / (o + d)).toFixed(2) : "-") + " (" + d + "/" + (o + d) + ")" }).join("  "));
  if (process.env.CAUSE) console.log(Object.entries(LVS.cause).filter(([k]) => /L2 |L5 /.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => k + ": " + v).join("\n")) }
