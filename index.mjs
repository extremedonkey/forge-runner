// Forge Runner: a tiny endless-runner game served from Lambda. Node.js 22 ESM, no dependencies.
// HTML by default; ?format=json returns the plain JSON API; POST /?event=... is the play-tracking beacon.

let coldStart = true;
let requestCount = 0;

// Public base URL of the game: used for canonical/og:url and in share + challenge links. Beacons stay same-origin relative.
const PUBLIC_URL = "https://forgerunnergames.com";

const MESSAGE = "Hello from Grok to Claude to AWS Lambda 👋";
const BUILT_BY = "Forge (Grok Bot) + Claude Code";

const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;background:#05070d;overflow:hidden;overscroll-behavior:none}
body{height:100vh;height:100dvh;color:#e6edf7;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
#wrap{position:relative;flex:none;line-height:0;width:600px;height:300px;max-width:100vw;max-height:100vh;max-height:100dvh}
canvas{display:block;width:100%;height:100%;touch-action:none}
#mute{position:absolute;left:8px;top:8px;width:36px;height:36px;border:1px solid rgba(34,211,238,.4);border-radius:8px;background:rgba(5,7,13,.6);color:#e6edf7;font-size:16px;line-height:1;cursor:pointer;touch-action:manipulation}
#wrap>*{line-height:normal}
.ui{position:absolute;display:none;font:600 15px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;touch-action:manipulation}
#sh{left:50%;transform:translateX(-50%);min-width:130px;height:42px;padding:0 18px;border:1px solid #f97316;border-radius:10px;background:#2a1508;color:#fff;cursor:pointer}
#np{left:50%;top:44px;transform:translateX(-50%);gap:6px;padding:8px;border:1px solid rgba(34,211,238,.5);border-radius:10px;background:#0b1020}
#np input{width:160px;height:40px;padding:0 8px;border:1px solid #334155;border-radius:8px;background:#05070d;color:#e6edf7;font-size:16px;user-select:text;-webkit-user-select:text;touch-action:auto}
#np button{height:40px;padding:0 14px;border:0;border-radius:8px;background:#22d3ee;color:#05070d;font:inherit;cursor:pointer}
#toast{left:50%;top:12px;transform:translateX(-50%);padding:6px 14px;border-radius:999px;background:#22d3ee;color:#05070d;pointer-events:none}
`;

const SCRIPT = String.raw`
(function(){
"use strict";
var cv=document.getElementById("c"),ctx=cv.getContext("2d",{alpha:false}),wrap=document.getElementById("wrap");
var rmq=window.matchMedia("(prefers-reduced-motion: reduce)");
function rm(){return rmq.matches}
var Q;try{Q=new URLSearchParams(location.search)}catch(e){Q={get:function(){return null}}}
var demo=Q.get("demo")==="1";
/* test switch for trying power-ups: ?pu=s|j|g starts every run with that power-up; no beacons, no high score */
var tpu=/^[sjg]$/.test(Q.get("pu")||"")?Q.get("pu"):"";
function lsg(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lss(k,v){try{localStorage.setItem(k,v)}catch(e){}}
/* names: letters, digits, spaces; max 12 chars. Only ever drawn on the canvas or set via textContent. */
function nm(s){return Array.from(String(s||"").replace(/[^\p{L}\p{N} ]/gu,"").replace(/\s+/g," ").trim()).slice(0,12).join("").trim()}
function ut(s){return String(s||"").replace(/[^A-Za-z0-9_.\-]/g,"").slice(0,40)}
var NK="forge-runner-name";
/* public base URL for share / challenge links (server constant PUBLIC_URL) */
var PUBLIC_URL="${PUBLIC_URL}";
/* challenge link: ?c=742&n=Reece */
var chal=0,cname="";
var cq=Q.get("c");
if(/^\d{1,5}$/.test(cq||"")){chal=parseInt(cq,10);if(chal<1||chal>99999)chal=0}
if(chal)cname=nm(Q.get("n"));
/* anonymous play tracking (never in demo mode) */
var pid="",utm=null;
if(!demo&&!tpu){
  pid=lsg("forge-runner-pid")||"";
  if(!/^[a-f0-9]{16}$/.test(pid)){
    var rb=new Uint8Array(8);crypto.getRandomValues(rb);
    pid=Array.prototype.map.call(rb,function(b){return(b+256).toString(16).slice(1)}).join("");
    lss("forge-runner-pid",pid);
  }
  try{utm=JSON.parse(lsg("forge-runner-utm")||"null")}catch(e){utm=null}
  if(!utm||typeof utm!=="object"){
    utm=null;
    var u1=ut(Q.get("utm_source")),u2=ut(Q.get("utm_campaign")),u3=ut(Q.get("utm_content"));
    if(u1||u2||u3){utm={s:u1,c:u2,t:u3};lss("forge-runner-utm",JSON.stringify(utm))}
  }
}
function track(ev,score,dur){
  if(demo||tpu)return;
  var d={pid:pid,challenge:chal?1:0};
  if(utm){d.utm_source=ut(utm.s);d.utm_campaign=ut(utm.c);d.utm_content=ut(utm.t)}
  if(score!==undefined)d.score=score;
  /* run length (game seconds) and session length so far (seconds since page load) */
  if(dur!==undefined){d.dur=Math.max(0,Math.min(36000,Math.round(dur)));d.ses=Math.max(0,Math.min(86400,Math.round(performance.now()/1000)))}
  var b=JSON.stringify(d),u=location.pathname+"?event="+ev;
  try{if(navigator.sendBeacon&&navigator.sendBeacon(u,b))return}catch(e){}
  try{fetch(u,{method:"POST",body:b,keepalive:true,credentials:"omit"}).catch(function(){})}catch(e){}
}
var MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
var SANS='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
var CY="#22d3ee",VI="#a855f7",OR="#f97316",BG="#05070d";
var KEY="forge-runner-hi";
/* fixed logical resolution; the canvas is scaled to fit the viewport */
var W=600,H=300,GY=232,K=1,CS=1,dpr=1,SX=0,SY=0;
/* portrait: the canvas fills the screen; OY/OB = extra logical sky above / ground below the 600x300 playfield, HS = HUD text scale */
var OY=0,OB=0,HS=1;
/* portrait zoom: ZM = playfield zoom, XO = logical x at the left screen edge, VW = visible logical width (landscape/desktop: 1, 0, W) */
var ZM=1,XO=0,VW=W,PZ=1.35;
var PX=56,PW=45,G=1800,JV=620,CUT=380,START=340,MAXV=760;
var hi=0;
try{hi=parseInt(localStorage.getItem(KEY),10)||0}catch(e){}

/* sprites */
var ANVIL=["cccccccccccccc.","lllllllllllllgg",".gggggggggggggg","..ggggggggggg..","....gggggg.....","....ggoogg.....","...gggggggg....","..dddddddddd..."];
var PAL_A={c:CY,l:"#cbd5e1",g:"#64748b",o:OR,d:"#475569"};
var BUG=["..n....n..","...mmmm...","..mmmmmm..",".emmnnmmm.",".mmmmmmmm.","..mmmmmm.."];
var LEGS=[[".l.l..l.l."],["l.l....l.l"]];
var PAL_B=[{m:VI,n:CY,e:OR,l:"#94a3b8"},{m:CY,n:VI,e:OR,l:"#94a3b8"}];
var FUP=["ww.......ww",".ww.....ww.","..wwmmmww..","....mem....","....mmm....",".....n....."];
var FDN=["...........","....mmm....","....mem....","..wwmmmww..",".ww.....ww.","ww.......ww"];
var PAL_F={w:"#67e8f9",m:VI,e:OR,n:CY};
var DR1=["www....www","..mmmmmm..",".mmmeemmm.","mmmmmmmmmm",".r..ll..r."];
var DR2=[".ww....ww.","..mmmmmm..",".mmmeemmm.","mmmmmmmmmm",".r..ll..r."];
/* power-up icons (7x7): shield, spring boots, big cart */
var IC_S=[".ccccc.","cwwwwwc","cwcccwc","cwcccwc",".cwcwc.","..cwc..","...c..."];
var IC_J=["ooooooo","..y.y..",".y.y...","..y.y..",".y.y...","..y.y..","ooooooo"];
var IC_G=["lllllll","ccccccc",".ggggg.","..ggg..","..ggg..",".ggggg.","ddddddd"];
var PAL_IS={c:CY,w:"#e0f2fe"},PAL_IJ={o:OR,y:"#fde047"},PAL_IG={c:"#fde047",l:"#fdba74",g:OR,d:"#9a3412"};
var PU={s:{i:IC_S,p:PAL_IS,c:CY},j:{i:IC_J,p:PAL_IJ,c:"#fde047"},g:{i:IC_G,p:PAL_IG,c:OR}};
var PAL_BIG={c:"#fde047",l:"#fdba74",g:OR,o:"#fef3c7",d:"#9a3412"};
var PAL_D=[{w:"#f1f5f9",m:"#a3b1c6",e:CY,r:"#ef4444",l:VI},{w:"#f1f5f9",m:"#a3b1c6",e:CY,r:"#7f1d1d",l:VI}];

function base(){ctx.setTransform(K,0,0,K,Math.round((SX-XO)*K),Math.round((SY+OY)*K))}
/* pixel sprites are snapped to device pixels so they stay crisp at any scale */
/* perf: each (sprite, palette, scale) is rendered once per backing-store scale into a small canvas, then blitted */
var SPC=new Map();
function sprImg(rows,s,pal,sy){
  var m=SPC.get(rows);if(!m){m=new Map();SPC.set(rows,m)}
  var pm=m.get(pal);if(!pm){pm={};m.set(pal,pm)}
  var key=s*1000+sy,im=pm[key];
  if(im)return im;
  var cols=0;for(var r=0;r<rows.length;r++)cols=Math.max(cols,rows[r].length);
  im=document.createElement("canvas");
  im.width=Math.max(1,Math.round(cols*s*K));im.height=Math.max(1,Math.round(rows.length*sy*K));
  var o=im.getContext("2d");
  for(r=0;r<rows.length;r++){
    var row=rows[r],y0=Math.round(r*sy*K),y1=Math.round((r+1)*sy*K),c=0;
    while(c<row.length){
      var ch=row.charAt(c);
      if(ch==="."||!pal[ch]){c++;continue}
      var c2=c+1;while(c2<row.length&&row.charAt(c2)===ch)c2++;
      var x0=Math.round(c*s*K),x1=Math.round(c2*s*K);
      o.fillStyle=pal[ch];o.fillRect(x0,y0,x1-x0,y1-y0);
      c=c2;
    }
  }
  pm[key]=im;return im;
}
function spr(rows,x,y,s,pal,sy){
  sy=sy||s;
  var im=sprImg(rows,s,pal,sy);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(im,Math.round(x*K)+Math.round((SX-XO)*K),Math.round(y*K)+Math.round((SY+OY)*K));
  base();
}
function R(x,y,w,h,col){
  var ox=Math.round((SX-XO)*K),oy=Math.round((SY+OY)*K),x0=Math.round(x*K)+ox,y0=Math.round(y*K)+oy;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle=col;ctx.fillRect(x0,y0,Math.round((x+w)*K)+ox-x0,Math.round((y+h)*K)+oy-y0);
  base();
}

/* state */
var state="start",score=0,speed=START,scroll=0,tt=0,py=0,vy=0,held=false,duck=false,jb=0;
var ents=[],parts=[],spawnDist=0,nextGap=500,lastM=0,flash=0,deathAt=0,nt="b";
var raf=0,last=0,lastS=0,beat=false,beatT=0,shake=0,land=0,wasAir=false,dustT=0,runT=0,dn=0;
/* power-ups: shd = shield charges (absorbs one hit), inv = post-hit invulnerability, spT/bgT = spring / big seconds left */
var shd=0,inv=0,spT=0,bgT=0,puNext=0,lastK="",runS=0,spkT=0;
var SPT=10,BGT=6,JMUL=1.2;
function big(){return bgT>0}
function pW(){return big()?60:PW}
function pH(dk){return dk?18:big()?40:30}

/* background */
var T=640,lanes=[],stars=[],MT=[],CITY=[];
function rnd(a,b){return a+Math.random()*(b-a)}
(function(){
  for(var i=0;i<3;i++){
    var segs=[],x=0;
    while(x<T){
      var len=Math.round(rnd(40,120)),dy=Math.random()<.5?8:-8;
      segs.push({x:x,len:len,dy:dy,c:Math.random()<.6?CY:VI});
      x+=len+Math.round(rnd(20,70));
    }
    lanes.push(segs);
  }
  for(var j=0;j<40;j++)stars.push({x:rnd(0,960),y:rnd(6,150),b:Math.random()});
  for(var m=0;m<=12;m++)MT.push(m%12===0?40:Math.round(rnd(25,85)));
  var cx=0;
  while(cx<720){
    var bw=Math.round(rnd(22,48)),bh=Math.round(rnd(18,70)),wins=[];
    for(var q=0;q<6;q++)if(Math.random()<.6)wins.push([Math.round(rnd(3,bw-6)),Math.round(rnd(4,bh-6)),Math.random()<.7?CY:OR]);
    CITY.push({x:cx,w:bw,h:bh,wins:wins});
    cx+=bw+Math.round(rnd(2,14));
  }
})();
var LANE_F=[1,.6,.35],LANE_A=[.5,.34,.2];

/* 8-bit sound: two pulse channels, triangle bass, LFSR noise drums */
/* sound on unless the player muted (fr_snd2="0"); the context is created/resumed inside the first user gesture (autoplay/iOS) */
var ac=null,AU=null,snd=lsg("fr_snd2")!=="0";
var btn=document.getElementById("mute");
function mf(m){return 440*Math.pow(2,(m-69)/12)}
function pw(c,d){
  var n=32,re=new Float32Array(n),im=new Float32Array(n);
  for(var k=1;k<n;k++){re[k]=Math.sin(2*Math.PI*k*d)/(Math.PI*k);im[k]=(1-Math.cos(2*Math.PI*k*d))/(Math.PI*k)}
  return c.createPeriodicWave(re,im);
}
function mkA(c){
  var o=c.createGain();o.gain.value=.5;o.connect(c.destination);
  var nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0),r=1;
  for(var i=0;i<nd.length;i++){if(!(i&1)){var b=(r^(r>>1))&1;r=(r>>1)|(b<<14)}nd[i]=(r&1)?.7:-.7}
  return {c:c,o:o,nb:nb,P:[pw(c,.125),pw(c,.25),pw(c,.5)]};
}
/* w: 0/1/2 = pulse 12.5/25/50%, 3 = triangle; s = sustain level (0 = pluck) */
function tone(A,f1,f2,t,d,w,v,s,o){
  var c=A.c,os=c.createOscillator(),g=c.createGain(),a=Math.min(.05,d*.4);
  if(w===3)os.type="triangle";else os.setPeriodicWave(A.P[w]);
  os.frequency.setValueAtTime(f1,t);
  if(f2)os.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v,t);
  if(s>0){g.gain.linearRampToValueAtTime(v*s,t+a);g.gain.setValueAtTime(v*s,Math.max(t+a,t+d-.02))}
  g.gain.linearRampToValueAtTime(0,t+d);
  os.connect(g);g.connect(o||A.o);os.onended=function(){g.disconnect()};os.start(t);os.stop(t+d+.03);
}
function noise(A,t,d,rate,v,o){
  var c=A.c,s=c.createBufferSource(),g=c.createGain();
  s.buffer=A.nb;s.playbackRate.value=rate;
  g.gain.setValueAtTime(v,t);g.gain.linearRampToValueAtTime(0,t+d);
  s.connect(g);g.connect(o||A.o);s.onended=function(){g.disconnect()};s.start(t,Math.random()*.5);s.stop(t+d+.02);
}
/* soundtracks (all original): 8 bars of 16ths. l = lead (char code = MIDI note, "." = hold), r = bar roots,
   b = bass offsets per 8th, q = arp chord third per bar, sd/s3 = 16th length normal/L3, w = lead pulse normal/L3,
   aw = arp pulse, k/k3/kl = kick normal/L3/L3 last bar, sn = snare, h = hats (L3: every 16th) */
var TRK=[
 /* 0 Forge Anthem: C mixolydian, 150 BPM, I bVII IV I bVI bVII I V (original theme) */
 {l:"C.H.L.O...L.O.T.V...R...M.R.V.T.Q...M.H.M.Q.T.Q.O.....L.H...J.L.K...H.K.P...O.P.R...M.R.V...T.R.T...O.L.O.T.X...V...S.O.J.O.S.V.",
  r:[48,46,41,48,44,46,48,43],b:[0,12,0,12,0,12,7,12],q:"44444444",sd:.1,s3:.09,w:[1,2],aw:0,
  k:"x.......x.......",k3:"x.......x.x.....",kl:"x.......x.x...x.",sn:"....x.......x...",h:"x.x.x.x.x.x.x.x."},
 /* 1 Foundry Dash: A minor, 170 BPM, i VI III VII i iv V i, four-on-the-floor */
 {l:"Q.L.H.L.Q...S.T.T...Q...M.Q.T.Q.O...L.O.T...S.T.S...O.J.O...S.V.X...V.T.S.T.Q...M.Q.V.Q.M...J.M.L...P.S.X...S.P.Q.......L.H.E...",
  r:[45,41,48,43,45,38,40,45],b:[0,12,0,12,0,12,0,12],q:"34443343",sd:.088,s3:.08,w:[1,0],aw:1,
  k:"x...x...x...x...",k3:"x...x...x...x.x.",sn:"....x.......x...",h:"x.x.x.x.x.x.x.x."},
 /* 2 Sky Rivets: F lydian, 132 BPM, I II iii II I II vii(iii) V, root-fifth bounce, offbeat hats */
 {l:"Q...T...X...V.T.S.......O.Q.S.V.T...Q...L...Q...O.Q.S...J...O...M...Q.T.X.....Y.X.V.S...V...S.O.L...O.S.X...S...T.......S...O...",
  r:[41,43,45,43,41,43,40,48],b:[0,7,12,7,0,7,12,7],q:"44344434",sd:.114,s3:.104,w:[2,1],aw:2,
  k:"x.......x.......",k3:"x.....x.x.......",sn:"....x.......x...",h:"..x...x...x...x."},
 /* 3 Night Shift: D dorian, 120 BPM half-time, i IV i bVII i IV bVII v */
 {l:"J.....M.....Q...S.Q.O.....S...V.Q.......M.O.Q...O...L...H.......V.....T.....Q...S...T...V...X...V.T.O.....L.O.T.Q.......L...H.L.",
  r:[38,43,38,36,38,43,36,45],b:[0,0,12,0,7,0,12,7],q:"34343443",sd:.125,s3:.115,w:[2,1],aw:0,
  k:"x.....x...x.....",k3:"x.....x...x...x.",sn:"........x.......",h:"x.x.x.x.x.x.x.x."},
 /* 4 Deep Haul (inspired by the mood of Sail North's "Kraken"; original melody/chords): Db major / Bb minor,
   150 BPM (L3 ~163), vi IV I V vi ii IV V, stomp-clap shanty groove, root-fifth heave bass */
 {l:"F.....M.R...P.M.N...R...U.....R.P.....M.P...U...T...P...K...M.N.R.....U.W...U.R.N.....K.R...N.K.M...N...P...R...T.......P.T.W...",
  r:[46,42,49,44,46,39,42,44],b:[0,12,7,12,0,12,7,12],q:"34443344",sd:.1,s3:.092,w:[2,1],aw:1,
  k:"x.....x.x.......",k3:"x.....x.x...x...",kl:"x.....x.x.x.x.x.",sn:"....x.......x...",h:"x.x..xx.x.x..xx."}
];
var TI=0,TP=-1,MB=null,mOn=true;
function mstep(A,T,i,t,L,sd,o){
  var s=i&127,bar=s>>4,b=s&15,r=T.r[bar],ld=T.l,kp=L>2?(bar===7&&T.kl||T.k3):T.k;
  if(!(b&1))tone(A,mf(r+T.b[b>>1]),0,t,sd*1.7,3,.3,.8,o);
  if(kp.charAt(b)==="x"){tone(A,160,45,t,.09,3,.5,0,o);noise(A,t,.03,.3,.12,o)}
  if(L>1&&T.sn.charAt(b)==="x")noise(A,t,.12,.45,.2,o);
  if(T.h.charAt(b)==="x"||L>2)noise(A,t,.03,1,b&3?.04:.07,o);
  if(L>1)for(var k=0;k<2;k++){var ai=(s*2+k)&3;tone(A,mf(r+24+[0,T.q.charCodeAt(bar)-48,7,12][ai]),0,t+k*sd/2,sd/2,T.aw,.05,.6,o)}
  if(L>0){
    var ch=ld.charAt(s);
    if(ch!=="."){var n=1;while(ld.charAt((s+n)&127)===".")n++;tone(A,mf(ch.charCodeAt(0)),0,t,n*sd*.92,T.w[L>2?1:0],.1,.55,o)}
  }
}
function mCut(){if(MB&&ac){var m=MB;m.gain.setTargetAtTime(0,ac.currentTime,.02);setTimeout(function(){m.disconnect()},400)}MB=null}
/* new run: random track, never the previous run's; restart from bar 1 */
function startMusic(){
  var n=TRK.length,j=(Math.random()*(TP<0?n:n-1))|0;
  if(TP>=0&&j>=TP)j++;
  TI=TP=j;mCut();mI=0;mNext=0;mOn=true;
}
function stopMusic(){mOn=false;mCut()}
var mNext=0,mI=0,mL=0,mLT=0;
function mtick(){
  if(!mOn||!snd||!AU||document.hidden)return;
  var now=ac.currentTime,T=TRK[TI];
  if(!MB){MB=ac.createGain();MB.connect(AU.o)}
  if(mNext<now)mNext=now+.05;
  while(mNext<now+.3){
    if(!(mI&15))mL=mLT;
    var sd=mL>2?T.s3:T.sd;
    mstep(AU,T,mI,mNext,mL,sd,MB);mNext+=sd;mI++;
  }
}
setInterval(mtick,50);
function sfx(f1,f2,d,w,v,dl){if(snd&&AU)tone(AU,f1,f2,ac.currentTime+(dl||0),d,w,v||.08,0)}
function setBtn(){
  btn.textContent=snd?"🔊":"🔇";
  btn.setAttribute("aria-label",snd?"Mute sound":"Unmute sound");
}
function aInit(){
  if(!ac){
    var AC=window.AudioContext||window.webkitAudioContext;
    if(AC){try{ac=new AC();AU=mkA(ac)}catch(e){ac=null;AU=null}}
  }
  if(ac&&ac.state!=="running"){try{ac.resume()}catch(e){}}
  return !!AU;
}
/* any gesture (capture, before game handlers): create/resume while sound is on; also re-resumes after iOS interruptions */
function unlock(){
  if(!snd||ac&&ac.state==="running")return;
  if(aInit())mNext=0;else{snd=false;setBtn()}
}
["pointerdown","pointerup","touchstart","touchend","mousedown","keydown","click"].forEach(function(e){window.addEventListener(e,unlock,true)});
btn.addEventListener("click",function(){
  snd=!snd;
  if(snd&&!aInit())snd=false;
  if(AU){AU.o.gain.cancelScheduledValues(ac.currentTime);AU.o.gain.setValueAtTime(snd?.5:0,ac.currentTime)}
  mNext=0;lss("fr_snd2",snd?"1":"0");
  setBtn();sfx(660,990,.08,1);btn.blur();
});
setBtn();

/* share */
var shB=document.getElementById("sh"),np=document.getElementById("np"),ni=document.getElementById("ni"),ng=document.getElementById("ng"),toastE=document.getElementById("toast"),toT=0;
function placeShare(){
  shB.style.top=Math.round((GY+10+OY)*CS)+"px";
  shB.style.height=Math.max(30,Math.min(48,Math.round((H-GY-16)*CS)))+"px";
  shB.style.fontSize=Math.max(13,Math.min(19,Math.round(15*CS)))+"px";
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

/* sizing: largest canvas with the game's aspect ratio that fits the viewport, backed at devicePixelRatio.
   Portrait (taller than wide): full width, full height; the same 600x300 playfield sits in the lower part and the
   extra height becomes sky (HUD/title move up there) and ground. Gameplay area, physics and difficulty are unchanged. */
function fit(){
  var vw=document.documentElement.clientWidth||window.innerWidth,vh=window.innerHeight||document.documentElement.clientHeight;
  var tall=vh>vw;
  var s=tall?vw/W:Math.min(vw/W,vh/H),cw=Math.max(1,Math.floor(W*s)),ch=Math.max(1,tall?Math.floor(vh):Math.floor(H*s));
  /* perf: touch devices are capped at 2x backing (3x costs 2.25x the pixels for no visible gain on pixel art) */
  var coarse=window.matchMedia("(pointer: coarse)").matches;
  dpr=Math.min(window.devicePixelRatio||1,coarse?2:3);
  /* pixel budget keeps phones at 60fps: big landscape phones drop to ~2x backing, still crisp */
  var bud=coarse?1.5e6:3.6e6;
  while(dpr>1&&cw*ch*dpr*dpr>bud)dpr-=.25;
  wrap.style.width=cw+"px";wrap.style.height=ch+"px";
  var nw=Math.round(cw*dpr),nh=Math.round(ch*dpr);
  if(cv.width!==nw||cv.height!==nh){cv.width=nw;cv.height=nh;SPC=new Map();TXC={};FPC={};skyK=-1}
  ZM=tall?PZ:1;XO=tall?20:0;VW=W/ZM;
  CS=cw*ZM/W;K=cv.width*ZM/W;
  var ex=tall?Math.max(0,ch/CS-H):0;OY=Math.round(ex*.62);OB=ex-OY;HS=tall?1.5/ZM:1;
  var mb=Math.round(Math.max(30,Math.min(46,36*CS)));
  btn.style.width=btn.style.height=mb+"px";btn.style.fontSize=Math.round(mb*.45)+"px";
  ctx.imageSmoothingEnabled=false;
  base();placeShare();draw();
}
var rt=0;
function onResize(){clearTimeout(rt);rt=setTimeout(fit,60)}
window.addEventListener("resize",onResize);
window.addEventListener("orientationchange",onResize);
if(window.visualViewport)window.visualViewport.addEventListener("resize",onResize);

/* game flow */
function start(){
  startMusic();
  state="run";score=0;speed=START;ents=[];parts=[];py=0;vy=0;jb=0;nt="b";
  shd=0;inv=0;spT=0;bgT=0;runS=0;puNext=150+Math.random()*100;
  if(tpu){if(tpu==="s")shd=1;else if(tpu==="j")spT=SPT;else bgT=BGT}
  spawnDist=0;nextGap=500;lastM=0;flash=0;held=false;beat=false;beatT=0;shake=0;wasAir=false;
  shB.style.display="none";np.style.display="none";
  track("start");
}
function die(){
  state="over";deathAt=performance.now();flash=0;
  var s=Math.floor(score);
  lastS=s;
  if(!demo&&!tpu&&s>hi){
    hi=s;
    try{localStorage.setItem(KEY,String(hi))}catch(e){}
  }
  track("over",s,runS);
  placeShare();shB.style.display="block";
  if(snd&&AU){noise(AU,ac.currentTime,.4,.25,.25);sfx(520,60,.45,2,.09)}
  if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}
}
function press(){
  var t=performance.now();
  if(state==="start"){start()}
  else if(state==="over"){if(t-deathAt>400)start()}
  else{held=true;jb=.12}
}
function release(){
  held=false;
  var c=spT>0?CUT*JMUL:CUT;
  if(vy>c)vy=c;
}
function addP(p){if(parts.length<160)parts.push(p)}
function sparks(x,y,n,sp){
  for(var i=0;i<n;i++){
    var a=rnd(0,6.283),s=rnd(sp*.3,sp);
    addP({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:rnd(.35,.8),age:0,c:i%3===0?CY:OR,g:500,z:3});
  }
}
function dust(x,y,n){
  if(rm())return;
  for(var i=0;i<n;i++)addP({x:x+rnd(-6,6),y:y-rnd(0,3),vx:rnd(-90,-20)+(n>1?rnd(-40,60):0),vy:-rnd(15,70),life:rnd(.25,.5),age:0,c:"#94a3b8",g:160,z:2});
}

/* input */
function isUI(t){return !!(t&&t.closest&&t.closest("a,button,input,.ui"))}
var ty0=0;
document.addEventListener("touchstart",function(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length===1){ty0=e.touches[0].clientY;press()}
},{passive:false});
document.addEventListener("touchmove",function(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length&&e.touches[0].clientY-ty0>30)duck=true;
},{passive:false});
function tend(e){
  if(isUI(e.target))return;
  e.preventDefault();
  if(e.touches.length===0){release();duck=false}
}
document.addEventListener("touchend",tend,{passive:false});
document.addEventListener("touchcancel",tend,{passive:false});
document.addEventListener("gesturestart",function(e){e.preventDefault()},{passive:false});
document.addEventListener("mousedown",function(e){
  if(e.button!==0||isUI(e.target))return;
  press();
});
window.addEventListener("mouseup",function(){release()});
["touchstart","touchend","mousedown","mouseup","pointerdown","pointerup","click"].forEach(function(n){
  [btn,shB,np].forEach(function(el){el.addEventListener(n,function(e){e.stopPropagation()})});
});
window.addEventListener("keydown",function(e){
  var k=e.code;
  if(k==="Space"||k==="ArrowUp"||k==="KeyW"){
    if(isUI(e.target))return;
    e.preventDefault();
    if(!e.repeat)press();
  }else if(k==="ArrowDown"||k==="KeyS"){
    if(isUI(e.target))return;
    e.preventDefault();duck=true;
  }
});
window.addEventListener("keyup",function(e){
  var k=e.code;
  if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release()}
  else if(k==="ArrowDown"||k==="KeyS"){duck=false}
});
window.addEventListener("blur",function(){release();duck=false});

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

