// INPUT (owner: Mobile): touch / mouse / keyboard -> press(), release(), duck.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* input */
function isUI(t){return !!(t&&t.closest&&t.closest("a,button,input,.ui"))}
var ty0=0,tt0=0;
document.addEventListener("touchstart",function(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length===1){ty0=e.touches[0].clientY;tt0=performance.now();press()}
},{passive:false});
document.addEventListener("touchmove",function(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length&&e.touches[0].clientY-ty0>20&&!duck){
    duck=true;
    /* a swipe down that began as a tap (<250 ms ago) cancels the hop its touchstart started: back on the ground,
       ducking, instead of jumping into a low drone. Later swipes (a real jump) still fast-fall as before. */
    if(state==="run"&&performance.now()-tt0<250){jb=0;py=0;vy=0}
  }
},{passive:false});
function tend(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length===0){release();duck=false}
}
document.addEventListener("touchend",tend,{passive:false});
document.addEventListener("touchcancel",tend,{passive:false});
document.addEventListener("gesturestart",function(e){e.preventDefault()},{passive:false});
document.addEventListener("mousedown",function(e){
  if(e.button!==0||isUI(e.target))return;
  press();
});
window.addEventListener("mouseup",function(){release()});
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup","click"].forEach(function(n){
  [btn,shB,np].forEach(function(el){el.addEventListener(n,function(e){e.stopPropagation()})});
});
window.addEventListener("keydown",function(e){
  var k=e.code;
  if(k==="Space"||k==="ArrowUp"||k==="KeyW"){
    if(isUI(e.target))return;
    e.preventDefault();
    if(!e.repeat)press();
  }else if(k==="ArrowDown"||k==="KeyS"){
    if(isUI(e.target))return;
    e.preventDefault();duck=true;
  }
});
window.addEventListener("keyup",function(e){
  var k=e.code;
  if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release()}
  else if(k==="ArrowDown"||k==="KeyS"){duck=false}
});
window.addEventListener("blur",function(){release();duck=false});

/* ---- pause (POKI-7, Mobile; both builds) ----
   #pb pause button: only while a run is in progress (not on the title / game-over screens, not during an ad), right of the
   mute button on its row (web: the score row; Poki: top 96 px, below the 46x62 Pill), never near the HUD score (top right).
   >= 44 px. Glyph drawn like the mute speaker (pxP() pixel path, same 8-unit height, fill and outline), PB_GAP grid units right
   of it. It is a .ui <button> (isUI) and stops propagation, so a tap on it never reaches press() (no jump). While paused it
   stays in place above the overlay as a play icon (.rs) that resumes, so pause and resume are the same spot.
   #pz overlay: dim, PAUSED and a large Resume. While paused, update() is skipped in the loop (16-loop.js); resume resets the
   frame timestamp (last=0), so the first frame after it has dt=0 (no spike). Auto-pause on blur and on visibilitychange hidden;
   P / Esc toggle (Space / Enter also resume). Input that misses the overlay (letterbox) is swallowed while paused.
   Poki: ads.gameplayStop() on pause, ads.gameplayStart() on resume (FRAds, poki/ads.js); typeof-guarded, so the site needs none. */
var paused=false,pzOn=-1;
var pbB=document.createElement("button");pbB.id="pb";pbB.className="ui";pbB.type="button";pbB.setAttribute("aria-label","Pause");
var pzE=document.createElement("div");pzE.id="pz";pzE.className="ui";pzE.setAttribute("role","dialog");pzE.setAttribute("aria-label","Paused");
pbB.innerHTML='<svg aria-hidden="true" focusable="false"><path fill="#f1f5f9" stroke="rgba(5,7,13,.75)" stroke-linejoin="round" paint-order="stroke"></path></svg>';
var pbSvg=pbB.firstChild,pbPath=pbSvg.firstChild,PB_GAP=5,
  PG_PAUSE=pxP([0,0,3,8,5,0,3,8]),PG_PLAY=pxP([1,0,2,8,3,1,2,6,5,2,2,4,7,3,1,2]);
