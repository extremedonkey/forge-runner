// LAB layer for ENEMIES v2 (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the site/Poki
// script). It activates 06g-enemies-v2.js WITHOUT editing 11/13/14: it wraps spawn() (skin new ents), update() (enPre before,
// enPost after each sim step) and drawEnts() (v2 art), and replaces the demo autopilot auto() with the same logic plus a
// hammer-drone case. Lab-only test switch: ?en=l|v|h makes every spawn the base type of that enemy (b / p / d) so screenshots
// show it quickly (changes the spawn mix, so only for previews).
export default String.raw`
/* ===== LAB: ENEMIES v2 (slag blob, ember vent, hammer drone) ===== */
var EN_FORCE=({l:"b",v:"p",h:"d"})[Q.get("en")||""]||"";
(function(){
  var oS=spawn,oU=update,oD=drawEnts,oP=pick;
  spawn=function(){var n0=ents.length;oS();for(var i=n0;i<ents.length;i++)enTag(ents[i])};
  update=function(dt){var r=state==="run";if(r)enPre(dt);oU(dt);if(r||state==="over")enPost(dt)};
  drawEnts=function(){enDrawEnts(oD)};
  if(EN_FORCE)pick=function(){oP();return EN_FORCE};
})();
/* lab-only screenshot probe (?endbg=1): read-only view of the entity list for headless capture timing */
if(Q.get("endbg"))window.__fr={get ents(){return ents},get state(){return state},get speed(){return speed},PX:PX,get vis(){return XO+VW},enVentT:enVentT,enHamT:enHamT};
function auto(){
  var t=performance.now();
  if(state==="start"){start();return}
  if(state==="over"){if(t-deathAt>1200)start();return}
  var wantJump=false,wantDuck=false;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],rel=speed+(e.vx||0),d=e.x-(PX+pW());
    if(e.x+e.w<PX+4)continue;
    if(e.t==="u"||e.t==="k"||(e.t==="b"&&big()))continue;
    if(e.t==="d"){if(d<rel*.4)wantDuck=true;continue}
    if(e.t==="h"){if(d<rel*.45)wantDuck=true;continue}
    if(e.t==="f"&&e.bot>=50)continue;
    if(e.t==="f"&&e.bot===18){if(d<rel*.3)wantDuck=true;continue}
    if(d>rel*.2)continue;
    wantJump=true;
  }
  duck=wantDuck&&!wantJump;
  if(wantJump&&py===0&&jb<=0)press();
  else if(held&&vy<=0)release();
}
`;
