// EDGE WARN (owner: Levels; API agreed with Dev for GAPS): one shared off-screen hazard telegraph at the screen edge.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
//   edgeWarn(key, tti, kind, side, opts)  call EVERY frame (draw or sim path) while the hazard is off-screen and should be
//        telegraphed. key = any string unique per hazard ("oc3", "gap12"); tti = seconds to impact (drives intensity and pulse
//        rate); kind = "enemy" (orange, "<" chevron) | "gap" (cyan, "v" drop mark) | anything else (yellow); side = "right"
//        (default) | "left"; opts (optional) = {y: logical top (default GY-46), h: height (default 46), c: colour,
//        sfx: [type, event] -> enemySfx(type, event) ONCE per key per run, on its first call}.
//   edgeWarnDraw()  draws every live glow (world transform, same as drawEnts). Live hook line (14-render.js drawEnts(), last
//        line, after enDrawAfter): typeof edgeWarnDraw==="function"&&edgeWarnDraw();  /* EDGE WARN (06j): off-screen hazard glows */
//        Before drawing it runs 06k's hzScan() (typeof-guarded), which registers the plain hazards' glows for this frame.
//   edgeWarnClear()  drop everything (also automatic, see below).
// Rules (Dev's three, each tested in scripts/test-orecart.mjs):
//   1. demo mode or no run yet (state "start"): edgeWarn records nothing, edgeWarnDraw draws nothing, no sfx.
//   2. stale keys drop themselves: a key not refreshed for more than EW_STALE (2) edgeWarnDraw frames is gone (a passed gap, a
//      hazard that was removed). Everything is cleared on run start (runS went down / state left "run") and on death.
//   3. no Math.random: the pulse is a function of tt (time) only; fixed preallocated slots, no per-frame allocation.
// Placement (edgeWarnRect): a 20 CSS px band against the edge, bottom on the ground line: 390x844 x 370-390, y ~413-563
// (Mobile's clear band x 370-390, y 360-563); 844x390 x 792-811, y ~161-302 (band 792-812, 160-302, last column kept clear for
// Poki's side bars); desktop scales with the canvas (same logical rect). Hot gradient fading in from the edge, bold '<<' at
// track height (22 CSS px portrait / 18 landscape, white core + 2 px dark outline, 4 px in from the edge; cyan inner-edge
// line for contrast on warm skies), pulse rate rising as tti falls. Drawn at -SX/-SY so screen shake can't move it.
export default String.raw`
var EW_N=8,EW_STALE=2,EW_F=0,EW_LR=-1,EW_FIRED=[],EW_FN=16;
var ewS=[];for(var ewI=0;ewI<EW_N;ewI++)ewS.push({k:"",tti:0,kind:"",side:"right",y:0,h:0,c:"",f:-99});
function ewOff(){return demo||state!=="run"}
function edgeWarnClear(){for(var i=0;i<EW_N;i++)ewS[i].k="";EW_FIRED.length=0}
/* run start / death / leaving the run: everything goes */
function ewSync(){
  if(state!=="run"){if(EW_LR>=0){edgeWarnClear();EW_LR=-1}return}
  if(EW_LR<0||runS<EW_LR)edgeWarnClear();
  EW_LR=runS;
}
function edgeWarn(key,tti,kind,side,opts){
  ewSync();if(ewOff()||typeof key!=="string"||!key)return;
  var i,s=null,free=null;
  for(i=0;i<EW_N;i++){if(ewS[i].k===key){s=ewS[i];break}if(!free&&!ewS[i].k)free=ewS[i]}
  if(!s){s=free;if(!s)return;s.k=key;
    var o=opts||0;
    if(o.sfx&&EW_FIRED.indexOf(key)<0){if(EW_FIRED.length>=EW_FN)EW_FIRED.shift();EW_FIRED.push(key);
      if(typeof enemySfx==="function"){try{enemySfx(o.sfx[0],o.sfx[1])}catch(e){}}}}
  var op=opts||0;
  s.tti=+tti||0;s.kind=kind||"";s.side=side==="left"?"left":"right";
  s.y=typeof op.y==="number"?op.y:null;s.h=typeof op.h==="number"?op.h:null;s.c=op.c||"";s.f=EW_F;
}
/* the band one glow occupies (logical units, before the -SX/-SY shake cancel). Sized in CSS px through CS (CSS px per unit):
   20 px wide against the edge (portrait: the full 370-390 band at 390x844; landscape/desktop: 1 px in from the edge so Poki's
   smeared last/first column never carries it, 792-811 at 844x390). Tall: portrait 170 u (~150 px at 390x844: y ~413-563),
   landscape/desktop 108 u (844x390: y ~161-302), bottom on the ground line, so the cart's track height sits in the lower third
   and the band stays under the HUD (top-left mute/pause/Pill and top-right score are all above y 160 / 360). */
function ewCS(){return typeof CS==="number"&&CS>0?CS:1}
/* the glow's "pixel": 1 CSS px in portrait; in landscape/desktop 1/1.3 u (= 1 CSS px at 844x390), so desktop scales with it */
function ewU(){return ewTall()?1/ewCS():1/1.3}
function ewTall(){return typeof ZM==="number"&&ZM>1}
function edgeWarnRect(side,y,h){
  var cs=ewCS(),tall=ewTall(),U=ewU(),w=tall?20*U:19*U,ins=tall?0:1/cs,hh=h==null?(tall?170:108):h,yy=y==null?GY-hh:y;
  var x=side==="left"?XO+ins:XO+VW-ins-w;
  return {x:x,y:yy,w:w,h:hh};
}
/* hot palette (edge -> inner): the gradient fades in from the screen edge */
var EW_CI=4,EW_HOT=["#fff7d6","#fde047","#fb923c",OR,"#ef4444","#b91c1c"],EW_ICE=["#ecfeff","#a5f3fc","#67e8f9",CY,"#0891b2","#155e75"];
var EW_GA=[1,.85,.7,.52,.36,.22];
/* pulse: a pure function of time and tti (no RNG). phase = 6 t + 4/(tti+.2): the rate is 6 + 4/(tti+.2)^2 rad/s, so it
   speeds up smoothly as tti falls (~8 rad/s at 1.15 s -> ~31 at 0.2 s), without the phase jumps of a stepped rate. */
function ewPulse(t,tti){return .6+.4*Math.abs(Math.sin(6*t+4/(Math.max(0,tti)+.2)))}
function ewDraw1(s){
  var r=edgeWarnRect(s.side,s.y,s.h),sx=typeof SX==="number"?SX:0,sy=typeof SY==="number"?SY:0,x=r.x-sx,y=r.y-sy,t=rm()?0:tt;
  var k=Math.max(0,Math.min(1,1-(s.tti-.3)/.85)),pu=rm()?1:ewPulse(t,s.tti),L=s.side==="left",gap=s.kind==="gap",P=gap?EW_ICE:EW_HOT,i;
  var n=6,sw=r.w/n,U=ewU(),tall=ewTall(),ch=(tall?22:18)*U,ty=Math.max(y+ch/2+2*U,Math.min(GY-13-sy,y+r.h-ch/2-2*U)),yA=Math.max(y,ty-30*U),yB=y+r.h;
  /* vertical fade at the ends: the band is a soft column, brightest around track height */
  for(i=0;i<n;i++){
    var ov=i<n-1?.05:0,bx=L?x+i*sw:x+r.w-(i+1)*sw-ov,bw=sw+ov,a=EW_GA[i]*(.55+.45*k)*pu;  /* inner seams overlap; never past the band */
    ctx.fillStyle=s.c&&i>1?s.c:P[i];
    ctx.globalAlpha=a*.45;ctx.fillRect(bx,y,bw,r.h);
    ctx.globalAlpha=a*.8;ctx.fillRect(bx,y+r.h*.35,bw,r.h*.65);
    if(yB>yA){ctx.globalAlpha=Math.min(1,a*1.15);ctx.fillRect(bx,yA,bw,yB-yA)}
  }
  /* COOL CORE (Playtest #85): a 1 px dark + 1.5 px cyan line on the band's inner edge, so the warm glow still separates from the red/orange
     L2-L4 skies and the setting sun next to it in portrait */
  ctx.globalAlpha=.9;ctx.fillStyle="#05070d";ctx.fillRect(L?x+r.w-U:x,y,U,r.h);
  ctx.globalAlpha=Math.min(1,.7+.3*pu);ctx.fillStyle=CY;ctx.fillRect(L?x+r.w-2.5*U:x+U,y,1.5*U,r.h);
  /* bold double chevron at track height: '<<' on the right edge (hazard coming in), '>>' on the left; gaps get 'vv'.
     22 CSS px tall in portrait (18 in landscape / desktop-scaled), 2.5 px strokes, white core with a 2 px dark OUTLINE, set
     EW_CI px in from the screen edge so it sits on the darker inner glow, not on the bright edge strip (Playtest #85) */
  var st=2.5*U,ol=2*U,cw=(tall?5:4.5)*U,gp=1.5*U,steps=8,hs=ch/2/steps,Wc=2*cw+gp+st,ci=Math.min(EW_CI*U,r.w-Wc-ol);
  var cx0=L?x+ci+Wc:x+r.w-ci-Wc;
  for(var pass=0;pass<2;pass++){
    var o=pass?0:ol,ow=pass?st:st+2*ol;
    ctx.globalAlpha=pass?Math.min(1,.88+.12*pu):.92;ctx.fillStyle=pass?"#ffffff":"#05070d";
    for(var c2=0;c2<2;c2++){
      if(gap){var gx=x+r.w/2-cw,gy=ty-ch/2+c2*(ch*.5);for(i=0;i<=steps;i++){var ddx=i*cw/steps;ctx.fillRect(gx+ddx-o,gy+i*hs*.6-o,ow,ow);ctx.fillRect(gx+2*cw-ddx-st-o,gy+i*hs*.6-o,ow,ow)}continue}
      /* right: tips point left, at ax; left: tips point right */
      var ax=L?cx0-c2*(cw+gp)-st:cx0+c2*(cw+gp);
      for(i=0;i<=steps;i++){var dx=(steps-i)*cw/steps,px=L?ax-dx:ax+dx;ctx.fillRect(px-o,ty-ch/2+i*hs-o,ow,ow);ctx.fillRect(px-o,ty+ch/2-i*hs-st-o,ow,ow)}
    }
  }
  ctx.globalAlpha=1;
}
function edgeWarnDraw(){
  ewSync();
  typeof hzScan==="function"&&hzScan();  /* HAZARD WARN (06k): every hazard while look-ahead < 0.9 s */
  EW_F++;
  if(ewOff())return 0;
  var n=0;
  for(var i=0;i<EW_N;i++){var s=ewS[i];if(!s.k)continue;if(EW_F-s.f>EW_STALE){s.k="";continue}ewDraw1(s);n++}
  return n;
}
function edgeWarnLive(){var n=0;for(var i=0;i<EW_N;i++)if(ewS[i].k&&EW_F-ewS[i].f<=EW_STALE)n++;return n}
`;
