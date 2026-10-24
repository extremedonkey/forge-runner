// GAPS: holes in the track you must jump (DKC Mine Cart Carnage, research/dkc-mine-cart-madness.md item 2, §4, §5, D1-D3).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Builds on HILLS (06i): the world x is hsc (felt distance); a gap is a no-ground span {x0,x1} in world x that hlGround()
// reports as null (hlW: the straight line lip -> far edge, for render / collisions); hlPhys lands only on ground (hlSupOK, either
// wheel), with a 100 ms coyote off a lip (hlCanJump) and a 6 px ledge assist; deeper than 6 px under the lip = in the hole.
//  - WIDTH = p x Dfull, Dfull = GAP_DFULL_S (.689 s, a full held jump) x the felt speed AT THE LIP (speed*vMul() incl. the slope
//    factor; a look-ahead of hlTick predicts it), p from Levels' GAP_LV[level-1] {wMin,wMax,...} (06d, #78; DEF below if absent),
//    ramped through the level, capped at GAP_CAP x GAP_JUMP_MUL (1 = the default full jump; power-ups may raise gapJumpMul later). Every gap is checked before it is placed: a full-hold jump, swept over
//    the take-off point with the real hlTick/hlPhys at 1/240 s, must clear it over a window >= GP.win s (phone margin), else it
//    is narrowed (x .85, up to 4 times) or dropped.
//  - PLACEMENT: a gap REPLACES one spawn() slot (13 makes the obstacle as usual, so the Math.random stream is unchanged, then
//    gpSpawn removes it). No new Math.random: the gap rolls use a run LCG seeded from start()'s own puNext draw. Rules: none before
//    noGapBefore (L1: 12 s, clear of RESCUE), at most GP.l1Max on L1, none while lvGapsBlocked() (banner / crossfade) nor in the
//    last GP.calm s of a level, >= GAP_MIN_JUMP_SEP (.85 s) of felt travel from the obstacle before and to the one after (plus
//    landing room), >= minClear s between gaps, the lip >= GP.lead s ahead of the buggy (so edgeWarn gets >= .9 s), never a lip in
//    the crest-launch zone, uphill-into-gap only from L4, a far edge no higher than the near edge (GP.rise / GP.riseH = 0).
//  - SINGLE TAP: no width cap. Narrow gaps (p <= GP.tapF (.45) of a pure tap jump, as a fraction of Dfull) must also have a tap take-off
//    window >= GP.tapWin (.10 s); wider ones need a full hold.
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
var GP={lead:1.05,win:.2,room:PW+20,calm:2.5,l1Max:3,l1T:12,rise:0,riseH:0,up:.04,crest:.8,shift:480,deep:24,warn:1.6,arc:.22,revClr:1.2,nm:12,revNo:2,tapF:.45,tapWin:.1};
var GP_DEF=[
  {wMin:.20,wMax:.30,minClear:2.0,chanceMin:0,chance:.12,noGapBefore:12},
  {wMin:.35,wMax:.55,minClear:1.4,chanceMin:.22,chance:.32,noGapBefore:0},
  {wMin:.45,wMax:.70,minClear:1.15,chanceMin:.28,chance:.40,noGapBefore:0},
  {wMin:.55,wMax:.85,minClear:.95,chanceMin:.35,chance:.48,noGapBefore:0},
  {wMin:.65,wMax:1.0,minClear:.85,chanceMin:.42,chance:.55,noGapBefore:0}];
