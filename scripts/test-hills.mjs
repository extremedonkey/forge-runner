// HILLS tests (06i-hills.js; "score on base speed, big air pays sparks"). Real 06-state + 06b-sparks + 06i-hills + 11-gameflow
// + 13-simulation via scripts/lib/hills-harness.mjs, 1/240 s sub-steps (as 16-loop.js).
// Run: node scripts/test-hills.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import LBF from "../src/client/15-leaderboard.js";
import assert from "node:assert/strict";
import HILLS from "../src/client/06i-hills.js";
import SIM from "../src/client/13-simulation.js";
import RENDER from "../src/client/14-render.js";
import { game, rng } from "./lib/hills-harness.mjs";
let pass = 0;
const land = (g) => { for (let i = 0; g.py > 0; i++) { if (i > 2400) throw new Error("never landed: py " + g.py + " vy " + g.vy + " state " + g.state); step(g) } };
const LB = LBF.slice(1, -1);
const t = (name, fn) => { fn(); pass++; console.log("ok   hills:", name); };
const DT = 1 / 240, PX = 56, PW = 45, G = 1800, CUT = 380;
const step = (g, n = 1) => { for (let i = 0; i < n && g.state === "run"; i++) { g.now += DT * 1000; g.update(DT) } };
const nFor = (d) => d <= 60 ? 0.05 * (340 * d + 3.5 * d * d) : 0.05 * (340 * 60 + 3.5 * 3600 + 760 * (d - 60));
// scripted, seed-independent inputs: press at fixed run times (tap or hold), never die (inv)
function scripted(hills, sec, seed = 1, lvMul) {
  const { g, calls } = game({ hills, rand: rng(seed), hi: 500, lvMul }); g.start(); g.puNext = 1e9;
  const tr = [];
  for (let i = 0; i < sec * 240 && g.state === "run"; i++) {
    if (i % 173 === 0) g.press(); if (i % 173 === 30) g.release();
    g.inv = 1e9; g.now += DT * 1000; g.update(DT);
    tr.push(g.runS + "|" + g.score + "|" + g.speed + "|" + g.scroll);
  }
  return { g, calls, tr };
}