/* rendering */
function setFont(px,mono,bold){ctx.font=(bold?"bold ":"")+px+"px "+(mono?MONO:SANS)}
function fitPx(str,px,maxW,mono,bold){
  var k=str+"|"+px+"|"+maxW+(mono?1:0)+(bold?1:0);
  if(FPC[k])return FPC[k];
  setFont(px,mono,bold);
  var w=ctx.measureText(str).width;
  return FPC[k]=w>maxW?Math.floor(px*maxW/w):px;
}
/* perf: each on-screen string lives in its own small canvas (slot id) and is only re-rendered when it changes;
   the glow (shadowBlur) is baked in there instead of being blurred on the full canvas every frame */
var TXC={},FPC={};
function txt(str,x,y,px,color,align,mono,bold,stroke,glow,id){
  id=id||str;
  var e=TXC[id],key=str+"|"+px+"|"+color+"|"+(mono?1:0)+(bold?1:0)+(stroke?1:0)+"|"+(glow||"");
  if(!e)e=TXC[id]={c:document.createElement("canvas"),k:""};
  if(e.k!==key){
    e.k=key;
    var o=e.c.getContext("2d"),f=(bold?"bold ":"")+(px*K)+"px "+(mono?MONO:SANS);
    o.font=f;
    var w=o.measureText(str).width,pd=Math.ceil(((stroke?3:0)+(glow?14:0))*K)+2,asc=Math.ceil(px*K*1.05),dsc=Math.ceil(px*K*.35);
    var cw2=Math.ceil(w)+2*pd,ch2=asc+dsc+2*pd;
    if(e.c.width!==cw2||e.c.height!==ch2){e.c.width=cw2;e.c.height=ch2}
    else{o.clearRect(0,0,cw2,ch2);o.shadowBlur=0;o.shadowColor="rgba(0,0,0,0)"}
    o.font=f;o.textAlign="left";o.textBaseline="alphabetic";
    if(glow){o.shadowColor=glow;o.shadowBlur=(glow===VI?16:10)*K}
    if(color==="TITLE"){var tg=o.createLinearGradient(0,pd+asc-40*K,0,pd+asc);tg.addColorStop(0,"#67e8f9");tg.addColorStop(1,CY);color=tg}
    if(stroke){o.lineJoin="round";o.lineWidth=4*K;o.strokeStyle="rgba(5,7,13,.75)";o.strokeText(str,pd,pd+asc)}
    o.fillStyle=color;o.fillText(str,pd,pd+asc);
    e.w=w;e.ax=pd;e.ay=pd+asc;
  }
  var X=x*K+Math.round((SX-XO)*K),Y=Math.round(y*K)+Math.round((SY+OY)*K);
  if(align==="right")X-=e.w;else if(align!=="left")X-=e.w/2;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(e.c,Math.round(X)-e.ax,Y-e.ay);
  base();
  return e.w/K;
}
function pad(n){return String(Math.min(99999,Math.floor(n))).padStart(5,"0")}
function lp(a,b,t){return Math.round(a+(b-a)*t)}
function mix(a,b,t){return "rgb("+lp(a[0],b[0],t)+","+lp(a[1],b[1],t)+","+lp(a[2],b[2],t)+")"}
/* perf: the sky gradient is filled into SKC only when its colour step changes (<=61 times a run) and blitted 1:1 each frame */
var skyG=null,skyK=-1,C_M="",C_C="",C_G="",SKC=null;
function drawSky(){
  var k=Math.round(dn*60),i,base0,t;
  if(k!==skyK){
    skyK=k;t=k/60;
    skyG=ctx.createLinearGradient(0,-OY,0,GY);
    skyG.addColorStop(0,mix([30,48,98],[4,6,14],t));
    skyG.addColorStop(.65,mix([86,58,120],[10,13,30],t));
    skyG.addColorStop(1,mix([170,92,120],[22,24,52],t));
    C_M=mix([74,52,112],[20,22,46],t);C_C=mix([40,30,72],[11,14,30],t);C_G=mix([14,12,30],[5,7,13],t);
    if(!SKC)SKC=document.createElement("canvas");
    var kw=Math.ceil((VW+40)*K),kh=Math.ceil((GY+22+OY)*K);
    if(SKC.width!==kw||SKC.height!==kh){SKC.width=kw;SKC.height=kh}
    var o=SKC.getContext("2d",{alpha:false});
    o.setTransform(K,0,0,K,-(XO-20)*K,(OY+20)*K);o.fillStyle=skyG;o.fillRect(XO-20,-20-OY,VW+40,GY+22+OY);
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.drawImage(SKC,Math.round((XO-20)*K)+Math.round((SX-XO)*K),Math.round((-20-OY)*K)+Math.round((SY+OY)*K));
  base();
  /* stars fade in as night falls */
  ctx.fillStyle="#cbd5e1";
  var so=(scroll*.03)%960;
  for(i=0;i<stars.length;i++){
    var st=stars[i],a=dn*(.25+.5*st.b)+.05;
    if(st.y>GY-60)continue;
    ctx.globalAlpha=a;
    /* portrait: the star field repeats upward every 150 units to fill the extra sky */
    for(var sy0=st.y;sy0>-OY-150;sy0-=150)if(sy0>-OY)
    for(base0=-so;base0<W;base0+=960){var sx=base0+st.x;if(sx>=0&&sx<W)ctx.fillRect(Math.round(sx),Math.round(sy0),st.b>.8?2:1.5,st.b>.8?2:1.5)}
  }
  ctx.globalAlpha=1;
  /* setting sun, rising moon */
  if(dn<.75){
    var sy=GY-110+dn*170,sr=30;
    ctx.globalAlpha=1-dn/.75;
    ctx.fillStyle=OR;ctx.beginPath();ctx.arc(W*.7,sy,sr,0,6.283);ctx.fill();
    ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(W*.7,sy,sr*.7,0,6.283);ctx.fill();
    ctx.fillStyle=skyG;
    for(i=0;i<4;i++)ctx.fillRect(W*.7-sr,sy+4+i*7,sr*2,1.5+i*.6);
    ctx.globalAlpha=1;
  }
  if(dn>.3){
    var my=GY-30-(dn-.3)*170;
    ctx.globalAlpha=Math.min(1,(dn-.3)/.3);
    ctx.fillStyle="#e2e8f0";ctx.beginPath();ctx.arc(W*.22,my,13,0,6.283);ctx.fill();
    ctx.fillStyle=skyG;ctx.beginPath();ctx.arc(W*.22+6,my-4,11,0,6.283);ctx.fill();
    ctx.globalAlpha=1;
  }
  /* far mountains */
  ctx.fillStyle=C_M;
  var mo=(scroll*.08)%600;
  ctx.beginPath();ctx.moveTo(-1,GY);
  for(base0=-mo;base0<W+50;base0+=600)for(i=0;i<=12;i++)ctx.lineTo(base0+i*50,GY-MT[i]);
  ctx.lineTo(W+60,GY);ctx.closePath();ctx.fill();
  /* mid city with lit windows */
  var co=(scroll*.22)%720;
  for(base0=-co;base0<W;base0+=720){
    for(i=0;i<CITY.length;i++){
      var c=CITY[i],bx=base0+c.x;
      if(bx>W||bx+c.w<0)continue;
      ctx.fillStyle=C_C;ctx.fillRect(Math.round(bx),GY-c.h,c.w,c.h);
      ctx.globalAlpha=.25+.6*dn;
      for(var q=0;q<c.wins.length;q++){ctx.fillStyle=c.wins[q][2];ctx.fillRect(Math.round(bx+c.wins[q][0]),GY-c.h+c.wins[q][1],2,2)}
      ctx.globalAlpha=1;
    }
  }
}
function drawWorld(){
  var i,k,base0;
  drawSky();
  ctx.fillStyle=C_G;ctx.fillRect(-20,GY,W+40,H-GY+20+OB);
  for(i=0;i<3;i++){
    var ly=GY+18+i*17,off=(scroll*LANE_F[i])%T;
    ctx.globalAlpha=LANE_A[i];
    for(base0=-off;base0<W;base0+=T){
      for(k=0;k<lanes[i].length;k++){
        var s=lanes[i][k],x=Math.round(base0+s.x);
        if(x>W||x+s.len<-8)continue;
        ctx.fillStyle=s.c;
        ctx.fillRect(x,ly,s.len,2);
        ctx.fillRect(x,s.dy>0?ly:ly+s.dy,2,Math.abs(s.dy)+2);
        ctx.fillRect(x+s.len-2,ly-2,6,6);
      }
    }
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="rgba(34,211,238,.16)";ctx.fillRect(-20,GY-3,W+40,8);
  ctx.fillStyle=CY;ctx.fillRect(-20,GY,W+40,2);
  ctx.fillStyle="rgba(34,211,238,.5)";
  var go=scroll%48;
  for(var x=-go;x<W;x+=48){
    ctx.fillRect(Math.round(x),GY+5,12,2);
    ctx.fillRect(Math.round(x+26),GY+5,4,2);
  }
}
var LF=[[9,6,30,3],[12,4,27,4],[6,3,27,6],[9,4,24,4]];
function leg(x,y,w,h,c){
  if(spT>0){
    /* spring boots: yellow zigzag coil on an orange boot sole */
    var n=Math.max(2,Math.floor((h-2)/2));
    for(var i=0;i<n;i++)R(x+(i&1?3:-1),y+i*2,w-2,1.5,c);
    R(x-2,y+h-2,w+4,2,OR);
  }else R(x,y,w,h,c);
}
function drawPlayer(){
  var air=py>0,dk=duck&&!air,sq=land>0&&!dk&&!air,B=big(),M=B?4/3:1;
  var sy=(dk?2:sq?2.5:3)*M,lh=(dk?2:6)*M,ph=8*sy+lh;
  var f=(runT|0)&3,bob=(!air&&!dk&&state==="run"&&(f&1))?-1:0;
  /* spring boots lift the cart 4 px on visible coils (visual only; hitbox unchanged) */
  var SL=spT>0?4:0;
  var x=PX,y=GY-py-ph+bob-SL;
  if(speed>560&&state==="run"&&!rm()){
    ctx.globalAlpha=(speed-560)/400;
    ctx.fillStyle=CY;ctx.fillRect(x-22,y+5,16,1.5);ctx.fillRect(x-30,y+13,22,1.5);ctx.fillRect(x-18,y+19,12,1.5);
    ctx.globalAlpha=1;
  }
  /* big cart: 4/3 scale with forge-orange plating; blinks back to steel in its last 1.5 s */
  var pal=B&&!(bgT<1.5&&((bgT*8)|0)&1)?PAL_BIG:PAL_A;
  if(inv>0&&((inv*14)|0)&1)ctx.globalAlpha=.35;
  spr(ANVIL,x,y,3*M,pal,sy);
  var ly=y+8*sy,lc=B?"#9a3412":"#94a3b8",lw=6*M;
  if(spT>0)lc=spT<1.5&&((spT*8)|0)&1?"#94a3b8":"#fde047";
  if(air){var ext=(vy<0?5:3)*M+SL;leg(x+9*M,ly,lw,ext,lc);leg(x+27*M,ly,lw,ext,lc)}
  else if(dk){var o=(f&1?2:0)*M;leg(x+9*M+o,ly,lw,2*M+SL,lc);leg(x+27*M-o,ly,lw,2*M+SL,lc)}
  else{var L=state==="run"?LF[f]:LF[0];leg(x+L[0]*M,ly,lw,L[1]*M-bob+SL,lc);leg(x+L[2]*M,ly,lw,L[3]*M-bob+SL,lc)}
  ctx.globalAlpha=1;
  /* shield: pulsing cyan outline around the cart */
  if(shd&&state!=="over"){
    var pw=15*3*M,pa=rm()?.8:.6+.3*Math.sin(tt*9);
    ctx.globalAlpha=.14;ctx.fillStyle=CY;ctx.fillRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=pa;ctx.strokeStyle=CY;ctx.lineWidth=2;ctx.strokeRect(x-5,y-5,pw+10,ph+8);
    ctx.globalAlpha=1;ctx.fillStyle="#e0f2fe";
    ctx.fillRect(x-6,y-6,3,3);ctx.fillRect(x+pw+3,y-6,3,3);ctx.fillRect(x-6,y+ph+1,3,3);ctx.fillRect(x+pw+3,y+ph+1,3,3);
  }
}
function drawEnts(){
  var f=((tt*10)|0)&1,fl=((tt*9)|0)&1,bl=((tt*4)|0)&1;
  for(var i=0;i<ents.length;i++){
    var e=ents[i],x=e.x,y=GY-e.bot-e.h;
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
      var cx=x+11,cy=y+11,a=-e.x/11;
      ctx.fillStyle="#1e293b";ctx.beginPath();ctx.arc(cx,cy,11,0,6.283);ctx.fill();
      ctx.strokeStyle=OR;ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="#94a3b8";ctx.lineWidth=2;ctx.beginPath();
      for(var q=0;q<3;q++){var an=a+q*2.094;ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(an)*9,cy+Math.sin(an)*9)}
      ctx.stroke();
      R(x+6,y-4,10,4,"#475569");R(x+9,y-7,4,3,f?OR:"#fde047");
    }else{
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
function drawGhost(){
  if(!chal||state==="start")return;
  var x=Math.round(PX+PW/2+(chal-score)*20);
  if(x<-60||x>W+60)return;
  ctx.save();
  ctx.globalAlpha=beat?.3:.6;ctx.strokeStyle=OR;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,GY-56);ctx.lineTo(x+24,GY-48);ctx.lineTo(x,GY-40);ctx.stroke();
  ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x-12,GY-1);ctx.lineTo(x+12,GY-1);ctx.stroke();
  txt((cname||"friend")+" "+chal,x,GY-62,11,OR,"center",true,true,false,"","ghost");
  ctx.restore();
}
function drawHud(){
  var col="#f1f5f9",glow="";
  if(flash>0){
    col=rm()||((flash*16)|0)%2?OR:"#ffffff";
    glow=rm()?"":OR;
  }
  var hy=OY?14-OY:0,hb=30+hy+(HS-1)*20;
  var sw=txt(pad(score),XO+VW-14,hb,20*HS,col,"right",true,true,true,glow,"score");
  txt("HI "+pad(hi),XO+VW-14-sw-14,hb,14*HS,"#94a3b8","right",true,true,true,"","hi");
  hy=hb-30;
  if(state==="run"){
    var xr=XO+VW-14;
    for(var u=0;u<3;u++){
      var k=u===0?"g":u===1?"j":"s",tl=k==="g"?bgT:k==="j"?spT:shd,P=PU[k];
      if(!(tl>0))continue;
      if(k!=="s"&&tl<1.5&&((tl*8)|0)&1&&!rm()){xr-=30;continue}
      ctx.fillStyle="rgba(5,7,13,.6)";ctx.fillRect(xr-22,40+hy,22,26);
      ctx.strokeStyle=P.c;ctx.lineWidth=1;ctx.strokeRect(xr-22,40+hy,22,26);
      spr(P.i,xr-18,43+hy,2,P.p);
      if(k!=="s")R(xr-20,60+hy,18*Math.max(0,tl/(k==="g"?BGT:SPT)),3,P.c);
      xr-=30;
    }
  }
  if(beatT>0&&state==="run"){
    ctx.globalAlpha=rm()?1:Math.min(1,beatT*2);
    txt("Beat it!",XO+VW/2,Math.round(H*.3),26,OR,"center",true,true,true,rm()?"":OR);
    ctx.globalAlpha=1;
  }
}
function draw(){
  SX=SY=0;
  if(shake>0&&!rm()){var mg=shake*16;SX=rnd(-mg,mg);SY=rnd(-mg,mg)}
  base();
  drawWorld();
  drawGhost();
  drawEnts();
  drawPlayer();
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    ctx.globalAlpha=1-p.age/p.life;
    ctx.fillStyle=p.c;
    ctx.fillRect(p.x,p.y,p.z,p.z);
  }
  ctx.globalAlpha=1;
  SX=SY=0;base();
  drawHud();
  var pulse=rm()?1:.55+.45*Math.sin(performance.now()/260);
  if(state==="start"){
    var ty=OY?Math.round(-OY*.5):Math.round(H*.32);
    txt("FORGE RUNNER",XO+VW/2,ty,fitPx("FORGE RUNNER",48*HS,VW-32,false,true),"TITLE","center",false,true,false,VI);
    ctx.globalAlpha=pulse;
    txt("tap to start",XO+VW/2,ty+34*HS,17*HS,"#f1f5f9","center",true,true,true);
    ctx.globalAlpha=1;
    var hint="tap / space: jump (hold = higher) · swipe down / ↓: duck";
    if(OY){
      txt("tap: jump (hold = higher)",XO+VW/2,ty+60*HS,fitPx("tap: jump (hold = higher)",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt("swipe down: duck",XO+VW/2,ty+80*HS,fitPx("swipe down: duck",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);
    if(chal){
      var cl=(cname||"A friend")+" forged "+chal+" — can you beat it?";
      txt(cl,XO+VW/2,ty+(OY?112:84)*HS,fitPx(cl,16*HS,VW-20,false,true),OR,"center",false,true,true);
    }
  }else if(state==="over"){
    ctx.fillStyle="rgba(5,7,13,.55)";ctx.fillRect(0,-OY,W,H+OY+OB);
    var oy=OY?Math.round(-OY*.5):Math.round(H*.28);
    txt("GAME OVER",XO+VW/2,oy,fitPx("GAME OVER",34*HS,VW-24,true,true),OR,"center",true,true);
    txt("Score "+pad(lastS)+"  Best "+pad(hi),XO+VW/2,oy+30*HS,fitPx("Score 00000  Best 00000",16*HS,VW-24,true,false),"#e6edf7","center",true,false,false,"","sline");
    if(chal){
      var won=lastS>chal,rl=won?"You beat "+(cname||"your friend")+"!":(cname||"Your friend")+"'s "+chal+" still stands · "+(chal-lastS+1)+" to go";
      txt(rl,XO+VW/2,oy+54*HS,fitPx(rl,16*HS,VW-24,false,true),won?CY:OR,"center",false,true,false,"","rl");
    }
    ctx.globalAlpha=pulse;
    txt("tap to retry",XO+VW/2,oy+(chal?78:60)*HS,16*HS,CY,"center",true,false);
    ctx.globalAlpha=1;
  }
}

/* loop */
function frame(ts){
  raf=requestAnimationFrame(frame);
  if(!last)last=ts;
  var dt=Math.min((ts-last)/1000,.05);
  last=ts;
  /* <=1/240 s sub-steps: same jump arc and spawn spacing at any refresh rate (no judder, no 30fps-floaty jumps) */
  var n=Math.max(1,Math.ceil(dt*240-1e-6));
  for(var i=0;i<n;i++)update(dt/n);
  draw();
}
document.addEventListener("visibilitychange",function(){
  if(document.hidden){
    if(raf){cancelAnimationFrame(raf);raf=0}
    release();duck=false;
  }else if(!raf){
    last=0;raf=requestAnimationFrame(frame);
  }
});

fit();
track("visit");
if(demo)start();
raf=requestAnimationFrame(frame);
})();
`;

function renderHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#05070d">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2032%2032%22%20shape-rendering%3D%22crispEdges%22%3E%0A%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%2305070d%22/%3E%0A%3CclipPath%20id%3D%22r%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%226%22/%3E%3C/clipPath%3E%3Cg%20clip-path%3D%22url%28%23r%29%22%3E%0A%3Crect%20x%3D%220%22%20y%3D%2224%22%20width%3D%2232%22%20height%3D%226%22%20fill%3D%22%2322d3ee%22%20opacity%3D%22.16%22/%3E%0A%3Crect%20x%3D%2228%22%20y%3D%222%22%20width%3D%222%22%20height%3D%222%22%20fill%3D%22%23fbbf24%22/%3E%0A%3Crect%20x%3D%2224%22%20y%3D%224%22%20width%3D%222%22%20height%3D%222%22%20fill%3D%22%23f97316%22/%3E%0A%3Crect%20x%3D%222%22%20y%3D%226%22%20width%3D%2228%22%20height%3D%222%22%20fill%3D%22%2322d3ee%22/%3E%0A%3Crect%20x%3D%222%22%20y%3D%228%22%20width%3D%2226%22%20height%3D%222%22%20fill%3D%22%23cbd5e1%22/%3E%0A%3Crect%20x%3D%2228%22%20y%3D%228%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%224%22%20y%3D%2210%22%20width%3D%2228%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%226%22%20y%3D%2212%22%20width%3D%2222%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%2210%22%20y%3D%2214%22%20width%3D%2212%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%2210%22%20y%3D%2216%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%2214%22%20y%3D%2216%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%23f97316%22/%3E%0A%3Crect%20x%3D%2218%22%20y%3D%2216%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%228%22%20y%3D%2218%22%20width%3D%2216%22%20height%3D%222%22%20fill%3D%22%2364748b%22/%3E%0A%3Crect%20x%3D%226%22%20y%3D%2220%22%20width%3D%2220%22%20height%3D%222%22%20fill%3D%22%23475569%22/%3E%0A%3Crect%20x%3D%226%22%20y%3D%2222%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2394a3b8%22/%3E%0A%3Crect%20x%3D%2220%22%20y%3D%2222%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2394a3b8%22/%3E%0A%3Crect%20x%3D%224%22%20y%3D%2224%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2394a3b8%22/%3E%0A%3Crect%20x%3D%2220%22%20y%3D%2224%22%20width%3D%224%22%20height%3D%222%22%20fill%3D%22%2394a3b8%22/%3E%0A%3Crect%20x%3D%220%22%20y%3D%2226%22%20width%3D%2232%22%20height%3D%222%22%20fill%3D%22%2322d3ee%22/%3E%0A%3C/g%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0CAYAAAA9zQYyAAAABmJLR0QA/wD/AP+gvaeTAAAEPElEQVR4nO3cv4sjZRzH8Sdhl+XEbWysRBHBykLwL9DGxrPRTrCxOy0srhDEQgSLKyzUQhBEsNLOysrSSrTQxkY4LOxsTjyOK9ZCZtmL+TEzmScz88nrVe5Onswub75M5kmyKAd2enZ+cejnZBz3791ZHPo5qz+hgGkcIvAqTyBidqkV96CLCpmuhg57kMWEzL6GCnuvRYTMkIaIuvcCYqaWfcLu9UAxU1vfqDs9SMgcUp+oWz9AzIyha9StDhYzY+oS9cmuA8TM0P757tFOxz/0YrloG/Wy1xnBgbUdrFuDNp2ZkjY9bgxazEzRri7XBi1mpmxbn66hifK/oE1n5mBTpyY0UR4I2nRmTtb1akIza6tRLzf9AubocjtR0Kz6+81rrY99+JO7Fc9ku6vb4i45mL2rw3i5+gOYMxOaCM1QFjRRBE2UpetnkpjQxDg9O78QNFEETRRBE0XQRFl0ucvx2I+3a54LrPXHc4+3PtaEJoqgiSJoogiaKIImiqCJImiiCJoogiaKoInSaev7h59+rXkuHInPvvi62tomNFEETRRBE0XQRBE0UQRNFEETRdBEETRRBE2UTlvfXbz+1ns1loWtTGiiCJoogiaKoIkiaKIImiiCJoqgiSJoogiaKNW2vruyVX48vvz4/Wprm9BEETRRBE0UQRNF0EQRNFEETRRBE0XQRBE0UQRNlMm8l6MW7xF5UM33UUyBCU0UQRNF0EQRNFEETRRBE0XQRBE0UQRNFEET5WTsE5izTy9uVVn3xuJmlXWPgQlNFEETRdBEETRRBE0UQRNF0EQRNFEETRRBE2WWn/r2Se7DmOMnxE1oogiaKIImiqCJImiiCJoogiaKoIkiaKIImiiT2fp+/vprY58Ce/j+26/GPoVSiglNGEETRdBEETRRBE0UQRNF0EQRNFEETRRBE0XQRJnMN/i/dP3lKuu+/carVdadio8+/6ba2nP835nQRBE0UQRNFEETRdBEETRRBE0UQRNF0EQRNFFOTp54qsrCt979sMq6pZRy84N3Wh9b6+87BnP835nQRBE0UQRNFEETRdBEETRRBE0UQRNF0EQRNFEWT/7y1yS+wR+GYEITRdBEETRRBE2URSmleGFIChOaGL8/88hC0EQRNFGWpfw3qsc+ERiCCU2EZihffuH5n6+8MN7ZwEAuJ/Td33522cHsueRg9q4O4+WmX8AcrQ342tPP2jlkFlaHsEsOomy8xDClmbp1l8gmNFG2vgg0pZmqTTcwdt7VEDVTs+1uXKvbdKJmKnbdWm51De3+NHPRKdTTs3OTmtHcv3dnZ6+dJ6+oGUObmEvpEXQpouaw2sZcSs+gSxE19XUJubHXiz1RU0ufmEvZM+iGsBlS35hLGSjoUkTN/vYJuTH4/WVh09UQITeqbZgIm12GDLlxkB1AcdOoEfFVo2xpC/x41A541b9CJ8xYi53b+QAAAABJRU5ErkJggg==">
<title>Forge Runner</title>
<link rel="canonical" href="${PUBLIC_URL}/">
<meta property="og:url" content="${PUBLIC_URL}/">
<meta property="og:image" content="${PUBLIC_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>${STYLE}</style>
</head>
<body>
<div id="wrap">
<canvas id="c" width="600" height="300" aria-label="Forge Runner game: tap or press Space to jump, swipe down or press Down to duck" role="img"></canvas>
<button id="mute" type="button" aria-label="Mute sound">🔊</button>
<button id="sh" class="ui" type="button">Share ↗</button>
<div id="np" class="ui"><input id="ni" maxlength="12" placeholder="Your name (optional)" aria-label="Your name on the challenge (optional)" autocomplete="nickname" enterkeyhint="go"><button id="ng" type="button">Share</button></div>
<div id="toast" class="ui" role="status"></div>
</div>
<noscript><p style="position:fixed;bottom:12px;left:0;right:0;color:#7c8aa5;font-size:12px;text-align:center">Forge Runner needs JavaScript to play.</p></noscript>
<script>${SCRIPT}</script>
</body>
</html>`;
}

// ---- play tracking beacon ----
// POST /?event=visit|start|over|share with a small JSON body. One structured JSON line per accepted
// event goes to stdout (CloudWatch). No IPs, user agents or other headers are logged.
const EVENTS = new Set(["visit", "start", "over", "share"]);
const MAX_BODY = 1024;
const RATE_PER_PID = 30; // events per player per minute, per container
const RATE_GLOBAL = 600; // events per minute, per container
const rate = new Map();
let globalWin = 0;
let globalCount = 0;

let originsRaw;
let originsSet = new Set();
function allowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  if (raw !== originsRaw) {
    originsRaw = raw;
    originsSet = new Set(raw.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter((o) => /^https?:\/\/[^/\s]+$/.test(o)));
  }
  return originsSet;
}

