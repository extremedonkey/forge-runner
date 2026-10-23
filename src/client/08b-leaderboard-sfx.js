// AUDIO (leaderboard SFX, by Forge Runner Audio): sfxFlagPass() when a flag is passed, sfxNewBest(dl) on a confirmed new best.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Uses only 08-audio.js globals (snd, ac, AU, mf, tone, noise); silent until a gesture unlocks audio, or while muted.
export default String.raw`
/* Forge Runner leaderboard SFX (pending integration; paste inside the game script's audio code, same scope).
   Uses only existing audio globals: snd (sound on), ac (AudioContext|null), AU (mkA() output; AU.o = master/SFX bus),
   mf(midi->Hz), tone(A,f1,f2,t,d,w,v,s[,o]) (w 0/1/2 = pulse 12.5/25/50%, 3 = triangle), noise(A,t,d,rate,v[,o]).
   Never creates/resumes the context: silent no-op until a gesture has unlocked audio, or while muted. */
function lbOk(){return snd&&AU&&ac&&ac.state==="running"}
var lfT=-9,lfN=0;
/* passed another player's flag: 2-note up-chirp (~0.12 s). Rapid passes climb a pentatonic step (resets after 0.6 s);
   calls within 60 ms of the last are dropped so stacks never pile up */
function sfxFlagPass(){
  if(!lbOk())return;
  var t=ac.currentTime,dt=t-lfT;
  if(dt<.06)return;
  lfN=dt<.6?Math.min(lfN+1,4):0;lfT=t;
  var m=88+[0,2,4,7,9][lfN];
  tone(AU,mf(m),0,t,.05,1,.045,.6);
  tone(AU,mf(m+5),0,t+.05,.07,1,.04,.5);
}
/* new personal best / top 10: short rising fanfare, ~1.3 s. Optional dl = start delay in s (e.g. .4 after the death sound) */
function sfxNewBest(dl){
  if(!lbOk())return;
  var t=ac.currentTime+(dl||0),n=[67,72,76,79,84],k;
  for(k=0;k<4;k++){tone(AU,mf(n[k]),0,t+k*.09,.085,1,.06,.7);tone(AU,mf(n[k]-24),0,t+k*.09,.085,3,.12,.8)}
  t+=.38;
  tone(AU,mf(n[4]),0,t,.7,2,.06,.6);tone(AU,mf(79),0,t,.7,0,.035,.6);tone(AU,mf(48),0,t,.75,3,.18,.8);
  tone(AU,mf(n[4]),mf(n[4]+.3),t+.15,.55,1,.025,.7);
  noise(AU,t,.35,.6,.08);noise(AU,t,.04,.3,.1);
}
`;
