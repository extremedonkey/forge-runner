// HEAT GAUGE (owner: Levels): L8 SLAG PITS II's heat meter, reusable by any level with a HEAT_LV row.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Never writes speed / score / scroll / runS; no Math.random (grate spacing is a fixed hash). Off in demo and with ?heat=0.
//  - htH 0..1: rises (row.up /s) while the buggy rolls on hot ground, barely cools while airborne (row.air /s: playtest 25 Oct,
//    jumping alone kept it cool, so the player never had to think) and fast in COOLANT (row.grate /s, the buggy's centre in a
//    coolant pool, grounded). Paused during the level banner. Off a heat level it cools away (HT.off /s).
//  - COOLANT: short pools of water on the track ("grates" in the code), placed HT.lead s ahead so that no more than row.gap s of
//    hot ground lies between two (slid forward off any gap or obstacle); 06k places new gaps only past the newest pool (htClr),
//    13 spawn drops an obstacle that would sit in a pool's drive-through zone (htSpawn) and 06i ore carts never meet the buggy
//    there (htNear), so a pool can always be driven through. Riding the pools never overheats; skipping one nearly always does.
//  - OVERHEAT (htH reaches 1) is a hit with the shared absorb order (06n azHit): inv -> shield -> Spare Core -> die(). After a
//    save the gauge drops to HT.reset. While the player is still learning heat (06t coach: coLearning("heat")) an overheat only
//    vents (no hit, gauge to HT.vent, "OVERHEATED!"), so nobody dies before they know what the gauge is.
//  - HUD: a small HEAT bar under the level marker, a mini gauge riding above the buggy once it is warming (HT.near: where the
//    player is looking), and the buggy glows red past HT.warm (static under reduced motion). Grates carry a snowflake.
// Hooks (one typeof-guarded line each): 13 update() -> htTick(dt,pw,ph,pt) (after sgTick); 06k gpSpawn lip -> htClr();
// 14 draw() -> htDraw() (after sgDraw), drawHud() -> htHud() (right before lvDraw, which stays last).
export default String.raw`
/* heat: per-level rows (index = level-1; null = no heat); reset = gauge after a save, len = grate px, lead = s ahead a grate is
   placed, warm = glow threshold, off = cool-down /s off a heat level, sep = s of track between a grate and the next gap's lip */
var HEAT_LV=[null,null,null,null,null,null,null,{up:.18,air:.05,grate:6,gap:4.2}];
var HT={reset:.4,vent:.5,len:110,lead:1.3,warm:.6,near:.3,off:.5,sep:.3,slide:40,maxSlide:2400,pre:.35,post:.2,land:1.2,early:.6},HT_ON=true;
try{if(Q&&Q.get&&Q.get("heat")==="0")HT_ON=false}catch(e){}
var htH=0,htG=[],htLast=-1e9,htN=0;
function htRow(){if(!HT_ON||demo)return null;var n=typeof currentLevel==="function"?currentLevel():1;return HEAT_LV[n-1]||null}
/* 06k gpSpawn: new gap lips stay past the newest grate (+ HT.sep s), so a later gap never lands on one */
function htClr(){return htRow()&&htG.length?htG[htG.length-1].x1+HT.sep*speed*vMul():-1e9}
function htOnGrate(c){for(var i=0;i<htG.length;i++)if(c>=htG[i].x0&&c<=htG[i].x1)return true;return false}
/* a pool's drive-through zone (world x): HT.pre s of felt travel before it to HT.post s after it, grounded the whole way */
function htNear(a,b){var f=Math.max(1,speed*vMul()),i,g;for(i=0;i<htG.length;i++){g=htG[i];if(b>g.x0-HT.pre*f&&a<g.x1+HT.post*f)return true}return false}
/* 13 spawn(), after gpSpawn: drop an obstacle this spawn put inside a pool's drive-through zone (sparks / pickups stay) */
function htSpawn(n0){
  if(!htG.length)return;
  for(var i=ents.length-1;i>=n0;i--){var e=ents[i];if(e.t==="k"||e.t==="u")continue;if(htNear(hsc+e.x,hsc+e.x+e.w))ents.splice(i,1)}
}
function htObs(a,b){for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t==="k"||e.t==="u")continue;if(hsc+e.x+e.w>a&&hsc+e.x<b)return true}return false}
/* the shared absorb order (as 06n azHit): inv -> shield -> Spare Core -> die(); true = the run ended */
function htHit(pw,ph,pt){
  if(inv>0){htH=1;return false}
  if(typeof coLearning==="function"&&coLearning("heat")){htH=HT.vent;if(typeof skLabel==="function")skLabel("OVERHEATED!","#ef4444");sfx(300,90,.3,2,.08);return false}
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
    /* clear of every hole by its landing zone (HT.land s: a full jump or a spring flight lands that far past a far edge, and must
       not fly over the water) and of obstacles by the drive-through zone */
    var blk=function(x){return typeof gapNear==="function"&&gapNear(x-HT.land*f,x+HT.len+HT.post*f)||htObs(x-HT.pre*f,x+HT.len+HT.post*f)||typeof sgPadNear==="function"&&sgPadNear(x-HT.pre*f,x+HT.len+HT.post*f)};
    /* a spring's run-up in the way: rather put the pool just before it (when that is still >= HT.early s ahead and clear) */
    if(blk(x)&&typeof sgPadNear==="function"&&sgPadNear(x-HT.pre*f,x+HT.len+HT.post*f)){
      var xb=x;while(xb>hsc+PX+PW+HT.early*f&&sgPadNear(xb-HT.pre*f,xb+HT.len+HT.post*f))xb-=HT.slide;
      if(xb>hsc+PX+PW+HT.early*f&&!blk(xb))x=xb}
    for(s=0;s<=HT.maxSlide&&blk(x);s+=HT.slide)x+=HT.slide;
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
/* 14 draw(), after sgDraw: the coolant pools (a shallow blue water skin riding the ground, ripples, steam where the buggy is in it) */
function htDraw(){
  if(!htG.length)return;
  var i,g,a,b,x,y,mo=!rm(),c=hsc+PX+PW/2;
  for(i=0;i<htG.length;i++){g=htG[i];a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    ctx.fillStyle="rgba(14,116,144,.85)";
    for(x=a;x<b;x+=6){y=GY-hlH(x);ctx.fillRect(Math.round(x),Math.round(y-4),6,7)}
    ctx.fillStyle="#7dd3fc";
    for(x=a;x<b;x+=6){y=GY-hlH(x);ctx.fillRect(Math.round(x),Math.round(y-4),6,2)}
    ctx.fillStyle="#e0f2fe";
    for(x=a+8;x<b-8;x+=22){y=GY-hlH(x);ctx.globalAlpha=mo?.4+.4*Math.sin(tt*6+x*.3):.6;ctx.fillRect(Math.round(x+(mo?3*Math.sin(tt*2+x):0)),Math.round(y-4),6,1)}
    ctx.globalAlpha=1;
    if(mo&&py===0&&c>=g.x0&&c<=g.x1){ctx.fillStyle="#f1f5f9";for(var k=0;k<6;k++){var u=(tt*2.5+k*.17)%1;ctx.globalAlpha=(1-u)*.6;ctx.fillRect(Math.round(PX+6+k*7+Math.sin(tt*7+k)*3),Math.round(GY-hlB()-8-u*26),4,4)}ctx.globalAlpha=1}   /* steam */
    /* snowflake (pixel asterisk) floating over the grate's middle: "this cools you" */
    var sx=Math.round((a+b)/2),sy=Math.round(GY-hlH((a+b)/2)-22+(rm()?0:2*Math.sin(tt*3+g.k)));ctx.fillStyle="#bae6fd";
    ctx.fillRect(sx-1,sy-7,3,15);ctx.fillRect(sx-7,sy-1,15,3);ctx.fillRect(sx-5,sy-5,3,3);ctx.fillRect(sx+3,sy-5,3,3);ctx.fillRect(sx-5,sy+3,3,3);ctx.fillRect(sx+3,sy+3,3,3);
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
  var gb=GY-(typeof hlB==="function"&&typeof hlOn!=="undefined"&&hlOn?hlB():0)-py;
  if(h>HT.warm){ctx.globalAlpha=(h-HT.warm)/(1-HT.warm)*.4*pu;ctx.fillStyle="#ef4444";ctx.fillRect(PX-4,gb-36,PW+8,36);ctx.globalAlpha=1}
  if(h>HT.near){   /* mini gauge over the buggy: where the player looks */
    ctx.globalAlpha=.6;ctx.fillStyle="rgba(5,7,13,.85)";ctx.fillRect(PX-3,gb-50,PW+6,6);
    ctx.globalAlpha=.95*pu;ctx.fillStyle=col;ctx.fillRect(PX-2,gb-49,Math.round((PW+4)*h),4);ctx.globalAlpha=1}
}
`;
