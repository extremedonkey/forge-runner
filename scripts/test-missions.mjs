// Missions core tests (MISSIONS-1, revenue-two-changes spec §3 acceptance 1-4, 6, 7). Plain node:test, no browser.
// Evaluates src/client/06e-missions.js (a client fragment) with fake storage/game globals, like scripts/test-sparks.mjs.
// Run: node --test scripts/test-missions.mjs   (npm run test:missions; also run by scripts/test-build.mjs, i.e. npm test)
// Payout sizing: MS_PAY tiers were checked with sparks/economy-sim.py plus a mission model (see the PR body): last upgrade ~82 min.
import { test } from "node:test";
import assert from "node:assert/strict";
import MS_SRC from "../src/client/06e-missions.js";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import LEVELS from "../src/client/06d-levels.js";
import vm from "node:vm";
const body = (f) => f.slice(1, -1);
const BODY = body(MS_SRC);
const KEY = "forge-runner-missions";

const mapStore = (m = new Map()) => ({ m, get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)) });
const throwStore = () => ({ get: () => { throw new Error("SecurityError") }, set: () => { throw new Error("QuotaExceeded") } });

// The fragment in its own scope. env: { demo, tpu, skDebug, LVQ, LV_AT, store: Map | "throw" }
function load(env = {}) {
  const store = env.store === "throw" ? null : env.store || new Map();
  const ls = store ? { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }
    : { getItem: () => { throw new Error("SecurityError") }, setItem: () => { throw new Error("QuotaExceeded") } };
  const earned = [];
  const pre = `"use strict";var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")};` +
    (env.skDebug ? "var skDebug=true;" : "") + (env.LVQ ? `var LVQ=${env.LVQ};` : "") + (env.LV_AT ? `var LV_AT=${JSON.stringify(env.LV_AT)};` : "") +
    `function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
     function skEarn(n){earned.push(n)}function skSave(){}`;
  const g = new Function("localStorage", "earned", pre + BODY + ";return {createMissions,MS_POOL,MS_STARTER,MS_PAY,MS,msOn,msActive,msOff}")(ls, earned);
  return { g, store, earned };
}
const core = load().g;
const make = (o = {}) => core.createMissions({ storage: mapStore(), seed: 7, ...o });
const ids = (m) => m.active().map((x) => x.id);
// LV_AT straight from 06d-levels.js (vm context with the few globals it needs at load), so these tests follow Levels' thresholds
const LV_CTX = vm.createContext({ window: { FR_BUILD: "site" }, Q: { get: () => null }, START: 340, MAXV: 760, OR: "#f97316", CY: "#22d3ee", VI: "#a855f7", Float32Array, Uint8Array, Math });
vm.runInContext(body(LEVELS), LV_CTX);
const LV_AT = [...vm.runInContext("LV_AT", LV_CTX)], LV_SEC = [...vm.runInContext("LV_SEC", LV_CTX)];
// a 5-second run as the hooks would report it: start, ~4 jumps/s worth of taps capped by the game (5 s -> 5 jumps), 1 spark, over
function fiveSecondRun(on) { on("start"); for (let i = 0; i < 5; i++) on("jump"); on("spark", 1); on("over", Math.floor(80 * 20), 5); }

test("API: the pure core exposes only mission functions and a sparks payout; nothing named score/speed/scroll/runS", () => {
  const m = make();
  assert.deepEqual(Object.keys(m).sort(), ["active", "banner", "completed", "disabled", "on", "pending", "runEnd", "runStart", "runs", "save", "takePayout"]);
  assert.deepEqual(Object.keys(m.active()[0]).sort(), ["ev", "goal", "icon", "id", "label", "progress", "sparks"]);
});

