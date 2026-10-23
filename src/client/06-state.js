// STATE: run state (score, speed, player, ents, best...) and power-up state (shd, inv, spT, bgT) + big()/pW()/pH().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* state */
var state="start",score=0,speed=START,scroll=0,tt=0,py=0,vy=0,held=false,duck=false,jb=0;
var ents=[],parts=[],spawnDist=0,nextGap=500,lastM=0,flash=0,deathAt=0,nt="b";
var raf=0,last=0,lastS=0,beat=false,beatT=0,shake=0,land=0,wasAir=false,dustT=0,runT=0,dn=0;
/* power-ups: shd = shield charges (absorbs one hit), inv = post-hit invulnerability, spT/bgT = spring / big seconds left */
var shd=0,inv=0,spT=0,bgT=0,puNext=0,lastK="",runS=0,spkT=0;
var SPT=10,BGT=6,JMUL=1.2;
function big(){return bgT>0}
function pW(){return big()?60:PW}
function pH(dk){return dk?18:big()?40:30}

`;
