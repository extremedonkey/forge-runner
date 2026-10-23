// AUDIO (forge enemy SFX, owner: Forge Runner Audio): slag blob, hammer drone and vent sounds. Call sites are Dev's (enemy code).
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
/* hammer drone wind-up before the slam: rising pulse + triangle sweep with a ratchet tick on top. ~0.4 s, cooldown 0.3 s */
function sfxDroneWindup(){
  var t=enGo("du",.3),i;if(t<0)return;
  tone(AU,180,1100,t,.4,1,.022,1);tone(AU,90,550,t,.4,3,.06,1);
  for(i=0;i<5;i++)noise(AU,t+i*.08,.02,1.2+i*.2,.012+i*.003);
}
/* hammer slam: metallic clang (bright noise strike, two inharmonic pulse partials ringing, low triangle body). ~0.28 s */
function sfxDroneClang(){
  var t=enGo("dc",.1);if(t<0)return;
  noise(AU,t,.1,1.4,.08);tone(AU,1180,0,t,.28,0,.028,.4);tone(AU,1770,0,t,.2,0,.018,.3);tone(AU,160,50,t,.14,3,.09,0);
}
/* vent warning: a steam hiss that builds for ~0.5 s (high noise bursts rising in level). Cooldown 0.4 s */
function sfxVentHiss(){
  var t=enGo("vh",.4),i;if(t<0)return;
  for(i=0;i<5;i++)noise(AU,t+i*.1,.13,1.9+i*.08,.025+i*.01);
}
/* vent erupts: burst whoosh (wide noise blast falling in pitch + a low triangle rumble). ~0.4 s, cooldown 0.2 s */
function sfxVentWhoosh(){
  var t=enGo("vw",.2);if(t<0)return;
  noise(AU,t,.18,.9,.085);noise(AU,t+.08,.22,.5,.05);noise(AU,t+.2,.2,.3,.03);tone(AU,95,40,t,.3,3,.08,.5);
}
`;
