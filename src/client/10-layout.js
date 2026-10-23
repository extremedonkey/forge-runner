// LAYOUT (owner: Mobile): fit() sizes the canvas (landscape letterbox; portrait full screen + zoom), DPR budget, resize listeners.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* sizing: largest canvas with the game's aspect ratio that fits the viewport, backed at devicePixelRatio.
   Portrait (taller than wide): full width, full height; the same 600x300 playfield sits in the lower part and the
   extra height becomes sky (HUD/title move up there) and ground. Gameplay area, physics and difficulty are unchanged. */
function fit(){
  var vw=document.documentElement.clientWidth||window.innerWidth,vh=window.innerHeight||document.documentElement.clientHeight;
  var tall=vh>vw;
  var s=tall?vw/W:Math.min(vw/W,vh/H),cw=Math.max(1,Math.floor(W*s)),ch=Math.max(1,tall?Math.floor(vh):Math.floor(H*s));
  /* perf: touch devices are capped at 2x backing (3x costs 2.25x the pixels for no visible gain on pixel art) */
  var coarse=window.matchMedia("(pointer: coarse)").matches;
  dpr=Math.min(window.devicePixelRatio||1,coarse?2:3);
  /* pixel budget keeps phones at 60fps: big landscape phones drop to ~2x backing, still crisp */
  var bud=coarse?1.5e6:3.6e6;
  while(dpr>1&&cw*ch*dpr*dpr>bud)dpr-=.25;
  wrap.style.width=cw+"px";wrap.style.height=ch+"px";
  var nw=Math.round(cw*dpr),nh=Math.round(ch*dpr);
  if(cv.width!==nw||cv.height!==nh){cv.width=nw;cv.height=nh;SPC=new Map();TXC={};FPC={};skyK=-1}
  ZM=tall?PZW:1;XO=tall?PXO:0;VW=W/ZM;
  CS=cw*ZM/W;K=cv.width*ZM/W;
  var ex=tall?Math.max(0,ch/CS-H):0;OY=Math.round(ex*PSK);OB=ex-OY;HS=tall?1.5/ZM:1;
  placeMute();placePause();
  ctx.imageSmoothingEnabled=false;
  base();placeShare();draw();
}
var rt=0;
function onResize(){clearTimeout(rt);rt=setTimeout(fit,60)}
window.addEventListener("resize",onResize);
window.addEventListener("orientationchange",onResize);
if(window.visualViewport)window.visualViewport.addEventListener("resize",onResize);
/* game-over mission chips: their bottom edge (CSS px from the viewport top), recorded as Missions' msDrawChips draws them, so the
   portrait top-10 panel (its place()) can sit below them without copying the chip layout. Draw-only; same pixels. */
var ovChipB=0,ovChipT=0;
if(typeof msDrawChips==="function"){var msDrawChips0=msDrawChips;msDrawChips=function(c,x,y,w){
  var h=msDrawChips0(c,x,y,w);
  if(state==="over"&&h>0){ovChipB=cv.getBoundingClientRect().top+(y+h+SY+OY)*CS;ovChipT=performance.now()}
  return h}}

`;
