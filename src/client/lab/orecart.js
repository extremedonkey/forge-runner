// LAB layer for the ORE CART (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the site/Poki
// Preview: https://preview.forgerunnergames.com/pr-85/lab/orecart/  (draft PR #85)
// script). 06i-orecart.js is in every build but INERT there; this layer stands in for the three guarded live hook lines
// (13 update -> ocTick, 13 auto -> ocWant, 14 drawEnts -> ocDraw; exact lines in the 06i header) by wrapping the functions:
//   update(dt): runS before/after gives the real step dt (after rescue slow-mo); pw/ph/pt recomputed exactly as 13 does.
// Preview switches:  ?level=N  (06d LVQ, cosmetic level floor: carts from L2)   ?demo=1  autopilot jumps the carts too
//   ?bot=1   non-demo autopilot (shows the edge warning + sfx, which demo deliberately suppresses)
//   ?fast=1  every run starts at the 760 cap (LAB ONLY; no leaderboard/beacons here, so the changed score goes nowhere)
//   ?ocdbg=1 probe window.__oc for headless screenshot timing (+ freezeWhen/thaw: pauses the sim at a matching step)
export default String.raw`
/* ===== LAB: ORE CART (oncoming enemy) ===== */
/* ?ocdbg=1 screenshot freeze (lab only): __oc.freezeWhen("edge"|"view"|"jump") stops the sim on the first step that matches
   (drawing goes on), __oc.thaw() resumes */
var ocFrz=0,ocFW="";
function ocFP(k){for(var i=0;i<OC_N;i++){var c=ocC[i];if(!c.a)continue;
  if(k==="edge"&&c.ar&&!ocVis(c)&&ocTTI(c)<.8)return true;
  if(k==="view"&&ocVis(c)&&c.x>PX+pW()+90&&c.x<XO+VW-60&&py===0)return true;
  if(k==="jump"&&py>20&&c.x<PX+pW()-6&&c.x+OC_W>PX+6)return true}return false}
(function(){
  var oU=update,oD=drawEnts,oA=auto;
  update=function(dt){
    if(ocFrz)return;
    var r0=runS,s0=state;oU(dt);
    if(ocFW&&state==="run"&&ocFP(ocFW)){ocFrz=1;ocFW=""}
    if(s0==="run"&&state==="run"){var d=runS-r0;if(d<0)d=dt;var ph=pH(duck&&py===0),pw=pW();ocTick(d,pw,ph,GY-py-ph)}
  };
  auto=function(){oA();if(state==="run"&&ocWant()&&py===0&&jb<=0){duck=false;press()}};
  drawEnts=function(){oD();ocDraw();edgeWarnDraw()};
  /* ?bot=1: lab-only autopilot that is NOT demo mode (demo draws no edge warnings / plays no sfx by design), so the
     warning can be watched hands-free; restarts like demo. Not in the site/Poki builds. */
  if(Q.get("bot")==="1"){var oU2=update;update=function(dt){if(!demo){if(state==="run")auto();else if(state!=="run"&&performance.now()-deathAt>1200)start()}oU2(dt)}}
  if(Q.get("fast")==="1"){var oS=start;start=function(){oS();speed=MAXV}}
})();
if(Q.get("ocdbg"))window.__oc={get c(){return ocC},get state(){return state},get speed(){return speed},get py(){return py},PX:PX,get vis(){return XO+VW},
  tti:ocTTI,vis:ocVis,ew:function(){return edgeWarnLive()},get runS(){return runS},get lvl(){return ocLvl()},edge:function(){return edgeWarnRect("right")},freezeWhen:function(k){ocFrz=0;ocFW=k},thaw:function(){ocFrz=0;ocFW=""},get frozen(){return ocFrz}};
`;
