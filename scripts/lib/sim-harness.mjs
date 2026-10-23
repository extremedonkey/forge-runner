// Node harness for the real game simulation: evaluates 06-state + 06b-sparks (+ 06h-rescue when given) + 11-gameflow +
// 13-simulation in one scope with stubbed DOM/audio/render globals and a seedable Math.random, like the sparks tests.
// Used by scripts/test-rescue.mjs and scripts/rescue-bot.mjs (before/after medians). No browser.
// game({ src: {state, sparks, rescue, flow, sim}, demo, tpu, skDebug, store: Map, rand, hi, rm, touch })
export function game(env = {}) {
  const S = env.src, body = (f) => f.slice(1, -1);
  const store = env.store || new Map();
  const calls = { rand: 0, track: [], lb: 0, spark: 0, sfx: 0 };
  const rand = env.rand || Math.random;
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const pre = `"use strict";var window={FR_BUILD:${JSON.stringify(env.build || "site")}};var demo=${!!env.demo},tpu=${JSON.stringify(env.tpu || "")},skDebug=${!!env.skDebug};
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=${env.hi | 0},chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;
    var shB={style:{}},np={style:{}};
    function rm(){return ${!!env.rm}}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){calls.sfx++}function noise(){}function startMusic(){}function track(e){calls.track.push(e)}function placeShare(){}
    function lbOver(s,r){if(typeof rsBn!=="undefined"&&rsBn>0)return;calls.lb++}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){calls.spark++}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}`;
  const api = `;return {get state(){return state},set state(v){state=v},get score(){return score},get speed(){return speed},get runS(){return runS},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},set py(v){py=v},get vy(){return vy},set vy(v){vy=v},get inv(){return inv},set inv(v){inv=v},
    get jb(){return jb},get held(){return held},set duck(v){duck=v},get duck(){return duck},set nextGap(v){nextGap=v},set puNext(v){puNext=v},
    get scroll(){return scroll},get spT(){return spT},get bgT(){return bgT},get shd(){return shd},
    get hi(){return hi},get rs(){return typeof rsOn==="undefined"?null:{on:rsOn,first:rsFirst,hint:rsHint,bn:rsBn,slowT:rsSlowT,prompt:rsPrompt,coy:rsCoy,fl:rsFl,kb:rsKb,vet:rsVet,save:rsSave,clean:typeof rsClean==="undefined"?0:rsClean,crN:typeof rsCrN==="undefined"?0:rsCrN,V:RESCUE_V,RS:RS}},
    set now(v){now=v},get now(){return now},
    snap:function(){return [state,score,speed,runS,scroll,py,vy,shd,inv,spT,bgT,puNext,nextGap,spawnDist,ents.length,
      ents.map(function(e){return e.t+(e.k||"")+Math.round(e.x*1e6)}).join(",")].join("|")},
    big,start,die,press,release,update,spawn,auto,pW,pH,PX,PW,GY,W,JV,CUT}`;
  const src = pre + body(S.state) + body(S.sparks) + (S.rescue ? body(S.rescue) : "") + body(S.flow) + body(S.sim) + api;
  const g = new Function("localStorage", "calls", "Math", src)(localStorage, calls, M);
  return { g, store, calls };
}
// mulberry32
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
