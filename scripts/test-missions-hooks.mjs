// Missions hooks (msOn: 06e-missions.js, stubbed here): a stub msOn receives the expected sequence in a scripted run.
// Evaluates the real 06-state + 06b-sparks + 11-gameflow + 13-simulation fragments (stubbed DOM/audio/render) and plays with
// the real update() at 1/240 s sub-steps: start -> spark pickup -> power-up j -> jump (+ boots, spring active) -> death -> over,
// a Poki-style Continue + second death must not report "over" again, and demo runs report nothing. Also asserts the
// speed/scroll/score/runS lines in update() stay byte-identical (leaderboard anti-cheat).
// Run: node scripts/test-missions-hooks.mjs   (also run by scripts/test-sparks.mjs, so npm test covers it)
import assert from "node:assert/strict";
import STATE from "../src/client/06-state.js";
import SPARKS from "../src/client/06b-sparks.js";
import FLOW from "../src/client/11-gameflow.js";
import SIM from "../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   missions:", name); };
const PX = 56, PW = 45;
function game(demo, withMs = true) {
  const log = [];
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${demo},tpu="",skDebug=false;
    function lsg(k){return null}function lss(k,v){}
    var W=600,H=300,GY=232,PX=${PX},PW=${PW},G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=99999,chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return 1e6}};var shB={style:{}},np={style:{}};
    function rm(){return true}function rnd(a,b){return (a+b)/2}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(){}function placeShare(){}function lbOver(){}
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}` +
    (withMs ? `function msOn(){log.push(Array.prototype.slice.call(arguments))}` : "");
  const api = `;return {get state(){return state},set state(v){state=v},get score(){return score},get runS(){return runS},
    get ents(){return ents},set ents(v){ents=v},set nextGap(v){nextGap=v},set puNext(v){puNext=v},get spT(){return spT},get py(){return py},
    start,update,press,release,die}`;
  const g = new Function("log", pre + body(STATE) + body(SPARKS) + body(FLOW) + body(SIM) + api)(log);
  return { g, log };
}
const step = (g, s) => { for (let i = 0; i < Math.round(s * 240) && g.state === "run"; i++) g.update(1 / 240) };
const until = (g, f, max = 10) => { for (let i = 0; i < max * 240 && g.state === "run" && !f(); i++) g.update(1 / 240) };
function scripted(g) {
  g.start(); g.nextGap = 1e9; g.puNext = 1e9;
  g.ents = [{ x: PX + 80, w: 12, h: 12, bot: 8, t: "k" }, { x: PX + 200, w: 20, h: 20, bot: 4, t: "u", k: "j" }];
  until(g, () => g.ents.length === 0);
  g.press(); g.release(); step(g, 0.05); until(g, () => g.py === 0);
  g.ents = [{ x: PX + 120, w: 30, h: 20, bot: 0, t: "b", v: 0 }];
  until(g, () => false, 5);
}
t("scripted run: start, spark 1, pu j, jump + boots, over(distance px = floor(score*20), runS)", () => {
  const { g, log } = game(false);
  scripted(g);
  assert.equal(g.state, "over");
  const ov = log[log.length - 1];
  assert.deepEqual(log.slice(0, -1), [["start"], ["spark", 1], ["pu", "j"], ["jump"], ["boots"]]);
  assert.equal(ov[0], "over"); assert.equal(ov.length, 3);
  assert.equal(ov[1], Math.floor(g.score * 20)); assert.equal(ov[2], g.runS); assert.ok(ov[1] > 0 && ov[2] > 0);
});
t("Poki-style Continue (state back to run without start()) + second death: over is reported once per run", () => {
  const { g, log } = game(false);
  scripted(g);
  g.state = "run"; g.die();
  assert.equal(log.filter((e) => e[0] === "over").length, 1);
  g.start(); g.die();
  assert.equal(log.filter((e) => e[0] === "over").length, 2, "a new run reports again");
});
t("demo runs call no msOn hook; no msOn defined -> no throw", () => {
  const d = game(true); scripted(d.g); if (d.g.state === "run") d.g.die(); /* the demo autopilot may dodge the bug */ assert.deepEqual(d.log, []);
  const n = game(false, false); scripted(n.g); assert.equal(n.g.state, "over");
});
t("speed/scroll/score/runS lines in update() byte-identical (leaderboard anti-cheat)", () => {
  for (const l of ["    tt+=dt;runS+=dt;\n", "    speed=Math.min(MAXV,speed+7*dt);\n", "    scroll+=speed*dt;\n", "    score=Math.min(99999,score+speed*dt*.05);\n"])
    assert.equal(SIM.split(l).length, 2, l.trim());
});
console.log(`missions: ${pass} passed`);