pbPath.setAttribute("d",PG_PAUSE);
pzE.innerHTML='<div class="pt">PAUSED</div><button id="pr" type="button">▶ Resume</button>';
var prB=pzE.lastChild;
wrap.appendChild(pbB);wrap.appendChild(pzE);
function pzAd(){return typeof ads!=="undefined"&&(ads.busy||(typeof adPaused!=="undefined"&&adPaused))}
function pauseGame(){
  if(paused||state!=="run"||pzAd())return;
  paused=true;release();duck=false;jb=0;shake=0;
  if(typeof audioAdPause==="function")audioAdPause();
  if(typeof ads!=="undefined")ads.gameplayStop();
  pzSync();
}
function resumeGame(){
  if(!paused)return;
  paused=false;last=0;
  if(typeof audioAdResume==="function")audioAdResume();
  if(typeof ads!=="undefined"&&state==="run")ads.gameplayStart();
  pzSync();
}
/* called every frame (16-loop.js): 0 = nothing, 1 = pause button, 2 = overlay */
function pzSync(){
  var on=paused?2:state==="run"&&!pzAd()?1:0;
  if(on===pzOn)return;
  pzOn=on;pbB.style.display=on?"block":"none";pzE.style.display=on===2?"flex":"none";
  pbB.classList.toggle("rs",on===2);pbB.setAttribute("aria-label",on===2?"Resume":"Pause");pbPath.setAttribute("d",on===2?PG_PLAY:PG_PAUSE);
}
/* from fit() (both builds), after placeMute(): same size and row as the mute button, never overlapping it. The 8x8 glyph sits
   PB_GAP units right of the speaker glyph (MGU), or centred in the button when the button has to move further right */
function placePause(){
  var B=parseInt(btn.style.width,10)||44,l=parseInt(btn.style.left,10)||0,t=parseInt(btn.style.top,10)||0,
    u=MGU.u,ol=MGU.ol,gx=MGU.x+(10+PB_GAP)*u,bl=Math.max(l+B+2,Math.round(gx+4*u-B/2));
  gx=Math.max(gx,bl+(B-8*u)/2);
  pbB.style.left=bl+"px";pbB.style.top=t+"px";pbB.style.width=pbB.style.height=B+"px";
  pbSvg.setAttribute("viewBox",(-ol)+" "+(-ol)+" "+(8+2*ol)+" "+(8+2*ol));
  pbSvg.style.width=pbSvg.style.height=(8+2*ol)*u+"px";
  pbSvg.style.left=(gx-bl-ol*u)+"px";pbSvg.style.top=(MGU.cy-t-4*u-ol*u)+"px";
  pbPath.setAttribute("stroke-width",2*ol);
}
pbB.addEventListener("click",function(e){e.stopPropagation();pbB.blur();if(paused)resumeGame();else pauseGame()});
prB.addEventListener("click",function(e){e.stopPropagation();prB.blur();resumeGame()});
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup","click"].forEach(function(n){
  [pbB,pzE].forEach(function(el){el.addEventListener(n,function(e){e.stopPropagation()})});
});
function pzGuard(e){if(paused&&!isUI(e.target)){e.stopPropagation();if(e.cancelable&&e.type==="touchstart")e.preventDefault()}}
window.addEventListener("touchstart",pzGuard,{capture:true,passive:false});
window.addEventListener("mousedown",pzGuard,true);
window.addEventListener("keydown",function(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  var k=e.code;
  if(k==="KeyP"||k==="Escape"){
    if(e.repeat)return;
    if(paused){e.preventDefault();e.stopPropagation();resumeGame()}
    else if(state==="run"&&!pzAd()){e.preventDefault();e.stopPropagation();pauseGame()}
  }else if(paused){
    e.preventDefault();e.stopPropagation();
    if(!e.repeat&&(k==="Space"||k==="Enter"||k==="NumpadEnter"))resumeGame();
  }
},true);
window.addEventListener("blur",function(){pauseGame()});
/* registered before the loop's own visibilitychange handler, so on Poki gameplayStop() comes from the pause, and the adapter's
   onVisible() does not restart gameplay while the overlay is up */
document.addEventListener("visibilitychange",function(){if(document.hidden)pauseGame()});

`;
