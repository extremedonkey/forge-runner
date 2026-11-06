// VIEWPORT CONSTANTS (owner: Mobile): logical 600x300 playfield W/H/GY, portrait extras OY/OB/HS, zoom ZM/XO/VW, scale K/CS.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* fixed logical resolution; the canvas is scaled to fit the viewport */
var W=600,H=300,GY=232,K=1,CS=1,dpr=1,SX=0,SY=0;
/* portrait: the canvas fills the screen; OY/OB = extra logical sky above / ground below the 600x300 playfield, HS = HUD text scale */
var OY=0,OB=0,HS=1;
/* portrait zoom: ZM = playfield zoom, XO = logical x at the left screen edge, VW = visible logical width (landscape/desktop: 1, 0, W) */
var ZM=1,XO=0,VW=W,PZ=1.35;
/* web portrait look-ahead (Playtest 23 Oct): PZW = web portrait zoom, PXO = left edge x (the camera sits PX-PXO = 12 units behind
   the robot instead of 36), PSK = share of the extra height above the play band (sky; .74 keeps "tap to retry" clear of the top-10 panel). At 340 u/s the track visible ahead of
   the robot's front edge is (PXO+W/PZW-PX-PW)/340 s. The Poki build uses PZW / PXO too (poki/mobile.js), with its own sky share .62. PZ (1.35) is the old portrait zoom; 09-share keeps the Share button at its 1.35 CSS size. */
var PZW=1.12,PXO=44,PSK=.74;
/* Opening crest zoom (portrait runs only; the camera lives in 14-render.js, not in fit()): OCZ is the absolute zoom at
   the first frame of a start-hill run, eased back to the layout zoom PZW over OCZT seconds. OCX is how far left of the
   robot the zoom anchors (so the buggy stays on screen); OCY is how far below the crest it anchors (so the hill, not
   the empty sky, fills the phone). Landscape, desktop and reduced motion ignore these. ZM/XO/VW/CS stay the layout
   values outside that draw, so look-ahead, collision, score and touch zones do not move. */
var OCZ=2.45,OCZT=3,OCX=16,OCY=250;
var PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760;
var hi=0;
try{hi=parseInt(localStorage.getItem(KEY),10)||0}catch(e){}

`;
