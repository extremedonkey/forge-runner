// LAB layer for LEVELS-5 THE CRUSHER (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the
// site/Poki script). It wires 06h-crusher.js in by chaining the existing guarded hooks (no edits to 13/14):
//   06g enPost(dt) (end of update)  -> + crTick(dt)        06g enDrawAfter() (after the entities) -> + crDraw()
//   06d lvDraw() (end of the HUD)   -> + crHud()
//   13 spawn()                      -> + nextGap+=crGap()  (spawn thinning while the press is active; ?thin=0 turns it off)
// Lab switches: ?boss=1 = level floor 5 from the start (06d LVQ, cosmetic level only: score/speed untouched), so the boss comes
// in right after the run-start L5 banner; ?crdbg=1 = read-only probe window.__cr for headless screenshot timing.
export default String.raw`
/* ===== LAB: THE CRUSHER (L5 boss) ===== */
if(Q.get("boss")==="1"&&!LVQ)LVQ=5;
if(Q.get("thin")==="0")CR_THIN=0;
(function(){
  /* stands in for the proposed 13 hook (end of spawn(): nextGap+=crGap()) */
  var oS=spawn;spawn=function(){oS();nextGap+=crGap()};
  var oP=typeof enPost==="function"?enPost:null,oD=typeof enDrawAfter==="function"?enDrawAfter:null,oH=typeof lvDraw==="function"?lvDraw:null;
  enPost=function(dt){if(oP)oP(dt);crTick(dt)};
  enDrawAfter=function(){if(oD)oD();crDraw()};
  lvDraw=function(){if(oH)oH();crHud()};
})();
if(Q.get("crdbg"))window.__cr={get s(){return crS},get t(){return crT},get i(){return crI},get n(){return crN},get ban(){return crBan},get state(){return state},
  get py(){return py},PX:PX,get speed(){return speed},get plates(){return crPL},get x(){return crX},get vis(){return XO+VW}};
`;
