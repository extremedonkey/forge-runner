// ENEMIES v2 (owner: Levels, handed over by Dev): forge skins + telegraphs for three enemies, drawn in the neon pixel style.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// INERT on the site/Poki builds until hooks land (nothing calls it there). The LAB build (scripts/build-lab.mjs,
// src/client/lab/enemies-v2.js) wraps spawn()/update()/drawEnts() to call enTag/enPre/enPost/enDrawEnts.
//   SLAG BLOB  'l' = skin on a ground bug 'b' (e.sk="l"): same 30x21 hitbox and bug rules; can be STOMPED (fall onto it):
//                    +3 sparks (skEarn), msOn("stomp"), bounce. Big cart still flattens it (bug rule).
//   EMBER VENT 'v' = skin on a pillar 'p' (e.sk="v"): same 26x50 hitbox (always solid, like the pillar). Grate glows, rumbles
//                    and smokes for 0.6 s (EN_VT), then the ember column bursts EN_VB s before it reaches the buggy.
//   HAMMER DRONE 'h' = a drone 'd' turned into e.t="h": same 30x15 hitbox. Hovers high (drawn at EN_HV, above any jump) with
//                    NO hitbox, winds the hammer up for 0.53 s (EN_HT), then dives/slams EN_HS s before it reaches the buggy and
//                    from then on is exactly the old drone's low state (30x15 at bot 16): duck under it OR jump over it, like
//                    before; a jump is never hit by the hover, the wind-up or the dive. msOn("drone") when it passes the buggy.
// Timing budget: everything spawns at x=W+20 (W=600 logical), i.e. 519 px = 0.68 s from the buggy at the 760 px/s cap (all
// three unlock at 40-60 s, when speed is 620-760). So the leads are chosen to fit a FULL telegraph even at the cap:
// vent telegraph 0.6 s + burst at 0.08 s lead; drone wind-up 0.53 s + slam at 0.15 s lead (a 0.05 s dive: down by 0.10 s lead, as before).
// Unlock, one at a time: base-curve time 40 / 50 / 60 s (EN_SEC, like LV_AT) OR the matching level (L2 / L3 / L4, via
// currentLevel()). Before that (and in L1 before 40 s) the current enemies are unchanged; L5 has all three mixed in.
// Sim-path rules: NO Math.random here (the spawn RNG sequence is untouched: skins are chosen from the existing e.v roll and
// the level), never writes score/speed/spawnDist/nextGap/nt. SFX (08f, Audio) are called guarded with typeof.
export default String.raw`
var EN_SEC={l:40,v:50,h:60},EN_LV={l:2,v:3,h:4},EN_VT=.6,EN_VB=.08,EN_HT=.53,EN_HS=.15,EN_SW=.05,EN_HV=162,EN_OFF=999,EN_HK=.65;
/* cold ember-vent colours (contrast-tested vs the lane band) */
var EN_VC={body:"#64748b",rim:"#cbd5e1",cap:"#94a3b8",slat:"#94a3b8",ember:"#ef4444"};
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
  else if(e.t==="d"&&enOn("h")){e.t="h";e.bot=EN_OFF;e.vb=EN_HV;e.hs=0;e.hw=0}
}
/* timings from the distance to the buggy (speed = relative speed: none of these move on their own) */
/* real-game hook (13 update, right after spawn()): skin every entity that hasn't been looked at yet (only the new spawn) */
function enTagAll(){for(var i=0;i<ents.length;i++){var e=ents[i];if(!e.tg){e.tg=1;enTag(e)}}}
/* sprite-only scale at portrait zoom (ZM>1) for the HOVERING / winding-up drone only (it has no hitbox then). Anything
   that can touch the buggy is drawn at 1x with its opaque ("solid") silhouette inside the hitbox: enSolid (tested). */
function enPS(){return typeof ZM==="number"&&ZM>1?1.2:1}
/* the opaque silhouette of a blob / low drone as drawn, in game px: [{x,y,w,h}...]; everything outside it (outline, dome
   nub, drips, rotor, outer shell, hammer) is drawn translucent. Fits inside the hitbox (the blob's bottom 6 rows; the drone's
   chassis core 5..11 px up its 15 px box, so a ducking buggy (18 px) passes under it and a jump passes over it). */
function enSolid(e){
  if(!e)return null;var x=Math.round(e.x);
  if(e.sk==="l"&&e.t==="b"){var g=GY-e.bot;return [{x:x+6,y:g-18,w:18,h:3},{x:x+3,y:g-15,w:24,h:3},{x:x,y:g-12,w:30,h:12}]}
  if(e.t==="h"){
    var vb=e.vb==null?e.bot:e.vb,hx=Math.round(enHX(e)),y=GY-vb-e.h;
    if(e.hs===3)return [{x:hx+2,y:y+4,w:26,h:6}];
    var sc=enHSc(e),cx=hx+15,by=y+e.h;return [{x:cx-18*sc,y:by-18*sc,w:36*sc,h:17*sc}];
  }
  return null;
}
/* hammer drone visual x: while hovering / winding up (no hitbox) it is drawn ahead of its logical x, flying against the
   scroll, so it is fully on screen from spawn even at 390x844 / 760 px/s; the offset reaches 0 exactly at the dive, so from
   the dive on the sprite is at the hitbox. Presentation only (x, spawn, RNG and hitbox path untouched). */
function enHX(e){return e.hs>=2?e.x:e.x-EN_HK*Math.max(0,enDx(e)-speed*EN_HS)}
function enHSc(e){if(e.hs===3)return 1;var p=enPS();if(e.hs===2){var k=Math.min(1,e.hw/EN_SW);return (1.5-.5*k)*(p+(1-p)*k)}return 1.5*p}
/* drawn right edge of the drone (rotor / cocked hammer reach ~30 local px right of the x+15 anchor) */
function enHR(e){return enHX(e)+15+30*enHSc(e)}
function enHL(e){return enHX(e)+15-30*enHSc(e)}
function enHVis(e){return enHR(e)<=XO+VW&&enHL(e)>=XO}
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
      /* hover + wind-up high above the jump arc with NO hitbox (bot parked at EN_OFF); the dive has no hitbox either;
         once down it is exactly the old drone's end state: 30x15 at bot 16 (duck under it or jump over it) */
      if(ts>EN_HT){e.hs=0;e.vb=EN_HV;e.bot=EN_OFF}
      else if(ts>0){if(e.hs<1&&enHVis(e)){e.hs=1;e.hw=0}if(e.hs===1)e.hw+=dt;e.vb=EN_HV;e.bot=EN_OFF}
      else{if(e.hs<2){e.hs=2;e.hw=0}e.hw+=dt;var k=Math.min(1,e.hw/EN_SW);e.vb=Math.round(EN_HV-(EN_HV-16)*k);e.bot=EN_OFF;if(k>=1)e.hs=3;
        /* down: the old drone's exact low-state formula (bot 16 + its 1.5 px bob) */
        if(e.hs===3){e.bot=16+Math.sin(tt*7+(e.ph||0))*1.5;e.vb=e.bot}}
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
/* the same frames split into the soft top nub row and the opaque body (rows 1-6); built once so spr()'s cache keys hold */
var EN_BLT=EN_BLOB.map(function(r){return r.slice(0,1)}),EN_BLB=EN_BLOB.map(function(r){return r.slice(1)});
var EN_BP=[{o:OR,y:"#fde047",k:"#431407",r:"#ef4444"},{o:"#fb923c",y:"#fef08a",k:"#431407",r:"#f87171"}];
var EN_TMP=[],EN_OUT={o:"#05070d",y:"#05070d",k:"#05070d",r:"#05070d"};
function enTm(){return rm()?0:tt}
function enDrawBlob(e){
  var x=Math.round(e.x),y=GY-e.bot-e.h,t=enTm(),f=((t*5+x*.03)|0)&1;
  /* 1x in every layout (spr() draws in device px, so it was never scaled). The dark outline only overhangs the hitbox,
     so it is drawn soft; the 2-cell top nub is soft too, so the opaque body is exactly enSolid(e), inside the hitbox. */
  ctx.globalAlpha=.55;spr(EN_BLOB[f],x-3,y,3,EN_OUT);spr(EN_BLOB[f],x+3,y,3,EN_OUT);spr(EN_BLOB[f],x,y-3,3,EN_OUT);spr(EN_BLOB[f],x-2,y-2,3,EN_OUT);spr(EN_BLOB[f],x+2,y-2,3,EN_OUT);
  ctx.globalAlpha=.6;spr(EN_BLT[f],x,y,3,EN_BP[e.v|0]);ctx.globalAlpha=1;
  spr(EN_BLB[f],x,y+3,3,EN_BP[e.v|0]);
  /* molten trail behind it + puddle glow */
  ctx.fillStyle=OR;ctx.fillRect(x-3,GY-2,e.w+6,2);
  ctx.globalAlpha=.6;ctx.fillRect(x+e.w+2,GY-2,6,2);ctx.globalAlpha=.3;ctx.fillRect(x+e.w+10,GY-2,5,2);ctx.globalAlpha=1;
  /* drip bubbles rising off the top */
  if(!rm()){var b=(t*1.6+x*.01)%1;ctx.globalAlpha=1-b;ctx.fillStyle="#fde047";ctx.fillRect(x+9+((x>>3)&7),y-2-Math.round(b*8),2,2);ctx.globalAlpha=1}
}
function enDrawVent(e){
  /* a squat furnace chimney (its 26x50 hitbox): riveted steel stack, cap lip, grille slats with heat behind them */
  var x=Math.round(e.x),t=enTm(),tv=enVentT(e),tele=tv<=EN_VT&&tv>0,on=tv<=0,p=tele?1-tv/EN_VT:on?1:0;
  var jx=tele&&!rm()?((((t*40)|0)&1)?1:-1):0,top=GY-e.h,pu=rm()?1:.75+.25*Math.sin(t*30),i;
  /* floor glow + heat halo grow with the telegraph */
  if(p>0){ctx.globalAlpha=(.15+.3*p)*pu;ctx.fillStyle=OR;ctx.fillRect(x-6,top-4,e.w+12,e.h+4);ctx.globalAlpha=.3+.5*p;ctx.fillRect(x-10,GY-3,e.w+20,3);ctx.globalAlpha=1}
  /* stack: dark outline, steel body, side highlight, rivets */
  /* readable even cold (>= 3:1 on the dark lane band, tested): mid-steel body, bright rims, light cap */
  ctx.fillStyle="#05070d";ctx.fillRect(x-1+jx,top+3,e.w+2,e.h-3);
  ctx.fillStyle=EN_VC.body;ctx.fillRect(x+1+jx,top+5,e.w-2,e.h-5);
  ctx.fillStyle=EN_VC.rim;ctx.fillRect(x+1+jx,top+5,2,e.h-5);ctx.fillRect(x+e.w-3+jx,top+5,2,e.h-5);
  /* cap lip (wider) */
  ctx.fillStyle="#05070d";ctx.fillRect(x-4+jx,top-1,e.w+8,7);
  ctx.fillStyle=EN_VC.cap;ctx.fillRect(x-3+jx,top,e.w+6,5);ctx.fillStyle=EN_VC.rim;ctx.fillRect(x-3+jx,top,e.w+6,1);
  /* the chimney mouth glows with the heat */
  ctx.fillStyle=on?"#fde047":p>.6?OR:p>0?"#ef4444":"#450a0a";ctx.fillRect(x+3+jx,top+1,e.w-6,2);
  /* grille: 6 slats, heat behind them climbs from the bottom slot to the top over the 0.6 s telegraph */
  for(i=0;i<6;i++){
    var sy=GY-10-i*7,lit=on?1:Math.max(0,Math.min(1,p*6.5-i)),c=lit<=0?(i===0?EN_VC.ember:EN_VC.slat):lit<.5?"#dc2626":lit<1||!on&&i>3?OR:"#fde047";
    if(on)c=i&1?"#fde047":"#fef3c7";
    ctx.fillStyle=c;ctx.fillRect(x+4+jx,sy,e.w-8,4);
    ctx.fillStyle="#05070d";ctx.fillRect(x+3+jx,sy+4,e.w-6,3);
    ctx.fillStyle="#4b5563";ctx.fillRect(x+3+jx,sy+4,e.w-6,1);
  }
  /* squat feet / floor grate */
  ctx.fillStyle="#05070d";ctx.fillRect(x-4+jx,GY-4,e.w+8,4);ctx.fillStyle="#374151";ctx.fillRect(x-3+jx,GY-3,e.w+6,2);
  if(!on){
    /* heat shimmer above the cap: wavy translucent strands, stronger as it heats; smoke puffs */
    for(i=0;i<3;i++){var ph=((rm()?.4:t*1.6)+i*.33)%1,wx=Math.round(Math.sin(t*9+i*2)*2);ctx.globalAlpha=(.12+.4*p)*(1-ph);ctx.fillStyle=p>.5?"#fdba74":"#cbd5e1";ctx.fillRect(x+6+i*6+wx,top-4-Math.round(ph*(14+20*p)),2,6)}
    for(i=0;i<2;i++){var sp=((rm()?.3:t*(.7+p))+i*.5)%1,sz=4+Math.round(sp*6);ctx.globalAlpha=(.1+.35*p)*(1-sp);ctx.fillStyle="#94a3b8";ctx.fillRect(x+7+i*8,top-8-Math.round(sp*(24+18*p)),sz,sz)}
    ctx.globalAlpha=1;
  }else{
    /* burst: a flame jet shooting UP out of the chimney. While the buggy is above/over the stack the jet is capped so it
       always stays below the buggy's drawn rect (it licks up under a buggy that clears it); once the buggy is past, it
       goes full height with embers. Visual only: the hitbox stays the 26x50 stack. Bounds: enJetRect (tested). */
    var jr=enJetRect(e);if(!jr)return;
    var jh=jr.jh,cx=x+e.w/2,fl=jr.fl,ja=jr.full?1:.45;
    ctx.globalAlpha=.3*ja;ctx.fillStyle="#ef4444";ctx.fillRect(cx-14,top-jh-8,28,jh+8);ctx.globalAlpha=1;
    var bands=[[11,1,"#dc2626"],[8,.9,OR],[5,.72,"#fde047"],[2,.45,"#fef3c7"]];
    ctx.globalAlpha=ja;
    for(var bi=0;bi<4;bi++){var bw=bands[bi][0],bh=Math.round(jh*bands[bi][1]);ctx.fillStyle=bands[bi][2];
      ctx.fillRect(cx-bw,top-Math.round(bh*.6),bw*2,Math.round(bh*.6));ctx.fillRect(cx-Math.round(bw*.6),top-bh,Math.round(bw*1.2),Math.round(bh*.4)+1)}
    ctx.globalAlpha=1;
    if(jr.full){
      if(!rm()){ctx.fillStyle=OR;ctx.fillRect(cx-8+fl,top-jh-6,3,8);ctx.fillRect(cx+4-fl,top-jh-3,3,6)}
      for(var q=0;q<6;q++){var eh=(t*1.5+q*.17)%1;ctx.globalAlpha=1-eh;ctx.fillStyle=q&1?"#fde047":OR;ctx.fillRect(x+3+((q*7)%20)+Math.round(Math.sin(t*4+q)*4),top-jh-4-Math.round(eh*26),3,3)}
      ctx.globalAlpha=1;
    }
  }
}
/* the vent jet's drawn extent: {x,y,w,h} bounds everything it draws (glow, bands, tongues, embers), jh = flame height,
   full = tongues+embers on. Near the buggy (horizontal overlap with its drawn rect PX-8..PX+pW+8) the whole extent is
   capped 2 px below the buggy's drawn bottom; null when nothing is drawn above the cap. */
function enJetRect(e){
  var tv=enVentT(e);if(tv>0)return null;
  var x=Math.round(e.x),top=GY-e.h,fl=rm()?0:((enTm()*24)|0)&3,jh=Math.round((48+fl*3)*Math.min(1,-tv/.05));
  var near=x-2<PX+pW()+8&&x+30>PX-8,full=!near;
  if(near){var cap=(GY-py+2)-top;cap=-cap-2;jh=Math.min(jh,cap-8)}
  if(jh<4)return null;
  var up=full?jh+34:jh+8;
  return {x:x-2,y:top-up,w:e.w+6,h:up,jh:jh,full:full,fl:fl};
}
function enDrawDrone(e){
  /* ~1.4x the old drone: 34x14 chassis, 44 px rotor, chunky hammer (24x14 head on a handle), all with a dark outline */
  var vb=e.vb==null?e.bot:e.vb,x=Math.round(enHX(e)),y=GY-vb-e.h,t=enTm(),wind=e.hs===1,dn=e.hs>=2,low=e.hs===3;
  var hot=wind&&!rm()&&((t*12)|0)&1,bob=e.hs===0&&!rm()?Math.round(Math.sin(t*5+x*.02)*2):0;y+=bob;
  var sc=enHSc(e);
  /* red ground marker where the hammer will land (wind-up on), beam down to it */
  if(wind||dn){ctx.globalAlpha=low?.4:.3+.4*(hot?1:0);ctx.fillStyle="#ef4444";ctx.fillRect(x-4,GY-3,e.w+8,3);
    if(!low){for(var d=y+e.h+30;d<GY-6;d+=10)ctx.fillRect(x+14,d,3,5)}ctx.globalAlpha=1}
  /* impact flash right after the slam */
  if(low&&e.hw<EN_SW+.15&&!rm()){var ia=1-(e.hw-EN_SW)/.15;ctx.globalAlpha=Math.max(0,ia);ctx.fillStyle="#fde047";ctx.fillRect(x-10,GY-4,e.w+20,4);ctx.fillRect(x-6,GY-10,3,6);ctx.fillRect(x+e.w+3,GY-10,3,6);ctx.globalAlpha=1}
  /* once low (the only state with a hitbox) it is drawn at 1x and everything but the chassis core (enSolid: 26x6, 5..11 px
     up the 15 px box) is a translucent shell: rotor, outer chassis, the trailing hammer. Hover / wind-up stay big & opaque. */
  var GA=low?.4:1;
  ctx.save();ctx.translate(x+15,y+e.h);ctx.scale(sc,sc);ctx.translate(-(x+15),-(y+e.h));ctx.globalAlpha=GA;
  /* rotor */
  var rw=rm()?40:(((t*30)|0)&1?44:26);
  ctx.fillStyle="#05070d";ctx.fillRect(x+15-rw/2-1,y-10,rw+2,4);
  ctx.fillStyle="#f1f5f9";ctx.fillRect(x+15-rw/2,y-9,rw,2);ctx.fillStyle="#64748b";ctx.fillRect(x+13,y-7,4,5);
  /* chassis + eye */
  ctx.fillStyle="#05070d";ctx.fillRect(x-3,y-3,36,17);
  ctx.fillStyle="#1e293b";ctx.fillRect(x-2,y-2,34,15);ctx.fillStyle=CY;ctx.fillRect(x-2,y-2,34,2);ctx.fillRect(x-2,y+11,34,2);
  ctx.fillStyle="#05070d";ctx.fillRect(x+1,y+2,10,7);
  ctx.fillStyle=wind||dn?"#ef4444":CY;ctx.fillRect(x+2,y+3,8,5);ctx.fillStyle="#ffffff";ctx.fillRect(x+3,y+4,2,2);
  ctx.fillStyle="#475569";ctx.fillRect(x+24,y+3,5,7);
  /* hammer: hangs below while hovering, cocked up behind during the wind-up, swung down in the dive, trailing once low */
  var a=low?-1.9:dn?.2:wind?-2.5*Math.min(1,e.hw/.2):-.15+(rm()?0:.15*Math.sin(t*4));
  if(e.hs===2)a=-2.5+2.7*Math.min(1,e.hw/EN_SW);
  ctx.save();ctx.translate(x+15+(low?10:0),y+(low?4:12));ctx.rotate(a);
  ctx.fillStyle="#05070d";ctx.fillRect(-3,-1,6,14);ctx.fillStyle="#94a3b8";ctx.fillRect(-1,0,3,12);
  if(hot||dn){ctx.globalAlpha=.4*GA;ctx.fillStyle="#fde047";ctx.fillRect(-16,8,32,20);ctx.globalAlpha=GA}
  /* sledgehammer head: hot orange block with steel striking faces at both ends */
  ctx.fillStyle="#05070d";ctx.fillRect(-17,9,34,17);
  ctx.fillStyle=OR;ctx.fillRect(-11,11,22,13);ctx.fillStyle="#fdba74";ctx.fillRect(-11,11,22,3);ctx.fillStyle="#9a3412";ctx.fillRect(-11,21,22,3);
  ctx.fillStyle="#cbd5e1";ctx.fillRect(-16,10,5,15);ctx.fillRect(11,10,5,15);ctx.fillStyle="#64748b";ctx.fillRect(-16,21,5,4);ctx.fillRect(11,21,5,4);
  if(hot||dn){ctx.fillStyle="#ffffff";ctx.fillRect(-16,10,5,2);ctx.fillRect(11,10,5,2)}
  ctx.restore();
  ctx.restore();ctx.globalAlpha=1;
  if(low){
    /* the opaque core = enSolid(e): dark rim, slate body, cyan stripe, red eye */
    ctx.fillStyle="#05070d";ctx.fillRect(x+2,y+4,26,6);
    ctx.fillStyle="#334155";ctx.fillRect(x+3,y+5,24,4);ctx.fillStyle=CY;ctx.fillRect(x+3,y+5,24,1);
    ctx.fillStyle="#ef4444";ctx.fillRect(x+4,y+6,6,3);ctx.fillStyle="#ffffff";ctx.fillRect(x+5,y+6,2,1);
    ctx.fillStyle="#94a3b8";ctx.fillRect(x+21,y+6,4,3);
  }
}
/* edge warning while a telegraph is running but the enemy is still off the right edge (fast speeds / portrait) */
function enEdge(){
  if(state!=="run")return;
  var ex=XO+VW,i,e,t=enTm(),bl=rm()||((t*10)|0)&1;
  for(i=0;i<ents.length;i++){
    e=ents[i];if(e.t==="h"?enHR(e)<=ex:e.x<ex-4)continue;
    if(e.t==="h"&&e.hs>=1){var hy=GY-(e.vb==null?e.bot:e.vb)-e.h;ctx.globalAlpha=bl?.9:.4;ctx.fillStyle="#ef4444";ctx.fillRect(ex-6,hy-4,4,e.h+6);ctx.fillRect(ex-12,hy+4,4,4);ctx.fillRect(ex-6,GY-3,4,3);ctx.globalAlpha=1}
    if(e.sk==="v"&&enVentT(e)<=EN_VT){ctx.globalAlpha=bl?.8:.35;ctx.fillStyle=OR;ctx.fillRect(ex-6,GY-30,4,30);ctx.fillStyle="#94a3b8";ctx.fillRect(ex-12,GY-38-((t*30)|0)%10,4,4);ctx.globalAlpha=1}
  }
}
function enDraw(e){if(e.sk==="l")enDrawBlob(e);else if(e.sk==="v")enDrawVent(e);else if(e.t==="h")enDrawDrone(e);else return false;return true}
/* real-game hook (end of 14 drawEnts): particles, edge warnings, sounds (the per-entity hook is enDraw(e)) */
function enDrawAfter(){
  for(var j=0;j<EN_NP;j++)if(enPL[j]>0){ctx.globalAlpha=Math.min(1,enPL[j]*3);ctx.fillStyle=j&1?"#fde047":OR;ctx.fillRect(enPX[j]|0,enPY[j]|0,3,3)}
  ctx.globalAlpha=1;
  enEdge();
  if(state==="run")enSnd();
}
/* draw wrapper: the original drawEnts() draws everything except v2 enemies (reused array, no allocation), then the v2 ones */
function enDrawEnts(orig){
  var keep=ents,i,n=0;
  EN_TMP.length=0;
  for(i=0;i<keep.length;i++){var e=keep[i];if(e.sk||e.t==="h")n++;else EN_TMP.push(e)}
  if(!n){orig();}else{ents=EN_TMP;try{orig()}finally{ents=keep}for(i=0;i<keep.length;i++)enDraw(keep[i])}
  enDrawAfter();
}

`;
