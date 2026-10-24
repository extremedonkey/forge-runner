// LAB layer for ARC STRIKES, the L6 ARC FURNACE mechanic (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js,
// never in the site/Poki script). The strikes are LIVE in every build through the three guarded hook lines (13 spawn and
// update, 14 drawEnts), so this layer wraps NONE of them (nothing runs twice; tested in scripts/test-arc.mjs). Preview switches:
//   ?level=6  (06d LVQ level floor) or ?l6=1 (the same floor when ?level is not given): L6 from the start, strikes from 5 s in
//   ?fast=1   every run starts at the 760 px/s cap (LAB ONLY: the true 800 felt of a natural L6; no beacons here)
//   ?azdbg=1  read-only probe window.__az for headless screenshot timing (plates, when L6 began, state, py, speed, level)
export default String.raw`
/* ===== LAB: ARC FURNACE (L6 ARC STRIKES) ===== */
if(Q.get("l6")==="1"){if(!LVQ)LVQ=6}
if(Q.get("fast")==="1")(function(){var oS=start;start=function(){oS();speed=MAXV}})();
if(Q.get("azdbg"))window.__az={get azP(){return azP},get azL6(){return azL6},get state(){return state},get py(){return py},get speed(){return speed},get lvl(){return azLvl()},
  get runS(){return runS},PX:PX,get vis(){return XO+VW}};
`;
