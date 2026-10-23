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
  placeMute();placePause();
  pkBarFit(cover?0:Math.floor((vw-cw)/2),ch);
  ctx.imageSmoothingEnabled=false;
  base();placeShare();draw();
}
/* wider than 2:1 landscape: the canvas stays 2:1 (no extra track - the site build letterboxes there too, so no extra look-ahead),
   and the side bars show the frame's outermost pixel column stretched out (slightly dimmed), so the sky, sun glow, city and ground run
   on to the screen edges. Art only: fixed canvases behind nothing, pointer-events none, refreshed from the drawn frame.
   16:9 and portrait (cover) have no bars, so those frames are unchanged. */
var pkBL=null,pkBR=null,pkBW=0;
function pkBarMk(side){
  var c=document.createElement("canvas");c.width=1;c.height=1;c.setAttribute("aria-hidden","true");
  c.style.cssText="position:fixed;top:0;"+side+":0;height:100%;width:0;display:none;pointer-events:none;filter:brightness(.85)";
  document.body.appendChild(c);return c;
}
function pkBarFit(bw,ch){
  pkBW=bw>0?bw:0;
  if(!pkBW&&!pkBL)return;
  if(!pkBL){pkBL=pkBarMk("left");pkBR=pkBarMk("right")}
  var h=Math.max(1,Math.round(ch));
  [pkBL,pkBR].forEach(function(c){c.style.display=pkBW?"block":"none";c.style.width=pkBW+"px";if(c.height!==h)c.height=h});
}
function pkBarDraw(){
  if(!pkBW||!cv.width)return;
  pkBL.getContext("2d").drawImage(cv,0,0,1,cv.height,0,0,1,pkBL.height);
  pkBR.getContext("2d").drawImage(cv,cv.width-1,0,1,cv.height,0,0,1,pkBR.height);
}
/* Poki page CSS: mute button below the Poki Pill (46x62 px at top-left, default top 24 px -> ends at 86 px);
   Share is back since POKI-4 (its link is PokiSDK.shareableURL, score only; no name prompt in the Poki page);
   Retry button >= 44 px. */
if(PKON){
  var pkS=document.createElement("style");
  pkS.textContent="#mute{top:96px!important}"+
    "#rt{left:50%;transform:translateX(-50%);min-width:150px;height:48px;padding:0 22px;border:2px solid #22d3ee;border-radius:12px;"+
    "background:#0b1020;color:#f1f5f9;font:700 19px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer}"+
    "#rt:focus-visible{outline:2px solid #f97316;outline-offset:2px}"+
    /* rewarded 🎬 Continue / Double (POKI-7; only in the DOM with FR_ADS_CONFIG.continue / .double): secondary to Retry (below it,
       smaller: 136x44 vs >=150x48, lighter text), cyan outline, never green */
    "#wrap>.rw{left:50%;transform:translateX(-50%);cursor:pointer;width:136px;height:44px;padding:0 12px;border:1px solid rgba(34,211,238,.7);border-radius:12px;background:#0b1020;"+
    "color:#cbd5e1;font:600 15px system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}"+
    "#wrap>.rw:focus-visible{outline:2px solid #f97316;outline-offset:2px}";
  document.head.appendChild(pkS);
}
var rtB=document.createElement("button");rtB.id="rt";rtB.className="ui";rtB.type="button";rtB.textContent="↻ Retry";
rtB.setAttribute("aria-label","Retry");
if(PKON)wrap.appendChild(rtB);
/* Retry calls press() then upRetry(), so it goes through the same over-branch as a tap or Space: 400 ms lockout, or with ads on
   (POKI-2) the 800 ms lockout and commercialBreak via retry() on this click (a release) */
