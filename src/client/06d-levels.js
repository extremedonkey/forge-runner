// LEVELS (LEVELS-1, owner: Levels): 5 cosmetic levels by distance, level-up banner + spark burst, musicLevel(n) hook.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC / PROGRESS: reads score (distance on the deterministic base speed curve) and never writes score, speed,
// spawning or enemies. Hooks (one line each): start() -> lvReset(); update(dt) -> lvTick(dt); draw() -> lvDraw() after drawHud().
// Interface for Dev / Audio / LEVELS-2 (per-level background + palette): currentLevel() (1..5), getLevelDef(n?) -> LEVELS entry,
// lvT (seconds since the last level change, for crossfades), LEVELS, LV_SEC, LV_AT. Runs after 04-viewport.js (START/MAXV).
export default String.raw`
/* levels: thresholds = base-curve distance (score) after LV_SEC seconds of a run. Base curve (13-simulation.js update()):
   speed START=340 -> MAXV=760 px/s at +7/s (reached at 60 s), score += speed*0.05 per s. So L2 1119, L3 2790, L4 4500, L5 6210. */
var LV_SEC=[0,45,90,135,180],LV_ACC=7,LV_RATE=.05,LV_BANNER=1.5,LV_NP=36;
function lvBase(t){var tm=(MAXV-START)/LV_ACC,a=Math.min(t,tm);return LV_RATE*(START*a+LV_ACC*a*a/2+MAXV*Math.max(0,t-tm))}
var LV_AT=LV_SEC.map(function(s){return Math.floor(lvBase(s))});
var LEVELS=[
  {n:1,key:"foundry",name:"FOUNDRY",c:OR},
  {n:2,key:"slag",name:"SLAG PITS",c:"#fde047"},
  {n:3,key:"ember",name:"EMBER VENTS",c:"#fb7185"},
  {n:4,key:"hammer",name:"HAMMER WORKS",c:CY},
  {n:5,key:"crusher",name:"CRUSHER",c:VI}
];
for(var lvI=0;lvI<5;lvI++){LEVELS[lvI].at=LV_AT[lvI];LEVELS[lvI].sec=LV_SEC[lvI]}
/* run state: lvl = current level (1 on every new run), lvB = banner seconds left, lvT = seconds since the last change */
var lvl=1,lvB=0,lvT=0;
/* debug (web build only, cosmetic): ?level=N starts every run at level N with its banner; score/speed/beacons untouched */
var LVQ=window.FR_BUILD!=="poki"&&/^[1-5]$/.test(Q.get("level")||"")?+Q.get("level"):0;
/* spark burst pool: fixed size, preallocated, no per-frame allocation */
var lvPX=new Float32Array(LV_NP),lvPY=new Float32Array(LV_NP),lvVX=new Float32Array(LV_NP),lvVY=new Float32Array(LV_NP),lvPL=new Float32Array(LV_NP),lvPA=new Float32Array(LV_NP),lvPC=new Uint8Array(LV_NP);
var LV_PC=["#fde047",OR,"#ffffff"];
function lvFor(s){var n=1;for(var i=1;i<5;i++)if(s>=LV_AT[i])n=i+1;return n}
function currentLevel(){return lvl}
function getLevelDef(n){return LEVELS[Math.max(1,Math.min(5,n||lvl))-1]}
/* banner baseline: under the HUD in the playfield; in portrait (OY > 0) up in the extra sky, clear of the buggy and the sun */
function lvY(){return OY?Math.round(-OY*.3):Math.round(H*.42)}
function lvMusic(n){if(typeof musicLevel==="function"){try{musicLevel(n)}catch(e){}}}
function lvBurst(){
  if(typeof rm==="function"&&rm())return;
  var cx=XO+VW/2,cy=lvY()-10;
  for(var i=0;i<LV_NP;i++){
    var a=Math.random()*6.283,s=60+Math.random()*220;
    lvPX[i]=cx+(Math.random()-.5)*160;lvPY[i]=cy;lvVX[i]=Math.cos(a)*s;lvVY[i]=Math.sin(a)*s-80;
    lvPA[i]=0;lvPL[i]=.5+Math.random()*.6;lvPC[i]=i%3;
  }
}
function lvSet(n,banner){
  if(n===lvl&&!banner)return;
  lvl=n;lvT=0;lvMusic(n);
  if(banner){lvB=LV_BANNER;lvBurst()}
}
function lvReset(){
  lvB=0;for(var i=0;i<LV_NP;i++)lvPL[i]=0;
  lvl=0;lvSet(LVQ||1,LVQ>1);
}
function lvTick(dt){
  lvT+=dt;
  if(lvB>0)lvB=Math.max(0,lvB-dt);
  for(var i=0;i<LV_NP;i++)if(lvPL[i]>0){
    lvPA[i]+=dt;if(lvPA[i]>=lvPL[i]){lvPL[i]=0;continue}
    lvVY[i]+=420*dt;lvPX[i]+=lvVX[i]*dt;lvPY[i]+=lvVY[i]*dt;
  }
  if(state==="run"){var n=lvFor(score);if(n>lvl)lvSet(n,true)}
}
function lvDraw(){
  if(state==="start")return;
  for(var i=0;i<LV_NP;i++)if(lvPL[i]>0){
    ctx.globalAlpha=1-lvPA[i]/lvPL[i];ctx.fillStyle=LV_PC[lvPC[i]];ctx.fillRect(lvPX[i]|0,lvPY[i]|0,4,4);
  }
  ctx.globalAlpha=1;
  if(!(lvB>0))return;
  var d=getLevelDef(),e=LV_BANNER-lvB,s="LEVEL "+d.n+": "+d.name;
  ctx.globalAlpha=rm()?1:Math.min(1,e/.15,lvB/.5);
  txt(s,XO+VW/2,lvY(),fitPx(s,30*HS,VW-24,true,true),d.c,"center",true,true,true,rm()?"":d.c,"lvb");
  ctx.globalAlpha=1;
}

`;
