// SPARKS debug switch (owner: Dev, sparks PR2): ?sk=<bank>[.<m><c><d><p><r>] with an in-memory save (SPEC §6).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// WEB BUILD ONLY: the Poki build (src/client/poki/script.mjs, POKI_EXCLUDE) drops this fragment, and its guard
// fails the Poki build if dist/poki contains the debug marker SKDBG (below). Runs after 06b-sparks.js.
// skDebug (01-core.js) is set by any ?sk= on the web build; 03-beacons.js (track no-op) and 15-leaderboard.js (ro)
// read it. This fragment: runtime !isPoki() guard, parses ?sk=, forces SKON, swaps in an in-memory save and blocks
// the forge-runner-sparks / high-score writes for the whole page. Nothing here runs without ?sk=.
export default String.raw`
/* SKDBG: sparks debug switch (web build only; the Poki build drops this fragment and fails on this marker) */
var SKDBG=typeof skDebug!=="undefined"&&!!skDebug&&!isPoki();
if(SKDBG){
  (function(){
    /* every run starts with: ?sk=500 -> 500 at level 0; ?sk=0.5543233 -> 0 sparks, every track maxed; ?sk=0 -> empty. Malformed -> empty (still debug) */
    var q=String(Q.get("sk")||""),mt=/^(\d{1,7})(?:\.(\d{5,7}))?$/.exec(q),K="mcdprht",MX=[5,5,4,3,2,3,3],l={},i;
    for(i=0;i<7;i++)l[K[i]]=mt&&mt[2]&&mt[2][i]?Math.min(MX[i],+mt[2][i]):0;
    skSeed={b:mt?+mt[1]:0,l:l};sk=skDef();skRunStart();   /* per-run economy: the seed is re-applied by every start() */
    SKON=true;                                   /* ?sk forces the feature on (web) */
    skLoad=function(){};skSave=function(){};     /* in-memory save: buys change sk, nothing persists */
    var w=lss;lss=function(k,v){if(k==="forge-runner-sparks"||k===KEY)return;w(k,v)};
    /* no high-score write (as with ?pu=): die() sees an unbeatable hi, then the real one is put back */
    var d=die;die=function(){var h=hi;hi=Infinity;try{d.apply(this,arguments)}finally{hi=h}};
  })();
}
`;
