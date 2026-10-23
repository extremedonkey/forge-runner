// MISSIONS core (MISSIONS-1, owner: Dev for engine/save/payouts, Levels for the pool): 3 active missions, progress across runs,
// pays sparks only (revenue-two-changes spec §3). Client fragment, not an ES module: joined in src/client/index.mjs order inside
// ONE IIFE (shared scope). Plain browser JS inside the String.raw template; no backticks, no ${...}.
// Sits after 06d-levels.js (LEVELS-1) and 06b-sparks.js. 06d is optional: lvFor()/LV_AT are only read through typeof guards.
// NO DOM, canvas, listeners or Math.random (own seeded PRNG, so seeded replays draw the same Math.random sequence).
// Never reads or writes score, speed, scroll, the score formula or runS: the hooks hand it plain numbers and its only output is a
// sparks amount (skEarn). Tested by scripts/test-missions.mjs (node:test, run by npm test).
//
// Pure core:  createMissions({storage, rng, disabled, exclude, levelFor, onComplete, onShown})
//   storage {get(k), set(k,v)} (may throw; every call is try/caught), rng() -> [0,1) (default: seeded mulberry32 kept in the save),
//   disabled: no progress, no payout, no writes; exclude: event types left out of the pool (e.g. ["stomp","drone"]);
//   levelFor(distPx) -> level 1..5 or 0 (optional; without it 'reach Level N' missions are left out unless banner() is used);
//   onComplete(mission, sparks); onShown(mission) once per mission the first time active() returns it.
//   API: on(ev, amount), runStart(), runEnd({durS, distPx}), banner(level), active(), takePayout(), pending(), runs(), save(), disabled
// Game glue (hooks, one line each, wired in MISSIONS-2 after agreeing hook points with Dev):
//   msOn("start") | msOn("over", distPx, durS) | msOn("jump") | msOn("spark", 1) | msOn("pu", "s"|"j"|"g") | msOn("boots")
//   later: msOn("stomp") | msOn("drone") | msOn("level", n)   ->   msActive() for the chips.
export default String.raw`
/* missions core (MISSIONS-1) */
var MS_KEY="forge-runner-missions",MS_V=1,MS_N=3,MS_STARTER_RUNS=3;
/* pool v1. k: "run" = within one run (resets at run start), "cum" = cumulative across runs, "max" = best single value in a run.
   ev = event type; o = once ever (never rolls again after completing); r = risky (never in the starter phase); p = sparks paid. Tune payouts here only (MS_PAY tiers). */
var MS_PAY={xs:4,s:6,m:10,l:16,xl:25};
var MS_POOL=[
  {id:"jump5",   ev:"jump",  k:"cum",n:5,    p:MS_PAY.xs,i:"\u2191", t:"Jump 5 times"},
  {id:"jump40",  ev:"jump",  k:"cum",n:40,   p:MS_PAY.s, i:"\u2191", t:"Jump 40 times"},
  {id:"jump150", ev:"jump",  k:"cum",n:150,  p:MS_PAY.m, i:"\u2191", t:"Jump 150 times"},
  {id:"spark3",  ev:"spark", k:"run",n:3,    p:MS_PAY.xs,i:"\u2726", t:"Grab 3 sparks in a run"},
  {id:"spark15", ev:"spark", k:"run",n:15,   p:MS_PAY.m, i:"\u2726", t:"Grab 15 sparks in a run"},
  {id:"sparkT20",ev:"spark", k:"cum",n:20,   p:MS_PAY.s, i:"\u2726", t:"Grab 20 sparks"},
  {id:"sparkT100",ev:"spark",k:"cum",n:100,  p:MS_PAY.m, i:"\u2726", t:"Grab 100 sparks"},
  {id:"boots3",  ev:"boots", k:"cum",n:3,    p:MS_PAY.s, i:"\u21c8", t:"Use spring boots 3 times"},
  {id:"boots12", ev:"boots", k:"cum",n:12,   p:MS_PAY.m, i:"\u21c8", t:"Use spring boots 12 times"},
  {id:"pu1",     ev:"pu",    k:"cum",n:1,    p:MS_PAY.xs,i:"\u2605", t:"Collect a power-up"},
  {id:"pu5",     ev:"pu",    k:"cum",n:5,    p:MS_PAY.s, i:"\u2605", t:"Collect 5 power-ups"},
  {id:"pu15",    ev:"pu",    k:"cum",n:15,   p:MS_PAY.m, i:"\u2605", t:"Collect 15 power-ups"},
  {id:"lv2",     ev:"level", k:"max",n:2,    p:MS_PAY.m, i:"\u2691", t:"Reach Level 2",o:1},
  {id:"lv3",     ev:"level", k:"max",n:3,    p:MS_PAY.l, i:"\u2691", t:"Reach Level 3",o:1},
  {id:"dist10k", ev:"dist",  k:"max",n:10000,p:MS_PAY.s, i:"\u279c", t:"Go 10,000 px in a run"},
  {id:"dist25k", ev:"dist",  k:"max",n:25000,p:MS_PAY.m, i:"\u279c", t:"Go 25,000 px in a run"},
  {id:"surv30",  ev:"surv",  k:"max",n:30,   p:MS_PAY.s, i:"\u23f1", t:"Survive 30 s"},
  {id:"surv60",  ev:"surv",  k:"max",n:60,   p:MS_PAY.m, i:"\u23f1", t:"Survive 60 s"},
  {id:"stomp10", ev:"stomp", k:"cum",n:10,   p:MS_PAY.m, i:"\u2193", t:"Stomp 10 slag blobs", r:1},
  {id:"stomp30", ev:"stomp", k:"cum",n:30,   p:MS_PAY.l, i:"\u2193", t:"Stomp 30 slag blobs", r:1},
  {id:"drone1",  ev:"drone", k:"cum",n:1,    p:MS_PAY.m, i:"\u2692", t:"Clear a hammer drone", r:1}
];
/* starter set (first MS_STARTER_RUNS runs): no stomp/drone; mission 1 is doable in a 5 s run */
var MS_STARTER=["jump5","sparkT20","pu1"];
function msRng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return((t^(t>>>14))>>>0)/4294967296}}
function msInt(x,mx){return typeof x==="number"&&isFinite(x)?Math.max(0,Math.min(mx,Math.floor(x))):0}
function createMissions(o){
  o=o||{};
  var st=o.storage||null,off=!!o.disabled,ex={},i,byId={};
  var lvF=typeof o.levelFor==="function"?o.levelFor:null;
  for(i=0;o.exclude&&i<o.exclude.length;i++)ex[o.exclude[i]]=1;
  if(!lvF&&!o.banners)ex.level=1;              /* no level source at all: leave 'reach Level N' out of the pool */
  for(i=0;i<MS_POOL.length;i++)byId[MS_POOL[i].id]=MS_POOL[i];
  function sget(){if(!st)return null;try{return st.get(MS_KEY)}catch(e){return null}}
  function sset(v){if(!st||off)return false;try{st.set(MS_KEY,v);return true}catch(e){return false}}
  /* save: a = active [{id,p}], n = runs started, d = missions done, s = PRNG state, o = once-ever ids already completed */
  var S={v:MS_V,a:[],n:0,d:0,s:0,o:[]};
  var raw=sget(),L=null;
  if(raw!=null){try{L=JSON.parse(raw)}catch(e){L=null}}
  if(L&&typeof L==="object"&&!Array.isArray(L)){
    S.n=msInt(L.n,1e9);S.d=msInt(L.d,1e9);S.s=msInt(L.s,4294967295);
    if(Array.isArray(L.o))for(i=0;i<L.o.length;i++)if(byId[L.o[i]]&&S.o.indexOf(L.o[i])<0)S.o.push(L.o[i]);
    var la=Array.isArray(L.a)?L.a:[];
    for(i=0;i<la.length&&S.a.length<MS_N;i++){var e=la[i];
      if(e&&byId[e.id]&&!ex[byId[e.id].ev]&&!msHas(e.id)&&S.o.indexOf(e.id)<0)S.a.push({id:e.id,p:msInt(e.p,byId[e.id].n)})}
  }
  if(!S.s)S.s=(o.seed>>>0)||((Date.now()^0x5bd1e995)>>>0)||1;
  var own=msRng(S.s),rng=typeof o.rng==="function"?o.rng:function(){var r=own();S.s=(Math.floor(r*4294967295)>>>0)||1;own=msRng(S.s);return r};
  var run={},shown={},pend=0,last="";
  function msHas(id){for(var j=0;j<S.a.length;j++)if(S.a[j].id===id)return true;return false}
  function starter(){return S.n<MS_STARTER_RUNS}
  function ok(d){return !ex[d.ev]&&!msHas(d.id)&&!(d.r&&starter())&&!(d.o&&S.o.indexOf(d.id)>=0)}
  function roll(){
    var c=[],j,d;
    for(j=0;j<MS_POOL.length;j++){d=MS_POOL[j];
      if(!ok(d)||d.id===last)continue;c.push(d)}
    if(!c.length)for(j=0;j<MS_POOL.length;j++){d=MS_POOL[j];if(ok(d))c.push(d)}
    if(!c.length)return null;
    d=c[Math.min(c.length-1,Math.floor(rng()*c.length))];
    var m={id:d.id,p:0};S.a.push(m);return m;
  }
  function fill(){
    for(var j=0;j<MS_STARTER.length&&S.a.length<MS_N&&S.n===0&&S.d===0;j++){var d=byId[MS_STARTER[j]];if(d&&!ex[d.ev]&&!msHas(d.id))S.a.push({id:d.id,p:0})}
    while(S.a.length<MS_N)if(!roll())break;
  }
  function save(){return sset(JSON.stringify({v:MS_V,a:S.a,n:S.n,d:S.d,s:S.s,o:S.o}))}
  function done(j){
    var m=S.a[j],d=byId[m.id];
    S.a.splice(j,1);S.d++;pend+=d.p;last=d.id;if(d.o&&S.o.indexOf(d.id)<0)S.o.push(d.id);
    fill();save();
    if(typeof o.onComplete==="function"){try{o.onComplete(view(d,d.n),d.p)}catch(e){}}
  }
  function view(d,p){return {id:d.id,label:d.t,icon:d.i,progress:Math.min(p,d.n),goal:d.n,sparks:d.p,ev:d.ev}}
  /* apply value v of event ev: cum adds, run adds within this run, max keeps the best value seen in one run */
  function push(ev,v){
    if(off||!(v>0))return 0;
    /* only the missions active before this event count it: a mission rolled in by a completion starts from 0 */
    var n=0,j,cur=S.a.slice();
    for(j=0;j<cur.length;j++){var m=cur[j],d=byId[m.id];
      if(d.ev!==ev)continue;
      if(d.k==="cum")m.p=Math.min(d.n,m.p+v);
      else if(d.k==="run"){run[d.id]=(run[d.id]||0)+v;m.p=Math.min(d.n,run[d.id])}
      else m.p=Math.min(d.n,Math.max(m.p,v));
      if(m.p>=d.n){done(S.a.indexOf(m));n++}
    }
    return n;
  }
  fill();
  var api={
    disabled:off,
    /* on("jump"|"boots"|"pu"|"stomp"|"drone", amount=1) | on("spark", n) | on("level", n) | on("dist", px) | on("surv", s). Returns missions completed. */
    on:function(ev,amount){if(typeof ev!=="string")return 0;var v=amount===undefined?1:+amount;return push(ev,isFinite(v)?v:0)},
    runStart:function(){if(off)return;run={};S.n++;
      for(var j=0;j<S.a.length;j++){var d=byId[S.a[j].id];if(d.k==="run")S.a[j].p=0}
      save()},
    /* runEnd({durS, distPx}): survive/distance/level ('max') missions are judged on the finished run */
    runEnd:function(r){if(off||!r)return 0;var n=0,px=+r.distPx||0;
      n+=push("surv",+r.durS||0);n+=push("dist",px);
      if(lvF&&px>0){var lv=0;try{lv=+lvF(px)||0}catch(e){lv=0}n+=push("level",lv)}
      save();return n},
    /* banner(level): a level banner was shown; completes 'reach Level N' (N <= level) once */
    banner:function(level){return push("level",+level||0)},
    active:function(){var out=[];for(var j=0;j<S.a.length;j++){var d=byId[S.a[j].id],v=view(d,S.a[j].p);out.push(v);
      if(!off&&!shown[d.id]){shown[d.id]=1;if(typeof o.onShown==="function"){try{o.onShown(v)}catch(e){}}}}return out},
    pending:function(){return pend},
    takePayout:function(){var p=pend;pend=0;return p},
    runs:function(){return S.n},
    completed:function(){return S.d},
    save:save
  };
  return api;
}
/* game glue (MISSIONS-1: defined, not hooked yet). Disabled in demo, ?pu=, ?sk debug and ?level= debug runs. */
var msOff=!!((typeof demo!=="undefined"&&demo)||(typeof tpu!=="undefined"&&tpu)||(typeof skDebug!=="undefined"&&skDebug)||(typeof LVQ!=="undefined"&&LVQ));
var MS=createMissions({
  storage:{get:function(k){return lsg(k)},set:function(k,v){lss(k,v)}},
  disabled:msOff,
  exclude:["stomp","drone"],                   /* their hooks come later; never roll a mission the game can't count yet */
  /* distPx -> level, read-only: 1 score point = 20 px; lvFor()/LV_AT come from 06d-levels.js when present */
  levelFor:(typeof LV_AT!=="undefined"&&LV_AT&&LV_AT.length)?function(px){var s=Math.floor(px/20),n=0;for(var j=0;j<LV_AT.length;j++)if(s>=LV_AT[j])n=j+1;return n}:null,
  onComplete:function(m,p){if(typeof skEarn==="function"){skEarn(p);if(typeof skSave==="function")skSave()}}
});
function msOn(ev,a,b){
  if(msOff)return 0;
  if(ev==="start"){MS.runStart();return 0}
  if(ev==="over")return MS.runEnd({distPx:+a||0,durS:+b||0});
  if(ev==="pu")return MS.on("pu",1);
  if(ev==="level")return MS.banner(a);
  return MS.on(ev,a===undefined?1:a);
}
function msActive(){return MS.active()}
`;
