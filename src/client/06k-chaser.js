// CHASER (owner: Levels): a glowing molten SLAG ROLLER that comes from BEHIND (the left edge), overtakes the buggy along the
// ground and exits right; the buggy jumps as it passes underneath. Distinct from the base forward roller (t:"r", vx 110, comes
// at you from the right): this one rolls the same way you drive, faster than you (RL_V u/s on top of the felt world speed).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// LIVE through three guarded hook lines (NEED DEV'S OK; each runs exactly once, tested in scripts/test-chaser.mjs):
//   13-simulation.js update(), right after the ORE CART line (so carts are placed first and rollers avoid them):
//       typeof rlTick==="function"&&rlTick(dt,pw,ph,pt);  /* CHASER (06k): place/move/hit slag rollers from behind */
//   13-simulation.js auto(), right after the ORE CART line:
//       if(typeof rlWant==="function"&&rlWant())wantJump=true;  /* CHASER (06k): demo jumps rollers */
//   14-render.js drawEnts(), after the ORE CART line and before edgeWarnDraw (rlDraw registers the left-edge glow):
//       typeof rlDraw==="function"&&rlDraw();  /* CHASER (06k): rollers, embers, hint, sounds */
// MOTION: ground speed = felt world speed (speed*vMul()) + RL_V, so on screen it always moves right at RL_V u/s: the pass
// under the buggy takes the same time at 760 and at 874 felt, only the base obstacles around it get closer.
// LEVELS (CHASER_LV): none on L1-L2; L3 >= 4 s apart (p .5), L4 >= 2.4 s (p .8), L5 >= 1.8 s (p .95); a held jump is fine.
// PLACEMENT (fair by construction, mirrors 06i): each time a new base obstacle appears its gap is known; a roller is placed so
// it overtakes inside that gap with >= RL_CLR (0.45 s) of clear track before and RL_CLA (0.65 s: room to land a HELD jump and still tap the next obstacle)
// after, never sooner than RL_MINT (1.3 s) from now, clear of ore carts by the same margins, never while the Crusher is up or pending (crOn()/crS, L5), and never with its
// impact point in a gap's takeoff window (RL_GTO) or within RL_GLAND (0.85 s) after a landing (gapNear; undefined = no gaps).
// WARNING: left-edge glow via edgeWarn(key,tti,"roller","left",{sfx:["roller","warn"]}) from TTI <= RL_WARN (1.3 s) until the
// sprite is on screen; enemySfx("roller","rumble") once at TTI <= RL_RUM (1.2 s); enemySfx("roller","pass") once when its
// centre crosses the buggy's centre. Nothing in demo or before a run. First roller ever: "HOLD JUMP" hint just ahead of the buggy
// (once; localStorage forge-runner-chaser-hint, guarded).
// HIT: hit(PX,pt,pw,ph,x,GY-RL_H-hop,RL_W,RL_H), opaque sprite == rlSolid (0 px overhang); inv -> shield -> Spare Core -> die
// (same order as 06i ocHit); ducking is always hit. Own list rlC (not ents) + own seeded RNG: base Math.random untouched.
// Sim-path rules: NO Math.random, never writes score/speed/scroll/runT/spawnDist/nextGap/nt/ents. SFX only from the draw path.
export default String.raw`
var RL_V=440,RL_W=30,RL_H=22,RL_CLR=.45,RL_MINT=1.3,RL_WARN=1.3,RL_RUM=1.2,RL_N=4,RL_SEED=0x51a6b;
var RL_GTO=.6,RL_GLAND=.85,RL_CLA=.65,RL_STOMP=.2,RL_SPM=.06,RL_HINT=2.4,RL_HK="forge-runner-chaser-hint";
/* per level: sp = min seconds between overtakes, p = chance per eligible gap (separate seeded stream) */
var CHASER_LV=[null,null,null,{sp:4,p:.5},{sp:2.4,p:.8},{sp:1.8,p:.95}];
var rlC=[];for(var rlI=0;rlI<RL_N;rlI++)rlC.push({a:0,x:0,gx:0,d:0,ar:0,s1:0,s2:0,s3:0,tc:0,hit:0,ph:0});
var rlLR=-1,rlLast=-1e9,rlSD=0,rlSDR=0,rlSeen=null,rlRS=RL_SEED,rlCnt=0,rlHT=0,rlHS=0;
function rlR(){rlRS=(rlRS+0x6d2b79f5)>>>0;var t=rlRS;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
function rlLvl(){return typeof currentLevel==="function"?currentLevel():1}
function rlRow(){var l=rlLvl();return CHASER_LV[Math.max(0,Math.min(5,l))]}
function rlV(){var m=typeof vMul==="function"?vMul():1;return speed*m}
/* time to the overtake: the roller's front reaches the buggy's back edge (PX) */
function rlTTI(r){return (PX-(r.x+RL_W))/RL_V}
function rlVis(r){return r.x+RL_W>XO+12}
/* new run (start() sets runS=0) whatever hook runs first; a Poki Continue keeps runS (same run) */
function rlSync(){if(rlLR<0||runS<rlLR)rlReset();rlLR=runS}
function rlReset(){for(var i=0;i<RL_N;i++){rlC[i].a=0;rlC[i].hit=0;rlC[i].ar=0}for(i=0;i<RL_NP;i++)rlPL[i]=0;rlLT=-1;rlLast=-1e9;rlSD=spawnDist;rlSDR=0;rlSeen=null;rlRS=RL_SEED;rlCnt=0;rlHT=0}
function rlObs(e){return e.t!=="k"&&e.t!=="u"}
/* Crusher (06h) up, or pending on L5 (it starts ~2 s after L5): no new rollers; unannounced ones are dropped */
function rlBoss(){
  try{if(typeof crOn==="function"&&crOn())return true;
    if(typeof crS==="number"&&crS===0&&typeof crReady==="function"&&rlLvl()>=5&&(!demo||(typeof CR_DEMO!=="undefined"&&CR_DEMO)))return true}catch(e){return true}
  return false;
}
function rlGapBlk(P){
  if(typeof gapNear!=="function")return false;
  var V=rlV(),g;
  try{g=gapNear(P-V*RL_GLAND,P+V*RL_GTO)}catch(e){return true}
  return !!g;
}
/* clear of every live ore cart (06i): RL_CLR s after a cart, RL_CLA s before one (room to land a held jump) */
function rlCartOK(tc,pass){
  if(typeof ocC==="undefined"||typeof ocTTI!=="function")return true;
  for(var i=0;i<ocC.length;i++){var c=ocC[i];if(!c.a)continue;
    var a=ocTTI(c),b=(c.x+OC_W-PX)/ocVc();
    if(!(tc>=b+RL_CLR||tc+pass+RL_CLA<=a))return false}
  return true;
}
function rlOK(tc,pass){return !rlGapBlk(PX+pW()+rlV()*tc)&&rlCartOK(tc,pass)}
function rlPlace(){
  var row=rlRow();if(!row||rlBoss())return;
  var V=rlV(),i,e,tA=0;
  for(i=0;i<ents.length;i++){e=ents[i];if(!rlObs(e))continue;var o=(e.x+e.w-PX)/(V+(e.vx||0))+(e.sk==="l"?RL_STOMP:0);if(o>tA)tA=o}
  var sr=rlSDR>0?rlSDR:speed,tB=Math.max(0,(nextGap-spawnDist)/sr)+(W+20-(PX+pW()))/(V+(nt==="r"?110:0));
  var pass=(RL_W+pW())/RL_V,now=runS;
  var lo=Math.max(RL_MINT,tA+RL_CLR,rlLast+row.sp+RL_SPM-now),hi=tB-RL_CLA-pass;
  if(lo>hi)return;
  if(rlR()>=row.p)return;
  var tc=Math.max(lo,Math.min(hi,(tA+tB-pass)/2));
  if(!rlOK(tc,pass)){
    var ok=0;for(var k=0;k<=8&&!ok;k++){var c2=lo+(hi-lo)*k/8;if(rlOK(c2,pass)){tc=c2;ok=1}}
    if(!ok)return;
  }
  for(i=0;i<RL_N;i++)if(!rlC[i].a){var r=rlC[i];r.a=1;r.x=PX-RL_W-RL_V*tc;r.gx=PX+pW()+V*tc;r.d=0;r.ar=0;r.s1=0;r.s2=0;r.s3=0;r.hit=0;r.tc=now+tc;r.ph=rlCnt++;rlLast=now+tc;return}
}
/* visual + hitbox hop: once fully past the buggy it rides up over base obstacles on its way out (never near the buggy) */
function rlHop(r){
  if(r.x<PX+pW()+4)return 0;
  var up=0,cx=r.x+RL_W/2;
  for(var i=0;i<ents.length;i++){var e=ents[i];if(!rlObs(e)||(e.bot||0)>8)continue;
    var dc=Math.abs(cx-(e.x+e.w/2)),hw=(RL_W+e.w)/2+18;if(dc<hw){var u=(e.h+(e.bot||0)+2)*Math.min(1,(hw-dc)/18);if(u>up)up=u}}
  return Math.round(up);
}
function rlHit(r,pw,ph,pt){
  if(inv>0)return;
  if(shd){if(shdP&&typeof skLabel==="function")skLabel("SHIELD (Plate)");shd=0;shdP=0;if(typeof skShieldBreak==="function")skShieldBreak();
    sfx(900,180,.25,2,.09);if(!rm()){sparks(PX+pw/2,pt+ph/2,18,220);shake=.15}return}
  if(cores>0&&typeof skReboot==="function"){skReboot(pt,ph);for(var i=0;i<RL_N;i++)rlC[i].a=0;if(typeof skClear==="function")skClear(pw);return}
  r.hit=1;die();
}
function rlTick(dt,pw,ph,pt){
  if(state!=="run")return;
  rlSync();
  for(var h=0;h<RL_N;h++)if(rlC[h].hit){rlC[h].a=0;rlC[h].hit=0}
  if(dt>0){var d=spawnDist-rlSD;if(d>0)rlSDR=d/dt;rlSD=spawnDist}
  var nw=null;for(var i=ents.length-1;i>=0;i--)if(rlObs(ents[i])){nw=ents[i];break}
  if(nw&&nw!==rlSeen&&nw.x>=W){rlSeen=nw;rlPlace()}
  var V=rlV(),bo=rlBoss();
  for(i=0;i<RL_N;i++){
    var r=rlC[i];if(!r.a)continue;
    r.x+=RL_V*dt;r.gx-=V*dt;r.d+=(V+RL_V)*dt;
    if(!r.ar&&(bo||rlGapBlk(r.gx))){r.a=0;continue}
    if(!r.ar&&rlTTI(r)<=RL_WARN)r.ar=1;
    if(r.x>XO+VW+60){r.a=0;continue}
    if(state==="run"&&hit(PX,pt,pw,ph,r.x,GY-RL_H-rlHop(r),RL_W,RL_H)){rlHit(r,pw,ph,pt);if(state!=="run")return}
  }
}
/* autopilot (demo): press as the roller's centre is RL_AL s behind the buggy's centre (auto() holds to the apex) */
var RL_AL=[.16,.3];
function rlWant(){
  if(state!=="run")return false;rlSync();
  for(var i=0;i<RL_N;i++){var r=rlC[i];if(!r.a)continue;var m=(PX+pW()/2-(r.x+RL_W/2))/RL_V;if(m>RL_AL[0]&&m<RL_AL[1])return true}
  return false;
}
/* ---------- art: dark slag crust, rotating molten cracks, ember trail, heat shimmer ---------- */
/* opaque silhouette (a squat 30x22 lump, bottom on the ground) = everything drawn at alpha >= .6, inside the hitbox */
function rlSolid(r){var x=Math.round(r.x),t=GY-RL_H-rlHop(r);return [{x:x+9,y:t,w:12,h:2},{x:x+5,y:t+2,w:20,h:3},{x:x+2,y:t+5,w:26,h:4},{x:x,y:t+9,w:30,h:6},{x:x+2,y:t+15,w:26,h:4},{x:x+6,y:t+19,w:18,h:3}]}
function rlTm(){return rm()?0:tt}
function rlDrawR(r){
  var x=Math.round(r.x),hp=rlHop(r),t=GY-RL_H-hp,tm=rlTm(),S=rlSolid(r),i,k,s,pu=rm()?1:.8+.2*Math.sin(tm*17+r.ph);
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
var RL_NP=40,rlPX=new Float32Array(RL_NP),rlPY=new Float32Array(RL_NP),rlVX=new Float32Array(RL_NP),rlVY=new Float32Array(RL_NP),rlPL=new Float32Array(RL_NP),rlPI=0,rlPT=0;
function rlEmber(x,y,k){if(rm())return;var j=rlPI;rlPI=(rlPI+1)%RL_NP;rlPX[j]=x;rlPY[j]=y;rlVX[j]=RL_V*.3+(k*37)%70;rlVY[j]=-(25+(k*53)%80);rlPL[j]=.25+(k%3)*.06}
function rlDrawParts(dt){
  for(var j=0;j<RL_NP;j++)if(rlPL[j]>0){if(dt>0){rlPL[j]-=dt;rlVY[j]+=420*dt;rlPX[j]+=rlVX[j]*dt;rlPY[j]+=rlVY[j]*dt;if(rlPY[j]>GY-1){rlPY[j]=GY-1;rlVY[j]*=-.3}}
    ctx.globalAlpha=Math.max(0,Math.min(.55,rlPL[j]*2.4));ctx.fillStyle=j&1?"#fde047":OR;ctx.fillRect(rlPX[j]|0,rlPY[j]|0,2,2)}
  ctx.globalAlpha=1;
}
var rlLT=-1;
function rlEv(ev){if(typeof enemySfx==="function"){try{enemySfx("roller",ev)}catch(e){}}}
/* warn = edgeWarn's once-per-key sfx (first warning frame); rumble once at TTI <= RL_RUM; pass once at centre crossing */
function rlSnd(){
  if(!demo)for(var i=0;i<RL_N;i++){var r=rlC[i];if(!r.a&&!r.hit)continue;
    if(r.ar&&!r.s1)r.s1=1;
    if(r.s1&&!r.s2&&rlTTI(r)<=RL_RUM){r.s2=1;rlEv("rumble")}
    if(r.s1&&!r.s3&&r.x+RL_W/2>=PX+pW()/2){r.s3=1;rlEv("pass")}}
}
/* one-time hint: the first roller ever announced (not demo) shows HOLD JUMP just ahead of / above the buggy's nose for RL_HINT s */
function rlHintSeen(){if(rlHS)return true;var v=null;try{v=typeof lsg==="function"?lsg(RL_HK):null}catch(e){v=null}if(v==="1")rlHS=1;return !!rlHS}
function rlHintMark(){rlHS=1;try{typeof lss==="function"&&lss(RL_HK,"1")}catch(e){}}
function rlHint(dt){
  if(rlHT<=0||typeof txt!=="function")return;
  rlHT-=dt;var a=Math.max(0,Math.min(1,rlHT/.4,(RL_HINT-rlHT)/.15));if(a<=0)return;
  var tl=typeof ZM==="number"&&ZM>1,px=tl?16:12;
  ctx.globalAlpha=a;txt("HOLD JUMP",PX+pW()+14,GY-58,px,"#fde047","left",true,true,true,"","rlhint");ctx.globalAlpha=1;
}
function rlDraw(){
  if(state==="start")return;
  rlSync();
  var dt=rlLT<0?0:Math.max(0,Math.min(.1,tt-rlLT));rlLT=tt;
  var vis=XO+VW,run=state==="run";
  for(var i=0;i<RL_N;i++){var r=rlC[i];if(!r.a)continue;
    if(r.x<vis+8&&r.x+RL_W>XO-8){rlDrawR(r);if(run&&dt>0&&!rm()){rlPT+=dt;if(rlPT>.025){rlPT=0;var hk=r.ph*7+((tt*60)|0);rlEmber(r.x+3,GY-4-rlHop(r)-(hk%9),hk%97);rlEmber(r.x+8,GY-12-rlHop(r),(hk*3+5)%89)}}}
    if(run&&!demo&&r.ar&&!rlVis(r)&&typeof edgeWarn==="function")edgeWarn("rl"+r.ph,rlTTI(r),"roller","left",{sfx:["roller","warn"]});
    if(run&&r.ar&&!demo&&!rlHT&&!rlHintSeen()){rlHT=RL_HINT;rlHintMark()}
  }
  rlDrawParts(run?dt:0);
  if(run){rlSnd();if(!demo)rlHint(dt)}else rlHT=0;
}
`;
