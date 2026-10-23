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
  if(tpu){if(tpu==="s")shd=1;else if(tpu==="j")spT=SPT;else bgT=BGT}
  spawnDist=0;nextGap=500;lastM=0;flash=0;held=false;beat=false;beatT=0;shake=0;wasAir=false;
  shB.style.display="none";np.style.display="none";
  track("start");
}
function die(){
  state="over";deathAt=performance.now();flash=0;
  var s=Math.floor(score);
  lastS=s;
  if(!demo&&!tpu&&s>hi){
    hi=s;
    try{localStorage.setItem(KEY,String(hi))}catch(e){}
  }
  track("over",s,runS);
  if(!demo&&!tpu&&window.FRLB)lbOver(s,runS);
  placeShare();shB.style.display="block";
  if(snd&&AU){noise(AU,ac.currentTime,.4,.25,.25);sfx(520,60,.45,2,.09)}
  if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}
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
