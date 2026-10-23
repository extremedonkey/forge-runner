// CORE: DOM handles, URL flags (?demo, ?pu test switch, ?sk sparks debug flag skDebug), localStorage helpers lsg/lss, name + UTM sanitisers nm()/ut().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
var cv=document.getElementById("c"),ctx=cv.getContext("2d",{alpha:false}),wrap=document.getElementById("wrap");
var rmq=window.matchMedia("(prefers-reduced-motion: reduce)");
function rm(){return rmq.matches}
var Q;try{Q=new URLSearchParams(location.search)}catch(e){Q={get:function(){return null}}}
var demo=Q.get("demo")==="1";
/* test switch for trying power-ups: ?pu=s|j|g starts every run with that power-up; no beacons, no high score */
var tpu=/^[sjg]$/.test(Q.get("pu")||"")?Q.get("pu"):"";
/* sparks debug switch (sparks SPEC §6): any ?sk= on the web build marks a debug run (parsed in 06c-sparks-debug.js).
   Like ?pu=: no beacons, no high-score write, read-only leaderboard. Always false on the Poki build */
var skDebug=window.FR_BUILD!=="poki"&&Q.get("sk")!==null;
function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
/* names: letters, digits, spaces; max 12 chars. Only ever drawn on the canvas or set via textContent. */
function nm(s){return Array.from(String(s||"").replace(/[^\p{L}\p{N} ]/gu,"").replace(/\s+/g," ").trim()).slice(0,12).join("").trim()}
function ut(s){return String(s||"").replace(/[^A-Za-z0-9_.\-]/g,"").slice(0,40)}
var NK="forge-runner-name";
`;
