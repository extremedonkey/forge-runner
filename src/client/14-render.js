// RENDER (owner: Mobile): text cache txt(), sky cache SKC, drawSky(), draw() incl. HUD, ghost marker, power-up visuals.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* rendering */
function setFont(px,mono,bold){ctx.font=(bold?"bold ":"")+px+"px "+(mono?MONO:SANS)}
function fitPx(str,px,maxW,mono,bold){
  var k=str+"|"+px+"|"+maxW+(mono?1:0)+(bold?1:0);
  if(FPC[k])return FPC[k];
  setFont(px,mono,bold);
  var w=ctx.measureText(str).width;
  return FPC[k]=w>maxW?Math.floor(px*maxW/w):px;
}
/* perf: each on-screen string lives in its own small canvas (slot id) and is only re-rendered when it changes;
   the glow (shadowBlur) is baked in there instead of being blurred on the full canvas every frame */
var TXC={},FPC={};
function txt(str,x,y,px,color,align,mono,bold,stroke,glow,id){
  id=id||str;
  var e=TXC[id],key=str+"|"+px+"|"+color+"|"+(mono?1:0)+(bold?1:0)+(stroke?1:0)+"|"+(glow||"");
  if(!e)e=TXC[id]={c:document.createElement("canvas"),k:""};
  if(e.k!==key){
    e.k=key;
    var o=e.c.getContext("2d"),f=(bold?"bold ":"")+(px*K)+"px "+(mono?MONO:SANS);
    o.font=f;
    var w=o.measureText(str).width,pd=Math.ceil(((stroke?3:0)+(glow?14:0))*K)+2,asc=Math.ceil(px*K*1.05),dsc=Math.ceil(px*K*.35);
    var cw2=Math.ceil(w)+2*pd,ch2=asc+dsc+2*pd;
    if(e.c.width!==cw2||e.c.height!==ch2){e.c.width=cw2;e.c.height=ch2}
    else{o.clearRect(0,0,cw2,ch2);o.shadowBlur=0;o.shadowColor="rgba(0,0,0,0)"}
    o.font=f;o.textAlign="left";o.textBaseline="alphabetic";
    if(glow){o.shadowColor=glow;o.shadowBlur=(glow===VI?16:10)*K}
    if(color==="TITLE"){var tg=o.createLinearGradient(0,pd+asc-40*K,0,pd+asc);tg.addColorStop(0,"#67e8f9");tg.addColorStop(1,CY);color=tg}
    if(stroke){o.lineJoin="round";o.lineWidth=4*K;o.strokeStyle="rgba(5,7,13,.75)";o.strokeText(str,pd,pd+asc)}
    o.fillStyle=color;o.fillText(str,pd,pd+asc);
    e.w=w;e.ax=pd;e.ay=pd+asc;
  }
  var X=x*K+Math.round((SX-XO)*K),Y=Math.round(y*K)+Math.round((SY+OY)*K);
  if(align==="right")X-=e.w;else if(align!=="left")X-=e.w/2;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(e.c,Math.round(X)-e.ax,Y-e.ay);
  base();
  return e.w/K;
}
function pad(n){return String(Math.min(99999,Math.floor(n))).padStart(5,"0")}
function lp(a,b,t){return Math.round(a+(b-a)*t)}
function mix(a,b,t){return "rgb("+lp(a[0],b[0],t)+","+lp(a[1],b[1],t)+","+lp(a[2],b[2],t)+")"}
/* perf: the sky gradient is filled into SKC only when its colour step changes (<=61 times a run) and blitted 1:1 each frame */
var skyG=null,skyK=-1,C_M="",C_C="",C_G="",SKC=null;
function drawSky(){
  var k=Math.round(dn*60),i,base0,t;
  if(k!==skyK){
    skyK=k;t=k/60;
    skyG=ctx.createLinearGradient(0,-OY,0,GY);
    skyG.addColorStop(0,mix([30,48,98],[4,6,14],t));
    skyG.addColorStop(.65,mix([86,58,120],[10,13,30],t));
    skyG.addColorStop(1,mix([170,92,120],[22,24,52],t));
    C_M=mix([74,52,112],[20,22,46],t);C_C=mix([40,30,72],[11,14,30],t);C_G=mix([14,12,30],[5,7,13],t);
    if(!SKC)SKC=document.createElement("canvas");
    var kw=Math.ceil((VW+40)*K),kh=Math.ceil((GY+22+OY)*K);
    if(SKC.width!==kw||SKC.height!==kh){SKC.width=kw;SKC.height=kh}
    var o=SKC.getContext("2d",{alpha:false});
    o.setTransform(K,0,0,K,-(XO-20)*K,(OY+20)*K);o.fillStyle=skyG;o.fillRect(XO-20,-20-OY,VW+40,GY+22+OY);
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(SKC,Math.round((XO-20)*K)+Math.round((SX-XO)*K),Math.round((-20-OY)*K)+Math.round((SY+OY)*K));
  base();
  /* stars fade in as night falls */
  ctx.fillStyle="#cbd5e1";
  var so=(scroll*.03)%960;
  for(i=0;i<stars.length;i++){
    var st=stars[i],a=dn*(.25+.5*st.b)+.05;
    if(st.y>GY-60)continue;
    ctx.globalAlpha=a;
    /* portrait: the star field repeats upward every 150 units to fill the extra sky */
    for(var sy0=st.y;sy0>-OY-150;sy0-=150)if(sy0>-OY)
    for(base0=-so;base0<W;base0+=960){var sx=base0+st.x;if(sx>=0&&sx<W)ctx.fillRect(Math.round(sx),Math.round(sy0),st.b>.8?2:1.5,st.b>.8?2:1.5)}
  }
  ctx.globalAlpha=1;
  /* setting sun, rising moon */
  if(dn<.75){
    var sy=GY-110+dn*170,sr=30;
    ctx.globalAlpha=1-dn/.75;
    ctx.fillStyle=OR;ctx.beginPath();ctx.arc(W*.7,sy,sr,0,6.283);ctx.fill();
    ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(W*.7,sy,sr*.7,0,6.283);ctx.fill();
    ctx.fillStyle=skyG;
    for(i=0;i<4;i++)ctx.fillRect(W*.7-sr,sy+4+i*7,sr*2,1.5+i*.6);
    ctx.globalAlpha=1;
  }
  if(dn>.3){
    var my=GY-30-(dn-.3)*170;
    ctx.globalAlpha=Math.min(1,(dn-.3)/.3);
    ctx.fillStyle="#e2e8f0";ctx.beginPath();ctx.arc(W*.22,my,13,0,6.283);ctx.fill();
    ctx.fillStyle=skyG;ctx.beginPath();ctx.arc(W*.22+6,my-4,11,0,6.283);ctx.fill();
    ctx.globalAlpha=1;
  }
  /* far mountains */
  ctx.fillStyle=C_M;
  var mo=(scroll*.08)%600;
  ctx.beginPath();ctx.moveTo(-1,GY);
  for(base0=-mo;base0<W+50;base0+=600)for(i=0;i<=12;i++)ctx.lineTo(base0+i*50,GY-MT[i]);
  ctx.lineTo(W+60,GY);ctx.closePath();ctx.fill();
  /* mid city with lit windows */
  var co=(scroll*.22)%720;
  for(base0=-co;base0<W;base0+=720){
    for(i=0;i<CITY.length;i++){
      var c=CITY[i],bx=base0+c.x;
      if(bx>W||bx+c.w<0)continue;
      ctx.fillStyle=C_C;ctx.fillRect(Math.round(bx),GY-c.h,c.w,c.h);
      ctx.globalAlpha=.25+.6*dn;
      for(var q=0;q<c.wins.length;q++){ctx.fillStyle=c.wins[q][2];ctx.fillRect(Math.round(bx+c.wins[q][0]),GY-c.h+c.wins[q][1],2,2)}
      ctx.globalAlpha=1;
    }
  }
}
function drawWorld(){
  var i,k,base0;
  drawSky();
  ctx.fillStyle=C_G;ctx.fillRect(-20,GY,W+40,H-GY+20+OB);
  for(i=0;i<3;i++){
    var ly=GY+18+i*17,off=(scroll*LANE_F[i])%T;
    ctx.globalAlpha=LANE_A[i];
    for(base0=-off;base0<W;base0+=T){
      for(k=0;k<lanes[i].length;k++){
        var s=lanes[i][k],x=Math.round(base0+s.x);
        if(x>W||x+s.len<-8)continue;
        ctx.fillStyle=s.c;
        ctx.fillRect(x,ly,s.len,2);
        ctx.fillRect(x,s.dy>0?ly:ly+s.dy,2,Math.abs(s.dy)+2);
        ctx.fillRect(x+s.len-2,ly-2,6,6);
      }
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="rgba(34,211,238,.16)";ctx.fillRect(-20,GY-3,W+40,8);
  ctx.fillStyle=CY;ctx.fillRect(-20,GY,W+40,2);
  ctx.fillStyle="rgba(34,211,238,.5)";
  var go=scroll%48;
  for(var x=-go;x<W;x+=48){
    ctx.fillRect(Math.round(x),GY+5,12,2);
    ctx.fillRect(Math.round(x+26),GY+5,4,2);
  }
}
/* player: rolling forge-bot. VISUAL ONLY: the hitbox stays pW() x pH(); physics, speed and score are untouched.
   Phone-cheap: plain rects + arcs, a fixed typed-array ember pool, no per-frame allocations.
   Wheel/tread rotation follows distance run (runT), scaled down so it never strobes backwards at 60 fps. */
var RB_STL={c:CY,l:"#cbd5e1",g:"#64748b",d:"#475569",k:"#334155",t:"#1e293b",w:"#94a3b8"};
var RB_HOT={c:"#fde047",l:"#fdba74",g:OR,d:"#9a3412",k:"#7c2d12",t:"#431407",w:"#fed7aa"};
var RB_EC=["#fde047",OR,"#fb923c","#fef3c7"];
var RB_N=32,rbEX=new Float32Array(RB_N),rbEY=new Float32Array(RB_N),rbVX=new Float32Array(RB_N),rbVY=new Float32Array(RB_N);
var rbEA=new Float32Array(RB_N),rbEL=new Float32Array(RB_N),rbEC=new Uint8Array(RB_N),rbEI=0,rbEK=0,rbET=0;
var rbM=1,rbP=RB_STL,rbD=0,rbDk=0,rbDT=0,rbA=0,rbAir=false,rbSL=0,rbSC="",rbHot=OR,rbEye=CY,rbGX=0,rbGY=0,rbTX=0,rbTY=0,rbLd=0,rbWA=false;
function rbF(c,x,y,w,h){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function rbO(c,x,y,r){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill()}
/* shared setup: timers, palette, duck easing, landing squash + air tilt; leaves ctx in the bot's local frame
   (origin = ground contact under the hitbox centre, 1 unit = 1 game px, +x = forward) */
function rbPre(){
  var now=performance.now()/1000,d=now-rbET;rbET=now;if(!(d>0)||d>.1)d=0;rbDT=d;
  var air=py>0,dk=duck&&!air,mo=!rm();
  rbAir=air;rbM=big()?4/3:1;rbP=big()&&!(bgT<1.5&&((bgT*8)|0)&1)?RB_HOT:RB_STL;
  rbD=runT*34;
  rbDk=mo?rbDk+((dk?1:0)-rbDk)*Math.min(1,d*30):(dk?1:0);
  if(dk&&rbDk>.97)rbDk=1;else if(!dk&&rbDk<.03)rbDk=0;
  rbSL=spT>0?4:0;rbSC=spT>0&&!(spT<1.5&&((spT*8)|0)&1)?"#fde047":"";
  rbHot=mo&&((tt*11)|0)%3===0?"#fde047":OR;
  rbEye=mo&&(tt%3.2)>3.05?"#0b1020":CY;
  rbGX=PX+22.5*rbM;rbGY=GY-py;
  if(speed>560&&state==="run"&&mo){
    var y=rbGY-30*rbM,x=PX;
    ctx.globalAlpha=(speed-560)/400;
    ctx.fillStyle=CY;ctx.fillRect(x-22,y+5,16,1.5);ctx.fillRect(x-30,y+13,22,1.5);ctx.fillRect(x-18,y+19,12,1.5);
    ctx.globalAlpha=1;
  }
  if(inv>0&&((inv*14)|0)&1)ctx.globalAlpha=.35;
  /* landing: squash, then a damped spring-back (own .22 s timer; the game's land flag only starts it) */
  if(!air&&rbWA&&mo)rbLd=.22;rbWA=air;
  if(rbLd>0)rbLd=Math.max(0,rbLd-d);
  var lt=1-rbLd/.22,k=rbLd>0?(1-lt)*Math.cos(lt*8.5):0;rbSq=k;
  rbA=air&&mo?Math.max(-.2,Math.min(.24,-vy/JV*.22)):0;
  base();ctx.translate(rbGX,rbGY);ctx.scale(rbM*(1+.1*k),rbM*(1-.2*k));
  if(rbA){ctx.translate(0,-15);ctx.rotate(rbA);ctx.translate(0,15)}
}
/* wheel: tyre with n lugs, rim, 3 spokes, cyan rim marker, orange hub; ang in radians */
function rbWheel(cx,cy,r,ang,n){
  var P=rbP,i,a,c,s,ri=r*.6;
  rbO(P.t,cx,cy,r);
  ctx.fillStyle=P.d;
  for(i=0;i<n;i++){a=ang+i*6.283/n;ctx.fillRect(cx+Math.cos(a)*(r-1.2)-1,cy+Math.sin(a)*(r-1.2)-1,2,2)}
  rbO(rbSC||P.w,cx,cy,ri);rbO(P.k,cx,cy,ri-1.1);
  ctx.strokeStyle=P.l;ctx.lineWidth=1.3;ctx.beginPath();
  for(i=0;i<3;i++){a=ang+i*2.094;c=Math.cos(a);s=Math.sin(a);ctx.moveTo(cx,cy);ctx.lineTo(cx+c*(ri-.8),cy+s*(ri-.8))}
  ctx.stroke();
  rbF(CY,cx+Math.cos(ang+1.047)*(ri-.6)-.9,cy+Math.sin(ang+1.047)*(ri-.6)-.9,1.8,1.8);
  rbO(OR,cx,cy,Math.max(1.2,r*.17));
}
/* zig-zag suspension coil from y0 (top) to y1 (bottom) centred on x */
function rbCoil(x,y0,y1,w,c){
  ctx.fillStyle=c;
  for(var y=y0,i=0;y<y1-.5;y+=1.6,i++)ctx.fillRect(x-w/2+(i&1?.7:-.7),y,w,1);
}
/* soft furnace glow: two translucent discs (no shadowBlur) */
function rbGlow(x,y,r){
  var ga=ctx.globalAlpha;
  ctx.globalAlpha=ga*.13;rbO(OR,x,y,r*1.7);
  ctx.globalAlpha=ga*.22;rbO(rbHot,x,y,r);
  ctx.globalAlpha=ga;
}
/* perf: the wheels and the anvil body are pre-rendered once per look (palette, rim/furnace/eye colour, big scale)
   to offscreen canvases at device scale (K*rbM backing px per unit), then blitted with drawImage. Wheels get
   RB_WF rotation frames in one strip. Caches drop themselves when K changes (resize, rotate, zoom).
   Visual: identical at rest; wheel angle snaps to 360/RB_WF degrees. */
var RB_WF=32,rbCache={},rbCK=0,rbSq=0;
function rbCan(w,h){var c=document.createElement("canvas");c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
function rbIn(c,S,ox,oy,fn){var o=ctx;ctx=c.getContext("2d");ctx.setTransform(S,0,0,S,ox,oy);try{fn()}finally{ctx=o}}
function rbChk(){if(rbCK!==K){rbCache={};rbCK=K}}
/* wheel strip: RB_WF frames, each 16x16 units (r=7 + 1 unit margin), centre at (8,8) */
function rbWheelImg(){
  var S=K*rbM,P=rbP,rim=rbSC||P.w,key="w"+rbM+P.t+rim,im=rbCache[key];
  if(im)return im;
  var fw=Math.ceil(16*S);im=rbCan(fw*RB_WF,fw);
  for(var i=0;i<RB_WF;i++)(function(i){rbIn(im,S,i*fw+fw/2,fw/2,function(){rbWheel(0,0,7,i*6.283/RB_WF,4)})})(i);
  im.fw=fw;rbCache[key]=im;return im;
}
function rbBlitWheel(im,cx,cy,ang){
  var a=ang%6.283;if(a<0)a+=6.283;var i=Math.round(a/6.283*RB_WF)%RB_WF,fw=im.fw,u=fw/(K*rbM);
  ctx.drawImage(im,i*fw,0,fw,fw,cx-u/2,cy-u/2,u,u);
}
/* anvil body incl. furnace glow; local box x -23..25, y -18..+2 (relative to yb) */
function rbBody(P){
  rbF(P.k,-18,-4,5,2);rbF(P.d,-21,-13,3,11);rbF(P.k,-22,-14.5,5,1.5);
  rbF(P.d,-13,-3,26,3);rbF(P.g,-10,-5,20,2);
  rbF(P.g,-7,-9.5,14,4.5);rbF(P.t,-4.5,-9,9,4);rbF(rbHot,-3.5,-8,7,2.5);rbF("#fef3c7",-2,-7.5,3,1);
  rbGlow(0,-6.8,4.5);
  rbF(P.g,-12,-11.5,25,2);rbF(P.g,-16,-13.5,34,2);
  rbF(P.l,-19,-15.5,37,2);rbF(P.g,18,-15.5,4,2);rbF(P.g,21,-15,2,1);
  rbF(P.c,-19,-17,36,1.5);
  rbF("#0b1020",9,-13.5,7,2.5);rbF(rbEye,13,-13.2,2,1.8);
}
function rbBodyImg(){
  var S=K*rbM,P=rbP,key="b"+rbM+P.t+rbHot+rbEye,im=rbCache[key];
  if(im)return im;
  im=rbCan(48*S,20*S);rbIn(im,S,23*S,18*S,function(){ctx.globalAlpha=1;rbBody(P)});
  rbCache[key]=im;return im;
}
/* back to world space: embers from the local emitter (lx,ly) + shield */
function rbPost(lx,ly){
  ctx.globalAlpha=1;base();
  var d=rbDT,i,t,z,ex=rbGX+lx*rbM,ey=rbGY+ly*rbM;
  if(state==="run"&&!rm()){
    rbEK+=d*(14+speed*.02)*(1-.6*rbDk)*rbM;
    while(rbEK>=1){
      rbEK-=1;i=rbEI;rbEI=(rbEI+1)%RB_N;
      rbEX[i]=ex+rnd(-1.5,1.5);rbEY[i]=ey;rbVX[i]=-speed*rnd(.2,.42);rbVY[i]=-rnd(25,85);
      rbEA[i]=0;rbEL[i]=rnd(.22,.5);rbEC[i]=(Math.random()*4)|0;
    }
  }else rbEK=0;
  for(i=0;i<RB_N;i++){
    if(rbEA[i]>=rbEL[i])continue;
    rbEA[i]+=d;rbVX[i]*=1-1.6*d;rbVY[i]+=70*d;rbEX[i]+=rbVX[i]*d;rbEY[i]+=rbVY[i]*d;
    t=rbEA[i]/rbEL[i];if(t>=1)continue;
    z=t<.45?2:1.5;ctx.globalAlpha=1-t;ctx.fillStyle=RB_EC[rbEC[i]];ctx.fillRect(rbEX[i],rbEY[i],z,z);
  }
  ctx.globalAlpha=1;
  /* shield: pulsing cyan outline around the bot (same box as before) */
  if(shd&&state!=="over"){
    var M=rbM,pw=45*M,ph=(duck&&py<=0?18:30)*M,x=PX,y=rbGY-ph-rbSL,pa=rm()?.8:.6+.3*Math.sin(tt*9);
    ctx.globalAlpha=.14;ctx.fillStyle=CY;ctx.fillRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=pa;ctx.strokeStyle=CY;ctx.lineWidth=2;ctx.strokeRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=1;ctx.fillStyle="#e0f2fe";
    ctx.fillRect(x-6,y-6,3,3);ctx.fillRect(x+pw+3,y-6,3,3);ctx.fillRect(x-6,y+ph+1,3,3);ctx.fillRect(x+pw+3,y+ph+1,3,3);
  }
}
/* Variant B: "Anvil Buggy". Two sprung wheels under the classic anvil body (the favicon silhouette),
   glowing furnace window in the anvil waist, exhaust stack at the back; duck squats the anvil onto the wheels. */
function drawPlayer(){
  rbPre();
  var P=rbP,e=rbDk,D=rbD,mo=!rm(),gr=state==="run"&&!rbAir&&mo;
  var ang=D*.042,wr=gr?Math.max(0,Math.sin(D*.13))*.9:0,wf=gr?Math.max(0,Math.sin(D*.13+2.1))*.9:0;
  var bob=gr?(wr+wf)*.5+Math.sin(D*.07)*.4:0,hs=1-.3*e,yb=-13-bob*(1-e)-rbSL*(1-e)+7*e;
  /* chassis beam, wheels, struts */
  rbF(P.k,-13,-8-(wr+wf)*.5,26,2);
  /* blits are 1:1 device px while running upright, so the game's nearest-neighbour setting is exact; smoothing is
     switched on only while the bot is tilted, squashed or ducking (toggling it costs ~10 us/frame in Chrome) */
  rbChk();var sm=rbA!==0||rbSq!==0||e>0;if(sm)ctx.imageSmoothingEnabled=true;
  var wi=rbWheelImg();rbBlitWheel(wi,-13,-7-wr,ang);rbBlitWheel(wi,13,-7-wf,ang+1.3);
  if(yb<-8){
    rbF(P.d,-14,yb,2,-7-wr-yb);rbF(P.d,12,yb,2,-7-wf-yb);
    rbCoil(-13,yb+.5,-8-wr,4.5,rbSC||P.w);rbCoil(13,yb+.5,-8-wf,4.5,rbSC||P.w);
  }
  /* anvil body: drawn bottom-up from yb, squashed by hs when ducking */
  ctx.save();ctx.translate(0,yb);ctx.scale(1,hs);
  ctx.drawImage(rbBodyImg(),-23,-18,48,20);
  ctx.restore();if(sm)ctx.imageSmoothingEnabled=false;
  rbPost(-19.5,yb-15*hs);
}
/* sparks HUD (SPEC §5, sparks PR4). Everything is typeof-guarded and inert until the sparks core (PR1) fills SKU, so the
   page draws exactly as before while the feature is off or not built yet. */
function skHud(){return typeof SKON!=="undefined"&&!!SKON&&typeof sk==="object"&&!!sk&&typeof SKU==="object"&&!!SKU&&Object.keys(SKU).length>0}
function skN(v){v=Math.floor(+v||0);return v<0?0:v>9999999?9999999:v}
var skHB=-1,skPop=0;
/* bank shown on screen: after a buy it counts down from skCDf to sk.b over 400 ms (instant under reduced motion) */
function skBk(){var b=skN(sk.b);if(skCDt){var q=(performance.now()-skCDt)/400;if(q>=1||q<0||rm())skCDt=0;else b=Math.round(skCDf+(b-skCDf)*q)}return b}
function skCDq(){return skCDt?Math.max(0,1-(performance.now()-skCDt)/400):0}
/* effective power-up durations for the HUD timer bars: the run's spMax/bgMax once Power Cell exists, else the constants */
function skBarMax(k){
  if(k==="g")return typeof bgMax!=="undefined"&&bgMax>0?bgMax:BGT;
  return typeof spMax!=="undefined"&&spMax>0?spMax:SPT;
}
function drawEnts(){
  var f=((tt*10)|0)&1,fl=((tt*9)|0)&1,bl=((tt*4)|0)&1;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],x=e.x,y=GY-e.bot-e.h;
    if(typeof enDraw==="function"&&enDraw(e))continue;  /* ENEMIES v2 (06g) */
    if(e.t==="b"){
      var pal=PAL_B[e.v];
      spr(BUG,x,y,3,pal);
      spr(LEGS[(f+i)&1],x,y+18,3,pal);
    }else if(e.t==="f"){
      spr(fl?FUP:FDN,x,y,3,PAL_F);
    }else if(e.t==="d"){
      if(e.bot>20){ctx.globalAlpha=.35;ctx.fillStyle="#ef4444";ctx.fillRect(x+13,y+e.h,4,e.bot-16);ctx.globalAlpha=1}
      ctx.fillStyle="rgba(239,68,68,.18)";ctx.fillRect(x-3,y-3,36,21);
      spr(f?DR1:DR2,x,y,3,PAL_D[bl]);
    }else if(e.t==="u"){
      var P=PU[e.k],yb=y+Math.round(Math.sin(tt*5+x*.02)*2);
      ctx.globalAlpha=.25+.15*Math.sin(tt*8);ctx.fillStyle=P.c;ctx.fillRect(x-4,yb-4,e.w+8,e.h+8);
      ctx.globalAlpha=1;ctx.fillStyle="#0b1020";ctx.fillRect(x-2,yb-2,e.w+4,e.h+4);
      ctx.strokeStyle=P.c;ctx.lineWidth=1.5;ctx.strokeRect(x-2,yb-2,e.w+4,e.h+4);
      spr(P.i,x,yb,3,P.p);
    }else if(e.t==="r"){
      var cx=x+11,cy=y+11,a=-e.x/11;
      ctx.fillStyle="#1e293b";ctx.beginPath();ctx.arc(cx,cy,11,0,6.283);ctx.fill();
      ctx.strokeStyle=OR;ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="#94a3b8";ctx.lineWidth=2;ctx.beginPath();
      for(var q=0;q<3;q++){var an=a+q*2.094;ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(an)*9,cy+Math.sin(an)*9)}
      ctx.stroke();
      R(x+6,y-4,10,4,"#475569");R(x+9,y-7,4,3,f?OR:"#fde047");
    }else if(e.t==="k"){
      if(e.mg){
        /* magnet pull: a faint line to the buggy plus a short trail and a brighter glow on the spark */
        var kx=x+6,kyc=y+6,bx=PX+pW()/2,byc=GY-py-pH(duck&&py===0)/2,ddx=bx-kx,ddy=byc-kyc,dd=Math.sqrt(ddx*ddx+ddy*ddy)||1;
        ctx.strokeStyle="#fde047";ctx.lineWidth=1;ctx.globalAlpha=.3;
        ctx.beginPath();ctx.moveTo(kx,kyc);ctx.lineTo(bx,byc);ctx.stroke();
        ctx.strokeStyle=OR;ctx.lineWidth=3;ctx.globalAlpha=.55;
        ctx.beginPath();ctx.moveTo(kx,kyc);ctx.lineTo(kx-ddx/dd*18,kyc-ddy/dd*18);ctx.stroke();
        ctx.globalAlpha=.5;ctx.fillStyle="#fde047";ctx.fillRect(x-4,y-4,e.w+8,e.h+8);ctx.globalAlpha=1;
      }
      /* spark pickup: 5x5 diamond (10 units) centred in its 12x12 box, cyan/orange twinkle (static under reduced motion) */
      var tw=rm()?0:(((tt*6+x*.05)|0)&1),ky=y+1+(rm()?0:Math.round(Math.sin(tt*6+x*.03)));
      if(!rm()){ctx.globalAlpha=.18+.1*Math.sin(tt*9+x*.1);ctx.fillStyle=tw?OR:CY;ctx.fillRect(x-1,ky-1,e.w+2,e.h-2+2);ctx.globalAlpha=1}
      spr(IC_K,x+1,ky,2,PAL_K[tw]);
    }else{
      for(var b=0;b<2;b++){
        var by=y+b*25;
        R(x,by,26,24,"#1e1b4b");
        ctx.strokeStyle=VI;ctx.lineWidth=2;ctx.strokeRect(x+1,by+1,24,22);
        ctx.strokeStyle="rgba(168,85,247,.55)";ctx.beginPath();ctx.moveTo(x+3,by+3);ctx.lineTo(x+23,by+21);ctx.moveTo(x+23,by+3);ctx.lineTo(x+3,by+21);ctx.stroke();
      }
      R(x+10,y-5,6,5,bl?OR:"#7c2d12");
    }
  }
  typeof enDrawAfter==="function"&&enDrawAfter();  /* ENEMIES v2 (06g): particles, edge warnings, sounds */
}
function drawGhost(){
  if(!chal||state==="start")return;
  var x=Math.round(PX+PW/2+(chal-score)*20);
  if(x<-60||x>W+60)return;
  ctx.save();
  ctx.globalAlpha=beat?.3:.6;ctx.strokeStyle=OR;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,GY-56);ctx.lineTo(x+24,GY-48);ctx.lineTo(x,GY-40);ctx.stroke();
  ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x-12,GY-1);ctx.lineTo(x+12,GY-1);ctx.stroke();
  txt((cname||"friend")+" "+chal,x,GY-62,11,OR,"center",true,true,false,"","ghost");
  ctx.restore();
}
/* HUD score/HI baseline (game units); HUDY (08-audio.js placeMute) lines it up with the mute icon on Poki */
function hudB(){return 30+(OY?14-OY:0)+(HS-1)*20+HUDY}
function drawHud(){
  var col="#f1f5f9",glow="";
  if(flash>0){
    col=rm()||((flash*16)|0)%2?OR:"#ffffff";
    glow=rm()?"":OR;
  }
  var hb=hudB(),hy;
  var sw=txt(pad(score),XO+VW-14,hb,20*HS,col,"right",true,true,true,glow,"score");
  txt("HI "+pad(hi),XO+VW-14-sw-14,hb,14*HS,"#94a3b8","right",true,true,true,"","hi");
  hy=hb-30;
  if(skHud()&&(state!=="start"||(typeof upOn!=="undefined"&&upOn))){
    var skb=skBk(),skq=skCDq();
    if(skHB>=0&&skb>skHB&&state==="run"&&!rm())skPop=.18;
    skHB=skb;if(skPop>0)skPop=Math.max(0,skPop-1/60);
    txt("✦ "+skb,XO+VW-14,hb+18*HS,Math.round(13*HS*(1+skPop*1.6+skq*.5)),skq?OR:"#fde047","right",true,true,true,skq?"#fde047":"","skh");
    hy+=16*HS;
  }else skHB=-1;
  if(state==="run"){
    var xr=XO+VW-14;
    for(var u=0;u<3;u++){
      var k=u===0?"g":u===1?"j":"s",tl=k==="g"?bgT:k==="j"?spT:shd,P=PU[k];
      if(!(tl>0))continue;
      if(k!=="s"&&tl<1.5&&((tl*8)|0)&1&&!rm()){xr-=30;continue}
      ctx.fillStyle="rgba(5,7,13,.6)";ctx.fillRect(xr-22,40+hy,22,26);
      ctx.strokeStyle=P.c;ctx.lineWidth=1;ctx.strokeRect(xr-22,40+hy,22,26);
      spr(P.i,xr-18,43+hy,2,P.p);
      if(k!=="s")R(xr-20,60+hy,18*Math.max(0,Math.min(1,tl/skBarMax(k))),3,P.c);
      xr-=30;
    }
    /* Spare Core pips (one heart-cog per remaining extra hit) next to the power-up boxes */
    if(skHud()&&typeof cores!=="undefined"&&cores>0){
      for(var cq=0;cq<Math.min(cores,5);cq++){spr(IC_UR,xr-16,46+hy,2,SKI.r.p);xr-=18}
    }
  }
  if(beatT>0&&state==="run"){
    ctx.globalAlpha=rm()?1:Math.min(1,beatT*2);
    txt("Beat it!",XO+VW/2,Math.round(H*.3),26,OR,"center",true,true,true,rm()?"":OR);
    ctx.globalAlpha=1;
  }
  typeof lvDraw==="function"&&lvDraw(); /* LEVELS-1 (06d-levels.js): level banner + spark burst, end of the HUD block */
}
function draw(){
  SX=SY=0;
  if(shake>0&&!rm()){var mg=shake*16;SX=rnd(-mg,mg);SY=rnd(-mg,mg)}
  base();
  drawWorld();
  drawGhost();
  lbDraw();
  drawEnts();
  drawPlayer();
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    ctx.globalAlpha=1-p.age/p.life;
    ctx.fillStyle=p.c;
    ctx.fillRect(p.x,p.y,p.z,p.z);
  }
  ctx.globalAlpha=1;
  if(skMgT>0&&state==="run"){
    /* first magnet pickup of the run: a small "MAGNET!" pop above the buggy (static under reduced motion) */
    var mq=Math.max(0,Math.min(1,skMgT));ctx.globalAlpha=Math.min(1,mq*2.5);
    txt("MAGNET!",PX+pW()/2,GY-py-pH(duck&&py===0)-12-(rm()?0:(1-mq)*18),13,"#fde047","center",true,true,true,OR,"mgp");
    ctx.globalAlpha=1;
  }
  if(skLbT>0&&state==="run"&&!rm()){
    /* upgrade kick-in label (Forge Plate shield, re-forge, Spare Core save): rises and fades over 1.1 s, above the MAGNET! pop */
    var lq=Math.max(0,Math.min(1,skLbT/1.1));ctx.globalAlpha=Math.min(1,lq*3);
    txt(skLbS,PX+pW()/2+20,GY-py-pH(duck&&py===0)-46-(1-lq)*14,12,skLbC,"center",true,true,true,"#0e7490","sklb");
    ctx.globalAlpha=1;
  }
  SX=SY=0;base();
  drawHud();
  var pulse=rm()?1:.55+.45*Math.sin(performance.now()/260);
  if(state==="start"){
    var ty=OY?Math.round(-OY*.5):Math.round(H*.32);
    txt("FORGE RUNNER",XO+VW/2,ty,fitPx("FORGE RUNNER",48*HS,VW-32,false,true),"TITLE","center",false,true,false,VI);
    ctx.globalAlpha=pulse;
    txt("tap to start",XO+VW/2,ty+34*HS,17*HS,"#f1f5f9","center",true,true,true);
    ctx.globalAlpha=1;
    var hint="tap / space: jump (hold = higher) · swipe down / ↓: duck";
    if(OY){
      txt("tap: jump (hold = higher)",XO+VW/2,ty+60*HS,fitPx("tap: jump (hold = higher)",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt("swipe down: duck",XO+VW/2,ty+80*HS,fitPx("swipe down: duck",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);
    if(chal){
      var cl=(cname||"A friend")+" forged "+chal+" — can you beat it?";
      txt(cl,XO+VW/2,ty+(OY?112:84)*HS,fitPx(cl,16*HS,VW-20,false,true),OR,"center",false,true,true);
    }
    if(typeof msDrawChips==="function")msDrawChips(ctx,XO+12,ty+(chal?134:(OY?100:76))*HS,VW-24);
  }else if(state==="over"){
    ctx.fillStyle="rgba(5,7,13,.55)";ctx.fillRect(0,-OY,W,H+OY+OB);
    var oy=OY?Math.round(-OY*.5):Math.round(H*.28);
    txt("GAME OVER",XO+VW/2,oy,fitPx("GAME OVER",34*HS,VW-24,true,true),OR,"center",true,true);
    if(skHud()){
      var skr=typeof skRun!=="undefined"?skN(skRun):0,sku=rm()?1:Math.min(1,(performance.now()-deathAt)/600),skc=Math.round(skr*sku);
      var sks="✦ "+skN(skBk()-skr+skc)+(skr>0?"   +"+skc:"");
      txt(sks,XO+VW/2,oy-34*HS,fitPx(sks,15*HS,VW-24,true,true),"#fde047","center",true,true,true,"","skb");
    }
    txt("Score "+pad(lastS)+"  Best "+pad(hi),XO+VW/2,oy+30*HS,fitPx("Score 00000  Best 00000",16*HS,VW-24,true,false),"#e6edf7","center",true,false,false,"","sline");
    if(chal){
      var won=lastS>chal,rl=won?"You beat "+(cname||"your friend")+"!":(cname||"Your friend")+"'s "+chal+" still stands · "+(chal-lastS+1)+" to go";
      txt(rl,XO+VW/2,oy+54*HS,fitPx(rl,16*HS,VW-24,false,true),won?CY:OR,"center",false,true,false,"","rl");
    }
    ctx.globalAlpha=pulse;
    txt("tap to retry",XO+VW/2,oy+(chal?78:60)*HS,16*HS,CY,"center",true,false);
    ctx.globalAlpha=1;
    if(typeof msDrawChips==="function")msDrawChips(ctx,XO+12,typeof PKON!=="undefined"&&PKON?(PT?hudB()-54*HS:oy-76*HS):oy+(chal?96:78)*HS,VW-24);
  }
  if(typeof msDrawToast==="function")msDrawToast(ctx);
}

`;
