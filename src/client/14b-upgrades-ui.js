// UPGRADES UI (owner: Mobile, sparks PR7/PR8; pit-only since 25 Oct 2026): the upgrade cards #up, shown ONLY inside a pit stop.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 14-render.js (SKI icons from 05-sprites.js, sparks core from 06b-sparks.js) and before 14c-pitstop.js, which opens
// the row (upShow) while state is "pit", lays it out (pkRow), adds the card text (pkTx) and places the buy toast (pkToastY).
// Reece (25 Oct 2026): upgrades are bought only at pit stops, so there is no row on the start screen or at game over.
// DOM built lazily on the first upShow() (with SKON off there is no element and no listener). Tile states: affordable (ok) /
// too expensive (no) / maxed (mx); the cheapest affordable tile gets a bobbing BUY! hint.
// Input: tap a tile = buy (skBuy), can't afford = shake + sfxNoBuy(); keys 1-7 buy; every pointer/touch/mouse event on a tile is
// stopped and tiles are buttons, so isUI() keeps them away from press(). A buy floats its effect numeral, bursts sparks, counts
// the bank down (14-render.js skBk) and toasts "<Track> LvN! ...". Hidden during an ad break (ads.busy).
export default String.raw`
/* upgrade cards #up (sparks PR7; pit stop only) */
var UPK=typeof SKKEYS!=="undefined"?SKKEYS.slice():["m","c","d","p","r"],UPN={m:"Spark Magnet",c:"Power Cell",d:"Supply Drop",p:"Forge Plate",r:"Spare Core",h:"Heavy Cart",t:"Tractor"};
var upE=null,upT={},upOn=false;
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
  /* re-place after every fit() (rotation, window resize, visual viewport): a ResizeObserver on #wrap */
  if(typeof ResizeObserver==="function")new ResizeObserver(function(){if(upOn)upPlace()}).observe(wrap);
}
/* tile states: pips, cost, affordable (ok) / too expensive (no) / maxed (mx) */
function upSync(){
  if(!upE)return;
  for(var i=0;i<UPK.length;i++){
    var k=UPK[i],t=upT[k],u=SKU[k],mx=u&&u.c?u.c.length:0,lv=skLv(k),c=skCost(k),s="";
    for(var j=0;j<mx;j++)s+=j<lv?"●":"○";
    t.pp.textContent=s;t.co.textContent=c===null?"":"✦"+c;
    t.b.className="ut "+(c===null?"mx":sk.b>=c?"ok":"no");
    t.b.setAttribute("aria-label",UPN[k]+", level "+lv+" of "+mx+(c===null?", maxed":", costs "+c+" sparks"));
  }
  typeof pkTx==="function"&&pkTx();  /* PIT STOP (14c): card name + description */
  upHint();
}
/* the cheapest affordable tile gets the BUY! hint */
function upHint(){
  var best=null,bc=0;
  for(var i=0;i<UPK.length;i++){var k=UPK[i],c=skCost(UPK[i]);upT[k].b.classList.remove("hint");if(c!==null&&sk.b>=c&&(best===null||c<bc)){best=k;bc=c}}
  if(best)upT[best].b.classList.add("hint");
}
/* layout is the pit's (14c pkRow: cards centred under the overlay title, stacked list on narrow screens) */
function upPlace(){if(upE&&typeof pkRow==="function")pkRow()}
/* ---- input (sparks PR8) ---- */
var upVis=false,upRaf=0;
function upNum(k,lv){  /* buy numeral text */
  var e=SKU[k]&&SKU[k].e;
  if(k==="m")return e[lv-1]+"px";
  if(k==="c")return "+"+e[0]+"s";
  if(k==="d")return "×"+e[lv-1];
  if(k==="p")return ["🛡","2.0s","↻"][lv-1]||"🛡";
  if(k==="h")return ["STOMP","ROLL","RAM"][lv-1]||"STOMP";
  if(k==="t")return ["+1.5s","×2","4s"][lv-1]||"+1.5s";
  return "❤+1";
}
/* ---- purchase jackpot: tile burst, bank count-down (14-render.js skBk), toast ---- */
/* toast text per track and level (only the Magnet is shown for now); other tracks fall back to "<name> Lv<n>!" */
var UPMS={
  m:["Magnet Lv1! Sparks fly to you","Magnet Lv2! Wider pull","Magnet Lv3! Wider pull","Magnet Lv4! Huge pull","Magnet Lv5! Max pull"],
  c:["Power Cell Lv1! Power-ups last longer","Power Cell Lv2! Even longer","Power Cell Lv3! Even longer","Power Cell Lv4! Even longer","Power Cell Lv5! Max power"],
  d:["Supply Drop Lv1! More power-ups","Supply Drop Lv2! More power-ups","Supply Drop Lv3! More power-ups","Supply Drop Lv4! Max supply"],
  p:["Forge Plate Lv1! Start with a shield","Forge Plate Lv2! Longer safe time","Forge Plate Lv3! Shield re-forges"],
  r:["Spare Core Lv1! Survive one extra hit","Spare Core Lv2! Survive two extra hits"],
  h:["Heavy Cart Lv1! Stomp on bugs","Heavy Cart Lv2! Stomp rollers too","Heavy Cart Lv3! Ram through bugs"],
  t:["Tractor Lv1! Longer blade","Tractor Lv2! Scrap pays double","Tractor Lv3! Start ploughing"]
};
function upMsg(k,lv){var a=UPMS[k];return a&&a[lv-1]?a[lv-1]:(UPN[k]||"Upgrade")+" Lv"+lv+"!"}
var upTE=null,upTT=0;
/* buy toast: under Continue in the pit (14c pkToastY), else mid-screen */
function upToast(s){
  if(!upTE){upTE=document.createElement("div");upTE.id="upt";upTE.setAttribute("aria-live","polite");wrap.appendChild(upTE)}
  var ww=wrap.clientWidth;upTE.textContent=s;
  upTE.style.fontSize=Math.max(16,Math.min(30,Math.floor((ww-32)/(s.length*.68))))+"px";
  var y=typeof pkToastY==="function"?pkToastY(upTE):null;
  upTE.style.top=(y===null?Math.round(wrap.clientHeight*.5):y)+"px";
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
/* keys 1-7 buy while the cards are up; registered before the Poki "any key starts" handler, so a digit only buys */
if(typeof window.addEventListener==="function")window.addEventListener("keydown",function(e){
  if(!upVis||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  var m=/^(?:Digit|Numpad)([1-7])$/.exec(e.code||"");if(!m||!UPK[+m[1]-1])return;
  e.preventDefault();e.stopImmediatePropagation();upTap(UPK[+m[1]-1]);
});
/* watcher: shown only while parked in a pit, hidden during an ad break (ads.busy) */
function upTick(){
  upRaf=0;if(!upOn||!upE)return;
  if(state!=="pit"){upHide();return}
  var v=!(typeof ads!=="undefined"&&ads&&!!ads.busy);
  if(v!==upVis){upVis=v;upE.classList.toggle("in",v)}
  upRaf=requestAnimationFrame(upTick);
}
/* 14c pkEnter(): open the cards (only in a pit; never in demo or ?pu= runs) */
function upShow(){
  if(!upOk()||state!=="pit")return;
  if((typeof demo!=="undefined"&&demo)||(typeof tpu!=="undefined"&&tpu))return;
  if(!upE){upBuild();for(var i=0;i<UPK.length;i++)upGuard(upT[UPK[i]].b,UPK[i])}
  upSync();upE.classList.remove("in");upVis=false;upE.style.display="flex";upOn=true;upPlace();
  if(!upRaf)upRaf=requestAnimationFrame(upTick);
}
function upHide(){if(upTE){clearTimeout(upTT);upTE.classList.remove("on")}upOn=false;upVis=false;if(upRaf){cancelAnimationFrame(upRaf);upRaf=0}if(upE){upE.classList.remove("in");upE.style.display="none"}}
`;
