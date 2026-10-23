// MISSIONS-3 telemetry tests (revenue spec §5). node:test, no browser. Needs `npm run build` first (checks dist/poki/game.js).
// Run: node --test scripts/test-telemetry.mjs   (npm run test:telemetry; also run by scripts/test-build.mjs, i.e. npm test)
//  - MISSIONS-6: the shipped switch is TLM2="all": every host incl. forgerunnergames.com sends sid/rv/rn/rl (start+over), db/sb (over),
//    mission_shown/mission_done with mid; with TLM2="preview" only preview hosts do (live = old shape); TLM2="off" sends none
//  - the server logs the new fields only when valid (dropped, never a 400), and a live-style body logs the same line as before
//  - the Poki build has no beacon URL / telemetry code; mission_done goes to PokiSDK.measure('mission', id, 'complete') only
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import BEACONS from "../src/client/03-beacons.js";
import MS_SRC from "../src/client/06e-missions.js";
import { handleBeacon } from "../src/server/beacon.mjs";
const body = (f) => f.slice(1, -1);
const PREVIEW = ["preview.forgerunnergames.com", "3nslnfimuztmjlqvbt4rdp4w2q0lpfoe.lambda-url.ap-southeast-2.on.aws"];
const LIVE = ["forgerunnergames.com", "www.forgerunnergames.com", "grok-claude-hello.lambda-url.ap-southeast-2.on.aws", "d1234.cloudfront.net", "localhost"];
const NEW = ["rv", "rn", "rl", "db", "sb", "mid", "sid"];

function client(host, env = {}) {
  const store = new Map(), sent = []; let rnd = 0;
  let now = env.now ?? 2000;
  // env.tlm overrides the switch; without it the SHIPPED value is tested (MISSIONS-6: "all")
  const src = env.tlm ? body(BEACONS).replace(/var TLM2="[a-z]+";/, `var TLM2=${JSON.stringify(env.tlm)};`) : body(BEACONS);
  const pre = `"use strict";var skDebug=false,demo=${!!env.demo},tpu="",chal=0;var Q={get:function(){return null}};function ut(s){return s||""}
    function lsg(k){return store.has(k)?store.get(k):null}function lss(k,v){store.set(k,String(v))}` + (env.rv !== undefined ? `var RESCUE_V=${env.rv};` : "");
  const g = new Function("store", "location", "navigator", "performance", "crypto", "fetch",
    pre + src + ";return {track:track,tlmOn:tlmOn}")(store, { hostname: host, pathname: "/" },
    { sendBeacon: (u, b) => { sent.push({ ev: new URL(u, "https://x").searchParams.get("event"), d: JSON.parse(b) }); return true } },
    { now: () => now }, { getRandomValues: (a) => { rnd++; for (let i = 0; i < a.length; i++) a[i] = (i * 37 + rnd * 101) & 255; return a } }, () => Promise.resolve());
  return { ...g, sent, store, setNow: (t) => { now = t } };
}
function play(c) {
  c.track("visit"); c.track("start"); c.track("mission_shown", undefined, undefined, { mid: "jump5" });
  c.track("mission_done", undefined, undefined, { mid: "jump5" }); c.track("over", 42, 3.4); c.track("start"); c.track("over", 120, 12.2);
}

test("MISSIONS-6: the shipped switch is TLM2='all' (live on, Reece 24 Oct 2026)", () => {
  assert.match(body(BEACONS), /\nvar TLM2="all";/);
});

test("MISSIONS-6: live web build (TLM2='all') sends sid, rv, rn, rl, db, sb and mission_shown/done with mid on every host", () => {
  for (const h of [...LIVE, ...PREVIEW]) {
    const c = client(h, { now: 200000 }); play(c);
    assert.equal(c.tlmOn(), true, h);
    assert.deepEqual(c.sent.map((s) => s.ev), ["visit", "start", "mission_shown", "mission_done", "over", "start", "over"], h);
    const [visit, s1, shown, done, o1, s2, o2] = c.sent.map((s) => s.d);
    assert.match(s1.sid, /^[a-f0-9]{16}$/, h); assert.ok([visit, shown, done, o1, s2, o2].every((x) => x.sid === s1.sid), `${h}: one sid per page load`);
    assert.deepEqual([s1.rv, s1.rn, s1.rl], [0, 1, 1], h);
    assert.deepEqual([o1.rv, o1.rn, o1.rl, o1.db, o1.sb], [0, 1, 1, "lt5", "lt600"], h);
    assert.deepEqual([s2.rn, s2.rl, o2.rn, o2.db], [2, 2, 2, "lt20"], h);
    assert.equal(shown.mid, "jump5"); assert.equal(done.mid, "jump5");
    assert.ok(Object.keys(o1).every((k) => ["pid", "challenge", "score", "dur", "ses", ...NEW].includes(k)), `${h}: only known anonymous fields`);
  }
  const r = client(LIVE[0], { rv: 1 }); r.track("start"); assert.equal(r.sent[0].d.rv, 1, "reads RESCUE_V");
  const d = client(LIVE[0], { demo: true }); play(d); assert.equal(d.sent.length, 0, "demo still sends nothing");
});

