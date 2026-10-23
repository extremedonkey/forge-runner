// GAPS: holes in the track you must jump (DKC Mine Cart Carnage, research/dkc-mine-cart-madness.md item 2, §4, §5, D1-D3).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Builds on HILLS (06i): the world x is hsc (felt distance); a gap is a no-ground span {x0,x1} in world x that hlGround()
// reports as null (hlW: the straight line lip -> far edge, for render / collisions); hlPhys lands only on ground (hlSupOK, either
// wheel), with a 100 ms coyote off a lip (hlCanJump) and a 6 px ledge assist; deeper than 6 px under the lip = in the hole.
//  - WIDTH = p x Dfull, Dfull = GAP_DFULL_S (.689 s, a full held jump) x the felt speed AT THE LIP (speed*vMul() incl. the slope
//    factor; a look-ahead of hlTick predicts it), p from Levels' GAP_LV[level-1] {wMin,wMax,...} (06d, #78; DEF below if absent),
//    ramped through the level, capped at GAP_CAP (.65). Every gap is checked before it is placed: a full-hold jump, swept over
//    the take-off point with the real hlTick/hlPhys at 1/240 s, must clear it over a window >= GP.win s (phone margin), else it
//    is narrowed (x .85, up to 4 times) or dropped.
//  - PLACEMENT: a gap REPLACES one spawn() slot (13 makes the obstacle as usual, so the Math.random stream is unchanged, then
//    gpSpawn removes it). No new Math.random: the gap rolls use a run LCG seeded from start()'s own puNext draw. Rules: none before
//    noGapBefore (L1: 12 s, clear of RESCUE), at most GP.l1Max on L1, none while lvGapsBlocked() (banner / crossfade) nor in the
//    last GP.calm s of a level, >= GAP_MIN_JUMP_SEP (.85 s) of felt travel from the obstacle before and to the one after (plus
//    landing room), >= minClear s between gaps, the lip >= GP.lead s ahead of the buggy (so edgeWarn gets >= .9 s), never a lip in
//    the crest-launch zone, uphill-into-gap only from L4, a far edge at most GP.rise px higher (L1-3) / GP.riseH (L4+).
//  - FALL (D1): the Plate / shield / inv never save it. Passing below the floor line over a gap: sfxGapFall() once; GP.deep px under
//    the lip: a Spare Core (cores>0) revives on the far edge (world skip, 2 s inv, clear zone, no gap for 2 s), else die().
//  - WARN: edgeWarn(key,tti,'gap','R',{y}) every frame while a gap is ahead (Levels' 06j, guarded); draw: neon lips, sparks
//    falling into the hole, a faint full-jump spark arc over wider gaps on L1-L2. Demo: auto() jumps them (gpAuto), no sfx.
// Flag: GAPS_ON (default true); ?gaps=0 turns gaps off (both builds). Never touches speed / scroll / runT / score.
export default String.raw`
var GAPS_ON=true;
try{if(Q&&Q.get&&Q.get("gaps")==="0")GAPS_ON=false}catch(e){}
/* GP: lead = min s from the buggy's front to a new lip; win = min take-off window (s) of a full-hold jump; sep/minClear fallbacks;
   room = landing room px; calm = s at a level's end with no new gap; l1Max; rise/riseH = far edge max px higher (L1-3 / L4+);
   up = lip slope counted as uphill; crest = fraction of the crest-launch acceleration allowed at the lip; deep = px under the lip
   that is a fall; shift = how far (px) a lip may slide forward off a bad spot; warn = s ahead to call edgeWarn; arc = draw the jump arc on L1-L2 when p >= arc */
var GP={lead:1.05,win:.2,room:PW+20,calm:2.5,l1Max:3,l1T:12,rise:40,riseH:56,up:.04,crest:.8,shift:480,deep:24,warn:1.6,arc:.22,revClr:1.2,revNo:2};
var GP_DEF=[
  {wMin:.20,wMax:.25,minClear:2.0,chanceMin:.10,chance:.10,noGapBefore:12},
  {wMin:.25,wMax:.35,minClear:1.6,chanceMin:.15,chance:.15,noGapBefore:0},
  {wMin:.30,wMax:.45,minClear:1.3,chanceMin:.20,chance:.20,noGapBefore:0},
  {wMin:.40,wMax:.55,minClear:1.0,chanceMin:.25,chance:.25,noGapBefore:0},
  {wMin:.45,wMax:.60,minClear:.85,chanceMin:.30,chance:.30,noGapBefore:0}];
var gpRej={},gpOn=false,gpGaps=[],gpSeed=1,gpN=0,gpN1=0,gpLastEnd=-1e9,gpLastGap=-1e9,gpNoUntil=-1e9,gpFallS=0,gpLog=[];
function gpCap(){return typeof GAP_CAP==="number"?GAP_CAP:.65}
function gpSep(){return typeof GAP_MIN_JUMP_SEP==="number"?GAP_MIN_JUMP_SEP:.85}
function gpDf(){return typeof GAP_DFULL_S==="number"?GAP_DFULL_S:.689}
function gpLv(){var n=typeof currentLevel==="function"?currentLevel():1;return Math.max(1,Math.min(5,n|0||1))}
function gpTab(n){var t=typeof getGapLv==="function"?getGapLv():null;return t&&typeof t.wMax==="number"?t:GP_DEF[n-1]}
function gpBlocked(){try{return typeof lvGapsBlocked==="function"?!!lvGapsBlocked():false}catch(e){return false}}
/* level progress 0..1 and seconds to the next level (base-curve score rate), from Levels' LV_AT when present */
function gpProg(n){
  if(typeof LV_AT==="undefined"||!LV_AT[n-1]&&n>1)return [0,1e9];
  var a=LV_AT[n-1]||0,b=n<5?LV_AT[n]:a+(LV_AT[4]-LV_AT[3]),r=Math.max(1,speed*.05);
  return [Math.max(0,Math.min(1,(score-a)/Math.max(1,b-a))),n<5?(b-score)/r:1e9];
}
function gpR(){gpSeed=(Math.imul(gpSeed,1664525)+1013904223)>>>0;return gpSeed/4294967296}
/* hlStart (06i) at start(): reset; the LCG seed comes from start()'s own puNext draw (no extra random draws) */
function gpStart(){
  gpOn=GAPS_ON&&!(typeof tpu!=="undefined"&&tpu);gpGaps=[];gpN=0;gpN1=0;gpLastEnd=-1e9;gpLastGap=-1e9;gpNoUntil=-1e9;gpFallS=0;gpLog=[];gpRej={};
  gpSeed=(Math.floor(((typeof puNext==="number"?puNext:200)%1)*4294967296)^0x5bd1e995)>>>0||1;
}
/* hlGround (06i): the gap at world x, or null */
function gpHole(wx){for(var i=0;i<gpGaps.length;i++){var g=gpGaps[i];if(wx>g.x0&&wx<g.x1)return g}return null}
function gpCurve(wx){return hlOn?hlCurve(wx):0}
/* felt speed at the lip: hlTick's own slope follow, run ahead on a copy until the buggy's front reaches world x lw */
function gpFeltAt(lw){
  var S=[hsc,hlF,hlSm,py],dt=1/120,i,f;
  hlSim=1;hlSv=speed;py=0;
  for(i=0;i<480&&hsc+PX+PW<lw;i++){hlSv=Math.min(MAXV,hlSv+7*dt);hlTick(dt)}
  f=hlSv*vMul();
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];py=S[3];
  return f;
}
/* clearability: full-hold (and shortest-tap) jumps taken off from the lip - d*felt (d in s, -.1 after the lip .. .75 before), with
   the real hlTick/hlPhys/hlCanJump-coyote at 1/240 s; returns [full window s, tap window s] (longest run of safe take-offs) */
function gpWin(g,f){
  var K=["hsc","hlF","hlSm","hlLG","hlLTV","hlCr","hlCL","hlJ","hlTk","hlPk","hlTl","py","vy","duck","hlOff","hlDeep"],S=[hsc,hlF,hlSm,hlLG,hlLTV,hlCr,hlCL,hlJ,hlTk,hlPk,hlTl,py,vy,duck,hlOff,hlDeep];
  var out=[0,0,0],m,d,dt=1/240,run,best,ok,j,jp,v0,mid=0;
  hlSim=1;duck=false;
  for(m=0;m<2;m++){
    run=0;best=0;
    for(d=.75;d>=-.1;d-=.01){
      hsc=g.x0-(PX+PW)-f*1.1;hlSv=speed;hlSm=S[2];hlF=1+hlSm;py=0;vy=0;hlCr=0;hlCL=0;hlJ=0;hlOff=0;hlDeep=0;hlLG=hlB();hlLTV=0;
      jp=false;ok=false;v0=m?CUT:JV;
      for(j=0;j<240*3;j++){
        if(!jp&&hsc+PX+PW>=g.x0-d*hlSv*vMul()&&(py===0||hlCanJump())){jp=true;vy=v0}
        hlTick(dt);hlPhys(dt);
        if(hlDeep||py<-GP.deep)break;
        if(jp&&py===0&&hsc+PX>g.x1){ok=true;break}
        if(!jp&&hsc+PX>g.x1)break;
      }
      if(ok){run+=.01;if(run>best){best=run;if(!m)mid=d+run/2-.005}}else run=0;
    }
    out[m]=Math.round(best*100)/100;
  }
  out[2]=Math.round(mid*1000)/1000;   /* centre of the full-hold window, s before the lip (the autopilot aims here) */
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];hlLG=S[3];hlLTV=S[4];hlCr=S[5];hlCL=S[6];hlJ=S[7];hlTk=S[8];hlPk=S[9];hlTl=S[10];py=S[11];vy=S[12];duck=S[13];hlOff=S[14];hlDeep=S[15];
  return out;
}
/* the lip's own ground: no crest launch near it, uphill only from L4, far edge not too high */
function gpNo(r){gpRej[r]=(gpRej[r]||0)+1;return false}   /* why a rolled gap was not placed (tests / tuning) */
function gpLipOK(n,x0,x1,f){
  var c0=gpCurve(x0),c1=gpCurve(x1),u,k,sl=(c0-gpCurve(x0-30))/30;
  if(c1-c0>(n>=4?GP.riseH:GP.rise))return gpNo("rise");
  if(sl>GP.up&&n<4)return gpNo("uphill");
  for(u=x0-160;u<=x0+10;u+=10){k=(gpCurve(u+10)-2*gpCurve(u)+gpCurve(u-10))/100;if(-k*f*f>GP.crest*G*HL.cr)return gpNo("crest")}
  return true;
}
/* 13 spawn(), last line: maybe turn this spawn's slot (ents from n0, at screen x, width w) into a gap */
function gpSpawn(n0,x,w){
  if(!gpOn||state!=="run"||hlSim)return;
  var n=gpLv(),T=gpTab(n),f=speed*vMul(),i,hz=0,end=hsc+x+w,P=gpProg(n),sep=gpSep();
  for(i=n0;i<ents.length;i++)if(ents[i].t==="u")hz=1;
  var go=!hz&&runS>=Math.max(T.noGapBefore||0,n===1?GP.l1T:0)&&!(n===1&&gpN1>=GP.l1Max)&&!gpBlocked()&&P[1]>GP.calm&&gpR()<T.chanceMin+(T.chance-T.chanceMin)*P[0];
  if(go){
    var lw=Math.max(hsc+x,hsc+PX+PW+GP.lead*f,gpLastEnd+sep*f,gpLastGap+Math.max(sep,T.minClear)*f,gpNoUntil),fl=Math.min(f,gpFeltAt(lw));
    var p=Math.min(gpCap(),T.wMin+(T.wMax-T.wMin)*Math.min(1,P[0]*.7+gpR()*.3)),g=null,k,wn=[0,0];
    for(k=0;k<5&&p>=T.wMin*.6;k++,p*=.85){
      var gw=p*gpDf()*fl,sh=0;
      /* slide the lip forward (40 px steps, up to GP.shift) off a crest / uphill / high far edge; else no gap */
      while(sh<=GP.shift&&!gpLipOK(n,lw+sh,lw+sh+gw,fl))sh+=40;
      if(sh>GP.shift)break;
      if(sh){lw+=sh;fl=Math.min(f,gpFeltAt(lw));gw=p*gpDf()*fl}
      g={x0:lw,x1:lw+gw,h0:gpCurve(lw),h1:gpCurve(lw+gw),p:p,f:fl,lv:n,key:"gap"+(++gpN),t:runS};
      gpGaps.push(g);wn=gpWin(g,fl);
      if(wn[0]>=GP.win)break;
      gpGaps.pop();g=null;gpNo("window");
    }
    if(g){
      g.win=wn[0];g.tap=wn[1];g.mid=wn[2];
      ents.splice(n0,ents.length-n0);
      /* the next spawn: >= max(nextGap, sep s + landing room) past the far edge */
      var tr=Math.max(nextGap,sep*f+GP.room);
      spawnDist=-(g.x1-hsc-x)-(tr-nextGap);
      gpLastGap=g.x1;if(n===1)gpN1++;
      gpLog.push(g);if(gpLog.length>64)gpLog.shift();
      return;
    }
  }
  gpLastEnd=Math.max(gpLastEnd,end);
}
/* 13 update(), right after the physics: warn, fall, revive. true = the run ended (die()) */
function gpTick(dt){
  if(!gpOn)return false;
  var i,g,f=speed*vMul(),fr=hsc+PX+PW;
  while(gpGaps.length&&gpGaps[0].x1<hsc-200)gpGaps.shift();
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    if(g.x0>fr-PW&&!demo){var tti=(g.x0-fr)/Math.max(1,f);if(tti<=GP.warn)typeof edgeWarn==="function"&&edgeWarn(g.key,tti,"gap","R",{y:GY-g.h0})}
  }
  if(py>=0&&!hlDeep){gpFallS=0;return false}
  if(!hlDeep&&hlSupOK())return false;
  if(!gpFallS){gpFallS=1;if(!demo)typeof sfxGapFall==="function"&&sfxGapFall()}
  if(py>-GP.deep)return false;
  if(typeof cores==="number"&&cores>0&&!demo){gpRevive();return false}
  die();return true;
}
/* Spare Core far-edge revive (research §5): reboot beat (skReboot: core -1, 2 s inv, label, sfx), the world skips ahead to 20 px
   past the far edge (felt only: hsc + entity x; never scroll / score), grounded, hazards cleared for max(300, 1.2 s) ahead,
   no spawn for 1.2 s, no gap for 2 s */
function gpRevive(){
  var g=null,i,f=speed*vMul(),d;
  for(i=0;i<gpGaps.length;i++)if(gpGaps[i].x1>hsc+PX&&gpGaps[i].x0<hsc+PX+PW+40){g=gpGaps[i];break}
  d=g?Math.max(0,g.x1+20-(hsc+PX)):0;
  if(typeof skReboot==="function")skReboot(GY-hlB()-pH(false),pH(false));else{cores--;inv=2}
  hsc+=d;for(i=0;i<ents.length;i++)ents[i].x-=d;
  var cl=Math.max(300,GP.revClr*f);
  ents=ents.filter(function(e){return e.t==="u"||e.t==="k"||e.x+e.w<PX||e.x>PX+PW+cl});
  spawnDist=Math.min(spawnDist,nextGap-GP.revClr*f);
  gpNoUntil=hsc+PX+PW+GP.revNo*f;
  gpGaps=gpGaps.filter(function(q){return q.x1<hsc+PX||q.x0>gpNoUntil});
  py=0;vy=0;hlLG=hlB();hlLTV=0;hlDeep=0;hlOff=0;hlJ=0;hlCr=0;gpFallS=0;
}
/* 13 auto(): the demo autopilot takes a full jump centred over the gap */
function gpAuto(){
  if(!gpOn)return false;
  var f=speed*vMul(),fr=hsc+PX+PW,i,g;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.x1<hsc+PX)continue;
    var d=g.x0-fr;if(d<=f*(g.mid!=null?g.mid:gpDf()*.5*(1-g.p))&&d>-PW)return true;break}
  return false;
}
/* 14 render, after hlDraw: the hole, neon lips, sparks falling in, the L1-L2 jump arc */
function gpDraw(){
  if(!gpOn||!gpGaps.length)return;
  var i,g,a,b,ya,yb,k,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,ln=P?P.ln:CY,mo=!rm();
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    ya=GY-g.h0;yb=GY-g.h1;
    ctx.fillStyle="#04050a";ctx.beginPath();ctx.moveTo(a,ya-7);ctx.lineTo(b,yb-7);ctx.lineTo(b,GY+400);ctx.lineTo(a,GY+400);ctx.closePath();ctx.fill();
    var gr=ctx.createLinearGradient(0,Math.min(ya,yb),0,Math.min(ya,yb)+70);gr.addColorStop(0,"rgba(249,115,22,.22)");gr.addColorStop(1,"rgba(249,115,22,0)");
    ctx.fillStyle=gr;ctx.fillRect(a,Math.min(ya,yb)-2,b-a,72);
    /* neon rail lips: bright end caps with a short drop into the hole */
    ctx.fillStyle=ln;ctx.globalAlpha=.35;ctx.fillRect(a-6,ya-5,8,8);ctx.fillRect(b-2,yb-5,8,8);ctx.globalAlpha=1;
    ctx.fillStyle="#ffffff";ctx.fillRect(a-3,ya-2,3,22);ctx.fillRect(b,yb-2,3,22);
    ctx.fillStyle=ln;ctx.fillRect(a-14,ya-1,14,2);ctx.fillRect(b,yb-1,14,2);
    /* sparks falling into the hole (deterministic: tt-driven, no random) */
    if(mo){ctx.fillStyle="#fde047";for(k=0;k<6;k++){var u=(tt*1.7+k*.37)%1,sx=k&1?a+2+u*10:b-2-u*10,sy=(k&1?ya:yb)+u*u*90;ctx.globalAlpha=1-u;ctx.fillRect(Math.round(sx),Math.round(sy),2,2)}ctx.globalAlpha=1}
    /* L1-L2 teaching arc: the full held jump centred over the gap */
    if(g.lv<=2&&g.p>=GP.arc){var hs=gpDf()*speed*vMul()*.5,cx=(a+b)/2;ctx.fillStyle="#fde047";ctx.globalAlpha=.28;
      for(k=-6;k<=6;k++){var q=k/6;ctx.fillRect(Math.round(cx+q*hs)-1,Math.round(ya-107*(1-q*q)-8)-1,3,3)}ctx.globalAlpha=1}
  }
}
`;
