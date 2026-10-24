// DEBUG START (owner: Reece, test aid): ?score=N starts every run at base-curve distance N, e.g. ?score=4400 reaches L6
// (4500) about 2.6 s in, and ?level=5&score=4400 does the same with the L5 banner up front. Removable at any time.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// WEB BUILD ONLY: dropped from the Poki build (src/client/poki/script.mjs POKI_EXCLUDE); the hook in 11-gameflow.js start() is
// typeof-guarded, so it is a no-op there. It sets score, run time (runS) and speed CONSISTENTLY on the base curve (START -> MAXV
// at LV_ACC px/s^2, score += speed*LV_RATE per s), as if the run had already lasted that long, so levels, the crusher, gaps,
// missions and the leaderboard's score-vs-duration ceiling all see a coherent run. Not unranked: test runs can reach the board.
export default String.raw`
var DBG_SCORE=window.FR_BUILD!=="poki"&&/^[0-9]{1,5}$/.test(Q.get("score")||"")?+Q.get("score"):0;
/* run seconds at which the base curve reaches distance s (inverse of 06d lvBase) */
function dbgT(s){var tm=(MAXV-START)/LV_ACC,sm=lvBase(tm);return s<=sm?(Math.sqrt(START*START+2*LV_ACC*s/LV_RATE)-START)/LV_ACC:tm+(s-sm)/(LV_RATE*MAXV)}
/* a ?score= start so late in L5 that the ~20 s boss fight could not finish before L6 skips the boss (as if it were beaten),
   so L6 never arrives mid-fight (a natural run always has CRUSHER DOWN by ~118 s); earlier L5 starts get the boss as usual */
function dbgNoBoss(){return DBG_SCORE>0&&LV_SEC.length>5&&DBG_SCORE>lvBase(LV_SEC[5]-25)}
function dbgStart(){if(!DBG_SCORE||demo)return;var t=dbgT(DBG_SCORE);runS=t;score=DBG_SCORE;speed=Math.min(MAXV,START+LV_ACC*t)}
`;
