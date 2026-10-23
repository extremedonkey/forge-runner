// SPARKS core (owner: Dev, sparks PR1): spark currency + upgrades between runs (sparks/SPEC.md §1-4, §7).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 06-state.js (SPT, BGT) and before 06c-sparks-debug.js. Uses lsg/lss + demo/tpu (01-core.js), sfxBuy/sfxAllMax (08c,
// called only at buy time). No Math.random, no listeners. Never touches speed/score/runS: upgrades only change the getters below.
// Tested by scripts/test-sparks.mjs (eval with fake lsg/lss).
export default String.raw`
/* sparks core (sparks PR1) */
var WEB_SPARKS=true;              /* S1: sparks on the web build too (Reece, 23 Oct 2026) */
function isPoki(){return window.FR_BUILD==="poki"}  /* POKI-1 build flag (site: 'site') */
var SKON=isPoki()||(typeof skDebug!=="undefined"&&!!skDebug)||WEB_SPARKS;
var SKV=1,SKK="forge-runner-sparks",SKMAX=9999999;
/* upgrade table (SPEC §2). c = cost per level (max level = c.length), e = effect per level. Tune costs here only. */
var SKU={
  m:{c:[8,60,150,300,500],e:[40,70,100,130,170]},  /* Spark Magnet: pull radius px */
  c:{c:[40,100,200,350,550],e:[1.5,1]},             /* Power Cell: +s per level on spring (SPT) / big cart (BGT) */
  d:{c:[50,150,300,500],e:[.88,.77,.67,.58]},       /* Supply Drop: power-up spacing factor */
  p:{c:[80,250,600],e:[2]},                         /* Forge Plate: L1 shield at start, L2 inv after shield 1.2 -> 2.0 s, L3 re-forge */
  r:{c:[300,900]}                                   /* Spare Core: extra hits per run */
};
var SKKEYS=["m","c","d","p","r"];
var skMig={};                     /* migrations: skMig[v](o) -> object at v+1 (none yet) */
function skDef(){return {v:SKV,b:0,l:{m:0,c:0,d:0,p:0,r:0},e:0,n:0}}
var sk=skDef();                   /* the save object (in memory) */
var skRun=0;                      /* sparks earned this run */
var skRO=false;                   /* never write: demo, ?pu=, debug (?sk), or a save from a newer build (v>SKV) */
function skInt(x,mx){return typeof x==="number"&&isFinite(x)&&Math.floor(x)===x?Math.max(0,Math.min(mx,x)):0}
function skLoad(){
  sk=skDef();
  skRO=!!(demo||tpu||(typeof skDebug!=="undefined"&&skDebug));
  var raw=lsg(SKK),o=null;
  if(raw==null)return sk;
  try{o=JSON.parse(raw)}catch(e){o=null}
  if(!o||typeof o!=="object"||Array.isArray(o)){if(!skRO)lss(SKK+"-bad",raw);return sk}  /* keep a copy, start fresh */
  var v=typeof o.v==="number"&&Math.floor(o.v)===o.v&&o.v>=1?o.v:1;
  while(v<SKV&&skMig[v]){try{o=skMig[v](o)||o}catch(e){}v++}
  if(v>SKV)skRO=true;             /* newer build's save (e.g. Poki cloud sync): read what we can, never overwrite it */
  sk.b=skInt(o.b,SKMAX);sk.e=skInt(o.e,SKMAX);sk.n=skInt(o.n,SKMAX);
  var l=o.l&&typeof o.l==="object"?o.l:{};
  for(var i=0;i<SKKEYS.length;i++){var k=SKKEYS[i];sk.l[k]=skInt(l[k],SKU[k].c.length)}
  return sk;
}
function skSave(){if(!SKON||skRO)return false;lss(SKK,JSON.stringify(sk));return true}  /* lss swallows storage errors (incognito) */
function skLv(k){return SKU[k]?Math.min(sk.l[k]|0,SKU[k].c.length):0}
function skCost(k){var u=SKU[k];if(!u)return null;var lv=skLv(k);return lv>=u.c.length?null:u.c[lv]}
function skCanBuy(k){var c=skCost(k);return !!SKON&&c!==null&&sk.b>=c}
function skAllMax(){for(var i=0;i<SKKEYS.length;i++)if(skCost(SKKEYS[i])!==null)return false;return true}
function skBuy(k){
  if(!skCanBuy(k))return false;
  sk.b-=skCost(k);sk.l[k]=skLv(k)+1;
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
skLoad();
`;
