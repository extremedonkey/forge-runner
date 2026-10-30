// UPGRADE PIT STOP (owner: Reece; lab first: src/client/lab/pitstop.js): spend sparks mid-run (site and Poki builds).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 14b-upgrades-ui.js (the #up row, upShow/upHide/upT/UPK/UPN) and uses FORK (06l: fkDecks, FK, fkF, fkDf, fkDk, fkOn,
// fkBoss), GAPS gapNear, LEVELS (currentLevel, getLevelDef, LV_AT), sparks core (sk, SKU, skLv, skCost, skPuF, skSPT, skBGT).
//  - About PK.early s before each level boundary a raised one-way tier-1 deck (pushed into fkDecks, flagged pit, so 06l does
//    landing, standing, terrain flattening and keeps gaps / other forks off it) carries a PIT STOP building. Jump up and drive
//    in: state "pit" (update()'s run branch is skipped, the frame still draws), the #up row opens as cards (name + what the next
//    level does) centred under an "UPGRADE PIT STOP" overlay, with "Continue to Level N" (also Enter / Space). Continue = drive
//    out the far side, the deck tapers to the floor. Stay on the floor = the deck passes overhead ("PIT STOP MISSED").
//  - Buys are the normal skBuy() (saved as usual) and apply to the run in progress (pkBought). Nothing spawns from the booking
//    until the buggy is past the deck (pkHold). Poki: gameplayStop while parked, gameplayStart on Continue; short portrait
//    places the overlay with poki/mobile.js pkOY(). Off in demo, ?pu= runs, with sparks or forks off, and with ?pit=0.
// Hooks (one typeof-guarded line each): 11 start() -> pkStart(), press() returns in "pit"; 13 spawn() -> pkHold(), update() ->
// pkTick() (end of the run branch); 14 draw() -> pkDraw() after the buggy, pkHud() after drawHud(); 14b upPlace() -> pkRow(),
// upSync() -> pkTx(), upToast() -> pkToastY(); 06b skBuy() -> pkBought(k,f); 06l fkHold() skips the pit deck. Styles: style.css #pkgo, #up.pit.
export default String.raw`
/* upgrade pit stop */
var PIT_ON=Q.get("pit")!=="0";
/* gw/gh = building size (u); park = u past the left doorway where the buggy (hidden behind the wall) parks; run = s of deck
   before the building; out = s of deck after it; early = s the building is reached before the level boundary; calm = s of
   empty floor after the deck; entry (playtest 25 Oct: forgiving): on the deck, OR in the air (py > air px) at the doorway, OR in the
   air within grace s while the buggy's centre was in the reach u before it, so a jump from the floor under the deck still enters */
var PK={gw:150,gh:84,park:34,run:1.1,out:.6,early:.6,calm:.6,lead:1.75,reach:160,air:6,grace:.45};
var pk=null,pkDone={},pkEvery=0,pkNextT=0,pkB=null;   /* pkEvery: a pit every N s instead of per level (lab ?pit=N) */
function pkOn(){return PIT_ON&&!!SKON&&!demo&&!tpu&&!!fkOn}
function pkStart(){pk=null;pkDone={};pkNextT=pkEvery;pkBtn(false)}
/* 13 spawn(): true = no spawn (clean pit lane from the booking until the buggy is past the deck) */
function pkHold(){
  if(!pk)return false;
  /* t452u: only spawns that would land in the pit lane (from PK.lead s of felt travel before the deck, to calm s after it) are held; the rest of the
     run keeps spawning, so the lull is the lane itself, not booking -> past the deck */
  var f=Math.max(1,speed*vMul()),sx=hsc+W+20;
  return sx>Math.min(pk.d.z0,pk.d.x0-PK.lead*f)&&sx<pk.d.z1+PK.calm*f;
}
/* next pit: the level boundary ahead (or every pkEvery s). null = none now */
function pkTarget(){
  if(pkEvery)return runS>=pkNextT?{n:0,tb:0}:null;
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
  if(t.n&&t.tb-PK.early>(xg+PK.park-(hsc+PX+PW/2))/f)return;         /* not yet: the building would come too early */
  if(typeof gapNear==="function"&&gapNear(z0-FK.ease-Df,z1+FK.ease+Df))return;
  var d={t:1,H:FK.h[1],x0:x0,xe:xe,xm:xm,z0:z0,z1:z1,f0:fkF(speed),fM:fM,lz:0,first:false,key:"pit",lv:0,set:false,t0:runS,drop:false,pit:1};
  fkDecks.push(d);
  pk={d:d,xg:xg,n:t.n,used:false,airT:-1e9};
  if(t.n)pkDone[t.n]=1;else pkNextT=runS+pkEvery;
}
/* 13 update(), end of the run branch */
function pkTick(){
  if(state!=="run")return;
  if(!pk){if(pkOn())pkBook();return}
  var c=hsc+PX+PW/2;
  if(!pk.used&&py>PK.air&&c>=pk.xg-PK.reach)pk.airT=runS;
  if(!pk.used&&c>=pk.xg+PK.park){
    pk.used=true;
    if(fkDk===pk.d||runS-pk.airT<=PK.grace)pkEnter();else if(runS>=30&&pk.n&&pk.n<LV_AT.length)skLabel("NEXT PIT: LEVEL "+(pk.n+1),"#22d3ee");   /* t452u: neutral, and nothing at all in the first 30 s */
    return;
  }
  if(c>pk.d.z1+200)pk=null;
}
function pkEnter(){
  /* not on the deck (a jump at / under the doorway): put the buggy on it, hidden behind the wall, so it drives out on the deck */
  if(fkDk!==pk.d){py=pk.d.H;vy=0;fkT=1;fkDk=pk.d;hlLG=typeof hlB==="function"?hlB():0;hlLTV=0;hlJ=0;hlCr=0;hlCL=0;hlOff=0;hlDeep=0}
  state="pit";held=false;jb=0;duck=false;
  if(typeof ads!=="undefined")ads.gameplayStop();   /* Poki: not playing while parked (as the pause overlay does) */
  if(typeof sfxPlatLand==="function")sfxPlatLand(2);
  upShow();pkBtn(true);
}
function pkGo(){
  if(state!=="pit")return;
  pkBtn(false);upHide();
  state="run";held=false;jb=0;
  if(typeof ads!=="undefined")ads.gameplayStart();
  if(typeof sfxSwell==="function")sfxSwell();
}
/* 06b skBuy(): a buy in the pit applies to the run in progress (f = the Supply Drop factor before the buy) */
function pkBought(k,f){
  if(state!=="pit")return;
  if(k==="c"){spMax=skSPT();bgMax=skBGT()}
  else if(k==="d"){if(puNext>score)puNext=score+(puNext-score)*skPuF()/f}
  else if(k==="p"){if(skLv("p")===1&&!shd){shd=1;shdP=1}}
  else if(k==="r")cores++;
  else if(k==="t"&&skLv("t")===3&&typeof trGo==="function"){   /* Tractor L3: a blade at once (06p; site only); a running blade is lengthened, keeping its scrap */
    if(trT>0){trT=Math.max(trT,SKU.t.e[2]);trMx=Math.max(trMx,trT)}else trGo(SKU.t.e[2])}
}

/* ---- Continue button (a .ui button, so a tap never reaches press()) ---- */
/* built lazily on the first pit (no element or listener before that) */
function pkMk(){
  pkB=document.createElement("button");pkB.id="pkgo";pkB.type="button";pkB.className="ui";wrap.appendChild(pkB);
  ["pointerdown","pointerup","touchstart","touchend","mousedown","mouseup"].forEach(function(n){pkB.addEventListener(n,function(e){e.stopPropagation()})});
  pkB.addEventListener("click",function(e){e.stopPropagation();pkB.blur();pkGo()});
  if(typeof ResizeObserver==="function")new ResizeObserver(pkPlace).observe(wrap);
}
function pkBtn(on){
  if(!on){if(pkB)pkB.style.display="none";return}
  if(!pkB)pkMk();
  var L=pk&&pk.n?getLevelDef(pk.n):null;
  pkB.textContent=L?"Continue to Level "+L.n+" ▶":"Continue ▶";
  pkB.style.display="block";pkPlace();
}
/* overlay title y in game units: the game-over block's spot (Poki: portrait test PT, as its game-over y; short portrait below
   the HUD row, poki/mobile.js pkOY) */
function pkY(){var p=typeof PT!=="undefined"?PT:OY,oy=p?Math.round(-OY*.5):Math.round(H*.28);return typeof pkOY==="function"?pkOY(oy):oy}
/* top of the pit's centre column (CSS px in #wrap): just under the "Tap an upgrade" line of the overlay */
function pkColY(){
  var W0=wrap.getBoundingClientRect(),C0=cv.getBoundingClientRect(),oy=pkY();
  return Math.round(C0.top-W0.top+(oy+36*HS+OY)*CS);
}
/* Continue goes 16 px under the cards */
/* the part of #wrap on screen (CSS px in #wrap): a cover layout can crop its sides */
function pkVis(){var r=wrap.getBoundingClientRect(),x0=Math.max(0,-r.left),x1=Math.min(wrap.clientWidth,(window.innerWidth||wrap.clientWidth)-r.left);return x1>x0?[x0,x1]:[0,wrap.clientWidth]}
function pkPlace(){
  if(!pkB||pkB.style.display==="none")return;
  var v=pkVis();pkB.style.left=Math.round((v[0]+v[1])/2)+"px";
  pkB.style.top=(upE&&upOn?upE.offsetTop+upE.offsetHeight+16:pkColY())+"px";
}
/* card text: what buying the next level gives (maxed: what it does now) */
function pkDs(k){
  var u=SKU[k],lv=skLv(k),mx=skCost(k)===null,e=u.e;
  if(k==="m")return mx?"Max pull: "+e[lv-1]+" px":"Pulls sparks to you. Range "+(lv?e[lv-1]+" → ":"")+e[lv]+" px";
  if(k==="c")return mx?"Power-ups last "+Math.round(e[0]*lv*10)/10+"s longer":"Power-ups last longer: spring "+(SPT+e[0]*lv)+" → "+(SPT+e[0]*(lv+1))+"s";
  if(k==="d")return mx?"Power-ups come "+Math.round((1-e[lv-1])*100)+"% sooner":"More power-ups ("+Math.round((1-e[lv])*100)+"% sooner)";
  if(k==="p")return ["Shield now: blocks one hit","After a shield hit: 2.0s safe (was 1.2s)","A broken shield rebuilds after 20s","Shield, long safe time, rebuild"][mx?3:lv];
  if(k==="r")return mx?"Survive "+lv+" extra crashes":lv?"Survive a 2nd extra crash":"Survive one extra crash";
  return typeof skDsX==="function"?skDsX(k,lv,mx):"";
}
/* 14b upSync(): name + description spans on every tile (shown by #up.pit only) */
function pkTx(){
  if(!upE)return;
  for(var i=0;i<UPK.length;i++){
    var k=UPK[i],t=upT[k];if(!t)continue;
    if(!t.tx){t.tx=document.createElement("span");t.tx.className="tx";t.nm=document.createElement("span");t.nm.className="nm";
      t.ds=document.createElement("span");t.ds.className="ds";t.tx.appendChild(t.nm);t.tx.appendChild(t.ds);t.b.appendChild(t.tx)}
    t.nm.textContent=UPN[k];t.ds.textContent=pkDs(k);
  }
}
/* 14b upPlace(): in the pit the row leaves the ground band and becomes cards centred under the title, Continue under it.
   Wide screens: cards side by side (#up.pit); narrow (portrait): a stacked list (#up.pit.ls). false = not in the pit */
function pkRow(){
  if(state!=="pit"){upE.classList.remove("pit","ls");return false}
  var v=pkVis(),x0=v[0],ww=v[1]-v[0],wh=wrap.clientHeight,n=UPK.length,s=upE.style,top=pkColY(),g,w,h,ls=ww<620;
  pkTx();upE.classList.add("pit");upE.classList.toggle("ls",ls);
  if(ls){g=8;w=Math.min(ww-24,440);h=Math.max(52,Math.min(66,Math.floor((wh-top-46-16-12-(n-1)*g)/n)));s.left=Math.round(x0+(ww-w)/2)+"px"}
  else{g=n>6||ww<760?6:12;w=Math.max(n>6?82:88,Math.min(168,Math.floor((ww-16-(n-1)*g)/n)));h=Math.max(118,Math.min(168,wh-top-46-16-12));s.left=Math.round(x0+(ww-n*w-(n-1)*g)/2)+"px"}   /* 6 cards fit 640 px (Poki 640x360) at 88+ px; 7 (Tractor, site) at 82+ */
  s.top=top+"px";s.gap=g+"px";
  s.setProperty("--w",w+"px");s.setProperty("--h",h+"px");
  s.setProperty("--i",(ls||w<130?24:30)+"px");
  s.setProperty("--pf",(w>=140?12:10)+"px");s.setProperty("--cf",(w>=140?17:15)+"px");
  s.setProperty("--nf",(w>=140?15:w>=100?13:12)+"px");s.setProperty("--df",(w>=140?13:w>=100?12:11)+"px");
  pkPlace();
  return true;
}
/* 14b upToast(): in the pit the buy toast goes under Continue (above the cards it would cover the title). null = not in the pit */
function pkToastY(te){
  if(state!=="pit"||!pkB||!pkB.offsetHeight)return null;
  return Math.min(wrap.clientHeight-4,pkB.offsetTop+pkB.offsetHeight+14+te.offsetHeight);
}
/* Enter / Space = continue while parked (capture: before 12-input's jump key) */
if(typeof window.addEventListener==="function")window.addEventListener("keydown",function(e){
  if(state!=="pit"||e.ctrlKey||e.metaKey||e.altKey)return;
  var k=e.code;
  if(k==="Space"||k==="Enter"||k==="NumpadEnter"){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)pkGo()}
},true);

/* ---- 14 draw(): the building in front of the buggy (it drives in behind the wall) ---- */
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
/* ---- 14 draw(), after drawHud(): the pit overlay (dim, bank, title, how-to line) ---- */
function pkHud(){
  if(state!=="pit")return;
  ctx.fillStyle="rgba(5,7,13,.45)";ctx.fillRect(0,-OY,W,H+OY+OB);
  var oy=pkY(),L=pk&&pk.n?getLevelDef(pk.n):null;
  var bs="✦ "+skN(skBk());
  txt(bs,XO+VW/2,oy-34*HS,fitPx(bs,16*HS,VW-24,true,true),"#fde047","center",true,true,true,"","pkb");
  txt("UPGRADE PIT STOP",XO+VW/2,oy,fitPx("UPGRADE PIT STOP",30*HS,VW-24,true,true),OR,"center",true,true,true,"","pkt");
  var sub=L?"Tap an upgrade to buy it. Next: "+L.name:"Tap an upgrade to buy it.";
  txt(sub,XO+VW/2,oy+24*HS,fitPx(sub,13*HS,VW-24,true,false),"#e6edf7","center",true,false,true,"","pks");
}
`;
