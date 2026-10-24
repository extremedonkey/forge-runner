// Ore carts (06i) and slag rollers (06m) must ride Dev's hill ground: canvas Y = GY - hlH(screen x).
// hlH(sx) is px above GY at world x = hsc + sx (06i-hills.js). 0 when hills are off. Over a gap, hlH is
// hlW's lip-to-lip chord (not a crest float). Run: node scripts/test-enemy-ground.mjs (also via npm test).
import assert from "node:assert/strict";
import OC from "../src/client/06i-orecart.js";
import SR from "../src/client/06m-chaser.js";
import { game, rng } from "./lib/hills-harness.mjs";

const body = (f) => f.slice(1, -1);
const GAP0 = 5000000, GAP1 = 5000800, LIP0 = 48, LIP1 = 12;
const POST = body(OC) + "\n" + body(SR) + `
function gpHole(wx){if(wx>${GAP0}&&wx<${GAP1})return {x0:${GAP0},x1:${GAP1},h0:${LIP0},h1:${LIP1}};return null}
var XO=0,VW=600;
calls.oc={C:ocC,solid:ocSolid,W:OC_W,H:OC_H};
calls.sr={C:srC,solid:srSolid,W:SR_W,H:SR_H,hop:srHop};
`;
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   enemy-ground:", name); };

function boot(hills) {
  const { g, calls } = game({ hills, post: POST, rand: rng(3), hi: 500 });
  g.start();
  g.puNext = 1e9;
  g.nextGap = 1e12;
  g.inv = 1e9;
  g.update(1 / 240); // ocSync / srSync wipe planted enemies on the first step of a run
  g.ents = [];
  g.nextGap = 1e12;
  g.inv = 0;
  g.shd = 0;
  g.cores = 0;
  g.py = 0;
  return { g, calls };
}
function bottom(rects) { return Math.max(...rects.map((r) => r.y + r.h)); }
function lift(g, cx) { return g.hl ? g.hl.H(cx) : 0; }
function sample(g, calls, who, x) {
  const api = calls[who], cx = Math.round(x) + api.W / 2, h = lift(g, cx);
  const rects = who === "oc" ? api.solid({ a: 1, x, ph: 0 }) : api.solid({ a: 1, x, ph: 0, d: 0 });
  return { h, bot: bottom(rects), gy: g.GY - h, cx };
}
// A gentle crest: tall enough that a flat-GY box misses the buggy, slope too small to launch.
function crest(g, cx) {
  let best = null;
  for (let s = g.hl.D0 + 2400; s < g.hl.D0 + 90000; s += 12) {
    g.hsc = s;
    const h = g.hl.H(cx), sl = g.hl.Sl(g.PX + g.PW / 2);
    if (h > 36 && Math.abs(sl) < 0.025 && (!best || h > best.h)) best = { s, h, sl };
  }
  assert.ok(best, "a tall gentle crest exists");
  g.hsc = best.s;
  return best;
}
function plant(rec, x) {
  Object.assign(rec, { a: 1, x, gx: x, d: 0, ar: 1, s1: 1, s2: 1, s3: 1, wt: 0, tc: 0, hit: 0, ph: 3, ck: null, cl: 0, bk: 0 });
}

t("cart sprite bottom is GY - hlH at the cart centre, and it follows world x (two crests differ)", () => {
  const { g, calls } = boot(true);
  const lo = { s: 0, h: 1e9 }, hi = { s: 0, h: -1 };
  for (let s = g.hl.D0 + 3000; s < g.hl.D0 + 70000; s += 30) {
    g.hsc = s; const h = g.hl.H(200);
    if (h < lo.h) { lo.s = s; lo.h = h; }
    if (h > hi.h) { hi.s = s; hi.h = h; }
  }
  assert.ok(hi.h - lo.h > 20, `hill range ${lo.h.toFixed(1)}..${hi.h.toFixed(1)}`);
  g.hsc = lo.s; const a = sample(g, calls, "oc", 180);
  g.hsc = hi.s; const b = sample(g, calls, "oc", 180);
  assert.equal(a.bot, a.gy, `low crest bottom ${a.bot} != ground ${a.gy} (hlH ${a.h})`);
  assert.equal(b.bot, b.gy, `high crest bottom ${b.bot} != ground ${b.gy} (hlH ${b.h})`);
  assert.ok(Math.abs((a.bot - b.bot) - (b.h - a.h)) < 1e-6, "lift tracks the sampled height, not a constant");
});

t("roller sprite bottom is GY - hlH at the roller centre (same world-x sample)", () => {
  const { g, calls } = boot(true);
  const spot = crest(g, 200);
  const s = sample(g, calls, "sr", 200 - calls.sr.W / 2);
  assert.ok(s.h > 36, `crest ${s.h}`);
  assert.equal(spot.h, g.hl.H(200));
  assert.equal(s.bot, s.gy, `roller bottom ${s.bot} != ground ${s.gy}`);
  assert.equal(calls.sr.hop({ x: 200, a: 1 }), 0, "no obstacle hop on an empty track");
});

t("over a gap the cart and the roller sit on hlH's lip-to-lip chord (between the lips, not flat GY)", () => {
  const { g, calls } = boot(true);
  g.hsc = GAP0;
  const mid = 400; // world x = GAP0+400, the middle of the 800 px hole
  for (const who of ["oc", "sr"]) {
    const x = mid - calls[who].W / 2, s = sample(g, calls, who, x);
    const f = (g.hsc + s.cx - GAP0) / (GAP1 - GAP0);
    const chord = LIP0 + (LIP1 - LIP0) * f;
    assert.ok(Math.abs(s.h - chord) < 1e-6, `${who} hlH ${s.h} != chord ${chord}`);
    assert.ok(s.h > Math.min(LIP0, LIP1) && s.h < Math.max(LIP0, LIP1), `${who} chord not between lips`);
    assert.equal(s.bot, g.GY - s.h, `${who} bottom ${s.bot} floats off the chord`);
  }
});

t("hills off or absent ground: cart and roller bottoms stay on flat GY", () => {
  for (const hills of [false, "absent"]) {
    const { g, calls } = boot(hills);
    if (g.hl) g.hsc = g.hl.D0 + 50000;
    for (const who of ["oc", "sr"]) {
      const s = sample(g, calls, who, 180);
      if (g.hl) assert.equal(s.h, 0);
      assert.equal(s.bot, g.GY, `${who} hills ${hills} bottom ${s.bot}`);
    }
  }
});

t("a grounded buggy on a tall crest is hit by a cart and by a roller that share that ground", () => {
  for (const who of ["oc", "sr"]) {
    const { g, calls } = boot(true);
    const cx = g.PX + 20;
    const spot = crest(g, cx);
    const api = calls[who];
    for (const c of calls.oc.C) c.a = 0;
    for (const r of calls.sr.C) r.a = 0;
    plant(api.C[0], cx - api.W / 2);
    const s = sample(g, calls, who, api.C[0].x);
    assert.ok(s.h > 36 && Math.abs(s.h - spot.h) < 8, `${who} planted on the crest (${s.h} vs ${spot.h})`);
    assert.equal(s.bot, s.gy);
    g.py = 0; g.inv = 0; g.shd = 0; g.cores = 0; g.ents = [];
    g.update(1 / 240);
    assert.equal(g.state, "over", `${who} on a ${s.h.toFixed(1)} px crest did not threaten the buggy (py ${g.py})`);
  }
});

console.log(`enemy-ground: ${pass} checks passed`);
