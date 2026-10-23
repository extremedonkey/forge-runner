// UPGRADES UI (owner: Mobile, sparks PR7/PR8): the between-runs upgrade row #up (SPEC §3).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 14-render.js (SKI icons from 05-sprites.js, sparks core from 06b-sparks.js); the Poki-only fragment
// (poki/mobile.js: #rt Retry, #cn Continue) is joined after this one, so nothing here touches it at load time.
// PR7: the row's DOM (built lazily on the first upShow(), so with SKON off there is no element and no listener),
// tile states (affordable / too expensive / maxed), placement, re-place on every fit() (ResizeObserver on #wrap).
// PR8: input. Tap a tile = buy (skBuy), can't afford = shake + sfxNoBuy(); keys 1-5 buy; every pointer/touch/mouse event on a
// tile is stopped (the leaderboard guard() pattern) and tiles are buttons, so isUI() keeps them away from press(): a tile tap
// never retries, a tap anywhere else still does. The row fades in 300 ms after death, shows on the start screen only when the
// bank covers the cheapest tile (and no challenge link), and is hidden while state is "run" or an ad break is up (ads.busy);
// a small rAF watcher runs only while the row is up. The cheapest affordable tile gets a bobbing hint; a buy floats its
// effect numeral (e.g. +1.5s, 170px, heart+1).
// Placement (SPEC §3; all in #wrap CSS px, from the same GY/OY/CS that fit()/placeShare() use):
//  - portrait (web and Poki): centred in the ground band, 12 px below #sh (Share).
//  - landscape: always in the ground band below the ground line, never over the buggy, obstacles or sparks (fix after PR8).
//    Web: left of #sh (the top-10 panel is on the right). Poki (16:9 cover, or wider): right of the centred
//    Share/Retry/Continue column; the Pill and mute are on the left.
// Tiles are opaque; the row is never shown while state is "run" (upShow() refuses, the watcher hides it).
export default String.raw`
/* upgrade row #up (sparks PR7) */
var UPK=["m","c","d","p","r"],UPN={m:"Spark Magnet",c:"Power Cell",d:"Supply Drop",p:"Forge Plate",r:"Spare Core"};
var upE=null,upT={},upOn=false,upNE=null;
function upOk(){return typeof document!=="undefined"&&typeof wrap!=="undefined"&&typeof SKON!=="undefined"&&!!SKON&&typeof SKU!=="undefined"&&typeof sk!=="undefined"&&!!sk&&typeof skCost==="function"&&Object.keys(SKU).length>0}
function upIcon(k){
  var c=document.createElement("canvas"),d=typeof SKI!=="undefined"?SKI[k]:null;c.width=c.height=7;c.className="ic";
  if(d){var x=c.getContext("2d");for(var j=0;j<d.i.length;j++)for(var i=0;i<d.i[j].length;i++){var f=d.p[d.i[j][i]];if(f){x.fillStyle=f;x.fillRect(i,j,1,1)}}}
  return c;
}
function upBuild(){
  upE=document.createElement("div");upE.id="up";upE.className="ui";
  upE.setAttribute("role","group");upE.setAttribute("aria-label","Upgrades");
  for(var i=0;i<UPK.length;i++){
    var k=UPK[i],b=document.createElement("button"),pp=document.createElement("span"),co=document.createElement("span");
    b.type="button";b.className="ut";b.setAttribute("data-k",k);pp.className="pp";co.className="co";
    b.appendChild(upIcon(k));b.appendChild(pp);b.appendChild(co);upE.appendChild(b);
    upT[k]={b:b,pp:pp,co:co};
  }
  /* game-over nudge (sparks polish): "You can buy X!", a child of the row so it shares its fade and visibility */
  upNE=document.createElement("div");upNE.className="un";upNE.setAttribute("aria-live","polite");upE.appendChild(upNE);
  wrap.appendChild(upE);
  /* re-place after every fit(): fit() resizes #wrap (and sets CS/OY with it), so a ResizeObserver on #wrap follows
     rotation, window resize and the visual viewport without a second resize listener or a 10-layout.js edit */
  if(typeof ResizeObserver==="function")new ResizeObserver(function(){if(upOn)upPlace()}).observe(wrap);
}
/* tile states from the save: pips, cost, affordable (ok) / too expensive (no) / maxed (mx) */
function upSync(){
  if(!upE)return;
  for(var i=0;i<UPK.length;i++){
    var k=UPK[i],t=upT[k],u=SKU[k],mx=u&&u.c?u.c.length:0,lv=skLv(k),c=skCost(k),s="";
    for(var j=0;j<mx;j++)s+=j<lv?"●":"○";
    t.pp.textContent=s;t.co.textContent=c===null?"":"✦"+c;
    t.b.className="ut "+(c===null?"mx":sk.b>=c?"ok":"no");
    t.b.setAttribute("aria-label",UPN[k]+", level "+lv+" of "+mx+(c===null?", maxed":", costs "+c+" sparks"));
  }
  upHint();
}
function upHint(){
  var best=null,bc=0;
  for(var i=0;i<UPK.length;i++){var k=UPK[i],c=skCost(UPK[i]);upT[k].b.classList.remove("hint");if(c!==null&&sk.b>=c&&(best===null||c<bc)){best=k;bc=c}}
  if(best)upT[best].b.classList.add("hint");
  upNudge(best);
}
/* "You can buy X!" on the game-over screen: the hinted (cheapest affordable) track, or Dev's skNudge() if it exists (a key, or
   an object with .k). Placed by upNPlace() beside / below the row, in the ground band, so never over the buggy or obstacles. */
function upNudge(b){
  if(!upNE)return;
  var r=state!=="over"?null:typeof skNudge==="function"?skNudge():b,k=r&&typeof r==="object"?r.k:r;
  upNE.textContent=k&&UPN[k]&&UPK.indexOf(k)>=0?"You can buy "+UPN[k]+"!":"";
  upNPlace();
}
function upNPlace(){
  if(!upNE)return;
  var e=upNE.style;e.display=upNE.textContent?"block":"none";if(!upNE.textContent)return;
  var ww=wrap.clientWidth,wh=wrap.clientHeight,rl=upE.offsetLeft,rt=upE.offsetTop,rw=upE.offsetWidth,rh=upE.offsetHeight;
  e.left=e.right=e.top=e.bottom=e.transform=e.width="";e.whiteSpace="nowrap";
  var tw=upNE.offsetWidth,th=upNE.offsetHeight,pk=isPoki(),sw=Math.max(pk?150:130,shB.offsetWidth||0);
  /* landscape: beside the row on the side away from the centred Share/Retry column, when it fits; else below the row */
  var side=wh>ww?0:pk?rl-8-(ww/2+sw/2+6):(ww/2-sw/2-6)-(rl+rw)-8;
  /* landscape with the 5-tile row next to Share: on the far side of the Share column instead (wrapped onto 2 lines if narrow) */
  var far=wh>ww||side>=tw?0:Math.floor(ww/2-sw/2-16);
  if(wh<=ww&&side<tw&&side>=96){e.whiteSpace="normal";e.width=Math.floor(side)+"px";tw=side}
  else if(far>=96&&far<tw){e.whiteSpace="normal";e.width=far+"px";tw=far}
  if(wh<=ww&&side>=tw){e.top="50%";e.transform="translateY(-50%)";if(pk)e.right="calc(100% + 8px)";else e.left="calc(100% + 8px)"}
  else if(far>=96){e.top="50%";e.transform="translateY(-50%)";if(pk)e.right=Math.round(rl+rw-(ww/2-sw/2-8))+"px";else e.left=Math.round(ww/2+sw/2+8-rl)+"px"}
  else if(rt+rh+6+th<=wh-2){e.top="calc(100% + 6px)";e.left="50%";e.transform="translateX(-50%)"}
  else e.display="none";
}
function upPlace(){
  if(!upE)return;
  var ww=wrap.clientWidth,wh=wrap.clientHeight,n=0,g=6,w,h,x,y;
  /* size and centre on the tiles actually shown (a build may hide some with display:none) */
  for(var i=0;i<UPK.length;i++)if(upT[UPK[i]]&&getComputedStyle(upT[UPK[i]].b).display!=="none")n++;
  n=Math.max(1,n);
  var shT=Math.round((GY+10+OY)*CS),shH=Math.max(30,Math.min(48,Math.round((H-GY-16)*CS)));
  if(wh>ww){
    /* portrait: ground band, under Share */
    g=8;w=h=Math.max(44,Math.min(64,Math.floor((ww-16-(n-1)*g)/n)));
    x=Math.round((ww-n*w-(n-1)*g)/2);y=Math.max(0,Math.min(shT+shH+12,wh-6-h));
  }else{
    /* landscape: the ground band under the ground line (y >= GY+10, the top of Share), so the row never covers the buggy,
       obstacles or sparks (all at or above GY). Beside the centred column: on the web left of Share (the top-10 panel is on
       the right); on Poki right of Share/Retry/Continue (150 px wide; the Pill and mute are on the left) */
    var pk=isPoki(),sw=Math.max(pk?150:130,shB.offsetWidth||0),av=Math.round(ww/2-sw/2-6)-4;
    g=av<5*52+24?3:6;w=Math.max(44,Math.min(64,Math.floor((av-(n-1)*g)/n)));
    h=Math.max(44,Math.min(Math.max(w,56),wh-4-shT));
    var rw=n*w+(n-1)*g,m=Math.max(4,Math.min(12,av-rw));
    x=pk?ww-m-rw:m;y=Math.max(shT,Math.min(shT+Math.round((wh-shT-h)/2-2),wh-4-h));
  }
  var s=upE.style;s.left=x+"px";s.top=y+"px";s.gap=g+"px";
  s.setProperty("--w",w+"px");s.setProperty("--h",h+"px");
  s.setProperty("--i",(Math.min(w,h)>=50?21:14)+"px");
  s.setProperty("--pf",Math.max(8,Math.min(11,Math.round(h*.15)))+"px");
  s.setProperty("--cf",Math.max(11,Math.min(15,Math.round(h*.21)))+"px");
  upNPlace();
}
/* ---- input (sparks PR8) ---- */
var upVis=false,upRaf=0,upBoot=false;
function upCheap(){var m=null;for(var i=0;i<UPK.length;i++){var c=skCost(UPK[i]);if(c!==null&&(m===null||c<m))m=c}return m}
function upNum(k,lv){  /* buy numeral text (not the in-run upFx(k) hook) */
  var e=SKU[k]&&SKU[k].e;
  if(k==="m")return e[lv-1]+"px";
  if(k==="c")return "+"+e[0]+"s";
  if(k==="d")return "×"+e[lv-1];
  if(k==="p")return ["🛡","2.0s","↻"][lv-1]||"🛡";
  return "❤+1";
}
/* ---- purchase jackpot: tile burst, bank count-down (14-render.js skBk), toast ---- */
/* toast text per track and level (only the Magnet is shown for now); other tracks fall back to "<name> Lv<n>!" */
var UPMS={
  m:["Magnet Lv1! Sparks fly to you","Magnet Lv2! Wider pull","Magnet Lv3! Wider pull","Magnet Lv4! Huge pull","Magnet Lv5! Max pull"],
  c:["Power Cell Lv1! Power-ups last longer","Power Cell Lv2! Even longer","Power Cell Lv3! Even longer","Power Cell Lv4! Even longer","Power Cell Lv5! Max power"],
  d:["Supply Drop Lv1! More power-ups","Supply Drop Lv2! More power-ups","Supply Drop Lv3! More power-ups","Supply Drop Lv4! Max supply"],
  p:["Forge Plate Lv1! Start with a shield","Forge Plate Lv2! Longer safe time","Forge Plate Lv3! Shield re-forges"],
  r:["Spare Core Lv1! Survive one extra hit","Spare Core Lv2! Survive two extra hits"]
};
function upMsg(k,lv){var a=UPMS[k];return a&&a[lv-1]?a[lv-1]:(UPN[k]||"Upgrade")+" Lv"+lv+"!"}
var upTE=null,upTT=0;
/* toast clearance (all layouts): the toast's whole animated box (scale 1.15 at the pop, rising to -112%) must stay >= 8 px clear of
   Share, Retry, the rewarded Continue/Double buttons (also while still hidden behind their lockout: their spot is known), the row plus the room its
   rising numeral needs, the nudge, (Poki) the Pill, the note band under the Score line and the Levels HUD marker. Start at the preferred spot ty0, then search up, then down, 2 px steps. */
function upTRects(tight){
  var W0=wrap.getBoundingClientRect(),o=[],ww=wrap.clientWidth,i,e,r;
  function add(x0,y0,x1,y1){if(x1>x0&&y1>y0)o.push([x0,y0,x1,y1])}
  function el(n){if(!n)return;r=n.getBoundingClientRect();if(r.width)add(r.left-W0.left,r.top-W0.top,r.right-W0.left,r.bottom-W0.top)}
  el(typeof shB!=="undefined"?shB:null);
  if(upE&&upE.offsetWidth){r=upE.getBoundingClientRect();add(r.left-W0.left,r.top-W0.top-(tight?12:46),r.right-W0.left,r.bottom-W0.top);el(upNE)}   /* 46 px headroom over the row (tight: just the BUY! badge, upTBest) */
  var rt=document.getElementById("rt");
  if(rt){var rtt=parseInt(rt.style.top,10);if(rtt>0){var rw=Math.max(170,rt.offsetWidth);add(ww/2-rw/2,rtt,ww/2+rw/2,rtt+48);
    if(document.querySelector("#wrap>.rw"))add(ww/2-68,rtt+58,ww/2+68,rtt+102)}}
  el(document.getElementById("cn"));el(document.getElementById("db"));
  if(isPoki())add(-W0.left,24-W0.top,46-W0.left,86-W0.top);
  /* canvas areas: the band just under the game-over Score line (kept free for a one-line note such as Dev's RESCUE
     "Practice run, not ranked", ~22*HS) and Levels' HUD marker (lvHud(), drawn at lvHudY() in runs; reserved anyway) */
  var C0=cv.getBoundingClientRect(),cx=C0.left-W0.left,cy=C0.top-W0.top,oyU=OY?Math.round(-OY*.5):Math.round(H*.28),hw=Math.min(ww/2,230);
  add(ww/2-hw,cy+(oyU+32*HS+OY)*CS,ww/2+hw,cy+(oyU+54*HS+OY)*CS);
  if(typeof lvHudY==="function"){var ly=lvHudY();add(cx+14*CS,cy+(ly+OY)*CS,cx+(14+68*HS)*CS,cy+(ly+12*HS+OY)*CS)}
  /* landscape/desktop game over: the mission chip row (edges recorded by 10-layout.js as Missions draws it; full width, the row is
     centred) and, on the site, the canvas text block from the ✦ line down to "tap to retry" (+14*HS for RESCUE's nudge). Portrait
     keeps its own placement (unchanged); Poki landscape has Retry in that band. */
  if(state==="over"&&!upTP()){
    if(typeof ovChipB==="number"&&ovChipB>0&&performance.now()-ovChipT<1000)add(0,ovChipY-W0.top,ww,ovChipB-W0.top);
    if(!isPoki())add(0,cy+(oyU-48*HS+OY)*CS,ww,cy+(oyU+((chal?78:60)+19)*HS+OY)*CS);
  }
  return o;
}
function upTP(){return OY>0&&wrap.clientHeight>wrap.clientWidth}   /* portrait layout (same test as upToast) */
/* returns the toast's top, or null (only when nul) if no clear spot exists */
function upTClear(ty0,nul){
  var th=upTE.offsetHeight,tw=Math.min(upTE.offsetWidth,wrap.clientWidth*.96)*1.15,ww=wrap.clientWidth,wh=wrap.clientHeight,o=upTRects();
  var x0=ww/2-tw/2,x1=ww/2+tw/2,M=8;
  function ok(ty){var t=ty-1.12*th,b=ty+.075*th;if(t<4||b>wh-4)return false;
    for(var i=0;i<o.length;i++){var q=o[i];if(x0<q[2]+M&&x1>q[0]-M&&t<q[3]+M&&b>q[1]-M)return false}return true}
  if(ok(ty0))return ty0;
  for(var d=2;d<wh;d+=2){if(ok(ty0-d))return ty0-d;if(ty0-d-1.12*th<4)break}
  for(d=2;d<wh;d+=2){if(ok(ty0+d))return ty0+d;if(ty0+d>wh)break}
  return nul?null:ty0;
}
/* landscape/desktop, no spot >= 8 px clear even at 16 px: the y with the most clearance to the listed rects (Poki landscape short
   screens: the band between Retry and the upgrade row, counting only the row's BUY! badge above it), instead of the preferred y
   on top of whatever is there */
function upTBest(ty0){
  var th=upTE.offsetHeight,tw=Math.min(upTE.offsetWidth,wrap.clientWidth*.96)*1.15,ww=wrap.clientWidth,wh=wrap.clientHeight,o=upTRects(1);
  var x0=ww/2-tw/2,x1=ww/2+tw/2,ty,i,q,m,t,b,best=-1e9,by=ty0;
  for(ty=Math.ceil(4+1.12*th);ty+.075*th<=wh-4;ty+=2){t=ty-1.12*th;b=ty+.075*th;m=1e9;
    for(i=0;i<o.length;i++){q=o[i];if(x0<q[2]&&x1>q[0])m=Math.min(m,Math.max(q[1]-b,t-q[3]))}
    if(m>best){best=m;by=ty}}
  return by;
}
function upToast(s){
  if(!upTE){upTE=document.createElement("div");upTE.id="upt";upTE.setAttribute("aria-live","polite");wrap.appendChild(upTE)}
  var ww=wrap.clientWidth;upTE.textContent=s;
  upTE.style.fontSize=Math.max(16,Math.min(30,Math.floor((ww-32)/(s.length*.68))))+"px";
  var ty=Math.max(26,(upE?upE.offsetTop:wrap.clientHeight*.6)-30);
  /* portrait (Playtest PR-40): the toast's bottom edge goes up into the sky, off Share and the rising numeral (both in the ground
     band). Web: 8 px above the game-over ✦ line (the top-10 panel fills the sky lower down). Poki: centred in the empty sky between
     the Retry button and the ground (the Poki mission chips and the HUD sit above GAME OVER). Every layout then goes through upTClear(). */
  if(OY>0&&wrap.clientHeight>wrap.clientWidth){var th=upTE.offsetHeight,gy=Math.round((GY+OY)*CS),rb=document.getElementById("rt");
    rb=rb&&rb.offsetHeight?rb.offsetTop+rb.offsetHeight:gy-2*th-24;
    ty=Math.max(th+8,isPoki()?Math.round((rb+gy+th)/2):Math.round((OY*.5-47*HS)*CS)-8)}
  /* landscape/desktop: when no spot is clear at this size (short screens: chips, text block, row), step the font down to 16 px */
  var fs=parseInt(upTE.style.fontSize,10),y=upTClear(ty,!upTP());
  while(y===null&&fs>16){fs=Math.max(16,fs-2);upTE.style.fontSize=fs+"px";y=upTClear(ty,true)}
  upTE.style.top=(y===null?upTBest(ty):y)+"px";
  upTE.classList.remove("on");void upTE.offsetWidth;upTE.classList.add("on");
  clearTimeout(upTT);upTT=setTimeout(function(){upTE.classList.remove("on")},1600);
}
function upBurst(b){
  /* 16 sparks fly out of the tile centre on fixed angles (deterministic, no RNG); removed after the 0.7 s animation */
  var d=document.createElement("div"),i;d.className="upb";
  d.style.left=(upE.offsetLeft+b.offsetLeft+b.offsetWidth/2)+"px";d.style.top=(upE.offsetTop+b.offsetTop+b.offsetHeight/2)+"px";
  for(i=0;i<16;i++){
    var s=document.createElement("i"),a=i*Math.PI/8+(i&1?.2:0),r=i&1?44:72;
    s.style.setProperty("--x",Math.round(Math.cos(a)*r)+"px");s.style.setProperty("--y",Math.round(Math.sin(a)*r-14)+"px");
    d.appendChild(s);
  }
  wrap.appendChild(d);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},750);
}
function upAnim(b,c){b.classList.remove(c);void b.offsetWidth;b.classList.add(c);setTimeout(function(){b.classList.remove(c)},450)}
function upTap(k){
  if(!upVis||!upOk())return;
  var t=upT[k];if(!t)return;
  if(skCost(k)===null)return;
  var b0=Math.floor(+sk.b||0);
  if(skBuy(k)){
    upSync();
    var lv=skLv(k);
    skCDf=b0;skCDt=rm()?0:performance.now();
    if(typeof sfxSpark==="function")sfxSpark();  /* extra sparkle on top of sfxBuy's clang + arpeggio */
    upToast(upMsg(k,lv));
    if(!rm()){
      upBurst(t.b);
      upAnim(t.b,"buy");
      var f=document.createElement("span");f.className="fx";f.textContent=upNum(k,skLv(k));t.b.appendChild(f);
      setTimeout(function(){if(f.parentNode)f.parentNode.removeChild(f)},900);
    }
  }else{if(!rm())upAnim(t.b,"shk");if(typeof sfxNoBuy==="function")sfxNoBuy()}
}
function upGuard(b,k){
  ["pointerdown","pointerup","touchstart","touchend","mousedown","mouseup","click"].forEach(function(n){
    b.addEventListener(n,function(e){e.stopPropagation();if(n==="click"){b.blur();upTap(k)}});
  });
}
/* keys 1-5 buy while the row is up; registered before the Poki "any key starts" handler, so a digit only buys */
if(typeof window.addEventListener==="function")window.addEventListener("keydown",function(e){
  if(!upVis||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  var m=/^(?:Digit|Numpad)([1-5])$/.exec(e.code||"");if(!m||!UPK[+m[1]-1])return;
  e.preventDefault();e.stopImmediatePropagation();upTap(UPK[+m[1]-1]);
});
/* watcher: fade-in 300 ms after death, hidden during ads.busy, gone once a run starts (start() also calls upHide()) */
function upTick(){
  upRaf=0;if(!upOn||!upE)return;
  if(state==="run"){upHide();return}
  var busy=typeof ads!=="undefined"&&ads&&!!ads.busy,v=!busy&&(state!=="over"||performance.now()-deathAt>=300);
  if(v!==upVis){upVis=v;upE.classList.toggle("in",v)}
  upRaf=requestAnimationFrame(upTick);
}
function upShow(){
  if(!upOk()||state==="run")return;
  if((typeof demo!=="undefined"&&demo)||(typeof tpu!=="undefined"&&tpu))return;
  if(state==="start"){var c=upCheap();if(c===null||sk.b<c||(typeof chal!=="undefined"&&chal))return}
  if(!upE){upBuild();for(var i=0;i<UPK.length;i++)upGuard(upT[UPK[i]].b,UPK[i])}
  upSync();upE.classList.remove("in");upVis=false;upE.style.display="flex";upOn=true;upPlace();
  if(!upRaf)upRaf=requestAnimationFrame(upTick);
}
function upHide(){if(upTE){clearTimeout(upTT);upTE.classList.remove("on")}upOn=false;upVis=false;if(upRaf){cancelAnimationFrame(upRaf);upRaf=0}if(upE){upE.classList.remove("in");upE.style.display="none"}}
/* start screen: show the row at boot when the bank already covers a tile (16-loop.js boots after this fragment) */
if(typeof state!=="undefined"&&state==="start"&&typeof document!=="undefined")setTimeout(function(){if(state==="start")upShow()},0);
`;
