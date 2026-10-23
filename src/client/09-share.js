// SHARE: share button, name prompt, share text/link (PUBLIC_URL, UTM-free), clipboard fallback. Interface: placeShare(), doShare(), toast(s), dayN().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* share */
var shB=document.getElementById("sh"),np=document.getElementById("np"),ni=document.getElementById("ni"),ng=document.getElementById("ng"),toastE=document.getElementById("toast"),toT=0;
function placeShare(){
  var sk=ZM>1?PZ/ZM:1;  /* portrait look-ahead zoom (PZW 1.12): keep the button's CSS size of the old 1.35 zoom (PZ) */
  shB.style.top=Math.round((GY+10+OY)*CS)+"px";
  shB.style.height=Math.max(30,Math.min(48,Math.round((H-GY-16)*CS*sk)))+"px";
  shB.style.fontSize=Math.max(13,Math.min(19,Math.round(15*CS*sk)))+"px";
}
function toast(s){
  toastE.textContent=s;toastE.style.display="block";
  clearTimeout(toT);toT=setTimeout(function(){toastE.style.display="none"},1600);
}
function dayN(){return Math.max(1,Math.floor((Date.now()+288e5-Date.UTC(2026,9,23))/864e5)+1)}
function copy(s){
  function old(){
    var t=document.createElement("textarea"),r=false;
    t.value=s;t.setAttribute("readonly","");t.style.position="fixed";t.style.opacity="0";
    document.body.appendChild(t);t.select();
    try{r=document.execCommand("copy")}catch(e){}
    document.body.removeChild(t);
    toast(r?"Copied!":"Copy failed");
  }
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(function(){toast("Copied!")},old);
  else old();
}
function doShare(){
  var me=nm(lsg(NK)),sc=Math.max(1,Math.min(99999,lastS));
  var url=PUBLIC_URL+"/?c="+sc+(me?"&n="+encodeURIComponent(me):"");
  var text="Forge Runner · day "+dayN()+" · "+lastS+" 🔥 beat me";
  track("share",lastS);
  if(navigator.share){
    navigator.share({text:text,url:url}).catch(function(e){if(!e||e.name!=="AbortError")copy(text+" "+url)});
  }else copy(text+" "+url);
}
function nameGo(){
  lss(NK,nm(ni.value));np.style.display="none";ni.blur();doShare();
}
shB.addEventListener("click",function(){
  shB.blur();
  if(lsg(NK)===null){np.style.display="flex";ni.value="";ni.focus()}
  else doShare();
});
ng.addEventListener("click",nameGo);
ni.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();nameGo()}});

`;
