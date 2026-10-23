// LOOK-AHEAD contract (Levels + Dev; from #82 236c7ec, run by npm test on #80): crest look-ahead >= flat look-ahead at the same multiplier minus 1 frame
// (1/60 s), so crests are never worse than flat ground. Extends Dev's portrait check in scripts/test-hills.mjs ("VMUL_CAP 1.10")
// with its method: look-ahead at a step = time until the world (speed*vMul() per step, as hsc moves) has travelled the visible units ahead
// of the buggy's front. Visible units (10-layout.js): 390x844 ZM=PZ=1.35, XO=20 -> 600/1.35+20-101 = 363.4; desktop 600-101 = 499.
// Flat = the same lvSpeedMul with ?hills=0 (vMul = min(m, 1.10, 800/speed)). Crest = steps from 0.25 s before to 1.0 s after each
// crest (local max of the ground under the buggy) on full-amplitude hills. L5 top speed (760 base, 800 felt cap); lvSpeedMul stub
// 0.8 / 1.0 / 1.10. Also printed: Dev's reference (flat at the 1.10-capped felt speed, the bound test-hills asserts).
// Run: node scripts/test-lookahead.mjs   (exit 1 if the strict same-multiplier contract fails)
import { game, rng } from "./lib/hills-harness.mjs";
const DT = 1 / 240, FRAME = 1 / 60, SP = 760;
const VP = { "390x844": 600 / 1.35 + 20 - 101, desktop: 600 - 101 };
// m: a lvSpeedMul stub, or "L<n>" = the real 06d lvSpeedMul (#78 table, merged on main) with the score pinned inside level n
const LV_AT = [0, 20, 40, 65, 90].map((t) => { const a = Math.min(t, 60); return Math.floor(0.05 * (340 * a + 3.5 * a * a + 760 * Math.max(0, t - 60))) });
function trace(m, hills) {
  const real = typeof m === "string", n = real ? +m.slice(1) : 0;
  const { g } = game(real ? { realLv: true, rand: rng(7), hi: 500, hills } : { lvMul: m, rand: rng(7), hi: 500, hills }); g.start(); g.puNext = 1e9;
  if (hills !== false) g.hsc = g.hl.D0 + 30000;
  const hs = [], gr = []; let w = 0;
  for (let i = 0; i < 240 * 40 && g.state === "run"; i++) { g.speed = SP; if (real) g.score = LV_AT[n - 1] + 50; g.inv = 1e9; g.ents = []; g.auto(); g.now += DT * 1000; g.update(DT); w += g.speed * g.vMul() * DT; hs.push(w); gr.push(hills === false ? 0 : g.hl.B()); }
  return { hs, gr };
}
function ahead(hs, U) { const la = new Array(hs.length).fill(null); for (let i = 0, j = 0; i < hs.length; i++) { while (j < hs.length && hs[j] - hs[i] < U) j++; if (j >= hs.length) break; la[i] = (j - i) * DT; } return la; }
const rows = []; let fails = 0;
for (const m of [0.8, 1.0, 1.10, "L1", "L2", "L3", "L4", "L5"]) {
  const fl = trace(m, false), hl = trace(m, true);
  const crest = new Array(hl.gr.length).fill(false); let nc = 0;
  for (let i = 1; i < hl.gr.length - 1; i++) if (hl.gr[i] > hl.gr[i - 1] && hl.gr[i] >= hl.gr[i + 1] && hl.gr[i] > 5) { nc++; for (let k = Math.max(0, i - 60); k <= Math.min(hl.gr.length - 1, i + 240); k++) crest[k] = true; }
  for (const vp in VP) {
    const U = VP[vp], fa = ahead(fl.hs, U).filter((x) => x !== null), ha = ahead(hl.hs, U);
    const flat = Math.min(...fa); let cr = 1e9, any = 1e9;
    ha.forEach((x, i) => { if (x === null) return; any = Math.min(any, x); if (crest[i]) cr = Math.min(cr, x); });
    const devRef = U / Math.min(800, SP * 1.10), ok = cr >= flat - FRAME - 1e-9, okDev = cr >= devRef - FRAME - 1e-9;
    if (!ok) fails++;
    rows.push({ mult: m, viewport: vp, units: +U.toFixed(1), flat_s: +flat.toFixed(3), crest_s: +cr.toFixed(3), margin_s: +(cr - flat + FRAME).toFixed(3), strict: ok ? "PASS" : "FAIL", anyHill_s: +any.toFixed(3), devRef_s: +devRef.toFixed(3), vsDevRef: okDev ? "PASS" : "FAIL", crests: nc });
  }
}
console.table(rows);
console.log(fails ? `LOOK-AHEAD (strict, same multiplier) FAILED ${fails}/${rows.length}` : "LOOK-AHEAD CONTRACT PASSED");
process.exit(fails ? 1 : 0);
