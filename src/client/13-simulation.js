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
    var e=ents[i],rel=speed*(typeof vMul==="function"?vMul():1)+(e.vx||0),d=e.x-(PX+pW());  /* HILLS: obstacles close in at the felt speed */
    if(e.x+e.w<PX+4)continue;
    if(e.t==="u"||e.t==="k"||(e.t==="b"&&big()))continue;
    if(e.t==="d"){if(d<rel*.4)wantDuck=true;continue}
    if(e.t==="h"){if(d<rel*.45)wantDuck=true;continue}  /* ENEMIES v2 hammer drone (06g) */
    if(e.t==="f"&&e.bot>=50)continue;
    if(e.t==="f"&&e.bot===18){if(d<rel*.3)wantDuck=true;continue}
    if(d>rel*.2)continue;
    wantJump=true;
  }
  if(typeof ocWant==="function"&&ocWant())wantJump=true;  /* ORE CART (06i): demo jumps carts */
  if(typeof srWant==="function"&&srWant())wantJump=true;  /* CHASER (06m): demo jumps rollers */
  if(typeof gpAuto==="function"&&gpAuto())wantJump=true;  /* GAPS (06k): a full jump centred over the gap */
  duck=wantDuck&&!wantJump;
  if(wantJump&&(py===0||typeof hlCr!=="undefined"&&hlCr&&!hlJ)&&jb<=0)press();  /* HILLS: also off a crest float */
  else if(held&&vy<=0)release();
}

