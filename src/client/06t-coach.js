// COACH (owner: Levels): first-encounter teaching for level mechanics, in the spirit of 06h RESCUE's runs-1-3 TAP / SPACE prompt.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Playtest 25 Oct (L8 SLAG PITS II): "even I had no idea what I was doing". The first time a hazard kind comes up in a run, the
// game drops into slow motion (CO.slowK of real time for CO.slowS s; the WHOLE sim step is scaled, exactly like 06h's slow-mo, so
// speed / score / runS stay in lockstep and every fairness window keeps its shape) and a short instruction is drawn over the
// hazard with an arrow: lava pool "LAVA - JUMP!", collapsing bridge "BRIDGE FALLS - JUMP!", geyser "RIDE THE GEYSER!", and once
// the heat gauge passes CO.heat "TOO HOT! COOL ON GRATES" pointing at the next grate. A kind stops being coached once the player
// has come through it CO.need times (saved in localStorage forge-runner-coach; memory only under ?sk= debug). Off in demo.
// Reusable: any kind 06q places (pool / fall / geyser / crust) and 06s heat; COACH_TX holds the words.
// Hooks (one typeof-guarded line each / one wrap): 06h rsDt (13 update's slow-mo hook) is wrapped at load by coDt;
// 14 draw() -> coDraw() (right before the HUD, after the rescue prompt).
export default String.raw`
/* coach: lead = s before the hazard (felt) when the lesson starts, slowS / slowK = slow-mo real seconds / time factor, need =
   clears of a kind before it is no longer coached, heat = gauge level that triggers the heat lesson, hold = s a heat lesson shows */
var CO={lead:1.05,slowS:.9,slowK:.35,need:2,heat:.55,hold:2.4,calm:1.5},COK="forge-runner-coach";
var COACH_TX={pool:["LAVA - JUMP!","#fb923c"],fall:["BRIDGE FALLS - JUMP!","#fdba74"],geyser:["JUMP ON THE SPRING!","#fde047"],crust:["SAFE BRIDGE","#fdba74"],heat:["TOO HOT! DRIVE THROUGH WATER","#38bdf8"]};
var coOn=!demo,coMem=typeof skDebug!=="undefined"&&!!skDebug,coSave={},coP=null,coT=0,coRun={},coR=-1;
(function(){if(!coOn||coMem)return;try{var o=JSON.parse(lsg(COK)||"null");if(o&&typeof o==="object")for(var k in COACH_TX){var n=+o[k];if(isFinite(n)&&n>0)coSave[k]=Math.min(99,Math.floor(n))}}catch(e){}})();
function coWrite(){if(!coOn||coMem||tpu)return;lss(COK,JSON.stringify(coSave))}
function coWant(k){return coOn&&!coRun[k]&&(coSave[k]||0)<CO.need}
/* 06s: is the player still learning kind k (an overheat then only vents)? Off in demo / when coaching is off */
function coLearning(k){return coOn&&(coSave[k]||0)<CO.need}
/* a lesson was passed: count it (once per lesson) */
function coDone(k){coSave[k]=(coSave[k]||0)+1;coWrite()}
/* 13 update(), via the wrapped rsDt: start / end lessons, then the slow-mo factor for this step (counts down in real time) */
function coDt(dt){
  if(!coOn||state!=="run")return dt;
  if(runS<=dt+1e-9||coR>runS){coP=null;coT=0;coRun={}}   /* a new run */
  coR=runS;
  var f=Math.max(1,speed*vMul()),fr=hsc+PX+PW,i,g,k,x0;
  /* end the current lesson: the buggy is past its hazard (count it if the run goes on), or the heat lesson has cooled / timed out */
  if(coP){
    if(coP.k==="heat"){coP.t-=dt;if(typeof htH==="number"&&htH<.25){coDone("heat");coP=null}else if(coP.t<=0)coP=null}
    else if(hsc+PX>coP.g.x1){coDone(coP.k);coP=null}
    else if(typeof gpGaps!=="undefined"&&gpGaps.indexOf(coP.g)<0)coP=null;
  }
  /* start one: the first hazard of a kind not yet learnt this run, CO.lead s ahead */
  if(!coP&&typeof gpGaps!=="undefined")for(i=0;i<gpGaps.length;i++){g=gpGaps[i];k=g.k;if(!k||!COACH_TX[k]||!coWant(k)||k==="crust")continue;
    x0=k==="geyser"&&g.pad0!=null?g.pad0:g.x0;
    var tti=(x0-fr)/f;if(tti>0&&tti<=CO.lead){coP={k:k,g:g};coRun[k]=1;coT=CO.slowS;break}}
  /* the heat lesson only on calm ground (grounded, no hole within CO.calm s): never on top of another lesson or cue */
  if(!coP&&typeof htH==="number"&&htH>=CO.heat&&coWant("heat")&&py===0&&!(typeof gapNear==="function"&&gapNear(fr-PW,fr+CO.calm*f))){coP={k:"heat",t:CO.hold};coRun.heat=1;coT=CO.slowS}
  if(coT>0){coT-=dt;return dt*CO.slowK}
  return dt;
}
if(typeof rsDt==="function"){var coRsDt=rsDt;rsDt=function(dt){return coDt(coRsDt(dt))}}
/* 14 draw(), before the HUD: the instruction over the hazard (or over the buggy + the next grate for heat), with an arrow */
function coDraw(){
  if(!coP||state!=="run")return;
  var T=COACH_TX[coP.k],pw0=rm()?1:.8+.2*Math.sin(performance.now()/110),px=Math.round(16*HS*pw0+6),x,y,ax,ay,g=coP.g,i;
  if(coP.k==="heat"){
    var gb=GY-(typeof hlOn!=="undefined"&&hlOn?hlB():0);x=PX+PW/2+60;y=gb-78;ax=null;   /* anchored to the ground under the buggy */
    if(typeof htG!=="undefined")for(i=0;i<htG.length;i++)if(htG[i].x1>hsc+PX){ax=(htG[i].x0+htG[i].x1)/2-hsc;ay=GY-hlH(ax)-34;break}
  }else{
    var cx=(g.k==="geyser"&&g.pad0!=null?g.pad0+GZ.pad/2:(g.x0+g.x1)/2)-hsc,gy=GY-Math.max(g.h0,g.h1);
    ax=cx;ay=gy-(g.k==="geyser"?58:12);x=cx;y=gy-(g.k==="geyser"?96:70);
  }
  x=Math.max(XO+90*HS,Math.min(XO+VW-90*HS,x));
  txt(T[0],x,y,px,T[1],"center",true,true,true,OR,"co",1);
  if(ax!=null){ctx.fillStyle=T[1];var bob=rm()?0:Math.round(3*Math.sin(performance.now()/120));
    ctx.fillRect(Math.round(ax)-2,Math.round(ay)-14+bob,4,8);ctx.fillRect(Math.round(ax)-6,Math.round(ay)-6+bob,12,3);ctx.fillRect(Math.round(ax)-3,Math.round(ay)-3+bob,6,3)}   /* down arrow */
}
`;
