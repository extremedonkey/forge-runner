/* ===== LAB layer (lab/* branches only): prototype build, never merged to main =====
   Plain browser JS, joined into the same IIFE right before 16-loop.js (boot). Later function declarations override the
   site ones (same scope), so this layer can replace whole functions without touching the site fragments.
   No leaderboard (15-leaderboard.js is excluded), no beacons (track() is a no-op), own high-score key. */
function lbDraw(){}
function lbOver(){}
function track(){}
function labClamp(v,a,b){return v<a?a:v>b?b:v}