/* simulation: obstacles unlock as the score rises */
function pick(){
  var a=[["b",1]],s=0,i;
  if(score>=200)a.push(["r",.35]);
  /* gentle start: flyers / drones also wait for 18 s / 25 s of run time (later runs are unaffected: by then score is past both) */
  if(score>=300&&runS>=18)a.push(["f",.4]);
  if(score>=450&&runS>=25)a.push(["d",.3]);
  if(score>=650)a.push(["p",.3]);
  for(i=0;i<a.length;i++)s+=a[i][1];
  var r=Math.random()*s;
  for(i=0;i<a.length;i++){r-=a[i][1];if(r<=0)return a[i][0]}
  return "b";
}
function spawn(){
  if(typeof pkHold==="function"&&pkHold()){spawnDist=0;return}  /* PIT STOP (14c): clean pit lane */
  var x=W+20,t=nt,w,lo=false;
  var gp0=ents.length;  /* GAPS (06k): this spawn's first entity */
  if(t==="f"){var bots=[4,18,52],bt=bots[(Math.random()*3)|0];ents.push({x:x,w:33,h:18,bot:bt,t:"f"});w=33;lo=bt===18}
  else if(t==="d"){ents.push({x:x,w:30,h:15,bot:60,t:"d",ph:rnd(0,6)});w=30;lo=true}
  else if(t==="r"){ents.push({x:x,w:22,h:22,bot:0,t:"r",vx:110});w=22}
  else if(t==="p"){ents.push({x:x,w:26,h:50,bot:0,t:"p"});w=26}
  else{
    var n=runS<15?1:1+((Math.random()*(score<100?2:3))|0); /* single crates for the first 15 s */
    for(var i=0;i<n;i++)ents.push({x:x+i*34,w:30,h:21,bot:0,t:"b",v:Math.random()<.5?0:1});
    w=n*34-4;
  }
  spawnDist=-w;
  nt=pick();
  nextGap=speed*.7+100+Math.random()*speed*.8+({r:130,p:60,d:80}[nt]||0)+(lo?50:0);
  if(runS<30)nextGap*=1+.8*(1-runS/30); /* gaps start 80% wider and taper to normal by 30 s (spawn pacing only; speed/score untouched) */
  if(typeof rsGap==="function")rsGap(w);  /* first-run rescue: RAMP_S ramp merged with the 30 s easing, crate 2 >= 7 s (06h) */
  /* rare pickup, first one no earlier than ~150 points; it floats at wheel height halfway through the gap
     (>=170 px of clear track on both sides), never ahead of a fast roller, never while a timed power-up is on */
  if(state==="run"&&score>=puNext&&nt!=="r"&&spT<=0&&bgT<=0&&!(typeof trT==="number"&&trT>0)){
    var ks=[];if(!shd)ks.push("s");ks.push("j","g");
    typeof trPool==="function"&&trPool(ks);  /* DOZER BLADE (06p): web runs add the blade pickup */
    if(ks.length>1&&ks.indexOf(lastK)>=0)ks.splice(ks.indexOf(lastK),1);
    var kk=ks[(Math.random()*ks.length)|0];lastK=kk;
    ents.push({x:x+w+nextGap*.5-10,w:21,h:21,bot:10,t:"u",k:kk});
    skDropLbl();  /* Supply Drop label (cost tune) */
    puNext=score+(380+Math.random()*320)*skPuF();  /* Supply Drop: spacing x0.88..0.58 (x1 at level 0) */
  }else if(SKON&&state==="run"&&score>=30)skSpawn(x,w,t);
  typeof hlSpawn==="function"&&hlSpawn();  /* HILLS (06i): pillars / vents never on a rise a tap can't clear */
  typeof gpSpawn==="function"&&gpSpawn(gp0,x,w);  /* GAPS (06k): maybe this slot becomes a gap (same Math.random draws) */
  typeof htSpawn==="function"&&htSpawn(gp0);  /* HEAT (06s): no obstacle inside a coolant pool's drive-through zone */
  typeof fkSpawn==="function"&&fkSpawn();  /* FORK (06l): maybe a fork ahead; ground lane minus rule 9 / 11 types under it */
  typeof azGap==="function"&&(nextGap+=azGap());  /* ARC STRIKES (06n): maybe book an L6 strike plate behind this obstacle (stretches this gap) */
  typeof crGap==="function"&&(nextGap+=crGap());  /* LEVELS-5 crusher (06h): thin spawns while the boss is on */
  typeof srGap==="function"&&srGap();  /* CHASER (06m): stretch one base gap for a booked roller */
}
/* spark pickups (sparks PR5, SPEC §1): 35% of gaps from score 30, never in a power-up gap (the else above). Off (no extra
   Math.random) when SKON is off. Never over drones, pillars or fliers. Row: 4 at bot 8, 26 px apart, centred in a gap >= 260 px,
   not before a roller (a ground run collects them). Arc (reach fix): 5 sparks on ONE jump path whose peak is over the bug
   cluster's centre, spaced for the speed the buggy will have when it gets there, so one clean jump over the bugs collects all
   5. The path is a parabola launched at SKAV=460 px/s (peak 59 px), between a pure tap (vy=CUT, peak 40) and a short hold:
   with good timing every jump from a tap up to ~80 ms of hold (peak ~84) collects 5/5 (scripts/test-sparks-reach.mjs).
   Each spark's centre sits on the buggy's centre (9 px above the path), so the lowest pair (~30 px) clears the bugs (21 px). */
