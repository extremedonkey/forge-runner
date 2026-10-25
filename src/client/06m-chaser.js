// CHASER (owner: Levels): a glowing molten SLAG ROLLER that comes from BEHIND (the left edge), overtakes the buggy along the
// ground and exits right; the buggy jumps as it passes underneath. Distinct from the base forward roller (t:"r", vx 110, comes
// at you from the right): this one rolls the same way you drive, faster than you (SR_V u/s on top of the felt world speed).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// LIVE through four guarded hook lines (Dev OK'd 2026-10-24; each runs exactly once, tested in scripts/test-chaser.mjs):
//   13-simulation.js update(), right after the ORE CART line (so carts are placed first and rollers avoid them):
//       typeof srTick==="function"&&srTick(dt,pw,ph,pt);  /* CHASER (06m): place/move/hit slag rollers from behind */
//   13-simulation.js auto(), right after the ORE CART line:
//       if(typeof srWant==="function"&&srWant())wantJump=true;  /* CHASER (06m): demo jumps rollers */
//   14-render.js drawEnts(), after the ORE CART line and before edgeWarnDraw (srDraw registers the left-edge glow):
//       typeof srDraw==="function"&&srDraw();  /* CHASER (06m): rollers, embers, hint, sounds */
//   13-simulation.js spawn(), last statement, right after the crGap line (pacing: books a roller window, see PACING):
//       typeof srGap==="function"&&srGap();  /* CHASER (06m): stretch one base gap for a booked roller */
// MOTION: ground speed = felt world speed (speed*vMul()) + SR_V, so on screen it always moves right at SR_V u/s: the pass
// under the buggy takes the same time at 760 and at 874 felt, only the base obstacles around it get closer.
// LEVELS (CHASER_LV): none on L1-L2; L3 >= 4 s apart (p .5), L4 >= 2.4 s (p .8), L5 >= 1.8 s (p .95); none on L6 (ARC FURNACE,
// explicitly: no row, no pacing); a held jump is fine.
// PLACEMENT (fair by construction, mirrors 06i): each time a new base obstacle appears its gap is known; a roller is placed so
// it overtakes inside that gap with >= SR_CLR (0.8 s; SR_CLRB 0.95 s while spring boots are on or a boots pickup is on screen; +SR_FM 0.02 s frame margin) of
// clear track after the previous obstacle / cart (a HELD jump 0.69 s, a boots jump 0.83 s has landed >= 0.2 s before you must
// jump the roller: Playtest's #85 lesson) and SR_CLA (0.65 s; SR_CLAB 0.8 s with boots: room to land a held jump and still tap the next obstacle) before the next
// after, never sooner than SR_MINT (1.3 s) from now, clear of ore carts by the same margins, never while the Crusher is up or pending (crOn()/crS, L5), and never with its
// impact point in a gap's takeoff window (SR_GTO) or within SR_GLAND (0.85 s) after a landing (gapNear; undefined = no gaps).
// WARNING: left-edge glow via edgeWarn(key,tti,"roller","left",{sfx:["roller","warn"]}) from TTI <= SR_WARN (1.3 s) until the
// sprite is on screen; enemySfx("roller","rumble") once at TTI <= SR_RUM (1.2 s); enemySfx("roller","pass") once when its
// centre crosses the buggy's centre. Nothing in demo or before a run. First roller ever: "HOLD JUMP" hint just ahead of the buggy
// (once; localStorage forge-runner-chaser-hint, guarded).
// HIT: hit(PX,pt,pw,ph,x,srGY(x+SR_W/2)-SR_H-hop,SR_W,SR_H). srGY is Dev's hlH at the roller's centre (flat GY when hills are off).
// Opaque sprite == srSolid (0 px overhang); inv -> shield -> Spare Core -> die
// (same order as 06i ocHit); ducking is always hit. Own list srC (not ents) + own seeded RNG: base Math.random untouched.
// Sim-path rules: NO Math.random, never writes score/speed/scroll/runT/spawnDist/nt/ents; nextGap only in srGap() (+= px, the booked
// gap's stretch, like 06h's crGap). SFX only from the draw path.
export default String.raw`
var SR_V=440,SR_W=30,SR_H=22,SR_CLR=.8,SR_CLRB=.95,SR_MINT=1.3,SR_WARN=1.3,SR_RUM=1.2,SR_N=4,SR_SEED=0x51a6b;
var SR_GTO=.6,SR_GLAND=.85,SR_CLA=.65,SR_CLAB=.8,SR_STOMP=.2,SR_SPM=.06,SR_FM=.02,SR_HINT=2.4,SR_HK="forge-runner-chaser-hint";
/* PACING (srGap, Dev-approved hook at the end of 13's spawn()): one booked roller every SR_BK[level] s of run time on L3-L5
   (0 = none: L1-L2 and L6; counted from the last roller of any kind). Booking = stretch the gap the spawn just decided to the minimum a fair roller
   needs (clear before + pass + clear after + SR_BKM), and place the roller in it. Never before SR_BK0 s, in RESCUE, while
   lvGapsBlocked(), with the Crusher armed/fighting, or over a terrain gap / fork (gapNear / platNear). Ore carts: srCartFree
   predicts 06i's decision for this gap (its spacing + a PEEK of its next roll, no draw); a gap a cart will take is skipped
   (never stretched for a cart). A booking that still does not fit is retried at the next spawn (srBkRetry).
   No Math.random, no draw from any stream; demo never books. */
var SR_BK=[0,0,0,32,28,25,0,0,0],SR_BK0=12,SR_BKM=.05;
/* per level: sp = min seconds between overtakes, p = chance per eligible gap (separate seeded stream) */
var CHASER_LV=[null,null,null,{sp:4,p:.5},{sp:2.4,p:.8},{sp:1.8,p:.95},null,null,null];  /* none on L6 / L7 / L8 */
var srC=[];for(var srI=0;srI<SR_N;srI++)srC.push({a:0,x:0,gx:0,d:0,ar:0,s1:0,s2:0,s3:0,tc:0,hit:0,ph:0});
var srLR=-1,srLast=-1e9,srBk=null,srBkT=-1e9,srBkN=0,srBkS=0,srSD=0,srSDR=0,srSeen=null,srRS=SR_SEED,srCnt=0,srHT=0,srHS=0;
function srR(){srRS=(srRS+0x6d2b79f5)>>>0;var t=srRS;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
function srLvl(){return typeof currentLevel==="function"?currentLevel():1}
function srRow(){var l=srLvl();return CHASER_LV[Math.max(0,Math.min(CHASER_LV.length-1,l))]}
function srV(){var m=typeof vMul==="function"?vMul():1;return speed*m}
/* time to the overtake: the roller's front reaches the buggy's back edge (PX) */
function srTTI(r){return (PX-(r.x+SR_W))/SR_V}
function srVis(r){return r.x+SR_W>XO+12}
/* new run (start() sets runS=0) whatever hook runs first; a Poki Continue keeps runS (same run) */
function srSync(){if(srLR<0||runS<srLR)srReset();srLR=runS}
function srReset(){for(var i=0;i<SR_N;i++){srC[i].a=0;srC[i].hit=0;srC[i].ar=0}for(i=0;i<SR_NP;i++)srPL[i]=0;srLT=-1;srLast=-1e9;srSD=spawnDist;srSDR=0;srSeen=null;srRS=SR_SEED;srCnt=0;srHT=0;srBk=null;srBkT=-1e9;srBkN=0;srBkS=0}
function srObs(e){return e.t!=="k"&&e.t!=="u"}
/* Crusher (06h) up, or pending on L5 (it starts ~2 s after L5) or still pending after a boss armed on L5 (crL5 >= 0): no new
   rollers; unannounced ones are dropped. A ?level=6 start never arms it (crL5 -1) */
function srBoss(){
  try{if(typeof crOn==="function"&&crOn())return true;
    if(typeof crS==="number"&&crS===0&&typeof crReady==="function"&&(srLvl()===5||typeof crL5==="number"&&crL5>=0)&&(!demo||(typeof CR_DEMO!=="undefined"&&CR_DEMO)))return true}catch(e){return true}
  return false;
}
/* impact point P blocked by terrain? GAPS gapNear (a takeoff window SR_GTO before the lip / over it, SR_GLAND after a
   landing) or FORK platNear ({x0,x1,tier}: a deck or its taper, or within SR_GLAND after the merge); both typeof-guarded,
   undefined / null = none (?fork=0 returns null), a throw = blocked */
function srGapBlk(P){
  var V=srV();return srTerrain(P-V*SR_GLAND,P+V*SR_GTO);
}
/* boots on, or a boots pickup still ahead (it could be taken before the roller arrives): longer landing margin */
function srBoots(){if(spT>0)return true;for(var i=0;i<ents.length;i++)if(ents[i].t==="u"&&ents[i].k==="j")return true;return false}
function srClr(){return srBoots()?SR_CLRB:SR_CLR}
function srCla(){return srBoots()?SR_CLAB:SR_CLA}
/* clear of every live ore cart (06i): srClr() s after a cart, SR_CLA s before one (room to land a held jump) */
function srCartOK(tc,pass){
  if(typeof ocC==="undefined"||typeof ocTTI!=="function")return true;
  for(var i=0;i<ocC.length;i++){var c=ocC[i];if(!c.a)continue;
    var a=ocTTI(c),b=(c.x+OC_W-PX)/ocVc();
    if(!(tc>=b+srClr()+SR_FM||tc+pass+srCla()<=a))return false}
  return true;
}
function srOK(tc,pass){return !srGapBlk(PX+pW()+srV()*tc)&&srCartOK(tc,pass)}
/* a slag blob (06g) or a crate 06g's enTagAll will skin into one right after this spawn() (same rule as enTag, read-only) */
function srBlob(e){
  if(e.sk==="l")return true;if(e.tg||e.t!=="b")return false;
  try{return typeof enOn==="function"&&!!enOn("l")&&(e.v===1||(typeof enLvl==="function"&&enLvl()===2))}catch(x){return true}
}
/* the latest exit of any obstacle / cart (s from now) and the next base spawn's arrival at the buggy's front (s from now) */
function srTA(){
  var V=srV(),i,e,tA=0;
  for(i=0;i<ents.length;i++){e=ents[i];if(!srObs(e))continue;var o=(e.x+e.w-PX)/(V+(e.vx||0))+(srBlob(e)?SR_STOMP:0);if(o>tA)tA=o}
  /* live ore carts: their exit too (srCartOK needs srClr() after it) */
  if(typeof ocC!=="undefined"&&typeof ocVc==="function")for(i=0;i<ocC.length;i++)if(ocC[i].a){var b=(ocC[i].x+OC_W-PX)/ocVc();if(b>tA)tA=b}
  return tA;
}
function srSR(){return srSDR>0?srSDR:speed}
function srTB(){return Math.max(0,(nextGap-spawnDist)/srSR())+(W+20-(PX+pW()))/(srV()+(nt==="r"?110:0))}
/* L6 (ARC FURNACE) has no rollers (no CHASER_LV row): one placed late in L5 must be past the buggy before L6 begins. srEnd() = s of
   run time until the next level when that level has no row, else 1e9 (base curve: score rises speed*.05 per s). Read-only */
function srEnd(){var l=srLvl();return typeof LV_AT!=="undefined"&&l>=3&&l<LV_AT.length&&!CHASER_LV[Math.min(CHASER_LV.length-1,l+1)]?(LV_AT[l]-score)/Math.max(1,speed*.05):1e9}
function srPlace(){
  var row=srRow();if(!row||srBoss())return;
  var V=srV(),i,tA=srTA(),tB=srTB();
  var pass=(SR_W+pW())/SR_V,now=runS,bk=srBk&&srBk===srSeen;if(bk)srBk=null;
  var lo=Math.max(SR_MINT,tA+srClr()+SR_FM,srLast+row.sp+SR_SPM-now),hi=Math.min(tB-srCla()-pass,srEnd()-pass);
  if(lo>hi){if(bk)srBkRetry();return}  /* a booking that did not fit (a cart took it): book again at the next spawn */
  if(!bk&&srR()>=row.p)return;
  var tc=Math.max(lo,Math.min(hi,(tA+tB-pass)/2));
  if(!srOK(tc,pass)){
    var ok=0;for(var k=0;k<=8&&!ok;k++){var c2=lo+(hi-lo)*k/8;if(srOK(c2,pass)){tc=c2;ok=1}}
    if(!ok){if(bk)srBkRetry();return}
  }
  for(i=0;i<SR_N;i++)if(!srC[i].a){var r=srC[i];r.a=1;r.x=PX-SR_W-SR_V*tc;r.gx=PX+pW()+V*tc;r.d=0;r.ar=0;r.s1=0;r.s2=0;r.s3=0;r.hit=0;r.tc=now+tc;r.ph=srCnt++;r.bk=bk?1:0;srLast=now+tc;if(bk)srBkS++;return}
}
/* RESCUE (06h-rescue): its ramp / early bounce window and the slow-mo prompt */
function srRescue(){
  if(typeof rsOn==="undefined"||!rsOn)return false;
  var w=typeof RS==="object"&&RS?Math.max(RS.ramp||0,RS.bT||0):12;
  return runS<w||(typeof rsSlowT==="number"&&rsSlowT>0);
}
/* will 06i put an ore cart into this gap? Copied from ocPlace (read-only, typeof-guarded; 06i untouched). ocPlace runs right
   after this spawn (ocTick, same frame) and places a cart only if: carts on for the level, the Crusher is not holding them,
   its spacing allows a contact <= the next obstacle's arrival - (OC_AIR + OC_M), and its next roll ocR() < OC_P. The roll is
   PEEKED (the same mulberry32 step on a copy of ocRS: the cart stream is never advanced). Free = none of that can happen. */
function srOcPeek(){var s=(ocRS+0x6d2b79f5)>>>0,t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
function srCartFree(t1){
  if(typeof OC_YIELD!=="undefined"&&OC_YIELD)return true;  /* 06i honours srBooked() (proposed line, see srBooked) */
  if(typeof ocC==="undefined"||typeof ocLast!=="number"||typeof ocSpace!=="function"||typeof OC_P==="undefined")return true;
  var l=srLvl();if(l<2||!(OC_P[l-1]>0))return true;
  if(typeof crS==="number"&&(crS>=1&&crS<=6||crS===0&&typeof crL5==="number"&&crL5>=0&&(!demo||(typeof CR_DEMO!=="undefined"&&CR_DEMO))))return true;
  var post=(typeof OC_AIR==="number"?OC_AIR:.69)+(typeof OC_M==="number"?OC_M:.1),spm=typeof OC_SPM==="number"?OC_SPM:.06;
  if(ocLast+ocSpace()+spm-runS>t1-post+SR_FM)return true;
  return typeof ocRS==="number"&&srOcPeek()>=OC_P[l-1];
}
/* terrain gap (GAPS gapNear) or fork deck / taper (FORK platNear, #93) over [x0,x1] (ents' frame)? undefined = none; a throw = blocked */
function srTerrain(x0,x1){
  try{if(typeof gapNear==="function"&&gapNear(x0,x1))return true;if(typeof platNear==="function"&&platNear(x0,x1))return true}catch(e){return true}
  return false;
}
/* PROPOSED for 06i (Dev / #85, not in this PR): carts yield a booked roller gap. 06i would add var OC_YIELD=1 and, at the top of
   ocPlace(), if(typeof srBooked==="function"&&srBooked())return; . srBooked() is true from the srGap booking (inside spawn())
   until srTick has placed the roller in that gap the same frame, i.e. exactly while ocTick decides that gap. Unused until then. */
function srBooked(){return srBk!==null&&srBk!==srSeen}
/* a booked gap was lost (it no longer fits at placement): due again from the next spawn */
function srBkRetry(){srBkT=runS-SR_BK[Math.max(0,Math.min(SR_BK.length-1,srLvl()))]}
/* due: L3+, SR_BK[level] s since the last roller (any kind) and the last booking */
function srBkDue(){
  var l=srLvl();if(l<3||!SR_BK[Math.min(SR_BK.length-1,l)])return false;
  var last=Math.max(srLast,srBkT);return runS-last>=SR_BK[Math.min(SR_BK.length-1,l)];
}
/* srGap: called once at the end of every base spawn() (after crGap). Adds px to nextGap only; never calls Math.random */
function srGap(){
  if(state!=="run"||demo)return;
  srSync();
  if(runS<SR_BK0||srRescue()||!srBkDue()||srBoss())return;
  if(typeof lvGapsBlocked==="function"&&lvGapsBlocked())return;
  var nw=null;for(var i=ents.length-1;i>=0;i--)if(srObs(ents[i])){nw=ents[i];break}
  if(!nw||nw.x<W)return;
  var V=srV(),pass=(SR_W+pW())/SR_V,tA=srTA(),tB=srTB();
  var need=Math.max(srClr()+SR_FM,SR_MINT-tA)+pass+srCla()+SR_BKM,add=Math.max(0,need-(tB-tA));
  var t1=tB+add;
  if(t1>srEnd())return;  /* L6 begins inside this window (no rollers there): never stretch a gap for it */
  /* an ore cart will take this gap: never stretch it for a cart, try the next spawn */
  if(!srCartFree(t1))return;
  /* the whole roller window, from the obstacle's exit to the next obstacle's arrival, in ents' frame */
  if(srTerrain(PX+V*tA-V*SR_GLAND,PX+pW()+V*t1+V*SR_GTO))return;
  if(add>0)nextGap+=add*srSR();
  srBk=nw;srBkT=runS;srBkN++;
}
/* visual + hitbox hop: once fully past the buggy it rides up over base obstacles on its way out (never near the buggy) */
function srHop(r){
  if(r.x<PX+pW()+4)return 0;
  var up=0,cx=r.x+SR_W/2;
  for(var i=0;i<ents.length;i++){var e=ents[i];if(!srObs(e)||(e.bot||0)>8)continue;
    var dc=Math.abs(cx-(e.x+e.w/2)),hw=(SR_W+e.w)/2+18;if(dc<hw){var u=(e.h+(e.bot||0)+2)*Math.min(1,(hw-dc)/18);if(u>up)up=u}}
  return Math.round(up);
}
function srHit(r,pw,ph,pt){
  if(inv>0)return;
  if(shd){if(shdP&&typeof skLabel==="function")skLabel("SHIELD (Plate)");shd=0;shdP=0;if(typeof skShieldBreak==="function")skShieldBreak();
    sfx(900,180,.25,2,.09);if(!rm()){sparks(PX+pw/2,pt+ph/2,18,220);shake=.15}return}
  if(cores>0&&typeof skReboot==="function"){skReboot(pt,ph);for(var i=0;i<SR_N;i++)srC[i].a=0;if(typeof skClear==="function")skClear(pw);return}
  r.hit=1;die();
}
function srTick(dt,pw,ph,pt){
  if(state!=="run")return;
  srSync();
  for(var h=0;h<SR_N;h++)if(srC[h].hit){srC[h].a=0;srC[h].hit=0}
  if(dt>0){var d=spawnDist-srSD;if(d>0)srSDR=d/dt;srSD=spawnDist}
  var nw=null;for(var i=ents.length-1;i>=0;i--)if(srObs(ents[i])){nw=ents[i];break}
  if(nw&&nw!==srSeen&&nw.x>=W){srSeen=nw;srPlace()}
  var V=srV(),bo=srBoss();
  for(i=0;i<SR_N;i++){
    var r=srC[i];if(!r.a)continue;
    r.x+=SR_V*dt;r.gx-=V*dt;r.d+=(V+SR_V)*dt;
    if(!r.ar&&(bo||srGapBlk(r.gx))){r.a=0;continue}
    if(!r.ar&&srTTI(r)<=SR_WARN)r.ar=1;
    if(r.x>XO+VW+60){r.a=0;continue}
    if(state==="run"&&hit(PX,pt,pw,ph,r.x,srGY(r.x+SR_W/2)-SR_H-srHop(r),SR_W,SR_H)){srHit(r,pw,ph,pt);if(state!=="run")return}
  }
}
/* autopilot (demo): press as the roller's centre is SR_AL s behind the buggy's centre (auto() holds to the apex) */
var SR_AL=[.16,.3];
function srWant(){
  if(state!=="run")return false;srSync();
  for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a)continue;var m=(PX+pW()/2-(r.x+SR_W/2))/SR_V;if(m>SR_AL[0]&&m<SR_AL[1])return true}
  return false;
}
/* the left glow band, anchored on the roller's lane: bottom on the ground line (the lane is GY-SR_H..GY, in the band's lower
   part), 06j's tall height (portrait 170 u, landscape/desktop 108 u). Explicit so it stays on the lane whatever the zoom
   (PZ 1.35, PZW 1.12 of #66: there only ~12 u are visible behind the robot, so the glow carries the warning to contact) */
function srEwH(){return typeof ZM==="number"&&ZM>1?170:108}
/* HILLS (06i hlH): canvas y of the ground under screen x. Same contract as 06i's ocGY: world x = hsc+x, 0 lift when hlH is absent,
   lip-to-lip chord over a gap. The left glow's bottom stays on that ground line. */
function srGY(x){return GY-(typeof hlH==="function"?hlH(x):0)}
function srEwY(){return srGY(XO)-srEwH()}
/* ---------- art: dark slag crust, rotating molten cracks, ember trail, heat shimmer ---------- */
/* opaque silhouette (a squat 30x22 lump, bottom on the ground) = everything drawn at alpha >= .6, inside the hitbox */
function srSolid(r){var x=Math.round(r.x),t=srGY(x+SR_W/2)-SR_H-srHop(r);return [{x:x+9,y:t,w:12,h:2},{x:x+5,y:t+2,w:20,h:3},{x:x+2,y:t+5,w:26,h:4},{x:x,y:t+9,w:30,h:6},{x:x+2,y:t+15,w:26,h:4},{x:x+6,y:t+19,w:18,h:3}]}
function srTm(){return rm()?0:tt}
function srDrawR(r){
  var x=Math.round(r.x),hp=srHop(r),g=srGY(x+SR_W/2),t=g-SR_H-hp,tm=srTm(),S=srSolid(r),i,k,s,pu=rm()?1:.8+.2*Math.sin(tm*17+r.ph);
  /* molten heat aura (translucent, may spill outside the box) + rising heat wisps */
  ctx.globalAlpha=.16*pu;ctx.fillStyle=OR;ctx.fillRect(x-3,t+3,36,17);ctx.globalAlpha=.1*pu;ctx.fillRect(x-6,t+8,42,11);ctx.fillRect(x+6,t-3,18,4);
  if(!rm())for(i=0;i<2;i++){var wy=(tm*34+i*9+r.ph*3)%12;ctx.globalAlpha=.32*(1-wy/12);ctx.fillStyle=i?"#fde047":"#fb923c";ctx.fillRect(x+10+i*9+Math.round(1.5*Math.sin(tm*13+i)),t-3-Math.round(wy),1,4)}
  /* molten streak left on the ground behind it (translucent) */
  ctx.globalAlpha=.3;ctx.fillStyle=OR;ctx.fillRect(x-34,g-2-hp,34,2);ctx.globalAlpha=.18;ctx.fillStyle="#fde047";ctx.fillRect(x-56,g-1-hp,22,1);
  ctx.globalAlpha=1;
  /* dark slag crust: outline, body, cooler top */
  ctx.fillStyle="#05070d";for(i=0;i<S.length;i++)ctx.fillRect(S[i].x,S[i].y,S[i].w,S[i].h);
  ctx.fillStyle="#292524";ctx.fillRect(x+10,t+1,10,2);ctx.fillRect(x+6,t+2,18,3);ctx.fillRect(x+3,t+5,24,4);ctx.fillRect(x+1,t+9,28,6);ctx.fillRect(x+3,t+15,24,4);ctx.fillRect(x+7,t+19,16,2);
  ctx.fillStyle="#44403c";ctx.fillRect(x+10,t+1,8,1);ctx.fillRect(x+6,t+3,7,1);ctx.fillRect(x+3,t+6,3,1);
  /* molten underside: the hot half glows through the crust where it presses the ground */
  ctx.fillStyle="#c2410c";ctx.fillRect(x+2,t+15,26,1);ctx.fillRect(x+3,t+16,1,3);ctx.fillRect(x+26,t+16,1,3);
  ctx.fillStyle=OR;ctx.fillRect(x+7,t+19,16,2);ctx.fillStyle="#fde047";ctx.fillRect(x+11,t+20,8,1);
  /* hot core + four molten veins turning with the roll (ground distance / radius), yellow-white inside, orange at the rim */
  var a0=r.d/11,cx=x+15,cy=t+11;
  ctx.fillStyle=OR;ctx.fillRect(cx-3,cy-3,6,6);ctx.fillStyle="#fde047";ctx.fillRect(cx-2,cy-2,4,4);ctx.fillStyle="#fff7d6";ctx.fillRect(cx-1,cy-1,2,2);
  for(k=0;k<4;k++){var a=a0+k*1.5708+(k&1)*.35;for(s=2.5;s<=8.6;s+=1.5){ctx.fillStyle=s<4?"#fff7d6":s<6?"#fde047":s<7.5?"#fb923c":OR;ctx.fillRect(Math.round(cx+Math.cos(a)*s)-1,Math.round(cy+Math.sin(a)*s*.8)-1,2,2)}
    /* a short branch off each vein */
    var b=a+.7,bx=cx+Math.cos(a)*5.5,by=cy+Math.sin(a)*4.4;ctx.fillStyle="#fb923c";ctx.fillRect(Math.round(bx+Math.cos(b)*2)-1,Math.round(by+Math.sin(b)*1.6)-1,2,1)}
  ctx.globalAlpha=1;
}
/* ember trail: fixed pool, deterministic (roller id + frame-time hash), slower than the roller so they stream behind it */
var SR_NP=40,srPX=new Float32Array(SR_NP),srPY=new Float32Array(SR_NP),srVX=new Float32Array(SR_NP),srVY=new Float32Array(SR_NP),srPL=new Float32Array(SR_NP),srPI=0,srPT=0;
function srEmber(x,y,k){if(rm())return;var j=srPI;srPI=(srPI+1)%SR_NP;srPX[j]=x;srPY[j]=y;srVX[j]=SR_V*.3+(k*37)%70;srVY[j]=-(25+(k*53)%80);srPL[j]=.25+(k%3)*.06}
function srDrawParts(dt){
  for(var j=0;j<SR_NP;j++)if(srPL[j]>0){if(dt>0){srPL[j]-=dt;srVY[j]+=420*dt;srPX[j]+=srVX[j]*dt;srPY[j]+=srVY[j]*dt;var gy=srGY(srPX[j]);if(srPY[j]>gy-1){srPY[j]=gy-1;srVY[j]*=-.3}}
    ctx.globalAlpha=Math.max(0,Math.min(.55,srPL[j]*2.4));ctx.fillStyle=j&1?"#fde047":OR;ctx.fillRect(srPX[j]|0,srPY[j]|0,2,2)}
  ctx.globalAlpha=1;
}
var srLT=-1;
function srEv(ev){if(typeof enemySfx==="function"){try{enemySfx("roller",ev)}catch(e){}}}
/* warn = edgeWarn's once-per-key sfx (first warning frame); rumble once at TTI <= SR_RUM; pass once at centre crossing */
function srSnd(){
  if(!demo)for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a&&!r.hit)continue;
    if(r.ar&&!r.s1)r.s1=1;
    if(r.s1&&!r.s2&&srTTI(r)<=SR_RUM){r.s2=1;srEv("rumble")}
    if(r.s1&&!r.s3&&r.x+SR_W/2>=PX+pW()/2){r.s3=1;srEv("pass")}}
}
/* one-time hint: the first roller ever announced (not demo) shows HOLD JUMP just ahead of / above the buggy's nose for SR_HINT s */
function srHintSeen(){if(srHS)return true;var v=null;try{v=typeof lsg==="function"?lsg(SR_HK):null}catch(e){v=null}if(v==="1")srHS=1;return !!srHS}
function srHintMark(){srHS=1;try{typeof lss==="function"&&lss(SR_HK,"1")}catch(e){}}
function srHint(dt){
  if(srHT<=0||typeof txt!=="function")return;
  srHT-=dt;var a=Math.max(0,Math.min(1,srHT/.4,(SR_HINT-srHT)/.15));if(a<=0)return;
  var tl=typeof ZM==="number"&&ZM>1,px=tl?16:12;
  ctx.globalAlpha=a;txt("HOLD JUMP",PX+pW()+14,srGY(PX+pW()+14)-58,px,"#fde047","left",true,true,true,"","srhint");ctx.globalAlpha=1;
}
function srDraw(){
  if(state==="start")return;
  srSync();
  var dt=srLT<0?0:Math.max(0,Math.min(.1,tt-srLT));srLT=tt;
  var vis=XO+VW,run=state==="run";
  for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a)continue;
    if(r.x<vis+8&&r.x+SR_W>XO-8){srDrawR(r);if(run&&dt>0&&!rm()){srPT+=dt;if(srPT>.025){srPT=0;var hk=r.ph*7+((tt*60)|0),gy=srGY(r.x+SR_W/2)-srHop(r);srEmber(r.x+3,gy-4-(hk%9),hk%97);srEmber(r.x+8,gy-12,(hk*3+5)%89)}}}
    if(run&&!demo&&r.ar&&!srVis(r)&&typeof edgeWarn==="function")edgeWarn("sr"+r.ph,srTTI(r),"roller","left",{sfx:["roller","warn"],y:srEwY(),h:srEwH()});
    if(run&&r.ar&&!demo&&!srHT&&!srHintSeen()){srHT=SR_HINT;srHintMark()}
  }
  srDrawParts(run?dt:0);
  if(run){srSnd();if(!demo)srHint(dt)}else srHT=0;
}
`;
