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
/* sparks run state (sparks PR5): skDone = run-end accounting done this run, skNB = new-best bonus paid this run */
var skDone=0,skNB=0;
/* purchase jackpot: skMgP = first magnet pickup seen this run, skMgT = "MAGNET!" pop timer (s);
   skCDf/skCDt = bank count-down after a buy (from value, start time in ms; 0 = idle) */
var skMgP=0,skMgT=0,skCDf=0,skCDt=0;
/* Missions hooks (msOn, defined by a later fragment): msOv = "over" already reported this run (a Poki Continue re-enters
   the same run without start(), so a second death must not report it again) */
var msOv=0;
/* sparks effects (sparks PR6, SPEC §2, §7): spMax/bgMax = this run's spring / big-cart durations (Power Cell; the HUD timer bars
   divide by them), cores = Spare Cores left this run, rfT = Forge Plate L3 re-forge countdown (s), rfU = the re-forge was used */
var spMax=SPT,bgMax=BGT,cores=0,rfT=0,rfU=0;
/* upgrade kick-in label (PR6 polish): skLbS = text, skLbC = colour, skLbT = seconds left (under reduced motion only 06i BIG AIR sets it, drawn static);
   shdP = the current shield came from the Forge Plate (start shield or re-forge), not a pickup */
var skLbS="",skLbC="#67e8f9",skLbT=0,shdP=0;
function big(){return bgT>0}
function pW(){return big()?60:PW}
function pH(dk){return dk?18:big()?40:30}

`;