var SKA=[-.8,-.4,0,.4,.8],SKAV=460;
function skSpawn(x,w,t){
  if(Math.random()>=.35)return;
  var row=nextGap>=260&&nt!=="r",i;
  if(t==="b"&&(!row||Math.random()<.5)){
    var cx=x+w/2,pc=PX+PW/2,v=Math.min(MAXV,speed+7*(cx-pc)/speed)*(typeof vMul==="function"?vMul():1),T=SKAV/G,PK=SKAV*SKAV/(2*G);
    for(i=0;i<5;i++){var ta=SKA[i]*T;ents.push({x:cx+ta*v-6,w:12,h:12,bot:Math.round(PK-G*ta*ta/2+9),t:"k"})}
    typeof hlAnchor==="function"&&hlAnchor(5,cx);  /* HILLS: the arc sits on the ground at the cluster centre (keeps its shape); v x vMul(): spaced at the felt speed */
  }else if(row){
    var rx=x+w+nextGap*.5-45;
    for(i=0;i<4;i++)ents.push({x:rx+i*26,w:12,h:12,bot:8,t:"k"});
  }
}
/* spark collected: bank 1 live, chime, 3 particles */
function skGet(e){
  skEarn(1);sfxSpark();
  if(!rm())sparks(e.x+6,GY-hlGe(e)-e.bot-6,3,140);
  if(e.mg&&!skMgP){skMgP=1;skMgT=1}  /* first magnet pickup this run: "MAGNET!" pop near the buggy (14-render.js) */
  if(!demo)typeof msOn==="function"&&msOn("spark",1);
}
function getPU(k){
  if(k==="t"&&typeof trGet==="function"){trGet();return}  /* DOZER BLADE (06p) */
  /* Power Cell (sparks PR6): this run's durations spMax/bgMax (set in start(); SPT/BGT at level 0 or with SKON off) */
  if(k==="s"){shd=1;shdP=0}else if(k==="j")spT=spMax;else{bgT=bgMax;if(!rm())shake=.12}
  sfxPickup(k);
  if(k!=="s")skCellLbl(k);  /* Power Cell label (cost tune) */
  if(!demo)typeof msOn==="function"&&msOn("pu",k);
  if(!rm())sparks(PX+PW/2,GY-hlGx(PX+PW/2)-20,14,180);
}
function endPU(){sfxExpire()}
/* upgrade kick-in label above the buggy for 1.1 s (off under reduced motion) */
function skLabel(s,c){if(rm())return;skLbS=s;skLbC=c||"#67e8f9";skLbT=1.1}
/* shield broke (pickup, Forge Plate or re-forge shield): Forge Plate L2 lengthens the invulnerability 1.2 -> 2.0 s; L3 starts the
   once-per-run re-forge countdown (20 s) */
function skShieldBreak(){
  inv=skInvShield();
  if(SKON&&skLv("p")>=3&&!rfU&&rfT<=0)rfT=20;
}
/* Forge Plate L3: the shield re-forges 20 s after it broke. If a pickup shield is already up then, the re-forge stays unused
   and re-arms when that one breaks. */
function skReforgeTick(dt){
  rfT-=dt;
  if(rfT<=0){rfT=0;if(!shd){shd=1;shdP=1;rfU=1;sfxReforge();skLabel("SHIELD RE-FORGED");if(!rm())sparks(PX+PW/2,GY-hlGx(PX+PW/2)-20,14,180)}}
}
/* Heavy Cart: L1 landing on a ground bug from above crushes it (bounce, +1 spark), L2 rollers too, L3 the cart drives
   through ground bugs like the big cart. From above = falling, the wheels at most 8 px deeper into its top than hit()'s 20 % box
   shrink lets a first contact be (a side hit, vy 0 on the ground, never counts) */
function skHeavy(e,ey,pt,ph){
  var lv=skHv();
  if(!lv||!(e.t==="b"||lv>=2&&e.t==="r"))return false;
  if(lv>=3&&e.t==="b"){
    if(snd&&AU)noise(AU,ac.currentTime,.08,.4,.15);
    sfx(220,70,.12,2,.08);
    if(!rm())sparks(e.x+e.w/2,ey+e.h-8,10,170);
    return true;
  }
  if(!(vy<0&&pt+ph-ey<=(ph+e.h)*.2+8))return false;
  vy=JV*.6;skEarn(1);skLabel("STOMP!","#fde047");
  if(typeof sfxBlobPop==="function")sfxBlobPop();else sfx(300,90,.1,2,.08);
  if(!rm())sparks(e.x+e.w/2,ey,12,190);
  if(!demo)typeof msOn==="function"&&msOn("stomp");
  return true;
}
/* Spare Core reboot (SPEC §2): the run goes on (no die(): no second over beacon, score submit or sparks run-end), speed,
   score and runS keep running; 2.0 s invulnerability; obstacles up to 300 px ahead are cleared after the ents loop. */
