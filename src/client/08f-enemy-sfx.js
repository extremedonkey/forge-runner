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
/* enemySfx(type, event): one entry point for the enemy code (ENEMIES v2). slag: telegraph = hop, burst = pop;
   vent: telegraph = hiss, burst = whoosh; drone: telegraph = wind-up, swing = clang, hover = whirr (ok every frame);
   crusher (boss): telegraph = hydraulic charge, slam = impact, down = defeat sting.
   Unknown type/event: nothing. Same guards and cooldowns as the functions it calls. Returns true when the pair is known */
var EN_MAP={slag:{telegraph:sfxBlobHop,burst:sfxBlobPop},vent:{telegraph:sfxVentHiss,burst:sfxVentWhoosh},
  drone:{telegraph:sfxDroneWindup,swing:sfxDroneClang,hover:sfxDroneWhirr},
  crusher:{telegraph:sfxCrusherCharge,slam:sfxCrusherSlam,down:sfxCrusherDown}};
function enemySfx(type,ev){
  var h=Object.prototype.hasOwnProperty,m=typeof type==="string"&&h.call(EN_MAP,type)?EN_MAP[type]:0,f=m&&typeof ev==="string"&&h.call(m,ev)?m[ev]:0;
  if(!f)return false;
  f();return true;
}
`;
