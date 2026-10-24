// ORE CART (owner: Levels): the ONCOMING enemy. A runaway forge ore cart rolls TOWARD the buggy along the track (its own
// OC_V u/s against the ground, so it closes at felt speed + OC_V) and is jumped over; a tap is always a valid answer.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// LIVE in every build (site, Poki, lab) through four guarded hook lines (Dev OK'd; each runs exactly once, tested):
//   13-simulation.js update(), right before "if(rb)skClear(pw);":
//       typeof ocTick==="function"&&ocTick(dt,pw,ph,pt);  /* ORE CART (06i): place/move/hit oncoming carts */
//   13-simulation.js auto(), right before "duck=wantDuck&&!wantJump;":
//       if(typeof ocWant==="function"&&ocWant())wantJump=true;  /* ORE CART (06i): demo jumps carts */
//   14-render.js drawEnts(), last lines (after enDrawAfter; ocDraw registers the cart's edgeWarn, edgeWarnDraw draws it):
//       typeof ocDraw==="function"&&ocDraw();  /* ORE CART (06i): carts, sparks, sounds */
//       typeof edgeWarnDraw==="function"&&edgeWarnDraw();  /* EDGE WARN (06j): off-screen hazard glows */
// GAPS (Dev): when typeof gapNear==="function", gapNear(x0,x1) (world x, same frame as ents' e.x) returns the first gap
// {x0,x1} overlapping [x0,x1] or null. A cart's impact point (the ground under the buggy at contact) never falls in a gap's
// takeoff window (OC_GTO s of felt travel before its lip, or over it) nor within OC_GLAND (0.85 s) of felt travel after its
// landing edge; on L2-L3 a cart never follows a gap at all (none within OC_GFOL s after one); from L4 it may (>= 0.85 s).
// Carts not yet announced are re-checked every step and silently dropped if a gap appears over their impact point.
// Carts are NOT in ents (own fixed list ocC), so the base ents loop, spawn() and its Math.random stream are untouched.
// PLACEMENT (fair by construction): each time a new base obstacle appears, the gap after it is known exactly (nextGap,
// spawnDist and nt are already rolled). A cart is placed so it meets the buggy inside that gap with room for a FULL HELD jump
// on both sides where one is needed (contact >= a must-jump obstacle's or the previous cart's in time + 0.69 s airtime (0.83 if
// spring boots are on at that take-off) + OC_ML[level]; ducked obstacles + slag stomps keep their own rules; next obstacle in >=
// contact + the same; see ocPlace), never sooner than OC_MINT s from now, at least ocSpace() s after the previous cart (L2 2.5 s
// easing to L5 1.1 s; none on L1), on L2 never sooner than OC_G2 (4.5) s after L2 starts (banner grace), with probability
// OC_P[level] from a SEPARATE seeded stream (ocR).
// WARNING (time to impact, not pixels; drawn by the shared edgeWarn() API in 06j): the cart "arrives" (approach sound +
// pulsing right-edge glow/chevron at track height)
// when TTI <= OC_WARN (1.15 s) and placement guarantees TTI >= OC_MINT (1.0 s) at that moment, so every device gets >= 1 s
// even though portrait only shows ~363 u (~0.33 s at closing speed). The glow runs until the cart's sprite is on screen.
// Sim-path rules: NO Math.random, never writes score/speed/scroll/runT/spawnDist/nextGap/nt/ents. SFX only from the draw path.
export default String.raw`
/* CHASER (06m, #91) contract: OC_YIELD=1 tells 06m's cart predictor that ocPlace yields a gap booked for a roller (the guarded
   first line of ocPlace), so 06m books roller gaps without predicting carts. Inert without 06m (main). */
var OC_YIELD=1;
var OC_V=320,OC_W=40,OC_H=26,OC_CLR=.45,OC_MINT=1,OC_WARN=1.15,OC_FELT=800,OC_N=6,OC_SEED=0x0c4a7;
var OC_AIR=.69,OC_AIRB=.83,OC_ML=[0,.08,.05,.05,.02],OC_BS=.1,OC_DK=.2,OC_DKP=.5,OC_STK=.63,OC_G2=4.5,OC_GTO=.6,OC_GLAND=.85,OC_GFOL=2,OC_GLV=4,OC_SPM=.06,OC_SP=[0,2.5,2.0333,1.5667,1.1],OC_P=[0,.85,.95,1,1];
/* cart list (fixed, preallocated records; a = active) */
var ocC=[];for(var ocI=0;ocI<OC_N;ocI++)ocC.push({a:0,x:0,gx:0,ar:0,s1:0,s2:0,wt:0,tc:0,hit:0,ph:0,ck:null,cl:0});
/* COMBO (Audio): live gap-then-cart chains in fixed slots (k = gap key or null, n = carts cleared, d = dirty: hit seen);
   ocKS = shd/cores/inv snapshot; ocCQ = queued sfxCombo n (played from the draw path); ocCF = keys already fired this run */
var ocK=[];for(ocI=0;ocI<OC_N;ocI++)ocK.push({k:null,n:0,d:0});
var ocKS=[0,0,0],ocCQ=0,ocCF=[],ocCK=null;
var ocLR=-1,ocLast=-1e9,ocSD=0,ocSDR=0,ocSeen=null,ocRS=OC_SEED,ocNP=0,ocCnt=0;
/* enemy-only RNG: mulberry32, reseeded every run (deterministic per run, never touches Math.random) */
function ocR(){ocRS=(ocRS+0x6d2b79f5)>>>0;var t=ocRS;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
function ocLvl(){return typeof currentLevel==="function"?currentLevel():1}
/* felt world speed (Dev's vMul() felt multiplier when it lands, capped at 800) and the cart's closing speed */
function ocV(){var m=typeof vMul==="function"?vMul():1;return Math.min(OC_FELT,speed*m)}
function ocVc(){return ocV()+OC_V}
function ocSpace(){var l=ocLvl();return OC_SP[Math.max(0,Math.min(4,l-1))]}
function ocFront(){return PX+pW()}
/* time to impact: cart front reaches the buggy's front edge */
function ocTTI(c){return (c.x-ocFront())/ocVc()}
/* "in view" = at least 12 u of the cart on screen; until then the edge warning carries it */
function ocVis(c){return c.x<XO+VW-12}
/* new-run detection that does not depend on hook order: whichever of ocTick / ocDraw / ocWant runs first in a new run sees
   runS below the last value seen (start() sets runS=0) and wipes everything; a Poki Continue keeps runS, so it is the same run */
function ocSync(){if(ocLR<0||runS<ocLR)ocReset();ocLR=runS}
function ocReset(){for(var i=0;i<OC_N;i++){ocC[i].a=0;ocC[i].hit=0;ocC[i].ar=0}for(i=0;i<OC_NP;i++)ocPL[i]=0;ocLT=-1;ocLast=-1e9;ocSD=spawnDist;ocSDR=0;ocSeen=null;ocRS=OC_SEED;ocNP=0;ocCnt=0;ocL2=-1;for(i=0;i<OC_N;i++){ocC[i].ck=null;ocC[i].cl=0}for(i=0;i<OC_N;i++)ocK[i].k=null;ocCQ=0;ocCF.length=0;ocCK=null}
/* pass interval [in,out] (s from now) of an obstacle at x..x+w closing at r u/s */
function ocIn(x,r){return (x-ocFront())/r}
function ocOut(x,w,r){return (x+w-PX)/r}
function ocObs(e){return e.t!=="k"&&e.t!=="u"}
/* GAPS: is ground point P (world x of the impact point) blocked by a gap? Undefined gapNear -> never (unchanged behaviour) */
function ocGapBlk(P){
  if(typeof gapNear!=="function")return false;
  var V=ocV(),g;
  try{g=gapNear(P-V*(ocLvl()>=OC_GLV?OC_GLAND:OC_GFOL),P+V*OC_GTO)}catch(e){return true}
  return !!g;
}
/* COMBO: key of the gap this cart follows (a gap whose landing edge is within OC_GFOL s of felt travel before the impact
   point P), in ground coordinates (gap x + scroll, read-only) so it is stable while the gap scrolls; null = no gap / no gapNear */
function ocGapKey(P){
  if(typeof gapNear!=="function")return null;
  var g;try{g=gapNear(P-ocV()*OC_GFOL,P)}catch(e){return null}
  return g?Math.round(g.x1+(typeof scroll==="number"?scroll:0)):null;
}
function ocSlot(k){for(var i=0;i<OC_N;i++)if(ocK[i].k===k)return ocK[i];return null}
function ocChain(k){if(ocSlot(k)||ocCF.indexOf(k)>=0)return;var any=0;
  for(var i=0;i<OC_N;i++)if(ocK[i].k!==null)any=1;
  if(!any){ocKS[0]=shd;ocKS[1]=cores;ocKS[2]=inv}
  for(i=0;i<OC_N;i++)if(ocK[i].k===null){ocK[i].k=k;ocK[i].n=0;ocK[i].d=0;return}}
/* any hit since the snapshot (shield used, core used, invulnerability raised: hit / reboot / rescue bounce) dirties the chain */
function ocDirty(){if(shd<ocKS[0]||cores<ocKS[1]||inv>ocKS[2]+1e-6)for(var i=0;i<OC_N;i++)ocK[i].d=1;ocKS[0]=shd;ocKS[1]=cores;ocKS[2]=inv}
/* SPRING BOOTS AT LAUNCH (Playtest #85 follow-up): JMUL 1.2 is applied when a jump starts (vy=JV*JMUL), so a jump is 0.83 s
   long only if boots are on at its take-off. ocBootsAt(t) = boots on for a take-off t s from now: spT still running then
   (spT > t - OC_BS, OC_BS = 0.1 s for an early press), or a boots pickup on the track that the buggy reaches by then (its front
   reaches the pickup at ocIn(x) >= now; collected no earlier, OC_BS for a late press). Boots from a shop start are spT > 0 at
   run start. A pickup still ahead at the take-off cannot lengthen that jump (only the ones after it, which the next
   placements see as spT > 0). */
function ocBootsAt(t){if(spT>0&&spT>t-OC_BS)return true;var V=ocV();
  for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t==="u"&&e.k==="j"&&ocIn(e.x,V)<=t+OC_BS)return true}return false}
function ocAir(t){return ocBootsAt(t)?OC_AIRB:OC_AIR}
/* how a base obstacle is passed: 1 = must be jumped (bugs / slag blobs, rollers, pillars / vents, the low flyer, and the hammer
   drone, which Playtest's bots jump); 2 = ducked (the L2-L3 drone, the mid flyer); 0 = passes over the buggy (high flyer) */
function ocKind(e){if(e.t==="d")return 2;if(e.t==="f")return e.bot>=50?0:e.bot>=18?2:1;return 1}
/* L2 GRACE (Playtest #85 follow-up): the first L2 cart meets the buggy >= OC_G2 s after L2 starts (LEVEL 2 banner 1.5 s; its
   warning glow then starts >= OC_G2 - OC_WARN = 3.35 s in, ~1.9 s after the banner is gone). ocL2 = runS when L2 began (0 on a
   ?level=2 start, whose banner shows at run start), -1 before. */
var ocL2=-1;
/* try to put a cart into the gap that just opened behind the newest base obstacle */
function ocPlace(){
  if(typeof srBooked==="function"&&srBooked())return;  /* CHASER (06m, #91): a gap booked for a roller is the roller's (no cart, no ocR draw); undefined on main = no-op */
  var l=ocLvl();if(l<2||!(OC_P[l-1]>0))return;
  if(typeof crS==="number"&&(crS>=1&&crS<=6||crS===0&&crL5>=0&&(!demo||CR_DEMO)))return;  /* THE CRUSHER (06h): no new carts from the L5 boss arming until CRUSHER DOWN (its plates are not ents) */
  var V=ocV(),Vc=V+OC_V,i,e,tA=0,M=OC_ML[l-1];
  /* HELD-JUMP CLEARANCE (Playtest #85 NO-SHIP, kept; follow-up: per obstacle kind + boots at take-off). A full-hold jump is
     airborne OC_AIR = 0.69 s (2*JV/G), OC_AIRB = 0.83 s if boots are on at its take-off (ocAir). A player jumps ~0.2 s before an
     obstacle's "in" time and must be back on the ground 0.2 s before the cart's contact to jump it:
       must-jump obstacle (ocKind 1) or an earlier cart: contact >= in + air(take-off in-0.2) + M;
       slag blob stomp (bounce vy=JV*.6, lands up to ~0.43 s after its out time): contact >= out + OC_STK (0.63) + M;
       ducked (ocKind 2): ducking runs to ~0.3 s after "in", then 0.2 s to the press: contact >= in + OC_DKP (0.5) + M;
       every obstacle: contact >= out + OC_CLR.
     The same rule AFTER the cart: the next base obstacle's in time >= contact + air(cart take-off) + M (+ OC_DK 0.2 if it may be
     a duck type: drone / flyer, ducking starts ~0.4 s before it), so holding over the cart can't trap you on the next one.
     M = OC_ML[level] (late-press margin, tuned per level for frequency). Measured in felt time (speed*vMul). */
  var need=0;
  for(i=0;i<ents.length;i++){e=ents[i];if(!ocObs(e))continue;var r=V+(e.vx||0),o=ocOut(e.x,e.w,r),n=ocIn(e.x,r),k=ocKind(e),q=o+OC_CLR;
    if(k===1)q=Math.max(q,n+ocAir(n-.2)+M);else if(k===2)q=Math.max(q,n+OC_DKP+M);
    if(e.sk==="l")q=Math.max(q,o+OC_STK+M);
    if(o>tA)tA=o;if(q>need)need=q}
  for(i=0;i<OC_N;i++)if(ocC[i].a){var oc=ocOut(ocC[i].x,OC_W,Vc),n2=ocTTI(ocC[i]),q2=n2+ocAir(n2-.2)+M;if(oc>tA)tA=oc;if(q2>need)need=q2}
  /* next base spawn: appears at W+20 once spawnDist reaches nextGap (spawnDist rate measured, so it holds with or without vMul) */
  var sr=ocSDR>0?ocSDR:speed,tB=Math.max(0,(nextGap-spawnDist)/sr)+ocIn(W+20,V+(nt==="r"?110:0));
  var pass=(OC_W+pW())/Vc,now=runS,dk=nt==="d"||nt==="f"?OC_DK:0;
  var lo=Math.max(OC_MINT,need,ocLast+ocSpace()+OC_SPM-now),hi=tB-OC_AIR-M-dk;
  if(l===2&&ocL2>=0)lo=Math.max(lo,ocL2+OC_G2-now);
  if(lo>hi)return;
  if(ocR()>=OC_P[l-1])return;
  var tc=Math.max(lo,Math.min(hi,(tA+tB-pass)/2));
  /* boots on at the cart's own take-off (tc-0.2) -> the longer post-clearance; re-clamp, or no cart */
  if(ocBootsAt(tc-.2)){hi=tB-OC_AIRB-M-dk;if(lo>hi)return;tc=Math.max(lo,Math.min(hi,tc))}
  /* GAPS: try the middle, then either end of the allowed window */
  if(ocGapBlk(ocFront()+V*tc)){if(!ocGapBlk(ocFront()+V*lo))tc=lo;else if(!ocGapBlk(ocFront()+V*hi))tc=hi;else return}
  for(i=0;i<OC_N;i++)if(!ocC[i].a){var c=ocC[i];c.a=1;c.x=ocFront()+Vc*tc;c.gx=ocFront()+V*tc;c.ar=0;c.s1=0;c.s2=0;c.wt=0;c.hit=0;c.tc=now+tc;c.ph=ocCnt++;ocLast=now+tc;
    c.cl=0;c.ck=l>=OC_GLV?ocGapKey(c.gx):null;if(c.ck!==null)ocChain(c.ck);return}
}
/* cart hit: same absorb order as the base loop (inv -> shield -> Spare Core -> die) */
function ocHit(c,pw,ph,pt){
  if(inv>0)return;
  if(shd){if(shdP&&typeof skLabel==="function")skLabel("SHIELD (Plate)");shd=0;shdP=0;if(typeof skShieldBreak==="function")skShieldBreak();
    sfx(900,180,.25,2,.09);if(!rm()){sparks(PX+pw/2,pt+ph/2,18,220);shake=.15}return}
  if(cores>0&&typeof skReboot==="function"){skReboot(pt,ph);for(var i=0;i<OC_N;i++)if(ocC[i].a&&ocC[i].x<PX+pw+300)ocC[i].a=0;if(typeof skClear==="function")skClear(pw);return}
  c.hit=1;die();
}
/* per sim step, after the base ents loop (dt = the step's dt, after rescue slow-mo) */
function ocTick(dt,pw,ph,pt){
  if(state!=="run")return;
  ocSync();
  for(var h=0;h<OC_N;h++)if(ocC[h].hit){ocC[h].a=0;ocC[h].hit=0}  /* a cart that ended the run is gone if the run goes on (Continue) */
  if(ocL2<0&&ocLvl()>=2)ocL2=runS;  /* L2 GRACE: when L2 began */
  if(dt>0){var d=spawnDist-ocSD;if(d>0)ocSDR=d/dt;ocSD=spawnDist}
  /* newest base obstacle (spawn() pushes at the end of ents): a new one -> its gap is decided now */
  var nw=null;for(var i=ents.length-1;i>=0;i--)if(ocObs(ents[i])){nw=ents[i];break}
  if(nw&&nw!==ocSeen&&nw.x>=W){ocSeen=nw;ocPlace()}
  var Vc=ocVc();
  for(i=0;i<OC_N;i++){
    var c=ocC[i];if(!c.a)continue;
    c.x-=Vc*dt;c.gx-=ocV()*dt;c.wt+=dt;
    if(!c.ar&&ocGapBlk(c.gx)){c.a=0;continue}  /* GAPS: a gap appeared over a not-yet-announced cart's impact point */
    if(!c.ar&&ocTTI(c)<=OC_WARN)c.ar=1;
    if(c.x+OC_W<-20){c.a=0;continue}
    if(state==="run"&&hit(PX,pt,pw,ph,c.x,ocGY(c.x+OC_W/2)-OC_H,OC_W,OC_H)){ocHit(c,pw,ph,pt);if(state!=="run"){for(var q=0;q<OC_N;q++)ocK[q].k=null;ocCQ=0;return}}
  }
  ocCombo();
}
/* COMBO (Audio): a gap-then-cart chain from L4 cleared with no hit and no death -> sfxCombo(n) once, n = jumps cleared
   (the gap + each cart, >= 2). Decided here in the sim path, played from the draw path (ocSnd). Never in demo / pre-run. */
function ocCombo(){
  var j,i,c,s,live,any=0;
  for(j=0;j<OC_N;j++)if(ocK[j].k!==null)any=1;
  if(!any)return;
  ocDirty();
  for(i=0;i<OC_N;i++){c=ocC[i];if(c.a&&c.ck!==null&&!c.cl&&c.x+OC_W<PX){c.cl=1;s=ocSlot(c.ck);if(s)s.n++}}
  for(j=0;j<OC_N;j++){s=ocK[j];if(s.k===null)continue;live=0;
    for(i=0;i<OC_N;i++){c=ocC[i];if(c.a&&c.ck===s.k&&!c.cl)live++}
    if(live)continue;
    if(s.n>=1&&!s.d&&!demo&&ocCF.indexOf(s.k)<0){ocCQ=Math.max(ocCQ,1+s.n);ocCF.push(s.k);if(ocCF.length>16)ocCF.shift();ocCK=s.k}
    s.k=null}
}
/* autopilot (demo): tap so the buggy is mid-hop as the cart passes under it */
function ocWant(){
  if(state!=="run")return false;ocSync();
  for(var i=0;i<OC_N;i++){var c=ocC[i];if(!c.a||c.x+OC_W<PX)continue;var m=(c.x+OC_W/2-(PX+pW()/2))/ocVc();if(m>.12&&m<.22)return true}
  return false;
}
/* HILLS (06i hlH): canvas y of the ground under screen x. hlH is px above GY at world x = hsc+x (0 when hills are off or hlH is absent).
   Over a gap hlH is hlW's lip-to-lip line, so a cart rides that chord instead of clipping through the hill or floating on flat GY. */
function ocGY(x){return GY-(typeof hlH==="function"?hlH(x):0)}
/* ---------- art: neon/pixel forge ore cart (opaque body = ocSolid, inside the 40x26 hitbox) ---------- */
function ocSolid(c){var x=Math.round(c.x),g=ocGY(x+OC_W/2);return [{x:x+6,y:g-26,w:10,h:3},{x:x+19,y:g-26,w:13,h:3},{x:x+1,y:g-23,w:38,h:3},{x:x,y:g-20,w:40,h:13},{x:x+3,y:g-9,w:10,h:9},{x:x+27,y:g-9,w:10,h:9}]}
function ocTm(){return rm()?0:tt}
/* wheel sparks: fixed pool, screen-space velocities, deterministic (k = hash of cart id + frame time; no RNG).
   fw=0: thrown back off the rear wheel (slower than the cart, so they trail it); fw=1: MOTION READ (Forge): thrown FORWARD off
   the front wheel toward the buggy, faster than the cart, drawn as short hot streaks, so even on desktop it reads as rushing at you */
var OC_NP=32,ocPX=new Float32Array(OC_NP),ocPY=new Float32Array(OC_NP),ocVX=new Float32Array(OC_NP),ocVY=new Float32Array(OC_NP),ocPL=new Float32Array(OC_NP),ocPF=new Uint8Array(OC_NP),ocPI=0,ocPT=0;
function ocSpark(x,y,k,fw){if(rm())return;var j=ocPI;ocPI=(ocPI+1)%OC_NP;ocPX[j]=x;ocPY[j]=y;ocPF[j]=fw?1:0;
  if(fw){ocVX[j]=-ocVc()-(90+(k*41)%140);ocVY[j]=-(30+(k*29)%70);ocPL[j]=.12+(k%3)*.03}
  else{ocVX[j]=-ocVc()+60+(k*37)%90;ocVY[j]=-(40+(k*53)%110);ocPL[j]=.22+(k%3)*.05}}
function ocDrawCart(c){
  var x=Math.round(c.x),g=ocGY(x+OC_W/2),t=ocTm(),f=((t*14+c.ph)|0)&1,i;
  /* heat glow above the ore heap (soft, outside the body) */
  ctx.globalAlpha=rm()?.25:.18+.1*Math.sin(t*9+c.ph);ctx.fillStyle=OR;ctx.fillRect(x+2,g-32,36,6);ctx.globalAlpha=1;
  /* ore heap: molten lumps (opaque rows = top strip of ocSolid) */
  ctx.fillStyle="#05070d";ctx.fillRect(x+6,g-26,10,3);ctx.fillRect(x+19,g-26,13,3);
  ctx.fillStyle=OR;ctx.fillRect(x+7,g-25,8,2);ctx.fillRect(x+20,g-25,11,2);ctx.fillStyle="#fde047";ctx.fillRect(x+9,g-25,3,1);ctx.fillRect(x+23,g-25,4,1);
  ctx.fillStyle="#05070d";ctx.fillRect(x+1,g-23,38,3);
  ctx.fillStyle=OR;ctx.fillRect(x+3,g-23,34,3);
  ctx.fillStyle="#fde047";ctx.fillRect(x+6,g-23,6,2);ctx.fillRect(x+17,g-23,8,2);ctx.fillRect(x+29,g-23,5,2);
  ctx.fillStyle="#fef3c7";ctx.fillRect(x+19,g-23,3,1);
  /* tub: dark outline, riveted steel, hot seam, neon rim */
  ctx.fillStyle="#05070d";ctx.fillRect(x,g-20,40,13);
  ctx.fillStyle="#475569";ctx.fillRect(x+2,g-19,36,10);
  ctx.fillStyle="#94a3b8";ctx.fillRect(x+2,g-19,36,2);
  ctx.fillStyle=OR;ctx.fillRect(x+2,g-13,36,2);
  ctx.fillStyle="#cbd5e1";for(i=0;i<4;i++)ctx.fillRect(x+5+i*9,g-16,2,2);
  /* molten ore spilling over the front lip (direction of travel = left) */
  ctx.fillStyle="#fde047";ctx.fillRect(x+1,g-20,3,6);ctx.fillStyle=OR;ctx.fillRect(x+1,g-14,2,3);
  /* MOTION READ (Forge): a hot ember headlamp on the front (the side facing the buggy) with a soft flickering beam cone
     thrown ahead of it along the track; the cone is translucent (outside the hitbox, like the heat glow) */
  ctx.fillStyle="#05070d";ctx.fillRect(x,g-13,5,5);ctx.fillStyle="#fde047";ctx.fillRect(x+1,g-12,4,3);ctx.fillStyle="#fff7d6";ctx.fillRect(x+1,g-12,2,2);
  var fk=rm()?1:.75+.25*Math.sin(t*23+c.ph);
  for(i=0;i<4;i++){ctx.globalAlpha=(.34-.07*i)*fk;ctx.fillStyle=i<2?"#fde047":OR;ctx.fillRect(x-4-7*i,g-13-i,7,4+2*i)}
  ctx.globalAlpha=.3*fk;ctx.fillStyle="#fde047";ctx.fillRect(x-30,g-2,30,2);ctx.globalAlpha=1;
  /* wheels: outline, steel, spinning spoke */
  for(i=0;i<2;i++){var wx=x+3+i*24;ctx.fillStyle="#05070d";ctx.fillRect(wx,g-9,10,9);ctx.fillStyle="#64748b";ctx.fillRect(wx+1,g-8,8,7);
    ctx.fillStyle="#1e293b";ctx.fillRect(wx+3,g-6,4,3);ctx.fillStyle="#e2e8f0";if(f)ctx.fillRect(wx+4,g-8,2,7);else ctx.fillRect(wx+1,g-5,8,1)}
  /* drips falling off the front (soft) */
  if(!rm()){var b=(t*2.2+c.ph*.37)%1;ctx.globalAlpha=.5*(1-b);ctx.fillStyle="#fde047";ctx.fillRect(x-2,g-14+Math.round(b*12),2,2);ctx.globalAlpha=1}
}
function ocDrawParts(dt){
  for(var j=0;j<OC_NP;j++)if(ocPL[j]>0){if(dt>0){ocPL[j]-=dt;ocVY[j]+=500*dt;ocPX[j]+=ocVX[j]*dt;ocPY[j]+=ocVY[j]*dt;var gy=ocGY(ocPX[j]);if(ocPY[j]>gy-1){ocPY[j]=gy-1;ocVY[j]*=-.3}}
    if(ocPF[j]){ctx.globalAlpha=Math.max(0,Math.min(.85,ocPL[j]*8));ctx.fillStyle=j&1?"#fff7d6":"#fde047";ctx.fillRect(ocPX[j]|0,ocPY[j]|0,5,1)}
    else{ctx.globalAlpha=Math.max(0,Math.min(.55,ocPL[j]*3));ctx.fillStyle=j&1?"#fde047":OR;ctx.fillRect(ocPX[j]|0,ocPY[j]|0,2,2)}}
  ctx.globalAlpha=1;
}
var ocLT=-1;
/* draw path: carts, wheel sparks, edge warning, one-shot sounds (presentation only; guarded) */
function ocEv(ev){if(typeof enemySfx==="function"){try{enemySfx("orecart",ev)}catch(e){}}}
/* approach = edgeWarn's once-per-key sfx on the cart's first warning frame (TTI <= OC_WARN, always off-screen then: the
   cart is only in view at TTI <= ~0.45 s); pass = once when its back crosses behind the buggy's x. Never in demo. */
function ocSnd(){
  if(!demo)for(var i=0;i<OC_N;i++){var c=ocC[i];if(!c.a&&!c.hit)continue;
    if(c.ar&&!c.s1)c.s1=1;
    if(c.s1&&!c.s2&&c.x+OC_W<PX){c.s2=1;ocEv("pass")}}
  if(ocCQ>=2&&!demo){var n=ocCQ;ocCQ=0;typeof sfxCombo==="function"&&sfxCombo(n);}else ocCQ=0;
}
function ocDraw(){
  if(state==="start")return;
  ocSync();
  var dt=ocLT<0?0:Math.max(0,Math.min(.1,tt-ocLT));ocLT=tt;
  var vis=XO+VW,run=state==="run";
  for(var i=0;i<OC_N;i++){var c=ocC[i];if(!c.a)continue;
    if(c.x<vis+8&&c.x+OC_W>XO-8){ocDrawCart(c);if(run&&dt>0&&!rm()){ocPT+=dt;if(ocPT>.03){ocPT=0;var hk=c.ph*7+((tt*60)|0),gy=ocGY(c.x+OC_W/2);ocSpark(c.x+OC_W-2,gy-2,hk%97,0);ocSpark(c.x+4,gy-2,(hk*3+5)%89,1);ocSpark(c.x+2,gy-3,(hk*5+11)%83,1)}}}
    if(run&&c.ar&&!ocVis(c)&&typeof edgeWarn==="function"){var eh=typeof ZM==="number"&&ZM>1?170:108;edgeWarn("oc"+c.ph,ocTTI(c),"enemy","right",{sfx:["orecart","approach"],y:ocGY(XO+VW)-eh,h:eh})}
  }
  ocDrawParts(run?dt:0);
  if(run)ocSnd();else ocCQ=0;
}
`;
