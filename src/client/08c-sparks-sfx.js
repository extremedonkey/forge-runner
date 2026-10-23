// AUDIO (sparks SFX, owner: Forge Runner Audio, sparks PR3): SPEC §5. Call sites belong to other sparks PRs (5, 6, 8, 9).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Uses only 08-audio.js globals (snd, ac, AU, mf, tone, noise) + sfxNewBest() from 08b. Runs after 08b-leaderboard-sfx.js.
// Every function is silent when muted, before a gesture has unlocked audio, or during an ad (aPaused, if present).
// None of them creates or resumes the AudioContext. Peaks stay at or below the existing game SFX.
export default String.raw`
/* sparks SFX: NES palette (w 0/1/2 = pulse 12.5/25/50%, 3 = triangle; LFSR noise) */
/* typeof guards: also safe when the sparks fragments are evaluated alone (scripts/test-build.mjs probe) */
function skAOk(){return typeof snd!=="undefined"&&snd&&AU&&ac&&ac.state==="running"&&!(typeof aPaused!=="undefined"&&aPaused)}
var skCT=-9,skCN=0;
/* spark pickup: short square blip; each pickup within 0.6 s of the last climbs a pentatonic step (8 steps max),
   then the chain resets. At most one blip per 40 ms, so a magnet burst never stacks up loud */
function sfxSpark(){
  if(!skAOk())return;
  var t=ac.currentTime,dt=t-skCT;
  if(dt<.04)return;
  skCN=dt<.6?Math.min(skCN+1,7):0;skCT=t;
  var m=84+[0,2,4,7,9,12,14,16][skCN];
  tone(AU,mf(m),0,t,.045,2,.04,.5);tone(AU,mf(m+12),0,t+.012,.03,0,.02,0);
}
/* purchase: anvil clang (metal noise + triangle strike + ringing partials), then an arpeggio with lv notes;
   each track k (m c d p r) sits in its own key */
function sfxBuy(k,lv){
  if(!skAOk())return;
  var t=ac.currentTime,o=({m:0,c:2,d:4,p:5,r:7}[k])||0,n=Math.max(1,Math.min(5,lv|0)),i;
  noise(AU,t,.1,1.4,.12);noise(AU,t,.03,.3,.1);
  tone(AU,330,180,t,.22,3,.3,0);tone(AU,mf(89),0,t,.35,0,.035,.4);tone(AU,mf(96),0,t+.01,.28,0,.025,.3);
  for(i=0;i<n;i++)tone(AU,mf(72+o+[0,4,7,12,16][i]),0,t+.14+i*.065,i===n-1?.16:.07,1,.06,.6);
}
/* level-up sting (~0.7 s): a quick 6-note pulse run up the major scale, then a "ta-DA": short root, held sixth+octave
   dyad with a triangle octave hop. No clang (unlike sfxBuy) and no fanfare (unlike sfxAllMax). k = track (same key as
   sfxBuy, optional); dl = delay in s (optional, e.g. to land after sfxBuy's arpeggio). Cooldown 0.5 s */
var skLUT=-9;
function sfxLevelUp(k,dl){
  if(!skAOk())return;
  var t0=ac.currentTime;if(t0-skLUT<.5)return;skLUT=t0;
  var t=t0+(dl>0?Math.min(dl,1):0),o=({m:0,c:2,d:4,p:5,r:7}[k])||0,r=[67,69,71,72,74,76],i;
  for(i=0;i<6;i++)tone(AU,mf(r[i]+o),0,t+i*.035,.04,2,.045,.5);
  tone(AU,mf(72+o),0,t+.23,.07,1,.055,.5);
  tone(AU,mf(81+o),0,t+.31,.4,1,.05,.6);tone(AU,mf(84+o),0,t+.31,.4,0,.035,.6);
  tone(AU,mf(48+o),0,t+.23,.07,3,.14,0);tone(AU,mf(60+o),0,t+.31,.3,3,.14,.4);
}
/* can't afford: low dull thunk */
function sfxNoBuy(){
  if(!skAOk())return;
  var t=ac.currentTime;
  tone(AU,120,70,t,.12,3,.28,0);noise(AU,t,.05,.18,.07);tone(AU,mf(40),0,t,.06,2,.03,0);
}
/* an upgrade became affordable this run: soft ding. dl = delay in s (default .5: called when the row appears) */
function sfxAfford(dl){
  if(!skAOk())return;
  var t=ac.currentTime+(dl==null?.5:dl);
  tone(AU,mf(95),0,t,.3,0,.05,.45);tone(AU,mf(100),0,t+.08,.35,0,.03,.4);
}
/* Spare Core reboot: power-down sweep, a beat of silence, power-up sweep (distinct from the shield break 900->180 Hz) */
function sfxReboot(){
  if(!skAOk())return;
  var t=ac.currentTime;
  tone(AU,880,90,t,.28,2,.07,.7);noise(AU,t,.12,.5,.1);
  tone(AU,110,1320,t+.36,.3,1,.07,.7);tone(AU,mf(88),0,t+.68,.12,0,.05,.4);tone(AU,mf(93),0,t+.76,.16,0,.05,.4);
}
/* Forge Plate L3 re-forge: the shield pickup reversed, a rising crescendo of shimmer notes that lands on the "shing" */
function sfxReforge(){
  if(!skAOk())return;
  var t=ac.currentTime,n=[95,91,88,83,88,95],i;
  for(i=0;i<5;i++)tone(AU,mf(n[i]-12+i*3),0,t+i*.05,.06,0,.012+i*.008,.5);
  tone(AU,mf(88),0,t+.25,.16,2,.07,.5);noise(AU,t+.25,.06,1.6,.07);
}
/* last level of everything bought: the new-best fanfare plus a high double flourish */
function sfxAllMax(){
  if(!skAOk())return;
  if(typeof sfxNewBest==="function")sfxNewBest();
  var t=ac.currentTime+1.15;
  tone(AU,mf(96),0,t,.1,0,.04,.5);tone(AU,mf(100),0,t+.1,.1,0,.04,.5);tone(AU,mf(103),0,t+.2,.3,0,.035,.5);
}
`;
