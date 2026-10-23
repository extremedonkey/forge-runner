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
var LF=[[9,6,30,3],[12,4,27,4],[6,3,27,6],[9,4,24,4]];
function leg(x,y,w,h,c){
  if(spT>0){
    /* spring boots: yellow zigzag coil on an orange boot sole */
    var n=Math.max(2,Math.floor((h-2)/2));
    for(var i=0;i<n;i++)R(x+(i&1?3:-1),y+i*2,w-2,1.5,c);
    R(x-2,y+h-2,w+4,2,OR);
  }else R(x,y,w,h,c);
}
function drawPlayer(){
  var air=py>0,dk=duck&&!air,sq=land>0&&!dk&&!air,B=big(),M=B?4/3:1;
  var sy=(dk?2:sq?2.5:3)*M,lh=(dk?2:6)*M,ph=8*sy+lh;
  var f=(runT|0)&3,bob=(!air&&!dk&&state==="run"&&(f&1))?-1:0;
  /* spring boots lift the cart 4 px on visible coils (visual only; hitbox unchanged) */
  var SL=spT>0?4:0;
  var x=PX,y=GY-py-ph+bob-SL;
  if(speed>560&&state==="run"&&!rm()){
    ctx.globalAlpha=(speed-560)/400;
    ctx.fillStyle=CY;ctx.fillRect(x-22,y+5,16,1.5);ctx.fillRect(x-30,y+13,22,1.5);ctx.fillRect(x-18,y+19,12,1.5);
    ctx.globalAlpha=1;
  }
  /* big cart: 4/3 scale with forge-orange plating; blinks back to steel in its last 1.5 s */
  var pal=B&&!(bgT<1.5&&((bgT*8)|0)&1)?PAL_BIG:PAL_A;
  if(inv>0&&((inv*14)|0)&1)ctx.globalAlpha=.35;
  spr(ANVIL,x,y,3*M,pal,sy);
  var ly=y+8*sy,lc=B?"#9a3412":"#94a3b8",lw=6*M;
  if(spT>0)lc=spT<1.5&&((spT*8)|0)&1?"#94a3b8":"#fde047";
  if(air){var ext=(vy<0?5:3)*M+SL;leg(x+9*M,ly,lw,ext,lc);leg(x+27*M,ly,lw,ext,lc)}
  else if(dk){var o=(f&1?2:0)*M;leg(x+9*M+o,ly,lw,2*M+SL,lc);leg(x+27*M-o,ly,lw,2*M+SL,lc)}
  else{var L=state==="run"?LF[f]:LF[0];leg(x+L[0]*M,ly,lw,L[1]*M-bob+SL,lc);leg(x+L[2]*M,ly,lw,L[3]*M-bob+SL,lc)}
  ctx.globalAlpha=1;
  /* shield: pulsing cyan outline around the cart */
  if(shd&&state!=="over"){
    var pw=15*3*M,pa=rm()?.8:.6+.3*Math.sin(tt*9);
    ctx.globalAlpha=.14;ctx.fillStyle=CY;ctx.fillRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=pa;ctx.strokeStyle=CY;ctx.lineWidth=2;ctx.strokeRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=1;ctx.fillStyle="#e0f2fe";
    ctx.fillRect(x-6,y-6,3,3);ctx.fillRect(x+pw+3,y-6,3,3);ctx.fillRect(x-6,y+ph+1,3,3);ctx.fillRect(x+pw+3,y+ph+1,3,3);
  }
}
function drawEnts(){
  var f=((tt*10)|0)&1,fl=((tt*9)|0)&1,bl=((tt*4)|0)&1;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],x=e.x,y=GY-e.bot-e.h;
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
function drawHud(){
  var col="#f1f5f9",glow="";
  if(flash>0){
    col=rm()||((flash*16)|0)%2?OR:"#ffffff";
    glow=rm()?"":OR;
  }
  var hy=OY?14-OY:0,hb=30+hy+(HS-1)*20;
  var sw=txt(pad(score),XO+VW-14,hb,20*HS,col,"right",true,true,true,glow,"score");
  txt("HI "+pad(hi),XO+VW-14-sw-14,hb,14*HS,"#94a3b8","right",true,true,true,"","hi");
  hy=hb-30;
  if(state==="run"){
    var xr=XO+VW-14;
    for(var u=0;u<3;u++){
      var k=u===0?"g":u===1?"j":"s",tl=k==="g"?bgT:k==="j"?spT:shd,P=PU[k];
      if(!(tl>0))continue;
      if(k!=="s"&&tl<1.5&&((tl*8)|0)&1&&!rm()){xr-=30;continue}
      ctx.fillStyle="rgba(5,7,13,.6)";ctx.fillRect(xr-22,40+hy,22,26);
      ctx.strokeStyle=P.c;ctx.lineWidth=1;ctx.strokeRect(xr-22,40+hy,22,26);
      spr(P.i,xr-18,43+hy,2,P.p);
      if(k!=="s")R(xr-20,60+hy,18*Math.max(0,tl/(k==="g"?BGT:SPT)),3,P.c);
      xr-=30;
    }
  }
  if(beatT>0&&state==="run"){
    ctx.globalAlpha=rm()?1:Math.min(1,beatT*2);
    txt("Beat it!",XO+VW/2,Math.round(H*.3),26,OR,"center",true,true,true,rm()?"":OR);
    ctx.globalAlpha=1;
  }
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
  }else if(state==="over"){
    ctx.fillStyle="rgba(5,7,13,.55)";ctx.fillRect(0,-OY,W,H+OY+OB);
    var oy=OY?Math.round(-OY*.5):Math.round(H*.28);
    txt("GAME OVER",XO+VW/2,oy,fitPx("GAME OVER",34*HS,VW-24,true,true),OR,"center",true,true);
    txt("Score "+pad(lastS)+"  Best "+pad(hi),XO+VW/2,oy+30*HS,fitPx("Score 00000  Best 00000",16*HS,VW-24,true,false),"#e6edf7","center",true,false,false,"","sline");
    if(chal){
      var won=lastS>chal,rl=won?"You beat "+(cname||"your friend")+"!":(cname||"Your friend")+"'s "+chal+" still stands · "+(chal-lastS+1)+" to go";
      txt(rl,XO+VW/2,oy+54*HS,fitPx(rl,16*HS,VW-24,false,true),won?CY:OR,"center",false,true,false,"","rl");
    }
    ctx.globalAlpha=pulse;
    txt("tap to retry",XO+VW/2,oy+(chal?78:60)*HS,16*HS,CY,"center",true,false);
    ctx.globalAlpha=1;
  }
}

`;
