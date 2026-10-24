// LAB layer for the UPGRADE PIT STOP experiment (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in
// the site/Poki script). Idea (Reece, 25 Oct 2026): spend sparks mid-run instead of carrying a head start between runs.
//  - Just before each level boundary a raised one-way deck (a FORK tier-1 deck pushed into fkDecks, so 06l does the landing,
//    standing, terrain flattening and gap/fork exclusion) carries a PIT STOP building. Jump up, drive in: the run freezes
//    (state "pit": update()'s run branch is skipped, the frame still draws) and the normal upgrade row (14b) comes up with a
//    "Continue to Level N" button. Continue = drive out the far side, deck tapers to the floor, run goes on. Stay on the floor =
//    the deck passes overhead and the pit is missed.
//  - Economy: every run starts at 0 sparks and level 0 (no carry-over), no upgrade row at game over. Effects bought in the pit
//    apply at once (Power Cell durations, Supply Drop spacing, Plate L1 shield now, Spare Core +1; Magnet/Plate L2-3 read live).
//  - No spawns from the booking until the buggy is past the deck (clean pit lane). The lab save is memory-only.
// Switches: ?pit=S a pit every S s of run time (quick testing; label "Continue"), ?bank=N start each run with N sparks,
//   ?carry=1 keep bank + levels between runs (memory only), ?pkdbg=1 read-only probe window.__pk (+ __pk.god() for headless tests).
export default String.raw`
/* ===== LAB: UPGRADE PIT STOP ===== */
(function(){
  /* gw/gh = building size (u); park = u past the left doorway where the buggy (hidden behind the wall) parks; run = s of deck
     before the building; out = s of deck after it; early = s the building is reached
     before the level boundary; calm = s of empty floor after the deck */
  var PK={gw:150,gh:84,run:1.1,out:.6,early:.6,calm:.6,park:34};
  var CARRY=Q.get("carry")==="1",BANK=Math.max(0,Math.min(99999,parseInt(Q.get("bank"),10)||0)),EVERY=Math.max(0,parseFloat(Q.get("pit"))||0);
  var pk=null,pkDone={},pkNextT=0,pkB=null,god=false;

  /* sparks on, memory-only save (the real forge-runner-sparks key is never read or written here) */
  SKON=true;skLoad=function(){return sk};skSave=function(){return false};
  sk=skDef();sk.b=BANK;

  var oS=start;
  start=function(){
    if(!CARRY){sk=skDef();sk.b=BANK}
    oS();pk=null;pkDone={};pkNextT=EVERY;pkBtn(false);
  };
  /* the upgrade row only opens inside the pit (not at game over or on the start screen) */
  var oUs=upShow;upShow=function(){if(state==="pit")oUs()};
  /* taps and Space don't jump while parked */
  var oPr=press;press=function(){if(state==="pit")return;oPr()};
  /* a buy in the pit applies to the run in progress */
  var oB=skBuy;
  skBuy=function(k){
    var f=skPuF(),ok=oB(k);
    if(ok&&state==="pit"){
      if(k==="c"){spMax=skSPT();bgMax=skBGT()}
      else if(k==="d"){if(puNext>score)puNext=score+(puNext-score)*skPuF()/f}
      else if(k==="p"){if(skLv("p")===1&&!shd){shd=1;shdP=1}}
      else if(k==="r")cores++;
    }
    return ok;
  };
  /* a mission toast / Spare Core revive (fkHold) never takes the pit deck back */
  var oH=fkHold;
  fkHold=function(){
    var d=pk&&pk.d,i=d?fkDecks.indexOf(d):-1;
    if(i>=0)fkDecks.splice(i,1);
    oH();
    if(i>=0){fkDecks.push(d);fkDecks.sort(function(a,b){return a.x0-b.x0})}
  };
  /* clean pit lane: nothing spawns from the booking until the buggy is past the deck */
  var oSp=spawn;
  spawn=function(){if(pk&&hsc+PX<pk.d.xm+PK.calm*speed*vMul()){spawnDist=0;return}oSp()};

  /* next pit: the level boundary ahead (or every ?pit= s). null = none now */
  function pkTarget(){
    if(EVERY)return runS>=pkNextT?{n:0,tb:0}:null;
    var n=currentLevel()+1;
    if(n>LV_AT.length||pkDone[n])return null;
    return {n:n,tb:(LV_AT[n-1]-score)/Math.max(1,speed*.05)};
  }
  function pkBook(){
    var t=pkTarget();if(!t)return;
    if(typeof fkBoss==="function"&&fkBoss(currentLevel()))return;   /* no deck under the L5 Crusher */
    for(var i=0;i<fkDecks.length;i++)if(fkDecks[i].xm>hsc)return;      /* a fork is still ahead: wait */
    var f=Math.max(1,speed*vMul()),fM=fkF(Math.min(MAXV,speed+7*8)),Df=fkDf()*fM;
    var x0=Math.max(hsc+W+80+FK.ease+FK.pre*Df,hsc+PX+PW+FK.lead*fM);
    var xg=x0+PK.run*fM,xe=xg+PK.gw+PK.out*fM,tp=Math.max(FK.taper*fM,FK.h[1]*fM/(FK.slope*800)),xm=xe+tp;
    var z0=x0-FK.pre*Df,z1=xm+Math.max(FK.solid*fM,Df);
    if(t.n&&t.tb-PK.early>(xg+PK.park-(hsc+PX+PW/2))/f)return;        /* not yet: the building would come too early */
    if(typeof gapNear==="function"&&gapNear(z0-FK.ease-Df,z1+FK.ease+Df))return;
    var d={t:1,H:FK.h[1],x0:x0,xe:xe,xm:xm,z0:z0,z1:z1,f0:fkF(speed),fM:fM,lz:0,first:false,key:"pit",lv:0,set:false,t0:runS,drop:false};
    fkDecks.push(d);
    pk={d:d,xg:xg,n:t.n,used:false};
    if(t.n)pkDone[t.n]=1;else pkNextT=runS+EVERY;
  }
  function pkTick(){
    if(state!=="run")return;
    if(god)inv=Math.max(inv,.2);
    if(!pk){if(!demo&&fkOn)pkBook();return}
    var c=hsc+PX+PW/2;
    if(!pk.used&&c>=pk.xg+PK.park){
      pk.used=true;
      if(fkDk===pk.d)pkEnter();else skLabel("PIT STOP MISSED","#fdba74");
      return;
    }
    if(c>pk.d.z1+200)pk=null;
  }
  var oU=update;update=function(dt){oU(dt);pkTick()};

  function pkEnter(){
    state="pit";held=false;jb=0;duck=false;
    if(typeof sfxPlatLand==="function")sfxPlatLand(2);
    upShow();pkBtn(true);
  }
  function pkGo(){
    if(state!=="pit")return;
    pkBtn(false);upHide();
    state="run";held=false;jb=0;
    if(typeof sfxSwell==="function")sfxSwell();
  }

  /* ---- Continue button (DOM, a .ui button so a tap never reaches press()) ---- */
  var st=document.createElement("style");
  st.textContent="#pkgo{position:absolute;z-index:6;display:none;transform:translateX(-50%);min-width:170px;min-height:46px;padding:10px 18px;border:2px solid #f97316;border-radius:10px;"+
    "background:#f97316;color:#1a1033;font:900 17px/1.1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.5px;cursor:pointer;touch-action:manipulation;box-shadow:0 0 14px #f97316}"+
    "#pkgo:active{transform:translateX(-50%) scale(.96)}";
  document.head.appendChild(st);
  pkB=document.createElement("button");pkB.id="pkgo";pkB.type="button";pkB.className="ui";wrap.appendChild(pkB);
  ["pointerdown","pointerup","touchstart","touchend","mousedown","mouseup"].forEach(function(n){pkB.addEventListener(n,function(e){e.stopPropagation()})});
  pkB.addEventListener("click",function(e){e.stopPropagation();pkB.blur();pkGo()});
  function pkBtn(on){
    if(!pkB)return;
    if(!on){pkB.style.display="none";return}
    var L=pk&&pk.n?getLevelDef(pk.n):null;
    pkB.textContent=L?"Continue to Level "+L.n+" ▶":"Continue ▶";
    pkB.style.display="block";pkPlace();
  }
  function pkPlace(){
    if(!pkB||pkB.style.display==="none")return;
    var W0=wrap.getBoundingClientRect(),C0=cv.getBoundingClientRect(),oy=OY?Math.round(-OY*.5):Math.round(H*.28);
    pkB.style.left=Math.round(wrap.clientWidth/2)+"px";
    pkB.style.top=Math.round(C0.top-W0.top+(oy+44*HS+OY)*CS)+"px";
  }
  if(typeof ResizeObserver==="function")new ResizeObserver(pkPlace).observe(wrap);
  /* Enter / Space = continue while parked (capture: before 12-input's jump key) */
  window.addEventListener("keydown",function(e){
    if(state!=="pit"||e.ctrlKey||e.metaKey||e.altKey)return;
    var k=e.code;
    if(k==="Space"||k==="Enter"||k==="NumpadEnter"){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pkGo()}
  },true);

  /* ---- drawing: the building in front of the buggy (it drives in behind the wall), pit overlay over everything ---- */
  function pkDraw(){
    if(!pk)return;
    var a=pk.xg-hsc,gw=PK.gw,gh=PK.gh,mo=!rm();
    if(a>XO+VW+20||a+gw<XO-20)return;
    base();
    var yb=GY-hlW(pk.xg)-pk.d.H,yt=yb-gh,i;
    /* body + roof */
    ctx.fillStyle="#1e293b";ctx.fillRect(a,yt,gw,gh);
    ctx.fillStyle="#0f172a";ctx.fillRect(a+4,yt+18,gw-8,gh-22);
    ctx.fillStyle="#334155";ctx.fillRect(a-6,yt-8,gw+12,10);
    /* hazard stripes under the roof */
    ctx.save();ctx.beginPath();ctx.rect(a,yt+2,gw,8);ctx.clip();
    ctx.fillStyle="#facc15";ctx.fillRect(a,yt+2,gw,8);ctx.fillStyle="#111827";
    for(i=-10;i<gw+10;i+=14){ctx.beginPath();ctx.moveTo(a+i,yt+10);ctx.lineTo(a+i+7,yt+2);ctx.lineTo(a+i+14,yt+2);ctx.lineTo(a+i+7,yt+10);ctx.closePath();ctx.fill()}
    ctx.restore();
    /* doorways at both ends (the buggy goes in left, out right) */
    ctx.fillStyle="#020617";ctx.fillRect(a,yb-44,8,44);ctx.fillRect(a+gw-8,yb-44,8,44);
    ctx.fillStyle=OR;ctx.fillRect(a,yb-46,10,3);ctx.fillRect(a+gw-10,yb-46,10,3);
    /* roof lamps (blink unless reduced motion) */
    for(i=0;i<5;i++){var on=!mo||((tt*4+i)|0)%2===0;ctx.fillStyle=on?"#fde047":"#78350f";ctx.fillRect(a+12+i*((gw-28)/4),yt-12,4,4)}
    /* the sign */
    txt("UPGRADE",a+gw/2,yt+36,12,"#fdba74","center",true,true,true,"","pk1");
    txt("PIT STOP",a+gw/2,yt+60,20,"#fde047","center",true,true,true,OR,"pk2");
    /* entry marker over the deck's edge */
    var e0=pk.d.x0-hsc;
    if(!pk.used&&e0>XO-40&&e0<XO+VW+40)txt("PIT ▲",e0+14,GY-hlW(pk.d.x0)-pk.d.H-22,12,"#fde047","center",true,true,true,"","pk3");
  }
  var oP=drawPlayer;drawPlayer=function(){oP();pkDraw()};
  var oD=draw;
  draw=function(){
    oD();
    if(state!=="pit")return;
    SX=SY=0;base();
    ctx.fillStyle="rgba(5,7,13,.45)";ctx.fillRect(0,-OY,W,H+OY+OB);
    var oy=OY?Math.round(-OY*.5):Math.round(H*.28),L=pk&&pk.n?getLevelDef(pk.n):null;
    var bs="✦ "+skN(skBk());
    txt(bs,XO+VW/2,oy-34*HS,fitPx(bs,16*HS,VW-24,true,true),"#fde047","center",true,true,true,"","pkb");
    txt("UPGRADE PIT STOP",XO+VW/2,oy,fitPx("UPGRADE PIT STOP",30*HS,VW-24,true,true),OR,"center",true,true,true,"","pkt");
    var sub=L?"Spend your sparks. Next: "+L.name:"Spend your sparks.";
    txt(sub,XO+VW/2,oy+24*HS,fitPx(sub,13*HS,VW-24,true,false),"#e6edf7","center",true,false,true,"","pks");
  };

  if(Q.get("pkdbg"))window.__pk={get state(){return state},get pk(){return pk?{x0:pk.d.x0,xg:pk.xg,xm:pk.d.xm,n:pk.n,used:pk.used}:null},
    get hsc(){return hsc},get c(){return hsc+PX+PW/2},get front(){return hsc+PX+PW},get f(){return speed*vMul()},get onDeck(){return !!(pk&&fkDk===pk.d)},
    get bank(){return sk.b},get lv(){return JSON.stringify(sk.l)},get cores(){return cores},get shd(){return shd},get spMax(){return spMax},
    get runS(){return runS},get score(){return score},god:function(){god=true},go:pkGo};
})();
`;