function noContent(statusCode = 204) {
  return { statusCode, headers: { "cache-control": "no-store" }, body: "" };
}

function utmField(v) {
  const s = typeof v === "string" ? v.replace(/[^A-Za-z0-9_.\-]/g, "").slice(0, 40) : "";
  return s || "(none)";
}

function allowed(pid, nowMs) {
  const win = Math.floor(nowMs / 60000);
  if (win !== globalWin) {
    globalWin = win;
    globalCount = 0;
    rate.clear();
  }
  if (++globalCount > RATE_GLOBAL) return false;
  const n = (rate.get(pid) || 0) + 1;
  rate.set(pid, n);
  return n <= RATE_PER_PID;
}

function handleBeacon(event, nowMs) {
  const ev = event.queryStringParameters?.event;
  const headers = event.headers || {};
  // Same-origin only: browsers send Origin / Sec-Fetch-Site on beacons; reject cross-site posts.
  // Allowed: the request's own host, plus exact scheme+host origins in ALLOWED_ORIGINS (comma-separated),
  // e.g. a CloudFront domain in front of the Function URL (CloudFront does not forward the viewer Host).
  const origin = headers.origin;
  if (origin && origin !== `https://${headers.host}` && !allowedOrigins().has(origin)) return noContent(403);
  const site = headers["sec-fetch-site"];
  if (site && site !== "same-origin") return noContent(403);

  const raw = event.body || "";
  if (raw.length > MAX_BODY * 2) return noContent(413);
  const text = event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw;
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) return noContent(413);
  if (!EVENTS.has(ev)) return noContent(204); // unknown events are ignored

  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return noContent(400);
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return noContent(400);
  if (typeof d.pid !== "string" || !/^[a-f0-9]{16}$/.test(d.pid)) return noContent(400);
  let sc = 0;
  if (ev === "over" || ev === "share") {
    if (!Number.isInteger(d.score) || d.score < 0 || d.score > 99999) return noContent(400);
    sc = d.score;
  }
  // 'over' only: dur = run length in seconds (0-36000), ses = seconds since page load (0-86400).
  // Optional (pages loaded before this build don't send them), but rejected if present and invalid.
  let dur, ses;
  if (ev === "over") {
    if (d.dur !== undefined) {
      if (!Number.isInteger(d.dur) || d.dur < 0 || d.dur > 36000) return noContent(400);
      dur = d.dur;
    }
    if (d.ses !== undefined) {
      if (!Number.isInteger(d.ses) || d.ses < 0 || d.ses > 86400) return noContent(400);
      ses = d.ses;
    }
  }
  if (!allowed(d.pid, nowMs)) return noContent(429);

  const line = {
    t: "fr",
    ev,
    pid: d.pid,
    sc,
    src: utmField(d.utm_source),
    cmp: utmField(d.utm_campaign),
    cnt: utmField(d.utm_content),
    ch: d.challenge === 1 || d.challenge === true ? 1 : 0,
  };
  if (dur !== undefined) line.dur = dur;
  if (ses !== undefined) line.ses = ses;
  process.stdout.write(JSON.stringify(line) + "\n");
  return noContent(204);
}

export const handler = async (event) => {
  requestCount++;
  const isCold = coldStart;
  coldStart = false;

  const now = new Date();
  const method = event?.requestContext?.http?.method || "GET";

  if (method === "POST") {
    if (event?.queryStringParameters?.event === undefined) return noContent(400);
    return handleBeacon(event, now.getTime());
  }
  if (method !== "GET" && method !== "HEAD") return noContent(405);

  if (event?.queryStringParameters?.format === "json") {
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      body: JSON.stringify({
        message: MESSAGE,
        builtBy: BUILT_BY,
        region: process.env.AWS_REGION,
        timestamp: now.toISOString(),
        coldStart: isCold,
        requestCount,
        memoryMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
        arch: process.arch,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": CSP,
      "x-content-type-options": "nosniff",
    },
    body: renderHtml(),
  };
};
