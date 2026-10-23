// SIMULATION: autopilot auto() for ?demo=1, pick()/spawn() (obstacles + power-up pickups), getPU()/endPU(), hit(), update(dt).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* autopilot (demo=1) */
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
    if(d>rel*.2)continue;
    wantJump=true;
  }
  duck=wantDuck&&!wantJump;
  if(wantJump&&py===0&&jb<=0)press();
  else if(held&&vy<=0)release();
}

/* simulation: obstacles unlock as the score rises */
function pick(){
  var a=[["b",1]],s=0,i;
  if(score>=200)a.push(["r",.35]);
  if(score>=300)a.push(["f",.4]);
  if(score>=450)a.push(["d",.3]);
  if(score>=650)a.push(["p",.3]);
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
  else{
    var n=1+((Math.random()*(score<100?2:3))|0);
    for(var i=0;i<n;i++)ents.push({x:x+i*34,w:30,h:21,bot:0,t:"b",v:Math.random()<.5?0:1});
    w=n*34-4;
  }
  spawnDist=-w;
  nt=pick();
  nextGap=speed*.7+100+Math.random()*speed*.8+({r:130,p:60,d:80}[nt]||0)+(lo?50:0);
  /* rare pickup, first one no earlier than ~150 points; it floats at wheel height halfway through the gap
     (>=170 px of clear track on both sides), never ahead of a fast roller, never while a timed power-up is on */
  if(state==="run"&&score>=puNext&&nt!=="r"&&spT<=0&&bgT<=0){
    var ks=[];if(!shd)ks.push("s");ks.push("j","g");
    if(ks.length>1&&ks.indexOf(lastK)>=0)ks.splice(ks.indexOf(lastK),1);
    var kk=ks[(Math.random()*ks.length)|0];lastK=kk;
    ents.push({x:x+w+nextGap*.5-10,w:21,h:21,bot:10,t:"u",k:kk});
    puNext=score+380+Math.random()*320;
  }
}
function getPU(k){
  if(k==="s")shd=1;else if(k==="j")spT=SPT;else{bgT=BGT;if(!rm())shake=.12}
  sfx(mf(72),0,.06,1,.08);sfx(mf(76),0,.06,1,.08,.06);sfx(mf(79),0,.06,1,.08,.12);sfx(mf(84),0,.12,1,.09,.18);
  if(!rm())sparks(PX+PW/2,GY-20,14,180);
}
function endPU(){sfx(mf(79),mf(60),.25,1,.08);sfx(mf(67),0,.08,0,.05,.22)}
function hit(ax,ay,aw,ah,bx,by,bw,bh){
  var ia=.2,ib=.2;
  ax+=aw*ia;ay+=ah*ia;aw*=1-2*ia;ah*=1-2*ia;
  bx+=bw*ib;by+=bh*ib;bw*=1-2*ib;bh*=1-2*ib;
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}
function update(dt){
  if(demo)auto();
  if(state==="run"){
    tt+=dt;runS+=dt;
    if(inv>0)inv-=dt;
    if(spT>0){spT-=dt;if(spT<=0){spT=0;endPU()}}
    if(bgT>0){bgT-=dt;if(bgT<=0){bgT=0;endPU()}}
    speed=Math.min(MAXV,speed+7*dt);
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
    /* spring boots throw sparks from the wheels */
    if(spT>0&&py===0&&!rm()){spkT-=dt;if(spkT<=0){spkT=.05;addP({x:PX+9+(Math.random()<.5?0:18)+Math.random()*6,y:GY-1,vx:rnd(-160,-60),vy:-rnd(30,110),life:rnd(.15,.3),age:0,c:Math.random()<.5?"#fde047":OR,g:500,z:2})}}
    spawnDist+=speed*dt;
    if(spawnDist>=nextGap)spawn();
    var ph=pH(duck&&py===0),pw=pW(),pt=GY-py-ph;
    for(var i=ents.length-1;i>=0;i--){
      var e=ents[i];
      e.x-=(speed+(e.vx||0))*dt;
      if(e.t==="d"){var k=Math.max(0,Math.min(1,(e.x-(PX+250))/250));e.bot=16+44*k+Math.sin(tt*7+e.ph)*1.5}
      if(e.x+e.w<-10){ents.splice(i,1);continue}
      var ey=GY-e.bot-e.h;
      if(e.t==="u"){
        if(PX<e.x+e.w&&PX+pw>e.x&&pt<ey+e.h&&pt+ph>ey){ents.splice(i,1);getPU(e.k)}
        continue;
      }
      if(hit(PX,pt,pw,ph,e.x,ey,e.w,e.h)){
        if(big()&&e.t==="b"){
          /* big cart flattens small ground bugs */
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
      if(!e.p&&e.x+e.w<PX+9&&inv<=0){
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

`;
