// Sparks core tests (sparks SPEC §9 PR1): evaluates src/client/06b-sparks.js with fake storage and game globals.
// Run: node scripts/test-sparks.mjs   (also run by scripts/test-build.mjs, i.e. npm test). Ends by running test-sparks-earn.mjs (PR5) and test-sparks-reach.mjs (reach fix).
import assert from "node:assert/strict";
import SRC from "../src/client/06b-sparks.js";
const BODY = SRC.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   sparks-core:", name); };
const KEY = "forge-runner-sparks";

// env: { store: Map | "throw", build, demo, tpu, skDebug, src }
function run(env = {}, extra = "") {
  const store = env.store === "throw" ? null : env.store || new Map();
  const calls = { sfxBuy: [], sfxAllMax: 0, sfxLevelUp: [], writes: 0 };
  // same shape as 01-core.js lsg/lss: try/catch around localStorage
  const localStorage = store ? { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { calls.writes++; store.set(k, String(v)); } }
    : { getItem: () => { throw new Error("SecurityError") }, setItem: () => { throw new Error("QuotaExceeded") } };
  const pre = `"use strict";var window={FR_BUILD:${JSON.stringify(env.build || "site")}};var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")};` +
    (env.skDebug ? "var skDebug=true;" : "") +
    `function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var SPT=10,BGT=6;function sfxBuy(k,lv){calls.sfxBuy.push(k+lv)}function sfxAllMax(){calls.sfxAllMax++}function sfxLevelUp(k,dl){calls.sfxLevelUp.push(k+":"+dl)}`;
  const api = `;return {get sk(){return sk},set skb(v){sk.b=v},get skRun(){return skRun},get skRO(){return skRO},SKON,SKV,SKU,isPoki,skLoad,skSave,skLv,skCost,skCanBuy,skBuy,skEarn,
    skSPT,skBGT,skMagR,skPuF,skInvShield,skCores}`;
  const g = new Function("localStorage", "calls", pre + (env.src || BODY) + extra + api)(localStorage, calls);
  return { g, store, calls };
}
const save = (o) => new Map([[KEY, typeof o === "string" ? o : JSON.stringify(o)]]);

