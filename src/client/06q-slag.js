// SLAG (owner: Levels): L8 SLAG PITS II hazards built on 06k gap KINDS, reusable by any level row with kinds (06d GAP_LV).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Never writes speed / score / scroll / runS; no Math.random (06k's gap LCG picks kinds). Fair by construction: 06k places every
// kinded gap only after gpWin cleared it with the hole present, so whatever state it is in when the buggy arrives is clearable.
//  - CRUMBLING BRIDGES: "crust" = a slag-crust bridge over a placed gap (on false: drivable). The crust behind the buggy's rear
//    wheel crumbles into the pit (cosmetic: never ahead of PX-10). "fall" = a cracked, glowing crust that collapses (on -> true, an
//    ordinary gap from then on) when the buggy is CB.drop s away, never closer than CB.min s (else it stays a plain crust).
//  - SLAG TIDE: "pool" = a lava pool flooding a valley: 06k gpSpawn asks sgPool for the next valley bottom ahead (TD.search px),
//    a flat surface Ls whose submerged span is the rolled width (lips level: h0 = h1 = Ls), lip rules and gpWin with the hole present.
//    Always lethal (playtest 25 Oct: pools that were sometimes dry read as "what do I do?"): one rule, lava = jump. The slag rises
//    into the valley as the pool comes into view (TD.rise s, cosmetic: it is full long before the buggy can reach it). No pools
//    with ?hills=0 (no valleys).
//  - SPRINGS (kind "geyser"; playtest 25 Oct: a spring reads at once and carries to other levels): a coil spring pad (GZ.pad px)
//    GZ.run s of runway before a pit GZ.p x Dfull wide (too wide for a plain full jump, coyote and ledge assist included), all on a
//    flat stretch the spring makes for itself (sgFl, like a fork's deck zone, eased in off screen). Rolling over it does nothing (the buggy
//    rolls on into the pit): the player has to HIT JUMP ON IT. A jump taken on the pad (or buffered just before it, still under
//    GZ.low px when the buggy's centre reaches the pad) becomes the spring launch: vy GZ.v and gravity x GZ.gk until it lands
//    (06i hlPhys reads sgGk()): a long, low flight. Placed only when look-ahead sims of that press clear the pit from every
//    GZ.js px of the pad (from GZ.early s before it). The autopilot presses on the pad (06k gpAuto -> sgAuto). The spring squashes
//    under the buggy and snaps up on the launch; chevrons over it and a dotted arc show the ride.
// Hooks (one typeof-guarded line each): 06k gpSpawn -> sgPool(...), sgGeyser(...) and sgKind(g,kinds,r), gpAuto -> sgAuto(g);
// 06i hlPhys gravity x sgGk(); 13 update() -> sgTick() (after
// skClear); 14 draw() -> sgDraw() (right after gpDraw). Flags: ?bridges=0 (no crust / fall), ?tide=0 (no pools), ?geysers=0, both builds.
export default String.raw`
/* crumbling bridges: drop = s (felt) before the buggy's front reaches the lip when a "fall" crust collapses, min = latest allowed;
   th = crust thickness, cr = crack spacing (px), fall = debris gravity, life = s a chunk is drawn after it breaks off */
var CB={drop:1.3,min:.9,th:12,cr:22,fall:1400,life:.8},SG_BR=true,SG_TD=true,SG_GY=true;
try{if(Q&&Q.get&&Q.get("bridges")==="0")SG_BR=false;if(Q&&Q.get&&Q.get("tide")==="0")SG_TD=false;if(Q&&Q.get&&Q.get("geysers")==="0")SG_GY=false}catch(e){}
/* geysers: pad px before the lip, launch vy (830: the apex just reaches 06i's world ceiling HL.yMax from the floor line, so the
   flight is as long as the ceiling allows: ~1.3 x a full jump from low ground, less from high ground), pit width range (x Dfull),
   max pad slope, narrowing steps, jump-on-pad sweep step px; lo = highest pad (px above the floor line: the ceiling leaves a high
   pad too little flight), rise = px the far edge may sit above the lip (the launch comes down from far higher), search px ahead */
var GZ={pad:56,run:.22,v:500,gk:.4,p:[1.25,1.4],tries:3,js:8,low:40,early:.05,ease:1200,tail:.5};
/* spring flight: live (sgAir) and look-ahead (sgSimA, so a sim never inherits a live flight) gravity factor for 06i hlPhys */
var sgAir=0,sgSimA=0;
function sgGk(){var a=hlSim?sgSimA:sgAir;if(a&&py===0&&vy<=0){if(hlSim)sgSimA=0;else sgAir=0;return 1}return a?GZ.gk:1}
function sgOnPad(g){var c=hsc+PX+PW/2;return c>=g.pad0&&c<=g.pad0+GZ.pad}
/* the launch (live: sgTick; look-ahead: sgFly): a jump that has just left the pad (low, rising, the buggy's centre over the pad) */
function sgLaunch(g){
  if(g.used||hlDeep||!sgOnPad(g))return false;
  if(py>0&&py<GZ.low&&vy>0&&hlJ){vy=GZ.v;if(hlSim)sgSimA=1;else{sgAir=1;g.lt=runS}g.used=1;return true}
  return false;
}
/* 06k gpAuto: the autopilot presses jump while grounded on the middle of the pad */
function sgAuto(g){var c=hsc+PX+PW/2;return !g.used&&py===0&&c>=g.pad0+GZ.pad*.25&&c<=g.pad0+GZ.pad*.6}
/* look-ahead: from grounded 1 s before the pad, press jump when the buggy's centre reaches jx, step the real hlTick/hlPhys + the
   launch; true when the whole buggy gets past the pit. Pure: saves and restores everything it steps */
function sgFly(g,f,jx){
  var S=[hsc,hlF,hlSm,hlLG,hlLTV,hlCr,hlCL,hlJ,hlTk,hlPk,hlTl,py,vy,duck,hlOff,hlDeep,hlCW,hlPS,hlSv,g.used,sgSimA],dt=1/240,j,ok=false,jp=jx==null;
  hlSim=1;duck=false;hsc=g.pad0-(PX+PW/2)-f*1;hlSv=speed;hlSm=S[2];hlF=1+hlSm;hlLG=hlB();hlLTV=0;py=0;vy=0;hlCr=0;hlCL=0;hlJ=0;hlOff=0;hlDeep=0;g.used=0;sgSimA=0;
  for(j=0;j<240*4;j++){
    if(!jp&&hsc+PX+PW/2>=jx&&py===0){jp=true;vy=JV}
    hlTick(dt);hlPhys(dt);sgLaunch(g);gpWk++;
    if(hlDeep||py<-GP.deep)break;
    if(g.used&&hsc+PX>g.x1){ok=true;break}   /* the whole buggy past the far edge (06k's own check after it lands) */
    if(!g.used&&hsc+PX>g.x0+PW)break;
  }
  hlSim=0;hsc=S[0];hlF=S[1];hlSm=S[2];hlLG=S[3];hlLTV=S[4];hlCr=S[5];hlCL=S[6];hlJ=S[7];hlTk=S[8];hlPk=S[9];hlTl=S[10];py=S[11];vy=S[12];duck=S[13];hlOff=S[14];hlDeep=S[15];hlCW=S[16];hlPS=S[17];hlSv=S[18];g.used=S[19];sgSimA=S[20];
  return ok;
}
/* 06k gpSpawn (spring roll): a spring + runway + pit on its own flat stretch, narrowed up to GZ.tries times, or null. The stretch
   (fz0..fz1: from just before the pad to GZ.tail x Dfull past the pit) is flattened by sgFl (06i hlCurve), eased in / out over
   GZ.ease px; it starts off screen and past the last gap and coolant pool, so nothing already placed or seen changes shape */
function sgGeyser(n,T,lw,f){
  if(!SG_GY||!hlOn)return null;
  var p=GZ.p[0]+(GZ.p[1]-GZ.p[0])*gpR(),k,x0,p0,gw,g,x,ok,rw=GZ.run*f,vr=(typeof XO==="number"?XO+VW:W)+40,
    zm=Math.max(hsc+vr,gpLastGap+gpDf()*f,typeof htG!=="undefined"&&htG.length?htG[htG.length-1].x1:-1e9);
  p0=Math.max(lw,zm+GZ.ease+40);
  for(k=0;k<GZ.tries;k++,p=Math.max(GZ.p[0],p-.05)){
    gw=p*gpDf()*f;x0=p0+GZ.pad+rw;
    g={x0:x0,x1:x0+gw,h0:0,h1:0,p:p,f:f,lv:n,key:"gap"+(gpN+1),t:runS,k:"geyser",on:true,pad0:p0,fz0:p0-40,fz1:x0+gw+GZ.tail*gpDf()*f};
    if(typeof fkZone==="function"&&fkZone(g.fz0-GZ.ease,g.fz1+GZ.ease))return gpNo("fork")||null;
    gpGaps.push(g);g.h0=gpCurve(x0);g.h1=gpCurve(x0+gw);ok=true;
    for(x=p0-GZ.early*f;ok&&x<=p0+GZ.pad-6;x+=GZ.js)ok=sgFly(g,f,x);
    if(ok){gpN++;g.win=GZ.pad/f;g.tap=0;g.mid=0;return g}
    gpGaps.pop();gpNo("geyser-fly");
  }
  return null;
}
/* 06i hlCurve: flatten factor over every spring's stretch (0 on it, smoothstep back to 1 over GZ.ease px) */
function sgFl(wx){
  if(typeof gpGaps==="undefined")return 1;
  var i,g,u,m=1;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.k!=="geyser"||g.fz0==null)continue;
    u=wx<g.fz0?(g.fz0-wx)/GZ.ease:wx>g.fz1?(wx-g.fz1)/GZ.ease:0;if(u>=1)continue;u=u*u*(3-2*u);if(u<m)m=u}
  return m;
}
/* 06s HEAT: world [a,b] touches a spring's pad or the run-up to it (no coolant pool there: the player is busy jumping) */
function sgPadNear(a,b){
  if(typeof gpGaps==="undefined")return false;
  var f=Math.max(1,speed*vMul()),i,g;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];if(g.k==="geyser"&&g.pad0!=null&&b>g.pad0-.6*f&&a<g.x0)return true}
  return false;
}
/* slag tide: rise = s the slag takes to fill a pool coming into view (cosmetic; warn/hold/drain/dry only phase its bubbles);
   search = px ahead for a valley; minD / maxD = pool depth (px of slag over the valley floor); pMax = widest pool (x Dfull;
   valleys are broad, gpWin still has to clear it); st = valley scan step px */
var TD={warn:1,rise:.8,hold:2.4,drain:.6,dry:2.2,search:2200,minD:12,maxD:90,pMax:.9,st:8};
var TD_P=TD.warn+TD.rise+TD.hold+TD.drain+TD.dry;
/* the submerged span at surface Ls around a valley bottom xm: [x0,x1] where the curve is below Ls (TD.st px steps, then refined) */
function sgSpan(xm,Ls){
  var a=xm,b=xm,k;
  while(gpCurve(a-TD.st)<Ls&&xm-a<4000)a-=TD.st;
  while(gpCurve(b+TD.st)<Ls&&b-xm<4000)b+=TD.st;
  var lo=a-TD.st,hi=a;for(k=0;k<10;k++){var m=(lo+hi)/2;if(gpCurve(m)<Ls)hi=m;else lo=m}a=hi;
  lo=b;hi=b+TD.st;for(k=0;k<10;k++){m=(lo+hi)/2;if(gpCurve(m)<Ls)lo=m;else hi=m}b=lo;
  return [a,b];
}
/* 06k gpSpawn (pool roll): a pool of width ~p x Dfull in the first valley at or after lw, or null (nothing changed) */
function sgPool(n,T,lw,p,f,sw){
  if(!SG_TD||!hlOn)return null;
  var x,xm=null,gw=p*gpDf()*f,hm,lo,hi,Ls,sp,k,g,wn;
  /* the first valley bottom at or after lw that takes a pool: a broad saddle (already wider than TD.pMax of Dfull at the minimum
     depth) is skipped; one wider than the roll at the minimum depth keeps that width, else the surface is fitted to the roll */
  for(x=lw;x<lw+TD.search;x+=TD.st){
    if(!(gpCurve(x)<=gpCurve(x-TD.st)&&gpCurve(x)<gpCurve(x+TD.st)))continue;
    hm=gpCurve(x);lo=hm+TD.minD;hi=hm+TD.maxD;sp=sgSpan(x,lo);
    if(sp[1]-sp[0]>TD.pMax*gpDf()*f){gpNo("pool-shallow");x=sp[1];continue}
    xm=x;break;
  }
  if(xm===null)return gpNo("pool-valley")||null;
  if(sp[1]-sp[0]>=gw)Ls=lo;
  else{for(k=0;k<14;k++){Ls=(lo+hi)/2;sp=sgSpan(xm,Ls);if(sp[1]-sp[0]<gw)lo=Ls;else hi=Ls}Ls=lo;sp=sgSpan(xm,Ls)}
  if(sp[0]<lw||(sp[1]-sp[0])/(gpDf()*f)>gpCap())return gpNo("pool-fit")||null;
  if(!gpLipOK(n,sp[0],sp[1],f,T))return gpNo("pool-lip")||null;
  if(typeof fkZone==="function"&&fkZone(sp[0]-gpDf()*f,sp[1]+gpDf()*f))return gpNo("fork")||null;
  g={x0:sp[0],x1:sp[1],h0:Ls,h1:Ls,p:(sp[1]-sp[0])/(gpDf()*f),f:f,lv:n,key:"gap"+(gpN+1),t:runS,k:"pool",on:true,hm:hm};
  gpGaps.push(g);wn=gpWin(g,f,sw);
  if(wn[0]<GP.win||g.p<=GP.tapF*2*CUT/G/gpDf()&&wn[1]<GP.tapWin){gpGaps.pop();return gpNo("pool-window")||null}
  gpN++;g.win=wn[0];g.tap=wn[1];g.mid=wn[2];g.ph=(gpN*2.618)%TD_P;g.vl=0;
  return g;
}
/* 06k gpSpawn: give a just-placed gap g a kind from the row's kinds {crust, fall} (cumulative chances, r = 06k's own roll) */
function sgKind(g,K,r){
  var c=0;
  if(SG_BR){c+=K.crust||0;if(r<c){g.k="crust";g.on=false;return}
    c+=K.fall||0;if(r<c){g.k="fall";g.on=false;return}}
}
/* 13 update() (dt): collapse "fall" crusts on time (a late one, inside CB.min, stays a plain crust); fill pools as they come into
   view; launch the buggy off a geyser pad */
function sgTick(dt){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,f=Math.max(1,speed*vMul()),fr=hsc+PX+PW,tti,l;dt=dt||0;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    if(g.k==="geyser"){if(state==="run")sgLaunch(g);continue}
    if(g.k==="pool"){if(g.x0-hsc<(typeof XO==="number"?XO+VW:W)+40)g.vl=Math.min(1,(g.vl||0)+dt/TD.rise);continue}   /* rises into view (cosmetic) */
    if(g.k!=="fall"||g.on!==false)continue;
    tti=(g.x0-fr)/f;
    if(tti<=CB.min)g.k="crust";else if(tti<=CB.drop){g.on=true;g.dropT=runS}
  }
}
/* pit under a span [a,b] (screen x) of gap g: 06k's own campaign hole shade (gpShade: slab + glow, same look as every hole) */
function sgPit(g,a,b){
  var P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null;
  gpShade(hsc+a,hsc+b,P&&P.hl||GP_HL);
}
/* chunks falling from world x span [w0,w1], each broken off at time s ago = s0 + (distance from w1)/f (analytic, no state) */
function sgDebris(w0,w1,s0,f,col){
  var x,t,y;ctx.fillStyle=col;
  for(x=Math.ceil(w0/CB.cr)*CB.cr;x<w1;x+=CB.cr){t=s0+(w1-x)/f;if(t<0||t>CB.life)continue;
    y=GY-gpCurve(x)+.5*CB.fall*t*t;ctx.globalAlpha=1-t/CB.life;ctx.fillRect(Math.round(x-hsc-5),Math.round(y),10,6)}
  ctx.globalAlpha=1;
}
/* a lava pool: full to its flat surface Ls (06i hlW draws the ground mass up to that line across a hole, so the slag is painted
   over exactly the hitbox: between the surface and the valley curve), faded in by the drawn level vl as it rises into view */
function sgPoolDraw(g,a,b,t,mo){
  var n=Math.max(2,Math.ceil((b-a)/10)),k,x,ys=GY-g.h0,al=g.on!==false?Math.max(.15,mo?g.vl||0:1):0,u,bx,by;
  {
    ctx.globalAlpha=al;
    var gr=ctx.createLinearGradient(0,ys,0,GY-g.hm);gr.addColorStop(0,"#f97316");gr.addColorStop(1,"#7c2d12");
    ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(a,ys);
    for(k=0;k<=n;k++){x=a+(b-a)*k/n;ctx.lineTo(x,Math.max(ys,GY-gpCurve(hsc+x)))}
    ctx.lineTo(b,ys);ctx.closePath();ctx.fill();
    ctx.fillStyle="#fde047";ctx.fillRect(Math.round(a),Math.round(ys),Math.round(b-a),2);
    ctx.fillStyle="#fff7d6";
    if(mo)for(k=0;k<5;k++){u=(t*.8+k*.37+g.ph)%1;bx=a+(b-a)*((k*.23+g.ph*.1)%1);ctx.globalAlpha=al*(1-u);ctx.fillRect(Math.round(bx),Math.round(ys-u*14),3,3)}
    ctx.fillStyle="rgba(253,186,116,.18)";ctx.globalAlpha=al;ctx.fillRect(Math.round(a),Math.round(ys-18),Math.round(b-a),18);   /* heat haze */
    ctx.globalAlpha=1;return;
  }
}
/* a spring: base plate, a zig-zag coil and a glowing top plate; squashed while the buggy rolls on it, snapping up (and settling)
   after the launch; chevrons over it (jump here) and a dotted arc of the ride (launch vy GZ.v at gravity x GZ.gk) */
function sgGeyDraw(g,a,t,mo,f){
  var p0=g.pad0-hsc,cx=p0+GZ.pad/2,y=GY-gpCurve(g.pad0+GZ.pad/2),k,u,q,
    sq=!g.used&&py===0&&sgOnPad(g)?1:0,up=g.lt!=null&&mo?Math.max(0,1-(runS-g.lt)/.35):0,
    hc=Math.round(14-7*sq+10*up*Math.cos(up*9)),top=y-6-hc;
  ctx.fillStyle="#334155";ctx.fillRect(Math.round(p0),Math.round(y-5),GZ.pad,5);                       /* base plate */
  ctx.fillStyle="#94a3b8";
  for(k=0;k<4;k++){var cy=Math.round(y-6-hc*(k+1)/5),dx=k&1?6:-6;ctx.fillRect(Math.round(cx-14+dx),cy,28,3)}   /* coil */
  ctx.fillStyle="#cbd5e1";ctx.fillRect(Math.round(cx-15),Math.round(y-6-hc),4,hc);ctx.fillRect(Math.round(cx+11),Math.round(y-6-hc),4,hc);
  ctx.fillStyle="#f97316";ctx.fillRect(Math.round(p0+4),Math.round(top-4),GZ.pad-8,5);                  /* top plate */
  ctx.fillStyle="#fde047";ctx.globalAlpha=mo?.55+.45*Math.sin(t*8):1;ctx.fillRect(Math.round(p0+6),Math.round(top-4),GZ.pad-12,2);ctx.globalAlpha=1;
  if(g.used)return;
  /* chevrons: jump here */
  ctx.fillStyle="#fde047";
  for(k=0;k<3;k++){u=mo?(t*2+k*.33)%1:k/3;ctx.globalAlpha=mo?1-u:.8;var vy0=Math.round(top-16-k*11-(mo?u*8:0));
    ctx.fillRect(Math.round(cx-7),vy0+4,4,3);ctx.fillRect(Math.round(cx-3),vy0,6,3);ctx.fillRect(Math.round(cx+3),vy0+4,4,3)}
  ctx.globalAlpha=1;
  /* the ride, in the game's jump-guide language (06k's L1-L2 teaching arc: dashed yellow): from the pad's top at the felt speed,
     launch vy GZ.v, gravity x GZ.gk (the real flight can be capped near the top) */
  var gg=G*GZ.gk,T2=2*GZ.v/gg;
  ctx.save();ctx.strokeStyle="#fde047";ctx.globalAlpha=.6;ctx.lineWidth=2;if(ctx.setLineDash)ctx.setLineDash([5,7]);ctx.beginPath();
  for(k=0;k<=20;k++){q=k/20*T2;ctx.lineTo(cx+f*q,top-GZ.v*q+.5*gg*q*q)}
  ctx.stroke();ctx.restore();
  /* the press cue, every spring (the 06h rescue prompt's look): "JUMP!" + an up arrow over the pad while the buggy closes in and
     rolls on it; the top plate glows on while the buggy is on it */
  var tti=(g.pad0-(hsc+PX+PW/2))/f;
  if(tti<.7&&tti>-GZ.pad/f){var pw0=mo?.8+.2*Math.sin(performance.now()/90):1;
    txt("JUMP!",cx,Math.round(top-58),Math.round(18*HS*pw0+4),"#fde047","center",true,true,true,OR,"sgj",1);
    txt("▲",cx,Math.round(top-40),14,CY,"center",true,true,true,"","sga",1)}
  if(sq){ctx.fillStyle="#fde047";ctx.globalAlpha=.8;ctx.fillRect(Math.round(p0+4),Math.round(top-6),GZ.pad-8,2);ctx.globalAlpha=1}
}
/* 06k gpDraw on a lava level (06d LV_PAL lava): slag at the bottom of a hole, LP.d px under its lower lip, a bright surface with
   slow bubbles and a heat haze rising out of the hole (drawn inside the hole only: the hitbox is the whole hole as before) */
var LP={d:26,h:40};
function sgLavaPit(g,a,b,mo){
  var ys=Math.round(Math.max(GY-g.h0,GY-g.h1)+LP.d),w=Math.round(b-a)-6,x=Math.round(a)+3,k,u,t=mo?tt:0;if(w<4)return;
  ctx.fillStyle="#7c2d12";ctx.fillRect(x,ys,w,LP.h);
  ctx.fillStyle="#ea580c";ctx.fillRect(x,ys,w,6);
  ctx.fillStyle="#fde047";ctx.globalAlpha=mo?.6+.3*Math.sin(t*3+g.x0*.01):.8;ctx.fillRect(x,ys,w,2);ctx.globalAlpha=1;
  ctx.fillStyle="#fdba74";
  if(mo)for(k=0;k<4;k++){u=(t*.7+k*.29+g.x0*.001)%1;ctx.globalAlpha=1-u;ctx.fillRect(Math.round(x+w*((k*.31+g.x0*.0007)%1)),Math.round(ys-u*12),3,3)}
  ctx.globalAlpha=.12;ctx.fillRect(x,ys-26,w,26);ctx.globalAlpha=1;
}
/* 14 draw(), after gpDraw: crust bridges (intact part, crumbled part behind the buggy) and the debris of collapsed "fall" crusts */
function sgDraw(){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,a,b,c,x,k,n,f=Math.max(1,speed*vMul()),mo=!rm(),t=mo?tt:0,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,
    hot=P?P.pe:OR,cf=hsc+PX-10;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||(g.k==="geyser"&&g.pad0!=null?g.pad0-hsc:a)>XO+VW+20)continue;
    if(g.k==="pool"){sgPoolDraw(g,a,b,t,mo);continue}
    if(g.k==="geyser"){sgGeyDraw(g,a,t,mo,f);continue}
    if(g.k!=="crust"&&g.k!=="fall")continue;
    if(g.on!==false){if(mo&&g.dropT!=null)sgDebris(g.x0,g.x1,runS-g.dropT,1e9,"#3a1d0c");continue}   /* collapsed: 06k draws the hole */
    c=Math.max(a,Math.min(b,cf-hsc));
    if(c>a){sgPit(g,a,c);if(mo)sgDebris(g.x0,hsc+c,0,f,"#3a1d0c")}   /* crumbled behind the rear wheel */
    if(c>=b)continue;
    /* the crust slab along the curve, th px thick, with cracks; a "fall" crust glows through its cracks */
    sgPit(g,c,b);
    n=Math.max(2,Math.ceil((b-c)/12));
    ctx.fillStyle="#6b3410";ctx.beginPath();ctx.moveTo(c,GY-gpCurve(hsc+c)-2);
    for(k=1;k<=n;k++){x=c+(b-c)*k/n;ctx.lineTo(x,GY-gpCurve(hsc+x)-2)}
    for(k=n;k>=0;k--){x=c+(b-c)*k/n;ctx.lineTo(x,GY-gpCurve(hsc+x)+CB.th)}
    ctx.closePath();ctx.fill();
    ctx.strokeStyle="#c2621c";ctx.lineWidth=2;ctx.beginPath();for(k=0;k<=n;k++){x=c+(b-c)*k/n;k?ctx.lineTo(x,GY-gpCurve(hsc+x)-1):ctx.moveTo(x,GY-gpCurve(hsc+x)-1)}ctx.stroke();   /* lit top edge */
    var fl=g.k==="fall",ur=fl?Math.max(0,Math.min(1,1-((g.x0-(hsc+PX+PW))/f-CB.drop)/1.2)):0,pu=fl?.6+.4*Math.sin(t*(9+12*ur)):.35;
    if(fl&&mo&&ur>0){ctx.save();ctx.translate(Math.round(Math.sin(t*60)*2*ur),0)}   /* shakes harder as the collapse nears */
    ctx.fillStyle=fl?"#fdba74":hot;ctx.globalAlpha=pu;
    for(x=Math.ceil((hsc+c)/CB.cr)*CB.cr;x<g.x1;x+=CB.cr){var sx=x-hsc,sy=GY-gpCurve(x);ctx.fillRect(Math.round(sx),Math.round(sy-1),2,CB.th);if(fl)ctx.fillRect(Math.round(sx-4),Math.round(sy+3),9,2)}
    ctx.globalAlpha=1;
    if(fl){ctx.fillStyle="#fde047";ctx.globalAlpha=.25+.2*Math.sin(t*9);ctx.fillRect(Math.round(c),Math.round(GY-g.h0+CB.th),Math.round(b-c),3);ctx.globalAlpha=1;if(mo&&ur>0)ctx.restore()}
  }
}
`;
