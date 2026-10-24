// AUDIO (LAB, Mine Cart Madness PoC): one original mine-cart track pushed onto TRK and mineMusic(on). Lab only, see HOOK.md.
// Client fragment, not an ES module: joined into the lab layer's shared IIFE scope (after 08-audio.js and 08e-level-music.js,
// which define TRK/TRN/TI/mPend/mI/mNext/mRun/mCut/lsN/bossOn). Plain browser JS inside the String.raw template; no backticks,
// no ${...}. It never makes a sound itself: the 08 scheduler plays the track only while sound is on, audio is unlocked and no
// ad is playing, and nothing here creates or resumes the AudioContext.
export default String.raw`
/* Mine cart track (original), TRK[MT]: D dorian, ~110 BPM (sd .136 = 110.3; L3 s3 .125 = 120), i i III bVII i IV bVII v
   (Dm Dm F C Dm G C Am). Dark industrial rails between L2 Slag Pits (heavy) and L4 Hammer Works (metallic): rolling
   rail-gallop bass, shuffled hats, late snare, and sparse anvil clangs on 2 and the 4-and. Same fields and layers (L0-L3) as
   the tracks in 08-audio.js. It is pushed AFTER TRN was fixed, so it is NOT in the random startMusic pick: it only plays via
   mineMusic(true). TRN is not touched. */
var MT=TRK.length;
TRK.push({l:"J.__J.L.__M.L.J.Q...O.M.L.__J.__M.__M.O.__Q.O.M.L.__H.L.__O...M.J.__J.L.__M.O.Q.S.__S.Q.__O.Q.S.T.__T.S.__Q.O.M.Q...O...M.L.J...",
  r:[38,38,41,36,38,43,36,45],b:[0,0,12,0,0,7,12,7],q:"33443443",sd:.136,s3:.125,w:[2,1],aw:2,
  k:"x.....x.x.......",k3:"x.....x.x...x...",kl:"x.....x.x.x.x.xx",sn:"....x.....x.....",h:"x..xx.x..xx.x.x.",a:"....x.........x."});
/* mineMusic(on): the lab calls mineMusic(true) when the mine cart section/run starts and mineMusic(false) to leave it.
   - true: switch to the mine cart track at the next bar line (at once within the run's first bar, like musicLevel/bossMusic).
     The track playing (or queued) at that moment is remembered in mmPrev.
   - false: back to mmPrev at the next bar line (falls back to track 0 (first random-pool index) if it is somehow unknown).
   - Idempotent: repeats return false. State belongs to the run (mRun): a new run (start() -> startMusic) is never in mine mode,
     so startMusic needs no wrapper and nothing is left behind after a death.
   - 08e is not edited, so musicLevel(n) / levelSting(n) are NOT blocked while this is on. The lab must call mineMusic and not
     musicLevel for the run (a musicLevel call would switch the track away; call mineMusic(true) again after mineMusic(false)
     to bring it back). Refused while the Crusher boss loop (bossOn) is playing.
   Returns true when it switched or queued */
var mmOn=0,mmRun=-1,mmPrev=-1;
function mineOn(){return !!mmOn&&mmRun===mRun}
function mineMusic(on){
  if(on){
    if(mineOn()||typeof bossOn==="function"&&bossOn())return false;
    mmPrev=mPend>=0?mPend:TI;
    if(mmPrev===MT)mmPrev=-1;
    mmOn=1;mmRun=mRun;lsN=0;
    if(mI<16){mPend=-1;if(TI!==MT){TI=MT;mCut();mI=0;mNext=0}}
    else mPend=TI===MT?-1:MT;
    return true;
  }
  if(!mineOn()){mmOn=0;return false}
  mmOn=0;
  var j=mmPrev>=0&&mmPrev<TRK.length&&mmPrev!==MT?mmPrev:0;
  mPend=TI===j?-1:j;return true;
}
`;
