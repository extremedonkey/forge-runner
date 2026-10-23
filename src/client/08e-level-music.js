// AUDIO (LEVELS-3 level music, owner: Forge Runner Audio): five level loops appended to TRK, and musicLevel(n).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Runs after 08d-fx-sfx.js (08-audio.js defines TRK/TRN/TI/mPend and the scheduler). In both builds.
// The per-run random pick (startMusic) only uses the first TRN (5) tracks, so nothing changes until gameplay calls
// musicLevel(n). It never makes a sound itself: the scheduler plays the new track only while sound is on, audio is
// unlocked and no ad is playing, and it never creates or resumes the AudioContext.
export default String.raw`
/* level tracks (all original), TRK[5..9] = levels 1..5; same format and layers (L0-L3) as the tracks above */
TRK.push(
 /* 5 L1 Foundry: D mixolydian, 152 BPM (L3 ~165), I bVII IV I bVI bVII V I, bright anthem bounce (the current vibe) */
 {l:"J.N.Q...N.Q.V...T.Q.O...L.O.T...T.Q.O.Q.V.....T.Q...N.L.J.......R.Q.M...J.M.R...T.R.O.L.T.....R.Q.O.L.I.L...Q...V...T.Q.N...L...",
  r:[50,48,43,50,46,48,45,50],b:[0,12,0,12,0,12,7,12],q:"44444444",sd:.099,s3:.091,w:[1,2],aw:0,
  k:"x.......x.......",k3:"x.......x.x.....",kl:"x.......x.x...x.",sn:"....x.......x...",h:"x.x.x.x.x.x.x.x."},
 /* 6 L2 Slag Pits: E phrygian, 124 BPM (L3 ~133), i bII i bVII i bVI bII i, heavy half-time sludge, low 50% pulse lead */
 {l:"L.....M.L...G...M...O.M.L.......L.__L.O.Q...O.M.J.....L.M...J...L...S...Q.O.M...H.....L.O...T...S.Q.O.M.L.M.O...L...........____",
  r:[40,41,40,38,40,36,41,40],b:[0,0,12,0,0,7,12,0],q:"34333443",sd:.121,s3:.112,w:[2,2],aw:2,
  k:"x.....x...x.....",k3:"x.....x.x.x.....",kl:"x.....x.x.x.x.x.",sn:"........x.......",h:"x...x...x...x..."},
 /* 7 L3 Ember Vents: E lydian, 168 BPM (L3 ~180), I II vi II IV II V I, driving four-on-the-floor, offbeat hats, bright 12.5% lead */
 {l:"L.P.S.X.W.S.P...N.R.U...S.R.N...U.S.P.L.I...L...N.P.R.U.S...R...Q.U.X...U.Q.L...N.R.U.Z.X...U...S.W.Z...X.W.S...X...S.P.L...P...",
  r:[40,42,37,42,45,42,47,40],b:[0,12,0,12,0,12,0,12],q:"44344444",sd:.089,s3:.082,w:[0,1],aw:1,
  k:"x...x...x...x...",k3:"x...x...x...x.x.",kl:"x...x...x.x.x.xx",sn:"....x.......x...",h:"..x...x...x...x."},
 /* 8 L4 Hammer Works: G minor, 140 BPM (L3 ~151), i i bVI bVII i iv bVII V, percussive stabs + metallic anvil hits on 2 & 4-and */
 {l:"O.__O_R.__V.T.R.Q.__O.__M.O.Q...K.__O.__R.T.R.O.M.__Q.__T...V...O.__O_V.__T.R.O.T.__W.__V.T.O...R.Q.M.J.M.Q.T...V.__T.__R.Q.N...",
  r:[43,43,39,41,43,36,41,38],b:[0,0,12,0,0,0,12,7],q:"33443344",sd:.107,s3:.099,w:[1,0],aw:0,
  k:"x.....x.x.......",k3:"x.....x.x...x...",kl:"x.....x.x.x.x.x.",sn:"....x.......x...",h:"x.x.x.x.x.x.x.x.",a:"....x.......x.x."},
 /* 9 L5 Crusher: C harmonic minor, 180 BPM (L3 ~195), i bVI iv V i bII bVII V, boss: 8th-note kick, chromatic runs, offbeat snare stabs */
 {l:"T.S.T.O.K.O.T...P.O.P.K.H.K.P...M.P.T.Y.W.V.T.P.O.S.V.Y.W.V.S...T.W.[...Y.W.V.T.U.T.P.M.I.M.P...R.V.Y.V.R.M.J...O.P.S.T.V.W.Y.[.",
  r:[48,44,41,43,48,37,46,43],b:[0,12,0,12,7,12,0,12],q:"34433443",sd:.083,s3:.077,w:[1,0],aw:1,
  k:"x.x.x.x.x.x.x.x.",k3:"x.xxx.x.x.xxx.x.",kl:"x.xxx.xxx.xxxxxx",sn:"....x.......x..x",h:"x.x.x.x.x.x.x.x."}
);
/* musicLevel(n), n = 1..5: switch the music to that level's track. Call it after start() (startMusic() picks the random
   run track) and on each level change.
   - Early (the run's music is still in bar 1, or hasn't started): switch at once, from the level track's bar 1. Anything
     already scheduled from the random pick is cut before it sounds, so there's no bar of the random track first.
   - Later: switch at the next bar line, from the level track's bar 1.
   Already on (or switching to) that track, or an invalid n: nothing happens. Returns true when it switched or queued */
function musicLevel(n){
  if(typeof n!=="number"||n!==(n|0)||n<1||n>5)return false;
  /* a levelSting(n) is playing or queued its handoff: hold off, the sting hands off to n itself after it ends */
  if(lsN===n&&lsRun===mRun)return false;
  var j=TRN+n-1;
  if(mI<16){
    mPend=-1;if(TI===j)return false;
    TI=j;mCut();mI=0;mNext=0;return true;
  }
  if(mPend<0?TI===j:mPend===j)return false;
  mPend=TI===j?-1:j;return true;
}
/* levelSting(n), n = 2..5: call once when the level-n banner fires (fits inside the 1.5 s banner). It plays a rising sting
   in the key of level n's track, ducks the music bus to 30% while it plays, then hands off to the level-n theme on the
   first bar line after the sting ends (queues the same bar-line switch musicLevel(n) uses).
   - While a sting for n is active, musicLevel(n) calls (any order in the same frame, every frame) do nothing. A next-bar
     switch to n already queued is pushed back to after the sting.
   - n = 5 (Crusher): lower register, a big noise hit, slower rise, low power chord.
   - Invalid n, n = 1 or the same level as the last sting this run: nothing. 2 s cooldown.
   - Muted, ad pause, before the unlock or no running context: no sound, but the handoff (musicLevel(n)) still happens at once.
     It never creates or resumes the AudioContext.
   - The duck is automation on the music bus MB. A restart or ad pause cuts that bus (mCut), and the next one starts at full
     level. A mute toggle leaves the bus alone and its ramp back still runs. Returns true when it played or handed off */
var lsN=0,lsRun=-1,lsEnd=0,lsLast=0,lsLastRun=-1,lsT=-9999,lsTm=0;
function lsOk(){return snd&&AU&&ac&&ac.state==="running"&&!aPaused}
function levelSting(n){
  if(typeof n!=="number"||n!==(n|0)||n<2||n>5)return false;
  var now=performance.now();
  if(lsLastRun===mRun&&lsLast===n)return false;
  if(now-lsT<2000)return false;
  var j=TRN+n-1;
  lsLast=n;lsLastRun=mRun;lsT=now;
  if(mPend===j)mPend=-1;                                   /* re-defer a switch musicLevel(n) queued earlier */
  if(!lsOk()){lsN=0;musicLevel(n);return true}             /* silent: hand off at once */
  var T=TRK[j],rt=T.r[0],q=T.q.charCodeAt(0)-48,t=ac.currentTime,d,i,
    W5=n===5,st=W5?.13:.07,base=rt+(W5?12:24),w=[0,2,1,0,2][n-1],sc=[0,q,7,12,12+q,19];
  for(i=0;i<6;i++)tone(AU,mf(base+sc[i]),0,t+i*st,st+.02,w,.05,.6);
  for(i=0;i<6;i++)noise(AU,t+i*st,st+.02,.3+i*.25,.012+i*.005);           /* riser */
  var c=t+6*st;
  if(W5){
    noise(AU,t,.4,.3,.13);tone(AU,110,35,t,.35,3,.13,0);                    /* big hit */
    tone(AU,mf(base),0,c,.5,2,.05,.7);tone(AU,mf(base+7),0,c,.5,2,.035,.7);tone(AU,mf(rt),0,c,.5,3,.14,.7);
    noise(AU,c,.12,.5,.08);noise(AU,c+.25,.08,.5,.05);                      /* piston chugs */
    d=6*st+.55;
  }else{
    tone(AU,mf(base+12),0,c,.42,w,.05,.6);tone(AU,mf(base+19),0,c,.42,0,.03,.6);tone(AU,mf(rt+12),0,c,.42,3,.12,.6);
    noise(AU,c,.3,1.6,.04);
    if(n===4){noise(AU,c,.05,1.5,.07);tone(AU,1230,0,c,.16,0,.025,0);tone(AU,1860,0,c,.12,0,.018,0)}  /* steel: anvil */
    d=6*st+.45;
  }
  if(MB){var B=MB,g=B.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(.3,t+.08);
    g.setValueAtTime(.3,t+d-.15);g.linearRampToValueAtTime(1,t+d+.1);
    /* belt and braces: Chrome can stall a bus's automation while nothing feeds it (muted mid-sting), so pin it back to 1 */
    setTimeout(function(){if(MB===B&&ac){g.cancelScheduledValues(ac.currentTime);g.setTargetAtTime(1,ac.currentTime,.03)}},d*1000+200)}
  lsN=n;lsRun=mRun;lsEnd=now+d*1000;lsEA=t+d;
  clearTimeout(lsTm);lsTm=setTimeout(lsPoll,50);
  return true;
}
/* handoff: queue the switch (mPend, applied by mtick on a bar line) as soon as the next bar line still to be scheduled
   falls at or after the sting's end (lsEA, context time). When music isn't being scheduled (muted, ad, hidden), hand
   off through musicLevel(n) once the sting time is over */
var lsEA=0;
function lsPoll(){
  if(!lsN||lsRun!==mRun){lsN=0;return}
  var j=TRN+lsN-1,live=mOn&&snd&&MB&&ac&&!aPaused&&mNext>=ac.currentTime;
  if(live){
    var T=TRK[TI],sd=mL>2?T.s3:T.sd,nb=mNext+((16-(mI&15))&15)*sd;
    if(TI===j||mPend>=0&&mPend!==j){lsN=0;return}                       /* switched on the bar line (or overridden) */
    if(mPend!==j&&nb>=lsEA-.005)mPend=j;   /* stays held (lsN) until mtick applies it, so musicLevel(n) can't jump early */
  }else if(performance.now()>=lsEnd){var m=lsN;lsN=0;musicLevel(m);return}
  lsTm=setTimeout(lsPoll,50);
}
`;
