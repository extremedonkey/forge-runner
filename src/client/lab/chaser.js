// LAB layer for the CHASER (slag roller from behind; lab build only: scripts/build-lab.mjs puts it right before 16-loop.js,
// never in the site/Poki script). Preview: https://preview.forgerunnergames.com/pr-91/lab/chaser/  (draft PR 91)
// The roller is LIVE in every build through the three guarded hook lines (13 update -> srTick, 13 auto -> srWant,
// 14 drawEnts -> srDraw), so this layer wraps NONE of them (nothing runs twice; tested). It only adds preview switches:
//   ?level=N  (06d LVQ level floor: rollers from L3). The HUD marker normally names the NEXT level ("LV5" while on L4: the
//             "level=4 shows LV5" quirk is that label, not a wrong level); in this lab it names the CURRENT level (LV1-LV6).
//   ?bot=1    non-demo autopilot (shows the edge warning + plays the sfx + the hint, which demo deliberately suppresses)
//   ?fast=1   every run starts at the 760 cap (LAB ONLY: real-speed playtest)
//   ?hint=1   forget the one-time HOLD JUMP hint (clears forge-runner-chaser-hint) so it shows again
//   ?srdbg=1  probe window.__sr for headless screenshots (+ freezeWhen("warn"|"jump"|"overtake")/thaw: warn = left glow up,
//             roller still off screen; jump = buggy in the air over it; overtake = it has passed and rolls on ahead)
export default String.raw`
/* ===== LAB: CHASER (slag roller from behind) ===== */
var srFrz=0,srFW="";
LV_HL=["","LV1","LV2","LV3","LV4","LV5","LV6"];
if(Q.get("hint")==="1"){try{localStorage.removeItem(SR_HK)}catch(e){}srHS=0}
function srFP(k){for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a)continue;
  if(k==="warn"&&r.ar&&!srVis(r)&&srTTI(r)<.75&&py===0)return true;
  if(k==="overtake"&&r.x>PX+pW()+24&&r.x+SR_W<XO+VW-60&&py===0)return true;
  if(k==="jump"&&py>18&&r.x<PX+pW()-6&&r.x+SR_W>PX+6)return true}return false}
(function(){
  if(Q.get("srdbg")){var oU=update;update=function(dt){if(srFrz)return;oU(dt);if(srFW&&state==="run"&&srFP(srFW)){srFrz=1;srFW=""}}}
  if(Q.get("bot")==="1"){var oU2=update;update=function(dt){if(!demo){if(state==="run")auto();else if(performance.now()-deathAt>1200)start()}oU2(dt)}}
  if(Q.get("fast")==="1"){var oS=start;start=function(){oS();speed=MAXV}}
})();
if(Q.get("srdbg"))window.__sr={get c(){return srC},get state(){return state},get speed(){return speed},get py(){return py},PX:PX,
  tti:srTTI,vis:srVis,ew:function(){return edgeWarnLive()},get runS(){return runS},get lvl(){return srLvl()},get hint(){return srHT},
  edge:function(){return edgeWarnRect("left")},freezeWhen:function(k){srFrz=0;srFW=k},thaw:function(){srFrz=0;srFW=""},get frozen(){return srFrz}};
`;
