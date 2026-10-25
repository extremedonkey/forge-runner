// SLAG (owner: Levels): L8 SLAG PITS II hazards built on 06k gap KINDS, reusable by any level row with kinds (06d GAP_LV).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Never writes speed / score / scroll / runS; no Math.random (06k's gap LCG picks kinds). Fair by construction: 06k places every
// kinded gap only after gpWin cleared it with the hole present, so whatever state it is in when the buggy arrives is clearable.
//  - CRUMBLING BRIDGES: "crust" = a slag-crust bridge over a placed gap (on false: drivable). The crust behind the buggy's rear
//    wheel crumbles into the pit (cosmetic: never ahead of PX-10). "fall" = a cracked, glowing crust that collapses (on -> true, an
//    ordinary gap from then on) when the buggy is CB.drop s away, never closer than CB.min s (else it stays a plain crust).
//  - SLAG TIDE: "pool" = a slag pool flooding a valley: 06k gpSpawn asks sgPool for the next valley bottom ahead (TD.search px),
//    a flat surface Ls whose submerged span is the rolled width (lips level: h0 = h1 = Ls), lip rules and gpWin with the hole present.
//    Each pool runs its own tide cycle (phase from its key): bubbles (TD.warn) -> rise -> hold -> drain -> dry. Lethal (on) while
//    any slag is in it. Once the buggy's front is TD.freeze s from the lip its state freezes until the buggy is past: wet stays
//    wet (and fills up), dry stays dry, so what the player sees on approach is what they get. No pools with ?hills=0 (no valleys).
// Hooks (one typeof-guarded line each): 06k gpSpawn -> sgPool(...) and sgKind(g,kinds,r); 13 update() -> sgTick() (after
// skClear); 14 draw() -> sgDraw() (right after gpDraw). Flags: ?bridges=0 (no crust / fall), ?tide=0 (no pools), both builds.
export default String.raw`
/* crumbling bridges: drop = s (felt) before the buggy's front reaches the lip when a "fall" crust collapses, min = latest allowed;
   th = crust thickness, cr = crack spacing (px), fall = debris gravity, life = s a chunk is drawn after it breaks off */
var CB={drop:1.3,min:.9,th:12,cr:22,fall:1400,life:.8},SG_BR=true,SG_TD=true;
try{if(Q&&Q.get&&Q.get("bridges")==="0")SG_BR=false;if(Q&&Q.get&&Q.get("tide")==="0")SG_TD=false}catch(e){}
/* slag tide: cycle phases (s): warn (bubbles, dry), rise, hold, drain, dry; search = px ahead for a valley; minD / maxD = pool depth
   (px of slag over the valley floor); pMax = widest pool (x Dfull; valleys are broad, gpWin still has to clear it); freeze = s (felt) before the lip when a pool's state locks; st = valley scan step px */
var TD={warn:1,rise:.5,hold:2.4,drain:.6,dry:2.2,search:2200,minD:12,maxD:90,pMax:.9,freeze:1.4,st:8};
var TD_P=TD.warn+TD.rise+TD.hold+TD.drain+TD.dry;
/* a pool's tide 0..1 at run time s (its own phase from its key) and whether bubbles show */
function sgPh(g,s){var o=g.ph!=null?g.ph:0;return ((s+o)%TD_P+TD_P)%TD_P}
function sgLvl(g,s){
  var u=sgPh(g,s),a=TD.warn,b=a+TD.rise,c=b+TD.hold,d=c+TD.drain;
  return u<a?0:u<b?(u-a)/TD.rise:u<c?1:u<d?1-(u-c)/TD.drain:0;
}
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
  gpN++;g.win=wn[0];g.tap=wn[1];g.mid=wn[2];g.ph=(gpN*2.618)%TD_P;g.on=sgLvl(g,runS)>0;
  return g;
}
/* 06k gpSpawn: give a just-placed gap g a kind from the row's kinds {crust, fall} (cumulative chances, r = 06k's own roll) */
function sgKind(g,K,r){
  var c=0;
  if(SG_BR){c+=K.crust||0;if(r<c){g.k="crust";g.on=false;return}
    c+=K.fall||0;if(r<c){g.k="fall";g.on=false;return}}
}
/* 13 update() (dt): collapse "fall" crusts on time (a late one, inside CB.min, stays a plain crust); run each pool's tide, locked
   (g.fz: 1 wet / 0 dry) from TD.freeze s before its lip until the buggy's rear wheel is past it */
function sgTick(dt){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,f=Math.max(1,speed*vMul()),fr=hsc+PX+PW,tti,l;dt=dt||0;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    if(g.k==="pool"){
      tti=(g.x0-fr)/f;l=sgLvl(g,runS);
      if(g.fz==null&&tti<=TD.freeze&&hsc+PX<g.x1)g.fz=l>0?1:0;
      else if(g.fz!=null&&hsc+PX>=g.x1)g.fz=null;
      /* drawn level vl: the tide, except a pool locked wet keeps filling to the brim (never drains in front of the buggy) and one
         locked dry stays empty */
      g.vl=g.fz===1?Math.min(1,Math.max(l,(g.vl||0)+dt/TD.rise)):g.fz===0?0:l;
      g.on=g.fz!=null?g.fz===1:l>0;
      continue;
    }
    if(g.k!=="fall"||g.on!==false)continue;
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
/* a slag pool: wet (on) = full to its flat surface Ls (06i hlW draws the ground mass up to that line across a hole, so the slag
   is painted over exactly the hitbox: between the surface and the valley curve), faded in by the drawn level vl; dry = the bare
   valley with a cooled skin on the floor, and bubbles while the next rise is coming (not when locked dry) */
function sgPoolDraw(g,a,b,t,mo){
  var n=Math.max(2,Math.ceil((b-a)/10)),k,x,ys=GY-g.h0,al=g.on?Math.max(.15,g.vl||0):0,u,bx,by;
  if(al>0){
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
  /* dry: a cooled skin on the floor; bubbles in the warn phase of the next rise */
  ctx.fillStyle="#3a1d0c";
  for(k=0;k<n;k++){x=a+(b-a)*k/n;ctx.fillRect(Math.round(x),Math.round(GY-gpCurve(hsc+x)-2),Math.ceil((b-a)/n)+1,3)}
  if(g.fz!==0&&sgPh(g,runS)<TD.warn){ctx.fillStyle="#f97316";
    for(k=0;k<6;k++){u=((mo?t:0)*1.6+k*.29)%1;bx=a+(b-a)*(.15+.7*((k*.37+g.ph*.13)%1));by=GY-gpCurve(hsc+bx);ctx.globalAlpha=1-u;ctx.fillRect(Math.round(bx),Math.round(by-3-u*10),3,3)}
    ctx.globalAlpha=1}
}
/* 14 draw(), after gpDraw: crust bridges (intact part, crumbled part behind the buggy) and the debris of collapsed "fall" crusts */
function sgDraw(){
  if(typeof gpGaps==="undefined"||!gpGaps.length)return;
  var i,g,a,b,c,x,k,n,f=Math.max(1,speed*vMul()),mo=!rm(),t=mo?tt:0,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,
    hot=P?P.pe:OR,cf=hsc+PX-10;
  for(i=0;i<gpGaps.length;i++){g=gpGaps[i];
    a=g.x0-hsc;b=g.x1-hsc;if(b<XO-20||a>XO+VW+20)continue;
    if(g.k==="pool"){sgPoolDraw(g,a,b,t,mo);continue}
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
    var fl=g.k==="fall",pu=fl?.6+.4*Math.sin(t*9):.35;
    ctx.fillStyle=fl?"#fdba74":hot;ctx.globalAlpha=pu;
    for(x=Math.ceil((hsc+c)/CB.cr)*CB.cr;x<g.x1;x+=CB.cr){var sx=x-hsc,sy=GY-gpCurve(x);ctx.fillRect(Math.round(sx),Math.round(sy-1),2,CB.th);if(fl)ctx.fillRect(Math.round(sx-4),Math.round(sy+3),9,2)}
    ctx.globalAlpha=1;
    if(fl){ctx.fillStyle="#fde047";ctx.globalAlpha=.25+.2*Math.sin(t*9);ctx.fillRect(Math.round(c),Math.round(GY-g.h0+CB.th),Math.round(b-c),3);ctx.globalAlpha=1}
  }
}
`;
