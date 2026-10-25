// HEAT GAUGE (owner: Levels): L8 SLAG PITS II's heat meter, reusable by any level with a HEAT_LV row.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Never writes speed / score / scroll / runS; no Math.random (grate spacing is a fixed hash). Off in demo and with ?heat=0.
//  - htH 0..1: rises (row.up /s) while the buggy rolls on hot ground, cools while airborne (row.air /s) and fast on a cooling grate
//    (row.grate /s, the buggy's centre over it). Paused during the level banner. Off a heat level it cools away (HT.off /s).
//  - GRATES: short cooling grates on the track, placed HT.lead s ahead of the buggy so that no more than row.gap s of hot ground
//    lies between two of them (slid forward off any gap); 06k places new gaps only past the newest grate (htClr), so a gap never
//    swallows one. A player who rides the grates never overheats; one who skips them and never jumps does in ~1/row.up s.
//  - OVERHEAT (htH reaches 1) is a hit with the shared absorb order (06n azHit): inv -> shield -> Spare Core -> die(). After a
//    save the gauge drops to HT.reset.
//  - HUD: a small HEAT bar under the level marker; the buggy glows red past HT.warm (static under reduced motion).
// Hooks (one typeof-guarded line each): 13 update() -> htTick(dt,pw,ph,pt) (after sgTick); 06k gpSpawn lip -> htClr();
// 14 draw() -> htDraw() (after sgDraw), drawHud() -> htHud() (right before lvDraw, which stays last).
export default String.raw`
/* heat: per-level rows (index = level-1; null = no heat); reset = gauge after a save, len = grate px, lead = s ahead a grate is
   placed, warm = glow threshold, off = cool-down /s off a heat level, sep = s of track between a grate and the next gap's lip */
var HEAT_LV=[null,null,null,null,null,null,null,{up:.2,air:.35,grate:6,gap:4.2}];
var HT={reset:.4,len:110,lead:1.3,warm:.6,off:.5,sep:.3,slide:40,maxSlide:900},HT_ON=true;
try{if(Q&&Q.get&&Q.get("heat")==="0")HT_ON=false}catch(e){}
var htH=0,htG=[],htLast=-1e9,htN=0;
function htRow(){if(!HT_ON||demo)return null;var n=typeof currentLevel==="function"?currentLevel():1;return HEAT_LV[n-1]||null}
/* 06k gpSpawn: new gap lips stay past the newest grate (+ HT.sep s), so a later gap never lands on one */
function htClr(){return htRow()&&htG.length?htG[htG.length-1].x1+HT.sep*speed*vMul():-1e9}
function htOnGrate(c){for(var i=0;i<htG.length;i++)if(c>=htG[i].x0&&c<=htG[i].x1)return true;return false}
/* the shared absorb order (as 06n azHit): inv -> shield -> Spare Core -> die(); true = the run ended */
function htHit(pw,ph,pt){
  if(inv>0){htH=1;return false}
  if(shd){shd=0;if(typeof shdP!=="undefined")shdP=0;if(typeof skShieldBreak==="function")skShieldBreak();sfx(900,180,.25,2,.09);if(!rm())shake=.15;htH=HT.reset;return false}
  if(cores>0&&typeof skReboot==="function"){skReboot(pt,ph);htH=HT.reset;return false}
  die();return true;
}
/* 13 update(), each sub-step (run branch): grates ahead, heat, overheat */
function htTick(dt,pw,ph,pt){
  if(state!=="run")return;
  if(runS<=dt+1e-9){htH=0;htG=[];htLast=-1e9;htN=0}   /* first step of a run */
  var R=htRow(),f=Math.max(1,speed*vMul()),c=hsc+PX+PW/2,x,s,i;
  while(htG.length&&htG[0].x1<hsc-200)htG.shift();
  if(!R){htH=Math.max(0,htH-HT.off*dt);return}
  /* the next grate: when the hot ground since the last one reaches row.gap - lead s, HT.lead s ahead (slid off gaps) */
  if(htLast<-1e8)htLast=hsc+PX;
  if((hsc+PX+PW+HT.lead*f-htLast)/f>=R.gap){
    x=Math.max(htLast,hsc+PX+PW+HT.lead*f);
    for(s=0;s<=HT.maxSlide&&typeof gapNear==="function"&&gapNear(x-PW,x+HT.len+PW);s+=HT.slide)x+=HT.slide;
    htG.push({x0:x,x1:x+HT.len,k:++htN});htLast=x+HT.len;
  }
  if(typeof lvB==="number"&&lvB>0)return;   /* level banner: no heat change */
  if(py===0&&htOnGrate(c))htH-=R.grate*dt;
  else if(py===0)htH+=R.up*dt;
  else htH-=R.air*dt;
  if(htH<0)htH=0;
  if(htH>=1){htH=1;return htHit(pw,ph,pt)}
  return false;
}
/* 14 draw(), after sgDraw: the cooling grates (steel bars over a blue glow, riding the ground) */
function htDraw(){
  if(!htG.length)return;
  var i,g,a,b,x,y;
  for(i=0;i<htG.length;i++){g=htG[i];a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    ctx.fillStyle="rgba(56,189,248,.35)";
    for(x=a;x<b;x+=10){y=GY-hlH(x);ctx.fillRect(Math.round(x),Math.round(y-6),10,6)}
    ctx.fillStyle="#94a3b8";
    for(x=a;x<b;x+=10){y=GY-hlH(x);ctx.fillRect(Math.round(x),Math.round(y-2),6,3)}
    ctx.fillStyle="#38bdf8";ctx.fillRect(Math.round(a),Math.round(GY-hlH(a)-3),3,4);ctx.fillRect(Math.round(b-3),Math.round(GY-hlH(b)-3),3,4);
  }
}
/* 14 drawHud(), after lvDraw: the HEAT bar under the level marker, and the buggy's red glow when hot */
function htHud(){
  if(state!=="run"||!htRow()&&htH<=0)return;
  var y=(typeof lvHudY==="function"?lvHudY():30)+Math.round(16*HS),x=XO+14,px=Math.round(8*HS),bw=Math.round(52*HS),bh=Math.max(3,Math.round(4*HS)),h=htH,
    col=h<.5?"#fde047":h<.8?"#fb923c":"#ef4444",pu=rm()?1:h>=.8?.6+.4*Math.sin(tt*14):1;
  ctx.globalAlpha=.85;txt("HEAT",x,y+px,px,col,"left",true,true,true,"","hth");
  var bx=x+Math.round(30*HS);
  ctx.globalAlpha=.55;ctx.fillStyle="rgba(5,7,13,.8)";ctx.fillRect(bx-1,y+px-bh-2,bw+2,bh+2);
  ctx.globalAlpha=.9*pu;ctx.fillStyle=col;ctx.fillRect(bx,y+px-bh-1,Math.round(bw*h),bh);
  ctx.globalAlpha=1;
  if(h>HT.warm){var gb=GY-(typeof hlB==="function"&&typeof hlOn!=="undefined"&&hlOn?hlB():0)-py;
    ctx.globalAlpha=(h-HT.warm)/(1-HT.warm)*.4*pu;ctx.fillStyle="#ef4444";ctx.fillRect(PX-4,gb-36,PW+8,36);ctx.globalAlpha=1}
}
`;