test("gate logic kept: with TLM2='preview', non-preview hosts send exactly the pre-MISSIONS-3 shape", () => {
  for (const h of LIVE) {
    const c = client(h, { tlm: "preview" }); play(c);
    assert.equal(c.tlmOn(), false, h);
    assert.deepEqual(c.sent.map((s) => s.ev), ["visit", "start", "over", "start", "over"], h);
    for (const s of c.sent) {
      for (const k of NEW) assert.ok(!(k in s.d), `${h} ${s.ev} sends ${k}`);
      assert.deepEqual(Object.keys(s.d).sort(), s.ev === "over" ? ["challenge", "dur", "pid", "score", "ses"] : ["challenge", "pid"]);
    }
  }
});

test("TLM2='off' sends nothing new even on preview hosts", () => {
  for (const h of PREVIEW) { const c = client(h, { tlm: "off" }); play(c); assert.ok(c.sent.every((s) => NEW.every((k) => !(k in s.d)) && !s.ev.startsWith("mission_"))) }
});

test("TLM2='preview': preview hosts send rv/rn/rl on start+over, db+sb on over, mission_shown/done with mid", () => {
  for (const h of PREVIEW) {
    const c = client(h, { now: 200000, tlm: "preview" }); play(c);
    const ev = c.sent.map((s) => s.ev);
    assert.deepEqual(ev, ["visit", "start", "mission_shown", "mission_done", "over", "start", "over"]);
    const [visit, s1, shown, done, o1, s2, o2] = c.sent.map((s) => s.d);
    assert.ok(NEW.every((k) => k === "sid" || !(k in visit)), "visit: only sid added");
    assert.deepEqual([s1.rv, s1.rn, s1.rl], [0, 1, 1]); assert.deepEqual([o1.rv, o1.rn, o1.rl, o1.db, o1.sb], [0, 1, 1, "lt5", "lt600"]);
    assert.deepEqual([s2.rn, s2.rl, o2.rn, o2.db], [2, 2, 2, "lt20"]);
    assert.equal(shown.mid, "jump5"); assert.equal(done.mid, "jump5"); assert.ok(!("rn" in shown) && !("db" in done));
    assert.equal(c.store.get("forge-runner-rl"), "2");
    assert.match(s1.sid, /^[a-f0-9]{16}$/); assert.ok([shown, done, o1, s2, o2].every((x) => x.sid === s1.sid), "one sid per page load");
    assert.ok(![...c.store.values()].includes(s1.sid) && s1.sid !== s1.pid, "sid never stored, not the pid");
    assert.deepEqual([...c.store.keys()].sort(), ["forge-runner-pid", "forge-runner-rl"]);
  }
  const r = client(PREVIEW[0], { rv: 2 }); r.track("start"); assert.equal(r.sent[0].d.rv, 2);
  const b = client(PREVIEW[0], { now: 4000000 }); b.track("start"); b.track("over", 1, 25); assert.deepEqual([b.sent[1].d.db, b.sent[1].d.sb], ["ge20", "ge600"]);
  const f = client(PREVIEW[0]); f.track("mission_done", undefined, undefined, { mid: "hello world!" }); assert.ok(!("mid" in f.sent[0].d), "free text never sent");
  const d = client(PREVIEW[0], { demo: true }); play(d); assert.equal(d.sent.length, 0, "demo sends nothing");
});

test("lifetime runs (rl) survive reload and a throwing storage", () => {
  const c = client(PREVIEW[0]); c.store.set("forge-runner-rl", "41"); c.track("start"); assert.equal(c.sent[0].d.rl, 42);
  const src = body(BEACONS);
  const g = new Function("location", "navigator", "performance", "crypto",
    `"use strict";var skDebug=false,demo=false,tpu="",chal=0;var Q={get:function(){return null}};function ut(s){return s||""}
     function lsg(k){try{throw new Error("SecurityError")}catch(e){return null}}function lss(k,v){try{throw new Error("Quota")}catch(e){}}` + src + ";return track")(
    { hostname: PREVIEW[0], pathname: "/" }, { sendBeacon: () => true }, { now: () => 1 }, { getRandomValues: (a) => a });
  assert.doesNotThrow(() => { g("start"); g("over", 1, 2) });
});

function serve(ev, d) {
  const out = []; const w = process.stdout.write;
  process.stdout.write = (s) => { out.push(s); return true };
  try {
    const r = handleBeacon({ queryStringParameters: { event: ev }, headers: { host: "x.example", origin: "https://x.example" }, body: JSON.stringify(d) }, Date.now() + Math.random() * 1e9);
    return { status: r.statusCode, line: out.length ? JSON.parse(out[0]) : null };
  } finally { process.stdout.write = w }
}
let pidN = 0; const pid = () => (++pidN).toString(16).padStart(16, "a");