test("acceptance 1: missions only change the sparks bank (score, speed, scroll, runS, hi, Math.random draws identical on vs off)", () => {
  // static: the fragment never names a score-path variable, never touches localStorage directly, never calls Math.random
  const code = BODY.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const id of ["score", "speed", "scroll", "runS", "hi", "best", "KEY", "spT", "bgT", "Math.random", "localStorage", "document", "ctx", "addEventListener"])
    assert.ok(!new RegExp(`(^|[^\\w.])${id.replace(".", "\\.")}(?![\\w])`).test(code), `06e must not reference ${id}`);
  // dynamic: 06-state + 06b-sparks + (06e or a no-op msOn) in one scope, same scripted run with a seeded Math.random
  const replay = (withMissions) => {
    const store = new Map([["forge-runner-hi", "900"]]);
    const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
    let seed = 42, draws = 0; const M = Object.create(Math);
    M.random = () => { draws++; seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 };
    const pre = `"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="",START=340,MAXV=760;
      function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
      function sfxBuy(){}function sfxAllMax(){}`;
    const src = pre + body(STATE) + body(SPARKS) + (withMissions ? BODY : "function msOn(){return 0}") +
      `;var hi=+lsg("forge-runner-hi")||0;
      function step(dt){runS+=dt;speed=Math.min(MAXV,speed+7*dt);scroll+=speed*dt;score+=speed*dt*.05;if(Math.random()<.02){}}
      msOn("start");
      for(var f=0;f<600;f++){step(1/60);if(f%40===0)msOn("jump");if(f%90===0){skEarn(1);msOn("spark",1)}}
      msOn("over",Math.floor(score*20),runS);if(score>hi){hi=Math.floor(score);lss("forge-runner-hi",hi)}
      return {score:score,speed:speed,scroll:scroll,runS:runS,hi:hi,bank:sk.b}`;
    const out = new Function("localStorage", "Math", src)(ls, M);
    return { ...out, draws, hiStored: store.get("forge-runner-hi") };
  };
  const on = replay(true), off = replay(false);
  const scoreSide = (r) => JSON.stringify([r.score, r.speed, r.scroll, r.runS, r.hi, r.hiStored, r.draws]);
  assert.equal(scoreSide(on), scoreSide(off), "score-related outputs byte-identical");
  assert.ok(on.bank > off.bank, `only the sparks bank differs (${on.bank} vs ${off.bank})`);
});

test("acceptance 2: a scripted 5-second run completes at least 1 mission in run 1, and it pays sparks", () => {
  const paid = [];
  const m = make({ onComplete: (x, p) => paid.push([x.id, p]) });
  const on = (ev, a, b) => ev === "start" ? m.runStart() : ev === "over" ? m.runEnd({ distPx: a, durS: b }) : m.on(ev, a);
  assert.equal(m.active()[0].id, "jump5", "first mission is doable in a 5 s run");
  fiveSecondRun(on);
  assert.ok(m.completed() >= 1 && paid.length >= 1, "completed in run 1");
  assert.ok(m.pending() > 0); assert.equal(m.takePayout(), paid.reduce((a, [, p]) => a + p, 0)); assert.equal(m.pending(), 0);
  // the game glue banks it with skEarn()
  const { g, earned } = load();
  fiveSecondRun(g.msOn);
  assert.ok(earned.length >= 1 && earned.every((n) => n > 0), `glue paid ${earned}`);
});

test("acceptance 3: exactly 3 shown, rolls on completion, no duplicate ids, persists across reload and runs", () => {
  const st = mapStore();
  const m = core.createMissions({ storage: st, seed: 3 });
  assert.equal(m.active().length, 3);
  const before = ids(m);
  m.runStart(); for (let i = 0; i < 5; i++) m.on("jump");
  const after = ids(m);
  assert.equal(after.length, 3); assert.ok(!after.includes("jump5"), "completed mission replaced"); assert.equal(new Set(after).size, 3);
  assert.deepEqual(after.slice(0, 2), before.slice(1, 3));
  // progress across runs (cumulative): sparkT20 progresses over two runs
  m.on("spark", 4); m.runEnd({ durS: 5, distPx: 1000 }); m.runStart(); m.on("spark", 3);
  assert.equal(m.active().find((x) => x.id === "sparkT20").progress, 7);
  // reload: a new instance on the same storage shows the same missions and progress (saved at run end and on completion)
  m.runEnd({ durS: 4, distPx: 900 });
  const r = core.createMissions({ storage: st });
  assert.deepEqual(r.active(), m.active()); assert.equal(r.runs(), 2);
  // stress: hundreds of random events never show != 3 or duplicates
  let rs = 1; const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const big = core.createMissions({ storage: mapStore(), seed: 11, banners: true });
  const evs = ["jump", "spark", "boots", "pu", "level", "stomp", "drone"];
  for (let run = 0; run < 200; run++) {
    big.runStart();
    for (let i = 0; i < 30; i++) { const e = evs[Math.floor(rnd() * evs.length)]; big.on(e, e === "level" ? 1 + Math.floor(rnd() * 5) : 1) }
    big.runEnd({ durS: rnd() * 90, distPx: rnd() * 40000 });
    const a = ids(big); assert.equal(a.length, 3); assert.equal(new Set(a).size, 3, a.join());
  }
  assert.ok(big.completed() > 20, `completed ${big.completed()}`);
});

