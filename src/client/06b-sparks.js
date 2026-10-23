// SPARKS core (owner: Dev, sparks PR1 fills this in): spark currency + upgrades between runs (sparks/SPEC.md §1-4, §7).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PR0 SCAFFOLD: every interface below exists but is inert (no storage, no Math.random, base values only), so later PRs can
// merge in any order and the game plays exactly as before. Runs after 06-state.js (SPT, BGT) and before 06c-sparks-debug.js.
export default String.raw`
/* sparks (scaffold, sparks PR0): interface only, all inert until sparks PR1 */
var WEB_SPARKS=true;              /* S1: sparks on the web build too (Reece, 23 Oct 2026) */
function isPoki(){return typeof PLATFORM!=="undefined"&&PLATFORM==="poki"}
var SKON=isPoki()||(typeof skDebug!=="undefined"&&!!skDebug)||WEB_SPARKS;
var SKV=1;                        /* save format version (key forge-runner-sparks) */
var SKU={};                       /* upgrade table m/c/d/p/r: costs, max, effects (PR1) */
var sk={v:SKV,b:0,l:{m:0,c:0,d:0,p:0,r:0},e:0,n:0};  /* the save object (in memory) */
var skRun=0;                      /* sparks earned this run */
function skLoad(){}
function skSave(){}
function skLv(k){return 0}
function skCost(k){return null}
function skCanBuy(k){return false}
function skBuy(k){return false}
function skEarn(n){}
/* effect getters: base values (no upgrades) */
function skSPT(){return SPT}
function skBGT(){return BGT}
function skMagR(){return 0}
function skPuF(){return 1}
function skInvShield(){return 1.2}
function skCores(){return 0}
`;
