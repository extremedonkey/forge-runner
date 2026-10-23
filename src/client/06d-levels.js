// LEVELS (LEVELS-1, owner: Levels): 5 cosmetic levels by distance (L2 20 s, L3 40 s, L4 65 s, L5 90 s of base-curve run time), level-up banner + spark burst, musicLevel(n) hook.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC / PROGRESS: reads score (the run's distance on the deterministic base speed curve; lvDist()) and never writes
// score, speed, spawning or enemies (lvSpeedMul() only RETURNS a multiplier; 13's vMul() applies it to world motion). All level/banner state lives here; nothing in 06-state/11-gameflow/13-simulation.
// Hooks (one line each, typeof-guarded): 16-loop.js frame() -> lvTick(dt) right after the update() sub-steps;
// 14-render.js drawHud() -> lvDraw() at the end of the HUD block. A new run is detected in lvTick (distance went down / run began).
// Interface for Dev / Audio / LEVELS-2 (per-level background + palette): currentLevel() (1..5, pure function of the distance),
// lvNextF(s,l) (HUD progress fill), getLevelDef(n?) -> LEVELS entry (.pal = LEVELS-2 palette), lvFade()/lvPrev (LEVELS-2 crossfade), lvl (level shown/announced this run), lvT (seconds since the last level change, for crossfades), LEVELS, LV_SEC, LV_AT,
// lvSpeedMul() (SPEED-PER-LEVEL: felt world-speed multiplier for Dev's vMul() hook; never touches speed/score), LV_SPD, LV_FELT,
// GAP_LV/getGapLv()/lvGapsBlocked()/GAP_CAP/GAP_MIN_JUMP_SEP/GAP_DFULL_S (GAPS data for Dev). Runs after 04-viewport.js (START/MAXV).
export default String.raw`
/* levels: thresholds = base-curve distance (score) after LV_SEC seconds of a run. Base curve (13-simulation.js update()):
   speed START=340 -> MAXV=760 px/s at +7/s (reached at 60 s), score += speed*0.05 per s. So L2 410, L3 960, L4 1840, L5 2790.
   Paced for real runs (levels-fix-1): L2 at 20 s, L3 40 s, L4 65 s, L5 90 s (was 45/90/135/180). */
var LV_SEC=[0,20,40,65,90],LV_ACC=7,LV_RATE=.05,LV_BANNER=1.5,LV_NP=36,LV_FADE=1.2;
function lvBase(t){var tm=(MAXV-START)/LV_ACC,a=Math.min(t,tm);return LV_RATE*(START*a+LV_ACC*a*a/2+MAXV*Math.max(0,t-tm))}
var LV_AT=LV_SEC.map(function(s){return Math.floor(lvBase(s))});
var LEVELS=[
  {n:1,key:"foundry",name:"FOUNDRY",c:OR},
  {n:2,key:"slag",name:"SLAG PITS",c:"#fde047"},
  {n:3,key:"ember",name:"EMBER VENTS",c:"#fb7185"},
  {n:4,key:"hammer",name:"HAMMER WORKS",c:CY},
  {n:5,key:"crusher",name:"CRUSHER",c:VI}
];
/* LEVELS-2 palettes (drawn by 06f-levels-bg.js over the normal sky/parallax/day-night; L1 = the original look, no overlay).
   sk0/sk1 = sky tint top/horizon, hz = horizon glow, gd = ground tint, ln = ground line, gl = line glow,
   pr = prop body, pe = prop edge/lights, hot = hot core */
var LV_PAL=[
  null,
  {sk0:"rgba(60,22,6,.38)",sk1:"rgba(234,88,12,.42)",hz:"rgba(253,186,116,.30)",gd:"rgba(67,20,7,.42)",ln:OR,gl:"rgba(249,115,22,.22)",pr:"#2b1408",pe:OR,hot:"#fde047"},
  {sk0:"rgba(40,4,10,.45)",sk1:"rgba(220,38,38,.40)",hz:"rgba(251,113,133,.28)",gd:"rgba(60,6,12,.45)",ln:"#ef4444",gl:"rgba(239,68,68,.22)",pr:"#24070d",pe:"#ef4444",hot:"#fdba74"},
  {sk0:"rgba(4,22,36,.45)",sk1:"rgba(13,148,136,.32)",hz:"rgba(45,212,191,.22)",gd:"rgba(4,24,32,.42)",ln:"#2dd4bf",gl:"rgba(45,212,191,.20)",pr:"#132a38",pe:"#2dd4bf",hot:"#94a3b8"},
  {sk0:"rgba(24,4,40,.52)",sk1:"rgba(192,38,211,.36)",hz:"rgba(232,121,249,.26)",gd:"rgba(30,6,44,.48)",ln:"#d946ef",gl:"rgba(217,70,239,.22)",pr:"#1e0a33",pe:"#d946ef",hot:"#f5d0fe"}
];
for(var lvI=0;lvI<5;lvI++){LEVELS[lvI].at=LV_AT[lvI];LEVELS[lvI].sec=LV_SEC[lvI];LEVELS[lvI].pal=LV_PAL[lvI]}
/* level state (derived from the distance, never stored elsewhere): lvl = level shown, lvB = banner seconds left,
   lvT = seconds since the last change, lvS/lvPS = distance/state seen by the previous lvTick (new-run detection) */
var lvl=1,lvB=0,lvT=0,lvS=Infinity,lvPS="";
/* LEVELS-2 crossfade: lvPrev = level faded from (== lvl when no fade is running); lvFade() = 0..1 progress over LV_FADE s */
var lvPrev=1;
function lvFade(){return lvPrev===lvl?1:Math.max(0,Math.min(1,lvT/LV_FADE))}
/* debug (web build only, cosmetic): ?level=N = level floor N for every run, with its banner at run start; score/speed/beacons untouched */
var LVQ=window.FR_BUILD!=="poki"&&/^[1-5]$/.test(Q.get("level")||"")?+Q.get("level"):0;
/* spark burst pool: fixed size, preallocated, no per-frame allocation */
var lvPX=new Float32Array(LV_NP),lvPY=new Float32Array(LV_NP),lvVX=new Float32Array(LV_NP),lvVY=new Float32Array(LV_NP),lvPL=new Float32Array(LV_NP),lvPA=new Float32Array(LV_NP),lvPC=new Uint8Array(LV_NP);
var LV_PC=["#fde047",OR,"#ffffff"];
/* the one distance input: score (read only). Swap here if a separate distance counter ever lands */
function lvDist(){return score}
function lvFor(s){var n=1;for(var i=1;i<5;i++)if(s>=LV_AT[i])n=i+1;return Math.max(n,LVQ)}
/* currentLevel(): pure function of the current run's distance (1..5) */
function currentLevel(){return lvFor(lvDist())}
function getLevelDef(n){return LEVELS[Math.max(1,Math.min(5,n||currentLevel()))-1]}
function lvMusic(n){if(typeof musicLevel==="function"){try{musicLevel(n)}catch(e){}}}
/* Audio level-up sting (n = 2..5): only on a real level change (where the banner fires), never at level 1 or run start */
function lvSting(n){if(n>=2&&typeof levelSting==="function"){try{levelSting(n)}catch(e){}}}
/* banner baseline: under the HUD in the playfield; in portrait (OY > 0) up in the extra sky, clear of the buggy and the sun */
function lvY(){return OY?Math.round(-OY*.3):Math.round(H*.42)}
function lvBurst(){
  if(typeof rm==="function"&&rm())return;
  var cx=XO+VW/2,cy=lvY()-10;
  for(var i=0;i<LV_NP;i++){
    var a=Math.random()*6.283,s=60+Math.random()*220;
    lvPX[i]=cx+(Math.random()-.5)*160;lvPY[i]=cy;lvVX[i]=Math.cos(a)*s;lvVY[i]=Math.sin(a)*s-80;
    lvPA[i]=0;lvPL[i]=.5+Math.random()*.6;lvPC[i]=i%3;
  }
}
/* per frame, after update(): new run -> reset (level 1 or the ?level floor, musicLevel); level up -> banner + burst + musicLevel */
function lvTick(dt){
  var d=lvDist(),run=state==="run",i;
  lvT+=dt;
  if(lvB>0)lvB=Math.max(0,lvB-dt);
  for(i=0;i<LV_NP;i++)if(lvPL[i]>0){
    lvPA[i]+=dt;if(lvPA[i]>=lvPL[i]){lvPL[i]=0;continue}
    lvVY[i]+=420*dt;lvPX[i]+=lvVX[i]*dt;lvPY[i]+=lvVY[i]*dt;
  }
  if(run&&(d<lvS||(lvPS!=="run"&&d<5))){
    lvB=0;for(i=0;i<LV_NP;i++)lvPL[i]=0;
    lvl=lvFor(d);lvT=0;lvMusic(lvl);lvPrev=lvl;
    if(LVQ>1){lvB=LV_BANNER;lvBurst();lvPrev=LVQ-1}
  }else if(run){
    var n=lvFor(d);
    if(n>lvl){lvPrev=lvl;lvl=n;lvT=0;lvMusic(n);lvSting(n);lvB=LV_BANNER;lvBurst()}
  }
  if(lvT>=LV_FADE)lvPrev=lvl;
  lvS=d;lvPS=state;
}
/* SPEED-PER-LEVEL: felt run speed per level. lvSpeedMul() = world-motion multiplier for Dev's vMul() hook (HILLS, 13-simulation.js),
   which scales scroll, spawnDist and entity movement only. NEVER speed or score: score keeps accruing on the base curve
   (START->MAXV at +7/s, 0.05 pt/px), so levels (LV_AT), Missions and the server ceiling nFor(dur)*1.01+5 are unchanged by construction.
   Felt speed = speed*mul is capped at LV_FELT=800 px/s (Forge): mul = min(table/eased value, LV_FELT/speed), then clamped to
   LV_SPD_LO..HI (the cap is >= 800/760 = 1.053, so never below the 0.8 floor). vMul() also clamps speed*vMul() <= 800; both are min(),
   so applying the cap twice is harmless (idempotent, tested). Base speed is 760 from 60 s, so the top of the table keeps even ~5% steps:
   L1 0.85 (felt 289-408), L2 0.92 (442-570), L3 0.95 (589-722), L4 1.00 (760), L5 1.06 -> capped to 800/760 (800).
   Eases from lvPrev's to lvl's value with a smoothstep over the LEVELS-2 crossfade (lvFade(), LV_FADE s); the cap is applied after
   the ease and 800/speed is continuous in speed, so neither creates a per-frame jump.
   Pure: reads state/score/speed/lvl/lvPrev/lvT/lvS/lvPS, writes nothing, no Math.random. 1 outside a run (attract scroll, game over). */
var LV_SPD=[.85,.92,.95,1,1.06],LV_SPD_LO=.8,LV_SPD_HI=1.25,LV_FELT=800;
function lvSpdOf(n){var v=LV_SPD[Math.max(1,Math.min(5,n|0))-1];return Math.max(LV_SPD_LO,Math.min(LV_SPD_HI,+v||1))}
/* felt-speed cap: min(m, LV_FELT/speed), then the LO..HI clamp (idempotent: lvSpdCap(lvSpdCap(m)) === lvSpdCap(m)) */
function lvSpdCap(m){var c=speed>0?LV_FELT/speed:LV_SPD_HI;return Math.max(LV_SPD_LO,Math.min(LV_SPD_HI,m,c))}
/* true while lvTick has not yet seen the current run (it runs after the update() sub-steps): use the run's start level */
function lvFresh(){return lvDist()<lvS||lvPS!=="run"}
function lvSpeedMul(){
  if(state!=="run")return 1;
  if(lvFresh())return lvSpdCap(lvSpdOf(LVQ>1?LVQ-1:lvFor(lvDist())));
  var a=lvSpdOf(lvPrev),b=lvSpdOf(lvl),f=lvFade();
  if(a===b||f>=1)return lvSpdCap(b);
  f=f*f*(3-2*f);
  return lvSpdCap(a+(b-a)*f);
}
/* GAPS (Dev's per-level gap table, plain data read by Dev's GAPS code; no behaviour here). GAP_LV[level-1]:
   wMin/wMax = gap width as a fraction of Dfull (Dfull = GAP_DFULL_S 0.689 s x felt speed, measured at the lip), never above GAP_CAP;
   minClear = s of clear track between gaps (never below GAP_MIN_JUMP_SEP); chanceMin..chance = fraction of spawns that are gaps;
   noGapBefore = s into the run before the first gap. GAP_MIN_JUMP_SEP = s between required jumps.
   getGapLv() = the current level's entry (L1 outside a run / before the run is seen); lvGapsBlocked() = true while the level
   banner or the level crossfade is up (no new gaps then). */
var GAP_CAP=.65,GAP_MIN_JUMP_SEP=.85,GAP_DFULL_S=.689;
var GAP_LV=[
  {wMin:.20,wMax:.25,minClear:2.0,chanceMin:0,chance:.10,noGapBefore:12},
  {wMin:.25,wMax:.35,minClear:1.6,chanceMin:.15,chance:.15,noGapBefore:0},
  {wMin:.30,wMax:.45,minClear:1.3,chanceMin:.20,chance:.20,noGapBefore:0},
  {wMin:.40,wMax:.55,minClear:1.0,chanceMin:.25,chance:.25,noGapBefore:0},
  {wMin:.45,wMax:.60,minClear:.85,chanceMin:.30,chance:.30,noGapBefore:0}
];
function getGapLv(){
  if(state!=="run"||lvFresh())return GAP_LV[state==="run"?Math.max(1,Math.min(5,lvFor(lvDist())))-1:0];
  return GAP_LV[Math.max(1,Math.min(5,lvl))-1];
}
/* run-start safe (independent of hook order): on a new run's first update() steps, before lvTick has reset lvB/lvl/lvT, the previous
   run's banner/crossfade must not leak in; blocked then only if this run starts with a ?level=N banner (LVQ > 1) */
function lvGapsBlocked(){if(state==="run"&&lvFresh())return LVQ>1;return lvB>0||(lvPrev!==lvl&&lvFade()<1)}
/* HUD progress marker (levels-identity): small "LV<n+1>" label + thin bar under the mute/pause buttons (top left), filling from
   LV_AT[lvl-1] to LV_AT[lvl] (= LV_SEC run time on the base curve); "MAX" with a full bar at L5. Runs only; hidden while the
   missions toast shows (it is centred on the same row). lvNextF(s,l) = fill 0..1 toward level l+1 at distance s (pure). */
var LV_HL=["","LV2","LV3","LV4","LV5","MAX"],LV_HB={CS:-1,OY:0,HS:0,HUDY:0,K:0,y:0},LV_MG=9,LV_MC=null;
function lvNextF(s,l){if(l>=5)return 1;var a=LV_AT[l-1],b=LV_AT[l];return Math.max(0,Math.min(1,(s-a)/(b-a)))}
/* top of the marker (game units): just below the mute/pause button row (DOM buttons, CSS px = (y+OY)*CS); cached per layout.
   Portrait (ZM > 1, both builds, any zoom: 1.35 on main, 1.12 in PZ #66): the marker's glyph box is kept >= LV_MG CSS px
   (8 + 1 for device-px rounding) below the mute button's rect. The cap height is measured from the real font (lvAsc), so the
   clearance holds at every portrait size; it only ever moves the marker DOWN (landscape/desktop unchanged). */
function lvAsc(px){
  try{
    if(!LV_MC)LV_MC=document.createElement("canvas").getContext("2d");
    LV_MC.font="bold "+px+"px "+MONO;
    var a=LV_MC.measureText(LV_HL.join("")).actualBoundingBoxAscent;
    if(a>0)return a;
  }catch(e){}
  return px*.8;
}
function lvHudY(){
  var c=LV_HB,hy=typeof HUDY==="number"?HUDY:0,cs=typeof CS==="number"?CS:1,k=typeof K==="number"?K:1;
  if(c.CS===cs&&c.OY===OY&&c.HS===HS&&c.HUDY===hy&&c.K===k)return c.y;
  c.CS=cs;c.OY=OY;c.HS=HS;c.HUDY=hy;c.K=k;
  var b=typeof btn!=="undefined"&&btn&&btn.style?(parseFloat(btn.style.top)||0)+(parseFloat(btn.style.height)||44):0;
  c.y=b>0&&cs>0?b/cs-OY+3*HS:(typeof hudB==="function"?hudB():30)+20*HS;
  if(b>0&&cs>0&&k>0&&typeof ZM==="number"&&ZM>1){
    /* glyph top (CSS px) = (y + px + OY)*CS - ascent; lvHud() draws the label's baseline at y + px (px = round(10*HS) units) */
    var px=Math.round(10*HS),asc=lvAsc(px*k)/k*cs;
    c.y=Math.max(c.y,(b+LV_MG+asc)/cs-OY-px);
  }
  return c.y;
}
/* robot overlap (landscape phones, Poki + site: a held jump, with or without spring boots, reaches the marker row): while the
   robot's drawn box (game units, from 14-render drawPlayer(): origin PX+22.5*M, GY-py; anvil body x -23..25, top yb-18 >= -35
   with the boots' spring lift, M = 4/3 when big) comes within LV_RM units of the marker's box, the marker fades to LV_DIM of its
   alpha (eased, ~0.1 s; instant under reduced motion) so the robot reads on top. Draw-only: reads py/PX/GY, never writes them. */
var LV_RM=4,LV_DIM=.2,lvDm=1,lvDt=0;
function lvRobotHit(x0,y0,x1,y1){
  if(typeof py!=="number"||!(py>0)||typeof PX!=="number"||typeof GY!=="number")return false;
  var m=typeof big==="function"&&big()?4/3:1,rx0=PX-4*m,rx1=PX+51*m,ry1=GY-py,ry0=ry1-38*m;
  return rx0<x1+LV_RM&&rx1>x0-LV_RM&&ry0<y1+LV_RM&&ry1>y0-LV_RM;
}
function lvHud(){
  if(state!=="run"||(typeof msToastLeft==="function"&&msToastLeft()>0))return;
  var l=Math.max(1,Math.min(5,lvl)),f=lvNextF(lvDist(),l),d=LEVELS[Math.min(4,l)],y=lvHudY(),x=XO+14,px=Math.round(10*HS);
  var bw=Math.round(40*HS),bh=Math.max(2,Math.round(3*HS)),lw=Math.round(26*HS);
  var now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lvDt)/1000)),tg=lvRobotHit(x,y,x+lw+bw+1,y+px+2)?LV_DIM:1;
  lvDt=now;lvDm=rm()?tg:lvDm+(tg-lvDm)*Math.min(1,dt*25);
  if(Math.abs(lvDm-tg)<.02)lvDm=tg;
  var a=lvDm;
  ctx.globalAlpha=.85*a;
  txt(LV_HL[l],x,y+px,px,d.c,"left",true,true,true,"","lvh");
  ctx.globalAlpha=.55*a;ctx.fillStyle="rgba(5,7,13,.8)";ctx.fillRect(x+lw-1,y+px-bh-2,bw+2,bh+2);
  ctx.globalAlpha=(l>=5?.5:.85)*a;ctx.fillStyle=d.c;ctx.fillRect(x+lw,y+px-bh-1,Math.round(bw*f),bh);
  ctx.globalAlpha=1;
}
function lvDraw(){
  if(state==="start")return;
  lvHud();
  for(var i=0;i<LV_NP;i++)if(lvPL[i]>0){
    ctx.globalAlpha=1-lvPA[i]/lvPL[i];ctx.fillStyle=LV_PC[lvPC[i]];ctx.fillRect(lvPX[i]|0,lvPY[i]|0,4,4);
  }
  ctx.globalAlpha=1;
  if(!(lvB>0))return;
  var d=LEVELS[lvl-1],e=LV_BANNER-lvB,s="LEVEL "+d.n+": "+d.name;
  ctx.globalAlpha=rm()?1:Math.min(1,e/.15,lvB/.5);
  txt(s,XO+VW/2,lvY(),fitPx(s,30*HS,VW-24,true,true),d.c,"center",true,true,true,rm()?"":d.c,"lvb");
  ctx.globalAlpha=1;
}

`;