var gpRej={},gpOn=false,gpGaps=[],gpSeed=1,gpN=0,gpN1=0,gpLastEnd=-1e9,gpLastGap=-1e9,gpNoUntil=-1e9,gpFallS=0,gpLog=[],gpPy=0;
/* width cap as fraction of Dfull: GAP_CAP × jump multiplier (default 1). Power-ups can raise gapJumpMul() later; no tapF clamp. */
function gpCap(){var c=typeof GAP_CAP==="number"?GAP_CAP:1,m=typeof gapJumpMul==="function"?gapJumpMul():(typeof GAP_JUMP_MUL==="number"?GAP_JUMP_MUL:1);return c*m}
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
  gpOn=GAPS_ON&&!(typeof tpu!=="undefined"&&tpu);gpGaps=[];gpN=0;gpN1=0;gpLastEnd=-1e9;gpLastGap=-1e9;gpNoUntil=-1e9;gpFallS=0;gpLog=[];gpRej={};gpPy=0;
  gpSeed=(Math.floor(((typeof puNext==="number"?puNext:200)%1)*4294967296)^0x5bd1e995)>>>0||1;
}
/* hlGround (06i): the gap at world x, or null */
function gpHole(wx){for(var i=0;i<gpGaps.length;i++){var g=gpGaps[i];if(wx>g.x0&&wx<g.x1)return g}return null}
/* public (Levels' ore cart #85 etc., typeof-guarded): the first gap overlapping world x [x0,x1] as {x0,x1} (world px = hsc space), or null */
function gapNear(x0,x1){if(!gpOn)return null;var a=Math.min(x0,x1),b=Math.max(x0,x1);for(var i=0;i<gpGaps.length;i++){var g=gpGaps[i];if(g.x1>a&&g.x0<b)return {x0:g.x0,x1:g.x1}}return null}
function gpCurve(wx){return hlOn?hlCurve(wx):0}
/* felt speed at the lip: hlTick's own slope follow, run ahead on a copy until the buggy's front reaches world x lw */
function gpFeltAt(lw){
  var S=[hsc,hlF,hlSm,py,hlCW,hlPS],FS=typeof fkSv==="function"?fkSv():null,dt=1/120,i,f;
  hlSim=1;hlSv=speed;py=0;
  for(i=0;i<480&&hsc+PX+PW<lw;i++){hlSv=Math.min(MAXV,hlSv+7*dt);hlTick(dt)}
  f=hlSv*vMul();
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];py=S[3];hlCW=S[4];hlPS=S[5];FS&&fkLd(FS);
  return f;
}
/* clearability: full-hold (and shortest-tap) jumps taken off from the lip - d*felt (d in s, -.1 after the lip .. .75 before), with
   the real hlTick/hlPhys/hlCanJump-coyote at 1/240 s; returns [full window s, tap window s] (longest run of safe take-offs) */
