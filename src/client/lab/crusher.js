// LAB layer for LEVELS-5 THE CRUSHER (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the
// site/Poki script). The boss itself is live in every build via the guarded hook lines in 13/14 (crGap, crTick, crDraw,
// crHud); this layer only adds preview switches, so nothing is applied twice:
//   ?boss=1  level floor 5 from the start (06d LVQ, cosmetic level only) and the boss allowed in ?demo=1, so it comes in
//            right after the run-start L5 banner
//   ?fast=1  pre-warm: every run starts at the 760 px/s cap (LAB ONLY, for Playtest: the real boss is always at 760 because
//            L5 is 90 s+; the lab has no leaderboard/beacons, so the changed score curve goes nowhere)
//   ?thin=0  no spawn thinning (layered-only comparison)      ?crdbg=1  read-only probe window.__cr for screenshot timing
export default String.raw`
/* ===== LAB: THE CRUSHER (L5 boss) ===== */
if(Q.get("boss")==="1"){if(!LVQ)LVQ=5;CR_DEMO=1}
if(Q.get("thin")==="0")CR_THIN=0;
if(Q.get("fast")==="1")(function(){var oS=start;start=function(){oS();speed=MAXV}})();
if(Q.get("crdbg"))window.__cr={get s(){return crS},get t(){return crT},get i(){return crI},get n(){return crN},get ban(){return crBan},get state(){return state},
  get py(){return py},PX:PX,get speed(){return speed},get plates(){return crPL},get x(){return crX},get vis(){return XO+VW},strip:crStrip};
`;