rtB.addEventListener("click",function(e){e.stopPropagation();rtB.blur();if(state==="over"){press();upRetry()}});
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup"].forEach(function(n){rtB.addEventListener(n,function(e){e.stopPropagation()})});
/* Poki portrait: the HUD score/HI row is held down at the mute button (top 96 px, below the Pill), so on short screens
   (360x640, 375x667) the title and the game-over block (✦ line + GAME OVER) at -OY/2 ran into the HI text. pkTopY() moves the
   block down (never up) until its top is >= 8 CSS px below the score/HI row (baseline hudB() + 2 outline). up = the block's
   height above its anchor y: title 48*HS caps (~36*HS); game over: the ✦ line at -34*HS + its 15*HS glyphs (~46*HS), or
   GAME OVER's 34*HS caps (~26*HS) without the ✦ line. Landscape and the site build: unchanged (14-render.js calls these only
   when they exist). */
function pkTopY(y,up){return PKON&&PT?Math.max(y,Math.ceil(hudB()+2+8/CS+up)):y}
function pkTY(ty){return pkTopY(ty,36*HS+2)}
function pkOY(oy){return pkTopY(oy,(skHud()?46:26)*HS+2)}
/* Retry sits under the "retry" line: in the sky in portrait, over the dimmed playfield in landscape; Share keeps its site
   place (just below the ground line) */
function placeShare(){
  placeShare_web();
  if(!PKON)return;
  var oy=PT?pkOY(Math.round(-OY*.5)):Math.round(H*.28),ty=oy+((chal?78:60)+16)*HS;
  rtB.style.top=Math.round((ty+OY)*CS)+"px";
}
/* Poki portrait game over: the mission chips sit BELOW the mute/HI row (Playtest: #53 put them above it, up by the Pill). Straight
   under the row there is no room (the ✦ line, GAME OVER and the missions toast are there), so they go in the first free sky band:
   12 px under the Retry button's rewarded 🎬 Continue/Double slot (rtt+58..rtt+102, kept even when no 🎬 shows, so the row never
   jumps), i.e. the web order (retry prompt, then chips). 14-render.js still passes hudB()-54*HS there; this draw-through wrapper only
   swaps that y (same chips, same Missions code; 10-layout.js records the new bottom edge for the top-10 panel). Start screen and
   landscape: untouched. */
function pkChipY(){
  var oy=pkOY(Math.round(-OY*.5)),rtt=Math.round((oy+((chal?78:60)+16)*HS+OY)*CS);  /* same Retry top as placeShare() */
  return (rtt+102+12)/CS-OY;
}
if(PKON&&typeof msDrawChips==="function"){var msDrawChipsP=msDrawChips;msDrawChips=function(c,x,y,w){
  return msDrawChipsP(c,x,PT&&state==="over"?pkChipY():y,w)}}
/* ...and the purchase toast (14b upToast/upTClear, >= 8 px clear of every rect upTRects() lists) keeps clear of that chip row too:
   on short portrait screens (360x640, 375x667) its preferred spot between Retry and the ground fell on the chips. Poki portrait
   game over only; the band is the full width (the row is centred, its width varies) and the chips' max height (22*HS). With a
   🎬 slot the toast used to search up onto the canvas text and the HUD row, so everything from the top down to the retry line
   (Pill, mute/HUD row, ✦ line, GAME OVER, Score, retry) is reserved too. */
if(PKON&&typeof upTRects==="function"){var upTRectsP=upTRects;upTRects=function(){
  var o=upTRectsP();
  if(PT&&state==="over"){var W0=wrap.getBoundingClientRect(),C0=cv.getBoundingClientRect(),t=C0.top-W0.top+(pkChipY()+OY)*CS;
    o.push([0,t,wrap.clientWidth,t+22*HS*CS]);
    var oy=pkOY(Math.round(-OY*.5));
    o.push([0,-W0.top,wrap.clientWidth,C0.top-W0.top+(oy+((chal?78:60)+5)*HS+OY)*CS])}
  return o}}
var rtOn=false;
function draw(){
  draw_web();
  if(!PKON)return;
  pkBarDraw();
  var on=state==="over"&&performance.now()-deathAt>(ads.enabled?800:400)&&!ads.busy;
  if(on!==rtOn){rtOn=on;rtB.style.display=on?"block":"none"}
  if(typeof rwSync==="function")rwSync(on);
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
