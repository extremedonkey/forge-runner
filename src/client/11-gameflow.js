// GAME FLOW: start(), die(), press(), release(), particles addP()/sparks()/dust().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* game flow */
function start(){
  startMusic();
  window.FRLB&&FRLB.hide();
  state="run";score=0;speed=START;ents=[];parts=[];py=0;vy=0;jb=0;nt="b";
  shd=0;inv=0;spT=0;bgT=0;runS=0;puNext=150+Math.random()*100;
  /* sparks effects (PR6): Supply Drop on the first pickup, Power Cell durations, Spare Cores, Forge Plate L1 start shield
     (all base values when SKON is off: x1, SPT/BGT, 0, none) */
  puNext*=skPuF();spMax=skSPT();bgMax=skBGT();cores=skCores();rfT=0;rfU=0;
  shdP=0;if(SKON&&skLv("p")>=1){shd=1;shdP=1}
  if(tpu){if(tpu==="s")shd=1;else if(tpu==="j")spT=spMax;else bgT=bgMax}
  spawnDist=0;nextGap=500;lastM=0;flash=0;held=false;beat=false;beatT=0;shake=0;wasAir=false;
  if(typeof rsStart==="function")rsStart();  /* first-run rescue: crate 1 >= 4 s, early spark row (06h) */
  typeof hlStart==="function"&&hlStart();  /* HILLS (06i): flat start, terrain from 12 s */
  shB.style.display="none";np.style.display="none";
  skRun=0;skDone=0;skNB=0;upHide();
  track("start");
  msOv=0;if(!demo)typeof msOn==="function"&&msOn("start");
}
function die(){
  state="over";deathAt=performance.now();flash=0;
  var s=Math.floor(score),h0=hi;
  lastS=s;
  if(!demo&&!tpu&&!skDebug&&s>hi){
    hi=s;
    try{localStorage.setItem(KEY,String(hi))}catch(e){}
  }
  track("over",s,runS);
  if(typeof rsDie==="function")rsDie();
  if(!demo&&!msOv){msOv=1;typeof msOn==="function"&&msOn("over",Math.floor(score*20),runS)}  /* distance px (1 point = 20 px), run seconds */
  if(!demo&&!tpu&&window.FRLB)lbOver(s,runS);
  skDie(s,h0);
  placeShare();shB.style.display="block";
  if(SKON&&!demo&&!tpu)upShow();
  /* sfxDeath (08f, Audio #81): after a gap fall it ducks only the crash; the old inline crash is the fallback */
  if(snd&&AU){if(typeof sfxDeath==="function")sfxDeath();else{noise(AU,ac.currentTime,.4,.25,.25);sfx(520,60,.45,2,.09)}}
  if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}
}
/* sparks run end (SPEC §1, §4): pickups and milestones were banked live by skEarn(). Here: new personal best +10 (not on the
   first run: h = the best before this run must be > 0; once per run), the starter floor (each of the first 3 counted runs pays
   at least 8), the run count n, then one save. Demo, power-up test and debug runs neither earn, count nor write. */
function skDie(s,h){
  if(!SKON||demo||tpu||skDebug)return;
  if(!skNB&&h>0&&s>h){skNB=1;skEarn(10)}
  if(!skDone){skDone=1;if(sk.n<3&&skRun<8)skEarn(8-skRun);sk.n=Math.min(SKMAX,sk.n+1)}
  skSave();
}
function press(){
  if(window.FRLB&&FRLB.isOpen())return;
  var t=performance.now();
  if(state==="start"){start()}
  else if(state==="over"){if(t-deathAt>400)start()}
  else{held=true;jb=.12}
}
function release(){
  held=false;
  var c=spT>0?CUT*JMUL:CUT;
  if(vy>c)vy=c;
}
function addP(p){if(parts.length<160)parts.push(p)}
function sparks(x,y,n,sp){
  for(var i=0;i<n;i++){
    var a=rnd(0,6.283),s=rnd(sp*.3,sp);
    addP({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:rnd(.35,.8),age:0,c:i%3===0?CY:OR,g:500,z:3});
  }
}
function dust(x,y,n){
  if(rm())return;
  for(var i=0;i<n;i++)addP({x:x+rnd(-6,6),y:y-rnd(0,3),vx:rnd(-90,-20)+(n>1?rnd(-40,60):0),vy:-rnd(15,70),life:rnd(.25,.5),age:0,c:"#94a3b8",g:160,z:2});
}

`;
