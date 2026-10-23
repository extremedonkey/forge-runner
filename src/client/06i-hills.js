// HILLS (ported from the lab/hills prototype, 8462e26 + 7c19c99): rolling terrain under the buggy, felt-speed slopes, BIG AIR.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// "Score on base speed, big air pays sparks" (Reece):
//  - speed / scroll / score / runS keep their byte-identical lines in 13 (base curve 340 -> 760 px/s, score = speed*dt*.05), so the
//    leaderboard ceiling is untouched. Hills only change hlF, the FELT speed factor (via vMul()): obstacles, sparks, spawn spacing and the
//    terrain itself move at speed*vMul() (downhill faster, uphill slower); score and runS never read it.
//  - terrain = pure function of the run's felt distance hsc + screen x (hlW): fixed curves, no Math.random, no per-run state
//    beyond hsc. Flat for the first HL.t0 = 12 s of base-curve distance, then eases in. Always >= GY-level (hills rise from the
//    flat ground), valley floors are curved (sum of two raised cosines), never a flat clamp.
//  - physics (hlPhys, called from update()): py stays "height above the ground under the buggy" (0 = grounded), vy = world
//    vertical speed. On flat ground it is exactly the old three lines. Grounded on a crest that falls away faster than
//    HL.cr*G the buggy launches (crest float at HL.cr*G while rising slowly, as in the lab); a jump off an uphill gets a small
//    capped boost (7c19c99).
//  - BIG AIR: on landing, h = peak height above the landing ground, counted only when the terrain gave the air (a crest launch,
//    or a jump landing >= 20 px below its take-off ground): a flat-ground jump (peak 40-107 px) never pays. h >= 60/120/180 pays
//    +1/+2/+3 sparks (skEarn), "BIG AIR +N" label (skLabel), sfxAir(h 60..220), msOn("air",h). Never in demo.
//  - render: hlDraw (terrain over the flat ground, after drawWorld / the level layers), hlEP (each entity sits on the ground at
//    its centre, ground ones tilt with it), hlRB/hlTilt (buggy on the ground + tilt), ghost marker on the terrain (14).
// Flag: HILLS_ON (default true); ?hills=0 turns it off for A/B (both builds). Off = byte-for-byte the flat game.
export default String.raw`
var HILLS_ON=true;
try{if(Q&&Q.get&&Q.get("hills")==="0")HILLS_ON=false}catch(e){}
/* tuning (one table): t0 flat seconds (base curve), ease px, amplitude a0 -> a1 px over aD px, wavelengths l1/l2 px with
   weight w2 for the short one (max slope ~0.23), sm = felt-speed per unit slope, smUp/smDn = felt-speed clamps, smK = follow
   rate /s, cr = crest launch threshold and float (x G), tvC = cap (px/s) of the ground speed a jump inherits (a jump adds
   the ground's vertical speed, so over a straight slope it is the flat-ground jump), drop = how far below the take-off ground a
   jump must land to count as terrain air, air = BIG AIR steps (px) */
var HL={coy:.1,ledge:6,vCap:800,sL:400,ahead:800,t0:12,ease:2400,a0:20,a1:60,aD:30000,l1:1200,l2:420,w2:.25,sm:.55,smUp:-.12,smDn:.14,smK:2.2,cr:.45,crC:1.02,cwB:.25,cwA:1.0,tvC:60,yMax:152,drop:20,air:[60,120,180],runCap:10,nl:1.0,pR:3,pUp:.05,pS:40,pMax:480};  /* runCap: BIG AIR sparks per run (economy guard) */
var HL_K1=6.2831853/HL.l1,HL_K2=6.2831853/HL.l2;
var hlSim=0,hlSv=0,hlOn=false,hlAct=false,hlOff=0,hlDeep=0,hlF=1,hsc=0,hlD0=1e9,hlSm=0,hlLG=0,hlLTV=0,hlCr=0,hlCL=0,hlJ=0,hlTk=0,hlPk=0,hlTl=0,hlEO=0,hlAirN=0,hlAirS=0,hlNL=0,hlSY0=0,hlCW=0,hlPS=0;
/* vMul(): THE felt-speed multiplier for world motion (terrain scroll hsc, spawnDist, entity x, and what reads them: the autopilot
   and the arc look-ahead). = hills slope factor hlF x the level's speed (Levels: lvSpeedMul() in 06d, clamped .8..1.25).
   NEVER applied to speed / scroll / score / runS (13's base lines stay byte-identical, so the score ceiling holds). */
/* the one world multiplier: min(slope x level, VMUL_CAP, 800/speed). VMUL_CAP (agreed with Levels): the downhill boost can't stack
   on L4/L5 (Playtest: 1.25 on crests left 0.45 s of portrait look-ahead) */
var VMUL_CAP=1.10;
function vMul(){
  var m=(hlOn?hlF:1)*(typeof lvSpeedMul==="function"?Math.max(.8,Math.min(1.25,lvSpeedMul())):1),v=hlSim?hlSv:speed;
  m=Math.min(m,VMUL_CAP);
  return v>0?Math.min(m,HL.vCap/v):m;   /* PO: felt speed speed*vMul() never above HL.vCap = 800 px/s */
}
/* TERRAIN = a segment list + a sampled ground function (shaped for GAPS / FORK, which slot new segment kinds in later):
   - hlSeg: segments {x0,x1,k} in world x (felt distance), HL.sL px each, generated ahead of the screen (hlFill, to
     hsc+W+HL.ahead) and dropped once behind it, so nothing is ever created at the visible edge. A segment's kind depends only on
     its index (draws no random numbers), so on-demand / look-ahead / out-of-list queries give the same answer (hlSegAt).
   - hlGround(wx): ground height (px above GY) at world x, or null where a segment has no ground (a GAP; none yet: today every
     segment is k "hill"). groundY(sx): the same at screen x as a canvas y (GY-h), or null.
   - hlW(wx) = hlGround with null read as 0, for today's callers (physics, render, anchors). GAPS must handle null there. */
var hlSeg=[];
function hlSegAt(wx){
  var i=Math.floor(wx/HL.sL),j,sg;
  for(j=0;j<hlSeg.length;j++){sg=hlSeg[j];if(sg.i===i)return sg}
  return {i:i,x0:i*HL.sL,x1:(i+1)*HL.sL,k:"hill"};   /* outside the list (look-ahead, teleport): the same segment, not stored */
}
function hlFill(){
  var to=hsc+W+HL.ahead,i0=Math.floor((hsc-HL.sL)/HL.sL),n;
  while(hlSeg.length&&hlSeg[0].x1<hsc-HL.sL)hlSeg.shift();
  n=hlSeg.length?hlSeg[hlSeg.length-1].i+1:i0;
  for(;n*HL.sL<to;n++)hlSeg.push({i:n,x0:n*HL.sL,x1:(n+1)*HL.sL,k:"hill"});
}
/* k "hill": the rolling curve (0 for the first HL.t0 s, then eased in; valleys are curved, never a flat clamp) */
function hlCurve(wx){
  var u=wx-hlD0;if(!(u>0))return 0;
  var q=u<HL.ease?u/HL.ease:1,e=q*q*(3-2*q),A=HL.a0+(HL.a1-HL.a0)*Math.min(1,u/HL.aD);
  return e*A*((1-HL.w2)*.5*(1-Math.cos(wx*HL_K1))+HL.w2*.5*(1-Math.cos(wx*HL_K2+1.1)));
}
function hlGround(wx){
  if(typeof gpHole==="function"&&gpHole(wx))return null;   /* GAPS (06k): a hole has no ground */
  if(!hlOn)return 0;
  var sg=hlSegAt(wx);
  return sg.k==="hill"?hlCurve(wx):null;
}
function groundY(sx){var h=hlGround(hsc+sx);return h===null?null:GY-h}
/* hlW: numeric ground for render / collisions / hlB: across a gap, the straight line lip -> far edge (physics asks hlSupOK) */
function hlW(wx){var h=hlGround(wx);if(h!==null)return h;var g=typeof gpHole==="function"?gpHole(wx):null;if(!g)return 0;return g.h0+(g.h1-g.h0)*(wx-g.x0)/(g.x1-g.x0)}
/* GAPS: the buggy stands on ground when either wheel (10 px in from each end) is over ground */
function hlSupOK(){return typeof gpHole!=="function"||!gpHole(hsc+PX+10)||!gpHole(hsc+PX+PW-10)}
function hlH(sx){return hlW(hsc+sx)}                       /* at screen x */
function hlSl(sx){return (hlH(sx+10)-hlH(sx-10))/20}      /* slope dh/dx (+ = uphill ahead) */
function hlB(){return hlH(PX+PW/2)}                       /* under the buggy's centre */
function hlWX(sx){return hsc+sx}                          /* screen x -> world x (anchors) */
/* ground under an entity: its own centre, or for a spark arc the straight line through the cluster centre (anchor world x ax,
   slope as), which is the line a slope-relative jump flies along, so the arc keeps its exact shape for the jump */
function hlEG(e){return e.ax!=null?hlW(e.ax)+e.as*(hsc+e.x+e.w/2-e.ax):hlH(e.x+e.w/2)}
/* 13 skSpawn, after the 5 arc sparks were pushed (draws no random numbers): anchor them to the line a jump flies along. A jump
   that peaks over the cluster centre (world a) (the reach-test perfect tap) takes off CUT/G s earlier, at xT, and adds the ground's vertical speed
   there (capped at HL.tvC), so relative to the line through hlW(xT) with that slope it is the flat-ground jump and the arc keeps
   its exact shape for it. Dropped when the ground pokes up through the arc (a spark < 6 px above the local ground). */
function hlAnchor(n,sx){
  if(!hlOn)return;
  var a=hlWX(sx),vF=speed*vMul(),xT=a-vF*CUT/G,sT=(hlW(xT+10)-hlW(xT-10))/20,tv=sT*vF,i,e,wx;
  tv=tv>HL.tvC?HL.tvC:tv<-HL.tvC?-HL.tvC:tv;
  for(i=ents.length-n;i<ents.length;i++){
    e=ents[i];if(i<0||!e)continue;wx=hsc+e.x+e.w/2;
    if(hlW(xT)+tv/vF*(wx-xT)+e.bot<hlW(wx)+6){ents.splice(ents.length-n,n);return}
  }
  for(i=ents.length-n;i<ents.length;i++)if(i>=0){ents[i].ax=xT;ents[i].as=tv/vF}
  if(!hlArcOK(n,sx))ents.splice(ents.length-n,n);
}
/* look-ahead for hlAnchor (pure: saves and restores every global it steps, draws no random numbers, pays nothing): play the
   reach test's perfect tap (peak over the bug cluster's centre sx) with the real hlTick/hlPhys at 1/240 s and the real sizes.
   true = that tap clears the just-spawned bugs and collects all n sparks; otherwise the arc is not offered */
function hlArcOK(n,sx){
  var S=[hsc,hlF,hlSm,hlLG,hlLTV,hlCr,hlCL,hlJ,hlTk,hlPk,hlTl,py,vy,duck,hlNL,hlOff,hlDeep,hlCW,hlPS],dt=1/240,k=[],b=[],hz=[],i,j,e,o,got=0,ok=true,jp=false,c=sx,d,gb,ph,pw,pt;
  /* Mobile #80 perf (same 1/240 s steps as the live loop, so the 5/5 test still matches): a spark's anchored line is fixed in world x,
     so its y is computed once (ey); bugs are hit-tested only near the buggy; stop as soon as the answer is known */
  for(i=ents.length-n;i<ents.length;i++)if(i>=0){e=ents[i];k.push({x:e.x,w:e.w,h:e.h,bot:e.bot,ax:e.ax,as:e.as,g:0,ey:GY-hlEG(e)-e.bot-e.h})}
  for(i=0;i<ents.length-n;i++){e=ents[i];if(e.t==="b"&&e.x>=W)b.push({x:e.x,w:e.w,h:e.h,bot:e.bot});if(e.t!=="k"&&e.t!=="u")hz.push({x:e.x,w:e.w})}
  hlSim=1;hlSv=speed;duck=false;
  for(j=0;j<240*4&&ok;j++){
    if(!jp&&py===0&&c-(PX+PW/2)<=hlSv*vMul()*(CUT/G)){jp=true;vy=spT>0?CUT*JMUL:CUT}
    for(hlNL=0,i=0;i<hz.length;i++){o=hz[i];if(o.x+o.w>PX&&o.x-(PX+PW)<hlSv*vMul()*HL.nl)hlNL=1}   /* hlNear on the copies */
    hlSv=Math.min(MAXV,hlSv+7*dt);hlTick(dt);hlPhys(dt);   /* the base speed line of 13, on the copy */
    d=hlSv*vMul()*dt;c-=d;gb=GY-hlB();ph=pH(false);pw=pW();pt=gb-py-ph;
    for(i=0;i<k.length;i++){o=k[i];o.x-=d;if(o.g)continue;if(PX<o.x+o.w&&PX+pw>o.x&&pt<o.ey+o.h&&pt+ph>o.ey){o.g=1;got++}else if(o.x+o.w<=PX)ok=false}
    for(i=0;i<hz.length;i++)hz[i].x-=d;
    var left=0;for(i=0;i<b.length;i++){o=b[i];o.x-=d;if(o.x+o.w>=PX){left=1;if(o.x<PX+pw&&hit(PX,pt,pw,ph,o.x,gb-o.bot-o.h,o.w,o.h))ok=false}}
    if(c<PX-120||got===k.length&&!left)break;
  }
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];hlLG=S[3];hlLTV=S[4];hlCr=S[5];hlCL=S[6];hlJ=S[7];hlTk=S[8];hlPk=S[9];hlTl=S[10];py=S[11];vy=S[12];duck=S[13];hlNL=S[14];hlOff=S[15];hlDeep=S[16];hlCW=S[17];hlPS=S[18];
  return ok&&got===k.length;
}
/* start(): flat until the buggy has run the base curve for HL.t0 s */
function hlStart(){
  hlOn=HILLS_ON;hlAct=hlOn||typeof GAPS_ON!=="undefined"&&GAPS_ON;hlOff=0;hlDeep=0;hlF=1;hsc=0;hlSeg=[];hlSm=0;hlLG=0;hlLTV=0;hlCr=0;hlCL=0;hlJ=0;hlTk=0;hlPk=0;hlTl=0;hlAirN=0;hlAirS=0;hlNL=0;hlCW=0;hlPS=0;
  hlD0=START*HL.t0+3.5*HL.t0*HL.t0+PX+PW+20;
  typeof gpStart==="function"&&gpStart();   /* GAPS (06k) */
}
/* update(), right after the base speed/scroll/score lines: felt-speed factor from the slope under the buggy, terrain scroll */
function hlTick(dt){
  if(!hlAct)return;   /* hills or gaps: the world x (hsc) runs; the slope factor only with hills */
  if(!hlOn){}else if(py===0){var tg=-hlSl(PX+PW/2)*HL.sm;tg=tg<HL.smUp?HL.smUp:tg>HL.smDn?HL.smDn:tg;hlSm+=(tg-hlSm)*Math.min(1,dt*HL.smK)}
  else hlSm*=1-dt*.25;   /* momentum carries through the air */
  /* Levels #82 look-ahead contract (crest >= flat at the same lvSpeedMul - 1 frame): from HL.cwB s before to HL.cwA s after a
     crest under the buggy the downhill boost is held to HL.crC (slope x level <= level x 1.02; 1.028 left desktop at 0.8 with 0 ms margin). It caps hlSm itself, so the
     boost eases back in afterwards at smK (no felt-speed step when the window ends) */
  var cs=hlOn?hlSl(PX+PW/2):0;
  if(hlPS>0&&cs<=0)hlCW=HL.cwA;else if(hlCW>0)hlCW-=dt;
  hlPS=cs;
  if((hlCW>0||cs>0&&hlSl(PX+PW/2+(hlSim?hlSv:speed)*HL.cwB*1.1)<=0)&&hlSm>HL.crC-1)hlSm=HL.crC-1;
  hlF=1+hlSm;
  hsc+=(hlSim?hlSv:speed)*vMul()*dt;   /* hlSim: hlArcOK's look-ahead runs its own copy of the base speed */
  if(!hlSim){hlFill();hlNL=hlNear()}
}
/* Playtest #82: no crest launch with a hazard within HL.nl s (felt) ahead of the buggy's front (it floated into a low flyer): the
   buggy hugs the crest instead (as when ducking). hlArcOK / GAPS look-aheads keep the value of the step they start in */
function hlNear(){
  var f=speed*vMul(),i,e,d;
  for(i=0;i<ents.length;i++){e=ents[i];if(e.t==="k"||e.t==="u")continue;d=e.x-(PX+PW);if(e.x+e.w>PX&&d<f*HL.nl)return 1}
  if(typeof gapNear==="function"&&gapNear(hsc+PX,hsc+PX+PW+f*HL.nl))return 1;   /* GAPS (06k): a gap counts as a hazard */
  return 0;
}
/* Playtest #82: a pillar / ember vent (always solid, 50 px) must be tap-clearable: from every take-off point a tap can use
   (.13-.3 s of felt travel before it), its base may sit at most HL.pR px above the line a jump flies along (take-off ground + its
   slope, capped at HL.tvC as in hlPhys). A pillar where the ground rises into it slides forward (HL.pS steps, up to HL.pMax px,
   the rest of its spawn slot with it); with no such spot it is dropped. Draws no random numbers. 13 spawn(), last line. */
function hlPOK(xc,f){
  var b=Math.max(hlW(xc-13),hlW(xc),hlW(xc+13)),t,xT,s,v;
  if((hlW(xc+10)-hlW(xc-10))/20>HL.pUp)return false;   /* Mobile #80: no pillar on rising ground (tap window 415 -> ~300 ms) */
  for(t=.13;t<=.3;t+=.0425){xT=xc-t*f;s=(hlW(xT+10)-hlW(xT-10))/20;v=s*f;v=v>HL.tvC?HL.tvC:v<-HL.tvC?-HL.tvC:v;
    if(b-(hlW(xT)+v/f*(xc-xT))>HL.pR)return false}
  return true;
}
function hlSpawn(){
  if(!hlOn)return;
  var i,j,e,f=speed*vMul(),sh;
  for(i=0;i<ents.length;i++){e=ents[i];if(e.t!=="p"||e.hc)continue;e.hc=1;
    for(sh=0;sh<=HL.pMax&&!hlPOK(hsc+e.x+e.w/2+sh,f);sh+=HL.pS);
    if(sh>HL.pMax){ents.splice(i,1);i--;continue}
    if(sh){for(j=i;j<ents.length;j++){ents[j].x+=sh;if(ents[j].ax!=null)ents[j].ax+=sh}spawnDist-=sh}
  }
}
/* update(): replaces "vy-=g*dt;py+=vy*dt;if(py<=0){py=0;vy=0}" when hills are on (returns true); identical on flat ground */
function hlPhys(dt){
  if(!hlAct)return false;
  if(hlOff>0)hlOff-=dt;
  var gh=hlB(),tv=(gh-hlLG)/dt,tL=(hlSim?hlSv:speed)*.6+1,Y;
  if(tv>tL)tv=tL;else if(tv<-tL)tv=-tL;  /* real slopes give |tv| <= .27*speed; a jump in hsc (teleport/debug) can't fling the buggy */
  if(py===0){
    if(vy>0){
      /* a jump started this step (13 set vy): it is relative to the ground's own vertical speed (+ uphill, - downhill,
         capped), so over a straight slope it flies exactly the flat-ground jump relative to the slope */
      vy+=hlLTV>HL.tvC?HL.tvC:hlLTV<-HL.tvC?-HL.tvC:hlLTV;
      hlJ=1;hlCr=0;hlCL=0;hlTk=hlLG;hlPk=hlLG;
    }else if(!hlSupOK()){
      /* GAPS: rolled off a lip: fall from the ground's own vertical speed; coyote (HL.coy) for one late jump */
      vy=hlLTV<0?hlLTV:0;hlJ=0;hlCr=0;hlCL=0;hlTk=hlLG;hlPk=hlLG;hlOff=HL.coy;
    }else if(!duck&&!hlNL&&tv<hlLTV-G*HL.cr*dt){  /* ducking (or a hazard within HL.nl s, hlNear) hugs the ground: no launch */
      /* crest at speed: the ground falls away under the wheels faster than the float can follow -> launch */
      vy=hlLTV;hlJ=0;hlCr=1;hlCL=1;hlTk=hlLG;hlPk=hlLG;
    }else{vy=0;hlLG=gh;hlLTV=tv;return true}
  }
  Y=hlLG+py;
  var g=duck&&py>0?G*3:hlCr&&vy<120?G*HL.cr:G;  /* duck in the air = fast fall (as 13) */
  vy-=g*dt;Y+=vy*dt;
  if(Y>HL.yMax){Y=HL.yMax;if(vy>0)vy=0}   /* Mobile #80 (blocker 2): never above main's flat spring apex (robot top >= 65 px at 844x390) */
  if(Y>hlPk)hlPk=Y;
  py=Y-gh;
  /* GAPS: land only on ground (either wheel) and from above: up to HL.ledge px under the edge snaps up (ledge assist); deeper = in
     the hole for good (06k gpTick: fall death or a Spare Core revive) */
  if(py<-HL.ledge&&!hlSupOK())hlDeep=1;
  if(py<=0&&!hlDeep&&hlSupOK()){py=0;vy=0;hlOff=0;hlLand(gh)}
  hlLG=gh;hlLTV=tv;
  return true;
}
/* 13 jump block, while airborne: one jump is allowed while floating off a crest (the crest took the ground away) */
function hlCanJump(){
  if(hlOff>0&&!hlJ&&!hlDeep){hlJ=1;hlOff=0;hlCr=0;return true}   /* GAPS: coyote after rolling off a lip */
  if(!hlOn||!hlCr||hlJ||py<=0)return false;hlJ=1;hlCr=0;return true}
/* landing: BIG AIR = peak height above the landing ground, when the terrain gave the air (a crest launch, or a jump that
   lands >= HL.drop below its take-off ground). A flat-ground jump never pays. Never in demo. */
function hlLand(gh){
  var h=Math.round(hlPk-gh),ok=hlCL||hlTk-gh>=HL.drop,n=!ok?0:h>=HL.air[2]?3:h>=HL.air[1]?2:h>=HL.air[0]?1:0;
  hlJ=0;hlCr=0;hlCL=0;
  if(!n||demo||hlSim)return;   /* hlSim: hlArcOK's look-ahead never pays */
  hlAirN++;
  var pay=Math.max(0,Math.min(n,HL.runCap-hlAirS));hlAirS+=pay;   /* past the per-run cap: the label and sound, no sparks */
  if(pay&&typeof skEarn==="function")skEarn(pay);
  if(typeof skLabel==="function")skLabel(pay?"BIG AIR +"+pay+"\u2726":"BIG AIR!","#fde047");
  typeof sfxAir==="function"&&sfxAir(Math.max(60,Math.min(220,h)));
  typeof msOn==="function"&&msOn("air",h);
  if(!rm())sparks(PX+PW/2,GY-gh-4,10,160);
}
/* render: the buggy stands on the ground under it; grounded it tilts with the slope (eased), in the air the old air tilt */
function hlRB(){if(hlOn)rbGY-=hlH(rbGX)}
function hlTilt(a,air,mo){
  if(!hlOn)return a;
  var tg=air?0:Math.atan(hlSl(rbGX))*-1;
  hlTl=mo?hlTl+(tg-hlTl)*Math.min(1,rbDT*18):tg;
  return a+hlTl;
}
/* render, per entity in drawEnts: move it onto the ground at its x; ground ones (bot 0) tilt about their foot. Returns true
   when ctx was saved (drawEnts restores in its loop step) */
function hlEP(e){
  hlEO=0;if(!hlOn)return false;
  var g=hlEG(e);if(!g&&!hlSl(e.x+e.w/2))return false;
  /* Mobile #80 review (blocker 1): spr() resets the transform, so a ctx.translate/rotate was lost and sprites stood on flat GY.
     Lift the frame offset SY instead (base() and spr() both honour it); 14's loop step puts SY back (hlSY0). No tilt. */
  hlEO=g;hlSY0=SY;SY-=g;base();
  return true;
}
/* render, after drawWorld() (and the level layers): the terrain mass over the flat ground, glowing edge, ticks riding it */
function hlDraw(){
  if(!hlOn||hsc+XO+VW+40<hlD0)return;
  var x0=XO-24,x1=XO+VW+24,x,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,ln=P?P.ln:CY;
  ctx.beginPath();ctx.moveTo(x0,GY+3);
  for(x=x0;x<=x1;x+=8)ctx.lineTo(x,GY-hlH(x));   /* Mobile #80 perf: 8 u steps (>= 52 samples per 420 u wave) */
  ctx.lineTo(x1,GY-hlH(x1));ctx.lineTo(x1,GY+3);ctx.closePath();ctx.fillStyle=C_G;ctx.fill();
  if(P){ctx.fillStyle=P.gd;ctx.fill()}
  ctx.globalAlpha=.16;ctx.fillStyle=ln;ctx.fill();ctx.globalAlpha=1;   /* Mobile #80: lift the mass off the skyline (was 1.2-1.8:1) */
  ctx.lineJoin="round";
  ctx.strokeStyle=P?P.gl:"rgba(34,211,238,.18)";ctx.lineWidth=7;
  ctx.beginPath();for(x=x0;x<=x1;x+=8)x===x0?ctx.moveTo(x,GY-hlH(x)+1):ctx.lineTo(x,GY-hlH(x)+1);ctx.lineTo(x1,GY-hlH(x1)+1);ctx.stroke();
  ctx.strokeStyle=ln;ctx.lineWidth=ZM>1?3:2;ctx.stroke();   /* Mobile #80: 3 u in portrait */
  ctx.fillStyle="rgba(34,211,238,.5)";
  var go=hsc%48;
  for(x=-go+Math.floor(x0/48)*48;x<x1;x+=48){var h=hlH(x+6);if(h>1)ctx.fillRect(Math.round(x),Math.round(GY-h+5),12,2)}
}
`;
