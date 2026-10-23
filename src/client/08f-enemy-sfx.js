// AUDIO (forge enemy SFX, owner: Forge Runner Audio): slag blob, hammer drone and vent sounds, sfxTick. Call sites are the enemy code (ENEMIES v2), via enemySfx(type,event).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Uses only 08-audio.js globals (snd, ac, AU, aPaused, tone, noise). Runs after the other audio fragments. In both builds.
// Every function is silent when muted, before a gesture has unlocked audio, while the context isn't running, or during an
// ad (aPaused), and never creates or resumes the AudioContext. Peaks stay below the death sound; each sound has a cooldown.
export default String.raw`
/* forge enemy SFX: NES palette (w 0/1/2 = pulse 12.5/25/50%, 3 = triangle; LFSR noise) */
function enOk(){return typeof snd!=="undefined"&&snd&&AU&&ac&&ac.state==="running"&&!(typeof aPaused!=="undefined"&&aPaused)}
var enT={};
/* guard + cooldown: returns the start time, or -1 when the sound must not play (k = sound key, cd = cooldown in s) */
function enGo(k,cd){
  if(!enOk())return -1;
  var t=ac.currentTime;
  if(enT[k]!==undefined&&t-enT[k]<cd)return -1;
  enT[k]=t;return t;
}
/* slag blob hop: squelchy boing (triangle + 50% pulse upward bend, a wet noise tick). ~0.13 s, cooldown 0.12 s */
function sfxBlobHop(){
  var t=enGo("bh",.12);if(t<0)return;
  tone(AU,170,430,t,.13,3,.09,.4);tone(AU,280,700,t,.1,2,.018,.3);noise(AU,t,.04,.35,.03);
}
/* slag blob destroyed / squashed: squish pop (low noise splat, falling pulse, triangle thud). ~0.12 s, cooldown 0.06 s */
function sfxBlobPop(){
  var t=enGo("bp",.06);if(t<0)return;
  noise(AU,t,.1,.5,.07);tone(AU,900,180,t,.08,0,.03,0);tone(AU,260,70,t,.12,3,.1,0);
}
/* hammer drone on screen: tiny whirr blip (thin pulse wobble + faint octave). Safe to call every frame: cooldown 0.25 s */
function sfxDroneWhirr(){
  var t=enGo("dw",.25);if(t<0)return;
  tone(AU,520,600,t,.07,0,.024,.6);tone(AU,1040,980,t+.01,.05,0,.012,.5);
}
/* hammer drone wind-up before the slam: rising pulse + triangle sweep with a ratchet tick on top. ~0.5 s (Levels' EN_HT
   wind-up), cooldown 0.4 s */
function sfxDroneWindup(){
  var t=enGo("du",.4),i;if(t<0)return;
  tone(AU,180,1100,t,.5,1,.022,1);tone(AU,90,550,t,.5,3,.06,1);
  for(i=0;i<6;i++)noise(AU,t+i*.08,.02,1.2+i*.17,.012+i*.0025);
}
/* hammer slam: metallic clang (bright noise strike, two inharmonic pulse partials ringing, low triangle body). ~0.28 s */
function sfxDroneClang(){
  var t=enGo("dc",.1);if(t<0)return;
  noise(AU,t,.1,1.4,.08);tone(AU,1180,0,t,.28,0,.028,.4);tone(AU,1770,0,t,.2,0,.018,.3);tone(AU,160,50,t,.14,3,.09,0);
}
/* vent warning: a steam hiss that builds for ~0.6 s (Levels' EN_VT telegraph; high noise bursts rising in level). Cooldown 0.5 s */
function sfxVentHiss(){
  var t=enGo("vh",.5),i;if(t<0)return;
  for(i=0;i<5;i++)noise(AU,t+i*.117,.13,1.9+i*.08,.025+i*.01);
}
/* vent erupts (players survive it, so nothing like the death/hit crash: no low rumble, no low-rate noise): an airy
   rising whoosh, three quick noise puffs at rising rate through a band-pass sweeping up 1.4 -> 5 kHz. ~0.3 s, peak ~0.05,
   cooldown 0.2 s */
function sfxVentWhoosh(){
  var t=enGo("vw",.2);if(t<0)return;
  var c=AU.c,f=c.createBiquadFilter();f.type="bandpass";f.Q.value=1.1;
  f.frequency.setValueAtTime(1400,t);f.frequency.exponentialRampToValueAtTime(5000,t+.3);f.connect(AU.o);
  noise(AU,t,.12,1.3,.15,f);noise(AU,t+.05,.16,1.7,.125,f);noise(AU,t+.12,.17,2.2,.085,f);
  setTimeout(function(){f.disconnect()},(t-ac.currentTime+.6)*1000);
}
/* soft metallic tick (power-up extended / arrives early): two quiet inharmonic pulse pings + a tiny noise tick.
   ~60 ms, cooldown 0.1 s. Dev calls it guarded with typeof */
function sfxTick(){
  var t=enGo("tk",.1);if(t<0)return;
  tone(AU,2350,2250,t,.05,0,.042,0);tone(AU,3530,0,t,.035,0,.02,0);noise(AU,t,.012,2,.016);
}
/* Crusher boss (LEVELS-5), via enemySfx('crusher', event). Telegraph: hydraulic charge rising ~0.5 s (pulse + triangle
   sweep up, ratchet ticks speeding up, two alarm blips), cooldown 0.45 s so repeats don't stack */
function sfxCrusherCharge(){
  var t=enGo("ct",.45),i;if(t<0)return;
  tone(AU,70,300,t,.5,2,.03,1);tone(AU,55,220,t,.5,3,.08,1);
  for(i=0;i<7;i++)noise(AU,t+i*.07,.025,.5+i*.15,.012+i*.003);
  tone(AU,1175,0,t+.05,.07,0,.022,0);tone(AU,1175,0,t+.3,.07,0,.026,0);
}
/* press impact: heavy low thud (triangle 120 -> 38 Hz) + a short crunch (mid-rate noise) + a quick pulse knock. ~0.25 s,
   peak under 0.07; short and dry, so it doesn't read as the long low death roar. Cooldown 0.12 s */
function sfxCrusherSlam(){
  var t=enGo("cs",.12);if(t<0)return;
  tone(AU,120,38,t,.25,3,.092,0);noise(AU,t,.09,.7,.04);noise(AU,t+.02,.05,1.4,.02);tone(AU,240,90,t,.06,2,.02,0);
}
/* boss defeated: three metal clanks falling in pitch, then a bright C major arpeggio up to a held top note. ~1 s.
   Cooldown 2 s */
function sfxCrusherDown(){
  var t=enGo("cd",2),i,k,c,a=[72,76,79,84,88];if(t<0)return;
  for(i=0;i<3;i++){k=Math.pow(.82,i);c=t+i*.11;noise(AU,c,.04,1.5,.035);tone(AU,1230*k,0,c,.14,0,.022,0);tone(AU,1860*k,0,c,.1,0,.014,0);tone(AU,260*k,0,c,.08,3,.05,0)}
  for(i=0;i<5;i++)tone(AU,mf(a[i]),0,t+.36+i*.06,i<4?.08:.4,0,.042,.6);
  tone(AU,mf(a[4]-12),0,t+.6,.4,1,.016,.7);tone(AU,mf(48),0,t+.6,.4,3,.06,.7);
}
/* ===== hazards (gap fall, off-screen 'incoming' warnings, pass-bys) ===== */
/* stereo helper: a StereoPanner into the master (p -1 left .. 1 right, optional sweep to p2 over d), or the master
   itself where StereoPanner doesn't exist */
function enPan(p,p2,t,d){
  var c=AU.c;if(!c.createStereoPanner)return AU.o;
  var n=c.createStereoPanner();n.pan.setValueAtTime(p,t);if(p2!==undefined)n.pan.linearRampToValueAtTime(p2,t+d);
  n.connect(AU.o);setTimeout(function(){n.disconnect()},1500);return n;
}
/* gap fall: NES 'falling down the pit' slide, a stepped 25% pulse dropping two octaves (+ a thin 12.5% shadow) over a
   noise wind. ~0.5 s. die() follows 0.15-0.3 s later, so it also ducks the master to 65% from 0.13 s to ~1.05 s after
   the fall: the death crash (11-gameflow.js die(), not audio code) then plays at 65% instead of piling on. Cooldown 1 s */
var gfT=-9;
function sfxGapFall(){
  var t=enGo("gf",1),i,m;if(t<0)return;
  for(i=0;i<9;i++){m=86-i*3;tone(AU,mf(m),mf(m-1),t+i*.052,.06,1,.07,.7);tone(AU,mf(m+12),0,t+i*.052,.04,0,.012,0)}
  noise(AU,t,.25,1.3,.012);noise(AU,t+.2,.3,.9,.016);
  var g=AU.o.gain;g.cancelScheduledValues(t);g.setValueAtTime(.5,t+.1);g.linearRampToValueAtTime(.325,t+.14);
  g.setValueAtTime(.325,t+1.05);g.linearRampToValueAtTime(.5,t+1.3);gfT=t;
}
/* optional, for Dev: the death crash from die() as an audio function. Same sound; within 0.6 s of a gap fall it cancels
   the master duck and plays a shortened version at ~65% instead */
function sfxDeath(){
  if(!enOk())return;
  var t=ac.currentTime;
  if(t-gfT<.6){var g=AU.o.gain;g.cancelScheduledValues(t);g.setTargetAtTime(.5,t,.01);noise(AU,t,.26,.25,.16);tone(AU,520,60,t,.3,2,.06,0);return}
  noise(AU,t,.4,.25,.25);tone(AU,520,60,t,.45,2,.09,0);
}
/* 'incoming' warning family: one motif (two alarm blips), varied per kind. At most 2 warning voices at once (extras are
   dropped) and 0.25 s per kind. ~0.3 s each */
var wvE=[];
function enWarn(k,f1,f2,w,v,p,nd,gap,sub){
  if(!enOk())return;
  var now=ac.currentTime,n=0,i;for(i=0;i<wvE.length;i++)if(wvE[i]>now)n++;
  if(n>=2)return;
  var t=enGo("w"+k,.25);if(t<0)return;
  var o=enPan(p,undefined,t,0);
  tone(AU,f1,0,t,nd,w,v,.7,o);tone(AU,f2,0,t+gap,nd+.02,w,v,.6,o);
  if(sub){tone(AU,f1/2,0,t,nd,3,sub,.7,o);tone(AU,f2/2,0,t+gap,nd+.02,3,sub,.6,o)}
  wvE=wvE.filter(function(e){return e>now});wvE.push(t+gap+nd+.02);
}
function sfxWarnOrecart(){enWarn("o",988,1319,1,.085,.45,.12,.16,0)}       /* ahead/right: rising */
function sfxWarnRoller(){enWarn("r",740,494,2,.05,-.45,.12,.16,.06)}      /* behind/left: falling, lower */
function sfxWarnGap(){enWarn("g",392,294,3,.11,0,.14,.18,0)}              /* gap: low, hollow (triangle) */
function sfxWarnFork(){enWarn("f",1760,2349,0,.085,0,.09,.13,0)}           /* fork: bright, short */
/* ore cart passes: rattle (fast noise ticks dropping in rate) + a Doppler-ish falling pulse, panned right -> left.
   ~0.3 s, cooldown 0.2 s */
function sfxOrecartPass(){
  var t=enGo("op",.2),i;if(t<0)return;
  var o=enPan(.5,-.5,t,.3);
  for(i=0;i<9;i++)noise(AU,t+i*.033,.022,1.7-i*.09,.035,o);
  tone(AU,820,470,t,.3,1,.035,.5,o);noise(AU,t,.28,1,.018,o);
}
/* roller rolls by (the jump moment): a crisp click, then a rolling rumble (noise pulses swelling and fading) over a
   falling triangle, panned left -> right. ~0.35 s, cooldown 0.25 s */
function sfxRollerPass(){
  var t=enGo("rp",.25),i;if(t<0)return;
  var o=enPan(-.7,.7,t,.35);
  noise(AU,t,.02,2,.05,o);
  for(i=0;i<7;i++)noise(AU,t+.01+i*.045,.04,.55,.05*(1-Math.abs(i-3)/4.5),o);
  tone(AU,110,60,t,.35,3,.075,.6,o);tone(AU,300,150,t,.3,2,.02,.5,o);  /* Doppler: pitch drops as it passes */
}
/* ===== rail clack, chaser rumble, near miss ===== */
/* rail clack: the felt-speed metronome, one clack per 40-48 px of felt travel (speed x vMul() when Dev's HILLS vMul exists,
   x the sim's own dt, so rescue slow-mo and pauses are included), i.e. ~8/s at 340 px/s and ~18/s at 800. Alternating
   clack-clack pair: a band-passed noise click + a tiny 12.5% pulse ping, ~30 ms, peak ~0.02. Max 25/s. Silent in demo,
   when not running (dead/start), paused, muted / ad / locked, and while airborne (py > 0).
   Driven from audio code: its own rAF loop reads runS/speed/vMul/py/state (no gameplay hook). sfxRail(dist) is the same
   step for an explicit caller (felt px travelled this frame); once it's called, the internal loop stands down */
var rlD=0,rlN=44,rlR=-1,rlLT=-9,rlK=0,rlF=[],rlExt=0,rlS=12345;
function rlRnd(){rlS=(rlS*16807)%2147483647;return rlS/2147483647}   /* own LCG: never consumes the game's Math.random */
function rlOk(){return enOk()&&!demo&&state==="run"&&!(typeof paused!=="undefined"&&paused)}
function rlClack(t){
  var k=rlK^=1,c=AU.c,f=rlF[k];
  if(!f||f.context!==c){f=rlF[k]=c.createBiquadFilter();f.type="bandpass";f.frequency.value=k?2600:3300;f.Q.value=3;f.connect(AU.o)}
  noise(AU,t,.025,k?1.3:1.6,.068,f);tone(AU,k?1250:1500,0,t,.03,0,.016,0);
}
function rlStep(dist){
  if(!rlOk()){rlD=0;return}
  rlD+=dist;
  while(rlD>=rlN){
    rlD-=rlN;rlN=40+rlRnd()*8;
    var t=ac.currentTime;
    if(py>0||t-rlLT<.04)continue;                       /* airborne: wheels off the rail; cap 25/s */
    rlLT=t;rlClack(t);
  }
}
function sfxRail(dist){rlExt=1;dist=+dist;if(dist>0&&dist<200)rlStep(dist)}
function rlFrame(){
  if(typeof requestAnimationFrame==="function")requestAnimationFrame(rlFrame);
  rbWatch();
  if(rlExt)return;
  var r=typeof runS==="number"?runS:0,d=r-rlR;rlR=r;
  if(!(d>0)||d>.25){if(!(d>0))rlD=d<0?0:rlD;return}  /* new run (runS reset) / paused / frozen: no travel */
  var m=typeof vMul==="function"?+vMul():1;if(!(m>0))m=1;
  rlStep(speed*m*d);
}
if(typeof requestAnimationFrame==="function")requestAnimationFrame(rlFrame);
/* chaser rumble, enemySfx('roller','rumble'): once ~1.2 s before the roller overtakes. A low rumble (triangle + 50% pulse +
   noise through a 140 Hz high-pass and a ~420 Hz low-pass, so its energy sits at ~150-450 Hz, under the 'warn' blips at 494-740 Hz) with a 9->15 Hz
   wobble, rising in pitch and level. Quiet for the first 0.25 s so the warn blips (0.1 s earlier) sit on top. Panned from
   behind (left). Ends on enemySfx('roller','pass') (then the Doppler pass plays), or by itself at 1.6 s; also cut on mute,
   ad pause, game pause and run end. Peak <= ~0.055 */
var rb=null;
function sfxRollerRumble(){
  var t=enGo("rr",.8);if(t<0)return;
  rbStop();
  var c=AU.c,g=c.createGain(),w=c.createGain(),lp=c.createBiquadFilter(),o=enPan(-.6,-.15,t,1.2),
    tr=c.createOscillator(),pu=c.createOscillator(),pg=c.createGain(),ns=c.createBufferSource(),ng=c.createGain(),lf=c.createOscillator(),lg=c.createGain();
  lp.type="lowpass";lp.frequency.setValueAtTime(380,t);lp.frequency.linearRampToValueAtTime(460,t+1.2);lp.Q.value=.8;
  var hp=c.createBiquadFilter();hp.type="highpass";hp.frequency.value=140;hp.Q.value=.7;
  var V=.075;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(V*.18,t+.25);g.gain.linearRampToValueAtTime(V,t+1.2);
  g.gain.setValueAtTime(V,t+1.5);g.gain.linearRampToValueAtTime(0,t+1.6);
  w.gain.value=.75;lf.frequency.setValueAtTime(9,t);lf.frequency.linearRampToValueAtTime(15,t+1.2);lg.gain.value=.25;
  lf.connect(lg);lg.connect(w.gain);
  tr.type="triangle";tr.frequency.setValueAtTime(130,t);tr.frequency.exponentialRampToValueAtTime(250,t+1.2);
  pu.setPeriodicWave(AU.P[2]);pu.frequency.setValueAtTime(65,t);pu.frequency.exponentialRampToValueAtTime(125,t+1.2);pg.gain.value=.5;
  ns.buffer=AU.nb;ns.loop=true;ns.playbackRate.setValueAtTime(.6,t);ns.playbackRate.linearRampToValueAtTime(1,t+1.2);ng.gain.value=.35;
  tr.connect(w);pu.connect(pg);pg.connect(w);ns.connect(ng);ng.connect(w);w.connect(g);g.connect(hp);hp.connect(lp);lp.connect(o);
  var S=[tr,pu,ns,lf];S.forEach(function(s){s.start(t);s.stop(t+1.65)});
  var r=rb={g:g,S:S,N:[g,w,hp,lp,pg,ng,lg],end:t+1.62};
  setTimeout(function(){if(rb===r)rbStop()},1700);
}
function rbStop(){
  var r=rb;if(!r)return;rb=null;
  if(ac){var t=ac.currentTime;r.g.gain.cancelScheduledValues(t);r.g.gain.setTargetAtTime(0,t,.015);
    r.S.forEach(function(s){try{s.stop(t+.1)}catch(e){}})}
  setTimeout(function(){r.N.forEach(function(n){try{n.disconnect()}catch(e){}})},250);
}
/* per frame (rlFrame): cut the rumble when it can't be heard or the run is over */
function rbWatch(){if(rb&&(!enOk()||state!=="run"||typeof paused!=="undefined"&&paused||ac.currentTime>rb.end))rbStop()}
function sfxRollerPassD(){rbStop();sfxRollerPass()}
/* near miss (Dev: cleared an enemy / gap lip by <= 12 px): quick rising 12.5% pulse arpeggio + a high triangle chime.
   ~0.18 s, peak <= ~0.045, cooldown 0.3 s */
function sfxNearMiss(){
  var t=enGo("nm",.3),i;if(t<0)return;
  for(i=0;i<4;i++)tone(AU,mf([88,92,95,100][i]),0,t+i*.032,i<3?.04:.09,0,.06,.5);
  tone(AU,mf(100),0,t+.1,.08,3,.04,.4);
}
/* enemySfx(type, event): one entry point for the enemy code (ENEMIES v2). slag: telegraph = hop, burst = pop;
   vent: telegraph = hiss, burst = whoosh; drone: telegraph = wind-up, swing = clang, hover = whirr (ok every frame);
   crusher (boss): telegraph = hydraulic charge, slam = impact, down = defeat sting;
   hazards: orecart approach/pass, roller warn/rumble/pass, gap warn, fork warn (warnings share the 'incoming' motif, max 2 at once).
   Unknown type/event: nothing. Same guards and cooldowns as the functions it calls. Returns true when the pair is known */
var EN_MAP={slag:{telegraph:sfxBlobHop,burst:sfxBlobPop},vent:{telegraph:sfxVentHiss,burst:sfxVentWhoosh},
  drone:{telegraph:sfxDroneWindup,swing:sfxDroneClang,hover:sfxDroneWhirr},
  crusher:{telegraph:sfxCrusherCharge,slam:sfxCrusherSlam,down:sfxCrusherDown},
  orecart:{approach:sfxWarnOrecart,pass:sfxOrecartPass},roller:{warn:sfxWarnRoller,rumble:sfxRollerRumble,pass:sfxRollerPassD},
  gap:{warn:sfxWarnGap},fork:{warn:sfxWarnFork}};
function enemySfx(type,ev){
  var h=Object.prototype.hasOwnProperty,m=typeof type==="string"&&h.call(EN_MAP,type)?EN_MAP[type]:0,f=m&&typeof ev==="string"&&h.call(m,ev)?m[ev]:0;
  if(!f)return false;
  f();return true;
}
`;