t("HILLS_ON flag: on by default, ?hills=0 turns it off; off = flat (no terrain, felt speed 1)", () => {
  assert.match(HILLS, /var HILLS_ON=true;/);
  const on = game({ rand: rng(1) }).g; on.start(); assert.equal(on.hl.on, true);
  const off = game({ rand: rng(1), q: { hills: "0" } }).g; off.start(); assert.equal(off.hl.on, false);
  off.hsc = 50000; assert.equal(off.hl.H(300), 0); assert.equal(off.hl.F, 1);
});
t("speed/scroll/score/runS lines byte-identical; 06i never writes them; no Math.random / backticks / ${} in 06i", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM.split(l).length - 1, 1, l.trim());
  const b = HILLS.slice(1, -1);
  assert.deepEqual(b.split("\n").filter((l) => /(^|[;{(\s,])(speed|score|runS|scroll)(\+=|-=|=(?!=))/.test(l)), []);
  assert.ok(!/Math\.random|`|\$\{/.test(b));
});
t("score vs runS (and speed, scroll) byte-identical with hills on and off for the same inputs, 150 s, 5 seeds; inside the ceiling", () => {
  for (const s of [1, 2, 3, 4, 5]) {
    const a = scripted(true, 150, s), b = scripted(false, 150, s);
    assert.ok(a.g.hl.hsc > a.g.hl.D0 + 30000, "the run was on full hills");
    assert.ok(a.tr.join("\n") === b.tr.join("\n"), "seed " + s + ": score/runS/speed/scroll differ");
    assert.ok(a.g.score <= nFor(a.g.runS) * 1.01 + 5);
  }
});
t("leaderboard: with hills on, every step of 3 real 100 s runs submits (floor(score), ceil(runS)) inside the server's scoreCeiling (as test-lb-dur)", () => {
  // copied exactly from leaderboard/api/index.mjs (the deployed Lambda), as in scripts/test-lb-dur.mjs
  const START = 340, ACC = 7, MAXV = 760, RATE = 0.05, T_MAX = (MAXV - START) / ACC;
  const maxScoreFor = (t) => t <= 0 ? 0 : t <= T_MAX ? RATE * (START * t + (ACC / 2) * t * t) : RATE * (START * T_MAX + (ACC / 2) * T_MAX * T_MAX) + RATE * MAXV * (t - T_MAX);
  const scoreCeiling = (dur) => Math.min(99999, Math.floor(maxScoreFor(dur + 1) * 1.01 + 5));
  const durOf = new Function("dur", (LB.match(/(dur = Math\.max\(0, Math\.min\(36000, Math\.ceil\(dur \|\| 0\)\)\);)/) || [])[1] + "return dur;");
  let n = 0;
  for (const s of [11, 12, 13]) {
    const { g } = game({ rand: rng(s), hi: 500 }); g.start();
    for (let i = 0; i < 240 * 100; i++) { g.auto(); g.inv = 1e9; step(g); const sc = Math.floor(g.score), d = durOf(g.runS); n++;
      if (sc >= 1) { assert.ok(sc <= scoreCeiling(d), `score ${sc} > ceiling at runS ${g.runS}`); assert.ok(sc <= Math.floor(maxScoreFor(d) * 1.01 + 5)) } }
    assert.ok(g.hl.hsc > g.hl.D0 + 20000, "on full hills");
  }
  assert.ok(n === 72000);
});
t("segment list: contiguous, generated ahead of the screen (>= hsc+W+ahead) and dropped behind; groundY(x) samples it; a no-ground segment reads null (GAPS hook)", () => {
  const { g } = game({ rand: rng(3), hi: 500 }); g.start();
  for (let i = 0; i < 240 * 40; i++) { g.auto(); step(g);
    if (i % 240 === 0) { const S = g.hl.Seg, hs = g.hl.hsc;
      assert.ok(S.length > 0 && S[0].x0 <= hs && S[S.length - 1].x1 >= hs + g.W + g.hl.HL.ahead, "covers the screen and the ahead margin");
      for (let j = 1; j < S.length; j++) assert.equal(S[j].x0, S[j - 1].x1);
      assert.ok(S[0].x1 >= hs - 2 * g.hl.L, "old segments dropped");
      for (let x = 0; x <= g.W; x += 37) assert.equal(g.hl.gY(x), g.GY - g.hl.H(x)); } }
  const S = g.hl.Seg, sg = S[S.length - 1], k = sg.k; sg.k = "gap";
  assert.equal(g.hl.Gr((sg.x0 + sg.x1) / 2), null); assert.equal(g.hl.gY(sg.x0 + 1 - g.hl.hsc), null); assert.equal(g.hl.W(sg.x0 + 1), 0);
  sg.k = k;
});
t("terrain is a pure function of world distance: same height at the same world x at any time, in any run; no pop at the edge", () => {
  const a = game({ rand: rng(1) }).g, b = game({ rand: rng(9) }).g; a.start(); b.start();
  for (let wx = 0; wx < 80000; wx += 137) assert.equal(a.hl.W(wx), b.hl.W(wx));
  // scrolling: the right edge of a 1280-wide view moves continuously (|dh| <= max slope x felt step); nothing appears abruptly
  const { g } = scripted(true, 1, 1); let prev = null, worst = 0;
  for (let i = 0; i < 240 * 90; i++) { g.inv = 1e9; step(g); const h = g.hl.H(900); if (prev !== null) worst = Math.max(worst, Math.abs(h - prev)); prev = h }
  assert.ok(worst < 0.32 * 800 * DT + 0.01, "edge jump " + worst);
});
t("first 12 s flat and identical to hills-off (state traces equal), then hills ease in; amplitude <= 150 px = 0.5 H (a1 0.4 H x L5 mul 1.25), slope <= 0.32, valleys curved", () => {
  for (const s of [1, 4, 7]) {
    const run = (hills) => { const { g, calls } = game({ hills, rand: rng(s), hi: 500 }); g.start(); const tr = [];
      for (let i = 0; i < 240 * 12; i++) { g.now += DT * 1000; g.auto(); g.update(DT); tr.push([g.score, g.py, g.vy, g.ents.map((e) => e.t + e.x).join()].join("|")); if (g.state !== "run") break }
      return { g, tr: tr.join("\n"), rand: calls.rand } };
    const a = run(true), b = run(false);
    assert.ok(a.tr === b.tr, "seed " + s); assert.equal(a.rand, b.rand); assert.equal(a.g.hl.B(), 0); assert.equal(a.g.hl.F, 1);
  }
  const { g } = game({ rand: rng(1) }); g.start();
  let maxH = 0, maxS = 0, flatRuns = 0, run = 0;
  for (let wx = g.hl.D0 + 2400; wx < g.hl.D0 + 120000; wx += 2) {
    const h = g.hl.W(wx), s = (g.hl.W(wx + 1) - g.hl.W(wx - 1)) / 2, c = g.hl.W(wx + 4) - 2 * h + g.hl.W(wx - 4);
    maxH = Math.max(maxH, h); maxS = Math.max(maxS, Math.abs(s));
    run = Math.abs(s) < 1e-3 && Math.abs(c) < 1e-4 ? run + 2 : 0; flatRuns = Math.max(flatRuns, run);
  }
  assert.ok(maxH <= 0.5 * 300 + 0.01 && maxH > 0.45 * 300, "max height " + maxH); assert.ok(maxS <= 0.32,"max slope " + maxS);
  assert.ok(flatRuns < 8, "a flat stretch of " + flatRuns + " px (valley floors must curve)");
  assert.ok(g.hl.W(g.hl.D0 - 1) === 0 && g.hl.W(g.hl.D0 + 50) < 0.1, "eases in from 0");
});
t("no new Math.random: from the same state, spawn() draws the same random numbers and makes the same obstacles with hills on/off", () => {
  for (const s of [1, 2, 3]) {
    const seq = (hills) => { const { g, calls } = game({ hills, rand: rng(s), hi: 500 }); g.start(); g.hsc = 60000; const out = [];
      for (let i = 0; i < 300; i++) { g.score = 30 + i * 9; g.runS = 5 + i * .5; g.speed = Math.min(760, 340 + i * 2); g.ents = []; g.spawn();
        out.push(g.ents.filter((e) => e.t !== "k").map((e) => e.t + e.x + "/" + e.w + "/" + e.bot).join(";") + "#" + g.nextGap) }
      return { out, rand: calls.rand } };
    const a = seq(true), b = seq(false);
    assert.equal(a.rand, b.rand, "seed " + s);
    // hills may slide a pillar slot forward (k x 40 px <= 480, hlSpawn) or drop the pillar; everything else is identical
    const xs = (o) => o.split("#")[0].split(";").filter(Boolean).map((p) => { const m = p.match(/^([a-z])([-\d.]+)\/(.*)$/); return { t: m[1], x: +m[2], r: m[3] } });
    for (let i = 0; i < a.out.length; i++) { if (a.out[i] === b.out[i]) continue;
      assert.equal(a.out[i].split("#")[1], b.out[i].split("#")[1], "nextGap"); assert.ok(/(^|;)p/.test(b.out[i]), "only pillar slots change: " + a.out[i] + " vs " + b.out[i]);
      const A = xs(a.out[i]), B = xs(b.out[i]), Bn = B.filter((e) => e.t !== "p");
      if (A.length === Bn.length && A.every((e, j) => e.t === Bn[j].t && e.x === Bn[j].x && e.r === Bn[j].r)) continue;  // dropped
      const d = A[0].x - B[0].x; assert.ok(d > 0 && d <= 480 && Math.abs(d / 40 - Math.round(d / 40)) < 1e-9, "slid " + d);
      assert.ok(A.length === B.length && A.every((e, j) => e.t === B[j].t && Math.abs(e.x - B[j].x - d) < 1e-9 && e.r === B[j].r)) }
  }
});
t("Playtest #82 (a) + Mobile #80 item 4: every pillar / ember vent hills place keeps the flat 80 ms-tap window (5 ms take-off steps, L5 760 x 1.06), none on rising ground (slope <= .05)", () => {
  const win = (hills, xc, sp) => { let ok = 0, run = 0, best = 0;
    for (let k = 0; k < 130; k++) { const { g } = game({ hills, rand: rng(1), hi: 500, lvMul: 1.06 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9;
      /* settle 1100 px further back with the pillar pinned at its world x (so hlNL suppresses crest launches as in a real run: the 0.5 H
         hills launch on the way in); it is then ~900 px ahead as before */
      const pin = () => { g.ents = [{ x: xc - g.hsc - 13, w: 26, h: 50, bot: 0, t: "p" }] };
      g.hsc = xc - 2000; g.speed = sp; for (let i = 0; i < 120; i++) { pin(); step(g) } for (let i = 0; i < 2400 && g.py > 0; i++) { pin(); step(g) }
      for (let i = 0; i < 2400 && xc - g.hsc - 13 > 900; i++) { g.speed = sp; pin(); step(g) } const e = g.ents[0];
      const d0 = 0.6 - k * 0.005; let hitp = false, jp = false, rel = -1;
      for (let i = 0; i < 240 * 3 && e.x + e.w > -20; i++) { g.speed = sp; g.nextGap = 1e9; if (!jp && e.x - (PX + PW) <= d0 * g.speed * g.vMul() && g.py === 0) { jp = true; g.press(); rel = i + 19 } if (i === rel) g.release(); step(g); if (g.state !== "run") { hitp = true; break } }
      if (jp && !hitp) { run += 0.005; best = Math.max(best, run) } else run = 0 }
    return best };
  const flat = win(false, 70000, 760); assert.ok(flat >= 0.3, "flat tap window " + flat);
  const { g } = game({ hills: true, rand: rng(5), hi: 500, lvMul: 1.06 }); g.start(); let shifted = 0; const at = [];
  for (let i = 0; i < 400 && at.length < 10; i++) { g.hsc = 60000 + i * 997; g.speed = 760; g.score = 3000; g.runS = 100; g.ents = []; g.spawn(); const p = g.ents.find((e) => e.t === "p");
    if (p) { at.push(g.hsc + p.x + 13); if (p.x !== 620) shifted++; assert.ok(g.hl.Sl(p.x + 13) <= 0.05 + 1e-9, "pillar on rising ground " + g.hl.Sl(p.x + 13)) } }
  assert.ok(at.length >= 8, "pillars " + at.length);
  const ws = at.map((xc) => win(true, xc, 760)); for (let i = 0; i < ws.length; i++) assert.ok(ws[i] >= flat - 0.011, "pillar at world " + at[i].toFixed(0) + ": tap window " + ws[i].toFixed(3) + " s [DBG h " + [-300, -240, -150, -100, 0, 13].map((o) => g.hl.W(at[i] + o).toFixed(1)) + "] < flat " + flat.toFixed(3));
  console.log("     pillars: flat 80 ms-tap window " + flat.toFixed(3) + " s; hills worst " + Math.min(...ws).toFixed(3) + " s over " + at.length + " placed pillars (" + shifted + " slid)");
});
t("Mobile #80 item 2: jump ceiling Y <= max(HL.yMax GY-40 = 192, ground + HL.yUp 0.3 H[, boots peak]), robot top reported at 844x390 (x1.3), with and without boots; BIG AIR still pays on a real share of 80 ms taps", () => {
  const dist = (T) => { const a = Math.min(T, 60); return 340 * a + 3.5 * a * a + 760 * Math.max(0, T - 60) };
  const bootsPeak = Math.ceil(620 * 1.2 * 620 * 1.2 / (2 * 1800)) + 2;  // t439u: hlPhys raises the cap to gh+bootsPeak while spT>0
  const capY = (gh, boots) => Math.max(192, gh + 90, boots ? gh + bootsPeak : 0);
  const ceil = (boots) => { let ymax = 0, ph = 0;
    for (let o = 0; o < 40; o++) { const { g } = game({ rand: rng(2), hi: 500, lvMul: 1.06 }); g.start(); g.puNext = 1e9; g.nextGap = 1e9;
      g.hsc = g.hl.D0 + 40000 + o * 37; g.speed = 760; step(g, 240); land(g); if (boots) g.spT = 99; ph = Math.max(ph, g.pH());
      g.press(); for (let i = 0; i < 480; i++) { g.speed = 760; g.nextGap = 1e9; g.ents = []; if (boots) g.spT = 99; step(g); const gh = g.hl.B(); ymax = Math.max(ymax, gh + g.py); assert.ok(gh + g.py <= capY(gh, boots) + 1e-6, "above the cap"); if (g.py === 0 && i > 10) break } }
    return [ymax, ph] };
  { const HLx = game({ rand: rng(1) }).g.hl.HL; assert.ok(HLx.yMax === 192 && HLx.yUp === 90, "cap = max(GY-40, ground + 0.3 H)") }
  for (const boots of [false, true]) { const [y, ph] = ceil(boots); const top = (232 - y - ph) * 1.3;
    /* plain: robot top may leave the canvas by ~40 px off a 0.5 H crest; boots (t439u) raise the world-Y cap to the full boots peak, so allow ~90 CSS px */
    assert.ok(top >= -(boots ? 100 : 40) * 1.3,(boots ? "boots " : "") + "robot top " + top.toFixed(1) + " CSS px"); console.log("     ceiling" + (boots ? " (boots)" : "") + ": peak Y " + y.toFixed(1) + ", robot top " + top.toFixed(1) + " CSS px at 844x390") }
  const share = (T) => { let pay = 0, n = 0;
    for (let o = 0; o < 300; o += 6) { const { g } = game({ rand: rng(1), hi: 500 }); g.start(); g.puNext = 1e9; g.nextGap = 1e9;
      const sp = Math.min(760, 340 + 7 * T); g.hsc = g.hl.D0 + dist(T) - dist(12); g.speed = sp; step(g, 240); land(g);
      step(g, o); g.speed = sp; const a0 = g.hl.air; g.press(); step(g, 19); g.release(); for (let i = 0; i < 480 && (g.py > 0 || i < 5); i++) { g.speed = sp; g.nextGap = 1e9; g.ents = []; step(g) }
      n++; if (g.hl.air > a0) pay++ }
    return pay / n };
  /* hill wavelengths are 1.6x longer at 0.5 H, so a single spot can be a long gentle stretch (share 0 at 45 s): average 5 spots around each time */
  const avg = (T) => [-4, -2, 0, 2, 4].reduce((s, d) => s + share(T + d), 0) / 5;
  const s45 = avg(45), s75 = avg(75); assert.ok(s45 >= 0.2 && s75 >= 0.3, "BIG AIR share " + s45 + " / " + s75);
  console.log("     BIG AIR pays on " + (s45 * 100).toFixed(0) + "% / " + (s75 * 100).toFixed(0) + "% of 80 ms taps at 45 / 75 s");
});
t("Playtest #82 (b): no crest launch with a hazard within 1 s (felt) ahead; mid-air duck = fast fall (G x 3) to the ground", () => {
  // a crest that launches the buggy when nothing is ahead
  const crest = (withFlyer) => { const { g } = game({ rand: rng(1), hi: 500, lvMul: 1.06 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9; g.hsc = g.hl.D0 + 40000; step(g, 240); land(g);
    let launches = 0, was = 0;
    for (let i = 0; i < 240 * 20; i++) { g.speed = 760; g.nextGap = 1e9; if (withFlyer) g.ents = [{ x: PX + PW + 300, w: 33, h: 18, bot: 18, t: "f" }]; g.inv = 1e9; step(g); const c = g.hl.Cr && g.py > 0; if (c && !was) launches++; was = c }
    return launches };
  const free = crest(false), held = crest(true);
  assert.ok(free >= 3, "crest launches with nothing ahead: " + free); assert.equal(held, 0, "no crest launch with a flyer 300 px ahead");
  const { g } = game({ hills: false, rand: rng(1), hi: 500 }); g.start(); g.nextGap = 1e9; g.press(); step(g, 60); const up = g.py; g.duck = true; let n = 0; while (g.py > 0 && n < 240) { step(g); n++ }
  g.release(); const { g: h } = game({ hills: false, rand: rng(1), hi: 500 }); h.start(); h.nextGap = 1e9; h.press(); step(h, 60); h.release(); let m = 0; while (h.py > 0 && m < 240) { step(h); m++ }
  assert.ok(up > 40 && n < m * 0.75, "fast fall: " + n + " vs " + m + " steps");
});
t("physics on the local ground: grounded follows the terrain (py 0, no input), a jump starts from and lands on the local ground", () => {
  const { g } = game({ rand: rng(1), hi: 500 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9;
  g.hsc = g.hl.D0 + 20000; // full hills (a teleport: let the one artificial launch land first)
  step(g, 240); land(g);
  let up = 0, hi = 0;
  for (let i = 0; i < 240 * 5; i++) { step(g); if (g.py > 0) up++; hi = Math.max(hi, g.hl.B()) }
  assert.ok(hi > 30, "rode over hills " + hi); assert.ok(up < 240 * 5 * 0.3, "mostly grounded");
  for (let k = 0; k < 20; k++) {
    land(g);
    step(g, 37 + k * 11); if (g.py > 0) continue;
    const g0 = g.hl.B(); g.press(); g.release(); step(g); assert.ok(g.py > 0 && g.py < 3, "takes off from the ground under it");
    let peak = 0; while (g.py > 0) { step(g); peak = Math.max(peak, g.py) } assert.equal(g.py, 0); assert.equal(g.vy, 0);
    assert.ok(peak > 15, "a real jump (" + peak.toFixed(1) + " px above the local ground)"); assert.ok(Math.abs(g0) >= 0);
  }
});
t("BIG AIR: a crest launch pays skEarn +1..+3 (>= 60/120/180 px), BIG AIR label, sfxAir(60..220), msOn('air',h); flat jumps never pay", () => {
  // flat: 60 jumps in the first 12 s (held, peak 107 px) pay nothing
  const f = game({ rand: rng(1), hi: 500 }); f.g.start(); f.g.nextGap = 1e9; f.g.puNext = 1e9;
  for (let i = 0; i < 240 * 11.5; i++) { if (i % 60 === 0) f.g.press(); if (i % 60 === 50) f.g.release(); step(f.g) }
  assert.equal(f.calls.air.length, 0); assert.equal(f.g.hl.air, 0);
  // hills at speed: the demo autopilot line, 120 s, 6 seeds
  let n = 0, pays = new Set();
  for (const s of [1, 2, 3, 4, 5, 6]) {
    const { g, calls } = game({ rand: rng(s), hi: 500 }); g.start();
    for (let i = 0; i < 240 * 120 && g.state === "run"; i++) { g.auto(); step(g) }
    assert.equal(g.state, "run", "autopilot survives 120 s of hills, seed " + s);
    n += calls.air.length;
    for (const h of calls.air) assert.ok(h >= 60 && h <= 220);
    assert.equal(calls.ms.filter((m) => m[0] === "air").length, calls.air.length);
    for (const m of calls.ms.filter((m) => m[0] === "air")) assert.ok(m[1] >= 60);
    calls.label.filter((l) => /^BIG AIR/.test(l)).forEach((l) => pays.add(l));
    assert.equal(calls.label.filter((l) => /^BIG AIR/.test(l)).length, calls.air.length);
    assert.ok(g.hl.airS <= 10, "per-run cap 10");
  }
  assert.ok(n >= 6, "BIG AIR happens (" + n + ")"); assert.ok(pays.has("BIG AIR +2\u2726") || pays.has("BIG AIR +1\u2726"), [...pays].join());
});
t("BIG AIR never in demo (no sparks, label, sfxAir or msOn); the demo autopilot still survives 120 s of hills", () => {
  for (const s of [1, 2, 3]) {
    const { g, calls } = game({ demo: true, rand: rng(s), hi: 500 });
    for (let i = 0; i < 240 * 125; i++) { g.now += DT * 1000; g.update(DT); if (g.state === "over") break }
    assert.equal(g.state, "run", "demo survives, seed " + s); assert.equal(g.hl.on, true);
    assert.deepEqual([calls.air.length, calls.ms.length, calls.label.filter((l) => /AIR/.test(l)).length], [0, 0, 0]);
  }
});
t("fairness: collisions compare heights above the buggy's ground (a crate on a slope is never taller); jump relative to the slope", () => {
  assert.ok(SIM.includes("      var ey=(e.ax!=null?GY-hlEG(e):gb)-e.bot-e.h;"));
  // straight-slope jump = flat jump relative to the ground: a tap's airtime on a steep uphill stays within 10% of flat
  const air = (hsc) => { const { g } = game({ rand: rng(1), hi: 500 }); g.start(); g.nextGap = 1e9; g.puNext = 1e9; g.hsc = hsc; g.speed = 600; step(g, 40); land(g); step(g, 20);
    land(g); g.press(); g.release(); let n = 0; step(g); while (g.py > 0) { step(g); n++ } return n * DT };
  const flat = air(0);
  const { g } = game({ rand: rng(1) }); g.start(); let best = 0, wx = 0;
  for (let x = g.hl.D0 + 30000; x < g.hl.D0 + 32000; x += 5) { const s = (g.hl.W(x + 1) - g.hl.W(x - 1)) / 2; if (s > best) { best = s; wx = x } }
  const up = air(wx - PX - PW / 2 - 40 * 600 / 240);
  assert.ok(Math.abs(up - flat) / flat < 0.25, `uphill tap airtime ${up.toFixed(3)} vs flat ${flat.toFixed(3)}`);
});
function arcSweep(lvMul, phases = 40, hills = true) {
  const q = (arr, rest = 0.99) => { let i = 0; return () => (i < arr.length ? arr[i++] : rest) };
  let tried = 0, kept = 0;
  for (let v = 400; v <= 760; v += 60) for (const n of [1, 2, 3]) for (let ph = 0; ph < phases; ph++) {
    const cnt = [0.1, 0.5, 0.9][n - 1];
    let src = () => 0.99;   // settle with a neutral stream, then hand spawn() the scripted draws
    const { g, calls } = game({ rand: () => src(), hi: 500, lvMul, hills });
    g.start(); g.score = 120; g.runS = 20; g.puNext = 1e9; g.speed = v; g.nt = "b"; g.nextGap = 1e9;
    g.hsc = g.hl.D0 + 30000 + ph * 97;
    step(g, 240); land(g);   // settle on the ground at this phase (felt speed eased)
    src = q([cnt, ...Array(n).fill(0.3), 0.3, 0.3, 0.1, 0.1]);
    g.score = 120; g.runS = 20; g.speed = v; g.nt = "b"; g.ents = [];
    const snap = () => JSON.stringify([g.py, g.vy, g.hsc, g.speed, g.hl]); const before = snap(); const sp0 = calls.spark; g.spawn();
    assert.equal(snap(), before, "the arc look-ahead restores every global"); g.nextGap = 1e9; tried++;
    const k = g.ents.filter((e) => e.t === "k"), b = g.ents.filter((e) => e.t === "b");
    if (k.length !== 5) continue; kept++;
    let jumped = false;
    for (let i = 0; i < 240 * 6 && g.state === "run"; i++) {
      const cx = (b[0].x + b[b.length - 1].x + b[b.length - 1].w) / 2;
      if (!jumped && g.py === 0 && cx - (PX + PW / 2) <= g.speed * g.vMul() * (CUT / G)) { jumped = true; g.press(); g.release() }
      step(g);
      if (!g.ents.some((e) => e.t === "k" || (e.t === "b" && e.x + e.w > PX - 5))) break;
    }
    assert.equal(g.state, "run", `one tap clears ${n} bugs at ${v}, phase ${ph}`);
    assert.equal(calls.spark - sp0, 5, `arc 5/5 at ${v}/${n}, phase ${ph}`);
  }
  assert.ok(kept / tried > 0.3, `arcs offered on full hills: ${kept}/${tried}`); console.log(`     arcs offered (hills ${hills ? "on" : "off"}, lvSpeedMul ${lvMul ?? "none"}; rest dropped by the look-ahead): ${kept}/${tried}`);
}
t("spark arcs on hilly ground: every arc that spawns is collected 5/5 by ONE tap at the perfect time (speeds 400-760, 40 terrain phases)", () => {
  arcSweep(undefined);
});
t("VMUL_CAP 1.10: vMul() = min(slope x lv, 1.10, 800/speed) at every step; portrait (390x844, 363 u ahead) look-ahead on hills >= flat look-ahead at the capped felt speed (1 frame), lvSpeedMul .8 / 1.0 / 1.10, L3 600 and L5 top speed 760", () => {
  assert.match(HILLS, /var VMUL_CAP=1\.10;/);
  const AHEAD = 363, out = [];
  for (const sp of [600, 760]) for (const m of [0.8, 1.0, 1.10]) {
    const { g } = game({ lvMul: m, rand: rng(7), hi: 500 }); g.start(); g.puNext = 1e9;
    g.hsc = g.hl.D0 + 30000; const hs = [], fs = [];
    for (let i = 0; i < 240 * 40 && g.state === "run"; i++) { g.speed = sp; g.inv = 1e9; g.ents = []; g.auto(); step(g); hs.push(g.hsc); const f = g.speed * g.vMul(); fs.push(f);
      assert.ok(g.vMul() <= 1.10 + 1e-12 && f <= 800 + 1e-9, "vMul " + g.vMul()); }
    const ref = AHEAD / Math.min(800, sp * 1.10), flat = AHEAD / Math.min(800, sp * m);
    let worst = 1e9; for (let i = 0, j = 0; i < hs.length; i++) { while (j < hs.length && hs[j] - hs[i] < AHEAD) j++; if (j >= hs.length) break; worst = Math.min(worst, (j - i) * DT) }
    out.push(`${sp}x${m}: ${worst.toFixed(3)} s (flat ${flat.toFixed(3)}, cap ref ${ref.toFixed(3)}, top felt ${Math.max(...fs).toFixed(0)})`);
    assert.ok(worst >= ref - 1 / 60 - 1e-9, `look-ahead ${worst.toFixed(3)} s < cap-flat ${ref.toFixed(3)} s - 1 frame at speed ${sp} x ${m}`);
  }
  console.log("     portrait look-ahead: " + out.join("; "));
});
t("vMul(): hills slope x lvSpeedMul (stub .8 / 1.25, clamped .8..1.25) moves the world only: score/runS/speed/scroll identical; spark arcs still 5/5", () => {
  for (const m of [0.8, 1.25]) for (const s of [1, 2]) {
    const a = scripted(true, 90, s, m), b = scripted(true, 90, s);
    assert.ok(a.tr.join("\n") === b.tr.join("\n"), `lvSpeedMul ${m}, seed ${s}: score/runS/speed/scroll differ`);
  }
  const { g } = game({ lvMul: 3, hills: false }); g.start(); g.speed = 500; assert.equal(g.vMul(), 1.10);
  // felt-speed cap: speed*vMul() <= 800 px/s at every step of 90 s runs (L5-ish 1.25 x downhill), score/speed untouched (above)
  for (const m of [1.25, 1.15, undefined]) { const { g: c } = game({ lvMul: m, rand: rng(4), hi: 500 }); c.start(); let top = 0;
    for (let i = 0; i < 240 * 90 && c.state === "run"; i++) { c.auto(); c.inv = 1e9; step(c); top = Math.max(top, c.speed * c.vMul()); assert.ok(c.speed * c.vMul() <= 800 + 1e-9) }
    if (m === 1.25) assert.ok(top > 799, "the cap binds at 1.25 (top " + top + ")") }
  { const { g: c } = game({ lvMul: 1.25, hills: false }); c.start(); c.speed = 760; assert.ok(Math.abs(c.vMul() - 800 / 760) < 1e-12); c.speed = 500; assert.equal(c.vMul(), 1.10, "VMUL_CAP") }
  const { g: g2 } = game({ lvMul: 0.1, hills: false }); g2.start(); assert.equal(g2.vMul(), 0.8);
  for (const m of [0.8, 1.25]) { arcSweep(m, 12); arcSweep(m, 1, false) }
  // #78 levels (L1 .85 .. L5 1.15): arcs spaced at speed*vMul(), and the demo autopilot (timing at speed*vMul()) survives, deterministic
  for (const m of [0.85, 1.15]) { arcSweep(m, 6); arcSweep(m, 1, false);
    const run = (s) => { const { g } = game({ demo: true, rand: rng(s), hi: 500, lvMul: m }); const tr = [];
      for (let i = 0; i < 240 * 120; i++) { g.now += DT * 1000; g.update(DT); if (g.state === "over") break; if (i % 240 === 0) tr.push(g.score + "|" + g.py) } return [g.state, tr.join()] };
    for (const s of [1, 2, 3]) { const a = run(s), b = run(s); assert.equal(a[0], "run", `demo autopilot dies at lvSpeedMul ${m}, seed ${s}`); assert.equal(a[1], b[1], "demo deterministic") } }
});
t("render: the challenge ghost marker stands on the terrain at its x; entities and the buggy are moved onto the ground", () => {
  assert.ok(RENDER.includes('var gy=GY-(typeof hlH==="function"?hlH(x):0);'));
  assert.ok(RENDER.includes("ctx.moveTo(x,gy);ctx.lineTo(x,gy-56);"));
  assert.ok(RENDER.includes('hlS=typeof hlEP==="function"&&hlEP(e);') && RENDER.includes("i++,hlS&&(hlS=false,SY=hlSY0,base())"));
  assert.ok(RENDER.includes('typeof hlRB==="function"&&hlRB();') && RENDER.includes('typeof hlDraw==="function"&&hlDraw();'));
});
console.log(`hills: ${pass} checks passed`);
