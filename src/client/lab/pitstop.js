// LAB layer for the UPGRADE PIT STOP (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the
// site/Poki script). The pit and the per-run economy are live (14c, 06b); this layer adds test switches on a lab page that has
// sparks off by default (build-lab WEB_SPARKS=false) and must never touch the real forge-runner-sparks save:
//  - sparks on with a memory-only save
// Switches: ?pit=S a pit every S s of run time (quick testing; label "Continue"), ?bank=N start each run with N sparks,
//   ?pkdbg=1 read-only probe window.__pk (+ __pk.god() for headless tests).
export default String.raw`
/* ===== LAB: UPGRADE PIT STOP ===== */
(function(){
  var BANK=Math.max(0,Math.min(99999,parseInt(Q.get("bank"),10)||0)),god=false;
  pkEvery=Math.max(0,parseFloat(Q.get("pit"))||0);
  SKON=true;skLoad=function(){return sk};skSave=function(){return false};
  skSeed.b=BANK;sk=skDef();skRunStart();
  var oU=update;update=function(dt){oU(dt);if(god&&state==="run")inv=Math.max(inv,.2)};
  if(Q.get("pkdbg"))window.__pk={get state(){return state},get pk(){return pk?{x0:pk.d.x0,xg:pk.xg,xm:pk.d.xm,n:pk.n,used:pk.used}:null},
    get hsc(){return hsc},get c(){return hsc+PX+PW/2},get front(){return hsc+PX+PW},get f(){return speed*vMul()},get onDeck(){return !!(pk&&fkDk===pk.d)},
    get bank(){return sk.b},get lv(){return JSON.stringify(sk.l)},get cores(){return cores},get shd(){return shd},get spMax(){return spMax},
    get runS(){return runS},get score(){return score},god:function(){god=true},go:pkGo};
})();
`;
