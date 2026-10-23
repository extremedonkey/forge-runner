/* ===== LAB: DRIVE (self-driven) =====
   The player sets the speed instead of auto-run. thr = throttle factor on the base curve:
     base curve bspd: the site's speed curve (START +7 px/s per second, capped at MAXV) re-expressed as a function of
       DISTANCE driven (bspd = sqrt(START^2 + 14*dist)), so the world ramps with distance, not time. Obstacle gaps use bspd.
     speed = bspd * thr, thr in [.4, 1.4]. Gas raises thr, brake drops it hard, neither drifts back to CRUISE (engine brake).
   Risk/reward: score gain x labMul (x1 at cruise up to x2 at full throttle).
   Pressure: the FORGE PRESS (a heat wall) follows at .7 x bspd. It sits up to GMAX px behind; crawl below .7 and it closes;
   if it reaches the buggy, the run ends (shields don't help).
   Controls: keyboard Right/D = gas, Left/A = brake (Space/Up jump, Down duck as on main). Touch: GAS / BRAKE buttons,
   tap anywhere else = jump (multi-touch safe: touches on the buttons are ignored by the jump handler). */
var TMIN=.4,TMAX=1.4,CRUISE=.9,T_UP=.6,T_BRK=1.5,T_ENG=.2,T_IDLE=.3,WALLF=.7,GMAX=230;
var thr=CRUISE,bspd=START,labDist=0,labMul=1,gap=GMAX,gasK=0,brkK=0,gasT=0,brkT=0,hintT=0,heatK="",labTop=0;
var coarseQ=window.matchMedia("(pointer: coarse)");
function labTouchUI(){return coarseQ.matches||("ontouchstart" in window)}
function labStart(){
  thr=CRUISE;labDist=0;bspd=START;labMul=1;gap=GMAX;hintT=5;heatK="";labTop=0;speed=bspd*thr;
}
function labGas(){return gasK||gasT}
function labBrk(){return brkK||brkT}
function labUpd(dt){
  if(state!=="run")return;
  var g=labGas(),b=labBrk();
  if(b)thr-=T_BRK*dt;
  else if(g)thr+=T_UP*dt;
  else if(thr>CRUISE)thr=Math.max(CRUISE,thr-T_ENG*dt);
  else thr=Math.min(CRUISE,thr+T_IDLE*dt);
  thr=labClamp(thr,TMIN,TMAX);
  bspd=Math.min(MAXV,Math.sqrt(START*START+14*labDist));
  speed=bspd*thr;
  labDist+=speed*dt;
  labMul=1+Math.max(0,(thr-CRUISE)/(TMAX-CRUISE));
  labTop=Math.max(labTop,thr);
  gap=Math.min(GMAX,gap+(speed-bspd*WALLF)*dt);
  if(hintT>0)hintT-=dt;
  if(gap<=0){
    gap=0;heatK="press";
    if(!rm())sparks(PX,GY-20,24,260);
    die();
  }
}
/* touches that are not on a UI element (GAS / BRAKE buttons, mute): used by the site's tap-to-jump handlers */
function labTL(e){var n=[];for(var i=0;i<e.touches.length;i++)if(!isUI(e.touches[i].target))n.push(e.touches[i]);return n}
function labTouches(e){return labTL(e).length}
function labT0(e){return labTL(e)[0]}
/* keyboard throttle / brake */
window.addEventListener("keydown",function(e){
  var k=e.code;
  if(k==="ArrowRight"||k==="KeyD"){e.preventDefault();gasK=1;if(state!=="run"&&!e.repeat)press()}
  else if(k==="ArrowLeft"||k==="KeyA"){e.preventDefault();brkK=1}
});
window.addEventListener("keyup",function(e){
  var k=e.code;
  if(k==="ArrowRight"||k==="KeyD")gasK=0;
  else if(k==="ArrowLeft"||k==="KeyA")brkK=0;
});
window.addEventListener("blur",function(){gasK=brkK=gasT=brkT=0});
document.addEventListener("visibilitychange",function(){if(document.hidden)gasK=brkK=gasT=brkT=0});
/* touch buttons (shown on touch devices, or with ?pads=1 for testing) */
var labPads=labTouchUI()||Q.get("pads")==="1",padG=null,padB=null;
function labPad(id,label,side){
  var el=document.createElement("button");
  el.id=id;el.type="button";el.className="ui lpad";el.setAttribute("aria-label",label);
  el.innerHTML="<span>"+label+"</span><i>"+(side==="r"?"&#9654;&#9654;":"&#9632;")+"</i>";
  el.style.display="flex";
  if(side==="r")el.style.right="12px";else el.style.left="12px";
  var on=function(e){
    e.preventDefault();e.stopPropagation();
    try{el.setPointerCapture(e.pointerId)}catch(x){}
    el.classList.add("on");
    if(side==="r"){gasT=1;if(state!=="run")press()}else brkT=1;
  };
  var off=function(e){
    e.stopPropagation();el.classList.remove("on");
    if(side==="r")gasT=0;else brkT=0;
  };
  el.addEventListener("pointerdown",on);
  el.addEventListener("pointerup",off);
  el.addEventListener("pointercancel",off);
  el.addEventListener("lostpointercapture",off);
  el.addEventListener("contextmenu",function(e){e.preventDefault()});
  ["touchstart","touchend","mousedown","mouseup","click"].forEach(function(n){el.addEventListener(n,function(e){e.stopPropagation();if(n==="touchstart")e.preventDefault()},{passive:false})});
  document.body.appendChild(el);
  return el;
}
if(labPads){
  var st=document.createElement("style");
  st.textContent=".lpad{position:fixed;bottom:40px;z-index:8;width:92px;height:92px;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0;border:2px solid #22d3ee;border-radius:14px;background:rgba(5,7,13,.6);color:#e0f2fe;font:700 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;touch-action:none;-webkit-user-select:none;user-select:none;cursor:pointer}"+
    ".lpad i{font-style:normal;font-size:18px;color:#22d3ee}.lpad.on{background:rgba(34,211,238,.25);transform:scale(.96)}"+
    "#lbrk{border-color:#f97316;color:#fed7aa}#lbrk i{color:#f97316}#lbrk.on{background:rgba(249,115,22,.25)}";
  document.head.appendChild(st);
  padB=labPad("lbrk","BRAKE","l");padG=labPad("lgas","GAS","r");
}
/* HUD: speedometer (segmented throttle bar), multiplier, heat-press warning, the press itself, control hint */
function labSegCol(f){return f<.5?CY:f<.75?"#fde047":OR}
function labHud(){
  var y0=hudB(),hx=XO+14+(OY?0:52),i;
  if(OY)y0+=24*HS;
  /* the forge press: an iron wall with a molten face, drawn at PX-gap (off-screen when far), plus a heat glow on the left edge */
  if(state!=="start"){
    var wx=PX-gap,heat=1-gap/GMAX,top=-OY-4,bot=GY+OB+30;
    if(heat>.02){
      var gw=60+120*heat,gr=ctx.createLinearGradient(XO,0,XO+gw,0);
      gr.addColorStop(0,"rgba(249,115,22,"+(.55*heat).toFixed(3)+")");gr.addColorStop(1,"rgba(249,115,22,0)");
      ctx.fillStyle=gr;ctx.fillRect(XO,top,gw,bot-top);
    }
    if(wx>XO-10){
      ctx.fillStyle="#1c0f0a";ctx.fillRect(XO-30,top,wx-XO+30,bot-top);
      var ph=(scroll*.3)%24;
      for(var yy=top-24+ph;yy<bot;yy+=24){R(wx-14,Math.round(yy),10,12,"#3b1d10")}
      var fl=rm()?0:Math.sin(tt*20)*.15;
      ctx.fillStyle="rgba(249,115,22,"+(.85+fl).toFixed(2)+")";ctx.fillRect(wx-4,top,4,bot-top);
      R(wx-2,top,2,bot-top,"#fde047");
      var g2=ctx.createLinearGradient(wx,0,wx+36,0);g2.addColorStop(0,"rgba(253,224,71,.35)");g2.addColorStop(1,"rgba(253,224,71,0)");
      ctx.fillStyle=g2;ctx.fillRect(wx,top,36,bot-top);
    }
  }
  if(state==="run"||state==="over"){
    /* speedometer: 14 pixel segments TMIN..TMAX, a tick at cruise, readout = actual px/s scaled to a fake km/h */
    var N=14,sw=6*HS,sh=10*HS,gp=2*HS,f=(thr-TMIN)/(TMAX-TMIN),lit=Math.round(f*N),bw=N*(sw+gp)-gp,by=y0+8*HS;
    ctx.fillStyle="rgba(5,7,13,.6)";ctx.fillRect(hx-4,y0-12*HS,bw+8,sh+26*HS);
    txt("SPD",hx,y0,10*HS,"#94a3b8","left",true,true,true,"","lspd");
    txt(Math.round(speed*.4)+" km/h",hx+bw,y0,10*HS,"#e6edf7","right",true,true,true,"","lkmh");
    for(i=0;i<N;i++){
      var on=i<lit;
      ctx.fillStyle=on?labSegCol(i/(N-1)):"#1e293b";
      ctx.fillRect(Math.round(hx+i*(sw+gp)),Math.round(by),Math.round(sw),Math.round(sh));
    }
    var cx=hx+((CRUISE-TMIN)/(TMAX-TMIN))*N*(sw+gp)-gp/2;
    R(Math.round(cx),Math.round(by-3*HS),Math.max(1,Math.round(HS)),Math.round(sh+6*HS),"#f1f5f9");
    var mc=labMul>=1.75?OR:labMul>1.05?"#fde047":"#94a3b8";
    txt("x"+labMul.toFixed(1),hx+bw+10*HS,by+sh,16*HS,mc,"left",true,true,true,labMul>=1.75&&!rm()?OR:"","lmul");
    if(state==="run"&&labBrk())txt("BRAKE",hx,by+sh+14*HS,10*HS,OR,"left",true,true,true,"","lbk");
    else if(state==="run"&&labGas())txt("GAS",hx,by+sh+14*HS,10*HS,CY,"left",true,true,true,"","lbk");
    var heat2=1-gap/GMAX;
    if(state==="run"&&heat2>.35&&(rm()||((tt*6)|0)&1))txt("PRESS BEHIND! SPEED UP",XO+VW/2,Math.round(H*.42),fitPx("PRESS BEHIND! SPEED UP",15*HS,VW-24,true,true),OR,"center",true,true,true,rm()?"":OR,"lheat");
    if(state==="over"&&heatK==="press")txt("crushed by the forge press",XO+VW/2,(OY?Math.round(-OY*.5):Math.round(H*.28))-18*HS,fitPx("crushed by the forge press",13*HS,VW-24,true,false),"#fdba74","center",true,false,true,"","lcr");
  }
  /* control hint: first 5 s of each run, and on the start screen */
  var tch=labPads;
  if(state==="start"||(state==="run"&&hintT>0)){
    var a=state==="start"||rm()?1:Math.min(1,hintT);
    var l1=tch?"hold GAS: faster · BRAKE: slow down":"→ / D: gas   ← / A: brake",l2=tch?"tap anywhere: jump · faster = up to x2 score":"space / ↑: jump   ↓: duck   faster = up to x2 score";
    var hy2=OY?Math.round(-OY*.3):state==="start"?GY+30:Math.round(H*.55);
    ctx.globalAlpha=a;
    txt(l1,XO+VW/2,hy2,fitPx(l1,13*HS,VW-24,true,true),CY,"center",true,true,true,"","lh1");
    txt(l2,XO+VW/2,hy2+18*HS,fitPx(l2,11*HS,VW-24,true,false),"#cbd5e1","center",true,false,true,"","lh2");
    ctx.globalAlpha=1;
  }
}
/* lab-only debug probe for the headless checks (read-only snapshot) */
window.__lab=function(){return {st:state,s:Math.floor(score),v:Math.round(speed),base:Math.round(bspd),thr:+thr.toFixed(3),mul:+labMul.toFixed(2),gap:Math.round(gap),t:+runS.toFixed(1),py:Math.round(py),pads:!!labPads}};
