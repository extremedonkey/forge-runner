// POKI BUILD ONLY (owner: Mobile). Layout/input/UI for the Poki build target (POKI-3): 16:9 cover, portrait, Pill clearance,
// input-type hints, Retry button, no scroll/zoom. Joined into dist/poki/game.js by src/client/poki/script.mjs, right before
// 16-loop.js; it is NOT part of the site/Lambda SCRIPT, so the site page stays byte-identical. Same rules as the other
// fragments: plain browser JS in String.raw, shared IIFE scope, no backticks, no ${...}.
// Every behaviour is additionally gated at runtime on window.FR_BUILD==='poki' (belt and braces).
export default String.raw`
/* ---- Poki build (POKI-3, Mobile) ---- */
var PKON=window.FR_BUILD==="poki";
/* PT: portrait layout (title/hints in the sky). PKT: touch hints (true) or keyboard hints (false), chosen by input type:
   (pointer: coarse) at load, then the latest real input (touch vs key/mouse). Orientation plays no part. */
var PT=false,PKT=window.matchMedia("(pointer: coarse)").matches;
/* sizing on Poki: the canvas always COVERS the frame (no letterbox) up to 2:1.
   - portrait (taller than wide): unchanged portrait mode (full screen, 1.35x zoom, sky above / ground below the playfield)
   - landscape up to 2:1 (16:9, 4:3 ...): full width shows the same 600 logical units as the site (same look-ahead and reaction
     time); the extra height becomes sky (62%) and ground (38%), exactly like portrait but without zoom
   - wider than 2:1 (not a Poki size): height-fit with side bars, as on the site */
function fit(){
  if(!PKON)return fit_web();
  var vw=document.documentElement.clientWidth||window.innerWidth,vh=window.innerHeight||document.documentElement.clientHeight;
  var tall=vh>vw,cover=tall||vw<=2*vh;
  var cw=Math.max(1,Math.floor(cover?vw:W*vh/H)),ch=Math.max(1,Math.floor(vh));
  var coarse=window.matchMedia("(pointer: coarse)").matches;
  dpr=Math.min(window.devicePixelRatio||1,coarse?2:3);
  var bud=coarse?1.5e6:3.6e6;
  while(dpr>1&&cw*ch*dpr*dpr>bud)dpr-=.25;
  wrap.style.width=cw+"px";wrap.style.height=ch+"px";
  var nw=Math.round(cw*dpr),nh=Math.round(ch*dpr);
  if(cv.width!==nw||cv.height!==nh){cv.width=nw;cv.height=nh;SPC=new Map();TXC={};FPC={};skyK=-1}
  PT=tall;ZM=tall?PZ:1;XO=tall?20:0;VW=W/ZM;
  CS=cw*ZM/W;K=cv.width*ZM/W;
  var ex=Math.max(0,ch/CS-H);OY=Math.round(ex*.62);OB=ex-OY;HS=tall?1.5/ZM:1;
  placeMute();
  ctx.imageSmoothingEnabled=false;
  base();placeShare();draw();
}
/* Poki page CSS: mute button below the Poki Pill (46x62 px at top-left, default top 24 px -> ends at 86 px);
   Share is back since POKI-4 (its link is PokiSDK.shareableURL, score only; no name prompt in the Poki page);
   Retry button >= 44 px. */
if(PKON){
  var pkS=document.createElement("style");
  pkS.textContent="#mute{top:96px!important}"+
    "#rt{left:50%;transform:translateX(-50%);min-width:150px;height:48px;padding:0 22px;border:2px solid #22d3ee;border-radius:12px;"+
    "background:#0b1020;color:#f1f5f9;font:700 19px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer}"+
    "#rt:focus-visible{outline:2px solid #f97316;outline-offset:2px}";
  document.head.appendChild(pkS);
}
var rtB=document.createElement("button");rtB.id="rt";rtB.className="ui";rtB.type="button";rtB.textContent="↻ Retry";
rtB.setAttribute("aria-label","Retry");
if(PKON)wrap.appendChild(rtB);
/* Retry calls press() then upRetry(), so it goes through the same over-branch as a tap or Space: 400 ms lockout, or with ads on
   (POKI-2) the 800 ms lockout and commercialBreak via retry() on this click (a release) */
rtB.addEventListener("click",function(e){e.stopPropagation();rtB.blur();if(state==="over"){press();upRetry()}});
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup"].forEach(function(n){rtB.addEventListener(n,function(e){e.stopPropagation()})});
/* Retry sits under the "retry" line: in the sky in portrait, over the dimmed playfield in landscape; Share keeps its site
   place (just below the ground line) */
function placeShare(){
  placeShare_web();
  if(!PKON)return;
  var oy=PT?Math.round(-OY*.5):Math.round(H*.28),ty=oy+((chal?78:60)+16)*HS;
  rtB.style.top=Math.round((ty+OY)*CS)+"px";
}
var rtOn=false;
function draw(){
  draw_web();
  if(!PKON)return;
  var on=state==="over"&&performance.now()-deathAt>(ads.enabled?800:400)&&!ads.busy;
  if(on!==rtOn){rtOn=on;rtB.style.display=on?"block":"none"}
}
if(PKON){
  /* hints follow the input actually used */
  window.addEventListener("touchstart",function(){PKT=true},{capture:true,passive:true});
  window.addEventListener("pointerdown",function(e){if(e.pointerType==="mouse")PKT=false;else if(e.pointerType==="touch")PKT=true},true);
  window.addEventListener("keydown",function(e){if(!e.ctrlKey&&!e.metaKey&&!e.altKey)PKT=false},true);
  /* play-start: any key starts from the title screen (Space/Up/W already do), Enter also retries. No menus. */
  window.addEventListener("keydown",function(e){
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||isUI(e.target))return;
    var k=e.code;
    if(k==="Space"||k==="ArrowUp"||k==="KeyW"||k==="ArrowDown"||k==="KeyS"||k==="Tab"||k==="Escape"||/^(Shift|Control|Alt|Meta)/.test(k))return;
    if(state==="start"||(state==="over"&&k==="Enter")){e.preventDefault();press();release();upRetry()}
  });
  /* no page scroll or zoom inside the iframe: wheel / ctrl+wheel and pinch are swallowed (keys and touch already are) */
  window.addEventListener("wheel",function(e){e.preventDefault()},{passive:false});
}
/* ---- end Poki build ---- */
`;
