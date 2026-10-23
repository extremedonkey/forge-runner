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
  var j=TRN+n-1;
  if(mI<16){
    mPend=-1;if(TI===j)return false;
    TI=j;mCut();mI=0;mNext=0;return true;
  }
  if(mPend<0?TI===j:mPend===j)return false;
  mPend=TI===j?-1:j;return true;
}
`;
