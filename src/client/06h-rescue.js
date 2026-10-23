// FIRST-RUN RESCUE (owner: Dev): gentle start, forgiveness and first-runs teaching (revenue-two-changes-2026-10-24.md §4,
// Playtest baseline 2026-10-23: crate 1 at 2.95 s with no prompt, real median run 5 s).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 06e-missions.js (uses lsg/lss, demo/tpu/skDebug from 01-core.js, START/W/PX/PW from 04/06, SKON from 06b).
// Every run, every player (not ?demo=1): crate 1 reaches the buggy no earlier than 4 s and crate 2 no earlier than 7 s of run
//   time; a RAMP_S=12 density ramp merged with the shipped gentle 30 s (the larger easing wins, they never stack); coyote time
//   (80 ms after leaving the ground without a jump); the jump buffer (jb=.12 in press(), 120 ms); obstacle hitboxes shrunk 2 px
//   per side (visuals unchanged); an early spark row collected at ~2.0-2.2 s (chime = sfxSpark per pickup).
// Runs 1-3 (completed runs counted in localStorage forge-runner-rescue; ?sk= debug counts in memory only): a TAP / SPACE prompt
//   with 0.4 s of slow-mo (the sim dt is scaled, so speed, score and runS advance together and score stays distance-only) just
//   before crate 1 reaches the buggy (none for the rest of the page session once the player has cleared 2 crates with clean
//   jumps); bounce-back instead of death only on crates #1 and #2 of the run (by spawn index) and only before 12 s of run time
//   (Playtest PR-65: no late bounces in a good run); any later crate hit is a normal death. A run that used a bounce is kept
//   off the global leaderboard (fairness amendment F2); the 'Practice run, not ranked' line is site-only (Poki has no board). New players (no jump ever) also get a ghost
//   jump arc over the next crate until their first jump.
// None of it runs in ?demo=1, so the demo replays exactly (seeded canvas hashes). No Math.random here.
export default String.raw`
/* first-run rescue */
var RESCUE_V=1;                    /* sent as rv by the Missions telemetry (03-beacons.js) */
/* tuning table: ramp = RAMP_S, re = extra gap easing at t=0 (x2.2 at 0 s -> x1 at RAMP_S), t1/t2 = earliest crate 1/2 arrival
   (s), coy = coyote time, hb = hitbox shrink px per side, runs = first-runs teaching, bounces per run, slow-mo seconds / factor,
   lead = prompt+slow-mo when crate 1 is this many seconds away, row = early spark row arrival (s), bCr / bT = only crates #1..bCr
   of the run bounce and only before bT s of run time, clean = clean crate jumps that end prompt + slow-mo for the session */
var RS={ramp:12,re:1.2,t1:4,t2:7,coy:.08,hb:2,runs:3,bounces:2,slowS:.4,slowK:.4,lead:.45,row:2,vetHi:200,bCr:2,bT:12,clean:2};
var RAMP_S=RS.ramp,RSK="forge-runner-rescue";
var rsOn=!demo;
var rsSave={n:0,h:0};              /* n = completed runs, h = 1 once the player has jumped (ghost hint done) */
var rsMem=typeof skDebug!=="undefined"&&!!skDebug;  /* ?sk= debug: memory only, never read or write */
(function(){
  if(!rsOn||rsMem)return;
  try{var o=JSON.parse(lsg(RSK)||"null");if(o&&typeof o==="object"){var n=+o.n;rsSave.n=isFinite(n)&&n>0?Math.min(9999999,Math.floor(n)):0;rsSave.h=o.h?1:0}}catch(e){}
})();
function rsWrite(){if(!rsOn||rsMem||tpu)return;lss(RSK,JSON.stringify(rsSave))}
/* veteran (product owner, 24 Oct): the save already shows real experience, i.e. local best >= RS.vetHi or any upgrade bought.
   Veterans skip all runs 1-3 help (prompt + slow-mo, bounce-back, ghost arc); the every-run parts stay. Decided once, at the
   first run start of the page (the save is loaded by then); under ?sk= the in-memory debug save is what is read. */
var rsVet=-1;
function rsIsVet(){
  if(rsVet<0){
    var v=(+hi||0)>=RS.vetHi;
    if(!v&&typeof skLv==="function"&&typeof SKU!=="undefined")for(var k in SKU)if(skLv(k)>0){v=true;break}
    rsVet=v?1:0;
  }
  return rsVet===1;
}
/* run state */
var rsFirst=false,rsHint=false,rsBn=0,rsCr=0,rsSlowT=0,rsSlowDone=0,rsPrompt=0,rsPE=null,rsCoy=0,rsKb=0,rsFl=0,rsLbT=0,rsDone=0,rsCrN=0;
var rsClean=0;                     /* clean jumps over crates this page session (never reset by start()) */
/* last input kind for the prompt word: TAP on touch, SPACE on keys/mouse */
var rsTouch=!!(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches);
if(rsOn&&typeof window.addEventListener==="function"){
  window.addEventListener("touchstart",function(){rsTouch=true},{passive:true,capture:true});
  window.addEventListener("keydown",function(){rsTouch=false},{passive:true,capture:true});
}
function rsS(t){return START*t+3.5*t*t}   /* run distance (px) after t s: 340 px/s +7/s (the curve itself is untouched) */
function rsLead(){return W+20-PX-PW}      /* an obstacle spawns at x=W+20 and reaches the buggy's front after this many px */
/* start(): reset; crate 1 no earlier than RS.t1; the early spark row */
function rsStart(){
  rsBn=0;rsCr=0;rsCrN=0;rsSlowT=0;rsSlowDone=0;rsPrompt=0;rsPE=null;rsCoy=0;rsKb=0;rsFl=0;rsLbT=0;rsDone=0;rsFirst=false;rsHint=false;
  if(!rsOn)return;
  var vt=rsIsVet();
  rsFirst=!vt&&rsSave.n<RS.runs;rsHint=!vt&&!rsSave.h;
  nextGap=Math.max(nextGap,rsS(RS.t1)-rsLead()+8);  /* +8 px: a frame of margin so it is never early */
  if(SKON)for(var i=0;i<4;i++)ents.push({x:PX+PW+rsS(RS.row)+i*26,w:12,h:12,bot:8,t:"k",rs:1});
}
/* spawn(): after the gap is set. Merge the RAMP_S ramp with the gentle 30 s (the larger factor wins) and hold crate 2 to RS.t2 */
function rsGap(w){
  if(!rsOn)return;
  rsCr++;
  /* crate spawn index: tag the crate(s) this spawn() just pushed (x=W+20.., the last entries) with the run's crate count */
  var le=ents[ents.length-1];
  if(le&&le.t==="b"&&le.x>=W+19&&le.rsi===undefined){rsCrN++;for(var i=ents.length-1;i>=0&&ents[i].t==="b"&&ents[i].x>=W+19&&ents[i].rsi===undefined;i--)ents[i].rsi=rsCrN}
  var f30=runS<30?1+.8*(1-runS/30):1,f12=runS<RS.ramp?1+RS.re*(1-runS/RS.ramp):1;
  if(f12>f30)nextGap*=f12/f30;
  if(rsCr===1)nextGap=rsS(RS.t2)-rsLead()-w-score*20+8;  /* crate 2 at 7 s exactly: never earlier, and no gap over 3 s */
}
/* update(): slow-mo scales the whole sim step (speed, scroll, score and runS together); counts down in real time */
function rsDt(dt){
  if(!rsOn||state!=="run")return dt;
  if(rsCoy>0)rsCoy-=dt;
  if(rsKb>0)rsKb=Math.max(0,rsKb-dt*60);
  if(rsFl>0)rsFl-=dt;
  if(rsLbT>0)rsLbT-=dt;
  /* clean jump: a crate passed behind the buggy with no hit (no inv from a bounce / shield break, not bounced) */
  for(var c=0;c<ents.length;c++){var q=ents[c];if(q.t==="b"&&!q.rsc&&q.x+q.w<PX){q.rsc=1;if(inv<=0&&!q.rsb)rsClean++}}
  if(rsFirst&&!rsSlowDone&&rsClean<RS.clean){
    for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t!=="b")continue;
      var d=e.x-(PX+pW());if(d>0&&d<=speed*(typeof vMul==="function"?vMul():1)*RS.lead){rsSlowDone=1;rsSlowT=RS.slowS;rsPrompt=1;rsPE=e}break}  /* HILLS: lead at the felt speed vMul() */
  }
  if(rsPrompt&&rsPE&&rsPE.x+rsPE.w<PX)rsPrompt=0;
  if(rsSlowT>0){rsSlowT-=dt;return dt*RS.slowK}
  return dt;
}
/* a jump fired: prompt and slow-mo end, the ghost hint is done for good */
function rsJump(){
  if(!rsOn)return;
  rsPrompt=0;rsSlowT=0;rsCoy=0;
  if(rsHint||!rsSave.h){rsHint=false;rsSave.h=1;rsWrite()}
}
/* coyote: may this airborne buggy still jump? (left the ground without a jump within RS.coy) */
function rsCanJump(){return rsOn&&rsCoy>0}
/* the hit branch, after inv and the shield: runs 1-3 bounce back off crates #1..RS.bCr of the run (spawn index), before RS.bT s */
function rsBounce(e){
  if(!rsOn||!rsFirst||rsBn>=RS.bounces||e.t!=="b"||!(e.rsi>=1&&e.rsi<=RS.bCr)||runS>=RS.bT)return false;
  rsBn++;e.rsb=1;vy=420;py=Math.max(py,.5);jb=0;inv=Math.max(inv,.9);rsCoy=RS.coy;rsPrompt=0;rsSlowT=0;
  rsLbT=1.1;  /* "SAVED!" label (also under reduced motion, static) */
  if(!rm()){rsKb=14;rsFl=.35;shake=Math.max(shake,.1);sparks(PX+PW,GY-15,10,180)}
  sfx(220,520,.12,1,.07);
  return true;
}
/* obstacle hitbox shrink (px per side), applied in hit() on the obstacle box */
function rsHB(){return rsOn?RS.hb:0}
/* die(): count the completed run once (a Poki Continue re-enters the same run) */
function rsDie(){if(!rsOn||rsDone)return;rsDone=1;rsSave.n=Math.min(9999999,rsSave.n+1);rsWrite()}
/* render (14-render.js draw()): ghost jump arc over the next crate for new players (until their first jump); world coords.
   The arc is where a well-timed jump goes relative to the crate: take-off about 0.2 s of travel before it, landing past it. */
function rsDrawHint(){
  if(!rsOn||!rsHint||state!=="run")return;
  for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t!=="b"||e.x+e.w<PX)continue;
    var x0=e.x-speed*(typeof vMul==="function"?vMul():1)*.2,x1=e.x+e.w+40,pk=58,n=12,j;  /* HILLS: felt speed vMul() */
    if(x0>W+40)return;
    ctx.fillStyle="#67e8f9";
    for(j=0;j<=n;j++){var u=j/n,xx=x0+(x1-x0)*u,yy=GY-6-pk*4*u*(1-u);ctx.globalAlpha=.25+.25*Math.sin(u*3.14159);ctx.fillRect(Math.round(xx)-1,Math.round(yy)-1,3,3)}
    ctx.globalAlpha=1;return;
  }
}
`;
