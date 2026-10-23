// BEACONS (client): anonymous play tracking. Interface: track(ev, score?, runSeconds?) -> POST /?event=... (same-origin). No-op with ?demo=1 / ?pu= / ?sk= (skDebug).
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
export default String.raw`
/* anonymous play tracking (never in demo mode, ?pu= or ?sk= debug runs) */
var pid="",utm=null;
if(!skDebug)
if(!demo&&!tpu){
  pid=lsg("forge-runner-pid")||"";
  if(!/^[a-f0-9]{16}$/.test(pid)){
    var rb=new Uint8Array(8);crypto.getRandomValues(rb);
    pid=Array.prototype.map.call(rb,function(b){return(b+256).toString(16).slice(1)}).join("");
    lss("forge-runner-pid",pid);
  }
  try{utm=JSON.parse(lsg("forge-runner-utm")||"null")}catch(e){utm=null}
  if(!utm||typeof utm!=="object"){
    utm=null;
    var u1=ut(Q.get("utm_source")),u2=ut(Q.get("utm_campaign")),u3=ut(Q.get("utm_content"));
    if(u1||u2||u3){utm={s:u1,c:u2,t:u3};lss("forge-runner-utm",JSON.stringify(utm))}
  }
}
function track(ev,score,dur){
  if(demo||tpu)return;
  if(skDebug)return;
  var d={pid:pid,challenge:chal?1:0};
  if(utm){d.utm_source=ut(utm.s);d.utm_campaign=ut(utm.c);d.utm_content=ut(utm.t)}
  if(score!==undefined)d.score=score;
  /* run length (game seconds) and session length so far (seconds since page load) */
  if(dur!==undefined){d.dur=Math.max(0,Math.min(36000,Math.round(dur)));d.ses=Math.max(0,Math.min(86400,Math.round(performance.now()/1000)))}
  var b=JSON.stringify(d),u=location.pathname+"?event="+ev;
  try{if(navigator.sendBeacon&&navigator.sendBeacon(u,b))return}catch(e){}
  try{fetch(u,{method:"POST",body:b,keepalive:true,credentials:"omit"}).catch(function(){})}catch(e){}
}
var MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
var SANS='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
var CY="#22d3ee",VI="#a855f7",OR="#f97316",BG="#05070d";
var KEY="forge-runner-hi";
`;
