// LAB layer for ENEMIES v2 (lab build only: scripts/build-lab.mjs puts it right before 16-loop.js, never in the site/Poki
// script). The enemies themselves are live in every build via the guarded hook lines in 13/14. Lab-only test switch: ?en=l|v|h makes every spawn the base type of that enemy (b / p / d) so screenshots
// show it quickly (changes the spawn mix, so only for previews).
export default String.raw`
/* ===== LAB: ENEMIES v2 (slag blob, ember vent, hammer drone) ===== */
var EN_FORCE=({l:"b",v:"p",h:"d"})[Q.get("en")||""]||"";
/* the enemies are live through the guarded hook lines in 13-simulation.js / 14-render.js; the lab only adds ?en= */
(function(){var oP=pick;if(EN_FORCE)pick=function(){oP();return EN_FORCE}})();
/* lab-only screenshot probe (?endbg=1): read-only view of the entity list for headless capture timing */
if(Q.get("endbg"))window.__fr={get ents(){return ents},get state(){return state},get speed(){return speed},PX:PX,get vis(){return XO+VW},enVentT:enVentT,enHamT:enHamT};
`;