test("acceptance 3: run-scoped missions reset each run; 'max' missions judge one run", () => {
  const m = make();
  m.runStart(); m.on("jump", 5); // complete jump5 so the pool rolls
  // force a known state through storage
  const st = mapStore(new Map([[KEY, JSON.stringify({ v: 1, a: [{ id: "spark3", p: 0 }, { id: "surv30", p: 0 }, { id: "dist10k", p: 0 }], n: 5, d: 1, s: 9 })]]));
  const k = core.createMissions({ storage: st });
  k.runStart(); k.on("spark", 2); k.runEnd({ durS: 20, distPx: 4000 });
  k.runStart(); assert.equal(k.active().find((x) => x.id === "spark3").progress, 0, "in-run sparks reset");
  k.on("spark", 3); assert.equal(k.completed(), 2, "3 in one run completes");
  assert.equal(k.active().find((x) => x.id === "surv30").progress, 20);
  k.runEnd({ durS: 31, distPx: 9000 }); assert.ok(!ids(k).includes("surv30"));
});

test("acceptance 3: incognito (storage throws) stays playable; corrupt save starts fresh", () => {
  const m = core.createMissions({ storage: throwStore(), seed: 5 });
  assert.equal(m.active().length, 3);
  m.runStart(); for (let i = 0; i < 5; i++) m.on("jump"); m.runEnd({ durS: 5, distPx: 1600 });
  assert.equal(m.completed(), 1); assert.equal(m.save(), false);
  const { g, earned } = load({ store: "throw" });
  fiveSecondRun(g.msOn); assert.ok(earned.length >= 1); assert.equal(g.msActive().length, 3);
  for (const bad of ["{", "[]", "null", '{"a":[{"id":"nope"},{"id":"jump5","p":"x"}]}']) {
    const c = core.createMissions({ storage: mapStore(new Map([[KEY, bad]])) });
    assert.equal(c.active().length, 3, bad); assert.equal(new Set(ids(c)).size, 3);
  }
});

test("acceptance 4: a level banner completes 'reach Level N' exactly once", () => {
  const st = mapStore(new Map([[KEY, JSON.stringify({ v: 1, a: [{ id: "lv2", p: 0 }, { id: "lv3", p: 0 }, { id: "jump150", p: 0 }], n: 9, s: 4 })]]));
  const paid = [];
  const m = core.createMissions({ storage: st, banners: true, onComplete: (x, p) => paid.push(x.id) });
  m.runStart(); m.banner(2); m.banner(2); m.banner(2);
  assert.deepEqual(paid, ["lv2"]);
  m.banner(3); m.banner(3); assert.deepEqual(paid, ["lv2", "lv3"]);
  for (let run = 0; run < 100; run++) { m.runStart(); m.banner(2); m.banner(3); m.on("jump", 3) }
  assert.equal(paid.filter((x) => x === "lv2").length, 1, "never rolls or pays again");
  assert.equal(paid.filter((x) => x === "lv3").length, 1);
  // at 'over' through the glue: distPx -> score (1 point = 20 px) -> LV_AT (06d-levels.js), read-only
  const lvStore = new Map([[KEY, JSON.stringify({ v: 1, a: [{ id: "lv2", p: 0 }, { id: "jump150", p: 0 }, { id: "pu15", p: 0 }], n: 9, s: 4 })]]);
  const { g, earned } = load({ LV_AT, store: lvStore });
  g.msOn("start"); g.msOn("over", (LV_AT[1] - 1) * 20, LV_SEC[1] - 1); assert.equal(earned.length, 0, "just short of Level 2");
  g.msOn("start"); g.msOn("over", LV_AT[1] * 20, LV_SEC[1]); assert.equal(earned.length, 1, "Level 2 at LV_AT[1]");
  g.msOn("start"); g.msOn("over", LV_AT[1] * 20, LV_SEC[1]);
  assert.deepEqual(JSON.parse(lvStore.get(KEY)).o, ["lv2"], "lv2 done once, never rolls again");
  assert.ok(!ids(g.MS).includes("lv2"), "exactly once");
  // without 06d (no LV_AT) the level missions are left out of the pool
  const { g: n } = load();
  assert.ok(!n.MS_POOL.filter((d) => d.ev === "level").some((d) => ids(n.MS).includes(d.id)));
  const none = core.createMissions({ storage: mapStore(new Map([[KEY, JSON.stringify({ v: 1, a: [{ id: "lv2", p: 0 }], n: 9 })]])) });
  assert.ok(!ids(none).includes("lv2"));
});

