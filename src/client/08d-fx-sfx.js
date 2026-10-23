// AUDIO (START-FUN + HILLS SFX, owner: Forge Runner Audio): sfxSwell(), sfxAir(h) and sfxPlatLand(tier). Call sites are Dev's.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Uses only 08-audio.js globals (snd, ac, AU, aPaused, mf, tone, noise). Runs after 08c-sparks-sfx.js. In both builds.
// Every function is silent when muted, before a gesture has unlocked audio, while the context isn't running, or during an
// ad (aPaused). None of them creates or resumes the AudioContext. Levels stay below the existing game SFX.
export default String.raw`
/* START-FUN / HILLS SFX: NES palette (w 0/1/2 = pulse 12.5/25/50%, 3 = triangle; LFSR noise) */
function fxOk(){return typeof snd!=="undefined"&&snd&&AU&&ac&&ac.state==="running"&&!(typeof aPaused!=="undefined"&&aPaused)}
var fxSwT=-9,fxAirT=-9;
/* start-fun speed lift (once per run, ~1.1 s): a pulse engine sweep that stacks up an octave and a fifth while a noise
   whoosh climbs in pitch and level, then resolves on a short bright octave blip. Modest level so it sits under the music */
function sfxSwell(){
  if(!fxOk())return;
  var t=ac.currentTime,i;
  if(t-fxSwT<1.5)return;fxSwT=t;
  tone(AU,110,440,t,.9,1,.022,1);                 /* engine: low 25% pulse rising two octaves */
  tone(AU,220,880,t+.3,.6,0,.018,1);              /* + octave, thin 12.5% pulse */
  tone(AU,330,1320,t+.55,.35,0,.016,1);           /* + fifth on top for the last stretch */
  for(i=0;i<7;i++)noise(AU,t+i*.12,.15,.25+i*.22,.012+i*.006);  /* whoosh: rising rate and level */
  tone(AU,mf(81),0,t+.9,.08,1,.04,.6);tone(AU,mf(93),0,t+.96,.16,0,.03,.4);  /* resolve: A5 -> A6 */
  noise(AU,t+.9,.08,1.6,.04);
}
/* BIG AIR landing (h = peak height in logical px, clamped 60-220; NaN -> 60): a thump, then a quick ascending arpeggio.
   Higher = more notes (3 -> 5), a little higher, brighter and louder, and a longer last note; <= ~0.5 s at h=220.
   Landings within 0.35 s of the last one are dropped, so flourishes never stack */
function sfxAir(h){
  if(!fxOk())return;
  var t=ac.currentTime;
  if(t-fxAirT<.35)return;fxAirT=t;
  h=+h;if(!(h>=60))h=60;if(h>220)h=220;
  var f=(h-60)/160,n=3+Math.round(f*2),b=76+Math.round(f*3),st=.05-.01*f,v=.035+.02*f,i;
  tone(AU,160,55,t,.1,3,.12+.06*f,0);noise(AU,t,.06,.35,.06+.03*f);          /* landing thump */
  for(i=0;i<n;i++)tone(AU,mf(b+[0,4,7,12,16][i]),0,t+.03+i*st,i===n-1?.1+.1*f:st+.01,f>.5?0:1,v,.5);
  if(f>.5)noise(AU,t+.03+n*st,.07,2,.02+.02*f);                              /* sparkle on the highest jumps */
}
/* raised fork platform landing (tier 1 low, 2 high; anything else clamped to 1..2, NaN -> 1): a short plank thunk, a
   triangle thump plus a band-passed noise click. Tier 2 a little lower, heavier and louder. ~0.15 s, peak <= ~0.045,
   0.15 s cooldown. Dev calls it typeof-guarded, never on normal ground and not in demo */
/* combo cheer, sfxCombo(n): n = jumps cleared in a set piece / clean enemy run (2..5, clamped; 5+ = 5). A rising major
   arpeggio, one note per jump plus a held top note over a triangle root; higher n = higher start, more notes and longer
   (~0.3 s at 2 -> ~0.6 s at 5), n >= 4 adds an octave sparkle, n = 5 a closing shimmer. Dev (set pieces) and Levels
   (clean enemy runs, L4+) may both call it close together: one cheer per 0.5 s. Peak <= 0.06 */
var fxCbT=-9;
function sfxCombo(n){
  if(!fxOk())return;
  var t=ac.currentTime;if(t-fxCbT<.5)return;fxCbT=t;
  n=Math.round(+n);if(!(n>=2))n=2;if(n>5)n=5;
  var sc=[0,4,7,12,16,19],b=74+n*2,k=n+1,d=.055,i,top=b+sc[k-1],h=.1+n*.025,e=t+(k-1)*d;
  for(i=0;i<k-1;i++)tone(AU,mf(b+sc[i]),0,t+i*d,d*.9,1,.045,.5);
  tone(AU,mf(top),0,e,h,2,.05,.6);tone(AU,mf(b-12),0,e,h,3,.05,.8);
  if(n>=4)tone(AU,mf(top+12),0,e+.02,h-.02,0,.015,.5);
  if(n>=5)for(i=0;i<3;i++)tone(AU,mf(top+(i&1?7:12)),0,e+h+i*.03,.03,0,.02,0);
}
var fxPlT=-9;
function sfxPlatLand(tier){
  if(!fxOk())return;
  var t=ac.currentTime;
  if(t-fxPlT<.15)return;fxPlT=t;
  var k=+tier>=1.5?1:0,c=AU.c,f=c.createBiquadFilter();
  f.type="bandpass";f.frequency.value=1900-600*k;f.Q.value=1.8;f.connect(AU.o);setTimeout(function(){f.disconnect()},400);
  tone(AU,190-45*k,75-15*k,t,.15+.03*k,3,.048+.01*k,0);       /* thump */
  tone(AU,380-90*k,0,t,.04,2,.007+.002*k,0);                  /* woody knock */
  noise(AU,t,.03,1.2-.3*k,.048+.008*k,f);                      /* plank click */
}
`;
