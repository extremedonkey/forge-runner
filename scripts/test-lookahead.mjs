// LOOK-AHEAD contract (Levels + Dev, HILLS #80 / SPEED-PER-LEVEL #78): crest look-ahead >= flat look-ahead at the same level
// multiplier minus 1 frame (1/60 s), so crests are never worse than flat ground. Look-ahead (s) = visible game units ahead of
// the buggy's front / the effective world speed speed*vMul() (Dev's real vMul(), incl. VMUL_CAP when present and the 800 felt cap).
// Visible units from the real layout (10-layout.js): portrait 390x844: ZM=PZ=1.35, XO=20, VW=600/1.35 -> right edge 464.44;
// desktop: XO=0, VW=600. Buggy front = PX+PW = 101. Flat = hills off (?hills=0), same lvSpeedMul stub. Crest = real terrain,
// frames from 0.25 s before to 1.0 s after each crest (local max of the ground under the buggy), at L5 top speed (speed 760).
// anyHill = the worst look-ahead anywhere on the terrain (not only near crests), for information.
// Run: node scripts/test-lookahead.mjs   (exit 1 if the contract fails). Not in npm test yet: wire it in once #80's VMUL_CAP fix passes.
import { game, rng } from "./lib/hills-harness.mjs";
const DT = 1 / 240, FRAME = 1 / 60, FRONT = 56 + 45;
const VP = { "390x844": 600 / 1.35 + 20 - FRONT, desktop: 600 - FRONT };
const MULS = [0.8, 1.0, 1.06, 1.10];  // lvSpeedMul stub: 0.8 / 1.0 / L5 table (1.06) / 1.10
function flatV(m) { const { g } = game({ hills: false, lvMul: m, rand: rng(1) }); g.start(); g.speed = 760; return g.vMul(); }
function crestV(m, secs = 260) {
  const { g } = game({ lvMul: m, rand: rng(2) }); g.start(); g.puNext = 1e9;
  const fr = []; // per frame: [t, ground under buggy, vMul, hlF]
  for (let f = 0; f < secs * 60 && g.state === "run"; f++) {
    for (let k = 0; k < 4; k++) { g.inv = 1e9; g.nextGap = 1e9; g.ents = []; g.now += DT * 1000; g.update(DT); }
    if (g.speed === 760) fr.push([g.runS, g.hl.B(), g.vMul(), g.hl.F]);
  }
  const crests = []; for (let i = 1; i < fr.length - 1; i++) if (fr[i][1] > fr[i - 1][1] && fr[i][1] >= fr[i + 1][1] && fr[i][1] > 5) crests.push(fr[i][0]);
  let worst = 0, at = null, maxF = 0, allMax = 0;
  for (const r of fr) { allMax = Math.max(allMax, r[2]); if (crests.some((c) => r[0] >= c - .25 && r[0] <= c + 1)) { if (r[2] > worst) { worst = r[2]; at = r[0]; } maxF = Math.max(maxF, r[3]); } }
  return { v: worst, at, crests: crests.length, maxF, allMax };
}
const rows = []; let fails = 0;
for (const m of MULS) {
  const fv = flatV(m), c = crestV(m);
  for (const vp in VP) {
    const U = VP[vp], flat = U / (760 * fv), crest = U / (760 * c.v), ok = crest >= flat - FRAME - 1e-9;
    if (!ok) fails++;
    rows.push({ m, vp, U: +U.toFixed(1), flatFelt: +(760 * fv).toFixed(1), crestFelt: +(760 * c.v).toFixed(1), flat: +flat.toFixed(3), crest: +crest.toFixed(3), margin: +(crest - (flat - FRAME)).toFixed(3), ok, crests: c.crests, hlFmax: +c.maxF.toFixed(3), anyHill: +(U / (760 * c.allMax)).toFixed(3), at: c.at && +c.at.toFixed(1) });
  }
}
console.table(rows);
console.log(fails ? `LOOK-AHEAD CONTRACT FAILED (${fails}/${rows.length})` : "LOOK-AHEAD CONTRACT PASSED");
process.exit(fails ? 1 : 0);
