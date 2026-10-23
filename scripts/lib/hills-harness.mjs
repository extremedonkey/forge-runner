// Node harness for HILLS: evaluates the real 06-state + 06b-sparks + 06i-hills + 11-gameflow + 13-simulation in one scope
// with stubbed DOM/audio/render globals and a seedable Math.random (as the sparks tests do). No browser.
// (+ 06h-rescue, in index.mjs order; rescue:false leaves it out)
// GAPS: gaps:true adds 06k (after 06i); level: n | "time" (L by base-curve s 0/20/40/65/90, as 06d) | fn; gapTab: GAP_LV-style
// array (+ getGapLv by level, like #78); blocked: () => bool (lvGapsBlocked stub); edgeWarn / sfxGapFall stubs record into calls.
// post: extra code evaluated in the game scope after 13 (test overrides).
// game({ hills: true|false|"absent", rescue, gaps, post, level, gapTab, blocked, demo, rand, store: Map, hi, rm, q: {hills:"0"} })
import STATE from "../../src/client/06-state.js";
import SPARKS from "../../src/client/06b-sparks.js";
import RESCUE from "../../src/client/06h-rescue.js";
import HILLS from "../../src/client/06i-hills.js";
import GAPS from "../../src/client/06k-gaps.js";
import FLOW from "../../src/client/11-gameflow.js";
import SIM from "../../src/client/13-simulation.js";
const body = (f) => f.slice(1, -1);
export function game(env = {}) {
  const store = env.store || new Map();
  const calls = { warn: [], fall: 0, rand: 0, lb: 0, spark: 0, earn: [], air: [], ms: [], label: [] };
  const rand = env.rand || Math.random;
  const M = Object.create(Math); M.random = () => { calls.rand++; return rand() };
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  const q = JSON.stringify(env.q || {});
  const lvf = env.lvMul == null ? "" : `function lvSpeedMul(){return ${+env.lvMul}}`;
  const pre = `"use strict";var window={FR_BUILD:"site"};var demo=${!!env.demo},tpu="",skDebug=false;var Q={get:function(k){var o=${q};return k in o?o[k]:null}};
    function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    var W=600,H=300,GY=232,PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760,KEY="forge-runner-hi",hi=${env.hi | 0},chal=0;
    var CY="#22d3ee",OR="#f97316",snd=false,AU=null,ac=null,mLT=0,dn=0;
    var performance={now:function(){return now}},now=0;
    var shB={style:{}},np={style:{}};
    function rm(){return ${!!env.rm}}function rnd(a,b){return a+Math.random()*(b-a)}function mf(m){return 440}
    function sfx(){}function noise(){}function startMusic(){}function track(e){}function placeShare(){}
    function lbOver(s,r){calls.lb++}var FRLB={hide:function(){},isOpen:function(){return false}};window.FRLB=FRLB;
    function puWarnTick(){}function sfxPickup(){}function sfxExpire(){}function sfxSpark(){calls.spark++}function sfxBuy(){}function sfxAllMax(){}
    function sfxReboot(){}function sfxReforge(){}function upShow(){}function upHide(){}
    function sfxAir(h){calls.air.push(h)}function msOn(k,v){calls.ms.push([k,v])}`;
  let lvs = "";
  if (env.level === "time") lvs = "var LV_AT=[0,20,40,65,90].map(function(t){var a=Math.min(t,60);return Math.floor(.05*(340*a+3.5*a*a+760*Math.max(0,t-60)))});function currentLevel(){var n=1;for(var i=1;i<5;i++)if(score>=LV_AT[i])n=i+1;return n}";
  else if (env.level != null) lvs = `function currentLevel(){return ${+env.level}}`;
  if (env.gapTab) lvs += `var GAP_CAP=.65,GAP_MIN_JUMP_SEP=.85,GAP_DFULL_S=.689;var GAP_LV=${JSON.stringify(env.gapTab)};function getGapLv(){var n=typeof currentLevel==="function"?currentLevel():1;return GAP_LV[Math.max(1,Math.min(5,n))-1]}`;
  if (env.blocked) lvs += "function lvGapsBlocked(){return __blocked()}";
  lvs += "function edgeWarn(k,t,a,b,o){calls.warn.push([k,t,a,b,o&&o.y])}function sfxGapFall(){calls.fall++}";
  const hills = env.hills === "absent" ? "" : body(HILLS) + (env.hills === false ? ";HILLS_ON=false;" : "");
  const api = `;var _e=skEarn;skEarn=function(n){calls.earn.push(n);return _e(n)};var _l=skLabel;skLabel=function(s,c){calls.label.push(s);return _l(s,c)};
    return {get state(){return state},set state(v){state=v},get score(){return score},get speed(){return speed},get runS(){return runS},get scroll(){return scroll},
    get ents(){return ents},set ents(v){ents=v},get py(){return py},set py(v){py=v},get vy(){return vy},get inv(){return inv},set inv(v){inv=v},
    get held(){return held},set duck(v){duck=v},get duck(){return duck},set nextGap(v){nextGap=v},set puNext(v){puNext=v},get spawnDist(){return spawnDist},
    get hl(){return typeof hlOn==="undefined"?null:{on:hlOn,F:hlF,hsc:hsc,D0:hlD0,air:hlAirN,airS:hlAirS,Cr:hlCr,J:hlJ,HL:HL,H:hlH,W:hlW,Sl:hlSl,B:hlB,EG:hlEG,Seg:hlSeg,Gr:hlGround,gY:groundY,L:HL.sL}},
    get sk(){return sk},set now(v){now=v},get now(){return now},set hsc(v){hsc=v},get hsc(){return hsc},set speed(v){speed=v},set runS(v){runS=v},set score(v){score=v},set nt(v){nt=v},get nextGap(){return nextGap},
    vMul:function(){return vMul()},get gp(){return typeof gpOn==="undefined"?null:{rej:gpRej,on:gpOn,gaps:gpGaps,log:gpLog,GP:GP,n:gpN,deep:hlDeep,win:gpWin,sup:hlSupOK}},get cores(){return cores},get shd(){return shd},set shd(v){shd=v},gpc:function(x){return typeof gpCurve==="function"?gpCurve(x):0},set cores(v){cores=v},get level(){return typeof currentLevel==="function"?currentLevel():1},set jb(v){jb=v},start,die,press,release,update,spawn,auto,big,pW,pH,PX,PW,GY,W,JV,CUT,G}`;
  const src = pre + lvf + lvs + body(STATE) + body(SPARKS) + (env.rescue === false ? "" : body(RESCUE)) + hills + (env.gaps ? body(GAPS) : "") + body(FLOW) + body(SIM) + (env.post || "") + api;
  const g = new Function("localStorage", "calls", "Math", "__blocked", src)(localStorage, calls, M, env.blocked || (() => false));
  return { g, store, calls };
}
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
