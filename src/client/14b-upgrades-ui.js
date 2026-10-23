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
//  - web landscape: left-aligned from x = PX+PW+12, bottom on y = 226 (logical), right edge clear of the web top-10 panel (15-*.js).
//  - Poki landscape (16:9 cover, or wider): ground band, right-aligned beside #sh, clear of the centred Retry/Continue
//    column; Retry and the Pill are never in that corner.
export default String.raw`
/* upgrade row #up (sparks PR7) */
/* Poki-submission freeze (23 Oct): only tracks whose effect is live are shown. Power Cell, Supply Drop, Forge Plate and
   Spare Core come back with sparks PR6 (restore ["m","c","d","p","r"]). */
var UPK=["m"],UPN={m:"Spark Magnet",c:"Power Cell",d:"Supply Drop",p:"Forge Plate",r:"Spare Core"};
var upE=null,upT={},upOn=false,UPLB=236;  /* UPLB: width kept free on the web for the top-10 panel (right:8px, ~220 px wide) */
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
}
function upPlace(){
  if(!upE)return;
  var ww=wrap.clientWidth,wh=wrap.clientHeight,n=UPK.length,g=6,w,h,x,y;
  var shT=Math.round((GY+10+OY)*CS),shH=Math.max(30,Math.min(48,Math.round((H-GY-16)*CS)));
  if(wh>ww){
    /* portrait: ground band, under Share */
    g=8;w=h=Math.max(44,Math.min(64,Math.floor((ww-16-(n-1)*g)/n)));
    x=Math.round((ww-n*w-(n-1)*g)/2);y=Math.max(0,Math.min(shT+shH+12,wh-6-h));
  }else if(isPoki()){
    /* Poki landscape: ground band, right of the centred column (Share 130+ px, Retry 150 px, Continue 150 px) */
    var sw=Math.max(150,shB.offsetWidth||0),x0=Math.round(ww/2+sw/2+6),av=ww-4-x0;
    g=av<5*52+24?3:6;w=Math.max(44,Math.min(64,Math.floor((av-(n-1)*g)/n)));
    h=Math.max(44,Math.min(Math.max(w,56),wh-4-shT));
    x=ww-Math.max(4,Math.min(12,av-(n*w+(n-1)*g)))-(n*w+(n-1)*g);y=Math.min(shT,wh-4-h);
  }else{
    /* web landscape: above the ground line, right of the buggy, left of the top-10 panel (always reserved; Poki has none) */
    var r=wrap.getBoundingClientRect(),vw=document.documentElement.clientWidth||window.innerWidth;
    var lim=Math.min(ww,vw-UPLB-r.left)-8;
    x=Math.round((PX+PW+12+XO)*CS);
    w=h=Math.max(44,Math.min(68,Math.round(56*CS),Math.floor((lim-x-(n-1)*g)/n)));
    y=Math.round((226+OY)*CS)-h;
  }
  var s=upE.style;s.left=x+"px";s.top=y+"px";s.gap=g+"px";
  s.setProperty("--w",w+"px");s.setProperty("--h",h+"px");
  s.setProperty("--i",(Math.min(w,h)>=50?21:14)+"px");
  s.setProperty("--pf",Math.max(8,Math.min(11,Math.round(h*.15)))+"px");
  s.setProperty("--cf",Math.max(11,Math.min(15,Math.round(h*.21)))+"px");
}
/* ---- input (sparks PR8) ---- */
var upVis=false,upRaf=0,upBoot=false;
function upCheap(){var m=null;for(var i=0;i<UPK.length;i++){var c=skCost(UPK[i]);if(c!==null&&(m===null||c<m))m=c}return m}
function upFx(k,lv){
  var e=SKU[k]&&SKU[k].e;
  if(k==="m")return e[lv-1]+"px";
  if(k==="c")return "+"+e[0]+"s";
  if(k==="d")return "×"+e[lv-1];
  if(k==="p")return ["🛡","2.0s","↻"][lv-1]||"🛡";
  return "❤+1";
}
function upAnim(b,c){b.classList.remove(c);void b.offsetWidth;b.classList.add(c);setTimeout(function(){b.classList.remove(c)},450)}
function upTap(k){
  if(!upVis||!upOk())return;
  var t=upT[k];if(!t)return;
  if(skCost(k)===null)return;
  if(skBuy(k)){
    upSync();
    if(!rm()){
      upAnim(t.b,"buy");
      var f=document.createElement("span");f.className="fx";f.textContent=upFx(k,skLv(k));t.b.appendChild(f);
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
  if(!upOk())return;
  if((typeof demo!=="undefined"&&demo)||(typeof tpu!=="undefined"&&tpu))return;
  if(state==="start"){var c=upCheap();if(c===null||sk.b<c||(typeof chal!=="undefined"&&chal))return}
  if(!upE){upBuild();for(var i=0;i<UPK.length;i++)upGuard(upT[UPK[i]].b,UPK[i])}
  upSync();upE.classList.remove("in");upVis=false;upE.style.display="flex";upOn=true;upPlace();
  if(!upRaf)upRaf=requestAnimationFrame(upTick);
}
function upHide(){upOn=false;upVis=false;if(upRaf){cancelAnimationFrame(upRaf);upRaf=0}if(upE){upE.classList.remove("in");upE.style.display="none"}}
/* start screen: show the row at boot when the bank already covers a tile (16-loop.js boots after this fragment) */
if(typeof state!=="undefined"&&state==="start"&&typeof document!=="undefined")setTimeout(function(){if(state==="start")upShow()},0);
`;
