/* ===== LAB: HILLS =====
   The flat ground becomes smooth procedural rolling hills. Terrain height is a pure function of world x (scroll + screen x),
   so everything on it scrolls consistently. Amplitude grows with distance into the run (gentle -> steep).
   Physics: py = height of the buggy above the terrain under it (0 = grounded, as in the site code), vy = world vertical speed.
   Grounded, the buggy follows the terrain; when the terrain drops away faster than CREST*G can pull it down (a crest taken
   at speed) it launches with its current upward speed and floats under CREST*G until it lands: extra airtime.
   Speed = base curve (340 -> 760 px/s) x a slope factor: uphill slows, downhill speeds up, momentum carries through the air. */
var HB=GY+16,HZ=0,bspd=START,smod=0,lastGH=0,lastTV=0,crest=false,airT=0,airMsg=0,airPts=0,hlTilt=0,airBest=0,CREST=.6;
function hgt(wx){
  var rel=wx-HZ;if(rel<0)rel=0;
  var r=Math.min(1,rel/24000);
  var a=28+70*r;
  var s=.55*Math.sin(wx*.0062+1.3)+(.25+.2*r)*Math.sin(wx*.0131+.4)+.2*r*Math.sin(wx*.0235+2.1);
  return a*(s/(.8+.4*r)+1)*.5;
}
function surf(sx){return HB-hgt(scroll+sx)}
function slopeAt(sx,hw){return (hgt(scroll+sx+hw)-hgt(scroll+sx-hw))/(2*hw)}
function labStart(){
  HZ=scroll-1000;bspd=START;smod=0;crest=false;airT=0;airMsg=0;airBest=0;hlTilt=0;
  lastGH=hgt(scroll+PX+PW/2);lastTV=0;
}
function update(dt){
  if(demo)auto();
  var pw=pW(),cx=PX+pw/2,i;
  if(state==="run"){
    tt+=dt;runS+=dt;
    if(inv>0)inv-=dt;
    if(spT>0){spT-=dt;if(spT<=0){spT=0;endPU()}}
    if(bgT>0){bgT-=dt;if(bgT<=0){bgT=0;endPU()}}
    puWarnTick();
    bspd=Math.min(MAXV,bspd+7*dt);
    var sl=slopeAt(cx,12);
    if(py===0)smod+=(labClamp(-sl*.7,-.25,.32)-smod)*Math.min(1,dt*2.2);
    else smod*=1-dt*.25;
    speed=bspd*(1+smod);
    scroll+=speed*dt;
    runT+=speed*dt/34;
    score=Math.min(99999,score+speed*dt*.05);
    var m=Math.floor(score/100);
    if(m>lastM){
      lastM=m;flash=.6;
      sfx(mf(84),0,.06,0,.07);sfx(mf(88),0,.06,0,.07,.07);sfx(mf(91),0,.1,0,.07,.14);
      if(!rm())sparks(W-50,20,12,150);
    }
    if(flash>0)flash-=dt;
    if(chal&&!beat&&score>chal){
      beat=true;beatT=1.4;
      for(var a=0;a<4;a++)sfx(mf(72+[0,4,7,12][a]),0,.07,1,.08,a*.07);
      if(!rm())sparks(PX+PW/2,surf(cx)-40,16,200);
    }
    var gh1=hgt(scroll+cx),tv=(gh1-lastGH)/dt,air=py>0;
    if(jb>0)jb-=dt;
    if(!air){
      if(jb>0){
        var sp=spT>0;
        vy=Math.min((sp?JV*JMUL:JV)+Math.max(0,lastTV)*.4,sp?JV*JMUL:JV*1.12);jb=0;crest=false;
        if(!held&&vy>(sp?CUT*JMUL:CUT))vy=sp?CUT*JMUL:CUT;
        sfx(sp?330:400,sp?1100:820,.1,1,.07);
        if(sp&&!rm())for(var q=0;q<8;q++)addP({x:PX+8+Math.random()*30,y:surf(cx),vx:rnd(-120,40),vy:-rnd(20,120),life:rnd(.2,.4),age:0,c:q&1?"#fde047":OR,g:400,z:2});
        air=true;
      }else if(tv<lastTV-G*CREST*dt){
        /* crest at speed: the hill falls away under the wheels -> launch */
        vy=lastTV*1.1+(lastTV>60?45:0);air=true;crest=true;airT=0;
      }else vy=tv;
      if(air)py=Math.max(.01,lastGH+vy*dt-gh1);
    }else{
      var g=duck?G*3:crest&&vy<120?G*CREST:G;
      vy-=g*dt;py=lastGH+py+vy*dt-gh1;
      if(crest)airT+=dt;
      if(py<=0){
        py=0;vy=tv;
        if(crest&&airT>.35){
          airPts=Math.round(airT*25);score=Math.min(99999,score+airPts);airMsg=1.1;airBest=Math.max(airBest,airT);
          sfx(mf(79),0,.05,1,.06);sfx(mf(86),0,.08,1,.06,.06);
          if(!rm())sparks(cx,surf(cx)-4,10,160);
        }
        crest=false;
      }
    }
    lastGH=gh1;lastTV=tv;
    if(airMsg>0)airMsg-=dt;
    var gy=surf(cx);
    if(wasAir&&py===0&&airT>.06||wasAir&&py===0&&!crest){land=.1;dust(PX+PW/2,gy,7);if(big()&&!rm())shake=Math.max(shake,.08)}
    wasAir=py>0;
    if(py===0){dustT-=dt;if(dustT<=0){dustT=.09;dust(PX+8,surf(PX+8)-1,1)}}
    if(spT>0&&py===0&&!rm()){spkT-=dt;if(spkT<=0){spkT=.05;addP({x:PX+9+(Math.random()<.5?0:18)+Math.random()*6,y:gy-1,vx:rnd(-160,-60),vy:-rnd(30,110),life:rnd(.15,.3),age:0,c:Math.random()<.5?"#fde047":OR,g:500,z:2})}}
    spawnDist+=speed*dt;
    if(spawnDist>=nextGap){spawn();nextGap*=1.08}
    var ph=pH(duck&&py===0),pt=gy-py-ph;
    for(i=ents.length-1;i>=0;i--){
      var e=ents[i];
      e.x-=(speed+(e.vx||0))*dt;
      if(e.t==="d"){var k=Math.max(0,Math.min(1,(e.x-(PX+250))/250));e.bot=16+44*k+Math.sin(tt*7+e.ph)*1.5}
      if(e.x+e.w<-10){ents.splice(i,1);continue}
      var ey=eY(e);
      if(e.t==="u"){
        if(PX<e.x+e.w&&PX+pw>e.x&&pt<ey+e.h&&pt+ph>ey){ents.splice(i,1);getPU(e.k)}
        continue;
      }
      if(hit(PX,pt,pw,ph,e.x,ey,e.w,e.h)){
        if(big()&&e.t==="b"){
          ents.splice(i,1);
          if(snd&&AU)noise(AU,ac.currentTime,.08,.4,.15);
          sfx(220,70,.12,2,.08);
          if(!rm())sparks(e.x+15,ey+12,10,170);
          continue;
        }
        if(inv>0)continue;
        if(shd){
          shd=0;inv=1.2;
          if(snd&&AU)noise(AU,ac.currentTime,.15,.6,.18);
          sfx(900,180,.25,2,.09);
          if(!rm()){sparks(PX+pw/2,pt+ph/2,18,220);shake=.15}
          continue;
        }
        die();break;
      }
      if(!e.p&&e.x+e.w<PX+9&&inv<=0){
        e.p=1;
        var g1=(ey+e.h*.2)-(pt+ph*.8),g2=(pt+ph*.2)-(ey+e.h*.8),gap=Math.max(g1,g2);
        if(gap>=0&&gap<9){sfx(1500,1900,.05,0,.04);if(!rm())sparks(PX+PW/2,gap===g1?pt+ph:pt,6,120)}
      }
    }
  }else if(state==="start"){
    tt+=dt;scroll+=90*dt;runT+=dt*8;HZ=scroll-1000;py=0;vy=0;
    lastGH=hgt(scroll+cx);lastTV=0;
  }
  if(land>0)land-=dt;
  if(shake>0)shake-=dt;
  if(beatT>0)beatT-=dt;
  dn=Math.min(1,score/1500);
  mLT=state==="run"?(score<150?0:score<400?1:score<800?2:3):0;
  for(var j=parts.length-1;j>=0;j--){
    var p=parts[j];
    p.age+=dt;
    if(p.age>=p.life){parts[j]=parts[parts.length-1];parts.pop();continue}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  }
}
/* obstacles sit on the terrain under their centre (ground ones sink 2 px so no corner floats on a slope) */
function eY(e){return surf(e.x+e.w/2)-e.bot-e.h+(e.bot===0?2:0)}
function drawWorld(){
  var x,x0=XO-24,x1=XO+VW+24,BOT=H+OB+30;
  drawSky();
  ctx.fillStyle=C_G;ctx.fillRect(x0,GY-6,x1-x0,BOT-GY);
  /* far hill silhouette (parallax .5, no physics) */
  ctx.fillStyle="rgba(88,60,140,.22)";ctx.beginPath();ctx.moveTo(x0,BOT);
  for(x=x0;x<=x1;x+=8)ctx.lineTo(x,GY+4-24-18*Math.sin((scroll*.5+x)*.004)-10*Math.sin((scroll*.5+x)*.011));
  ctx.lineTo(x1,BOT);ctx.closePath();ctx.fill();
  /* terrain body */
  ctx.beginPath();ctx.moveTo(x0,BOT);
  for(x=x0;x<=x1;x+=4)ctx.lineTo(x,surf(x));
  ctx.lineTo(x1,BOT);ctx.closePath();
  ctx.fillStyle="#0a0f22";ctx.fill();
  /* strata lines that follow the surface */
  for(var L=0;L<3;L++){
    ctx.globalAlpha=LANE_A[L];ctx.strokeStyle=L&1?VI:CY;ctx.lineWidth=1.5;ctx.setLineDash([26+L*10,30+L*14]);
    ctx.lineDashOffset=scroll*LANE_F[L]*.2;
    ctx.beginPath();for(x=x0;x<=x1;x+=8){var yy=surf(x)+18+L*16;x===x0?ctx.moveTo(x,yy):ctx.lineTo(x,yy)}ctx.stroke();
  }
  ctx.setLineDash([]);ctx.globalAlpha=1;
  /* glowing edge */
  ctx.strokeStyle="rgba(34,211,238,.18)";ctx.lineWidth=8;ctx.lineJoin="round";
  ctx.beginPath();for(x=x0;x<=x1;x+=4)x===x0?ctx.moveTo(x,surf(x)+1):ctx.lineTo(x,surf(x)+1);ctx.stroke();
  ctx.strokeStyle=CY;ctx.lineWidth=2;
  ctx.beginPath();for(x=x0;x<=x1;x+=4)x===x0?ctx.moveTo(x,surf(x)+1):ctx.lineTo(x,surf(x)+1);ctx.stroke();
  /* track ticks riding the surface */
  ctx.fillStyle="rgba(34,211,238,.5)";
  var go=scroll%48;
  for(x=-go+XO-48;x<x1;x+=48){ctx.fillRect(Math.round(x),Math.round(surf(x+6)+5),12,2);ctx.fillRect(Math.round(x+26),Math.round(surf(x+28)+5),4,2)}
}
function drawEnts(){
  var f=((tt*10)|0)&1,fl=((tt*9)|0)&1,bl=((tt*4)|0)&1;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],x=e.x,y=eY(e);
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
      var cx=x+11,cy=y+11-2,an0=-(e.x+scroll)/11;
      ctx.fillStyle="#1e293b";ctx.beginPath();ctx.arc(cx,cy,11,0,6.283);ctx.fill();
      ctx.strokeStyle=OR;ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="#94a3b8";ctx.lineWidth=2;ctx.beginPath();
      for(var q=0;q<3;q++){var an=an0+q*2.094;ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(an)*9,cy+Math.sin(an)*9)}
      ctx.stroke();
      R(x+6,y-6,10,4,"#475569");R(x+9,y-9,4,3,f?OR:"#fde047");
    }else if(e.t==="p"){
      for(var b=0;b<2;b++){
        var by=y+b*25;
        R(x,by,26,24,"#1e1b4b");
        ctx.strokeStyle=VI;ctx.lineWidth=2;ctx.strokeRect(x+1,by+1,24,22);
        ctx.strokeStyle="rgba(168,85,247,.55)";ctx.beginPath();ctx.moveTo(x+3,by+3);ctx.lineTo(x+23,by+21);ctx.moveTo(x+23,by+3);ctx.lineTo(x+3,by+21);ctx.stroke();
      }
      /* pillar footing down to the terrain on either side */
      var fy=Math.max(surf(x),surf(x+26));if(fy>y+50)R(x+2,y+50,22,fy-y-50+2,"#1e1b4b");
      R(x+10,y-5,6,5,bl?OR:"#7c2d12");
    }
  }
}
/* the buggy stands on the terrain and tilts with it (rotation about the ground contact point) */
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
  rbGX=PX+22.5*rbM;rbGY=surf(rbGX)-py;
  var tg=air?labClamp(Math.atan2(-vy,Math.max(200,speed))*.8,-.5,.45):-Math.atan(slopeAt(rbGX,13*rbM));
  hlTilt=mo?hlTilt+(tg-hlTilt)*Math.min(1,d*(air?6:18)):tg;
  if(speed>560&&state==="run"&&mo){
    var y=rbGY-30*rbM,x=PX;
    ctx.globalAlpha=(speed-560)/400;
    ctx.fillStyle=CY;ctx.fillRect(x-22,y+5,16,1.5);ctx.fillRect(x-30,y+13,22,1.5);ctx.fillRect(x-18,y+19,12,1.5);
    ctx.globalAlpha=1;
  }
  if(inv>0&&((inv*14)|0)&1)ctx.globalAlpha=.35;
  if(!air&&rbWA&&mo)rbLd=.22;rbWA=air;
  if(rbLd>0)rbLd=Math.max(0,rbLd-d);
  var lt=1-rbLd/.22,k=rbLd>0?(1-lt)*Math.cos(lt*8.5):0;rbSq=k;
  rbA=Math.abs(hlTilt)>.004?hlTilt:0;
  base();ctx.translate(rbGX,rbGY);
  if(rbA)ctx.rotate(rbA);
  ctx.scale(rbM*(1+.1*k),rbM*(1-.2*k));
}
function labHud(){
  if(state==="run"&&airMsg>0){
    ctx.globalAlpha=rm()?1:Math.min(1,airMsg*2.5);
    txt("BIG AIR +"+airPts,XO+VW/2,Math.round(H*.3)+(OY?-OY*.25:0),20*HS,"#fde047","center",true,true,true,rm()?"":OR,"air");
    ctx.globalAlpha=1;
  }
  if(state==="run"&&Math.abs(smod)>.05){
    var up=smod>0,pc=Math.round(smod*100);
    txt((up?"▼ downhill +":"▲ uphill ")+pc+"%",XO+VW-14,(OY?14-OY:0)+30+(HS-1)*20+20*HS,11*HS,up?"#fde047":"#94a3b8","right",true,true,true,"","slp");
  }
}
/* lab-only debug probe for the headless checks (read-only snapshot) */
window.__lab=function(){return {st:state,s:Math.floor(score),v:Math.round(speed),py:Math.round(py),air:+airBest.toFixed(2),ents:ents.map(function(e){return e.t}).join(","),t:+runS.toFixed(1),slope:+slopeAt(PX+22,12).toFixed(3)}};