function gpWin(g,f){
  var K=["hsc","hlF","hlSm","hlLG","hlLTV","hlCr","hlCL","hlJ","hlTk","hlPk","hlTl","py","vy","duck","hlOff","hlDeep","hlCW","hlPS"],S=[hsc,hlF,hlSm,hlLG,hlLTV,hlCr,hlCL,hlJ,hlTk,hlPk,hlTl,py,vy,duck,hlOff,hlDeep,hlCW,hlPS];
  var FS=typeof fkSv==="function"?fkSv():null,out=[0,0,0],m,d,dt=1/240,run,best,ok,j,jp,v0,mid=0,nl=typeof hlNL==="number"?hlNL:0,xs=g.x0-(PX+PW)-f*1.1,P=null;
  var gate=function(){if(typeof hlNL==="number")hlNL=g.x0-(hsc+PX+PW)<hlSv*vMul()*HL.nl?1:0};   /* 06i hlNear: the gap is a hazard */
  hlSim=1;duck=false;hlSv=speed;
  /* the approach from the real state (felt-speed follow, landing an air phase) to the sweep start, no input; an earlier gap or
     a long air phase on the way: the old synthetic start (grounded at xs, the current felt factor) */
  for(j=0;j<240*4&&(hsc<xs||py>0);j++){gate();hlTick(dt);hlPhys(dt);if(hlDeep||py<0)break}
  if(!hlDeep&&py===0&&hsc>=xs&&hsc<xs+f*.3)P=[hsc,hlF,hlSm,hlLG,hlLTV,hlCW,hlPS];
  for(m=0;m<2;m++){
    run=0;best=0;
    for(d=.75;d>=-.1;d-=.01){
      if(P){hsc=P[0];hlF=P[1];hlSm=P[2];hlLG=P[3];hlLTV=P[4];hlCW=P[5];hlPS=P[6]}else{hsc=xs;hlSm=S[2];hlF=1+hlSm;hlLG=hlB();hlLTV=0;hlCW=S[16];hlPS=S[17]}
      hlSv=speed;py=0;vy=0;hlCr=0;hlCL=0;hlJ=0;hlOff=0;hlDeep=0;FS&&fkLd([0,null,null]);
      jp=false;ok=false;v0=m?CUT:JV;
      for(j=0;j<240*3;j++){
        if(!jp&&hsc+PX+PW>=g.x0-d*hlSv*vMul()&&(py===0||hlCanJump())){jp=true;vy=v0}
        gate();hlTick(dt);hlPhys(dt);
        if(hlDeep||py<-GP.deep)break;
        if(jp&&py===0&&hsc+PX>g.x1){ok=true;break}
        if(!jp&&hsc+PX>g.x1)break;
      }
      if(ok){run+=.01;if(run>best){best=run;if(!m)mid=d+run/2-.005}}else run=0;
    }
    out[m]=Math.round(best*100)/100;
  }
  out[2]=Math.round(mid*1000)/1000;   /* centre of the full-hold window, s before the lip (the autopilot aims here) */
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];hlLG=S[3];hlLTV=S[4];hlCr=S[5];hlCL=S[6];hlJ=S[7];hlTk=S[8];hlPk=S[9];hlTl=S[10];py=S[11];vy=S[12];duck=S[13];hlOff=S[14];hlDeep=S[15];hlCW=S[16];hlPS=S[17];if(typeof hlNL==="number")hlNL=nl;FS&&fkLd(FS);
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
    for(k=0;k<5&&p>=Math.min(T.wMin,gpCap())*.6;k++,p*=.85){
      var gw=p*gpDf()*fl,sh=0;
      /* slide the lip forward (40 px steps, up to GP.shift) off a crest / uphill / high far edge; else no gap */
      while(sh<=GP.shift&&!gpLipOK(n,lw+sh,lw+sh+gw,fl))sh+=40;
      if(sh>GP.shift)break;
      if(typeof fkZone==="function"&&fkZone(lw+sh-gpDf()*fl,lw+sh+gw+gpDf()*fl)){gpNo("fork");break}   /* FORK (06l) rule 8 */
      if(sh){lw+=sh;fl=Math.min(f,gpFeltAt(lw));gw=p*gpDf()*fl}
      g={x0:lw,x1:lw+gw,h0:gpCurve(lw),h1:gpCurve(lw+gw),p:p,f:fl,lv:n,key:"gap"+(++gpN),t:runS};
      gpGaps.push(g);wn=gpWin(g,fl);
      var tapBand=GP.tapF*2*CUT/G/gpDf();
      if(wn[0]>=GP.win&&(p>tapBand||wn[1]>=GP.tapWin))break;
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
  gpNear();gpPy=py;   /* near misses (also for enemies with ?gaps=0) */
  if(!gpOn)return false;
  var i,g,f=speed*vMul(),fr=hsc+PX+PW;
  while(gpGaps.length&&gpGaps[0].x1<hsc-200&&(gpGaps[0].nm||py===0))gpGaps.shift();   /* a long tap-width jump is still airborne 200 px past: keep it for the landing near-miss */
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    if(g.x0>fr-PW&&!demo){var tti=(g.x0-fr)/Math.max(1,f);if(tti<=GP.warn)typeof edgeWarn==="function"&&edgeWarn(g.key,tti,"gap","R",{y:GY-g.h0})}
  }
  if(py>=0&&!hlDeep){gpFallS=0;return false}
  if(!hlDeep&&hlSupOK())return false;
  if(!gpFallS&&(hlDeep||py<-HL.ledge)){gpFallS=1;if(!demo)typeof sfxGapFall==="function"&&sfxGapFall()}   /* committed (past the ledge assist): no sound for a caught edge */
  if(py>-GP.deep)return false;
  if(typeof cores==="number"&&cores>0&&!demo){gpRevive();return false}
  die();return true;
}
/* near miss (Audio #86 sfxNearMiss, once per gap / enemy, never in demo): a gap whose take-off (front wheel to the lip) or landing
   (front wheel past the far edge) margin is <= GP.nm px; an enemy cleared (passed without a hit) with <= GP.nm px of vertical
   room between the drawn boxes while they overlapped in x */
