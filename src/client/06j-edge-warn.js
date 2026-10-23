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
//   edgeWarnClear()  drop everything (also automatic, see below).
// Rules (Dev's three, each tested in scripts/test-orecart.mjs):
//   1. demo mode or no run yet (state "start"): edgeWarn records nothing, edgeWarnDraw draws nothing, no sfx.
//   2. stale keys drop themselves: a key not refreshed for more than EW_STALE (2) edgeWarnDraw frames is gone (a passed gap, a
//      hazard that was removed). Everything is cleared on run start (runS went down / state left "run") and on death.
//   3. no Math.random: the pulse is a function of tt (time) only; fixed preallocated slots, no per-frame allocation.
// Placement: a strip 11 u wide ending 4 u inside the edge (never the last canvas column, which Poki smears into its side
// bars), at track height under the HUD. At 390x844 that is screen x ~377-386, y ~523-563 (Mobile's clear band x 370-390,
// y 360-563); at 844x390 x ~793-807, y ~242-302 (band 792-812, 160-302). Drawn at -SX/-SY so screen shake can't move it.
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
  s.y=typeof op.y==="number"?op.y:GY-46;s.h=typeof op.h==="number"?op.h:46;s.c=op.c||"";s.f=EW_F;
}
/* the strip one glow occupies (logical units, before the -SX/-SY shake cancel) */
function edgeWarnRect(side,y,h){var x=side==="left"?XO+4:XO+VW-15;return {x:x,y:y==null?GY-46:y,w:11,h:h==null?46:h}}
function ewCol(s){return s.c||(s.kind==="enemy"?OR:s.kind==="gap"?CY:"#fde047")}
function ewDraw1(s){
  var r=edgeWarnRect(s.side,s.y,s.h),sx=typeof SX==="number"?SX:0,sy=typeof SY==="number"?SY:0,x=r.x-sx,y=r.y-sy,t=rm()?0:tt;
  var k=Math.max(0,Math.min(1,1-(s.tti-.3)/.85)),pu=rm()?1:.55+.45*Math.abs(Math.sin(t*(10+8*k))),c=ewCol(s),L=s.side==="left",i;
  ctx.globalAlpha=(.4+.35*k)*pu;ctx.fillStyle=c;ctx.fillRect(x,y,r.w,r.h);
  ctx.globalAlpha=Math.min(1,(.65+.35*k)*pu+.1);ctx.fillStyle="#fde047";ctx.fillRect(L?x:x+r.w-3,y+4,3,r.h-4);
  ctx.globalAlpha=1;ctx.fillStyle="#fef3c7";
  if(s.kind==="gap"){var gx=x+1,gy=y+r.h-14;for(i=0;i<5;i++){ctx.fillRect(gx+i,gy+i,2,2);ctx.fillRect(gx+8-i,gy+i,2,2)}}
  /* chevron pointing the way the hazard travels: '<' on the right edge, '>' on the left (apex at cx) */
  else{var cy=y+r.h-14,cx=L?x+r.w-3:x+1;for(i=0;i<5;i++){var dx=L?-(4-i)*2:(4-i)*2;ctx.fillRect(cx+dx,cy-8+i*2,2,2);ctx.fillRect(cx+dx,cy+8-i*2,2,2)}ctx.fillRect(cx,cy,2,2)}
  ctx.globalAlpha=1;
}
function edgeWarnDraw(){
  ewSync();EW_F++;
  if(ewOff())return 0;
  var n=0;
  for(var i=0;i<EW_N;i++){var s=ewS[i];if(!s.k)continue;if(EW_F-s.f>EW_STALE){s.k="";continue}ewDraw1(s);n++}
  return n;
}
function edgeWarnLive(){var n=0;for(var i=0;i<EW_N;i++)if(ewS[i].k&&EW_F-ewS[i].f<=EW_STALE)n++;return n}
`;
