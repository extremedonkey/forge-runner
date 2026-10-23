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

`;