test("acceptance 6: no stomp/drone mission in the starter set (first 3 runs), even after many completions", () => {
  assert.ok(core.MS_STARTER.every((id) => !/stomp|drone/.test(id)));
  for (let seed = 1; seed <= 300; seed++) {
    const m = core.createMissions({ storage: mapStore(), seed, banners: true });
    for (let run = 1; run <= 3; run++) {
      m.runStart();
      for (let i = 0; i < 60; i++) { m.on("jump"); m.on("spark", 1); m.on("pu"); m.on("boots"); m.banner(3) }
      m.runEnd({ durS: 70, distPx: 30000 });
      if (run < 3) assert.ok(!m.active().some((x) => /stomp|drone/.test(x.ev)), `seed ${seed} run ${run}: ${ids(m)}`);
    }
  }
  // after the starter phase they can appear, and they are cumulative
  assert.ok(core.MS_POOL.filter((d) => d.r).every((d) => d.k === "cum" && /stomp|drone/.test(d.ev)));
  // the game glue excludes them until their hooks exist
  const { g } = load();
  for (let i = 0; i < 300; i++) { g.msOn("start"); for (let j = 0; j < 40; j++) { g.msOn("jump"); g.msOn("spark", 1); g.msOn("pu", "s"); g.msOn("boots") } g.msOn("over", 30000, 70);
    assert.ok(!g.msActive().some((x) => /stomp|drone/.test(x.ev))); }
});

test("acceptance 7: no progress, payout or writes in demo / ?pu= / debug runs", () => {
  for (const env of [{ demo: true }, { tpu: "g" }, { skDebug: true }, { LVQ: 3, LV_AT }]) {
    const store = new Map([[KEY, JSON.stringify({ v: 1, a: [{ id: "jump5", p: 4 }, { id: "spark3", p: 0 }, { id: "pu1", p: 0 }], n: 1, s: 2 })]]);
    const { g, earned } = load({ ...env, store });
    const snap = store.get(KEY);
    assert.equal(g.msOff, true, JSON.stringify(env));
    fiveSecondRun(g.msOn); g.msOn("pu", "j"); g.msOn("boots"); g.msOn("level", 3);
    assert.deepEqual(earned, []); assert.equal(store.get(KEY), snap, "save untouched");
    assert.equal(g.msActive().find((x) => x.id === "jump5").progress, 4, "progress frozen");
  }
  const d = core.createMissions({ storage: mapStore(), disabled: true, onComplete: () => assert.fail("no payout") });
  d.runStart(); for (let i = 0; i < 50; i++) d.on("jump"); d.runEnd({ durS: 99, distPx: 99999 });
  assert.equal(d.pending(), 0); assert.equal(d.completed(), 0); assert.equal(d.runs(), 0);
});

test("telemetry hook: onShown fires once per mission id (for mission_shown), onComplete carries the id (mission_done)", () => {
  const shown = [], done = [];
  const m = make({ onShown: (x) => shown.push(x.id), onComplete: (x) => done.push(x.id) });
  m.active(); m.active();
  assert.deepEqual(shown, ["jump5", "sparkT20", "pu1"]);
  m.runStart(); m.on("jump", 5); m.active();
  assert.deepEqual(done, ["jump5"]); assert.equal(shown.length, 4);
});

test("payout table: one constant, small, every mission pays a tier value", () => {
  const tiers = Object.values(core.MS_PAY);
  assert.ok(core.MS_POOL.every((d) => tiers.includes(d.p) && d.p > 0 && d.p <= 25));
  assert.equal(new Set(core.MS_POOL.map((d) => d.id)).size, core.MS_POOL.length, "unique ids in the pool");
});

