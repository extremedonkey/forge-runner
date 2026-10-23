// ENEMIES v2 (owner: Levels, handed over by Dev): forge skins + telegraphs for three enemies, drawn in the neon pixel style.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// INERT on the site/Poki builds until hooks land (nothing calls it there). The LAB build (scripts/build-lab.mjs,
// src/client/lab/enemies-v2.js) wraps spawn()/update()/drawEnts() to call enTag/enPre/enPost/enDrawEnts.
//   SLAG BLOB  'l' = skin on a ground bug 'b' (e.sk="l"): same 30x21 hitbox and bug rules; can be STOMPED (fall onto it):
//                    +3 sparks (skEarn), msOn("stomp"), bounce. Big cart still flattens it (bug rule).
//   EMBER VENT 'v' = skin on a pillar 'p' (e.sk="v"): same 26x50 hitbox (always solid, like the pillar). Grate glows, rumbles
//                    and smokes for 0.6 s (EN_VT), then the ember column bursts EN_VB s before it reaches the buggy.
//   HAMMER DRONE 'h' = a drone 'd' turned into e.t="h": same 30x15 hitbox; hovers at bot 60, winds the hammer up for 0.5 s
//                    (EN_HT), then slams down to bot 16 (the drone's low position) EN_HS s before it reaches the buggy, and
//                    stays down -> duck. msOn("drone") when it passes the buggy.
// Timing budget: everything spawns at x=W+20 (W=600 logical), i.e. 519 px = 0.68 s from the buggy at the 760 px/s cap (all
// three unlock at 40-60 s, when speed is 620-760). So the leads are chosen to fit a FULL telegraph even at the cap:
// vent telegraph 0.6 s + burst at 0.08 s lead; drone wind-up 0.5 s + slam at 0.18 s lead (down by 0.10 s lead).
// Unlock, one at a time: base-curve time 40 / 50 / 60 s (EN_SEC, like LV_AT) OR the matching level (L2 / L3 / L4, via
// currentLevel()). Before that (and in L1 before 40 s) the current enemies are unchanged; L5 has all three mixed in.
// Sim-path rules: NO Math.random here (the spawn RNG sequence is untouched: skins are chosen from the existing e.v roll and
// the level), never writes score/speed/spawnDist/nextGap/nt. SFX (08f, Audio) are called guarded with typeof.
export default String.raw`
var EN_SEC={l:40,v:50,h:60},EN_LV={l:2,v:3,h:4},EN_VT=.6,EN_VB=.08,EN_HT=.5,EN_HS=.18,EN_SW=.08;
function enBase(t){var tm=(MAXV-START)/7,a=Math.min(t,tm);return .05*(START*a+3.5*a*a+MAXV*Math.max(0,t-tm))}
var EN_AT={l:Math.floor(enBase(EN_SEC.l)),v:Math.floor(enBase(EN_SEC.v)),h:Math.floor(enBase(EN_SEC.h))};
function enLvl(){return typeof currentLevel==="function"?currentLevel():1}
function enOn(k){return score>=EN_AT[k]||enLvl()>=EN_LV[k]}
function enSfx(f){if(typeof f==="function"){try{f()}catch(e){}}}
/* Audio's enemySfx(type,event) ('slag'|'vent'|'drone' x 'telegraph'|'burst'|'swing'|'hover'; cooldowns + mute inside) when it
   exists, else the 08f one-shots. Only ever called from enSnd() in the DRAW path, so sound can never touch the sim or its RNG. */
function enEv(ty,ev,fb){if(typeof enemySfx==="function"){try{enemySfx(ty,ev)}catch(e){}}else enSfx(fb)}
var EN_POP=0;
function enMs(ev){if(!demo&&typeof msOn==="function"){try{msOn(ev)}catch(e){}}}
/* skin a freshly spawned entity (call once per new ent, right after spawn()) */
function enTag(e){
  if(!e||e.sk||e.t==="h")return;
  if(e.t==="b"&&enOn("l")&&(e.v===1||enLvl()===2))e.sk="l";
  else if(e.t==="p"&&enOn("v"))e.sk="v";
  else if(e.t==="d"&&enOn("h")){e.t="h";e.bot=60;e.hs=0;e.hw=0}
}
/* timings from the distance to the buggy (speed = relative speed: none of these move on their own) */
function enDx(e){return e.x-(PX+pW())}
function enVentT(e){return (enDx(e)-speed*EN_VB)/speed}        /* s until the burst (<= 0: bursting) */
function enHamT(e){return (enDx(e)-speed*EN_HS)/speed}         /* s until the slam */
/* stomp particle pool (fixed, preallocated; deterministic directions: no Math.random) */
var EN_NP=20,enPX=new Float32Array(EN_NP),enPY=new Float32Array(EN_NP),enVX=new Float32Array(EN_NP),enVY=new Float32Array(EN_NP),enPL=new Float32Array(EN_NP);
function enBurst(x,y){if(rm())return;for(var i=0;i<EN_NP;i++){var a=3.4+i*2.9/EN_NP;enPX[i]=x;enPY[i]=y;enVX[i]=Math.cos(a)*(90+i%4*40);enVY[i]=Math.sin(a)*(120+i%3*50);enPL[i]=.45}}
/* before each sim step: stomps, hammer-drone height */
function enPre(dt){
  var pw=pW(),ph=pH(duck&&py===0);
  for(var i=ents.length-1;i>=0;i--){
    var e=ents[i];
    if(e.sk==="l"&&vy<0&&py>=9&&py<=e.h+12&&!big()){
      var ax=PX+pw*.2,aw=pw*.6,bx=e.x+e.w*.2,bw=e.w*.6;
      if(ax<bx+bw&&ax+aw>bx){
        ents.splice(i,1);vy=JV*.6;
        if(typeof skEarn==="function")skEarn(3);
        enMs("stomp");EN_POP++;enBurst(e.x+e.w/2,GY-e.h);
        continue;
      }
    }
    if(e.t==="h"){
      var ts=enHamT(e);
      if(ts>EN_HT){e.hs=0;e.bot=60}
      else if(ts>0){if(e.hs<1){e.hs=1;e.hw=0}e.hw+=dt;e.bot=60}
      else{if(e.hs<2){e.hs=2;e.hw=0}e.hw+=dt;var k=Math.min(1,e.hw/EN_SW);e.bot=Math.round(60-44*k);if(k>=1)e.hs=3}
    }
  }
}
/* after each sim step: one-shot SFX at telegraph/burst/swing, drone dodges, particles */
function enPost(dt){
  var vis=XO+VW+8;
  for(var i=0;i<ents.length;i++){
    var e=ents[i];
    if(e.t==="h"&&!e.dg&&e.x+e.w<PX){e.dg=1;enMs("drone")}
  }
  for(var j=0;j<EN_NP;j++)if(enPL[j]>0){enPL[j]-=dt;enVY[j]+=600*dt;enPX[j]+=(enVX[j]-speed)*dt;enPY[j]+=enVY[j]*dt}
}
/* sound triggers (presentation only; e.s1/e.s2 flags make each one-shot fire once per enemy). The vent hiss and drone wind-up
   fire even while the enemy is still just off the right edge: at speed the sound is part of the telegraph. */
function enSnd(){
  var vis=XO+VW+8;
  for(;EN_POP>0;EN_POP--)enEv("slag","burst",typeof sfxBlobPop==="function"?sfxBlobPop:0);
  for(var i=0;i<ents.length;i++){
    var e=ents[i];
    if(e.sk==="v"){
      var tv=enVentT(e);
      if(!e.s1&&tv<=EN_VT){e.s1=1;enEv("vent","telegraph",typeof sfxVentHiss==="function"?sfxVentHiss:0)}
      if(!e.s2&&tv<=0){e.s2=1;enEv("vent","burst",typeof sfxVentWhoosh==="function"?sfxVentWhoosh:0)}
    }else if(e.t==="h"){
      if(e.x<vis&&e.x+e.w>XO)enEv("drone","hover",typeof sfxDroneWhirr==="function"?sfxDroneWhirr:0);
      if(!e.s1&&e.hs>=1){e.s1=1;enEv("drone","telegraph",typeof sfxDroneWindup==="function"?sfxDroneWindup:0)}
      if(!e.s2&&e.hs>=2){e.s2=1;enEv("drone","swing",typeof sfxDroneClang==="function"?sfxDroneClang:0)}
    }else if(e.sk==="l"&&!e.s1&&e.x<vis){e.s1=1;enEv("slag","telegraph",typeof sfxBlobHop==="function"?sfxBlobHop:0)}
  }
}
/* ---------- art (neon pixel style; 3-unit pixels like the other sprites) ---------- */
var EN_BLOB=[["....oo....","..oooooo..",".ooyyyyoo.","oyykyykyyo","oyyyyyyyyo","rooyyyyoor","rrrrrrrrrr"],
             ["..........","...oooo...",".ooyyyyoo.","oyykyykyyo","oyyyyyyyyo","ooyyyyyyoo","rrrrrrrrrr"]];
var EN_BP=[{o:OR,y:"#fde047",k:"#431407",r:"#b91c1c"},{o:"#fb923c",y:"#fef08a",k:"#431407",r:"#dc2626"}];
var EN_TMP=[],EN_OUT={o:"#05070d",y:"#05070d",k:"#05070d",r:"#05070d"};
function enTm(){return rm()?0:tt}
function enDrawBlob(e){
  var x=Math.round(e.x),y=GY-e.bot-e.h,t=enTm(),f=((t*5+x*.03)|0)&1;
  ctx.globalAlpha=.3+(rm()?0:.12*Math.sin(t*6+x*.05));ctx.fillStyle="#fde047";ctx.fillRect(x-6,y-5,e.w+12,e.h+7);
  ctx.globalAlpha=.35;ctx.fillStyle=OR;ctx.fillRect(x-3,y-2,e.w+6,e.h+3);ctx.globalAlpha=1;
  /* dark 2-unit outline so it reads on the orange Slag Pits tint */
  spr(EN_BLOB[f],x-2,y,3,EN_OUT);spr(EN_BLOB[f],x+2,y,3,EN_OUT);spr(EN_BLOB[f],x,y-2,3,EN_OUT);
  spr(EN_BLOB[f],x,y,3,EN_BP[e.v|0]);
  /* molten trail behind it + puddle glow */
  ctx.fillStyle=OR;ctx.fillRect(x-3,GY-2,e.w+6,2);
  ctx.globalAlpha=.6;ctx.fillRect(x+e.w+2,GY-2,6,2);ctx.globalAlpha=.3;ctx.fillRect(x+e.w+10,GY-2,5,2);ctx.globalAlpha=1;
  /* drip bubbles rising off the top */
  if(!rm()){var b=(t*1.6+x*.01)%1;ctx.globalAlpha=1-b;ctx.fillStyle="#fde047";ctx.fillRect(x+9+((x>>3)&7),y-2-Math.round(b*8),2,2);ctx.globalAlpha=1}
}
function enDrawVent(e){
  var x=Math.round(e.x),t=enTm(),tv=enVentT(e),tele=tv<=EN_VT&&tv>0,on=tv<=0,p=tele?1-tv/EN_VT:on?1:0;
  var jx=tele&&!rm()?((((t*40)|0)&1)?1:-1):0;
  /* danger silhouette: the 26x50 column (its hitbox) outlined, brighter as the burst nears */
  if(!on){
    var pu=rm()?1:.7+.3*Math.sin(t*30),hh=Math.round(e.h*p);
    /* the vent's always-solid 26x50 hitbox reads as a dark heat-glass stack with a red neon edge */
    ctx.fillStyle="#05070d";ctx.fillRect(x-1,GY-e.h-1,e.w+2,e.h+1);
    ctx.fillStyle="#3b0a0a";ctx.fillRect(x+1,GY-e.h+1,e.w-2,e.h-1);
    /* telegraph: molten heat rises from the grate and fills the column over the 0.6 s */
    if(tele){
      ctx.fillStyle="#dc2626";ctx.fillRect(x+1,GY-hh,e.w-2,hh);
      ctx.fillStyle=OR;ctx.fillRect(x+4,GY-Math.round(hh*.8),e.w-8,Math.round(hh*.8));
      ctx.globalAlpha=pu;ctx.fillStyle="#fde047";ctx.fillRect(x+1,GY-hh,e.w-2,2);ctx.globalAlpha=1;
      ctx.globalAlpha=(.2+.35*p)*pu;ctx.fillStyle=OR;ctx.fillRect(x-7,GY-e.h-7,e.w+14,e.h+7);ctx.globalAlpha=1;
    }
    ctx.globalAlpha=tele?.6+.4*pu:.9;ctx.strokeStyle=tele&&p>.5&&pu>.85?"#fde047":"#ef4444";ctx.lineWidth=2;ctx.strokeRect(x+1,GY-e.h+1,e.w-2,e.h-2);ctx.globalAlpha=1;
    /* glow pool on the floor */
    ctx.globalAlpha=.25+.5*p;ctx.fillStyle=OR;ctx.fillRect(x-8,GY-3,e.w+16,3);ctx.globalAlpha=1;
  }
  if(on){
    var fl=rm()?0:((t*14)|0)&3;
    ctx.globalAlpha=.25;ctx.fillStyle="#ef4444";ctx.fillRect(x-5,GY-e.h-8,e.w+10,e.h+8);ctx.globalAlpha=1;
    ctx.fillStyle="#dc2626";ctx.fillRect(x,GY-e.h+fl,e.w,e.h-fl);
    ctx.fillStyle=OR;ctx.fillRect(x+4,GY-e.h+6+fl,e.w-8,e.h-6-fl);
    ctx.fillStyle="#fde047";ctx.fillRect(x+9,GY-e.h+14-fl,e.w-18,e.h-14+fl);
    for(var q=0;q<6;q++){var ph=(t*1.3+q*.17)%1;ctx.globalAlpha=1-ph;ctx.fillStyle=q&1?"#fde047":OR;ctx.fillRect(x+3+((q*7)%20)+Math.round(Math.sin(t*4+q)*3),GY-e.h-4-Math.round(ph*26),3,3)}
    ctx.globalAlpha=1;
  }else{
    /* smoke puffs while it builds up */
    for(var s=0;s<3;s++){var sp=((rm()?.3:t*(.8+p))+s*.33)%1;ctx.globalAlpha=(.15+.45*p)*(1-sp);ctx.fillStyle="#94a3b8";var sz=3+Math.round(sp*5);ctx.fillRect(x+6+s*6+jx,GY-8-Math.round(sp*(18+22*p)),sz,sz)}
    ctx.globalAlpha=1;
  }
  /* the grate: steel housing with three slits glowing with heat */
  ctx.fillStyle="#1f2937";ctx.fillRect(x-3+jx,GY-7,e.w+6,7);
  ctx.fillStyle="#475569";ctx.fillRect(x-3+jx,GY-7,e.w+6,1);
  var hc=on?"#fde047":p>.5?OR:p>0?"#ef4444":"#7f1d1d";
  if(tele&&!rm()&&((t*16)|0)&1)hc="#fde047";
  ctx.fillStyle=hc;for(var g=0;g<3;g++)ctx.fillRect(x+2+g*8+jx,GY-5,5,3);
}
function enDrawDrone(e){
  var x=Math.round(e.x),y=GY-e.bot-e.h,t=enTm(),wind=e.hs===1,dn=e.hs>=2;
  var hot=wind&&!rm()&&((t*12)|0)&1;
  /* height marker to the ground once it's winding up / down (like the old drone's beam) */
  if(wind||dn){ctx.globalAlpha=dn?.35:.2+.25*(hot?1:0);ctx.fillStyle="#ef4444";ctx.fillRect(x+13,y+e.h,4,Math.max(0,e.bot-2));ctx.fillRect(x-2,GY-2,e.w+4,2);ctx.globalAlpha=1}
  /* rotor */
  var rw=rm()?28:(((t*30)|0)&1?32:18);
  ctx.fillStyle="#f1f5f9";ctx.fillRect(x+15-rw/2,y-7,rw,2);ctx.fillStyle="#64748b";ctx.fillRect(x+14,y-5,2,3);
  /* chassis + eye */
  ctx.fillStyle="#05070d";ctx.fillRect(x+3,y-3,24,10);
  ctx.fillStyle="#1e293b";ctx.fillRect(x+4,y-2,22,8);ctx.fillStyle=CY;ctx.fillRect(x+4,y-2,22,1);ctx.fillRect(x+4,y+5,22,1);
  ctx.fillStyle=wind||dn?"#ef4444":CY;ctx.fillRect(x+6,y+1,4,3);
  ctx.fillStyle="#475569";ctx.fillRect(x+22,y+1,3,4);
  /* hammer on its arm: hangs back while hovering, cocked up behind during the wind-up, slammed straight down */
  var a=dn?0:wind?-2.3*Math.min(1,e.hw/.2):-.5+(rm()?0:.12*Math.sin(t*4));
  if(e.hs===2)a=-2.3*(1-Math.min(1,e.hw/EN_SW));
  ctx.save();ctx.translate(x+15,y+5);ctx.rotate(a);
  ctx.fillStyle="#64748b";ctx.fillRect(-1,0,3,5);
  ctx.globalAlpha=.35;ctx.fillStyle=hot||dn?"#fde047":OR;ctx.fillRect(-14,1,28,13);ctx.globalAlpha=1;
  ctx.fillStyle="#05070d";ctx.fillRect(-11,3,22,9);
  ctx.fillStyle=OR;ctx.fillRect(-10,4,20,7);ctx.fillStyle="#fdba74";ctx.fillRect(-10,4,20,2);
  ctx.fillStyle=hot||dn?"#ffffff":"#fde047";ctx.fillRect(-10,9,20,2);
  ctx.restore();
  if(wind&&!rm()){ctx.globalAlpha=.25+.35*(hot?1:0);ctx.fillStyle="#ef4444";ctx.fillRect(x-4,y-9,e.w+8,e.h+12);ctx.globalAlpha=1}
}
/* edge warning while a telegraph is running but the enemy is still off the right edge (fast speeds / portrait) */
function enEdge(){
  if(state!=="run")return;
  var ex=XO+VW,i,e,t=enTm(),bl=rm()||((t*10)|0)&1;
  for(i=0;i<ents.length;i++){
    e=ents[i];if(e.x<ex-4)continue;
    if(e.t==="h"&&e.hs>=1){ctx.globalAlpha=bl?.9:.4;ctx.fillStyle="#ef4444";ctx.fillRect(ex-6,GY-e.bot-e.h-4,4,e.h+6);ctx.fillRect(ex-12,GY-e.bot-e.h+4,4,4);ctx.globalAlpha=1}
    if(e.sk==="v"&&enVentT(e)<=EN_VT){ctx.globalAlpha=bl?.8:.35;ctx.fillStyle=OR;ctx.fillRect(ex-6,GY-30,4,30);ctx.fillStyle="#94a3b8";ctx.fillRect(ex-12,GY-38-((t*30)|0)%10,4,4);ctx.globalAlpha=1}
  }
}
function enDraw(e){if(e.sk==="l")enDrawBlob(e);else if(e.sk==="v")enDrawVent(e);else if(e.t==="h")enDrawDrone(e);else return false;return true}
/* draw wrapper: the original drawEnts() draws everything except v2 enemies (reused array, no allocation), then the v2 ones */
function enDrawEnts(orig){
  var keep=ents,i,n=0;
  EN_TMP.length=0;
  for(i=0;i<keep.length;i++){var e=keep[i];if(e.sk||e.t==="h")n++;else EN_TMP.push(e)}
  if(!n){orig();}else{ents=EN_TMP;try{orig()}finally{ents=keep}for(i=0;i<keep.length;i++)enDraw(keep[i])}
  for(var j=0;j<EN_NP;j++)if(enPL[j]>0){ctx.globalAlpha=Math.min(1,enPL[j]*3);ctx.fillStyle=j&1?"#fde047":OR;ctx.fillRect(enPX[j]|0,enPY[j]|0,3,3)}
  ctx.globalAlpha=1;
  enEdge();
  if(state==="run")enSnd();
}

`;
