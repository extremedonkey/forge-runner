/* ===== LAB: FORGE ENEMIES =====
   Four forge hazards mixed into the spawn table, same pixel style, each with its own tell:
   hd = hammer drone: hovers, a red ground marker + countdown ring telegraph the slam, then the hammer stays down -> jump it.
        Amber "early" drones slam as they enter and lift again before you arrive -> stay on the ground.
   sl = molten slag puddle on the ground, glowing and bubbling -> jump it (only wheels-on-the-ground touches count).
   an = sparking anvil hung on a chain, gap underneath -> duck under it or jump over it.
   cv = conveyor-belt ground section (cyan >> pushes you forward and speeds the world up, orange << pushes you back
        and slows it). Belts come on their own timer, obstacles can sit on them. */
var PX0=56,pxo=0,cvMul=1,cvOn=0,belts=[],beltDist=0,beltNext=1200,bspd=START,HOV=46,spkE=0;
function labStart(){belts=[];beltDist=0;beltNext=1400+Math.random()*600;pxo=0;PX=PX0;cvMul=1;cvOn=0;bspd=START}
/* autopilot (?demo=1) incl. the new hazards */
function auto(){
  var t=performance.now();
  if(state==="start"){start();return}
  if(state==="over"){if(t-deathAt>1200)start();return}
  var wantJump=false,wantDuck=false;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],rel=speed+(e.vx||0),d=e.x-(PX+pW());
    if(e.x+e.w<PX+4)continue;
    if(e.t==="u"||(e.t==="b"&&big()))continue;
    if(e.t==="d"){if(d<rel*.4)wantDuck=true;continue}
    if(e.t==="f"&&e.bot>=50)continue;
    if(e.t==="f"&&e.bot===18){if(d<rel*.3)wantDuck=true;continue}
    if(e.t==="an"){if(d<rel*.35)wantDuck=true;continue}
    if(e.t==="hd"){if(e.mode==="far"&&e.st!=="down"&&e.st!=="slam")continue;if(e.mode==="far"&&d>rel*.5)continue}
    if(d>rel*.2)continue;
    wantJump=true;
  }
  duck=wantDuck&&!wantJump;
  if(wantJump&&py===0&&jb<=0)press();
  else if(held&&vy<=0)release();
}
function pick(){
  var a=[["b",.8]],s=0,i;
  if(score>=60)a.push(["sl",.7]);
  if(score>=160)a.push(["an",.6]);
  if(score>=200)a.push(["r",.25]);
  if(score>=260&&runS>=12)a.push(["hd",.75]);
  if(score>=350&&runS>=18)a.push(["f",.25]);
  if(score>=500&&runS>=25)a.push(["d",.2]);
  if(score>=700)a.push(["p",.2]);
  for(i=0;i<a.length;i++)s+=a[i][1];
  var r=Math.random()*s;
  for(i=0;i<a.length;i++){r-=a[i][1];if(r<=0)return a[i][0]}
  return "b";
}
function spawn(){
  var x=W+20,t=nt,w,lo=false;
  if(t==="f"){var bots=[4,18,52],bt=bots[(Math.random()*3)|0];ents.push({x:x,w:33,h:18,bot:bt,t:"f"});w=33;lo=bt===18}
  else if(t==="d"){ents.push({x:x,w:30,h:15,bot:60,t:"d",ph:rnd(0,6)});w=30;lo=true}
  else if(t==="r"){ents.push({x:x,w:22,h:22,bot:0,t:"r",vx:110});w=22}
  else if(t==="p"){ents.push({x:x,w:26,h:50,bot:0,t:"p"});w=26}
  else if(t==="sl"){w=Math.round(44+Math.random()*Math.min(46,score/15));ents.push({x:x,w:w,h:8,bot:0,t:"sl",ph:rnd(0,6)})}
  else if(t==="an"){ents.push({x:x,w:42,h:24,bot:22,t:"an",ph:rnd(0,6)});w=42;lo=true}
  else if(t==="hd"){ents.push({x:x+40,w:34,h:36,bot:HOV,t:"hd",st:"hov",tm:0,mode:Math.random()<.68?"near":"far",ph:rnd(0,6)});w=74}
  else{
    var n=runS<15?1:1+((Math.random()*(score<100?2:3))|0);
    for(var i=0;i<n;i++)ents.push({x:x+i*34,w:30,h:21,bot:0,t:"b",v:Math.random()<.5?0:1});
    w=n*34-4;
  }
  spawnDist=-w;
  nt=pick();
  nextGap=speed*.7+110+Math.random()*speed*.8+({r:130,p:60,d:80,sl:70,an:90,hd:170}[nt]||0)+(lo?50:0);
  if(runS<30)nextGap*=1+.8*(1-runS/30);
  if(state==="run"&&score>=puNext&&nt!=="r"&&spT<=0&&bgT<=0){
    var ks=[];if(!shd)ks.push("s");ks.push("j","g");
    if(ks.length>1&&ks.indexOf(lastK)>=0)ks.splice(ks.indexOf(lastK),1);
    var kk=ks[(Math.random()*ks.length)|0];lastK=kk;
    ents.push({x:x+w+nextGap*.5-10,w:21,h:21,bot:10,t:"u",k:kk});
    puNext=score+380+Math.random()*320;
  }
}
/* hammer drone state machine, driven by distance to the buggy (px), so the tell reads the same at any speed */
function hdTick(e,dt,d){
  if(e.st==="hov"){
    if(e.mode==="near"&&d<470){e.st="tel";e.tm=0;sfx(1200,900,.05,1,.04)}
    else if(e.mode==="far"&&d<560){e.st="tel";e.tm=0;sfx(1200,900,.05,1,.04)}
  }else if(e.st==="tel"){
    e.tm+=dt;
    if(e.mode==="near"?d<255:e.tm>.22){e.st="slam";e.tm=0}
  }else if(e.st==="slam"){
    e.tm+=dt;e.bot=HOV*(1-Math.min(1,e.tm/.08));
    if(e.tm>=.08){
      e.st="down";e.tm=0;e.bot=0;
      if(snd&&AU)noise(AU,ac.currentTime,.12,.5,.2);
      sfx(160,50,.16,2,.09);
      if(!rm()){sparks(e.x+17,GY-2,12,200);shake=Math.max(shake,.1)}
    }
  }else if(e.st==="down"){
    e.tm+=dt;if(e.mode==="far"&&d<400){e.st="rise";e.tm=0;sfx(300,600,.12,1,.04)}
  }else if(e.st==="rise"){
    e.tm+=dt;e.bot=HOV*Math.min(1,e.tm/.26);if(e.tm>=.26){e.st="up";e.bot=HOV}
  }else if(e.st==="up")e.bot=HOV+Math.sin(tt*6+e.ph)*1.5;
  if(e.st==="hov"||e.st==="tel")e.bot=HOV+Math.sin(tt*6+e.ph)*(e.st==="tel"?.5:1.5);
}
function update(dt){
  if(demo)auto();
  if(state==="run"){
    tt+=dt;runS+=dt;
    if(inv>0)inv-=dt;
    if(spT>0){spT-=dt;if(spT<=0){spT=0;endPU()}}
    if(bgT>0){bgT-=dt;if(bgT<=0){bgT=0;endPU()}}
    puWarnTick();
    bspd=Math.min(MAXV,bspd+7*dt);
    /* conveyor: wheels on a belt -> pushed along it (screen x) and the world runs faster / slower */
    var pw=pW(),cx=PX+pw/2,i;
    cvOn=0;
    if(py===0)for(i=0;i<belts.length;i++){var bt=belts[i];if(cx>bt.x&&cx<bt.x+bt.w){cvOn=bt.dir;break}}
    if(cvOn){pxo=labClamp(pxo+cvOn*(cvOn>0?80:70)*dt,-36,64)}
    else if(py===0){pxo+=(0-pxo)*Math.min(1,dt*1.2)}
    PX=Math.round((PX0+pxo)*4)/4;
    cvMul+=((cvOn>0?1.18:cvOn<0?.84:1)-cvMul)*Math.min(1,dt*3);
    speed=bspd*cvMul;
    scroll+=speed*dt;
    runT+=speed*dt/34*(cvOn?1+cvOn*.6:1);
    score=Math.min(99999,score+bspd*dt*.05);
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
      if(!rm())sparks(PX+PW/2,GY-40,16,200);
    }
    if(jb>0){
      jb-=dt;
      if(py===0){
        var sp=spT>0;
        vy=sp?JV*JMUL:JV;jb=0;
        if(!held&&vy>(sp?CUT*JMUL:CUT))vy=sp?CUT*JMUL:CUT;
        sfx(sp?330:400,sp?1100:820,.1,1,.07);
        if(sp&&!rm())for(var q=0;q<8;q++)addP({x:PX+8+Math.random()*30,y:GY,vx:rnd(-120,40),vy:-rnd(20,120),life:rnd(.2,.4),age:0,c:q&1?"#fde047":OR,g:400,z:2});
      }
    }
    var g=G*(duck&&py>0?3:1);
    vy-=g*dt;py+=vy*dt;
    if(py<=0){py=0;vy=0}
    if(wasAir&&py===0){land=.1;dust(PX+PW/2,GY,7);if(big()&&!rm())shake=Math.max(shake,.08)}
    wasAir=py>0;
    if(py===0){dustT-=dt;if(dustT<=0){dustT=.09;dust(PX+8,GY-1,1)}}
    if(spT>0&&py===0&&!rm()){spkT-=dt;if(spkT<=0){spkT=.05;addP({x:PX+9+(Math.random()<.5?0:18)+Math.random()*6,y:GY-1,vx:rnd(-160,-60),vy:-rnd(30,110),life:rnd(.15,.3),age:0,c:Math.random()<.5?"#fde047":OR,g:500,z:2})}}
    spawnDist+=speed*dt;
    if(spawnDist>=nextGap)spawn();
    /* belts on their own timer (first one after ~120 points) */
    if(score>=120){beltDist+=speed*dt;if(beltDist>=beltNext){var bw=Math.round(360+Math.random()*300);belts.push({x:W+30,w:bw,dir:Math.random()<.55?1:-1});beltDist=0;beltNext=bw+900+Math.random()*1100}}
    for(i=belts.length-1;i>=0;i--){belts[i].x-=speed*dt;if(belts[i].x+belts[i].w<XO-40)belts.splice(i,1)}
    var ph=pH(duck&&py===0),pt=GY-py-ph;
    spkE-=dt;var emit=spkE<=0&&!rm();if(emit)spkE=.05;
    for(i=ents.length-1;i>=0;i--){
      var e=ents[i];
      e.x-=(speed+(e.vx||0))*dt;
      if(e.t==="d"){var k=Math.max(0,Math.min(1,(e.x-(PX+250))/250));e.bot=16+44*k+Math.sin(tt*7+e.ph)*1.5}
      if(e.t==="hd")hdTick(e,dt,e.x-(PX+pw));
      if(e.t==="an"&&emit&&e.x<W+XO&&e.x>XO-40){
        addP({x:e.x+rnd(4,38),y:GY-e.bot+1,vx:rnd(-90,60),vy:rnd(-40,40),life:rnd(.25,.5),age:0,c:Math.random()<.5?"#fde047":Math.random()<.5?OR:CY,g:700,z:2});
      }
      if(e.t==="sl"&&emit&&Math.random()<.35&&e.x<W+XO){
        addP({x:e.x+rnd(6,e.w-6),y:GY-6,vx:rnd(-20,20),vy:-rnd(40,90),life:rnd(.3,.6),age:0,c:Math.random()<.6?OR:"#fde047",g:120,z:2});
      }
      if(e.x+e.w<-10){ents.splice(i,1);continue}
      var ey=GY-e.bot-e.h,hitIt=false;
      if(e.t==="u"){
        if(PX<e.x+e.w&&PX+pw>e.x&&pt<ey+e.h&&pt+ph>ey){ents.splice(i,1);getPU(e.k)}
        continue;
      }
      if(e.t==="sl")hitIt=py<3&&PX+pw-9>e.x+6&&PX+9<e.x+e.w-6;
      else hitIt=hit(PX,pt,pw,ph,e.x,ey,e.w,e.h);
      if(hitIt){
        if(big()&&e.t==="b"){
          ents.splice(i,1);
          if(snd&&AU)noise(AU,ac.currentTime,.08,.4,.15);
          sfx(220,70,.12,2,.08);
          if(!rm())sparks(e.x+15,GY-8,10,170);
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
      if(!e.p&&e.x+e.w<PX+9&&inv<=0&&e.t!=="sl"){
        e.p=1;
        var g1=(ey+e.h*.2)-(pt+ph*.8),g2=(pt+ph*.2)-(ey+e.h*.8),gap=Math.max(g1,g2);
        if(gap>=0&&gap<9){sfx(1500,1900,.05,0,.04);if(!rm())sparks(PX+PW/2,gap===g1?pt+ph:pt,6,120)}
      }
    }
  }else if(state==="start"){
    tt+=dt;scroll+=90*dt;runT+=dt*8;
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
/* conveyor belts: drawn over the site ground at the start of drawEnts (under the entities) */
function drawBelts(){
  for(var i=0;i<belts.length;i++){
    var b=belts[i],x0=Math.round(b.x),x1=Math.round(b.x+b.w),col=b.dir>0?CY:OR,q;
    if(x1<XO-20||x0>XO+VW+20)continue;
    R(x0,GY-3,b.w,12,"#111827");
    R(x0,GY-3,b.w,2,col);R(x0,GY+7,b.w,2,"#334155");
    /* rollers */
    var ro=((scroll*(1+b.dir*.6))%16+16)%16;
    for(q=x0+8-ro;q<x1-4;q+=16)if(q>x0+2){R(q,GY+1,4,4,"#475569");R(q+1,GY+2,2,2,col)}
    /* chevrons moving in the push direction */
    ctx.globalAlpha=.85;
    var co=((scroll*(b.dir>0?1.6:.4))%28+28)%28;
    for(q=x0-co;q<x1;q+=28){
      if(q<x0+2||q>x1-10)continue;
      var cxp=Math.round(q);
      if(b.dir>0){R(cxp,GY-11,2,2,col);R(cxp+2,GY-9,2,2,col);R(cxp,GY-7,2,2,col);R(cxp+5,GY-11,2,2,col);R(cxp+7,GY-9,2,2,col);R(cxp+5,GY-7,2,2,col)}
      else{R(cxp+2,GY-11,2,2,col);R(cxp,GY-9,2,2,col);R(cxp+2,GY-7,2,2,col);R(cxp+7,GY-11,2,2,col);R(cxp+5,GY-9,2,2,col);R(cxp+7,GY-7,2,2,col)}
    }
    ctx.globalAlpha=1;
    /* end caps */
    R(x0-4,GY-5,6,15,"#64748b");R(x1-2,GY-5,6,15,"#64748b");R(x0-3,GY-4,4,2,col);R(x1-1,GY-4,4,2,col);
  }
}
/* hammer drone: rotor drone body + piston + hammer head (one 34x36 hitbox) */
var HD_BODY=["ww........ww",".wwmmmmmmww.","..mmmeemmm..","..mmmmmmmm.."];
var PAL_HD=[{w:"#cbd5e1",m:"#64748b",e:"#ef4444"},{w:"#cbd5e1",m:"#64748b",e:"#fde047"}];
var SLAG_C=["#7c2d12","#c2410c",OR,"#fb923c","#fde047"];
function drawHazard(e){
  var x=Math.round(e.x),y=GY-e.bot-e.h,f=((tt*10)|0)&1,mo=!rm(),q;
  if(e.t==="sl"){
    var w=e.w;
    ctx.globalAlpha=mo?.22+.08*Math.sin(tt*5+e.ph):.25;ctx.fillStyle=OR;ctx.fillRect(x-8,GY-16,w+16,20);
    ctx.globalAlpha=.35;ctx.fillStyle="#fde047";ctx.fillRect(x-2,GY-8,w+4,10);ctx.globalAlpha=1;
    R(x-2,GY-2,w+4,6,"#431407");
    R(x,GY-5,w,7,"#c2410c");
    for(q=0;q<w;q+=4){var hh=Math.round(1.5+1.5*Math.sin(q*.45+tt*(mo?6:0)+e.ph));R(x+q,GY-5-hh,4,hh+1,q%8?OR:"#fb923c")}
    R(x+4,GY-3,w-8,2,"#fde047");
    if(mo)for(q=0;q<3;q++){var bp=(tt*1.3+q*.37+e.ph)%1,bx=x+8+((q*37+Math.floor(tt*1.3+q*.37+e.ph)*23)%Math.max(1,w-16));if(bp<.6)R(bx,GY-8-bp*6,2+(bp>.4?1:0),2,"#fef3c7")}
  }else if(e.t==="an"){
    /* chain from the top of the screen, anvil body, hot face, spark gap glow underneath */
    var top=-OY-20,ay=y;
    for(q=top;q<ay-2;q+=8){R(x+19,q,4,5,"#64748b");R(x+20,q+5,2,3,"#475569")}
    R(x+12,ay-4,18,4,"#475569");
    var hot=mo&&f?{c:"#fde047",l:"#fdba74",g:"#9a3412",o:"#fef3c7",d:"#7c2d12"}:{c:OR,l:"#cbd5e1",g:"#64748b",o:"#fde047",d:"#475569"};
    spr(ANVIL,x-1,ay,3,hot);
    ctx.globalAlpha=mo?.18+.12*Math.sin(tt*14+e.ph):.2;ctx.fillStyle="#fde047";ctx.fillRect(x,GY-e.bot,42,e.bot);ctx.globalAlpha=1;
    R(x+4,GY-e.bot,34,1,"#fde047");
  }else if(e.t==="hd"){
    var cx=x+17,tel=e.st==="tel",down=e.st==="down"||e.st==="slam",far=e.mode==="far";
    var mk=far?"#fbbf24":"#ef4444";
    /* telegraph: ground marker under the drone + dashed drop line + countdown ring */
    if(e.st==="hov"||tel){
      var pu=tel?(mo?(((tt*16)|0)&1):1):0;
      ctx.globalAlpha=tel?(pu?.75:.4):.22;ctx.fillStyle=mk;ctx.fillRect(x-2,GY-3,38,4);
      if(tel){ctx.fillRect(x+4,GY-8,2,5);ctx.fillRect(x+28,GY-8,2,5)}
      ctx.globalAlpha=tel?.5:.2;ctx.strokeStyle=mk;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(cx,y+36);ctx.lineTo(cx,GY-4);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;
      if(tel&&!far){
        var pr=labClamp((e.x-(PX+pW())-255)/215,0,1);
        ctx.strokeStyle=mk;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,y-8,6,-1.571,-1.571+6.283*pr,false);ctx.stroke();
        txt("!",cx,y-15,12,mk,"center",true,true,true,"","hd"+(i0++%6));
      }
    }
    /* rotors, body */
    var rf=mo?((tt*30)|0)&1:0;
    R(x+(rf?0:3),y-2,10,2,"#94a3b8");R(x+(rf?24:21),y-2,10,2,"#94a3b8");
    spr(HD_BODY,x-1,y,3,PAL_HD[tel&&f?1:0]);
    /* piston + hammer head */
    R(x+14,y+12,6,8,"#475569");R(x+15,y+12,4,8,down?"#fde047":"#94a3b8");
    R(x,y+20,34,16,"#334155");R(x+2,y+22,30,12,"#64748b");R(x,y+33,34,3,down?"#fde047":OR);
    R(x+4,y+24,4,2,"#cbd5e1");
    if(down&&mo){ctx.globalAlpha=.25;ctx.fillStyle=OR;ctx.fillRect(x-6,GY-6,46,8);ctx.globalAlpha=1}
  }
}
var i0=0;
function drawEnts(){
  i0=0;
  drawBelts();
  var f=((tt*10)|0)&1,fl=((tt*9)|0)&1,bl=((tt*4)|0)&1;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],x=e.x,y=GY-e.bot-e.h;
    if(e.t==="sl"||e.t==="an"||e.t==="hd"){drawHazard(e);continue}
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
      var cx=x+11,cy=y+11,an0=-e.x/11;
      ctx.fillStyle="#1e293b";ctx.beginPath();ctx.arc(cx,cy,11,0,6.283);ctx.fill();
      ctx.strokeStyle=OR;ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="#94a3b8";ctx.lineWidth=2;ctx.beginPath();
      for(var q=0;q<3;q++){var an=an0+q*2.094;ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(an)*9,cy+Math.sin(an)*9)}
      ctx.stroke();
      R(x+6,y-4,10,4,"#475569");R(x+9,y-7,4,3,f?OR:"#fde047");
    }else if(e.t==="p"){
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
function labHud(){
  if(state==="run"&&cvOn){
    txt(cvOn>0?"BELT >> BOOST":"BELT << DRAG",XO+VW/2,(OY?14-OY:0)+56+(HS-1)*20,12*HS,cvOn>0?CY:OR,"center",true,true,true,"","belt");
  }
}
window.__lab=function(){return {st:state,s:Math.floor(score),v:Math.round(speed),py:Math.round(py),t:+runS.toFixed(1),px:Math.round(PX),cv:cvOn,ents:ents.map(function(e){return e.t+(e.st?":"+e.st:"")}).join(",")}};