function gpNM(){if(!demo&&state==="run")typeof sfxNearMiss==="function"&&sfxNearMiss()}
function gpNear(){
  var i,g,e,fw=hsc+PX+PW-10;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.nm)continue;
    if(gpPy<=0&&py>0&&fw<g.x1&&fw>g.x0-200)g.to=g.x0-fw;                 /* take-off: front wheel to the lip (< 0 = coyote) */
    else if(gpPy>0&&py===0&&g.to!=null&&!hlDeep){g.ld=fw-g.x1;if(g.to<=GP.nm||g.ld<=GP.nm){g.nm=1;gpNM()}else g.nm=2}  /* landed */
  }
  var pw=pW(),ph=pH(duck&&py===0),gb=GY-hlH(PX+PW/2),pt=gb-py-ph;
  for(i=0;i<ents.length;i++){e=ents[i];if(e.t==="k"||e.t==="u"||e.nm)continue;
    if(e.x+e.w<PX){e.nm=1;if(e.nmD!=null&&e.nmD<=GP.nm&&!e.nmH)gpNM();continue}
    if(PX<e.x+e.w&&PX+pw>e.x){var ey=(e.ax!=null?GY-hlEG(e):gb)-e.bot-e.h,d=pt+ph<=ey+e.h/2?ey-(pt+ph):pt-(ey+e.h);
      e.nmD=e.nmD==null?d:Math.min(e.nmD,d);if(hit(PX,pt,pw,ph,e.x,ey,e.w,e.h)||inv>0)e.nmH=1}
  }
}
/* Spare Core far-edge revive (research §5): reboot beat (skReboot: core -1, 2 s inv, label, sfx), the world skips ahead to 20 px
   past the far edge (felt only: hsc + entity x; never scroll / score), grounded, hazards cleared for max(300, 1.2 s) ahead,
   no spawn for 1.2 s, no gap for 2 s */
function gpRevive(){
  var g=null,i,f=speed*vMul(),d;
  for(i=0;i<gpGaps.length;i++)if(gpGaps[i].x1>hsc+PX&&gpGaps[i].x0<hsc+PX+PW+40){g=gpGaps[i];break}
  d=g?Math.max(0,g.x1+20-(hsc+PX)):0;
  if(typeof skReboot==="function")skReboot(GY-hlB()-pH(false),pH(false));  /* core -1, 2 s inv, "SAVED (Core)", sfxReboot() once */
  else{cores--;inv=2;typeof sfxReboot==="function"&&sfxReboot()}
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
    if(g.lv<=2&&g.p>=GP.arc){var hs=gpDf()*speed*vMul()*.5,cx=(a+b)/2,yl=Math.min(ya,yb)-10;ctx.save();ctx.strokeStyle="#fde047";ctx.globalAlpha=.55;ctx.lineWidth=2;
      if(ctx.setLineDash)ctx.setLineDash([5,7]);ctx.beginPath();for(k=-12;k<=12;k++){var q=k/12;ctx.lineTo(cx+q*hs,yl-107*(1-q*q))}ctx.stroke();ctx.restore()}
  }
}
`;
