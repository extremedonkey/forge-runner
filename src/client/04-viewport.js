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
var PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760;
var hi=0;
try{hi=parseInt(localStorage.getItem(KEY),10)||0}catch(e){}

`;
