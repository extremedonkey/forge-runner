// FIRST 30 SECONDS (t444u): a fresh player should see sparks, a combo, praise and a free power-up before the first death.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 15-leaderboard.js, right before 16-loop.js (reads Q/demo/tpu/rm from 01, W/PX from 04, ents/runS/state/inv/spT/bgT from 06,
// addP from 11, skLabel/vMul from 13/06i, skEarn/SKON from 06b, sfx/mf from 08, pk from 14c).
// Hooks (guarded one-liners): 11-gameflow.js start() calls f3Start() (reset); 16-loop.js frame() calls f3Tick(dt) ONCE per frame, after the sim sub-steps and lvTick
// (f3Tick only reads state; a crate / spark that vanished during any sub-step is caught by the prev/cur comparison).
// Nothing is written to the simulation: it only reads ents / runS and pushes a few ents. NEVER calls Math.random (no sparks()/rnd()).
// 1. SPARK TRAIL (SKON only): F3.n sparks pushed on the first tick of a run so they reach the buggy at 1.0-1.75 s; with the 06h rescue
//    row (~2.35 s) it is one 1.0-2.4 s chain.
// 2. COMBO POPS: a spark pickup is detected as a k ent that vanished near the buggy; pickups <= F3.gap s apart chain: "xN COMBO".
//    Chain F3.bonusAt banks F3.bonus sparks once per run ("SPARK TRAIL +2").
// 3. PRAISE: the first two clean crate clears of the run ("NICE!", "GREAT!"), chime + burst.
// 4. FREE POWER-UP DROP (~10 s): one spring-boots pickup if the run has not met a pickup and the lane is clear.
// Off in ?demo=1, ?pu=, ?sk= debug, ?f30=0, and in debug starts (?score= / ?level=): the run must begin at score 0 / level 1.
export default String.raw`
/* first 30 seconds */
var F3={t0:1.0,t1:1.75,n:6,bot:8,gap:.6,bonusAt:8,bonus:2,drop:10,dropLate:11.5,dropK:"j",clr:170,until:30,praise:["NICE!","GREAT!"]};
var f3On=false,f3Init=false,f3Prev=[],f3Chain=0,f3Last=-1e9,f3Bonus=false,f3Praise=0,f3DropEnt=null,f3DropDone=false,f3Pu=false;
function f3Off(){return demo||!!tpu||(typeof skDebug!=="undefined"&&!!skDebug)||Q.get("f30")==="0"}
function f3Start(){
  f3On=!f3Off()&&!(typeof LVQ==="number"&&LVQ>1);f3Init=false;f3Prev=[];f3Chain=0;f3Last=-1e9;f3Bonus=false;f3Praise=0;f3DropEnt=null;f3DropDone=false;f3Pu=false;
}
function f3Lbl(s,c){if(rm()){skLbS=s;skLbC=c;skLbT=1.1}else skLabel(s,c)}
/* deterministic ring burst at the buggy (fixed angles, no Math.random) */
function f3Burst(n,c1,c2,sp){
  if(rm())return;
  for(var i=0;i<n;i++){var a=i*6.2832/n;addP({x:PX+pW()/2,y:GY-py-20,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,life:.5,age:0,c:i%2?c1:c2,g:300,z:3})}
}
function f3Tick(dt){
  if(!f3On||state!=="run"||runS>F3.until)return;
  var i,e,k,m=typeof vMul==="function"?vMul():1;
  if(!f3Init){
    f3Init=true;
    if(score>1){f3On=false;return}  /* ?score= debug start */
    if(SKON)for(i=0;i<F3.n;i++){
      var t=F3.t0+(F3.t1-F3.t0)*i/(F3.n-1),d=t-runS;
      if(d>0)ents.push({x:PX+pW()+m*(speed*d+3.5*d*d),w:12,h:12,bot:F3.bot,t:"k",f3:1});
    }
  }
  /* pickups / clears: compare with the k ents seen last tick */
  var cur=[];
  for(i=0;i<ents.length;i++){
    e=ents[i];
    if(e.t==="k"){e.f3x=e.x;cur.push(e)}
    else if(e.t==="b"&&!e.f3p&&e.x+e.w<PX){
      e.f3p=1;
      for(k=0;k<ents.length;k++)if(ents[k].t==="b"&&Math.abs(ents[k].x-e.x)<=102)ents[k].f3p=1;
      if(!e.rsb&&inv<=0&&f3Praise<F3.praise.length){
        f3Lbl(F3.praise[f3Praise],"#4ade80");f3Praise++;
        sfx(mf(79),0,.06,0,.06);sfx(mf(86),0,.09,0,.06,.06);
        f3Burst(8,"#4ade80","#fde047",150);
      }
    }
  }
  for(i=0;i<f3Prev.length;i++){
    e=f3Prev[i];
    if(cur.indexOf(e)>=0||!(e.f3x>PX-30))continue;  /* scrolled off (removed at x+w<-10) is not a pickup */
    f3Chain=runS-f3Last<=F3.gap?f3Chain+1:1;f3Last=runS;
    if(f3Chain>=2)f3Lbl("x"+f3Chain+" COMBO","#fde047");
    if(SKON&&!f3Bonus&&f3Chain>=F3.bonusAt){
      f3Bonus=true;skEarn(F3.bonus);f3Lbl("SPARK TRAIL +"+F3.bonus,"#fde047");f3Burst(8,"#fde047",OR,170);
    }
  }
  f3Prev=cur;
  if(spT>0||bgT>0||shd&&!shdP)f3Pu=true;
  /* free power-up drop */
  if(f3DropEnt){
    if(ents.indexOf(f3DropEnt)<0){
      if(f3DropEnt.f3x>PX-30&&spT>0)f3Lbl("FREE SPRING BOOTS!","#fde047");
      f3DropEnt=null;
    }else f3DropEnt.f3x=f3DropEnt.x;
  }else if(!f3DropDone&&runS<=F3.dropLate&&!f3Pu){
    if(runS>=F3.drop-(W+20-(PX+pW()))/(speed*m)){
      var ok=!(typeof pk!=="undefined"&&pk)&&nextGap-spawnDist>=F3.clr;
      for(i=0;ok&&i<ents.length;i++){
        e=ents[i];
        if(e.t==="u"){ok=false;break}
        if(e.t!=="k"&&e.x<W+20+F3.clr&&e.x+e.w>W+20-F3.clr)ok=false;
      }
      if(ok){
        f3DropEnt={x:W+20,w:21,h:21,bot:10,t:"u",k:F3.dropK,f3:1,f3x:W+20};
        ents.push(f3DropEnt);f3DropDone=true;
      }
    }
  }
}
`;
