// AUDIO (owner: Audio): Web Audio engine, soundtracks TRK, music scheduler, mute button + sound-on unlock (fr_snd2).
// Interface: sfx(f1,f2,dur,wave,vol,delay), sfxPickup(k), sfxExpire(), puWarnTick(), noise(AU,t,d,rate,v) (guard with snd&&AU), startMusic(), stopMusic(), audioHookAds(ads) (automatic for FRAds.create), mLT (build-up level 0..3, set by gameplay).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
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
function sfx(f1,f2,d,w,v,dl){if(snd&&AU&&!aPaused)tone(AU,f1,f2,ac.currentTime+(dl||0),d,w,v||.08,0)}
/* power-up SFX (k: "s" shield, "j" spring/super-jump, "g" big cart). All silent when muted or before the first gesture (AU unset). */
function sfxPickup(k){
  if(!snd||!AU||aPaused)return;
  var t=ac.currentTime;
  if(k==="s"){ /* shield: metallic "shing" + octave lock-on shimmer */
    noise(AU,t,.05,1.6,.06);tone(AU,mf(76),0,t,.06,2,.08,0);tone(AU,mf(88),0,t+.06,.2,2,.07,.5);tone(AU,mf(95),0,t+.1,.16,0,.035,.4);
  }else if(k==="j"){ /* spring: boing slide up, then a high double ping */
    tone(AU,300,1400,t,.16,1,.08,.8);tone(AU,mf(93),0,t+.17,.05,0,.06,0);tone(AU,mf(98),0,t+.23,.1,0,.06,.4);
  }else{ /* big cart: heavy triangle thud + low power-chord climb */
    noise(AU,t,.12,.35,.14);tone(AU,140,50,t,.18,3,.4,0);
    for(var i=0;i<3;i++){tone(AU,mf([48,55,60][i]),0,t+.08+i*.07,.08,2,.075,.6);tone(AU,mf([60,67,72][i]),0,t+.08+i*.07,.08,1,.04,.6)}
    tone(AU,mf(67),0,t+.29,.16,2,.08,.5);
  }
}
/* timed power-up ended (spring / big cart) */
function sfxExpire(){sfx(mf(79),mf(60),.25,1,.08);sfx(mf(67),0,.08,0,.05,.22)}
/* about to expire: 3 quick blips (falling) starting 1 s before the end; higher for spring, lower for big cart */
function sfxExpireWarn(k){
  var m=k==="j"?91:79;
  for(var i=0;i<3;i++)sfx(mf(m-i*2),0,.045,0,.06,i*.16);
}
/* call once per simulation step while running: fires sfxExpireWarn once as spT / bgT cross 1 s */
var wJ=0,wG=0;
function puWarnTick(){
  if(wJ>1&&spT<=1&&spT>0)sfxExpireWarn("j");
  if(wG>1&&bgT<=1&&bgT>0)sfxExpireWarn("g");
  wJ=spT;wG=bgT;
}
/* mute button glyph: pixel speaker (on: two sound waves, muted: a bold X) on a 10x8-unit grid, drawn like the HUD text (txt() in
   14-render.js): #f1f5f9 fill over a rgba(5,7,13,.75) outline of the same width, no box. One path, so the outline sits under
   every pixel's fill. placeMute() sizes it to the score digits' cap height and lines it up with the score row */
function pxP(a){for(var d="",i=0;i<a.length;i+=4)d+="M"+a[i]+" "+a[i+1]+"h"+a[i+2]+"v"+a[i+3]+"h"+(-a[i+2])+"z";return d}
var MG_S=[0,2,2,4,2,1,1,6,3,0,1,8],MG_ON=pxP(MG_S.concat([5,2,1,4,6,0,1,1,7,1,1,6,6,7,1,1])),
  MG_OFF=pxP(MG_S.concat([5,2,2,1,8,2,2,1,6,3,3,2,5,5,2,1,8,5,2,1]));
/* (HTML parser markup: no SVG namespace URL, which the Poki build's external-URL check would flag) */
btn.innerHTML='<svg aria-hidden="true" focusable="false"><path fill="#f1f5f9" stroke="rgba(5,7,13,.75)" stroke-linejoin="round" paint-order="stroke"></path></svg>';
var mSvg=btn.firstChild,mPath=mSvg.firstChild;
/* HUDY: HUD score-row shift (game units) when the button can't move up to the row (Poki: kept at top 96 px, below the Pill) */
var HUDY=0;
/* called from fit() (both builds) after CS/OY/HS are set. Touch target >= 44 px. The glyph's left gap = the score's right gap,
   and its vertical centre = the score digits' centre */
