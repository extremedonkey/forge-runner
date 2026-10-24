// LAB layer for MINE CART (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the site/Poki script).
// Preview: https://preview.forgerunnergames.com/pr-N/lab/minecart/   Mine Cart Madness proof of concept, original Forge art (no DKC assets):
//   gaps tuned up (more, wider, closer together, from second 0), heavy ore carts, mine background, thin double rails over the void,
//   yellow spark arcs over EVERY gap, an industrial soundtrack. ?bot=1 hands-free autopilot, ?fast=1 every run starts at the 760 cap.
export default String.raw`
/* ===== LAB: MINE CART (Mine Cart Madness PoC) ===== */
(function(){
  var i,t;
  /* gaps: the live table is GAP_LV (06d getGapLv); GP_DEF is the fallback, so both are tuned */
  var ch=[.6,.7,.75,.8,.85],mc=[1.1,1.05,1,.95,.9];
  for(i=0;i<5;i++){
    t=GP_DEF[i];t.chanceMin=ch[i]-.05;t.chance=ch[i];t.minClear=mc[i];t.noGapBefore=0;
    if(typeof GAP_LV!=="undefined"&&GAP_LV[i]){t=GAP_LV[i];t.chanceMin=ch[i]-.05;t.chance=ch[i];t.minClear=mc[i];t.noGapBefore=0}
  }
  GP.l1Max=99;GP.l1T=0;
  /* heavy carts: every level from L2, tighter spacing */
  OC_P=[0,1,1,1,1];OC_SP=[0,1.4,1.2,1.1,1.0];

  /* industrial soundtrack (original): A minor, 140 BPM, 8 bars of 16ths, appended after the random-pick tracks (TRN unchanged) */
  var B=["L..L..H.L..O..L.","J..J..H.J..L..J.","H..H..E.H..L..H.","J..L..O.L..J..H.",
         "L..L..H.L..O..Q.","J..J..L.J..O..T.","H..L..O.L..H..E.","J.L.O.L.J...H..."];
  TRK.push({l:B.join(""),r:[45,38,41,43,45,38,41,40],b:[0,0,12,0,0,12,7,12],q:"34434433",sd:.107,s3:.097,w:[2,0],aw:1,
    k:"x...x...x...x...",k3:"x...x...x..xx...",sn:"....x.......x...",h:"x.x.x.x.x.x.x.x."});
  var MT=TRK.length-1,oS=start;
  start=function(){oS();TI=TP=MT;mCut();mI=0;mNext=0;mPend=-1};

  /* mine background over the sky + an abyss under the ground line (the hills mass and the gap holes draw on top) */
  var dw=drawWorld;
  drawWorld=function(){
    dw();
    var x0=XO-20,w=VW+40,g,k,sx,period=120,off=(scroll*.35)%period;
    g=ctx.createLinearGradient(0,0,0,GY);g.addColorStop(0,"#0a0806");g.addColorStop(1,"#241a14");
    ctx.fillStyle=g;ctx.fillRect(x0,0,w,H+OB+20);
    ctx.fillStyle="rgba(255,255,255,.035)";   /* rock strata */
    for(k=0;k<14;k++)ctx.fillRect(x0,18+k*31,w,2);
    ctx.fillStyle="#3a2a1c";   /* timber grid (slow parallax) */
    for(sx=-off;sx<w+period;sx+=period)ctx.fillRect(x0+sx,0,5,H+OB+20);
    for(k=0;k<4;k++)ctx.fillRect(x0,24+k*58,w,4);
    ctx.fillStyle="#5a3f26";   /* pillars (faster parallax) */
    off=(scroll*.6)%360;
    for(sx=-off;sx<w+360;sx+=360){ctx.fillRect(x0+sx+90,0,14,H+OB+20);ctx.fillRect(x0+sx+82,0,30,8)}
    /* open air under the rails: the same mine BG continues below, only dimmed (no ground slab) */
    g=ctx.createLinearGradient(0,GY,0,H+OB);g.addColorStop(0,"rgba(0,0,0,.18)");g.addColorStop(1,"rgba(0,0,0,.6)");
    ctx.fillStyle=g;ctx.fillRect(x0,GY,w,H-GY+OB+20);
  };

  /* rails: thin double rails with ties riding the terrain, so the track reads as a trestle over the void */
  /* the original hlDraw fills a solid terrain polygon under the line: never call it, draw only the open rails */
  hlDraw=function(){
    if(typeof hlOn!=="undefined"&&!hlOn)return;
    var x,x1=XO+VW+24,y;
    ctx.save();
    ctx.fillStyle="#6b4a2c";
    for(x=XO-24-(hsc%28);x<x1;x+=28){y=GY-hlH(x);ctx.fillRect(Math.round(x),y+1,6,5)}
    ctx.strokeStyle="#c9ced6";ctx.lineWidth=1.5;
    ctx.beginPath();for(x=XO-24;x<=x1;x+=8){y=GY-hlH(x);x===XO-24?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
    ctx.strokeStyle="#7d848f";
    ctx.beginPath();for(x=XO-24;x<=x1;x+=8){y=GY-hlH(x)+3;x===XO-24?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
    ctx.restore();
  };

  /* yellow spark arcs over every gap (06k itself only teaches L1-L2) */
  var gd=gpDraw;
  gpDraw=function(){
    gd();
    if(typeof gpOn!=="undefined"&&!gpOn||!gpGaps.length)return;
    var j,k,g,a,b,hs=gpDf()*speed*vMul()*.5,cx,yl,q;
    for(j=0;j<gpGaps.length;j++){g=gpGaps[j];a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20||g.lv<=2&&g.p>=GP.arc)continue;
      cx=(a+b)/2;yl=Math.min(GY-g.h0,GY-g.h1)-10;
      ctx.save();ctx.fillStyle="#fde047";
      for(k=-12;k<=12;k++){q=k/12;ctx.globalAlpha=.35+.5*(1-Math.abs(q));ctx.fillRect(Math.round(cx+q*hs),Math.round(yl-107*(1-q*q)),3,3)}
      ctx.restore();
    }
  };

  /* ?bot=1 hands-free autopilot (restarts like demo), ?fast=1 start at the speed cap (lab only) */
  if(Q.get("bot")==="1"){var oU=update;update=function(dt){if(!demo){if(state==="run")auto();else if(performance.now()-deathAt>1200)start()}oU(dt)}}
  if(Q.get("fast")==="1"){var oF=start;start=function(){oF();speed=MAXV}}
})();
`;