// ---------- MISSIONS-2: chips + toast (draw only) ----------
// fake canvas context + txt()/hudB()/fitPx() + a controllable clock
function drawEnv(env = {}) {
  const store = env.store || new Map();
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const log = { rects: [], txt: [], alpha: [] };
  const c = { font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, _a: 1,
    get globalAlpha() { return this._a }, set globalAlpha(v) { this._a = v; log.alpha.push(v) },
    fillRect: (x, y, w, h) => log.rects.push({ x, y, w, h }), strokeRect: () => {}, measureText(s) { return { width: [...s].length * .6 * parseFloat(this.font.split(" ")[1]) } } };
  const clock = { t: 10000 };
  const pre = `"use strict";var demo=${!!env.demo},tpu="";var HS=${env.HS || 1},XO=0,VW=600,MONO="monospace";
    var performance={now:function(){return clock.t}};
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    function skEarn(){}function skSave(){}function hudB(){return 30}function fitPx(s,px){return px}
    function txt(s,x,y,px,col,al){log.txt.push({s:s,x:x,y:y,px:px});return [...s].length*px*.6}`;
  const g = new Function("localStorage", "log", "clock", pre + BODY +
    ";return {msOn,msDrawChips,msDrawToast,msToastLeft,MS,setShown:function(f){msShownCb=f},MS_TOAST_MS,MS_CHIP_H}")(ls, log, clock);
  return { g, c, log, clock, store };
}

test("toast: shown on completion, top-centre below hudB(), gone after <= 1.5 s, alpha restored", () => {
  const { g, c, log, clock } = drawEnv();
  assert.ok(g.MS_TOAST_MS <= 1500);
  assert.equal(g.msDrawToast(c), false, "nothing before a completion");
  g.msOn("start"); for (let i = 0; i < 5; i++) g.msOn("jump");            // jump5 completes
  assert.equal(g.msDrawToast(c), true);
  const t = log.txt.at(-1);
  assert.match(t.s, /^\u2726\+\d+ {2}Jump 5 times$/); assert.equal(t.x, 300, "centred in XO..XO+VW"); assert.ok(t.y > 30, "below hudB()");
  assert.equal(c.globalAlpha, 1, "alpha restored");
  clock.t += 1400; assert.equal(g.msDrawToast(c), true, "still up at 1.4 s"); assert.ok(log.alpha.some((a) => a > 0 && a < 1), "fades out");
  clock.t += 101; assert.equal(g.msDrawToast(c), false, "gone at 1.5 s"); assert.equal(g.msToastLeft(), 0);
});

test("toast is non-blocking: draw-only (no DOM/listeners), and events during it still count", () => {
  const code = BODY.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const id of ["addEventListener", "preventDefault", "stopPropagation", "document", "window", "press", "release", "state"])
    assert.ok(!new RegExp(`(^|[^\\w.])${id}(?![\\w])`).test(code), `06e must not reference ${id}`);
  const { g, c } = drawEnv();
  g.msOn("start"); for (let i = 0; i < 5; i++) g.msOn("jump");
  assert.equal(g.msDrawToast(c), true);
  const j = g.MS.active().find((m) => m.ev === "jump");
  const before = j ? j.progress : null;
  g.msOn("jump");                                                         // a jump during the toast
  if (j) assert.equal(g.MS.active().find((m) => m.id === j.id).progress, before + 1);
  assert.equal(g.msDrawToast(c), true, "toast unaffected by input");
});

test("chips: 3 compact icon+progress chips, <= 22*HS tall, inside x..x+w; shrink to fit narrow widths", () => {
  for (const HS of [1, 1.5]) {
    const { g, c, log } = drawEnv({ HS });
    const h = g.msDrawChips(c, 12, 100, 576);
    assert.ok(h > 0 && h <= 22 * HS, `height ${h} at HS ${HS}`);
    const boxes = log.rects.filter((r) => r.h === h);
    assert.equal(boxes.length, 3);
    assert.ok(boxes.every((b) => b.x >= 12 && b.x + b.w <= 12 + 576 && b.y === 100));
    assert.deepEqual(log.txt.map((t) => t.s), ["\u2191 0/5", "\u2726 0/20", "\u2605 0/1"]);
  }
  const { g, c, log } = drawEnv();
  g.msDrawChips(c, 0, 0, 150);
  const boxes = log.rects.filter((r) => r.h === 20);
  assert.ok(boxes.length === 3 && boxes.at(-1).x + boxes.at(-1).w <= 150 + 1, "fits a narrow width " + JSON.stringify(log.rects));
});