function placeMute(){
  var B=Math.round(Math.max(44,Math.min(46,36*CS))),fs=20*HS*CS,ch=fs*.72,u=ch/8,ol=2*CS/u,
    gx=14*CS+fs*.06,gl=Math.max(0,Math.round(gx-(B-10*u)/2)),cy,top;
  HUDY=0;cy=(hudB()+OY)*CS-ch/2;
  if(isPoki()){top=96;HUDY=(top+B/2-cy)/CS;cy=top+B/2}
  else top=Math.max(0,Math.round(cy-B/2));
  btn.style.left=gl+"px";btn.style.top=top+"px";btn.style.width=btn.style.height=B+"px";
  mSvg.setAttribute("viewBox",(-ol)+" "+(-ol)+" "+(10+2*ol)+" "+(8+2*ol));
  mSvg.style.width=(10+2*ol)*u+"px";mSvg.style.height=(8+2*ol)*u+"px";
  mSvg.style.left=(gx-gl-ol*u)+"px";mSvg.style.top=(cy-top-ch/2-ol*u)+"px";
  mPath.setAttribute("stroke-width",2*ol);
}
function setBtn(){
  mPath.setAttribute("d",snd?MG_ON:MG_OFF);
  btn.setAttribute("aria-label",snd?"Mute sound":"Unmute sound");
}
function aInit(){
  if(!ac){
    var AC=window.AudioContext||window.webkitAudioContext;
    if(AC){try{ac=new AC();AU=mkA(ac)}catch(e){ac=null;AU=null}}
  }
  if(ac&&ac.state!=="running"&&!aPaused){try{ac.resume()}catch(e){}}
  return !!AU;
}
/* any gesture (capture, before game handlers): create/resume while sound is on; also re-resumes after iOS interruptions */
function unlock(){
  if(!snd||aPaused||ac&&ac.state==="running")return;
  if(aInit())mNext=0;else{snd=false;setBtn()}
}
["pointerdown","pointerup","touchstart","touchend","mousedown","keydown","click"].forEach(function(e){window.addEventListener(e,unlock,true)});
btn.addEventListener("click",function(){
  snd=!snd;
  if(snd&&!aPaused&&!aInit())snd=false;
  if(AU){AU.o.gain.cancelScheduledValues(ac.currentTime);AU.o.gain.setValueAtTime(snd?.5:0,ac.currentTime)}
  mNext=0;lss("fr_snd2",snd?"1":"0");
  if(AD)try{AD.setSoundEnabled(snd)}catch(e){}
  setBtn();sfx(660,990,.08,1);btn.blur();
});
setBtn();
/* ads (portal builds): while an ad plays, music stops and the context is suspended; gestures and sfx stay silent.
   On resume: context back (only if sound is on) and the current track carries on. No-op without the FRAds adapter (Lambda/site build). */
var aPaused=false,AD=null;
function audioAdPause(){
  aPaused=true;stopMusic();
  if(ac&&ac.state==="running"){try{var p=ac.suspend();if(p&&p.catch)p.catch(function(){})}catch(e){}}
}
function audioAdResume(){
  if(!aPaused)return;
  aPaused=false;mOn=true;mNext=0;
  if(snd&&ac){try{var p=ac.resume();if(p&&p.catch)p.catch(function(){})}catch(e){}}
}
/* chain the audio hooks onto an adapter instance; its onPause/onResume hold one handler each, so the game's own
   handler (registered before or after) is wrapped, not replaced */
function audioHookAds(a){
  if(!a||typeof a.onPause!=="function"||a._au)return a;
  var oP=a.onPause,oR=a.onResume;a._au=1;AD=a;
  a.onPause=function(fn){return oP.call(a,function(){try{if(fn)fn()}catch(e){}audioAdPause()})};
  a.onResume=function(fn){return oR.call(a,function(){audioAdResume();try{if(fn)fn()}catch(e){}})};
  a.onPause(null);a.onResume(null);
  try{a.setSoundEnabled(snd)}catch(e){}
  return a;
}
/* every FRAds.create() made by the game gets the audio hooks (FRAds is loaded before the game script on portal builds) */
if(window.FRAds&&typeof FRAds.create==="function"&&!FRAds._au){
  var fC=FRAds.create;FRAds._au=1;
  FRAds.create=function(){return audioHookAds(fC.apply(FRAds,arguments))};
}

`;
