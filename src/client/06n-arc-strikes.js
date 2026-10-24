// ARC STRIKES (owner: Levels): the L6 ARC FURNACE mechanic. A copper bus plate lies flush in the track ahead of the buggy; a
// 1-2-3 lamp count-in runs along it (lamps light at .80 / .50 / .20 s to the strike: the .30 s beat of the L6 track) and 0.2 s
// after lamp 3 lightning floods the plate: an 8 px lethal sheet for 0.06 s. The answer is always a jump and a tap is enough
// (on flat ground a tap pressed .025-.333 s before the strike clears it, a held jump .013-.613 s, on the 1/240 s update grid).
// The first hazard answered in TIME rather than SPACE.
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no dollar-brace, no URLs.
// LIVE in every build (site, Poki, lab) through three guarded hook lines (no autopilot line: demo never places a plate):
//   13-simulation.js spawn(), between the FORK fkSpawn line and the crusher crGap line:
//       typeof azGap==="function"&&(nextGap+=azGap());
//   13-simulation.js update(), right after the CHASER roller line, before the Spare Core skClear line:
//       typeof azTick==="function"&&azTick(dt,pw,ph,pt);
//   14-render.js drawEnts(), between the crusher crDraw line and the ORE CART ocDraw line:
//       typeof azDraw==="function"&&azDraw();
// PLACEMENT (azGap, inside spawn(), fair by construction, one pass per spawn): when a new base obstacle N appears its gap is
// known (nextGap, spawnDist, nt already rolled). A plate is booked behind N or the slot is skipped (spacing is judged at the
// earliest strike time and never bought with a stretch): the strike lands >= every obstacle's held jump (airtime on the terrain)
// + 0.45 s after its take-off (every type treated as must-jump), the plate starts after N has passed, stompable blobs keep their
// bounce, the next spawn arrives after the strike jump has landed + 0.6 s (the gap is STRETCHED for it, returned in px; at most
// AZ_XS s), no gap, deck, power-up or ground spark row is near the plate (world x = hsc + screen x), and on HILLS every press of
// the fair ranges is replayed on the pure hlCurve ground with hlPhys's rules (ground speed inherit cap, the world-Y soft cap), at
// every step of the 1/240 s update grid, at the fastest, slowest and middle felt speed, also with spring boots when they may be on
// and off a crest float, and must clear the sheet through the dwell (azFair). The fair ranges (time to strike at the press) are
// the flat-ground windows less a sub-step of slack: a tap .03-.325 s (lamp 3 is .20: from 125 ms before it to 170 ms after it),
// a held jump .03-.60 s (from 100 ms before lamp 2), the same with spring boots (their wider flat windows, .425 / .75 s, are NOT
// promised on hills: the soft cap cuts a boots jump off high ground short). The strike may move up to AZ_SD s later onto such
// ground. Times use an upper-bound planning speed (and the slowest felt speed for the terrain replay), so planned time
// differences are lower bounds. One roll per wanted plate: a plate the terrain or the stretch cap refuses stays wanted for the
// next slot, so the strike rate barely depends on how much of the track is fair ground (a double needs two fair marks: for
// AZ_DC slots it waits alone, then singles may fill those slots while it stays wanted, up to AZ_DF slots).
// SIM (azTick): plates ride the world (a Spare Core gap revive skip moves them too); a not yet announced plate is dropped if a
// gap / deck appears over it; once announced it is never cancelled. Lamps from the time to strike; the strike; the exact
// collision (py < AZ_CLR over [x0,x1] for AZ_DW s: the drawn sheet IS the hitbox); absorb order inv -> shield -> Spare Core ->
// die(), never the RNG-drawing sparks().
// DRAW (azDraw): right-edge glow (edgeWarn) until the plate is on screen, plate, lamps, studs, x2 badge, lethal sheet, bolt,
// afterglow, sparks, the JUMP ON 3 hint (first 2 strikes of a run), and the queued sounds (enemySfx "arc" tick1/2/3, zap;
// sfxCombo(2) for a clean double: sound only). Reduced motion: no sparks / afterglow / filaments, straight bolt, JUMP word.
// Gate: L6 only, in a run, not demo, never while the L5 crusher is up or pending, the level banner / crossfade is up
// (lvGapsBlocked) or the first-run slow-mo runs. ?arcs=0 turns it off (both builds).
// Sim-path rules: NO Math.random (own mulberry32 azR), never writes score/speed/scroll/runT/runS/spawnDist/nextGap/nt/ents
// (the stretch is returned to 13's own += line; skClear is 13's), no per-frame allocation (fixed slots and pools).
// Plates are NOT ents: the base loop, skClear and spawn()'s random stream are untouched. Tests: scripts/test-arc.mjs.
export default String.raw`
var AZ_ON=true;
try{if(Q&&Q.get&&Q.get("arcs")==="0")AZ_ON=false}catch(e){}
/* slots, spark pool, edge-warn keys, own RNG seed, hinted strikes per run */
var AZ_N=4,AZ_NP=24,AZ_KN=32,AZ_SEED=0xa2c6f,AZ_HINT=2;
/* strike: sheet height px (= the hitbox), lethal dwell s, bolt s, non-lethal afterglow s */
var AZ_CLR=8,AZ_DW=.06,AZ_VIS=.10,AZ_GLOW=.25;
/* count-in lamps 1 / 2 / 3: time to strike (s) */
var AZ_L1=.80,AZ_L2=.50,AZ_L3=.20;
/* geometry (s of planning speed): plate start before mark 1, stud and plate end after a mark, the marks of a double */
var AZ_LB=.45,AZ_LA=.30,AZ_DBL=1.1;
/* announce: glow from this time to strike; never placed with less time to strike */
var AZ_WARN=1.35,AZ_MINT=1.35;
/* pacing: grace after L6 begins, phase B (doubles) from s into L6, spacing and chance per phase, double chance, max stretch (single /
   double). Tuned for ~9 strikes/min on L6 hills (the fair ranges leave ~9% of L6 hill marks fair, ~2% for a double's pair) and
   ~16 on flat ground at 800 felt, doubles ~30% / ~50% of phase B plates there (scripts/test-arc.mjs case j) */
var AZ_G=5,AZ_PB=20,AZ_SP=[3.2,2.8],AZ_P=[.9,1],AZ_PD=.6,AZ_XS=[2.8,3.6];
/* clearance (s): held airtime, with boots, boots press slack, ground time, cue, margin, duck lead, gap-slot margin, stomp, plate after an obstacle */
var AZ_AIR=.69,AZ_AIRB=.83,AZ_BS=.1,AZ_GND=.2,AZ_CUE=.2,AZ_M=.05,AZ_DK=.2,AZ_GM=.15,AZ_STK=.63,AZ_PST=.15;
/* terrain: gap landing / take-off and deck margins (s of planning speed) */
var AZ_GLAND=.85,AZ_GTO=.6,AZ_DECK=.75;
/* the press ranges that are fair on hills (s of time to strike at the press: azTTI), replayed by azFair. Plain tap / held = the
   flat-ground windows (on flat ground a tap clears from .025 to .333 s, a held jump from .013 to .613 s, on the 1/240 s grid), less
   a sub-step for a strike that fires one step late, and AZ_FM px of clearance on top of the sheet. Spring boots tap / held: the
   same ranges. Boots' own flat windows are wider (.425 / .75 s), but hlPhys's world-Y soft cap cuts a boots jump off high ground
   short: replaying them leaves almost no fair L6 hill ground, so a boots press gets the plain promise. */
var AZ_TT=[.03,.325],AZ_TH=[.03,.6],AZ_TTB=[.03,.325],AZ_THB=[.03,.6],AZ_FM=1;
/* the strike may move up to AZ_SD s later than its earliest time, in AZ_SDS steps (AZ_SDK update steps of 1/240 s), onto fair ground
   (never earlier); AZ_SDN candidates after the first, a double's second mark is AZ_DBI candidates after its first */
var AZ_SD=1.6,AZ_SDS=.05,AZ_SDK=Math.round(AZ_SDS*240),AZ_SDN=Math.round(AZ_SD/AZ_SDS),AZ_DBI=Math.round(AZ_DBL/AZ_SDS);
/* a rolled double (two fair marks AZ_DBL apart) is tried alone in its first AZ_DC slots; from then on a single may take a slot it
   does not fit while it stays wanted, up to AZ_DF slots, then it gives way to a single */
var AZ_DF=10,AZ_DC=5;
/* planning speed: felt cap, look-ahead s of base acceleration */
var AZ_FELT=800,AZ_LOOK=4;
/* plates (fixed, preallocated): a active, id, n strikes, m1/m2 marks, x0/x1 ends (screen x), la stud offset px, k next mark, c lamp
   level, st runS of the last strike, hd resolved, hh hits taken, ar announced, q queued sounds, gl afterglow s, hit killed the run, cl cleared */
var azP=[];for(var azI=0;azI<AZ_N;azI++)azP.push({a:0,id:0,n:1,m1:0,m2:0,x0:0,x1:0,la:0,k:0,c:0,st:-1e9,hd:1,hh:0,ar:0,q:0,gl:0,hit:0,cl:0});
/* spark pool (x, y, velocity, age, life) */
var azPX=new Float32Array(AZ_NP),azPY=new Float32Array(AZ_NP),azVX=new Float32Array(AZ_NP),azVY=new Float32Array(AZ_NP),azPA=new Float32Array(AZ_NP),azPL=new Float32Array(AZ_NP),azPI=0;
/* edge-warn keys (built once: no string is made per frame); more than 06j's 16 remembered keys, so a key is always forgotten before reuse */
var AZ_K=[];for(azI=0;azI<AZ_KN;azI++)AZ_K.push("az"+azI);
var AZ_SFX=["arc","warn"],AZ_EW={y:0,h:108,c:"#a5b4fc",sfx:AZ_SFX};
var AZ_EV=["tick1","tick2","tick3","zap"];
/* colours: copper body / highlight, unlit lamp, lit lamps 1-3 (also the afterglow steps, blue -> white), highlight alpha per lamp level */
var AZ_CU="#9a3412",AZ_HI="#fdba74",AZ_LU="#1e2547",AZ_LC=["#6b8cff","#a5b4fc","#f0f9ff"],AZ_HA=[.35,.55,.75,1];
/* drawn columns of the plate in view (preallocated) */
var AZ_CN=96,azCX=new Float32Array(AZ_CN),azCW=new Float32Array(AZ_CN),azCG=new Float32Array(AZ_CN),azCI=new Int32Array(AZ_CN);
/* run state: azLR last runS seen, azL6 runS when L6 began (-1 before), azLast runS of the last booked strike, azCnt plates this
   run, azHn strikes shown this run (hint), azW the wanted plate not yet placed (0 none, 1 single, 2 double), azWn slots it was refused in, azHs hsc last step,
   azRS RNG state */
var azLR=-1,azL6=-1,azLast=-1e9,azCnt=0,azHn=0,azW=0,azWn=0,azHs=0,azRS=AZ_SEED;
/* own RNG: mulberry32, reseeded every run (deterministic per run, never Math.random) */
function azR(){azRS=(azRS+0x6d2b79f5)>>>0;var t=azRS;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
/* static visual hash 0..1 (sin-fract; drawn shapes never flicker, never an RNG) */
function azH(a,b){var s=Math.sin(a*12.9898+b*78.233)*43758.5453;return s-Math.floor(s)}
function azLvl(){return typeof currentLevel==="function"?currentLevel():1}
/* the L5 crusher up or pending (the same expression as 06i's ore cart gate) */
function azBoss(){return typeof crS==="number"&&(crS>=1&&crS<=6||crS===0&&typeof crL5==="number"&&crL5>=0&&(!demo||typeof CR_DEMO!=="undefined"&&!!CR_DEMO))}
function azOn(){return AZ_ON&&state==="run"&&!demo&&azLvl()>=6&&!azBoss()&&!(typeof lvGapsBlocked==="function"&&lvGapsBlocked())&&!(typeof rsSlowT==="number"&&rsSlowT>0)}
/* felt world speed (px/s the track moves) and the planning speed: an upper bound for the next AZ_LOOK s (never below the felt speed) */
function azV(){return speed*(typeof vMul==="function"?vMul():1)}
function azVp(){return Math.max(azV(),Math.min(AZ_FELT,(speed+7*AZ_LOOK)*(typeof VMUL_CAP==="number"?VMUL_CAP:1.1)))}
function azGy(x){return typeof hlH==="function"?hlH(x):0}
/* new run (start() sets runS=0) whatever hook runs first; a Poki Continue keeps runS (same run) */
function azSync(){if(azLR<0||runS<azLR)azReset();azLR=runS}
function azReset(){
  for(var i=0;i<AZ_N;i++){var p=azP[i];p.a=0;p.hit=0;p.q=0;p.gl=0;p.ar=0}
  for(i=0;i<AZ_NP;i++)azPL[i]=0;
  azL6=-1;azLast=-1e9;azCnt=0;azHn=0;azW=0;azWn=0;azRS=AZ_SEED;azHs=typeof hsc==="number"?hsc:0;
}
/* spring boots on for a take-off t s from now (own copy of 06i's rule): still running then, or a boots pickup reached by then */
function azBoots(t,V){
  if(spT>0&&spT>t-AZ_BS)return true;
  for(var i=0;i<ents.length;i++){var e=ents[i];if(e.t==="u"&&e.k==="j"&&(e.x-(PX+pW()))/V<=t+AZ_BS)return true}
  return false;
}
/* TERRAIN JUMPS (HILLS): 06i hlPhys's jump replayed on the pure hlCurve ground (reads nothing else, writes only azFm): a jump taken
   off at world x wx (the buggy's centre) at felt speed v with vy0 inherits the ground's vertical speed capped at HL.tvC, falls at
   G in 1/240 s steps like the sub-steps, and is held under the world-Y soft cap max(HL.yMax, ground + HL.yUp) (a held jump off
   high ground is cut short there, a boots jump sooner than a plain one). azFly returns the landing time (s); azFm = the lowest
   height above the ground over [ta,tb] s after the take-off. On flat ground it is the flat jump (held 0.689 s, tap 0.422 s). Its
   ground samples count towards azGap's work budget (azWk, below). */
var azFm=0;
function azHills(){return typeof hlOn!=="undefined"&&!!hlOn&&typeof hlCurve==="function"}
function azHc(wx){return azHills()?hlCurve(wx):0}
function azFly(wx,v,v0,ta,tb){
  var dt=1/240,L=typeof HL!=="undefined"&&HL,c=L?HL.tvC:60,ym=L?HL.yMax:1e9,yu=L?HL.yUp:1e9,tv=(azHc(wx+10)-azHc(wx-10))/20*v,vy=v0+(tv>c?c:tv<-c?-c:tv),y=azHc(wx),t=0,g,p,i;
  azFm=1e9;
  for(i=0;i<480;i++){t+=dt;g=azHc(wx+v*t);azWk+=AZ_HW;vy-=G*dt;y+=vy*dt;if(y>Math.max(ym,g+yu)){y=Math.max(ym,g+yu);if(vy>0)vy=0}
    p=y-g;if(t>=ta-1e-9&&t<=tb+1e-9&&p<azFm)azFm=p;if(p<=0)return t}
  return t;
}
/* slowest felt speed the plan must hold for: uphill slows the world by up to HL.smUp (x the level's speed, as in vMul) */
function azVl(){var l=typeof lvSpeedMul==="function"?Math.max(.8,Math.min(1.25,lvSpeedMul())):1;return Math.min(azV(),speed*l*(1+(typeof HL!=="undefined"&&HL?HL.smUp:-.12)))}
/* held-jump airtime (s) for a take-off t s from now at world x wx: the flat value (AZ_AIR, AZ_AIRB with boots) or longer on the
   terrain, at the planning speed V and the slowest felt speed vl */
function azAirT(t,wx,V,vl){
  var b=azBoots(t,V),a=b?AZ_AIRB:AZ_AIR,v0=b?JV*JMUL:JV;
  if(!azHills())return a;
  return Math.max(a,azFly(wx,V,v0,0,0),azFly(wx,vl,v0,0,0));
}
/* the strike whose mark is at world x wm, ts s from now, is fair on the terrain: every press of the ranges above (AZ_TT / AZ_TH, and
   AZ_TTB / AZ_THB when spring boots may be on) keeps the buggy >= AZ_CLR + AZ_FM px above the local ground through the whole dwell,
   at V, vl and between. A press at time to strike T takes effect on the next 1/240 s step and the strike fires on the first step
   with T <= 0, so it comes ceil(T x 240) steps later, one more when T lands on the grid (or the world slows a little): every k of
   azK0..azK1 is replayed through the dwell's last step (14 steps on: other frame rates step finer than 1/240 s, which flies higher,
   and end the dwell at most .001 s later: inside AZ_FM). Where is the buggy's ground point (hlB: PX + PW/2) on the strike step?
   The plate moves one step in the azTick right after it is booked, and the strike fires on the first step the mark is at or behind
   the reference: within one step's travel (v/240 at felt speed v) behind the planned mark wm, by the step phase. Both ends are
   replayed: the far end's ground is the near end's one sample earlier, so the far end's press k flies exactly the near end's press
   k + 1 with its dwell one step earlier, and one replay per take-off (azJump) checks both dwells. The ground along the approach
   (j = 0..AZ_SN-1: (AZ_SB - j)/240 s of travel before wm) is sampled per speed: at V from azS0 at offset o0 (sampled once per azGap
   for every candidate: at V the candidates are exactly AZ_SDK samples apart), at vl and between into azS when a press needs them.
   Pass ps = 0 replays every AZ_FS-th take-off (a bad spot usually fails there, cheaply), ps = 1 the rest (azFairI runs pass 0 for
   both marks of a double before pass 1 of either). azWk counts this azGap call's work in replayed steps (a ground sample costs
   about AZ_HW of them): past AZ_WB every candidate is refused (the plate stays wanted for the next slot), which bounds a spawn's cost. */
var AZ_SB=Math.ceil(Math.max(AZ_TT[1],AZ_TH[1],AZ_TTB[1],AZ_THB[1])*240)+4,AZ_SN=AZ_SB+16,AZ_FH=12,AZ_FS=6,AZ_HW=24,AZ_WB=4e5,azWk=0;
var AZ_FMN=AZ_SDN+AZ_DBI+1,AZ_S0N=AZ_SN+(AZ_FMN-1)*AZ_SDK,azS0=new Float64Array(AZ_S0N),azS=new Float64Array(2*AZ_SN);
function azK0(r){return Math.floor(r[0]*240+1e-6)}
function azK1(r){return Math.ceil(r[1]*240-1e-6)+1}
function azFair(wm,ts,V,vl,o0,ps){
  /* boots: maybe on for some press (check both) or surely on for every press (spT outlasts the last press + AZ_BS: boots only) */
  var bo=azBoots(ts-AZ_THB[1]-.02,V)||azBoots(ts,V),b1=spT>ts+AZ_BS,s,v,k,m,f,r,R,v0,k0,k1,A,o,sm=0;
  for(s=0;s<3;s++){
    if(s&&!(sm&s)){sm|=s;v=s===1?vl:(V+vl)/2;o=(s-1)*AZ_SN;   /* the slowest felt speed, then the middle (not monotonic in speed) */
      for(k=0;k<AZ_SN;k++)azS[o+k]=azHc(wm-v*(AZ_SB-k)/240);
      azWk+=AZ_SN*AZ_HW}
    A=s?azS:azS0;o=s?(s-1)*AZ_SN:o0;
    for(m=b1?1:0;m<(bo?2:1);m++)for(f=0;f<3;f++)for(r=0;r<2;r++){
      R=r?(m?AZ_TTB:AZ_TT):(m?AZ_THB:AZ_TH);v0=(r?CUT:JV)*(m?JMUL:1);k0=azK0(R);k1=azK1(R);
      /* take-off k steps before the near end's strike: the near end's press k (k <= k1), the far end's press k - 1 (k - 1 >= k0);
         earliest first: they fail most (early landing) */
      for(k=k1+1;k>=k0;k--)if((k1+1-k)%AZ_FS===0?!ps:ps){
        if(azJump(A,o,k,v0,f,(k<=k1?1:0)|(k>k0?2:0))<AZ_CLR+AZ_FM||azWk>AZ_WB)return false}}}
  return true;
}
/* one take-off k steps (1/240 s) before the strike step b on the ground sampled in A from offset o (hlPhys's jump, like azFly): the
   lowest height above the ground over the near end's dwell (w & 1: steps b..b+14) and / or the far end's (w & 2: b-1..b+13); < 0
   when it has landed before. f = 0: off the ground (inherits the ground's vertical speed); f = 1 / 2: off a crest float (13 allows
   one jump while floating, hlCanJump: vy0 alone, from the ground / AZ_FH px up), only where the ground falls away (where a float
   can be); under the soft cap such a jump lands sooner */
function azJump(A,o,k,v0,f,w){
  var L=typeof HL!=="undefined"&&HL,c=L?HL.tvC:60,ym=L?HL.yMax:1e9,yu=L?HL.yUp:1e9,dt=1/240,gd=G*dt,j=o+AZ_SB-k,b=o+AZ_SB-(w&2?1:0),e=o+AZ_SB+(w&1?14:13),tv=(A[j]-A[j-1])*240,vy,y=A[j],g,p,yc,lo=1e9;
  if(f&&tv>=0)return 1e9;
  azWk+=k+16;
  vy=f?v0:v0+(tv>c?c:tv<-c?-c:tv);if(f===2)y+=AZ_FH;
  for(j++;j<b;j++){g=A[j];vy-=gd;y+=vy*dt;yc=g+yu;if(yc<ym)yc=ym;if(y>yc){y=yc;if(vy>0)vy=0}if(y<=g)return -1}   /* landed before the strike */
  for(;j<=e;j++){g=A[j];vy-=gd;y+=vy*dt;yc=g+yu;if(yc<ym)yc=ym;if(y>yc){y=yc;if(vy>0)vy=0}p=y-g;if(p<lo){if(p<=0)return p;lo=p}}
  return lo;
}
/* the strike reference: the buggy's ground point (06i hlB, PX + PW/2: its centre, 7.5 px behind it with the big cart, so the
   terrain replay is exact whatever the size) */
function azCx(){return PX+PW/2}
/* time to the strike of plate p's next mark (its mark reaches the strike reference), at the felt speed */
function azTTI(p){return ((p.k>0?p.m2:p.m1)-azCx())/Math.max(1,azV())}
/* azFair of this azGap call per candidate strike time (ts = lo + i x AZ_SDK/240), up to pass ps: 0 not judged yet, 1 pass 0 ok, 2 not
   fair, 3 fair. A double's second mark at candidate i is the first mark at candidate i + AZ_DBI, and a double falling back to a
   single asks the same first marks. azS0 (the ground at the planning speed for every candidate) is sampled at the first ask (azS0k) */
var azFM=new Int8Array(AZ_FMN),azS0k=0;
function azFairI(i,lo,C,V,vl,ps){
  var q=azFM[i],w0=hsc+C+V*lo,ts=lo+i*AZ_SDK/240;
  if(q===2||q===3||q===1&&!ps)return q!==2;
  if(!azS0k){azS0k=1;for(var j=0;j<AZ_S0N;j++)azS0[j]=azHc(w0-V*(AZ_SB-j)/240);azWk+=AZ_S0N*AZ_HW}
  if(!q){q=azFM[i]=azWk<=AZ_WB&&azFair(w0+V*i*AZ_SDK/240,ts,V,vl,i*AZ_SDK,0)?1:2;if(q===2||!ps)return q===1}
  q=azFM[i]=azWk<=AZ_WB&&azFair(w0+V*i*AZ_SDK/240,ts,V,vl,i*AZ_SDK,1)?3:2;
  return q===3}
/* 13 spawn(): maybe book a plate behind the obstacle just pushed; returns the px to add to nextGap (0 = no plate) */
function azGap(){
  azSync();
  if(azL6<0&&state==="run"&&azLvl()>=6)azL6=runS;
  if(!azOn())return 0;
  azWk=0;   /* this call's work (the budget AZ_WB): the airtime flights, ground samples and replayed steps */
  var V=azVp(),F=PX+pW(),C=azCx(),i,e,n=0;
  /* N = the new obstacles (a slot gpSpawn turned into a gap has none: the gap is that slot's hazard) */
  for(i=0;i<ents.length;i++){e=ents[i];if(e.x>=W&&e.t!=="k"&&e.t!=="u")n++}
  if(!n)return 0;
  var ph=runS-azL6>=AZ_PB?1:0,lo=AZ_MINT,r,ti,to,vl=azVl(),wh=typeof hsc==="number"?hsc:0;
  /* pre rule (every obstacle): its held jump (taken 0.2 s before contact, airtime on the terrain) has landed + ground + cue +
     margin before the strike press; the plate starts after it has passed */
  for(i=0;i<ents.length;i++){e=ents[i];if(e.t==="k"||e.t==="u")continue;
    r=V+(e.vx||0);ti=(e.x-F)/r;to=(e.x+e.w-PX)/r;
    lo=Math.max(lo,to+AZ_LB+AZ_PST);
    if(ti>-.2)lo=Math.max(lo,ti-.2+azAirT(ti-.2,wh+C+V*(ti-.2),V,vl)+AZ_GND+AZ_CUE+AZ_M);   /* (landed long ago: < AZ_MINT anyway) */
    if(e.t==="b"&&(e.sk==="l"||e.v===1))lo=Math.max(lo,to+AZ_STK+AZ_GND+AZ_M)}   /* may be a stompable slag blob (06g skins it after spawn) */
  /* skip rather than delay: spacing is never bought with a stretch */
  if(runS+lo<azL6+AZ_G||runS+lo<azLast+AZ_SP[ph])return 0;
  /* one roll per wanted plate (azW: 1 single, 2 double): a plate the terrain or the stretch cap refuses in this slot stays wanted
     for the next one (deferred, never re-rolled), so the rate does not depend on how much of the track is fair ground */
  if(!azW){if(azR()>=AZ_P[ph])return 0;azW=ph&&azR()<AZ_PD?2:1;azWn=0}
  var dbl=azW-1,d1=azW===2&&azWn<AZ_DC?1:0,ts1,tsN,m1,mN,x0,x1,di,ok=0,add=0;
  /* the next spawn's arrival (s) at the buggy's front, before any stretch */
  var tB=(nextGap-spawnDist)/V+(W+20-F)/(V+(nt==="r"?110:0));
  for(i=0;i<AZ_FMN;i++)azFM[i]=0;
  azS0k=0;
  /* a wanted double that does not fit: in its first AZ_DC slots nothing else is placed; later a single may take the slot (no extra
     roll) and the double stays wanted, until AZ_DF slots have passed (then that single replaces it) */
  for(;dbl>=d1&&!ok;dbl--){
    /* the earliest strike time from lo, up to AZ_SD s later, that passes every rule (the spacing above was judged at lo: a later
       strike only adds room); the cheap rules first, the terrain replay last */
    for(di=0;di<=AZ_SDN&&!ok;di++){
      ts1=lo+di*AZ_SDK/240;tsN=dbl?lo+(di+AZ_DBI)*AZ_SDK/240:ts1;m1=C+V*ts1;mN=C+V*tsN;x0=m1-V*AZ_LB;x1=mN+V*AZ_LA;ok=1;
      /* a power-up or a ground spark row (collected by running on the ground) never lies on the plate or within AZ_PST s of it */
      for(i=0;i<ents.length&&ok;i++){e=ents[i];if((e.t==="u"||e.t==="k"&&e.ax==null&&!e.fk)&&e.x+e.w>x0-V*AZ_PST&&e.x<x1+V*AZ_PST)ok=0}
      if(!ok)continue;
      /* post rule: the next spawn arrives after the last strike's held jump (from lamp 3, airtime on the terrain) has landed + ground
         + cue + margin (+ a gap slot, + a duck lead); the gap is stretched for it, at most AZ_XS s. The flat airtime first (the
         least: a cheap refusal), the terrain airtime once the plate's ground is fair */
      add=tsN-.2+AZ_GND+AZ_CUE+AZ_M+AZ_GM+(nt==="d"||nt==="f"?AZ_DK:0)-tB;
      if((add+AZ_AIR)*V>AZ_XS[dbl]*V){ok=0;continue}
      if(typeof hsc==="number"){
        /* terrain (world x): no gap or deck near the plate; on hills every press of the fair ranges clears the sheet (azFair) */
        if(typeof gapNear==="function"&&gapNear(hsc+x0-V*AZ_GLAND,hsc+x1+V*AZ_GTO)||typeof platNear==="function"&&platNear(hsc+x0-V*AZ_DECK,hsc+x1+V*AZ_DECK))ok=0;
        else if(azHills()&&!(azFairI(di,lo,C,V,vl,0)&&(!dbl||azFairI(di+AZ_DBI,lo,C,V,vl,0))&&azFairI(di,lo,C,V,vl,1)&&(!dbl||azFairI(di+AZ_DBI,lo,C,V,vl,1))))ok=0;
        if(!ok)continue;
      }
      add=Math.max(0,(add+azAirT(tsN-.2,wh+mN-V*.2,V,vl))*V);
      if(add>AZ_XS[dbl]*V)ok=0;
    }
  }
  if(!ok){azWn++;return 0}
  dbl++;  /* the loop's last dbl-- */
  for(i=0;i<AZ_N;i++)if(!azP[i].a){var p=azP[i];
    p.a=1;p.id=azCnt++;p.n=dbl?2:1;p.m1=m1;p.m2=dbl?mN:m1+V*AZ_DBL;p.x0=x0;p.x1=x1;p.la=V*AZ_LA;
    p.k=0;p.c=0;p.st=-1e9;p.hd=1;p.hh=0;p.ar=0;p.q=0;p.gl=0;p.hit=0;p.cl=0;
    azLast=runS+tsN;if(azW===2&&!dbl&&azWn<AZ_DF)azWn++;else azW=0;return add}   /* a single in a wanted double's slot: still wanted */
  return 0;
}
/* spark from the pool (sim path; none under reduced motion) */
function azSpark(x,y,vx,vy,l){if(rm())return;var j=azPI;azPI=(azPI+1)%AZ_NP;azPX[j]=x;azPY[j]=y;azVX[j]=vx;azVY[j]=vy;azPA[j]=0;azPL[j]=l}
/* strike hit: the shared absorb order (inv -> shield -> Spare Core -> die), one hit per strike */
function azHit(p,pw,ph,pt){
  p.hd=1;
  if(inv>0)return;
  if(shd){
    if(shdP&&typeof skLabel==="function")skLabel("SHIELD (Plate)");
    shd=0;shdP=0;if(typeof skShieldBreak==="function")skShieldBreak();
    sfx(900,180,.25,2,.09);
    for(var j=0;j<12;j++){var a=j*.5236;azSpark(PX+pw/2,pt+ph/2,Math.cos(a)*200,Math.sin(a)*200-60,.4)}
    if(!rm())shake=.15;
    p.hh++;return;
  }
  if(cores>0&&typeof skReboot==="function"){
    skReboot(pt,ph);
    for(var i=0;i<AZ_N;i++)if(azP[i].a&&azP[i].x0<PX+pw+300)azP[i].a=0;
    if(typeof skClear==="function")skClear(pw);
    return;
  }
  p.hit=1;die();
}
/* 13 update(), every sub-step, after the base ents loop: motion, announce, lamps, strikes, hits */
function azTick(dt,pw,ph,pt){
  if(state!=="run")return;
  azSync();
  if(azL6<0&&azLvl()>=6)azL6=runS;
  var i,j,p,c,tti,e,wd=azV()*dt;
  /* the track moves azV()*dt; a world skip (GAPS Spare Core revive: hsc jumps) moves the plates with it */
  if(typeof hsc==="number"){if(typeof hlAct!=="undefined"&&hlAct&&Math.abs(hsc-azHs-wd)>1)wd=hsc-azHs;azHs=hsc}
  for(i=0;i<AZ_N;i++){p=azP[i];if(!p.a)continue;
    if(p.hit){p.a=0;p.hit=0;continue}   /* the plate that ended the run is gone if the run goes on (Continue) */
    p.m1-=wd;p.m2-=wd;p.x0-=wd;p.x1-=wd;
    if(p.gl>0)p.gl=Math.max(0,p.gl-dt);
    if(p.k>=p.n&&p.x1<XO-40&&p.gl<=0){p.a=0;continue}
    if(!p.ar){
      /* not yet announced: a gap or deck that appeared over it drops it silently */
      if(typeof hsc==="number"&&(typeof gapNear==="function"&&gapNear(hsc+p.x0,hsc+p.x1)||typeof platNear==="function"&&platNear(hsc+p.x0,hsc+p.x1))){p.a=0;continue}
      if(p.x0<XO+VW||azTTI(p)<=AZ_WARN)p.ar=1;
    }
    if(p.k<p.n){
      tti=azTTI(p);c=tti<=AZ_L3?3:tti<=AZ_L2?2:tti<=AZ_L1?1:0;
      while(p.c<c){p.c++;p.q|=1<<(p.c-1)}
      if(tti<=0){
        p.st=runS;p.hd=0;p.k++;p.c=0;p.q|=8;p.gl=rm()?0:AZ_GLOW;azHn++;
        /* sparks off the stud the bolt hits (static per strike: hashed, no RNG) */
        var sx=(p.k>1?p.m2:p.m1)+p.la,sy=GY-azGy(sx)-2;
        for(j=0;j<12;j++){var h=azH(p.id,j),a=-3.1416*(.12+.76*h),s=110+220*azH(j,p.id+.5);azSpark(sx,sy,Math.cos(a)*s-azV()*.5,Math.sin(a)*s,.22+.2*h)}
      }
    }
    /* collision: exactly the drawn sheet (8 px from the local ground over the plate) for the dwell; py is above the local ground */
    if(!p.hd){
      e=runS-p.st;
      if(e>=AZ_DW){p.hd=1;p.cl++;if(p.n===2&&p.cl===2&&p.hh===0)p.q|=16}
      else if(e>=0&&py<AZ_CLR&&PX+pw>p.x0&&PX<p.x1){azHit(p,pw,ph,pt);if(state!=="run")return}
    }
  }
  /* spark pool */
  for(j=0;j<AZ_NP;j++)if(azPL[j]>0){
    azPA[j]+=dt;if(azPA[j]>=azPL[j]){azPL[j]=0;continue}
    azVY[j]+=700*dt;azPX[j]+=azVX[j]*dt;azPY[j]+=azVY[j]*dt;
    var gy=GY-azGy(azPX[j])-1;if(azPY[j]>gy){azPY[j]=gy;azVY[j]*=-.3}
  }
}
/* ---------- art ---------- */
/* one plate: copper body flush in the floor, highlight (count-in brightness / afterglow), studs, lamp triplets, the lethal sheet
   (= the hitbox), the bolt, the x2 badge and the hint. Columns are 8 px, aligned to the plate, each on the ground under it */
function azDrawP(p,mo,run){
  var lo=Math.max(p.x0,XO-8),hi=Math.min(p.x1,XO+VW+8),n=0,x,X,i,j,g,w,c=p.k<p.n?p.c:0,e=runS-p.st,sx,gs,lit;
  if(hi<=lo)return;
  /* below-the-line art (never the hitbox): 6 px body and 6x3 lamps; in portrait (ZM > 1, like the crusher's 16 px slab) a 10 px
     body and 9x5 lamps so the count-in reads on a phone (390x844: ~6.5x3.6 CSS px instead of 4.4x2.2) */
  var tl=typeof ZM==="number"&&ZM>1,bh=tl?10:6,hh=tl?3:2,lw=tl?9:6,lh=tl?5:3,lp=tl?11:8,ly=tl?3:2,tw=2*lp+lw;
  for(x=p.x0+8*Math.floor((lo-p.x0)/8);x<hi&&n<AZ_CN;x+=8){X=Math.round(x);azCX[n]=X;azCW[n]=Math.round(Math.min(x+8,p.x1))-X;azCG[n]=Math.round(GY-azGy(x+4));azCI[n]=Math.round((x-p.x0)/8);n++}
  ctx.globalAlpha=1;ctx.fillStyle=AZ_CU;
  for(i=0;i<n;i++)ctx.fillRect(azCX[i],azCG[i],azCW[i],bh);
  if(mo&&p.gl>0){ctx.fillStyle=AZ_LC[p.gl>AZ_GLOW*.66?2:p.gl>AZ_GLOW*.33?1:0]}else{ctx.globalAlpha=AZ_HA[c];ctx.fillStyle=AZ_HI}
  for(i=0;i<n;i++)ctx.fillRect(azCX[i],azCG[i],azCW[i],hh);
  ctx.globalAlpha=1;
  /* terminal studs (where each bolt lands) */
  for(j=0;j<p.n;j++){sx=Math.round((j?p.m2:p.m1)+p.la);if(sx<lo-9||sx>hi+9)continue;gs=Math.round(GY-azGy(sx));
    ctx.fillStyle="#1e3a8a";ctx.fillRect(sx-9,gs,18,hh+1);ctx.fillStyle="#e0f2fe";ctx.fillRect(sx-5,gs+1,10,hh-1)}
  /* lamp triplets every 64 px (skipped next to a stud); all show the plate's count-in level c; the lit 3rd (JUMP) lamp has a halo */
  for(x=p.x0+20+64*Math.max(0,Math.floor((lo-p.x0-20)/64));x<hi&&x+tw<=p.x1;x+=64){
    var sk=0;for(j=0;j<p.n;j++)if(Math.abs(x+tw/2-((j?p.m2:p.m1)+p.la))<tw)sk=1;
    if(sk)continue;
    X=Math.round(x);g=Math.round(GY-azGy(x+tw/2));
    for(j=0;j<3;j++){lit=j<c;
      if(j===2&&lit){ctx.globalAlpha=.3;ctx.fillStyle=AZ_LC[2];ctx.fillRect(X+2*lp-2,g+ly-2,lw+4,lh+3);ctx.globalAlpha=1}
      ctx.fillStyle=lit?AZ_LC[j]:AZ_LU;ctx.fillRect(X+j*lp,g+ly,lw,lh)}
  }
  /* lethal sheet: exactly AZ_CLR px from the local ground over [x0,x1] while the strike is live */
  if(e>=0&&e<AZ_DW){
    ctx.globalAlpha=mo?.6:.7;ctx.fillStyle="#a5b4fc";
    for(i=0;i<n;i++)ctx.fillRect(azCX[i],azCG[i]-AZ_CLR,azCW[i],AZ_CLR);
    ctx.globalAlpha=1;ctx.fillStyle="#f8fafc";
    for(i=0;i<n;i++)ctx.fillRect(azCX[i],azCG[i]-AZ_CLR,azCW[i],1);
    if(mo){ctx.globalAlpha=.9;ctx.fillStyle=AZ_LC[2];
      for(i=0;i<n;i++){var hf=azH(azCI[i],p.id*7+p.k);if(hf<.6&&azCW[i]>=6)ctx.fillRect(azCX[i]+1+Math.floor(hf*9),azCG[i]-AZ_CLR+1,1,2+Math.floor(hf*10))}
      ctx.globalAlpha=1}
  }
  /* bolt from the top of the view down to the stud it hits (static per strike); the stud is la px ahead of the buggy. Only in a
     run: after a strike death runS stops, so a bolt drawn in "over" would hang behind the game-over text (the 8 px sheet stays:
     it shows what ended the run, like every other hazard frozen on that screen) */
  if(run&&e>=0&&e<AZ_VIS&&p.k>0){
    sx=(p.k>1?p.m2:p.m1)+p.la;gs=GY-azGy(sx);var top=-OY,sh=(gs-top)/10,xa,xb,ya;
    if(mo){
      ctx.globalAlpha=.3;ctx.fillStyle="#a5b4fc";ctx.beginPath();ctx.arc(sx,gs-2,14,0,6.2832);ctx.fill();
      for(j=0;j<2;j++){ctx.globalAlpha=j?1:.6;ctx.fillStyle=j?"#f8fafc":"#6b8cff";w=j?2:6;
        for(i=0;i<10;i++){xa=sx+(azH(p.id*3+p.k,i)-.5)*28;xb=i<9?sx+(azH(p.id*3+p.k,i+1)-.5)*28:sx;ya=top+i*sh;
          ctx.fillRect(Math.round(xa-w/2),Math.round(ya),w,Math.ceil(sh)+1);
          ctx.fillRect(Math.round(Math.min(xa,xb)-w/2),Math.round(ya+sh-w/2),Math.round(Math.abs(xb-xa))+w,w)}}
    }else{ctx.globalAlpha=.9;ctx.fillStyle="#e0f2fe";ctx.fillRect(Math.round(sx-1.5),Math.round(top),3,Math.round(gs-top))}
    ctx.globalAlpha=1;
  }
  if(!run)return;
  /* x2 badge: a double, from the announce until its first strike */
  if(p.n===2&&p.k===0&&p.ar&&p.x0+18<XO+VW&&p.x0+18>XO-8){g=GY-azGy(p.x0+18);txt("x2",p.x0+18,g-14,9*HS,"#f0f9ff","center",true,true,true,"","azx2")}
  /* hint: JUMP ON 3 for the first AZ_HINT strikes of a run; under reduced motion a static JUMP at lamp 3 on every strike */
  if(p.k<p.n&&c>=1){
    var hx=Math.max(p.x0+30,Math.min(p.x1-30,PX+pW()/2+110)),hy=GY-azGy(hx)-40;
    if(!mo&&c===3)txt("JUMP",hx,hy,10*HS,"#f0f9ff","center",true,true,true,"","azj");
    else if(azHn<AZ_HINT)txt("JUMP ON 3",hx,hy,10*HS,"#a5b4fc","center",true,true,true,"","azh");
  }
}
/* queued sounds (sim path queues, this plays each once); never in demo, every call guarded */
function azEv(ev){if(typeof enemySfx!=="function")return false;try{return enemySfx("arc",ev)}catch(e){return false}}
function azCombo(){if(typeof sfxCombo!=="function")return false;try{sfxCombo(2);return true}catch(e){return false}}
function azSnd(){
  for(var i=0;i<AZ_N;i++){var p=azP[i],q=p.q;if(!q)continue;p.q=0;
    if(!demo){for(var b=0;b<4;b++)if(q&(1<<b))azEv(AZ_EV[b]);if(q&16)azCombo()}}
}
/* 14 drawEnts(), between the crusher and the ore cart: plates, glow, sparks, sounds (world transform; the buggy draws on top) */
function azDraw(){
  if(state==="start")return;
  azSync();
  var i,p,run=state==="run",mo=!rm(),tti,d=0;
  for(i=0;i<AZ_N;i++){p=azP[i];if(!p.a)continue;
    azDrawP(p,mo,run);
    /* right-edge glow while the plate's leading end is off screen */
    if(run&&!demo&&p.k<p.n&&p.x0>XO+VW&&typeof edgeWarn==="function"){tti=azTTI(p);
      if(tti<=AZ_WARN){AZ_EW.h=typeof ZM==="number"&&ZM>1?170:108;AZ_EW.y=GY-azGy(XO+VW)-AZ_EW.h;edgeWarn(AZ_K[p.id%AZ_KN],tti,"enemy","right",AZ_EW)}}
  }
  if(run)for(i=0;i<AZ_NP;i++)if(azPL[i]>0){if(!d){d=1;ctx.fillStyle="#e0f2fe"}
    ctx.globalAlpha=Math.max(0,Math.min(1,1.5*(1-azPA[i]/azPL[i])));ctx.fillRect(azPX[i]|0,azPY[i]|0,2,2)}
  if(d)ctx.globalAlpha=1;
  azSnd();
}
`;
