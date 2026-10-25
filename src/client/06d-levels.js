// LEVELS (LEVELS-1, owner: Levels): 8 cosmetic levels by distance (L2 20 s, L3 40 s, L4 65 s, L5 90 s, L6 135 s, L7 180 s, L8 225 s of base-curve run time), level-up banner + spark burst, musicLevel(n) hook.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC / PROGRESS: reads score (the run's distance on the deterministic base speed curve; lvDist()) and never writes
// score, speed, spawning or enemies (lvSpeedMul() only RETURNS a multiplier; 13's vMul() applies it to world motion). All level/banner state lives here; nothing in 06-state/11-gameflow/13-simulation.
// Hooks (one line each, typeof-guarded): 16-loop.js frame() -> lvTick(dt) right after the update() sub-steps;
// 14-render.js drawHud() -> lvDraw() at the end of the HUD block. A new run is detected in lvTick (distance went down / run began).
// Interface for Dev / Audio / LEVELS-2 (per-level background + palette): currentLevel() (1..8, pure function of the distance),
// lvNextF(s,l) (HUD progress fill), getLevelDef(n?) -> LEVELS entry (.pal = LEVELS-2 palette), lvFade()/lvPrev (LEVELS-2 crossfade), lvl (level shown/announced this run), lvT (seconds since the last level change, for crossfades), LEVELS, LV_SEC, LV_AT,
// lvSpeedMul() (SPEED-PER-LEVEL: felt world-speed multiplier for Dev's vMul() hook; never touches speed/score), LV_SPD, LV_FELT,
// GAP_LV/getGapLv()/lvGapsBlocked()/GAP_CAP/GAP_MIN_JUMP_SEP/GAP_DFULL_S (GAPS data for Dev). Runs after 04-viewport.js (START/MAXV).
export default String.raw`
/* levels: thresholds = base-curve distance (score) after LV_SEC seconds of a run. Base curve (13-simulation.js update()):
   speed START=340 -> MAXV=760 px/s at +7/s (reached at 60 s), score += speed*0.05 per s. So L2 410, L3 960, L4 1840, L5 2790, L6 4500, L7 6210, L8 7920.
   Paced for real runs (levels-fix-1): L2 at 20 s, L3 40 s, L4 65 s, L5 90 s (was 45/90/135/180). L6 ARC FURNACE at 135 s: 45 s after L5,
   so the L5 Crusher fight (06h, down by ~118 s) is always over first (no level change mid-fight). L7 MINE CART at 180 s: 45 s after L6.
   L7 is a THEME level: the mine shaft, open rails, the rider's cart and the gap arcs (06o-mine-cart.js) are drawn only while
   L7 shows (mcW()), so L1-L6, and any later level, keep the normal look. L8 SLAG PITS II at 225 s: the L2 music, its own slag-river background (06f), and
   four reusable mechanics driven by per-level rows: slag tide pools, crumbling bridges and geysers (06k gap KINDS + 06q SLAG) and the
   heat gauge (06s HEAT). */
var LV_SEC=[0,20,40,65,90,135,180,225],LV_ACC=7,LV_RATE=.05,LV_BANNER=1.5,LV_NP=36,LV_FADE=1.2;
function lvBase(t){var tm=(MAXV-START)/LV_ACC,a=Math.min(t,tm);return LV_RATE*(START*a+LV_ACC*a*a/2+MAXV*Math.max(0,t-tm))}
var LV_AT=LV_SEC.map(function(s){return Math.floor(lvBase(s))});
var LEVELS=[
  {n:1,key:"foundry",name:"FOUNDRY",c:OR},
  {n:2,key:"slag",name:"SLAG PITS",c:"#fde047"},
  {n:3,key:"ember",name:"EMBER VENTS",c:"#fb7185"},
  {n:4,key:"hammer",name:"HAMMER WORKS",c:CY},
  {n:5,key:"crusher",name:"CRUSHER",c:VI},
  {n:6,key:"arc",name:"ARC FURNACE",c:"#a5b4fc"},
  {n:7,key:"mine",name:"MINE CART",c:"#fbbf24"},
  {n:8,key:"l8",name:"SLAG PITS II",c:"#fde047"}
];
/* LEVELS-2 palettes (drawn by 06f-levels-bg.js over the normal sky/parallax/day-night; L1 = the original look, no overlay).
   sk0/sk1 = sky tint top/horizon, hz = horizon glow, gd = ground tint, ln = ground line, gl = line glow,
   pr = prop body, pe = prop edge/lights, hot = hot core */
var LV_PAL=[
  null,
  {sk0:"rgba(60,22,6,.38)",sk1:"rgba(234,88,12,.42)",hz:"rgba(253,186,116,.30)",gd:"rgba(67,20,7,.42)",ln:OR,gl:"rgba(249,115,22,.22)",pr:"#2b1408",pe:OR,hot:"#fde047"},
  {sk0:"rgba(40,4,10,.45)",sk1:"rgba(220,38,38,.40)",hz:"rgba(251,113,133,.28)",gd:"rgba(60,6,12,.45)",ln:"#ef4444",gl:"rgba(239,68,68,.22)",pr:"#24070d",pe:"#ef4444",hot:"#fdba74"},
  {sk0:"rgba(4,22,36,.45)",sk1:"rgba(13,148,136,.32)",hz:"rgba(45,212,191,.22)",gd:"rgba(4,24,32,.42)",ln:"#2dd4bf",gl:"rgba(45,212,191,.20)",pr:"#132a38",pe:"#2dd4bf",hot:"#94a3b8"},
  {sk0:"rgba(24,4,40,.52)",sk1:"rgba(192,38,211,.36)",hz:"rgba(232,121,249,.26)",gd:"rgba(30,6,44,.48)",ln:"#d946ef",gl:"rgba(217,70,239,.22)",pr:"#1e0a33",pe:"#d946ef",hot:"#f5d0fe"},
  {sk0:"rgba(6,10,44,.52)",sk1:"rgba(59,130,246,.34)",hz:"rgba(191,219,254,.26)",gd:"rgba(6,12,40,.46)",ln:"#60a5fa",gl:"rgba(96,165,250,.24)",pr:"#0b1430",pe:"#60a5fa",hot:"#e0f2fe",hl:["rgba(96,165,250,.26)","rgba(96,165,250,0)"],hsp:"#bfdbfe"},
  /* L7 MINE CART: the shaft itself is 06o's (mcBg replaces the tint/props); ln/gl/pe/hot colour the gap lips, HUD and rails */
  {sk0:"rgba(7,6,10,.9)",sk1:"rgba(10,8,8,.9)",hz:"rgba(251,191,36,.18)",gd:"rgba(10,8,8,.9)",ln:"#fbbf24",gl:"rgba(251,191,36,.22)",pr:"#2a1c10",pe:"#b07a46",hot:"#fde047"}
];
/* hole look per level (read by 06k gpDraw, optional palette keys): hl = [top, bottom] glow stops inside a hole (default the orange
   foundry glow), hsp = colour of the sparks falling in (default #fde047), hole = "shade" (default: campaign deep shade to the bottom)
   or "open" (no slab: the background shows through, for platform / no-floor stages such as the Mine Cart lab's open-depth holes) */
/* L8 SLAG PITS II: its own warm palette (the L2 family, a hotter orange ground line; 06f draws its slag river + ladle gantries) */
LV_PAL.push({sk0:"rgba(56,14,4,.42)",sk1:"rgba(249,115,22,.40)",hz:"rgba(253,224,71,.32)",gd:"rgba(62,18,6,.45)",ln:"#fb923c",gl:"rgba(251,146,60,.22)",pr:"#2a1208",pe:"#fb923c",hot:"#fde047"});
for(var lvI=0;lvI<LEVELS.length;lvI++){LEVELS[lvI].at=LV_AT[lvI];LEVELS[lvI].sec=LV_SEC[lvI];LEVELS[lvI].pal=LV_PAL[lvI]}
/* level state (derived from the distance, never stored elsewhere): lvl = level shown, lvB = banner seconds left,
   lvT = seconds since the last change, lvS/lvPS = distance/state seen by the previous lvTick (new-run detection) */
var lvl=1,lvB=0,lvT=0,lvS=Infinity,lvPS="";
/* LEVELS-2 crossfade: lvPrev = level faded from (== lvl when no fade is running); lvFade() = 0..1 progress over LV_FADE s */
var lvPrev=1;
function lvFade(){return lvPrev===lvl?1:Math.max(0,Math.min(1,lvT/LV_FADE))}
/* debug (web build only, cosmetic): ?level=N = level floor N for every run, with its banner at run start; score/speed/beacons untouched */
var LVQ=window.FR_BUILD!=="poki"&&/^[1-8]$/.test(Q.get("level")||"")?+Q.get("level"):0;
/* spark burst pool: fixed size, preallocated, no per-frame allocation */
var lvPX=new Float32Array(LV_NP),lvPY=new Float32Array(LV_NP),lvVX=new Float32Array(LV_NP),lvVY=new Float32Array(LV_NP),lvPL=new Float32Array(LV_NP),lvPA=new Float32Array(LV_NP),lvPC=new Uint8Array(LV_NP);
var LV_PC=["#fde047",OR,"#ffffff"];
/* the one distance input: score (read only). Swap here if a separate distance counter ever lands */
function lvDist(){return score}
function lvFor(s){var n=1;for(var i=1;i<LV_AT.length;i++)if(s>=LV_AT[i])n=i+1;return Math.max(n,LVQ)}
/* currentLevel(): pure function of the current run's distance (1..8) */
function currentLevel(){return lvFor(lvDist())}
function getLevelDef(n){return LEVELS[Math.max(1,Math.min(LEVELS.length,n||currentLevel()))-1]}
function lvMusic(n){if(typeof musicLevel==="function"){try{musicLevel(n)}catch(e){}}}
/* Audio level-up sting (n = 2..8): only on a real level change (where the banner fires), never at level 1 or run start */
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
   L1 0.85 (felt 289-408), L2 0.92 (442-570), L3 0.95 (589-722), L4 1.00 (760), L5 1.06 -> capped to 800/760 (800),
   L6 1.06 -> the same 800 (felt speed and score unchanged from L5: the L5 -> L6 ease is a no-op), L7 / L8 1.06 -> 800 (likewise).
   Eases from lvPrev's to lvl's value with a smoothstep over the LEVELS-2 crossfade (lvFade(), LV_FADE s); the cap is applied after
   the ease and 800/speed is continuous in speed, so neither creates a per-frame jump.
   Pure: reads state/score/speed/lvl/lvPrev/lvT/lvS/lvPS, writes nothing, no Math.random. 1 outside a run (attract scroll, game over). */
var LV_SPD=[.85,.92,.95,1,1.06,1.06,1.06,1.06],LV_SPD_LO=.8,LV_SPD_HI=1.25,LV_FELT=800;
function lvSpdOf(n){var v=LV_SPD[Math.max(1,Math.min(LV_SPD.length,n|0))-1];return Math.max(LV_SPD_LO,Math.min(LV_SPD_HI,+v||1))}
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
   wMin/wMax = gap width as a fraction of Dfull (Dfull = GAP_DFULL_S 0.689 s x felt speed, measured at the lip), never above GAP_CAP x GAP_JUMP_MUL;
   GAP_CAP=1 = fraction of the DEFAULT full jump (holes may be as wide as a full held jump); GAP_JUMP_MUL=1 = headroom for power-ups
   (a jump boost can raise it, or gapJumpMul() in 06k) - never hardcode the cap forever;
   minClear = s of clear track between gaps (never below GAP_MIN_JUMP_SEP); chanceMin..chance = fraction of spawns that are gaps;
   noGapBefore = s into the run before the first gap. GAP_MIN_JUMP_SEP = s between required jumps.
   getGapLv() = the current level's entry (L1 outside a run / before the run is seen); lvGapsBlocked() = true while the level
   banner or the level crossfade is up (no new gaps then), and, with GAPS (06k) in the build, from L5 until CRUSHER DOWN (06h crNoGap, typeof-guarded). */
var GAP_CAP=1,GAP_JUMP_MUL=1,GAP_MIN_JUMP_SEP=.85,GAP_DFULL_S=.689;
var GAP_LV=[
  {wMin:.20,wMax:.30,minClear:2.0,chanceMin:0,chance:.12,noGapBefore:12},
  {wMin:.35,wMax:.55,minClear:1.4,chanceMin:.22,chance:.32,noGapBefore:0},
  {wMin:.45,wMax:.70,minClear:1.15,chanceMin:.28,chance:.40,noGapBefore:0},
  {wMin:.41,wMax:.64,minClear:.95,chanceMin:.35,chance:.48,noGapBefore:0},
  {wMin:.52,wMax:.72,minClear:.85,chanceMin:.42,chance:.55,noGapBefore:0},
  {wMin:.55,wMax:.78,minClear:.85,chanceMin:.30,chance:.36,noGapBefore:0}, /* L6 ARC FURNACE: wider than L5; chance under L5 because ARC STRIKES share the spawn slots */
  /* L7 MINE CART: the gap level (no strike plates or rollers to share slots with): nearly every slot a gap, a touch wider than L6, at
     the .85 s floor; isl = chance a gap becomes an island chain (06k ISLANDS: gap, isLen s of track, a gap of isW x Dfull) */
  {wMin:.58,wMax:.80,minClear:.85,chanceMin:.85,chance:.92,noGapBefore:0,isl:.75,isLen:[.28,.42],isW:[.30,.42],rise:60,crest:1.05,sw:.02,wk:90000},
  /* L8 SLAG PITS II: the L5 row + gap kinds (06k KINDS, 06q SLAG: tide pools, crumbling bridges) */
  {wMin:.52,wMax:.72,minClear:.85,chanceMin:.55,chance:.7,noGapBefore:0,kinds:{pool:.4,geyser:.35,crust:.15,fall:.2}}
];
function getGapLv(){
  if(state!=="run"||lvFresh())return GAP_LV[state==="run"?Math.max(1,Math.min(GAP_LV.length,lvFor(lvDist())))-1:0];
  return GAP_LV[Math.max(1,Math.min(GAP_LV.length,lvl))-1];
}
/* run-start safe (independent of hook order): on a new run's first update() steps, before lvTick has reset lvB/lvl/lvT, the previous
   run's banner/crossfade must not leak in; blocked then only if this run starts with a ?level=N banner (LVQ > 1) */
function lvGapsBlocked(){if(typeof crNoGap==="function"&&crNoGap())return true;if(state==="run"&&lvFresh())return LVQ>1;return lvB>0||(lvPrev!==lvl&&lvFade()<1)}
/* HUD progress marker (levels-identity): "LV<n> [bar] LV<n+1>" under the mute/pause buttons (top left): the current level in its
   colour, a thin bar filling from LV_AT[lvl-1] to LV_AT[lvl] (= LV_SEC run time on the base curve), then the next level in its
   colour (LV_HL); "LV8 [full bar] MAX" at L8 (the last level). Runs only; hidden while the
   missions toast shows (it is centred on the same row). lvNextF(s,l) = fill 0..1 toward level l+1 at distance s (pure). */
var LV_HL=["","LV2","LV3","LV4","LV5","LV6","LV7","LV8","MAX"],LV_HB={CS:-1,OY:0,HS:0,HUDY:0,K:0,y:0},LV_MG=9,LV_MC=null;
function lvNextF(s,l){if(l>=LV_AT.length)return 1;var a=LV_AT[l-1],b=LV_AT[l];return Math.max(0,Math.min(1,(s-a)/(b-a)))}
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
  var l=Math.max(1,Math.min(LEVELS.length,lvl)),f=lvNextF(lvDist(),l),d=LEVELS[Math.min(LEVELS.length-1,l)],y=lvHudY(),x=XO+14,px=Math.round(10*HS);
  var bw=Math.round(40*HS),bh=Math.max(2,Math.round(3*HS)),lw=Math.round(26*HS),nx=x+lw+bw+Math.round(4*HS);
  var now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lvDt)/1000)),tg=lvRobotHit(x,y,nx+lw,y+px+2)?LV_DIM:1;
  lvDt=now;lvDm=rm()?tg:lvDm+(tg-lvDm)*Math.min(1,dt*25);
  if(Math.abs(lvDm-tg)<.02)lvDm=tg;
  var a=lvDm;
  ctx.globalAlpha=.85*a;
  txt("LV"+l,x,y+px,px,LEVELS[l-1].c,"left",true,true,true,"","lvc");
  txt(LV_HL[l],nx,y+px,px,d.c,"left",true,true,true,"","lvh");
  ctx.globalAlpha=.55*a;ctx.fillStyle="rgba(5,7,13,.8)";ctx.fillRect(x+lw-1,y+px-bh-2,bw+2,bh+2);
  ctx.globalAlpha=(l>=LEVELS.length?.5:.85)*a;ctx.fillStyle=d.c;ctx.fillRect(x+lw,y+px-bh-1,Math.round(bw*f),bh);
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