t("fresh: defaults, SKON on (web WEB_SPARKS + Poki), base getters, nothing written on load", () => {
  const { g, store, calls } = run();
  assert.deepEqual(g.sk, { v: 1, b: 0, l: { m: 0, c: 0, d: 0, p: 0, r: 0 }, e: 0, n: 0 });
  assert.equal(g.SKON, true); assert.equal(g.isPoki(), false); assert.equal(run({ build: "poki" }).g.isPoki(), true);
  assert.deepEqual([g.skSPT(), g.skBGT(), g.skMagR(), g.skPuF(), g.skInvShield(), g.skCores()], [10, 6, 0, 1, 1.2, 0]);
  assert.equal(calls.writes, 0); assert.equal(store.size, 0);
});
t("table: 5 tracks, 19 levels; costs as SPEC §2 (they sum to 5,395; SPEC text says 5,390)", () => {
  const { g } = run();
  const lv = Object.values(g.SKU).reduce((a, u) => a + u.c.length, 0), tot = Object.values(g.SKU).reduce((a, u) => a + u.c.reduce((x, y) => x + y, 0), 0);
  assert.equal(lv, 19); assert.equal(tot, 5388); assert.deepEqual(Object.keys(g.SKU), ["m", "c", "d", "p", "r"]);
});
t("earn: floors, ignores <=0/NaN, banks live into b, e and skRun; clamps at 9,999,999", () => {
  const { g } = run();
  g.skEarn(3.9); g.skEarn(0); g.skEarn(-5); g.skEarn(NaN); g.skEarn(2);
  assert.equal(g.sk.b, 5); assert.equal(g.sk.e, 5); assert.equal(g.skRun, 5);
  g.skEarn(1e9); assert.equal(g.sk.b, 9999999);
});
t("earn is a no-op in ?demo=1, ?pu= and debug (?sk) runs; those never write", () => {
  for (const env of [{ demo: true }, { tpu: "s" }, { skDebug: true }]) {
    const { g, calls } = run({ ...env, store: save({ v: 1, b: 100, l: {}, e: 0, n: 0 }) });
    g.skEarn(10); assert.equal(g.sk.b, 100); assert.equal(g.skRO, true);
    assert.equal(g.skBuy("m"), true); assert.equal(g.skSave(), false); assert.equal(calls.writes, 0, JSON.stringify(env));
  }
});
t("buy: cost, deduct, level up, save, sfxBuy(k,lv); too poor = false; maxed cost = null; sfxAllMax on the last level", () => {
  const { g, store, calls } = run();
  assert.equal(g.skCanBuy("m"), false); assert.equal(g.skBuy("m"), false);
  g.skEarn(80); assert.equal(g.skCost("m"), 8); assert.equal(g.skBuy("m"), true);
  assert.equal(g.sk.b, 72); assert.equal(g.skLv("m"), 1); assert.equal(g.skCost("m"), 60);
  assert.equal(JSON.parse(store.get(KEY)).l.m, 1); assert.deepEqual(calls.sfxBuy, ["m1"]);
  assert.equal(g.skBuy("m"), true); assert.equal(g.skBuy("m"), false); assert.equal(g.sk.b, 12);
  assert.equal(g.skCost("x"), null); assert.equal(g.skBuy("x"), false);
  g.skb = 5395; for (const k of ["m", "c", "d", "p", "r"]) while (g.skBuy(k));
  assert.equal(g.sk.b, 75); // 5395 bank, 5395 - 75 (already bought m1+m2) spent
  for (const k of ["m", "c", "d", "p", "r"]) assert.equal(g.skCost(k), null);
  assert.equal(calls.sfxAllMax, 1);
});
t("after-buy sting: ordinary buy = neither, track maxed = sfxLevelUp once, everything maxed = only sfxAllMax", () => {
  const { g, calls } = run();
  g.skb = 1e6;
  assert.equal(g.skBuy("m"), true); assert.deepEqual(calls.sfxLevelUp, []); assert.equal(calls.sfxAllMax, 0, "ordinary buy");
  while (g.skCost("m") !== null) g.skBuy("m");
  assert.deepEqual(calls.sfxLevelUp, ["m:0.45"], "maxing Magnet: one sfxLevelUp(k,.45)"); assert.equal(calls.sfxAllMax, 0);
  for (const k of ["c", "d", "p"]) while (g.skCost(k) !== null) g.skBuy(k);
  assert.deepEqual(calls.sfxLevelUp, ["m:0.45", "c:0.45", "d:0.45", "p:0.45"]);
  g.skBuy("r"); assert.equal(calls.sfxLevelUp.length, 4, "spare core L1: ordinary");
  g.skBuy("r"); // the last level of the last track: everything maxed
  assert.equal(calls.sfxAllMax, 1); assert.equal(calls.sfxLevelUp.length, 4, "the all-max buy plays only sfxAllMax");
  assert.equal(g.skBuy("r"), false); assert.equal(calls.sfxAllMax, 1);
});
// no sfxLevelUp / sfxAllMax defined: the guarded calls don't throw
t("after-buy sting is typeof-guarded (no sfxLevelUp / sfxAllMax defined: no throw)", () => {
  const src = BODY;
  const g = new Function(`"use strict";var window={FR_BUILD:"site"};var demo=false,tpu="";function lsg(){return null}function lss(){}var SPT=10,BGT=6;function sfxBuy(){}` +
    src + ";return {skBuy,skCost,sk}")();
  g.sk.b = 1e6; for (const k of ["m", "c", "d", "p", "r"]) while (g.skCost(k) !== null) assert.equal(g.skBuy(k), true);
});
t("getters per level (SPEC §2) and never touch speed/score", () => {
  const { g } = run({ store: save({ v: 1, b: 0, l: { m: 5, c: 5, d: 4, p: 2, r: 2 }, e: 0, n: 0 }) });
  assert.deepEqual([g.skSPT(), g.skBGT(), g.skMagR(), g.skPuF(), g.skInvShield(), g.skCores()], [17.5, 11, 170, 0.58, 2, 2]);
  const a = run({ store: save({ v: 1, b: 0, l: { m: 1, c: 1, d: 1, p: 1, r: 1 } }) }).g;
  assert.deepEqual([a.skSPT(), a.skBGT(), a.skMagR(), a.skPuF(), a.skInvShield(), a.skCores()], [11.5, 7, 40, 0.88, 1.2, 1]);
  assert.ok(!/\b(speed|score|runS|scroll)\s*[+\-*]?=/.test(BODY) && !/Math\.random|addEventListener/.test(BODY));
});
t("round trip: save -> reload gives the same object (< 100 bytes)", () => {
  const a = run(); a.g.skEarn(200); a.g.skBuy("c"); a.g.skSave();
  const raw = a.store.get(KEY); assert.ok(raw.length < 100, raw.length);
  const b = run({ store: a.store }); assert.deepEqual(b.g.sk, a.g.sk);
});
t("incognito / storage throws: plays with an in-memory save, no exception", () => {
  const { g } = run({ store: "throw" });
  g.skEarn(20); assert.equal(g.skBuy("m"), true); assert.equal(g.skSave(), true); assert.equal(g.sk.b, 12);
});
t("corrupt JSON: copied once to forge-runner-sparks-bad, fresh start, next save overwrites", () => {
  for (const bad of ["{oops", "42", "[1,2]", "null"]) {
    const { g, store } = run({ store: save(bad) });
    assert.equal(g.sk.b, 0); assert.equal(store.get(KEY + "-bad"), bad);
    g.skEarn(1); g.skSave(); assert.equal(JSON.parse(store.get(KEY)).b, 1);
  }
});
t("clamps: integers only, b/e/n 0..9,999,999, levels 0..max, junk -> defaults", () => {
  const { g } = run({ store: save({ v: 1, b: -4, e: 1.5, n: 1e12, l: { m: 99, c: -1, d: "3", p: 2.5, r: 2, zz: 9 }, x: 1 }) });
  assert.deepEqual(g.sk, { v: 1, b: 0, l: { m: 5, c: 0, d: 0, p: 0, r: 2 }, e: 0, n: 9999999 });
  const h = run({ store: save({ v: 1, b: 12, l: "nope" }) }).g; assert.equal(h.sk.b, 12); assert.equal(h.skLv("m"), 0);
  const m = run({ store: save({ b: 7 }) }).g; assert.equal(m.sk.b, 7); assert.equal(m.sk.v, 1); // missing v = v1
});
t("v > SKV (newer build's save, e.g. Poki cloud): loads what it can, NEVER writes", () => {
  const raw = JSON.stringify({ v: 2, b: 50, l: { m: 2 }, e: 70, n: 3, extra: { future: true } });
  const { g, store, calls } = run({ store: save(raw) });
  assert.equal(g.sk.b, 50); assert.equal(g.skLv("m"), 2); assert.equal(g.skRO, true);
  g.skEarn(5); g.skBuy("c"); assert.equal(g.skSave(), false);
  assert.equal(store.get(KEY), raw); assert.equal(calls.writes, 0);
});
t("migrations run on load (skMig[v] v -> v+1), then the save is written at the new version", () => {
  const src = BODY.replace("var SKV=1,", "var SKV=2,").replace("var skMig={};", "var skMig={1:function(o){o.b=(o.b|0)+1;o.v=2;return o}};");
  const { g, store } = run({ src, store: save({ v: 1, b: 9, l: { m: 1 }, e: 9, n: 1 }) });
  assert.equal(g.sk.b, 10); assert.equal(g.sk.v, 2); assert.equal(g.skRO, false);
  g.skSave(); assert.equal(JSON.parse(store.get(KEY)).v, 2);
});
t("SKON off (no WEB_SPARKS, not Poki, no debug): getters base, no earn, no buy, no write", () => {
  const src = BODY.replace("var WEB_SPARKS=true;", "var WEB_SPARKS=false;");
  const { g, store } = run({ src, store: save({ v: 1, b: 999, l: { m: 5, c: 5, d: 4, p: 3, r: 2 } }) });
  assert.equal(g.SKON, false);
  assert.deepEqual([g.skSPT(), g.skBGT(), g.skMagR(), g.skPuF(), g.skInvShield(), g.skCores()], [10, 6, 0, 1, 1.2, 0]);
  g.skEarn(5); assert.equal(g.sk.b, 999); assert.equal(g.skBuy("m"), false); assert.equal(g.skSave(), false);
  assert.equal(run({ src, build: "poki" }).g.SKON, true);
});
console.log(`sparks-core: ${pass} checks passed`);
// sparks PR5: earn rules in the game loop (pickups, magnet, milestones, new best, starter floor, no-earn runs)
await import("./test-sparks-earn.mjs");
// reach fix: every row/arc collectable in one clean line (scripted perfect line with the real jump physics, 340-760 px/s)
await import("./test-sparks-reach.mjs");
// Missions hooks: stub msOn sees start/spark/pu/jump/boots/over in a scripted run; none in demo; over once per run
await import("./test-missions-hooks.mjs");
