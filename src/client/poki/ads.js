// POKI BUILD ONLY (owner: Dev). POKI-2: Poki SDK lifecycle hooks through Entrepreneur's FRAds adapter (src/client/ads-adapter.js).
// Joined into dist/poki/game.js by src/client/poki/script.mjs, right before poki/mobile.js and 16-loop.js; the one-line hook
// calls in start()/die()/press()/update()/input/loop are asserted text edits in script.mjs. NOT part of the site/Lambda SCRIPT,
// so the site page stays byte-identical (ads OFF, no request, press-to-retry, 400 ms lockout, no Continue).
// Without window.FRAds (adapter blocked) or FR_ADS_CONFIG, ads is the no-op stub from the notes §1 and the game plays as on the site.
// Spec: ads/integration-notes.md §2-5 + poki/BRIEF.md. Same fragment rules: plain browser JS, shared IIFE scope, no backticks, no ${...}.
export default String.raw`
/* ---- Poki ads (POKI-2, Dev) ---- */
var ADS=window.FR_ADS_CONFIG||{enabled:false,backend:"none"};
var ads=window.FRAds?FRAds.create(ADS):{busy:false,enabled:false,onPause:function(){return this},onResume:function(){return this},
  init:function(){return Promise.resolve()},gameLoadingFinished:function(){},gameplayStart:function(){},gameplayStop:function(){},
  onHidden:function(){},onVisible:function(){},setSoundEnabled:function(){},
  showInterstitial:function(){return Promise.resolve({shown:false,status:"disabled"})},
  prepareRewarded:function(){return Promise.resolve(false)},showRewarded:function(){return Promise.resolve({rewarded:false,status:"disabled"})}};
var adPaused=false,continuedThisRun=false,deaths=0,rtArm=false;
/* audio during ads (music stop, AudioContext suspend/resume, silent gestures/sfx) is Audio's: 08-audio.js audioHookAds()
   wraps these handlers on every FRAds.create() (#15). The game side only freezes play and drops held input. */
ads.onPause(function(){adPaused=true;rtArm=false;release();duck=false});
ads.onResume(function(){adPaused=false;last=0});
/* Retry = natural break: gameplayStop (die) -> commercialBreak -> gameplayStart (start). Used only when ads.enabled. */
function retry(){
  if(ads.busy)return;
  rtArm=false;hideContinue();
  ads.showInterstitial("retry").then(function(){start()});
}
/* ads.enabled: retry fires on release (touchend / mouseup / keyup / Retry click), armed by a press after the 800 ms lockout */
function upRetry(){if(rtArm){rtArm=false;if(state==="over"&&!adPaused)retry()}}
/* rewarded 🎬 Continue + 🎬 Double sparks (POKI-7, Mobile; spec revenue-two-changes-2026-10-24.md §6). Poki build only, and OFF
   unless FR_ADS_CONFIG.continue===true / FR_ADS_CONFIG.double===true (both absent in build-flags-poki.mjs). OFF = no 🎬 button in
   the DOM and no rewarded ad request (only a 🎬 click reaches ads.showRewarded).
   - One 🎬 button at a time, shown only together with Retry (after its lockout) and below it; Retry is first and larger
     (poki/mobile.js styles: Retry >= 150x48, 🎬 136x44, cyan, never green).
   - Continue: once per run; never on the first death of the session; distance-gated (no timers): score >= half the best and
     >= RWMIN, the score of 30 s at the base speed (START*.05*30 = 510). Order: gameplayStop (die) -> rewarded break -> gameplayStart.
     Granted only on rewarded===true (no "ad blocked" message). A continued run is flagged (continuedThisRun): no new-best +10 ✦,
     no Share/challenge link for it, and (Poki has no board) nothing is ever submitted.
   - Double: once per run, on the final game over (only when Continue is not offered), doubles this run's earned ✦ (skRun).
     The spec hid it "until PR6 shows all 5 upgrades"; PR6 (#51) has landed, so it is offered (flag ON only) - the UPK.length >= 5
     check stays as a guard. */
var RWMIN=Math.round(START*.05*30),rwWant=null,doubledThisRun=false;
function rwBtn(id,t){var e=document.createElement("button");e.id=id;e.className="ui rw";e.type="button";e.textContent=t;return e}
var cnB=rwBtn("cn","🎬 Continue"),dbB=rwBtn("db","🎬 Double ✦");
var CNON=ADS.continue===true&&ads.enabled,DBON=ADS.double===true&&ads.enabled;
if(CNON)wrap.appendChild(cnB);
if(DBON)wrap.appendChild(dbB);
[cnB,dbB].forEach(function(b){["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup"].forEach(function(n){b.addEventListener(n,function(e){e.stopPropagation()})})});
function dbReady(){return DBON&&typeof UPK!=="undefined"&&UPK.length>=5&&!doubledThisRun&&typeof skRun!=="undefined"&&skRun>0}
/* called at the end of die() */
function maybeOfferContinue(){
  rwWant=null;
  if(continuedThisRun)shB.style.display="none";            /* a continued run makes no challenge link */
  var cn=CNON&&!continuedThisRun&&deaths>=2&&lastS>=RWMIN&&lastS>=hi*.5;
  if(!cn&&!dbReady())return;
  var b=cn?cnB:dbB;
  ads.prepareRewarded(cn?"continue":"double").then(function(ok){if(ok&&state==="over")rwWant=b});
}
/* from poki/mobile.js draw(): the wanted 🎬 button shows only while Retry does */
var rwOn=null;
function rwSync(on){
  var b=on&&state==="over"&&!ads.busy?rwWant:null;
  if(b===rwOn)return;
  rwOn=b;cnB.style.display=b===cnB?"block":"none";dbB.style.display=b===dbB?"block":"none";
  if(b){var rt=document.getElementById("rt");b.style.top=((rt&&parseInt(rt.style.top,10))||Math.round(H*.6*CS))+58+"px"}
}
function hideContinue(){rwWant=null;rwSync(false)}
cnB.addEventListener("click",function(e){
  e.stopPropagation();cnB.blur();
  if(ads.busy||continuedThisRun||state!=="over"||rwWant!==cnB)return;
  hideContinue();rtArm=false;
  ads.showRewarded("continue").then(function(r){
    if(r&&r.rewarded===true&&state==="over")continueRun();   /* NEVER reward on error / dismiss / ad block / timeout */
  });
});
dbB.addEventListener("click",function(e){
  e.stopPropagation();dbB.blur();
  if(ads.busy||doubledThisRun||state!=="over"||rwWant!==dbB)return;
  hideContinue();rtArm=false;
  ads.showRewarded("double").then(function(r){
    if(!(r&&r.rewarded===true)||doubledThisRun||state!=="over")return;
    doubledThisRun=true;var n=skRun;skEarn(n);skSave();toast("✦ +"+n+" doubled!");
  });
});
function continueRun(){
  continuedThisRun=true;skNB=1;   /* no new-best +10 ✦ for a continued run */
  state="run";inv=1.5;
  ents=ents.filter(function(e){return e.t==="u"||e.x>PX+400});
  py=0;vy=0;jb=0;held=false;duck=false;shake=0;flash=0;
  shB.style.display="none";   /* POKI-4: no name prompt or global ranking on Poki */
  startMusic();toast("Continued! 🔥");sfx(660,990,.12,1);
  ads.gameplayStart();
}
/* ---- end Poki ads ---- */
`;