function skReboot(pt,ph){
  cores--;inv=2;sfxReboot();skLabel("SAVED (Core)","#ffffff");
  if(!rm()){
    for(var i=0;i<18;i++){var a=i*.349;addP({x:PX+PW/2,y:pt+ph/2,vx:Math.cos(a)*220,vy:Math.sin(a)*220,life:.45,age:0,c:i%3?"#ffffff":CY,g:0,z:3})}
    shake=.15;
  }
}
function skClear(pw){
  ents=ents.filter(function(e){return e.t==="u"||e.t==="k"||e.x+e.w<PX||e.x>PX+pw+300});
}
/* HILLS (06i-hills.js): ground height (px above GY) under screen x / under an entity; 0 when hills are off or absent */
function hlGx(x){return typeof hlH==="function"?hlH(x):0}
function hlGe(e){return typeof hlEG==="function"?hlEG(e):0}
function hit(ax,ay,aw,ah,bx,by,bw,bh){
  var ia=.2,ib=.2;
  ax+=aw*ia;ay+=ah*ia;aw*=1-2*ia;ah*=1-2*ia;
  bx+=bw*ib;by+=bh*ib;bw*=1-2*ib;bh*=1-2*ib;
  var hb=typeof rsHB==="function"?rsHB():0;bx+=hb;by+=hb;bw-=2*hb;bh-=2*hb;  /* rescue: forgiving obstacle box (visual unchanged) */
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}
var swl=0;function swOnce(){swl=1;if(!demo&&!tpu&&!(typeof skDebug!=="undefined"&&skDebug)&&typeof sfxSwell==="function")sfxSwell()}
function update(dt){
  if(demo)auto();
  if(typeof rsDt==="function")dt=rsDt(dt);  /* rescue slow-mo: scales the whole step, so speed/score/runS stay in lockstep */
  if(state==="run"){
    tt+=dt;runS+=dt;
    typeof enPre==="function"&&enPre(dt);  /* ENEMIES v2 (06g): slag-blob stomp, hammer-drone state */
    if(runS<=dt){skMgP=0;skMgT=0;skLbT=0;swl=0}  /* first step of a run */
    /* engine swell once per run (swl): on the first obstacle cleared (e.p below), else at 4 s; sound only (not in demo, ?pu= or ?sk debug runs) */
    if(!swl&&runS>=4)swOnce();
    if(inv>0)inv-=dt;
    if(spT>0){spT-=dt;if(spT<=0){spT=0;endPU()}}
    if(bgT>0){bgT-=dt;if(bgT<=0){bgT=0;endPU()}}
    typeof trTick==="function"&&trTick(dt);  /* DOZER BLADE (06p): blade timer, dump at the end */
    if(rfT>0)skReforgeTick(dt);
    puWarnTick();
    speed=Math.min(MAXV,speed+7*dt);
    scroll+=speed*dt;
    runT+=speed*dt/34;
    score=Math.min(99999,score+speed*dt*.05);
    typeof hlTick==="function"&&hlTick(dt);  /* HILLS (06i): felt-speed factor hlF + terrain scroll; base speed/score untouched */
    var hf=typeof vMul==="function"?vMul():1;  /* HILLS (06i): world-motion multiplier (hills slope x level speed); never speed/score */
    var m=Math.floor(score/100);
    if(m>lastM){
      lastM=m;flash=.6;skEarn(1);
      sfx(mf(84),0,.06,0,.07);sfx(mf(88),0,.06,0,.07,.07);sfx(mf(91),0,.1,0,.07,.14);
      if(!rm())sparks(W-50,20,12,150);
    }
    if(flash>0)flash-=dt;
    if(chal&&!beat&&score>chal){
      beat=true;beatT=1.4;
      for(var a=0;a<4;a++)sfx(mf(72+[0,4,7,12][a]),0,.07,1,.08,a*.07);
      if(!rm())sparks(PX+PW/2,GY-hlGx(PX+PW/2)-40,16,200);
    }
    if(jb>0){
      jb-=dt;
      if(py===0||typeof hlCanJump==="function"&&hlCanJump()||(typeof rsCanJump==="function"&&rsCanJump())){  /* HILLS (06i): one jump while floating off a crest; rescue: coyote time (both one-shot: rsJump clears rsCoy) */
        var sp=spT>0;
        vy=sp?JV*JMUL:JV;jb=0;
        if(typeof rsJump==="function")rsJump();
        if(!demo){typeof msOn==="function"&&msOn("jump");if(sp)typeof msOn==="function"&&msOn("boots")}
        if(!held&&vy>(sp?CUT*JMUL:CUT))vy=sp?CUT*JMUL:CUT;
        sfx(sp?330:400,sp?1100:820,.1,1,.07);
        if(sp&&!rm())for(var q=0;q<8;q++)addP({x:PX+8+Math.random()*30,y:GY-hlGx(PX+PW/2),vx:rnd(-120,40),vy:-rnd(20,120),life:rnd(.2,.4),age:0,c:q&1?"#fde047":OR,g:400,z:2});
      }
    }
    if(!(typeof hlPhys==="function"&&hlPhys(dt))){  /* HILLS (06i): py above the local ground; identical on flat ground */
      var g=G*(duck&&py>0?3:1);
      vy-=g*dt;py+=vy*dt;
      if(py<=0){py=0;vy=0}
    }
    if(typeof gpTick==="function"&&gpTick(dt))return;  /* GAPS (06k): edge warning, fall (sfxGapFall, Spare Core revive or die) */
    typeof fkTick==="function"&&fkTick(dt);  /* FORK (06l): entry warnings, revive / toast holds */
    var gb=GY-hlGx(PX+PW/2);  /* HILLS: ground y under the buggy (GY when flat) */
    if(wasAir&&py===0){land=.1;dust(PX+PW/2,gb,7);if(big()&&!rm())shake=Math.max(shake,.08)}
    wasAir=py>0;
    if(py===0){dustT-=dt;if(dustT<=0){dustT=.09;dust(PX+8,gb-1,1)}}
    /* spring boots throw sparks from the wheels */
    if(spT>0&&py===0&&!rm()){spkT-=dt;if(spkT<=0){spkT=.05;addP({x:PX+9+(Math.random()<.5?0:18)+Math.random()*6,y:gb-1,vx:rnd(-160,-60),vy:-rnd(30,110),life:rnd(.15,.3),age:0,c:Math.random()<.5?"#fde047":OR,g:500,z:2})}}
    spawnDist+=speed*hf*dt;  /* HILLS: spacing in felt px */
    if(spawnDist>=nextGap)spawn();
    typeof enTagAll==="function"&&enTagAll();  /* ENEMIES v2 (06g): skin the new spawn */
    var ph=pH(duck&&py===0),pw=pW(),pt=gb-py-ph,mr=SKON?skMagR():0,rb=0;
    for(var i=ents.length-1;i>=0;i--){
      var e=ents[i];
      if(e.t==="k"&&(e.mg||mr>0&&!(e.dk>(typeof fkT==="number"?fkT:0)))){  /* FORK (06l): a deck's sparks are pulled only from that deck */
        /* Spark Magnet: within skMagR() px of the buggy's centre, a spark flies to it at 450 px/s (power-ups are never pulled). A pulled
           spark stops scrolling and homes on the buggy every step, so it is always collected (never left behind) */
        var mx=PX+pw/2-(e.x+6),my=pt+ph/2-(GY-hlGe(e)-e.bot-6),md=Math.sqrt(mx*mx+my*my);
        if(!e.mg&&md<mr)e.mg=1;
        if(e.mg){
          var st=450*dt;
          if(md<=st){ents.splice(i,1);skGet(e);continue}
          e.x+=mx/md*st;e.bot-=my/md*st;continue;
        }
      }
      e.x-=(speed*hf+(e.vx||0))*dt;  /* HILLS: felt speed (hf 1 when flat) */
      if(e.t==="d"){var k=Math.max(0,Math.min(1,(e.x-(PX+250))/250));e.bot=16+44*k+Math.sin(tt*7+e.ph)*1.5}
      if(e.x+e.w<-10){ents.splice(i,1);continue}
      var ey=(e.ax!=null?GY-hlEG(e):gb)-e.bot-e.h;  /* HILLS: heights above the buggy's ground (as on flat ground); an anchored spark arc uses its drawn line */
      if(e.t==="k"){
        if(PX<e.x+e.w&&PX+pw>e.x&&pt<ey+e.h&&pt+ph>ey){ents.splice(i,1);skGet(e)}
        continue;
      }
      if(e.t==="u"){
        if(PX<e.x+e.w&&PX+pw>e.x&&pt<ey+e.h&&pt+ph>ey){ents.splice(i,1);getPU(e.k)}
        continue;
      }
      if(typeof trHit==="function"&&trHit(e,ey,pt,ph,pw)){ents.splice(i,1);continue}  /* DOZER BLADE (06p): plough it */
      if(hit(PX,pt,pw,ph,e.x,ey,e.w,e.h)){
        if(big()&&e.t==="b"){
          /* big cart flattens small ground bugs */
          ents.splice(i,1);
          if(snd&&AU)noise(AU,ac.currentTime,.08,.4,.15);
          sfx(220,70,.12,2,.08);
          if(!rm())sparks(e.x+15,ey+e.h-8,10,170);
          continue;
        }
        if(skHeavy(e,ey,pt,ph)){ents.splice(i,1);continue}  /* Heavy Cart: stomp from above / ram */
        /* absorb order (SPEC §2): inv ignores the hit -> shield absorbs it -> a Spare Core reboots -> die() */
        if(inv>0)continue;
        if(shd){
          if(shdP)skLabel("SHIELD (Plate)");
          shd=0;shdP=0;skShieldBreak();
          if(snd&&AU)noise(AU,ac.currentTime,.15,.6,.18);
          sfx(900,180,.25,2,.09);
          if(!rm()){sparks(PX+pw/2,pt+ph/2,18,220);shake=.15}
          continue;
        }
        if(typeof rsBounce==="function"&&rsBounce(e))continue;  /* rescue: runs 1-3 bounce off the first 2 crates */
        if(cores>0){skReboot(pt,ph);rb=1;continue}
        die();break;
      }
      if(!e.p&&e.x+e.w<PX+9&&inv<=0){
        e.p=1;swl||swOnce();
        var g1=(ey+e.h*.2)-(pt+ph*.8),g2=(pt+ph*.2)-(ey+e.h*.8),gap=Math.max(g1,g2);
        if(gap>=0&&gap<9){sfx(1500,1900,.05,0,.04);if(!rm())sparks(PX+PW/2,gap===g1?pt+ph:pt,6,120)}
      }
    }
    typeof ocTick==="function"&&ocTick(dt,pw,ph,pt);  /* ORE CART (06i): place/move/hit oncoming carts */
    typeof srTick==="function"&&srTick(dt,pw,ph,pt);  /* CHASER (06m): place/move/hit slag rollers from behind */
    typeof azTick==="function"&&azTick(dt,pw,ph,pt);  /* ARC STRIKES (06n): move L6 plates, count-in lamps, strikes, hits */
    if(rb)skClear(pw);
    typeof sgTick==="function"&&sgTick(dt);  /* SLAG (06q): L8 gap kinds (collapse "fall" crusts, run the slag tide) */
    typeof htTick==="function"&&htTick(dt,pw,ph,pt);  /* HEAT (06s): L8 heat gauge, cooling grates, overheat = a hit */
    typeof pkTick==="function"&&pkTick();  /* PIT STOP (14c): book the pit deck, park when the buggy drives in */
  }else if(state==="start"){
    tt+=dt;scroll+=90*dt;runT+=dt*8;
  }
  if(land>0)land-=dt;
  if(skMgT>0)skMgT-=dt;
  if(skLbT>0)skLbT-=dt;
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
  (state==="run"||state==="over")&&typeof enPost==="function"&&enPost(dt);  /* ENEMIES v2 (06g): drone dodge, particles */
  (state==="run"||state==="over")&&typeof crTick==="function"&&crTick(dt);  /* LEVELS-5 crusher (06h): the L5 boss */
}

`;
