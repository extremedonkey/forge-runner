// SLAG (owner: Levels): L8 SLAG PITS II hazards built on 06k gap KINDS, reusable by any level row with kinds (06d GAP_LV).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Never writes speed / score / scroll / runS; no Math.random (06k's gap LCG picks kinds). Fair by construction: 06k places every
// kinded gap only after gpWin cleared it with the hole present, so whatever state it is in when the buggy arrives is clearable.
//  - CRUMBLING BRIDGES: "crust" = a slag-crust bridge over a placed gap (on false: drivable). The crust behind the buggy's rear
//    wheel crumbles into the pit (cosmetic: never ahead of PX-10). "fall" = a cracked, glowing crust that collapses (on -> true, an
//    ordinary gap from then on) when the buggy is CB.drop s away, never closer than CB.min s (else it stays a plain crust).
// Hooks (one typeof-guarded line each): 06k gpSpawn -> sgKind(g,kinds,r); 13 update() -> sgTick() (after azTick);
// 14 draw() -> sgDraw() (right after gpDraw). Flag: ?bridges=0 (both builds) leaves crust / fall out of the kind roll.
export default String.raw`
/* crumbling bridges: drop = s (felt) before the buggy's front reaches the lip when a "fall" crust collapses, min = latest allowed;
   th = crust thickness, cr = crack spacing (px), fall = debris gravity, life = s a chunk is drawn after it breaks off */
var CB={drop:1.3,min:.9,th:9,cr:22,fall:1400,life:.8},SG_BR=true;
try{if(Q&&Q.get&&Q.get("bridges")==="0")SG_BR=false}catch(e){}
/* 06k gpSpawn: give a just-placed gap g a kind from the row's kinds {crust, fall} (cumulative chances, r = 06k's own roll) */
function sgKind(g,K,r){
  var c=0;
  if(SG_BR){c+=K.crust||0;if(r<c){g.k="crust";g.on=false;return}
    c+=K.fall||0;if(r<c){g.k="fall";g.on=false;return}}
}
/* 13 update(): collapse "fall" crusts on time (a late one, inside CB.min, stays a plain crust) */
function sgTick(){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,f=Math.max(1,speed*vMul()),fr=hsc+PX+PW,tti;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.k!=="fall"||g.on!==false)continue;
    tti=(g.x0-fr)/f;
    if(tti<=CB.min)g.k="crust";else if(tti<=CB.drop){g.on=true;g.dropT=runS}
  }
}
/* pit under a span [a,b] (screen x) of gap g: 06k's hole shade along the curve, down to the bottom of the view */
function sgPit(g,a,b){
  var n=Math.max(2,Math.ceil((b-a)/12)),k,x;
  ctx.fillStyle="#04050a";ctx.beginPath();ctx.moveTo(a,GY-gpCurve(hsc+a)-7);
  for(k=1;k<=n;k++){x=a+(b-a)*k/n;ctx.lineTo(x,GY-gpCurve(hsc+x)-7)}
  ctx.lineTo(b,GY+400);ctx.lineTo(a,GY+400);ctx.closePath();ctx.fill();
}
/* chunks falling from world x span [w0,w1], each broken off at time s ago = s0 + (distance from w1)/f (analytic, no state) */
function sgDebris(w0,w1,s0,f,col){
  var x,t,y;ctx.fillStyle=col;
  for(x=Math.ceil(w0/CB.cr)*CB.cr;x<w1;x+=CB.cr){t=s0+(w1-x)/f;if(t<0||t>CB.life)continue;
    y=GY-gpCurve(x)+.5*CB.fall*t*t;ctx.globalAlpha=1-t/CB.life;ctx.fillRect(Math.round(x-hsc-5),Math.round(y),10,6)}
  ctx.globalAlpha=1;
}
/* 14 draw(), after gpDraw: crust bridges (intact part, crumbled part behind the buggy) and the debris of collapsed "fall" crusts */
function sgDraw(){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,a,b,c,x,k,n,f=Math.max(1,speed*vMul()),mo=!rm(),t=mo?tt:0,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,
    hot=P?P.pe:OR,cf=hsc+PX-10;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.k!=="crust"&&g.k!=="fall")continue;
    a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    if(g.on!==false){if(mo&&g.dropT!=null)sgDebris(g.x0,g.x1,runS-g.dropT,1e9,"#3a1d0c");continue}   /* collapsed: 06k draws the hole */
    c=Math.max(a,Math.min(b,cf-hsc));
    if(c>a){sgPit(g,a,c);if(mo)sgDebris(g.x0,hsc+c,0,f,"#3a1d0c")}   /* crumbled behind the rear wheel */
    if(c>=b)continue;
    /* the crust slab along the curve, th px thick, with cracks; a "fall" crust glows through its cracks */
    sgPit(g,c,b);
    n=Math.max(2,Math.ceil((b-c)/12));
    ctx.fillStyle="#3a1d0c";ctx.beginPath();ctx.moveTo(c,GY-gpCurve(hsc+c)-2);
    for(k=1;k<=n;k++){x=c+(b-c)*k/n;ctx.lineTo(x,GY-gpCurve(hsc+x)-2)}
    for(k=n;k>=0;k--){x=c+(b-c)*k/n;ctx.lineTo(x,GY-gpCurve(hsc+x)+CB.th)}
    ctx.closePath();ctx.fill();
    var fl=g.k==="fall",pu=fl?.6+.4*Math.sin(t*9):.35;
    ctx.fillStyle=fl?"#fdba74":hot;ctx.globalAlpha=pu;
    for(x=Math.ceil((hsc+c)/CB.cr)*CB.cr;x<g.x1;x+=CB.cr){var sx=x-hsc,sy=GY-gpCurve(x);ctx.fillRect(Math.round(sx),Math.round(sy-1),2,CB.th);if(fl)ctx.fillRect(Math.round(sx-4),Math.round(sy+3),9,2)}
    ctx.globalAlpha=1;
    if(fl){ctx.fillStyle="#fde047";ctx.globalAlpha=.25+.2*Math.sin(t*9);ctx.fillRect(Math.round(c),Math.round(GY-g.h0+CB.th),Math.round(b-c),3);ctx.globalAlpha=1}
  }
}
`;