test("server: logs valid new fields, drops invalid ones (never 400), mission events carry mid; live bodies log as before", () => {
  const o = serve("over", { pid: pid(), challenge: 0, score: 42, dur: 3, ses: 200, rv: 1, rn: 2, rl: 9, db: "lt5", sb: "lt600" });
  assert.equal(o.status, 204); assert.deepEqual([o.line.rv, o.line.rn, o.line.rl, o.line.db, o.line.sb], [1, 2, 9, "lt5", "lt600"]);
  assert.equal(serve("start", { pid: pid(), challenge: 0, sid: "0123456789abcdef" }).line.sid, "0123456789abcdef");
  assert.ok(!("sid" in serve("start", { pid: pid(), challenge: 0, sid: "not-a-sid" }).line));
  const bad = serve("over", { pid: pid(), challenge: 0, score: 42, dur: 3, ses: 200, sid: "x", rv: "x", rn: -1, rl: 1.5, db: "<5", sb: "ever", mid: "jump5" });
  assert.equal(bad.status, 204); for (const k of NEW) assert.ok(!(k in bad.line), `dropped ${k}`);
  const live = serve("over", { pid: pid(), challenge: 0, score: 42, dur: 3, ses: 200 });
  assert.deepEqual(Object.keys(live.line), ["t", "ev", "pid", "sc", "src", "cmp", "cnt", "ch", "dur", "ses"], "live line unchanged");
  const st = serve("start", { pid: pid(), challenge: 0 });
  assert.deepEqual(Object.keys(st.line), ["t", "ev", "pid", "sc", "src", "cmp", "cnt", "ch"]);
  const m = serve("mission_done", { pid: pid(), challenge: 0, mid: "jump5" });
  assert.equal(m.status, 204); assert.equal(m.line.ev, "mission_done"); assert.equal(m.line.mid, "jump5");
  const mx = serve("mission_shown", { pid: pid(), challenge: 0, mid: "<script>alert(1)</script>" });
  assert.equal(mx.line.mid, "(none)", "no free text logged");
  assert.ok(!JSON.stringify(m.line).match(/ip|agent|user/i));
});

test("Poki build: no beacon URL or telemetry code; mission_done -> PokiSDK.measure('mission', id, 'complete') only", () => {
  const f = "dist/poki/game.js";
  assert.ok(existsSync(f), "run npm run build first");
  const pg = readFileSync(f, "utf8");
  for (const s of ["?event=", "sendBeacon", "location.pathname+", "var TLM2", "TLM_HOSTS", "tlmAdd", "tlmSid", "forge-runner-rl", "preview.forgerunnergames.com", "lambda-url"])
    assert.ok(!pg.includes(s), `poki build contains ${s}`);
  assert.ok(pg.includes('function msPoki(ev,id){if(ev==="mission_done")pkMeasure("mission",id,"complete")}'));
  // MISSIONS-6: the site (Lambda) page ships the live switch
  const site = readFileSync("dist/index.mjs", "utf8");
  assert.ok(site.includes('var TLM2=\\"all\\";') || site.includes('var TLM2="all";'), "site build has TLM2=\"all\"");
  // 06e msTel in a Poki-like scope: shown -> nothing, done -> one measure, track never called
  const calls = [];
  const g = new Function("calls", `"use strict";var demo=false,tpu="";function lsg(){return null}function lss(){}
    function track(){calls.push("track")}function msPoki(ev,id){if(ev==="mission_done")calls.push("measure:mission/"+id+"/complete")}` +
    body(MS_SRC) + ";return {msOn:msOn,msTel:msTel,shown:function(id){msShownCb(id)}}")(calls);
  g.shown("jump5"); g.msOn("start"); for (let i = 0; i < 5; i++) g.msOn("jump");
  assert.deepEqual(calls, ["measure:mission/jump5/complete"]);
});

test("site: mission_shown once per id per page load, mission_done each completion, nothing in demo", () => {
  const run = (demo) => {
    const calls = [];
    const g = new Function("calls", `"use strict";var demo=${demo},tpu="";function lsg(){return null}function lss(){}
      function track(ev,s,d,x){calls.push(ev+":"+(x&&x.mid))}` + body(MS_SRC) + ";return {msOn:msOn,shown:function(id){msShownCb(id)}}")(calls);
    g.shown("jump5"); g.shown("jump5"); g.shown("pu1"); g.msOn("start"); for (let i = 0; i < 5; i++) g.msOn("jump"); g.shown("jump5");
    return calls;
  };
  assert.deepEqual(run(false), ["mission_shown:jump5", "mission_shown:pu1", "mission_done:jump5"]);
  assert.deepEqual(run(true), []);
});