test("chips: shown hook fires once per mission per screen showing (for mission_shown telemetry)", () => {
  const { g, c, clock } = drawEnv();
  const seen = []; g.setShown((id) => seen.push(id));
  for (let f = 0; f < 60; f++) { g.msDrawChips(c, 12, 100, 576); clock.t += 16 }
  assert.deepEqual(seen, ["jump5", "sparkT20", "pu1"], "once for the whole screen");
  clock.t += 5000;                                                        // a run in between (no chip draws)
  g.msDrawChips(c, 12, 100, 576);
  assert.equal(seen.length, 6, "again on the next screen");
});

test("chips + toast draw nothing in demo / disabled runs", () => {
  const { g, c, log } = drawEnv({ demo: true });
  assert.equal(g.msDrawChips(c, 12, 100, 576), 0); g.msOn("start"); for (let i = 0; i < 5; i++) g.msOn("jump");
  assert.equal(g.msDrawToast(c), false); assert.equal(log.rects.length + log.txt.length, 0);
});

test("MISSIONS-4: a chip row in the HUD band stays left of the widest HUD (score 00000 + HI 00000); elsewhere it stays centred", () => {
  for (const HS of [1, 1.5]) {
    const { g, c, log } = drawEnv({ HS });
    const hudL = 600 - 14 - 5 * .6 * 20 * HS - 14 - 8 * .6 * 14 * HS;     // same fonts as drawHud, fake measureText = .6 em
    g.msDrawChips(c, 12, 30 - 10 * HS, 576);                             // band overlaps hudB() = 30
    const boxes = log.rects.filter((r) => r.h === Math.round(20 * HS));
    assert.equal(boxes.length, 3);
    assert.ok(boxes.at(-1).x + boxes.at(-1).w <= hudL - 8 * HS + 1, `HS ${HS}: right ${boxes.at(-1).x + boxes.at(-1).w} vs HUD left ${hudL}`);
    assert.ok(boxes[0].x >= 12);
  }
  const { g, c, log } = drawEnv();
  g.msDrawChips(c, 12, 100, 576);                                         // below the HUD band: centred as before
  const b = log.rects.filter((r) => r.h === 20);
  assert.ok(Math.abs((b[0].x - 12) - (12 + 576 - (b[2].x + b[2].w))) <= 1, "centred");
});

test("MISSIONS-5: level payouts follow when the level arrives; strictly less than any survive mission with a later or equal time", () => {
  // the real pool with the real LV_AT (06e evaluated after 06d's thresholds, as in the game)
  const pool = new Function(`"use strict";var demo=false,tpu="";function lsg(){return null}function lss(){}var START=340,MAXV=760,LV_AT=${JSON.stringify(LV_AT)};` +
    BODY + ";return {MS_POOL,MS_PAY,msLvSec}")();
  const lv = pool.MS_POOL.filter((d) => d.ev === "level"), sv = pool.MS_POOL.filter((d) => d.ev === "surv");
  assert.ok(lv.length >= 2 && sv.length >= 2);
  for (const d of lv) {
    assert.ok(Math.abs(d.sec - LV_SEC[d.n - 1]) <= 0.5, `${d.id}: base-curve time ${d.sec} s vs LV_SEC ${LV_SEC[d.n - 1]} s`);
    // strictly less (PO): a level reached at t s pays LESS than any 'Survive T s' with T >= t
    for (const s of sv) if (s.n >= d.sec) assert.ok(d.p < s.p, `${d.id} (${d.sec} s, ${d.p}) does not pay less than ${s.id} (${s.n} s, ${s.p})`);
  }
  // ladder: later levels never pay less than earlier ones
  for (let i = 1; i < lv.length; i++) assert.ok(lv[i].p >= lv[i - 1].p);
  // with LEVELS-3 thresholds (20/40 s): Level 2 = xs, Level 3 = s
  if (LV_SEC[1] === 20 && LV_SEC[2] === 40) assert.deepEqual(lv.map((d) => d.p), [pool.MS_PAY.xs, pool.MS_PAY.s]);
});
