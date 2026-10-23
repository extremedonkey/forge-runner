// LEVELS (LEVELS-1, owner: Levels): 5 cosmetic levels by distance, level-up banner + spark burst, musicLevel(n) hook.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC / PROGRESS: reads score (the run's distance on the deterministic base speed curve; lvDist()) and never writes
// score, speed, spawning or enemies. All level/banner state lives here; nothing in 06-state/11-gameflow/13-simulation.
// Hooks (one line each, typeof-guarded): 16-loop.js frame() -> lvTick(dt) right after the update() sub-steps;
// 14-render.js drawHud() -> lvDraw() at the end of the HUD block. A new run is detected in lvTick (distance went down / run began).
// Interface for Dev / Audio / LEVELS-2 (per-level background + palette): currentLevel() (1..5, pure function of the distance),
// getLevelDef(n?) -> LEVELS entry (.pal = LEVELS-2 palette), lvFade()/lvPrev (LEVELS-2 crossfade), lvl (level shown/announced this run), lvT (seconds since the last level change, for crossfades), LEVELS, LV_SEC, LV_AT. Runs after 04-viewport.js (START/MAXV).
export default String.raw`
/* levels: thresholds = base-curve distance (score) after LV_SEC seconds of a run. Base curve (13-simulation.js update()):
   speed START=340 -> MAXV=760 px/s at +7/s (reached at 60 s), score += speed*0.05 per s. So L2 1119, L3 2790, L4 4500, L5 6210. */
var LV_SEC=[0,45,90,135,180],LV_ACC=7,LV_RATE=.05,LV_BANNER=1.5,LV_NP=36,LV_FADE=1.2;
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
function lvDraw(){
  if(state==="start")return;
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
