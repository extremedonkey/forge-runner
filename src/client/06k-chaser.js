// CHASER (owner: Levels): a glowing molten SLAG ROLLER that comes from BEHIND (the left edge), overtakes the buggy along the
// ground and exits right; the buggy jumps as it passes underneath. Distinct from the base forward roller (t:"r", vx 110, comes
// at you from the right): this one rolls the same way you drive, faster than you (SR_V u/s on top of the felt world speed).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// LIVE through three guarded hook lines (NEED DEV'S OK; each runs exactly once, tested in scripts/test-chaser.mjs):
//   13-simulation.js update(), right after the ORE CART line (so carts are placed first and rollers avoid them):
//       typeof srTick==="function"&&srTick(dt,pw,ph,pt);  /* CHASER (06k): place/move/hit slag rollers from behind */
//   13-simulation.js auto(), right after the ORE CART line:
//       if(typeof srWant==="function"&&srWant())wantJump=true;  /* CHASER (06k): demo jumps rollers */
//   14-render.js drawEnts(), after the ORE CART line and before edgeWarnDraw (srDraw registers the left-edge glow):
//       typeof srDraw==="function"&&srDraw();  /* CHASER (06k): rollers, embers, hint, sounds */
// MOTION: ground speed = felt world speed (speed*vMul()) + SR_V, so on screen it always moves right at SR_V u/s: the pass
// under the buggy takes the same time at 760 and at 874 felt, only the base obstacles around it get closer.
// LEVELS (CHASER_LV): none on L1-L2; L3 >= 4 s apart (p .5), L4 >= 2.4 s (p .8), L5 >= 1.8 s (p .95); a held jump is fine.
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
// HIT: hit(PX,pt,pw,ph,x,GY-SR_H-hop,SR_W,SR_H), opaque sprite == srSolid (0 px overhang); inv -> shield -> Spare Core -> die
// (same order as 06i ocHit); ducking is always hit. Own list srC (not ents) + own seeded RNG: base Math.random untouched.
// Sim-path rules: NO Math.random, never writes score/speed/scroll/runT/spawnDist/nextGap/nt/ents. SFX only from the draw path.
export default String.raw`
var SR_V=440,SR_W=30,SR_H=22,SR_CLR=.8,SR_CLRB=.95,SR_MINT=1.3,SR_WARN=1.3,SR_RUM=1.2,SR_N=4,SR_SEED=0x51a6b;
var SR_GTO=.6,SR_GLAND=.85,SR_CLA=.65,SR_CLAB=.8,SR_STOMP=.2,SR_SPM=.06,SR_FM=.02,SR_HINT=2.4,SR_HK="forge-runner-chaser-hint";
/* per level: sp = min seconds between overtakes, p = chance per eligible gap (separate seeded stream) */
var CHASER_LV=[null,null,null,{sp:4,p:.5},{sp:2.4,p:.8},{sp:1.8,p:.95}];
var srC=[];for(var srI=0;srI<SR_N;srI++)srC.push({a:0,x:0,gx:0,d:0,ar:0,s1:0,s2:0,s3:0,tc:0,hit:0,ph:0});
var srLR=-1,srLast=-1e9,srSD=0,srSDR=0,srSeen=null,srRS=SR_SEED,srCnt=0,srHT=0,srHS=0;
function srR(){srRS=(srRS+0x6d2b79f5)>>>0;var t=srRS;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
function srLvl(){return typeof currentLevel==="function"?currentLevel():1}
function srRow(){var l=srLvl();return CHASER_LV[Math.max(0,Math.min(5,l))]}
function srV(){var m=typeof vMul==="function"?vMul():1;return speed*m}
/* time to the overtake: the roller's front reaches the buggy's back edge (PX) */
function srTTI(r){return (PX-(r.x+SR_W))/SR_V}
function srVis(r){return r.x+SR_W>XO+12}
/* new run (start() sets runS=0) whatever hook runs first; a Poki Continue keeps runS (same run) */
function srSync(){if(srLR<0||runS<srLR)srReset();srLR=runS}
function srReset(){for(var i=0;i<SR_N;i++){srC[i].a=0;srC[i].hit=0;srC[i].ar=0}for(i=0;i<SR_NP;i++)srPL[i]=0;srLT=-1;srLast=-1e9;srSD=spawnDist;srSDR=0;srSeen=null;srRS=SR_SEED;srCnt=0;srHT=0}
function srObs(e){return e.t!=="k"&&e.t!=="u"}
/* Crusher (06h) up, or pending on L5 (it starts ~2 s after L5): no new rollers; unannounced ones are dropped */
function srBoss(){
  try{if(typeof crOn==="function"&&crOn())return true;
    if(typeof crS==="number"&&crS===0&&typeof crReady==="function"&&srLvl()>=5&&(!demo||(typeof CR_DEMO!=="undefined"&&CR_DEMO)))return true}catch(e){return true}
  return false;
}
function srGapBlk(P){
  if(typeof gapNear!=="function")return false;
  var V=srV(),g;
  try{g=gapNear(P-V*SR_GLAND,P+V*SR_GTO)}catch(e){return true}
  return !!g;
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
function srPlace(){
  var row=srRow();if(!row||srBoss())return;
  var V=srV(),i,e,tA=0;
  for(i=0;i<ents.length;i++){e=ents[i];if(!srObs(e))continue;var o=(e.x+e.w-PX)/(V+(e.vx||0))+(e.sk==="l"?SR_STOMP:0);if(o>tA)tA=o}
  var sr=srSDR>0?srSDR:speed,tB=Math.max(0,(nextGap-spawnDist)/sr)+(W+20-(PX+pW()))/(V+(nt==="r"?110:0));
  var pass=(SR_W+pW())/SR_V,now=runS;
  var lo=Math.max(SR_MINT,tA+srClr()+SR_FM,srLast+row.sp+SR_SPM-now),hi=tB-srCla()-pass;
  if(lo>hi)return;
  if(srR()>=row.p)return;
  var tc=Math.max(lo,Math.min(hi,(tA+tB-pass)/2));
  if(!srOK(tc,pass)){
    var ok=0;for(var k=0;k<=8&&!ok;k++){var c2=lo+(hi-lo)*k/8;if(srOK(c2,pass)){tc=c2;ok=1}}
    if(!ok)return;
  }
  for(i=0;i<SR_N;i++)if(!srC[i].a){var r=srC[i];r.a=1;r.x=PX-SR_W-SR_V*tc;r.gx=PX+pW()+V*tc;r.d=0;r.ar=0;r.s1=0;r.s2=0;r.s3=0;r.hit=0;r.tc=now+tc;r.ph=srCnt++;srLast=now+tc;return}
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
    if(state==="run"&&hit(PX,pt,pw,ph,r.x,GY-SR_H-srHop(r),SR_W,SR_H)){srHit(r,pw,ph,pt);if(state!=="run")return}
  }
}
/* autopilot (demo): press as the roller's centre is SR_AL s behind the buggy's centre (auto() holds to the apex) */
var SR_AL=[.16,.3];
function srWant(){
  if(state!=="run")return false;srSync();
  for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a)continue;var m=(PX+pW()/2-(r.x+SR_W/2))/SR_V;if(m>SR_AL[0]&&m<SR_AL[1])return true}
  return false;
}
/* ---------- art: dark slag crust, rotating molten cracks, ember trail, heat shimmer ---------- */
/* opaque silhouette (a squat 30x22 lump, bottom on the ground) = everything drawn at alpha >= .6, inside the hitbox */
function srSolid(r){var x=Math.round(r.x),t=GY-SR_H-srHop(r);return [{x:x+9,y:t,w:12,h:2},{x:x+5,y:t+2,w:20,h:3},{x:x+2,y:t+5,w:26,h:4},{x:x,y:t+9,w:30,h:6},{x:x+2,y:t+15,w:26,h:4},{x:x+6,y:t+19,w:18,h:3}]}
function srTm(){return rm()?0:tt}
function srDrawR(r){
  var x=Math.round(r.x),hp=srHop(r),t=GY-SR_H-hp,tm=srTm(),S=srSolid(r),i,k,s,pu=rm()?1:.8+.2*Math.sin(tm*17+r.ph);
  /* molten heat aura (translucent, may spill outside the box) + rising heat wisps */
  ctx.globalAlpha=.16*pu;ctx.fillStyle=OR;ctx.fillRect(x-3,t+3,36,17);ctx.globalAlpha=.1*pu;ctx.fillRect(x-6,t+8,42,11);ctx.fillRect(x+6,t-3,18,4);
  if(!rm())for(i=0;i<2;i++){var wy=(tm*34+i*9+r.ph*3)%12;ctx.globalAlpha=.32*(1-wy/12);ctx.fillStyle=i?"#fde047":"#fb923c";ctx.fillRect(x+10+i*9+Math.round(1.5*Math.sin(tm*13+i)),t-3-Math.round(wy),1,4)}
  /* molten streak left on the ground behind it (translucent) */
  ctx.globalAlpha=.3;ctx.fillStyle=OR;ctx.fillRect(x-34,GY-2-hp,34,2);ctx.globalAlpha=.18;ctx.fillStyle="#fde047";ctx.fillRect(x-56,GY-1-hp,22,1);
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
  for(var j=0;j<SR_NP;j++)if(srPL[j]>0){if(dt>0){srPL[j]-=dt;srVY[j]+=420*dt;srPX[j]+=srVX[j]*dt;srPY[j]+=srVY[j]*dt;if(srPY[j]>GY-1){srPY[j]=GY-1;srVY[j]*=-.3}}
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
  ctx.globalAlpha=a;txt("HOLD JUMP",PX+pW()+14,GY-58,px,"#fde047","left",true,true,true,"","srhint");ctx.globalAlpha=1;
}
function srDraw(){
  if(state==="start")return;
  srSync();
  var dt=srLT<0?0:Math.max(0,Math.min(.1,tt-srLT));srLT=tt;
  var vis=XO+VW,run=state==="run";
  for(var i=0;i<SR_N;i++){var r=srC[i];if(!r.a)continue;
    if(r.x<vis+8&&r.x+SR_W>XO-8){srDrawR(r);if(run&&dt>0&&!rm()){srPT+=dt;if(srPT>.025){srPT=0;var hk=r.ph*7+((tt*60)|0);srEmber(r.x+3,GY-4-srHop(r)-(hk%9),hk%97);srEmber(r.x+8,GY-12-srHop(r),(hk*3+5)%89)}}}
    if(run&&!demo&&r.ar&&!srVis(r)&&typeof edgeWarn==="function")edgeWarn("sr"+r.ph,srTTI(r),"roller","left",{sfx:["roller","warn"]});
    if(run&&r.ar&&!demo&&!srHT&&!srHintSeen()){srHT=SR_HINT;srHintMark()}
  }
  srDrawParts(run?dt:0);
  if(run){srSnd();if(!demo)srHint(dt)}else srHT=0;
}
`;
