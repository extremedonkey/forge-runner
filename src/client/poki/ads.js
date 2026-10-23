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
/* rewarded Continue: OFF unless FR_ADS_CONFIG.continue===true (BRIEF D4). Once per run, from the 2nd death, score >= 100 and >= half the best.
   Button: PLACEHOLDER styling (Mobile owns the final look): below Mobile's Retry (Retry first, Retry >= Continue), not green, 48 px. */
var cnB=document.createElement("button");cnB.id="cn";cnB.className="ui";cnB.type="button";cnB.textContent="🎬 Continue";
if(ADS.continue===true&&ads.enabled){
  var cnS=document.createElement("style");
  cnS.textContent="#cn{left:50%;transform:translateX(-50%);width:150px;height:48px;border:1px solid #22d3ee;border-radius:12px;background:#0b1020;color:#cbd5e1;font:600 16px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer}";
  document.head.appendChild(cnS);wrap.appendChild(cnB);
}
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup"].forEach(function(n){cnB.addEventListener(n,function(e){e.stopPropagation()})});
function maybeOfferContinue(){
  if(ADS.continue!==true||continuedThisRun||deaths<2||lastS<100||lastS<hi*.5)return;
  ads.prepareRewarded("continue").then(function(ok){
    if(!ok||state!=="over"||continuedThisRun)return;
    var rt=document.getElementById("rt");
    cnB.style.top=((rt&&parseInt(rt.style.top,10))||Math.round(H*.6*CS))+58+"px";
    cnB.style.display="block";
  });
}
function hideContinue(){cnB.style.display="none"}
cnB.addEventListener("click",function(e){
  e.stopPropagation();cnB.blur();
  if(ads.busy||continuedThisRun||state!=="over")return;
  hideContinue();rtArm=false;
  ads.showRewarded("continue").then(function(r){
    if(r&&r.rewarded===true&&state==="over")continueRun();   /* NEVER reward on error / dismiss / ad block / timeout */
  });
});
function continueRun(){
  continuedThisRun=true;
  state="run";inv=1.5;
  ents=ents.filter(function(e){return e.t==="u"||e.x>PX+400});
  py=0;vy=0;jb=0;held=false;duck=false;shake=0;flash=0;
  shB.style.display="none";   /* POKI-4: no name prompt or global ranking on Poki */
  startMusic();toast("Continued! 🔥");sfx(660,990,.12,1);
  ads.gameplayStart();
}
/* ---- end Poki ads ---- */
`;
