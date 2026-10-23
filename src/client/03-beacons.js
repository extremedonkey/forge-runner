// BEACONS (client): anonymous play tracking. Interface: track(ev, score?, runSeconds?, extra?) -> POST /?event=... (same-origin). No-op with ?demo=1 / ?pu= / ?sk= (skDebug).
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
/* MISSIONS-3 telemetry (revenue spec §5). ONE switch: "off" | "preview" (preview hosts only) | "all" (needs Reece's yes: live site).
   Sent only where tlmOn(): sid on every event, rv/rn/rl on start+over, db (death bucket) + sb (session bucket) on over, mission_shown/mission_done
   with mid. Anonymous: the existing pid only, no free text. This whole block is stripped from the Poki build (no beacon there). */
var TLM2="preview";
var TLM_HOSTS=["preview.forgerunnergames.com","3nslnfimuztmjlqvbt4rdp4w2q0lpfoe.lambda-url.ap-southeast-2.on.aws"];
function tlmOn(){if(TLM2==="all")return true;if(TLM2!=="preview")return false;try{return TLM_HOSTS.indexOf(location.hostname)>=0}catch(e){return false}}
var tlmRn=0;                      /* run index this page load */
var tlmSid="";                    /* sid: random per-page-load id (never stored, nothing personal), made on the first preview send */
function tlmS(){if(!tlmSid){try{var sb=new Uint8Array(8);crypto.getRandomValues(sb);tlmSid=Array.prototype.map.call(sb,function(b){return(b+256).toString(16).slice(1)}).join("")}catch(e){tlmSid=""}}return tlmSid}
function tlmB(v,cuts,names){for(var i=0;i<cuts.length;i++)if(v<cuts[i])return names[i];return names[cuts.length]}
function tlmAdd(ev,d,x){
  var si=tlmS();if(/^[a-f0-9]{16}$/.test(si))d.sid=si;
  if(ev==="start"||ev==="over"){
    var rv=typeof RESCUE_V==="number"&&isFinite(RESCUE_V)?Math.max(0,Math.min(9,Math.floor(RESCUE_V))):0;
    d.rv=rv;d.rn=Math.max(1,Math.min(10000,tlmRn));
    var rl=parseInt(lsg("forge-runner-rl")||"0",10);d.rl=Math.max(1,Math.min(9999999,rl>0?rl:1));
  }
  if(ev==="over"&&d.dur!==undefined){d.db=tlmB(d.dur,[5,10,20],["lt5","lt10","lt20","ge20"]);d.sb=tlmB(d.ses,[60,180,600],["lt60","lt180","lt600","ge600"])}
  if(x&&typeof x.mid==="string"&&/^[a-z][a-z0-9]{1,15}$/i.test(x.mid))d.mid=x.mid;
}
function track(ev,score,dur,x){
  if(demo||tpu)return;
  if(skDebug)return;
  if(ev==="start"){tlmRn++;var rlc=parseInt(lsg("forge-runner-rl")||"0",10);lss("forge-runner-rl",String(Math.min(9999999,(rlc>0?rlc:0)+1)))}
  var tl=tlmOn();
  if(ev.indexOf("mission_")===0&&!tl)return;   /* new events never leave a non-preview host */
  var d={pid:pid,challenge:chal?1:0};
  if(utm){d.utm_source=ut(utm.s);d.utm_campaign=ut(utm.c);d.utm_content=ut(utm.t)}
  if(score!==undefined)d.score=score;
  /* run length (game seconds) and session length so far (seconds since page load) */
  if(dur!==undefined){d.dur=Math.max(0,Math.min(36000,Math.round(dur)));d.ses=Math.max(0,Math.min(86400,Math.round(performance.now()/1000)))}
  if(tl)tlmAdd(ev,d,x);
  var b=JSON.stringify(d),u=location.pathname+"?event="+ev;
  try{if(navigator.sendBeacon&&navigator.sendBeacon(u,b))return}catch(e){}
  try{fetch(u,{method:"POST",body:b,keepalive:true,credentials:"omit"}).catch(function(){})}catch(e){}
}
var MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
var SANS='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
var CY="#22d3ee",VI="#a855f7",OR="#f97316",BG="#05070d";
var KEY="forge-runner-hi";
`;
