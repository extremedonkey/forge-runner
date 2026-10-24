// MINE CART (owner: Levels): the L7 MINE CART look, ported from the /lab/minecart/ proof of concept (#127-#135), scoped to L7.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PURELY COSMETIC: reads lvl/lvPrev/lvFade() (06d), scroll/state/tt, hsc/hlOn/hlH (06i), gpOn/gpGaps/gpHole/gpDf (06k), vMul();
// writes nothing of the game. L7's gameplay (denser gaps, ore carts every slot, no strikes/rollers/decks) is plain data in
// 06d GAP_LV, 06i OC_P, 06m CHASER_LV, 06l FK.cap and the 06n level gate; its music is TRK[TRN+6] (08e).
// THEME WEIGHT mcW(): 1 while L7 shows, 0 on every other level (L1-L6 and any later level keep the normal look), eased over the
// LEVELS-2 crossfade (lvFade()). The background crossfades by that weight; the track, gaps and cart swap at the half-way point (mcOn()).
// Hooks:
//  - 06f lvLayer(7, al) -> mcBg(al): an opaque mine shaft over the whole frame (portrait continues it up through the extra sky),
//    rock strata, a slow timber grid and faster pillars. It replaces L7's tint/props/ground line, so below the rails is open void.
//  - hlDraw / gpDraw (06i / 06k) are wrapped here at load: on L7 the solid terrain mass becomes thin double rails with ties that
//    ride the hills and break over every gap, and the gaps lose their shade slab and get a yellow spark arc (the full held jump).
//    Off L7 the originals run unchanged.
//  - 14-render drawPlayer() -> mcCart(): an iron-banded cart tub around the buggy's chassis (the anvil rides in it).
export default String.raw`
/* MINE CART theme weight: 0..1 share of the L7 look in the current frame (crossfade over LV_FADE); mcOn() = the swap point */
var MC_LV=7;
function mcW(){
  if(state==="start"||typeof lvl==="undefined")return 0;
  var a=lvPrev===MC_LV,b=lvl===MC_LV;
  if(a===b)return b?1:0;
  var f=lvFade();return b?f:1-f;
}
function mcOn(){return mcW()>=.5}
/* the shaft (06f lvLayer hands L7 here, al = its crossfade alpha). Landscape (OY 0) is the 600x300 shaft: gradient 0..H+OB, cap
   at y 0; portrait continues it through the extra sky (OY) so no day-gradient band shows above the scaffold */
function mcBg(al){
  var x0=XO-20,w=VW+40,top=OY?-OY-20:0,bot=H+OB+20,g,k,y,sx,sh,period=120,off=(scroll*.35)%period;
  ctx.globalAlpha=al;
  g=ctx.createLinearGradient(0,0,0,bot);g.addColorStop(0,"#07060a");g.addColorStop(1,"#0a0808");
  ctx.fillStyle=g;ctx.fillRect(x0,top,w,bot-top);
  ctx.fillStyle="rgba(255,255,255,.035)";   /* rock strata, repeated up through the portrait sky */
  for(k=0;k<14;k++)ctx.fillRect(x0,18+k*31,w,2);
  if(OY)for(y=18-31;y>top;y-=31)ctx.fillRect(x0,y,w,2);
  ctx.fillStyle="rgba(90,63,38,.22)";   /* timber grid (slow parallax, sparse so open depth shows) */
  for(sx=-off;sx<w+period;sx+=period)ctx.fillRect(x0+sx,top,5,bot-top);
  for(k=0;k<2;k++)ctx.fillRect(x0,24+k*58,w,3);
  if(OY)for(sh=116;24-sh>top;sh+=116)for(k=0;k<2;k++)ctx.fillRect(x0,24+k*58-sh,w,3);
  ctx.fillStyle="rgba(120,84,52,.28)";   /* pillars (faster parallax); the cap sits on the top edge of the shaft */
  off=(scroll*.6)%360;
  for(sx=-off;sx<w+360;sx+=360){ctx.fillRect(x0+sx+90,top,14,bot-top);ctx.fillRect(x0+sx+82,OY?-OY:0,30,8)}
  ctx.globalAlpha=1;
}
/* rails: thin double rails with ties riding the terrain (flat GY with ?hills=0), so the track reads as a trestle over the void;
   a gap sample ends the polyline and the next solid one restarts it, so rails and ties break over every hole */
function mcHole(px){return typeof gpHole==="function"&&gpHole(hsc+px)}
function mcY(x){return GY-(hlOn?hlH(x):0)}
function mcRail(x1,dy){
  var x,pen=false;
  ctx.beginPath();for(x=XO-24;x<=x1;x+=8){if(mcHole(x)){pen=false;continue}pen?ctx.lineTo(x,mcY(x)+dy):ctx.moveTo(x,mcY(x)+dy);pen=true}ctx.stroke();
}
function mcRails(){
  var x,x1=XO+VW+24;
  ctx.save();
  ctx.fillStyle="#6b4a2c";
  for(x=XO-24-(hsc%28);x<x1;x+=28){if(mcHole(x))continue;ctx.fillRect(Math.round(x),mcY(x)+1,6,5)}
  ctx.lineWidth=1.5;
  ctx.strokeStyle="#c9ced6";mcRail(x1,0);
  ctx.strokeStyle="#7d848f";mcRail(x1,3);
  ctx.restore();
}
/* gaps: 06k's lips and falling sparks without the shade slab (open air), plus a yellow spark arc over EVERY gap (06k's own
   teaching arc is L1-L2 only): the full held jump, centred over the hole */
function mcGaps(){
  if(!gpOn||!gpGaps.length)return;
  var j,k,g,a,b,ya,yb,u,sx,sy,ln=CY,mo=!rm(),hs=gpDf()*speed*vMul()*.5,cx,yl,q;
  for(j=0;j<gpGaps.length;j++){g=gpGaps[j];a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    ya=GY-g.h0;yb=GY-g.h1;
    ctx.fillStyle=ln;ctx.globalAlpha=.35;ctx.fillRect(a-6,ya-5,8,8);ctx.fillRect(b-2,yb-5,8,8);ctx.globalAlpha=1;
    ctx.fillStyle="#ffffff";ctx.fillRect(a-3,ya-2,3,22);ctx.fillRect(b,yb-2,3,22);
    ctx.fillStyle=ln;ctx.fillRect(a-14,ya-1,14,2);ctx.fillRect(b,yb-1,14,2);
    if(mo){ctx.fillStyle="#fde047";for(k=0;k<6;k++){u=(tt*1.7+k*.37)%1;sx=k&1?a+2+u*10:b-2-u*10;sy=(k&1?ya:yb)+u*u*90;ctx.globalAlpha=1-u;ctx.fillRect(Math.round(sx),Math.round(sy),2,2)}ctx.globalAlpha=1}
    cx=(a+b)/2;yl=Math.min(ya,yb)-10;
    ctx.save();ctx.fillStyle="#fde047";
    for(k=-12;k<=12;k++){q=k/12;ctx.globalAlpha=.35+.5*(1-Math.abs(q));ctx.fillRect(Math.round(cx+q*hs),Math.round(yl-107*(1-q*q)),3,3)}
    ctx.restore();
  }
}
/* the rider's cart (14 drawPlayer, in the buggy's own frame: origin on the ground under its centre, wheels at x +-13, y -7):
   a tapered iron tub over the chassis and struts with a timber lip and two straps; the anvil sits in it (lower 6 units hidden,
   more when ducking). Rides the buggy's tilt, squash and big-mode scale for free. */
function mcCart(){
  if(!mcOn())return;
  ctx.fillStyle="#2a1c10";ctx.beginPath();ctx.moveTo(-20,-17);ctx.lineTo(20,-17);ctx.lineTo(16,-8);ctx.lineTo(-16,-8);ctx.closePath();ctx.fill();
  ctx.fillStyle="#5b3d22";ctx.fillRect(-10,-17,2,9);ctx.fillRect(8,-17,2,9);ctx.fillRect(-17,-11,34,1);
  ctx.fillStyle="#b07a46";ctx.fillRect(-21,-18,42,2);
  ctx.fillStyle="#fbbf24";ctx.fillRect(-19,-15,2,2);ctx.fillRect(17,-15,2,2);
}
/* wrap the 06i/06k draws (hoisted function declarations, so both exist here): off L7 the originals run unchanged */
(function(){
  var hd=typeof hlDraw==="function"?hlDraw:null,gd=typeof gpDraw==="function"?gpDraw:null;
  if(hd)hlDraw=function(){if(mcOn())mcRails();else hd()};
  if(gd)gpDraw=function(){if(mcOn())mcGaps();else gd()};
})();
`;
