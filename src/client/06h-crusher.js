// LEVELS-5 THE CRUSHER (owner: Levels): the L5 boss. A giant forge press comes down from the top once per run, after the L5
// banner + level sting have finished, hovers ahead of the buggy and stamps hot iron plates onto the track in a fixed pattern:
// 3 single slams, 2 double slams, then the finale slam, slam, pause, double. Each plate is a low (14 px) ground hazard that
// slides from under the press to the buggy: JUMP clears every plate (tap or hold); duck is never needed (and never helps).
// Survive the last plate -> CRUSHER DOWN! banner + spark burst, skEarn(20) and msOn("boss") (not in demo).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE (shared scope).
// Plain browser JS inside the String.raw template; no backticks, no ${...}.
// INERT in the site/Poki builds: nothing calls it until hook lines land (the LAB build, src/client/lab/crusher.js, chains it
// onto the 06g enPost/enDrawAfter hooks and lvDraw). Hooks it needs for the real game: crTick(dt) at the end of update()
// (13-simulation.js, next to enPost), crDraw() after the entities (14), crHud() at the end of the HUD block (14).
// Sim-path rules: NEVER writes score/speed/spawnDist/nextGap/nt (ents only via 13's own skClear() on a Spare Core reboot) and never calls Math.random (boss-only LCG crR for the
// visuals; the pattern is a fixed sequence). Normal spawns are NOT paused: a slam only starts when its plates will land in a
// gap that leaves >= CR_TAU s (in time-to-contact) to the obstacles on both sides, including the predicted next spawn.
// Sounds/music are queued here and played from crDraw() (draw path), guarded: enemySfx("crusher",ev), bossMusic(on);
// bossMusic(false) once when the boss ends: CRUSHER DOWN, or the run ending (death / game over) mid-boss.
// World motion uses crV() = speed x vMul() (Dev's HILLS felt-speed hook, when present); score/speed are only read.
// Phones: no per-frame allocation (fixed plate slots and a fixed particle pool, preallocated).
export default String.raw`
/* timings (s): wind-up (shadow + dust pre-shake) CR_TW, drop CR_TD, head rest CR_DW, lift CR_TU, rest before the next wind-up
   CR_RS; plates land CR_LEAD s (time-to-contact; less if vMul() > 1, see crLX) ahead of the buggy; a double's 2nd head lands CR_D2T later, crD2() px further along */
var CR_TW=.62,CR_TD=.08,CR_DW=.1,CR_TU=.3,CR_RS=.6,CR_LEAD=.38,CR_PW=40,CR_PH=10,CR_D2T=.12,CR_TAU=.75,CR_XG=.9,CR_IN=1.4,CR_PZ=1.5,CR_BAN=2.2,CR_HY=118;
/* the pattern: 1 = single slam, 2 = double slam, 0 = pause (CR_PZ s) */
var CR_PAT=[1,1,2,1,1,0,2];
var CR_DEMO=0;  /* boss off in demo/attract runs (the lab's boss switch turns it on for previews) */
var CR_NW={b:98,f:33,d:30,r:22,p:26};
/* state: 0 waiting for L5, 1 intro, 2 hover (waits for a fair gap), 3 wind-up, 4 drop/impact/lift, 5 pause, 6 down, 7 done */
var crL5=-1,crPS="",crKill=0,crS=0,crT=0,crI=0,crN=1,crH=0,crX=0,crY=-200,crRS=0,crBan=0,crDn=0,crGo=0,crWait=0,crSeed=1;
var crQT=0,crQS=0,crQD=0,crQM1=0,crQM0=0,crEnd=0;  /* crEnd: the run ended mid-boss, music-off queued once */  /* queued sounds: telegraphs, slams, down, music on / off */
var CR_NPL=6,crPL=[];for(var crJ=0;crJ<CR_NPL;crJ++)crPL.push({on:0,x:0,w:CR_PW,p:0});
var CR_NP=56,crPX=new Float32Array(CR_NP),crPY=new Float32Array(CR_NP),crVX=new Float32Array(CR_NP),crVY=new Float32Array(CR_NP),crPLf=new Float32Array(CR_NP),crPA=new Float32Array(CR_NP),crPC=new Uint8Array(CR_NP),crPG=new Float32Array(CR_NP),crPI=0;
var CR_PCL=["#fde047",OR,"#ffffff","#94a3b8","#78716c"];
/* boss-only deterministic PRNG (visual jitter only; never Math.random) */
function crR(){crSeed=(crSeed*16807)%2147483647;return crSeed/2147483647}
/* THIS run's level, computed fresh from its own distance (06d currentLevel() is a pure function of score), never 06d's
   lvl/lvT/lvB: those still hold the previous run's values until lvTick sees the new run (PR-76 playtest blocker) */
function crLv(){return typeof currentLevel==="function"?currentLevel():1}
/* world-motion speed (px/s the track actually moves): speed x Dev's felt-speed multiplier vMul() (HILLS; 1.15 at L5 via
   lvSpeedMul) when it exists. Everything the boss moves or positions on the track uses this; wind-ups stay time-based. */
function crV(){return speed*(typeof vMul==="function"?vMul():1)}
/* plate-1 landing x (screen = world at impact): CR_LEAD s of contact time ahead of the buggy's front, capped at the 760 px/s
   distance so the press stays on a 390x844 screen when vMul() makes the world faster (then it lands crLd() < CR_LEAD s out) */
function crLX(){return PX+pW()+CR_LEAD*Math.min(crV(),MAXV)}
function crLd(){return CR_LEAD*Math.min(crV(),MAXV)/Math.max(1,crV())}
/* plate width / a double's 2nd-plate offset: full size at top speed, narrower when slower (debug ?level=5 / lab runs), so a
   double always spans about the same TIME (tap-clearable at every speed, tested) */
function crW(){return Math.max(30,Math.min(CR_PW,Math.round(CR_PW*crV()/MAXV)))}
function crD2(){return crW()-16}  /* a double's 2nd plate overlaps the 1st by 16 px: one 64 px slab, cleared by one tap */
/* the telegraph strip for plate k (0, or 1 = a double's 2nd plate) during a wind-up: screen = world x where that plate will
   land, a little wider than the plate (tested on screen for the whole wind-up at 390x844 and desktop) */
var CR_SR={x:0,y:0,w:0,h:8};  /* h: 8 game px on desktop, 16 in portrait (>= 12 CSS px at 390x844) */
function crStrip(k){var r=CR_SR;r.x=Math.round(crX+(k?crD2()-crV()*CR_D2T:0))-4;r.w=crW()+8;var tl=typeof ZM==="number"&&ZM>1;r.h=tl?16:8;r.y=tl?GY-6:GY-4;return r}
function crReset(){crL5=-1;crKill=0;crQT=0;crQS=0;crQD=0;crQM1=0;crQM0=0;crEnd=0;crS=0;crT=0;crI=0;crH=0;crY=-200;crBan=0;crDn=0;crGo=0;crWait=0;crSeed=1;for(var i=0;i<CR_NPL;i++)crPL[i].on=0;for(i=0;i<CR_NP;i++)crPLf[i]=0}
function crOn(){return crS>=1&&crS<=6}
/* start rule: L5 reached (lvl from 06d), its banner/sting over (lvB 0 and LV_BANNER+0.5 s since the level change) */
/* armed only once THIS run has reached L5 (crL5 = runS when it did, reset with every new run), and after the L5 banner +
   sting (LV_BANNER + 0.5 s on the boss's own clock, not 06d's lvT) */
function crReady(){
  var bn=typeof LV_BANNER==="number"?LV_BANNER:1.5,lb=typeof lvB==="number"?lvB:0;
  return (!demo||CR_DEMO)&&state==="run"&&crL5>=0&&runS-crL5>=bn+.5&&lb<=0;
}
/* fair gap? the n plates that a wind-up starting NOW would land (CR_TW+CR_TD from now) keep >= CR_TAU s of contact time to
   every obstacle (and the predicted next spawn) on both sides */
function crFair(n){
  var fw=pW(),tw=CR_TW+CR_TD,wt=n===2?crD2()+crW():crW(),tc=crLd(),tb=tc+(wt+fw)/crV(),v=crV(),i,e,rel,a,b;
  for(i=0;i<ents.length;i++){
    e=ents[i];if(e.t==="k"||e.t==="u")continue;rel=v+(e.vx||0);
    a=(e.x-(PX+fw))/rel-tw;b=(e.x+e.w-PX)/rel-tw;
    if(!(a>=tb+CR_TAU||b<=tc-CR_TAU))return false;
  }
  if(typeof nextGap==="number"&&typeof spawnDist==="number"){
    var nx=W+20+(nextGap-spawnDist),nw=CR_NW[nt]||98,nr=v+(nt==="r"?110:0);
    a=(nx-(PX+fw))/nr-tw;b=(nx+nw-PX)/nr-tw;
    if(!(a>=tb+CR_TAU||b<=tc-CR_TAU))return false;
  }
  return true;
}
/* spawn thinning (needs a hook in 13 spawn(), see the header; the lab applies it by wrapping spawn()): while the press is
   active, every new gap gets CR_XG s of extra track, so each gap can hold a fair slam. Adds px to nextGap only: same RNG
   draws per spawn, score/speed untouched; it does move the spawns that follow (the spawn timeline) during the encounter */
var CR_THIN=1;
function crGap(){return CR_THIN&&crS>=1&&crS<=5?crV()*CR_XG:0}
function crPart(x,y,vx,vy,l,c,g){
  var i=crPI;crPI=(crPI+1)%CR_NP;crPX[i]=x;crPY[i]=y;crVX[i]=vx;crVY[i]=vy;crPLf[i]=l;crPA[i]=0;crPC[i]=c;crPG[i]=g;
}
/* dust puffs out sideways from x (hw = half the plate width: an impact's dust starts >= 4 px clear of the plate and
   flies away from it, so it never sits on or right next to the hot plate; it rides the track like the plates do) */
function crDust(x,n,s,hw){if(typeof rm==="function"&&rm())return;hw=hw||0;for(var k=0;k<n;k++){var d=k&1?1:-1,a=crR();crPart(x+d*(hw+(d>0?6:10)+a*14),GY-1,d*(20+crR()*s*.5)-crV(),-30-crR()*s*.5,.35+crR()*.3,3+(k&1),220)}}
function crBurst(cx,cy,n){if(typeof rm==="function"&&rm())return;for(var k=0;k<n;k++){var a=k*6.283/n+crR()*.3,s=90+crR()*200;crPart(cx,cy,Math.cos(a)*s,Math.sin(a)*s-60,.5+crR()*.6,k%3,380)}}
var crP1=0;
function crPlate(x){for(var i=0;i<CR_NPL;i++)if(!crPL[i].on){var p=crPL[i];p.on=1;p.x=x;p.w=crW();p.p=0;return i}return 0}
/* plate vs the buggy AS DRAWN (14-render drawPlayer, upright): two r=7 wheels 13 px either side of its centre at 7 px up,
   the chassis beam and the anvil body (48x20 from 11 to 31 px up; ducking 4.6..18.6), scaled with pW() for the big buggy.
   The plate's sprite IS its hitbox, so a clear never shows the buggy touching a plate and a touch is always a hit (no
   20% hit() trim here; the tap/hold windows are re-tested with it). */
function crBug(x,y,w,h){
  var k=pW()/PW,g=GY-py,cx=PX+22.5*k,dk=duck&&py===0,r=7*k,j,qx,qy,dx,dy;
  if(x<cx+25*k&&x+w>cx-23*k&&(dk?(y<g-4.6*k&&y+h>g-18.6*k):(y<g-11*k&&y+h>g-31*k)))return true;
  if(x<cx+13*k&&x+w>cx-13*k&&y<g-6*k&&y+h>g-8*k)return true;
  for(j=-1;j<=1;j+=2){qx=cx+13*k*j;qy=g-7*k;dx=Math.max(x-qx,0,qx-(x+w));dy=Math.max(y-qy,0,qy-(y+h));if(dx*dx+dy*dy<r*r)return true}
  return false;
}
/* absorb order like 13 (inv -> shield -> Spare Core -> die), without the RNG-drawing sparks() */
function crHit(){
  var ph=pH(duck&&py===0),pw=pW(),pt=GY-py-ph,i,p;
  for(i=0;i<CR_NPL;i++){
    p=crPL[i];if(!p.on)continue;
    if(!crBug(p.x,GY-CR_PH,p.w,CR_PH))continue;
    if(inv>0)return;
    if(shd){shd=0;shdP=0;typeof skShieldBreak==="function"&&skShieldBreak();sfx(900,180,.25,2,.09);crBurst(PX+pw/2,pt+ph/2,14);if(!rm())shake=.15;return}
    if(typeof cores==="number"&&cores>0&&typeof skReboot==="function"){skReboot(pt,ph);for(var j=0;j<CR_NPL;j++)if(crPL[j].x<PX+pw+300)crPL[j].on=0;skClear(pw);return}
    crKill=1;die();return;
  }
}
/* per sim step, at the end of update() (run or over). Reads speed/ents/level, writes only boss state + its own pools */
function crTick(dt){
  var i;
  /* a new run (state entered "run", or runS went back): drop everything from the last one, whatever order the ticks run in */
  if((state==="run"&&crPS!=="run")||runS<crRS||(state==="run"&&runS<=dt))crReset();
  crRS=runS;crPS=state;
  for(i=0;i<CR_NP;i++)if(crPLf[i]>0){crPA[i]+=dt;if(crPA[i]>=crPLf[i]){crPLf[i]=0;continue}crVY[i]+=crPG[i]*dt;crPX[i]+=crVX[i]*dt;crPY[i]+=crVY[i]*dt}
  if(crBan>0)crBan=Math.max(0,crBan-dt);
  if(state!=="run"){if(state==="over"&&crS>=1&&crS<=5&&!crEnd){crEnd=1;crQM0=1}return}  /* died mid-boss: stop the boss loop once */
  for(i=0;i<CR_NPL;i++){var p=crPL[i];if(p.on){p.x-=crV()*dt;p.p+=dt;if(p.x+p.w<-20)p.on=0}}
  /* demo autopilot (13 auto() only sees ents): jump each plate ~0.1 s before it arrives (inside the tap window at every speed) */
  if(demo&&py===0&&jb<=0)for(i=0;i<CR_NPL;i++){var q=crPL[i];if(q.on){var tq=(q.x-(PX+pW()))/crV();if(tq>0&&tq<.1){press();break}}}
  var tx=crLX();crT+=dt;
  if(crS===0&&crL5<0&&crLv()>=5)crL5=runS;
  if(crS===0){if(crReady()){crS=1;crT=0;crX=tx+20;crY=-OY-60;crQM1=1}return}
  if(crS===1){crX+=(tx-crX)*Math.min(1,dt*4);crY=-OY-60+(GY-CR_HY-(-OY-60))*Math.min(1,crT/CR_IN);if(crT>=CR_IN){crS=2;crT=0}}
  else if(crS===2){
    crX+=(tx-crX)*Math.min(1,dt*6);crY=GY-CR_HY;crWait+=dt;
    if(crI>=CR_PAT.length){crS=6;crT=0;crDn=1;crQD=1;crQM0=1;crBan=CR_BAN;crBurst(crX+crW()/2,GY-CR_HY-20,28);crBurst(XO+VW/2,(typeof lvY==="function"?lvY():60)-10,28);
      if(!demo){typeof skEarn==="function"&&skEarn(20);typeof msOn==="function"&&msOn("boss")}}
    else if(CR_PAT[crI]===0){crS=5;crT=0}
    else if(crT>=CR_RS&&crFair(CR_PAT[crI])){crN=CR_PAT[crI];crS=3;crT=0;crX=tx;crQT++}
  }
  else if(crS===3){crX=tx;crY=GY-CR_HY-10*Math.min(1,crT/CR_TW);if(crT>=CR_TW*.3&&((crT*20)|0)!==(((crT-dt)*20)|0))crDust(crX+20,2,90);if(crT>=CR_TW){crS=4;crT=0;crH=0}}
  else if(crS===4){
    /* drop, impact (plate 1), a double's 2nd hit CR_D2T later (crD2() px further along the track), rest, lift */
    var t1=CR_TD,t2=crN===2?CR_TD+CR_D2T:-1;
    if(crH===0&&crT>=t1){crH=1;crP1=crPlate(crX);crQS++;crDust(crX+crW()/2,8,160,crW()/2);if(!rm())shake=Math.max(shake,.1)}
    if(crH===1&&t2>0&&crT>=t2){crH=2;crPlate(crPL[crP1].x+crD2());crQS++;crDust(crPL[crP1].x+(crD2()+crW())/2,6,140,(crD2()+crW())/2);if(!rm())shake=Math.max(shake,.1)}
    var end=(t2>0?t2:t1)+CR_DW+CR_TU;
    if(crT>=end){crS=2;crT=0;crI++;crWait=0}
  }
  else if(crS===5){crY=GY-CR_HY;if(crT>=CR_PZ){crS=2;crT=0;crI++}}
  else if(crS===6){crY-=dt*(140+crT*500);if(crT>=1.6){crS=7;crT=0}}
  crHit();
}
/* sounds/music from the DRAW path, guarded; each queued event plays exactly once */
function crSnd(){
  var es=typeof enemySfx==="function";
  if(crQM1){crQM1=0;if(typeof bossMusic==="function"){try{bossMusic(true)}catch(e){}}}
  while(crQT>0){crQT--;if(es){try{enemySfx("crusher","telegraph")}catch(e){}}}
  while(crQS>0){crQS--;if(es){try{enemySfx("crusher","slam")}catch(e){}}}
  if(crQD){crQD=0;if(es){try{enemySfx("crusher","down")}catch(e){}}}
  if(crQM0){crQM0=0;if(typeof bossMusic==="function"){try{bossMusic(false)}catch(e){}}}
}
/* ---------- art ---------- */
function crDrawPlates(){
  /* hot iron plate: the opaque sprite is exactly its hitbox (w x CR_PH, no outline overhang); the heat shimmer and glow
     above it are translucent */
  var t=typeof enTm==="function"?enTm():tt,mo=!rm();
  for(var i=0;i<CR_NPL;i++){var p=crPL[i];if(!p.on)continue;var x=Math.round(p.x),w=p.w,y=GY-CR_PH,pu=mo?.5+.5*Math.sin(t*14+i):1;
    /* no glow/shimmer while the plate passes under the buggy (drawn x PX-1..PX+48): nothing drawn touches a clean clear */
    if(mo&&(x>PX+56||x+w<PX-8)){
      for(var k=0;k<3;k++){var ph=(t*1.8+k*.33+i*.2)%1;ctx.globalAlpha=.35*(1-ph);ctx.fillStyle=k&1?"#fdba74":"#fde047";ctx.fillRect(x+6+k*Math.round((w-16)/2)+Math.round(Math.sin(t*9+k*2)*2),y-4-Math.round(ph*14),3,5)}
      ctx.globalAlpha=1}
    /* dark rim (inside the hitbox) keeps >= 3:1 against a bright head face / dust / sky behind it */
    ctx.fillStyle="#05070d";ctx.fillRect(x,y,w,CR_PH);
    ctx.fillStyle=OR;ctx.fillRect(x+1,y+1,w-2,CR_PH-2);
    ctx.fillStyle=pu>.6?"#fef08a":"#fde047";ctx.fillRect(x+2,y+2,w-4,CR_PH-4);
    ctx.fillStyle="#fef3c7";ctx.fillRect(x+6,y+4,w-12,1);
  }
}
function crDrawPress(){
  if(crS<1||crS>6)return;
  var t=typeof enTm==="function"?enTm():tt,pw=crW(),d2=crD2(),x=Math.round(crX),hy=crY,sh=0,lit=0,w=84,HH=44,cx=x+pw/2;
  var ty=GY-CR_PH-HH,dx2=Math.round(d2-crV()*CR_D2T);  /* head resting on a fresh plate; a double's 2nd hit is dx2 px along */
  if(crS===3){var q=crT/CR_TW;lit=q;if(!rm())sh=((t*40)|0)&1?1+Math.round(q):-1-Math.round(q)}
  if(crS===4){var t1=CR_TD,t2=crN===2?CR_TD+CR_D2T:-1;
    if(crT<t1)hy=GY-CR_HY-10+(ty-(GY-CR_HY-10))*(crT/t1);
    else if(t2>0&&crT<t2){var u=(crT-t1)/CR_D2T;hy=ty-16*Math.sin(u*3.1416);cx+=Math.round(dx2*u)}
    else{var t0=t2>0?t2:t1,v=Math.max(0,(crT-t0-CR_DW)/CR_TU);hy=ty+(GY-CR_HY-ty)*Math.min(1,v);if(t2>0)cx+=dx2}
    lit=1}
  if(crS===6&&!rm()&&crT<.5)sh=((t*30)|0)&1?2:-2;
  cx=Math.round(cx+sh);var top=-OY-20,hx=cx-w/2,hb=hy+HH;
  /* telegraph: a light cone from the head down to the track, a ground shadow that widens/darkens, red landing marks */
  if(crS===3||(crS===4&&crT<CR_TD)){
    var a=crS===3?Math.min(1,crT/CR_TW):1,fl=rm()?1:(((t*10)|0)&1?1:.6),sw=Math.round(w*.6+w*.5*a);
    ctx.globalAlpha=(.06+.14*a)*fl;ctx.fillStyle="#ef4444";ctx.fillRect(cx-w/2+6,hb,w-12,GY-hb);
    ctx.globalAlpha=.35+.5*a;ctx.fillStyle="#05070d";ctx.fillRect(cx-sw/2,GY-5,sw,6);ctx.fillRect(cx-sw/2+8,GY-8,sw-16,3);
    ctx.globalAlpha=1;
  }
  /* gantry beam + twin guide rails + piston rod */
  ctx.fillStyle="#05070d";ctx.fillRect(cx-46,top,92,18);ctx.fillStyle="#334155";ctx.fillRect(cx-44,top+2,88,14);
  ctx.fillStyle="#fde047";for(var k=0;k<5;k++)ctx.fillRect(cx-40+k*17,top+6,8,6);
  ctx.fillStyle="#05070d";ctx.fillRect(cx-13,top+16,26,hy-top-14);ctx.fillStyle="#64748b";ctx.fillRect(cx-11,top+16,22,hy-top-14);
  ctx.fillStyle="#cbd5e1";ctx.fillRect(cx-11,top+16,4,hy-top-14);ctx.fillStyle="#475569";ctx.fillRect(cx+6,top+16,3,hy-top-14);
  /* head: riveted steel block, hazard chevrons, hot striking face */
  ctx.fillStyle="#05070d";ctx.fillRect(hx-3,hy-3,w+6,HH+5);
  ctx.fillStyle="#475569";ctx.fillRect(hx,hy,w,HH-12);ctx.fillStyle="#cbd5e1";ctx.fillRect(hx,hy,w,3);ctx.fillStyle="#334155";ctx.fillRect(hx,hy+HH-15,w,3);
  for(k=0;k<5;k++){ctx.fillStyle=k&1?"#05070d":"#fde047";ctx.fillRect(hx+5+k*15,hy+11,13,10)}
  ctx.fillStyle="#94a3b8";ctx.fillRect(hx+3,hy+5,3,3);ctx.fillRect(hx+w-6,hy+5,3,3);
  ctx.fillStyle=lit>0?(lit>.7?"#fde047":OR):"#9a3412";ctx.fillRect(hx,hb-12,w,12);
  ctx.fillStyle="#05070d";ctx.fillRect(hx+4,hb-14,w-8,2);ctx.fillRect(hx,hb-4,w,4);  /* dark lip: the hot face never merges with the plate */
  /* hot glow under the striking face (always a little, stronger as it winds up / slams) */
  if(hb<GY-CR_PH-16){ctx.globalAlpha=.18+.4*lit;ctx.fillStyle=OR;ctx.fillRect(hx-6,hb,w+12,6);ctx.globalAlpha=.1+.25*lit;ctx.fillRect(hx-10,hb+6,w+20,8);ctx.globalAlpha=1}  /* not while it sits on a plate */
  /* eyes: cyan while hovering, red while winding up / slamming */
  ctx.fillStyle=crS===3||crS===4?"#ef4444":"#67e8f9";ctx.fillRect(hx+10,hy+4,10,4);ctx.fillRect(hx+w-20,hy+4,10,4);
  if(crS===6){ctx.globalAlpha=Math.max(0,.8-crT);ctx.fillStyle="#ffffff";ctx.fillRect(hx,hy,w,HH);ctx.globalAlpha=1;
    if(!rm()){ctx.fillStyle="#05070d";ctx.fillRect(hx+w*.45,hy,3,HH);ctx.fillRect(hx+w*.3,hy+HH*.5,w*.3,2)}}
  /* impact flash */
  if(crS===4&&crT>=CR_TD&&crT<CR_TD+.12&&!rm()){ctx.globalAlpha=1-(crT-CR_TD)/.12;var fx=Math.round(crPL[crP1].x);ctx.fillStyle="#fde047";ctx.fillRect(fx-18,GY-5,12,5);ctx.fillRect(fx+pw+6,GY-5,12,5);ctx.globalAlpha=1}  /* beside the plate, never over it */
}
function crDrawParts(){
  /* a particle that would cover the buggy is skipped (draw-only; dust never "touches" a clean clear) */
  for(var i=0;i<CR_NP;i++)if(crPLf[i]>0&&!crBug(crPX[i]|0,crPY[i]|0,4,4)){ctx.globalAlpha=1-crPA[i]/crPLf[i];ctx.fillStyle=CR_PCL[crPC[i]];ctx.fillRect(crPX[i]|0,crPY[i]|0,crPC[i]>2?4:3,crPC[i]>2?4:3)}
  ctx.globalAlpha=1;
}
/* world layer (after the entities): plates, press, particles; plays queued sounds */
/* the landing zone, drawn last (over the dust/debris): a bright strip on the track at each plate's landing spot with a
   glow above it, pulsing red -> orange -> yellow through the whole wind-up (until the head lands) */
function crDrawStrip(){
  if(!(crS===3||(crS===4&&crT<CR_TD)))return;
  var a=crS===3?Math.min(1,.4+crT/CR_TW):1,pc=rm()?1:.5+.5*Math.sin(crT*31),col=pc>.66?"#fde047":pc>.33?"#fb923c":"#ef4444";
  for(var j=0;j<crN;j++){var r=crStrip(j);
    ctx.globalAlpha=(.3+.3*pc)*a;ctx.fillStyle="#ef4444";ctx.fillRect(r.x,r.y-18,r.w,18);ctx.fillStyle="#fb923c";ctx.fillRect(r.x+3,r.y-8,r.w-6,8);
    ctx.globalAlpha=1;ctx.fillStyle="#05070d";ctx.fillRect(r.x-2,r.y-2,r.w+4,r.h+4);ctx.fillStyle=col;ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.globalAlpha=.7*pc;ctx.fillStyle="#ffffff";ctx.fillRect(r.x+2,r.y+2,r.w-4,2)}
  ctx.globalAlpha=1;
}
function crDraw(){crSnd();if(state==="start")return;crDrawParts();crDrawPlates();crDrawPress();crDrawStrip()}  /* dust behind the plates */
/* HUD layer: the CRUSHER DOWN! banner (LEVELS banner style, a bit bigger) */
function crHud(){
  if(!(crBan>0)||state==="start")return;
  var e=CR_BAN-crBan,s="CRUSHER DOWN!",y=(typeof lvY==="function"?lvY():Math.round(H*.42))+(OY?0:-6);
  ctx.globalAlpha=rm()?1:Math.min(1,e/.15,crBan/.5);
  txt(s,XO+VW/2,y,fitPx(s,36*HS,VW-24,true,true),"#fde047","center",true,true,true,rm()?"":OR,"crb");
  ctx.globalAlpha=1;
}
`;
