// FORK: optional raised parallel platforms ("catwalk" decks) that rejoin the floor (research/dkc-mine-cart-madness.md item 4,
// fairness rules 1-15). Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// PO (Forge): tiers 1 and 2, the upper track pays sparks only (~1.5x the floor's spark rate, no pickups up there), the floor stays
// complete and fair on its own (a player who never goes up only misses sparks), score stays base-curve distance (rule 15).
//  - DECK = a static one-way surface FK.h[t] px above the floor (tier 1: 58, tier 2: 102 = 44 above tier 1, entered from tier 1
//    the same way). Solid only from above while falling (jump-through
//    entry, ledge assist 6 px, 25 % overlap), never sideways or from below. Exit varies per fork (FK.ab): SOFT = a down-taper
//    (>= .4 s felt, slope <= .1) onto solid ground; ABRUPT (d.drop, xm === xe) = the deck just ends and the buggy runs off the ledge
//    (fkStand D < 0: fkLeave(0), coyote 100 ms HL.coy, a normal fall onto the flat floor; hazards stay off it as for a taper).
//    Duck on a deck = drop through (3G fast fall).
//  - PLACEMENT (fkSpawn, 13 spawn() last line): L3+ only, <= FK.cap[level] per level (L3-L4 1, L5-L6 2, none on L7 MINE CART or the L8 placeholder), never while
//    lvGapsBlocked(), none within 2 s after a level banner / mission toast / Spare Core revive, rolled with the run's own LCG
//    (no Math.random). The entry is placed off screen beyond the spawn point (>= FK.lead s ahead, so edgeWarn gets >= 1.0 s).
//    The terrain under a fork is eased flat (hlCurve x fkFl) from before its entry to after its last merge (rule 14 "on flat
//    ground"; the ramp starts beyond the spawn point, so no placed entity, gap or arc ever sees its ground change). No ground gap
//    under a deck nor within Dfull + the flatten ramp of it (rule 8; gpSpawn asks fkZone). Ground lane = the normal spawn() stream
//    (rule 10) minus rule 9 types under a deck (pillars / vents, mid+high flyers, drones) and minus every hazard under a taper and
//    .85 s after a merge (rule 11) and under the first deck's landing zone (rule 14). The deck adds content, never replaces it.
//  - SET PIECE (L4+, FK.t2): tier 2 starts after tier 1's landing zone (1.5 Dfull + .6 s), runs >= 2.5 s, then tapers onto the floor or ends abruptly.
//    Floor -> tier 1 -> tier 2 -> merge without a drop or a hit: sfxCombo(2) once.
//  - HOOKS (all typeof-guarded, never in demo / hlSim look-aheads): sfxPlatLand(tier) on landing on a deck; edgeWarn(key,tti,
//    'fork','R',{y}) from FK.warn (1.0 s) before each entry edge; sfxCombo(n). Public: platNear(x0,x1) (world px, hsc space).
// Flag: FORK_ON (default true); ?fork=0 turns forks off (both builds). Never touches speed / scroll / runT / score.
export default String.raw`
var FORK_ON=true;
try{if(Q&&Q.get&&Q.get("fork")==="0")FORK_ON=false}catch(e){}
/* FK: h = deck height per tier; lv = first level; cap = decks per level; ch = chance per spawn once eligible; prog = earliest
   level progress; len = tier-1 flat length range (s felt, tier-1-only forks); taper s / max slope; ab = chance a fork ends abruptly (no taper); lz = landing zone
   (x Dfull + s); calm = s after a merge with no hazard; solid = s of solid ground after a merge; t2 = set-piece chance per level;
   t2Len = tier-2 flat s; t1Over = s of tier 1 under tier 2; warn = edgeWarn lead s; lead = min s from the buggy to an entry;
   ease = flatten ramp px; pre = flat ground before an entry (x Dfull); no = s with no new deck after a banner / toast / revive;
   l5 = s between decks from L5 on (L5 and L6); sr = deck spark rate (sparks / s felt) = 1.5 x the floor's measured rate (scripts/test-fork.mjs) */
var FK={h:[0,Math.round(.22*H),Math.round(.5*H)],ab:.5,lv:3,cap:[0,0,0,1,1,2,2,0,0],ch:.3,prog:.15,len:[1.8,2.6],taper:.4,slope:.1,lz:[1.5,.6],calm:.85,solid:1.0,
  t2:[0,0,0,0,.6,.6,.6],t2Len:2.5,t1Over:1.0,warn:1.0,lead:1.3,ease:700,pre:1.0,no:2,l5:15,sr:.95,nMin:3,nMax:9};
var fkOn=false,fkDecks=[],fkSeed=1,fkN=0,fkT=0,fkDk=null,fkNo=null,fkCnt=[0,0,0,0,0,0,0],fkLast=-1e9,fkNoUntil=-1e9,fkCore=0,fkToast=-1e9,
  fkInvP=0,fkRun=null,fkLog=[],fkStat={met:0,up:0,t2:0,combo:0,land:0,drop:0};
function fkR(){fkSeed=(Math.imul(fkSeed,1664525)+1013904223)>>>0;return fkSeed/4294967296}
function fkDf(){return typeof gpDf==="function"?gpDf():.689}
/* hlStart (06i): reset; the LCG seed comes from start()'s own puNext draw (no extra random draws) */
function fkStart(){
  fkOn=FORK_ON&&!demo&&!(typeof tpu!=="undefined"&&tpu);fkDecks=[];fkN=0;fkT=0;fkDk=null;fkNo=null;fkCnt=[0,0,0,0,0,0,0];fkLast=-1e9;
  fkNoUntil=-1e9;fkCore=typeof cores==="number"?cores:0;fkToast=typeof msTT==="number"?msTT:-1e9;fkInvP=0;fkRun=null;fkLog=[];
  fkStat={met:0,up:0,t2:0,combo:0,land:0,drop:0};
  fkSeed=(Math.floor(((typeof puNext==="number"?puNext:200)%1)*4294967296)^0x27d4eb2f)>>>0||1;
}
/* felt speed on the flattened ground at base speed s: s x min(level multiplier, VMUL_CAP, 800/s) (06i vMul with hlF = 1) */
function fkF(s){var m=typeof lvSpeedMul==="function"?Math.max(.8,Math.min(1.25,lvSpeedMul())):1;m=Math.min(m,typeof VMUL_CAP==="number"?VMUL_CAP:1.1);return s*Math.min(m,(typeof HL!=="undefined"?HL.vCap:800)/s)}
/* height of deck d above the floor at world x (the taper is linear; an abrupt deck is H up to xe), or -1 off it. ov: the 25 % overlap at the entry edge */
function fkHt(d,wx,ov){if(wx>d.xm||wx<d.x0-(ov||0))return -1;if(wx<=d.xe)return d.H;if(d.xm<=d.xe)return -1;return d.H*(1-(wx-d.xe)/(d.xm-d.xe))}
/* flatten factor for hlCurve: 0 over every fork zone [z0,z1], smoothstep back to 1 over FK.ease px (or e px: 06i's L7 humps
   flatten over a longer ramp, so a pit deck on them never makes a launching crest) */
function fkFl(wx,e){
  var i,d,u,m=1;e=e||FK.ease;
  for(i=0;i<fkDecks.length;i++){d=fkDecks[i];if(d.t!==1)continue;
    u=wx<d.z0?(d.z0-wx)/e:wx>d.z1?(wx-d.z1)/e:0;if(u>=1)continue;u=u*u*(3-2*u);if(u<m)m=u}
  return m;
}
/* 06k gpSpawn: true when world [a,b] touches a fork's no-gap zone (rule 8: Dfull and the flatten ramp around it) */
function fkZone(a,b){if(!fkOn)return false;for(var i=0;i<fkDecks.length;i++){var d=fkDecks[i];if(d.t===1&&b>d.z0-FK.ease&&a<d.z1+FK.ease)return true}return false}
/* public (Levels' enemies / ore carts, typeof-guarded): the first deck overlapping world x [x0,x1] as {x0,x1,tier,h}, or null */
/* platNear(x0,x1): world-x px (hsc space, like gapNear). The first (lowest x0) deck span overlapping [x0,x1) as {x0,x1,tier}:
   x0 = its entry edge, x1 = where its taper rejoins the floor (tier 2 of a set piece is its own span), or null (none / ?fork=0).
   Read by Levels' chaser roller (#91) with gapNear, to keep bookings off forks and gaps. */
function platNear(x0,x1){if(!fkOn)return null;var a=Math.min(x0,x1),b=Math.max(x0,x1),r=null;for(var i=0;i<fkDecks.length;i++){var d=fkDecks[i];if(d.xm>a&&d.x0<b&&(!r||d.x0<r.x0))r=d}return r?{x0:r.x0,x1:r.xm,tier:r.t}:null}
/* snapshots for the 06i / 06k look-aheads (hlArcOK, gpWin, gpFeltAt) */
function fkSv(){return [fkT,fkDk,fkNo]}
function fkLd(a){fkT=a[0];fkDk=a[1];fkNo=a[2]}
/* rule 9 / 11 / 14: ground-lane content a fork removes (never adds): types that would poke through or hide behind a deck,
   every hazard under a taper or within FK.calm s after a merge, every hazard under the first deck's landing zone */
function fkTall(e){return e.t==="p"||e.t==="d"||e.t==="h"||e.t==="f"&&e.bot>=18||e.sk==="v"}
function fkFilter(){
  if(!fkDecks.length)return;
  var i,j,e,d,a,b,k;
  var fr=hsc+PX+PW,f=Math.max(1,speed*vMul());
  for(i=ents.length-1;i>=0;i--){e=ents[i];if(e.fk||e.t==="u")continue;a=hsc+e.x;b=a+e.w;k=0;
    /* a roller drives back through the world at vx: test where it meets the buggy */
    if(e.vx&&a>fr){var m=(a-fr)*e.vx/(f+e.vx);a-=m;b-=m}
    for(j=0;j<fkDecks.length&&!k;j++){d=fkDecks[j];
      if(e.t==="k"){if(e.ax!=null&&b>d.x0-PW&&a<d.xm)k=1;continue}   /* a floor spark arc would sit in the deck: dropped */
      if(fkTall(e)&&b>d.x0-PW&&a<d.xm)k=1;
      else if(b>d.xe-PW&&a<d.xm+FK.calm*d.fM+PW)k=1;   /* + PW: a spawn moves one step before it is seen */
      else if(d.first&&b>d.x0-PW&&a<d.x0+d.lz+PW)k=1}
    if(k)ents.splice(i,1)}
}
/* 13 spawn(), last line (after gpSpawn): maybe place a fork ahead; then filter the ground lane under every fork */
function fkSpawn(){
  if(!fkOn||state!=="run"||hlSim)return;
  fkTry();fkFilter();
}
/* LEVELS-5 crusher (06h, main #76/#92): its plates land on the floor lane at the buggy, so no fork at L5 until CRUSHER DOWN
   (crS 7); a fork placed at L4 already ends >= FK.no s before the L5 banner. Also blocked while a boss armed on L5 (crL5 >= 0)
   is still pending or fighting on L6 (a stalled fight); a ?level=6 start never arms it (crS stays 0, crL5 -1): forks as usual */
function fkBoss(n){return typeof crOn==="function"&&(crOn()||(n===5||typeof crL5==="number"&&crL5>=0)&&typeof crS==="number"&&crS<7)}
function fkTry(){
  var n=typeof gpLv==="function"?gpLv():1,P=typeof gpProg==="function"?gpProg(n):[.5,1e9],lvT=typeof LV_AT!=="undefined";
  if(n<FK.lv||fkCnt[n]>=FK.cap[n]||runS<fkNoUntil||(typeof gpBlocked==="function"&&gpBlocked()))return;
  if(lvT&&P[0]<FK.prog)return;
  if(n>=5&&runS-fkLast<FK.l5)return;
  if(fkBoss(n))return;
  for(var i=0;i<fkDecks.length;i++)if(fkDecks[i].xm>hsc)return;   /* one fork at a time */
  if(fkR()>=FK.ch)return;
  var f0=fkF(speed),fM=fkF(Math.min(MAXV,speed+7*8)),Df=fkDf()*fM,t2=fkR()<FK.t2[n],ab=fkR()<FK.ab,L,x0,xe,xm,c,xe2,xm2,tp1,tp2,lz=(FK.lz[0]*fkDf()+FK.lz[1])*fM;
  x0=Math.max(hsc+W+80+FK.ease+FK.pre*Df,hsc+PX+PW+FK.lead*fM);
  /* taper: >= FK.taper s of felt travel and a slope <= FK.slope at 800 felt (the same descent rate in s at any speed) */
  tp1=ab?0:Math.max(FK.taper*fM,FK.h[1]*fM/(FK.slope*800));tp2=ab?0:Math.max(FK.taper*fM,FK.h[2]*fM/(FK.slope*800));
  /* rule 6: >= FK.len[0] s at the fastest felt speed it can see (fM), <= 5 s at the slowest (f0) */
  if(t2){c=x0+lz+.15*fM;xe=c+FK.t1Over*fM;xm=xe+tp1;xe2=Math.max(c+FK.t2Len*fM,xm+.3*fM);xm2=xe2+tp2;
    if(!ab&&xm2-c>4.9*f0){ab=true;tp1=tp2=0;xm=xe;xe2=Math.max(c+FK.t2Len*fM,xm+.3*fM);xm2=xe2}}   /* the 0.5 H deck's gentle taper does not fit the 5 s budget at the slowest speeds: that set piece ends abruptly instead */
  else{L=FK.len[0]+(FK.len[1]-FK.len[0])*fkR();xe=x0+Math.min(L*fM,4.9*f0-tp1);xm=xe+tp1}
  if((t2?xm2-c:xm-x0)>4.9*f0||(t2?xm-x0:0)>4.9*f0)return;
  var end=t2?xm2:xm,dur=(end-x0)/f0+(x0-hsc)/f0;
  if(lvT&&P[1]<dur+FK.no+1)return;   /* the fork ends >= 2 s before the next level banner */
  var z0=x0-FK.pre*Df,z1=end+Math.max(FK.solid*fM,Df);
  if(typeof gapNear==="function"&&gapNear(z0-FK.ease-Df,z1+FK.ease+Df))return;   /* rule 8: no gap under / around it (incl. the ramp) */
  var k="fork"+(++fkN),d1={t:1,H:FK.h[1],x0:x0,xe:xe,xm:xm,z0:z0,z1:z1,f0:f0,fM:fM,lz:lz,first:fkN===1,key:k,lv:n,set:t2,t0:runS,drop:ab};
  fkDecks.push(d1);fkLog.push(d1);
  if(t2){var d2={t:2,H:FK.h[2],x0:c,xe:xe2,xm:xm2,z0:z0,z1:z1,f0:f0,fM:fM,lz:lz,first:false,key:k+"t2",lv:n,set:t2,t0:runS,drop:ab};fkDecks.push(d2);fkLog.push(d2);d1.up=d2}
  fkCnt[n]++;fkLast=runS;
  /* rewards: the whole route (x0 .. its merge) pays FK.sr sparks per s at the felt speed now (f0); on a set piece the tier-1
     sparks before tier 2's edge count toward it and tier 2 carries the rest */
  var a1=x0+.3*fM,b1=xe-20,n1=fkN1(FK.sr*(xm-x0)/f0);
  if(!t2)fkSparks(d1,a1,b1,n1);
  else{var nb=Math.floor(n1*Math.max(0,Math.min(1,(c-a1)/(b1-a1)))+1e-9);fkSparks(d1,a1,b1,n1);fkSparks(d1.up,c+.3*fM,xe2-20,fkN1(FK.sr*(xm2-x0)/f0-nb))}
}
/* the deck's reward: a line of sparks riding height above the deck (bot = H + 8, as the floor's rows), FK.sr per s of the route
   (1.5 x the floor's 0.64 /s at L3-L5 on the 0.5 H hills, measured by test-fork), FK.nMin..nMax. Not magnet-pulled from below (13: e.dk) */
function fkN1(v){return Math.max(FK.nMin,Math.min(FK.nMax,Math.round(v)))}
function fkSparks(d,a,b,n){
  var i,s=(b-a)/Math.max(1,n-1);
  d.ns=n;for(i=0;i<n;i++)ents.push({x:a+i*s-hsc-6,w:12,h:12,bot:d.H+8,t:"k",fk:1,dk:d.t});
}
/* 06i hlCanJump: standing on a deck = grounded (the 13 jump block, jump buffer jb .12 included) */
function fkCanJump(){return fkT>0&&!duck}
function fkLeave(drop){
  if(drop){fkStat.drop++;if(fkRun)fkRun.clean=false}
  fkT=0;fkDk=null;hlTk=hlLG;hlPk=hlLG+py;hlJ=0;hlCr=0;hlCL=0;
}
/* 06i hlPhys, first: standing on a deck (py = deck height above the floor gh). true = handled this step */
/* height under the wheels: past a taper's end = 0 (merged; steps skip x = xm); past an abrupt end = -1 (off the ledge) */
function fkD(d,c){return d.drop?fkHt(d,c,PW/2-11):c>=d.xm?0:fkHt(d,c,PW/2-11)}
function fkStand(gh,tv,dt){
  if(!fkT)return false;
  var d=fkDk,c=hsc+PX+PW/2,D=fkD(d,c),lt;
  if(vy>0){lt=hlLTV;vy+=lt>HL.tvC?HL.tvC:lt<-HL.tvC?-HL.tvC:lt;fkLeave(0);hlJ=1;return false}   /* 13 jumped */
  if(duck){fkNo=d;fkLeave(1);vy=0;return false}   /* drop through (fast fall) */
  if(d.t===2){var lo=fkAt(1,c);if(lo&&fkHt(lo,c)>=D){fkDk=d=lo;fkT=1;D=fkD(lo,c)}}   /* tier 2's taper meets tier 1 */
  if(D<0){fkLeave(0);vy=0;hlOff=HL.coy;return false}   /* ran off an abrupt deck's ledge */
  if(D<=0){fkMerge(d);fkT=0;fkDk=null;py=0;vy=0;hlLG=gh;hlLTV=tv;return true}   /* the taper reached the floor */
  lt=(gh+D-(hlLG+py))/dt;
  py=D;vy=0;hlLG=gh;hlLTV=lt;
  return true;
}
function fkAt(t,c){for(var i=0;i<fkDecks.length;i++){var d=fkDecks[i];if(d.t===t&&fkHt(d,c,PW/2-11)>0)return d}return null}
/* 06i hlPhys, after the air step: land on a deck from above (falling; feet crossed its top, or <= HL.ledge under it) */
function fkLand(gh,tv,p0){
  if(!fkOn||fkT||vy>0||!fkDecks.length)return false;
  var c=hsc+PX+PW/2,i,d,D,b=null,bD=0;
  if(fkNo&&(fkHt(fkNo,c,PW/2-11)<=0||py<fkHt(fkNo,c)-HL.ledge))fkNo=null;
  if(duck)return false;   /* holding duck: falls through */
  for(i=0;i<fkDecks.length;i++){d=fkDecks[i];if(d===fkNo)continue;D=fkHt(d,c,PW/2-11);
    if(D>0&&py<=D&&p0>=D-HL.ledge&&D>bD){b=d;bD=D}}
  if(!b)return false;
  py=bD;vy=0;hlLG=gh;hlLTV=tv;hlJ=0;hlCr=0;hlCL=0;hlOff=0;hlDeep=0;fkT=b.t;fkDk=b;
  if(!hlSim)fkLanded(b);
  return true;
}
function fkLanded(d){
  fkStat.land++;
  if(!d.ridden){d.ridden=1;if(d.t===1)fkStat.up++;else fkStat.t2++}
  if(d.set){var r=fkRun&&fkRun.k===d.key.replace("t2","")?fkRun:null;
    if(!r)r=fkRun={k:d.key.replace("t2",""),n:0,clean:true,top:0};
    if(d.t>r.top){r.n++;r.top=d.t}}
  if(!demo)typeof sfxPlatLand==="function"&&sfxPlatLand(d.t);
}
/* merged onto the floor: a clean set piece (floor -> tier 1 -> tier 2 -> merge, no drop, no hit) cheers once */
function fkMerge(d){
  var r=fkRun;fkRun=null;
  if(r&&d.t===2&&r.clean&&r.n>=2&&!demo&&!hlSim){fkStat.combo++;typeof sfxCombo==="function"&&sfxCombo(r.n)}
}
/* 13 update(), after gpTick: edge warnings, revive / toast holds, hit tracking, cull */
function fkTick(dt){
  if(!fkOn)return;
  var i,d,f=speed*vMul(),fr=hsc+PX+PW;
  if(typeof cores==="number"){if(cores<fkCore)fkHold();fkCore=cores}
  if(typeof msTT==="number"&&msTT!==fkToast){fkToast=msTT;fkHold()}
  if(inv>fkInvP+1e-9&&fkRun)fkRun.clean=false;fkInvP=inv;
  /* cull once the whole zone incl. its flatten ramp is behind the screen (the terrain there never changes while visible) */
  while(fkDecks.length&&fkDecks[0].z1+FK.ease<hsc-300&&fkDecks[0]!==fkDk)fkDecks.shift();
  for(i=0;i<fkDecks.length;i++){d=fkDecks[i];
    if(d.x0>fr-PW&&!demo){var tti=(d.x0-fr)/Math.max(1,f);if(!d.met&&tti<1.2&&d.t===1){d.met=1;fkStat.met++}
      if(tti<=FK.warn)typeof edgeWarn==="function"&&edgeWarn(d.key,tti,"fork","R",{y:GY-hlW(d.x0)-d.H})}
  }
}
/* rule 14: a Spare Core revive or a mission toast: no new fork for FK.no s, and a fork whose entry is still off screen and would
   come within FK.no s is taken back (only while its flatten ramp is still off screen) */
function fkHold(){
  fkNoUntil=runS+FK.no;
  var f=Math.max(1,speed*vMul()),i,d,cut=[];
  for(i=0;i<fkDecks.length;i++){d=fkDecks[i];if(d.t===1&&!d.pit&&d.z0-FK.ease>hsc+XOR()+40&&(d.x0-hsc-PX-PW)/f<FK.no)cut.push(d.key)}
  if(!cut.length)return;
  for(i=0;i<fkDecks.length;i++)if(fkDecks[i].t===1&&cut.indexOf(fkDecks[i].key)>=0)fkCnt[fkDecks[i].lv]--;
  fkDecks=fkDecks.filter(function(q){return cut.indexOf(q.key.replace("t2",""))<0});
  ents=ents.filter(function(e){return !e.fk||fkDecks.some(function(q){return hsc+e.x>=q.x0-20&&hsc+e.x<=q.xm})});
}
function XOR(){return (typeof XO==="number"?XO:0)+(typeof VW==="number"?VW:W)}
/* 14 render, after gpDraw: decks (translucent struts over the lane band <= 40 %, glowing top, bright entry cap, taper chevrons) */
function fkDraw(){
  if(!fkOn||!fkDecks.length)return;
  var i,d,a,b,x,y,ya,P=typeof lvl!=="undefined"&&lvl>1&&typeof LV_PAL!=="undefined"?LV_PAL[lvl-1]:null,ln=P?P.ln:CY,mo=!rm();
  for(i=0;i<fkDecks.length;i++){d=fkDecks[i];a=d.x0-hsc;b=d.xm-hsc;if(b<XO-20||a>XO+VW+20)continue;
    var cl=d.t===2?OR:ln,x0=Math.max(a,XO-24),x1=Math.min(b,XO+VW+24);
    /* struts to the floor: faint (<= .3), so the ground lane under the deck stays readable */
    ctx.globalAlpha=.22;ctx.fillStyle=cl;
    for(x=Math.ceil((hsc+x0)/64)*64-hsc;x<x1;x+=64){var h=fkHt(d,hsc+x);if(h>4){y=GY-hlW(hsc+x)-h;ctx.fillRect(Math.round(x),Math.round(y+3),2,Math.round(h-3))}}
    ctx.globalAlpha=.3;ctx.beginPath();
    for(x=x0;x<=x1;x+=8){y=GY-hlW(hsc+x)-fkHt(d,hsc+x);x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
    for(x=x1;x>=x0;x-=8){y=GY-hlW(hsc+x)-Math.max(0,fkHt(d,hsc+x)-3);ctx.lineTo(x,y)}
    ctx.closePath();ctx.fillStyle=cl;ctx.fill();ctx.globalAlpha=1;
    /* glowing top line (the surface you land on) */
    ctx.lineJoin="round";ctx.strokeStyle=cl;ctx.globalAlpha=.25;ctx.lineWidth=6;ctx.beginPath();
    for(x=x0;x<=x1;x+=8){y=GY-hlW(hsc+x)-fkHt(d,hsc+x);x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
    ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=ZM>1?3:2;ctx.stroke();
    /* entry cap + up chevron; taper chevrons pointing down */
    if(a>=XO-20){ya=GY-hlW(d.x0)-d.H;ctx.fillStyle="#ffffff";ctx.fillRect(a-2,ya-1,4,5);
      var pu=mo?Math.sin(tt*6)*.5+.5:1;ctx.globalAlpha=.5+.5*pu;ctx.fillStyle=cl;ctx.beginPath();ctx.moveTo(a+6,ya-8);ctx.lineTo(a+12,ya-16);ctx.lineTo(a+18,ya-8);ctx.closePath();ctx.fill();ctx.globalAlpha=1}
    var xs=d.xe-hsc,xt;
    for(xt=0;xt<3&&!d.drop;xt++){x=xs+(b-xs)*(xt+.5)/3;if(x<XO-10||x>XO+VW+10)continue;y=GY-hlW(hsc+x)-fkHt(d,hsc+x);
      ctx.fillStyle=cl;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(x-5,y-12);ctx.lineTo(x+5,y-12);ctx.lineTo(x,y-6);ctx.closePath();ctx.fill();ctx.globalAlpha=1}
  }
}
`;
