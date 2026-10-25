// SPARKS core (owner: Dev, sparks PR1): spark currency + upgrades, bought only at pit stops (14c) (sparks/SPEC.md §1-4, §7).
// PER-RUN ECONOMY (Reece, 25 Oct 2026): every run starts with bank skSeed.b (0) and every level at skSeed.l (0); nothing earned
// or bought carries to the next run. The save keeps only lifetime stats {v:2,e,n}; v1 saves lose b and l (dropped, no refund).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 06-state.js (SPT, BGT) and before 06c-sparks-debug.js. Uses lsg/lss + demo/tpu (01-core.js), sfxBuy/sfxAllMax (08c,
// called only at buy time; skCellLbl/skDropLbl call skLabel (13) and the guarded sfxTick during a run). No Math.random, no listeners. Never touches speed/score/runS: upgrades only change the getters below.
// Tested by scripts/test-sparks.mjs (eval with fake lsg/lss).
export default String.raw`
/* sparks core (sparks PR1) */
var WEB_SPARKS=true;              /* S1: sparks on the web build too (Reece, 23 Oct 2026) */
function isPoki(){return window.FR_BUILD==="poki"}  /* POKI-1 build flag (site: 'site') */
var SKON=isPoki()||(typeof skDebug!=="undefined"&&!!skDebug)||WEB_SPARKS;
var SKV=2,SKK="forge-runner-sparks",SKMAX=9999999;
/* upgrade table (SPEC §2). c = cost per level (max level = c.length), e = effect per level. Tune costs here only. */
var SKU={
  m:{c:[8,55,150,300,500],e:[75,95,120,145,175]}, /* Spark Magnet: pull radius px (Lv1 75 px at 450 px/s: a pull lasts >= 150 ms) */
  c:{c:[30,80,200,350,550],e:[1.5,1]},              /* Power Cell: +s per level on spring (SPT) / big cart (BGT) */
  d:{c:[45,110,300,500],e:[.88,.77,.67,.58]},        /* Supply Drop: power-up spacing factor */
  p:{c:[15,45,600],e:[2]},                           /* Forge Plate: L1 shield at start, L2 inv after shield 1.2 -> 2.0 s, L3 re-forge */
  r:{c:[300,900]},                                  /* Spare Core: extra hits per run */
  h:{c:[40,150,700]},                                /* Heavy Cart: L1 stomp bugs, L2 stomp rollers too, L3 ram through bugs */
  t:{c:[40,120,350],e:[1.5,2,4]}                     /* Tractor (web only, 06p Dozer Blade): L1 +s blade time, L2 scrap pays x per piece, L3 s of blade (at once when bought in a pit) */
};
var SKKEYS=isPoki()?["m","c","d","p","r","h"]:["m","c","d","p","r","h","t"];  /* Poki: no Tractor (06p is in POKI_EXCLUDE; stays level 0) */
/* migrations: skMig[v](o) -> object at v+1. v1 -> v2: the bank and levels are per-run now, so they are dropped */
var skMig={1:function(o){return {v:2,e:o.e,n:o.n}}};
function skDef(){return {v:SKV,b:0,l:{m:0,c:0,d:0,p:0,r:0,h:0,t:0},e:0,n:0}}
var sk=skDef();                   /* in memory: lifetime e/n (saved) + this run's bank b and levels l (never saved) */
var skSeed={b:0,l:{}};            /* what every run starts with (0 / level 0; ?sk= debug seeds it, 06c) */
var skRun=0;                      /* sparks earned this run */
var skRO=false;                   /* never write: demo, ?pu=, debug (?sk), or a save from a newer build (v>SKV) */
function skInt(x,mx){return typeof x==="number"&&isFinite(x)&&Math.floor(x)===x?Math.max(0,Math.min(mx,x)):0}
function skLoad(){
  sk=skDef();
  skRO=!!(demo||tpu||(typeof skDebug!=="undefined"&&skDebug));
  var raw=lsg(SKK),o=null;
  if(raw==null||demo)return sk;  /* demo stays clean: level 0 everywhere, whatever the save holds */
  try{o=JSON.parse(raw)}catch(e){o=null}
  if(!o||typeof o!=="object"||Array.isArray(o)){if(!skRO)lss(SKK+"-bad",raw);return sk}  /* keep a copy, start fresh */
  var v=typeof o.v==="number"&&Math.floor(o.v)===o.v&&o.v>=1?o.v:1;
  while(v<SKV&&skMig[v]){try{o=skMig[v](o)||o}catch(e){}v++}
  if(v>SKV)skRO=true;             /* newer build's save (e.g. Poki cloud sync): read what we can, never overwrite it */
  sk.e=skInt(o.e,SKMAX);sk.n=skInt(o.n,SKMAX);   /* b and l are per-run: never read from the save */
  skRunStart();
  return sk;
}
/* a run's starting bank and levels (11 start(); also on load so the HUD starts clean) */
function skRunStart(){
  sk.b=skInt(skSeed.b,SKMAX);
  for(var k in SKU)sk.l[k]=SKKEYS.indexOf(k)>=0?skInt(skSeed.l[k],SKU[k].c.length):0;
}
function skSave(){if(!SKON||skRO)return false;lss(SKK,JSON.stringify({v:SKV,e:sk.e,n:sk.n}));return true}  /* lifetime stats only; lss swallows storage errors (incognito) */
function skLv(k){return SKU[k]?Math.min(sk.l[k]|0,SKU[k].c.length):0}
function skCost(k){var u=SKU[k];if(!u)return null;var lv=skLv(k);return lv>=u.c.length?null:u.c[lv]}
function skCanBuy(k){var c=skCost(k);return !!SKON&&c!==null&&sk.b>=c}
function skAllMax(){for(var i=0;i<SKKEYS.length;i++)if(skCost(SKKEYS[i])!==null)return false;return true}
function skBuy(k){
  if(!skCanBuy(k))return false;
  var f=skPuF();
  sk.b-=skCost(k);sk.l[k]=skLv(k)+1;
  typeof pkBought==="function"&&pkBought(k,f);  /* PIT STOP (14c): a buy while parked applies to this run */
  skSave();sfxBuy(k,sk.l[k]);
  /* one after-buy sting at most: everything maxed = sfxAllMax, this track maxed = sfxLevelUp */
  if(skAllMax()){typeof sfxAllMax==="function"&&sfxAllMax();}else if(skCost(k)===null){typeof sfxLevelUp==="function"&&sfxLevelUp(k,.45);}
  return true;
}
/* bank n sparks (live, so a closed tab keeps them up to the next write). Not earned in demo, ?pu= or debug runs. */
function skEarn(n){
  if(!SKON||demo||tpu||(typeof skDebug!=="undefined"&&skDebug))return;
  n=Math.floor(n);if(!(n>0))return;
  sk.b=Math.min(SKMAX,sk.b+n);sk.e=Math.min(SKMAX,sk.e+n);skRun+=n;
}
/* effect getters: base values when SKON is off */
function skSPT(){return SKON?SPT+SKU.c.e[0]*skLv("c"):SPT}
function skBGT(){return SKON?BGT+SKU.c.e[1]*skLv("c"):BGT}
function skMagR(){var lv=SKON?skLv("m"):0;return lv?SKU.m.e[lv-1]:0}
function skPuF(){var lv=SKON?skLv("d"):0;return lv?SKU.d.e[lv-1]:1}
function skInvShield(){return SKON&&skLv("p")>=2?SKU.p.e[0]:1.2}
function skCores(){return SKON?skLv("r"):0}
function skHv(){return SKON?skLv("h"):0}   /* Heavy Cart level (13 skHeavy) */
function skTr(){return SKON&&!isPoki()?skLv("t"):0}   /* Tractor level (06p Dozer Blade) */
/* pit stop card text (14c pkDs) for the tracks it does not know: what the next level gives (maxed: what it does now) */
function skDsX(k,lv,mx){
  if(k==="t")return mx?"Long blade, double scrap":["Dozer Blade lasts 1.5s longer","Scrap pays 2 ✦ a piece","Plough now: a 4s blade"][lv];
  if(k!=="h")return "";
  return mx?"Stomp bugs and rollers, ram through bugs":["Land on bugs to crush them (+1 ✦)","Stomp rollers too","Drive straight through bugs"][lv];
}
/* in-run labels (cost tune, 24 Oct 2026), same style as "SHIELD (Plate)": Power Cell lengthened a picked-up spring/big cart by
   this run's extra seconds; a power-up spawned with Supply Drop on (once per power-up). Off in demo (levels are 0 there anyway)
   and under reduced motion (skLabel). skLabel lives in 13-simulation.js (same IIFE, called only during a run). */
function skCellLbl(k){var x=k==="j"?spMax-SPT:k==="g"?bgMax-BGT:0;if(!SKON||demo||!(x>0))return;skLabel("+"+Math.round(x*10)/10+"s (Cell)");typeof sfxTick==="function"&&sfxTick()}
function skDropLbl(){if(!SKON||demo||!skLv("d"))return;skLabel("DROP! (Supply)");typeof sfxTick==="function"&&sfxTick()}
skLoad();
`;
