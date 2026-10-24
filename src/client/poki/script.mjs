// Poki build target only: builds dist/poki/game.js from the site fragments minus POKI_EXCLUDE (client/index.mjs buildScript),
// and the Poki copy of the ads adapter (buildPokiAdapter). Imported by scripts/build-poki.mjs, never by the Lambda/site bundle,
// so the site page and dist/index.mjs stay byte-identical.
// 1. POKI_EXCLUDE drops whole web-only fragments: the ?sk= sparks debug switch (06c) and the global leaderboard (15).
// 2. Mobile's Poki fragment (poki/mobile.js) goes in right before 16-loop.js (boot), after the edits below.
// 3. A few exact, asserted text edits (each must match exactly once, or the build fails, so upstream drift is caught):
//    - POKI-3 (Mobile): the site versions of fit()/placeShare()/draw() are renamed *_web and wrapped by poki/mobile.js, the
//      start/over text uses PT (portrait) instead of OY, hints/retry wording follow the input type.
//    - POKI-4 (strip): track() is a no-op and no player id / UTM is stored; no ?demo / ?pu switches (and no autopilot); no name
//      prompt; the challenge link (?c=, score only, no names) is read with PokiSDK.getURLParam and shared with
//      PokiSDK.shareableURL (the own-site PUBLIC_URL link is gone); the leaderboard hooks are removed; the only measurement is
//      PokiSDK.measure(). Every call into the SDK is guarded, so the game still runs with the SDK missing (ad blocker, offline).
//    - POKI-2 (Dev): poki/ads.js (FRAds lifecycle, retry via commercialBreak, opt-in rewarded Continue) goes in before
//      poki/mobile.js; its one-line hooks in start()/die()/press()/update()/input/visibilitychange/boot are asserted edits.
// 4. POKI_FORBIDDEN: markers that fail the build if they reach game.js. The build and npm test also HARD-FAIL on any http(s)
//    URL in dist/poki other than the Poki SDK (POKI_ALLOWED_URLS).
import { buildScript } from "../index.mjs";
import BEACONS from "../03-beacons.js";
import SHARE from "../09-share.js";
import SIM from "../13-simulation.js";
import LOOP from "../16-loop.js";
import LBSFX from "../08b-leaderboard-sfx.js";
import CHALLENGE from "../02-challenge.js";
import POKI_MOBILE from "./mobile.js";
import POKI_ADS from "./ads.js";
import { POKI_SDK_URL } from "../build-flags-poki.mjs";

// Web-only fragments left out of the Poki game script. Extend here.
//   06c = the ?sk= sparks debug switch (sparks SPEC §6); 15 = the global leaderboard (BRIEF D2 = none on Poki). 08b stays, minus
//   its leaderboard-only flag-pass SFX (sfxNewBest is also the sparks all-max fanfare, 08c sfxAllMax).
export const POKI_EXCLUDE = ["06c-sparks-debug.js", "15-leaderboard.js"];
// Markers that fail the Poki build if they reach game.js (SKDBG = sparks debug code; Poki: "clean build, no debug code";
// the rest = beacon / ids / UTM, URL test switches, name prompt, own-site links, leaderboard, Supporter Pack).
export const POKI_FORBIDDEN = [
  "SKDBG",
  // beacon, player id, UTM (no analytics but PokiSDK.measure)
  "sendBeacon", "fetch(", "XMLHttpRequest", "?event=", "forge-runner-pid", "forge-runner-utm", "utm_",
  // ?demo / ?pu test switches and the demo autopilot
  'Q.get("demo")', 'Q.get("pu")', 'Q.get("sk")', "function auto(",
  // player-name prompt and names on challenges
  "forge-runner-name", 'getElementById("np")', "nameGo", 'Q.get("n")',
  // own-site links (PUBLIC_URL) and outbound links
  "PUBLIC_URL", "forgerunnergames", "location.href=", "window.open(",
  // global leaderboard (no /api calls, no UI, no SFX hooks)
  "/api/", "FRLB", "lbDraw", "lbOver", "sfxFlagPass",
  // Supporter Pack (purchases are not allowed on Poki)
  "Supporter", "supporter",
];
// The only http(s) URL allowed anywhere in dist/poki: Poki's SDK script.
export const POKI_ALLOWED_URLS = [POKI_SDK_URL];
export const URL_RE = /https?:\/\/[^\s"'`<>)\\,;]+/g;

const body = (f) => f.slice(1, -1); // same as client/index.mjs
const between = (s, a, b, what) => {
  const i = s.indexOf(a), j = s.indexOf(b, i + 1);
  if (i < 0 || j < 0) throw new Error(`poki script: markers for ${what} not found (did the site code change?)`);
  return s.slice(i, j);
};

/* POKI-4 replacements (plain browser JS, same rules as the fragments: no backticks, no ${...}) */
const POKI_TRACK = `/* Poki build (POKI-4): no play beacon and no player id / UTM in storage (no third-party trackers, no requests to
   our own endpoints). PokiSDK.measure() is the only measurement (pkMeasure in the share code). */
function track(){}
/* MISSIONS-3: the Poki build's only mission telemetry is Poki's own measure() (06e-missions.js msTel calls this; SDK-guarded) */
function msPoki(ev,id){if(ev==="mission_done")pkMeasure("mission",id,"complete")}
`;
const POKI_CHALLENGE = `/* challenge (Poki build, POKI-4): score only, no names. ?c= is read with PokiSDK.getURLParam (gdc= on poki.com, c= elsewhere);
   without the SDK (ad blocker, offline) the page's own ?c= is used. Read at load and again once the SDK init resolves
   (whether getURLParam works before init is unconfirmed), but only while the title screen is up. */
var chal=0,cname="";
function pkChal(){
  if(chal||state!=="start")return;
  var cq=null;
  try{if(window.PokiSDK&&typeof PokiSDK.getURLParam==="function")cq=PokiSDK.getURLParam("c")}catch(e){cq=null}
  if(cq===null||cq===undefined||cq==="")cq=Q.get("c");
  if(/^\\d{1,5}$/.test(String(cq||""))){var c=parseInt(cq,10);chal=c>=1&&c<=99999?c:0}
}`;
const POKI_SHARE = `/* share (Poki build, POKI-4): score only, no name prompt, no own-site link. The link is PokiSDK.shareableURL({c:score})
   (a poki.com ?gdc= URL); without the SDK, or if it fails, the text is shared without a link. */
var shB=document.getElementById("sh"),toastE=document.getElementById("toast"),toT=0;
function placeShare(){
  var sk=ZM>1?PZ/ZM:1;  /* portrait look-ahead zoom (PZW 1.12): keep the button's CSS size of the old 1.35 zoom (PZ), as 09-share.js */
  shB.style.top=Math.round((GY+10+OY)*CS)+"px";
  shB.style.height=Math.max(30,Math.min(48,Math.round((H-GY-16)*CS*sk)))+"px";
  shB.style.fontSize=Math.max(13,Math.min(19,Math.round(15*CS*sk)))+"px";
}
function toast(s){
  toastE.textContent=s;toastE.style.display="block";
  clearTimeout(toT);toT=setTimeout(function(){toastE.style.display="none"},1600);
}
function copy(s){
  function old(){
    var t=document.createElement("textarea"),r=false;
    t.value=s;t.setAttribute("readonly","");t.style.position="fixed";t.style.opacity="0";
    document.body.appendChild(t);t.select();
    try{r=document.execCommand("copy")}catch(e){}
    document.body.removeChild(t);
    toast(r?"Copied!":"Copy failed");
  }
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(function(){toast("Copied!")},old);
  else old();
}
/* the only measurement in the Poki build: Poki's own game events */
function pkMeasure(c,w,a){try{var S=window.PokiSDK;if(S&&typeof S.measure==="function")S.measure(c,w,a)}catch(e){}}
function shareOut(text,url){
  var all=url?text+" "+url:text;
  if(navigator.share){
    navigator.share(url?{text:text,url:url}:{text:text}).catch(function(e){if(!e||e.name!=="AbortError")copy(all)});
  }else copy(all);
}
function doShare(){
  var sc=Math.max(1,Math.min(99999,lastS)),text="Forge Runner · "+lastS+" 🔥 beat me",S=window.PokiSDK,p=null;
  pkMeasure("button","share","interact");
  try{if(S&&typeof S.shareableURL==="function")p=S.shareableURL({c:String(sc)})}catch(e){p=null}
  if(!p||typeof p.then!=="function")return shareOut(text,"");
  p.then(function(u){shareOut(text,typeof u==="string"&&/^https?:/i.test(u)?u:"")},function(){shareOut(text,"")});
}
shB.addEventListener("click",function(){shB.blur();doShare()});
`;

const BEACON_PART = between(body(BEACONS), "/* anonymous play tracking", "var MONO=", "03-beacons.js track()");
const LBSFX_PART = between(body(LBSFX), "/* Forge Runner leaderboard SFX", "/* new personal best", "08b-leaderboard-sfx.js flag-pass SFX");
const POKI_LBSFX = `/* Poki build (POKI-4): no global ranking, so no flag-pass SFX; the new-best fanfare stays (the sparks all-max SFX uses it) */
function lbOk(){return snd&&AU&&ac&&ac.state==="running"}
`;
const AUTO_PART = between(body(SIM), "/* autopilot (demo=1) */", "/* simulation:", "13-simulation.js auto()");

const EDITS = [
  // POKI-4: no ?demo / ?pu switches, no name or UTM sanitisers, no name key
  ['var demo=Q.get("demo")==="1";\n/* test switch for trying power-ups: ?pu=s|j|g starts every run with that power-up; no beacons, no high score */\nvar tpu=/^[sjg]$/.test(Q.get("pu")||"")?Q.get("pu"):"";',
   '/* Poki build (POKI-4): no ?demo / ?pu URL switches */\nvar demo=false,tpu="";', "?demo / ?pu switches"],
  ['/* sparks debug switch (sparks SPEC §6): any ?sk= on the web build marks a debug run (parsed in 06c-sparks-debug.js).\n   Like ?pu=: no beacons, no high-score write, read-only leaderboard. Always false on the Poki build */\nvar skDebug=window.FR_BUILD!=="poki"&&Q.get("sk")!==null;',
   '/* Poki build: no ?sk= sparks debug switch (06c is dropped) */\nvar skDebug=false;', "?sk debug flag"],
  ['/* names: letters, digits, spaces; max 12 chars. Only ever drawn on the canvas or set via textContent. */\nfunction nm(s){return Array.from(String(s||"").replace(/[^\\p{L}\\p{N} ]/gu,"").replace(/\\s+/g," ").trim()).slice(0,12).join("").trim()}\nfunction ut(s){return String(s||"").replace(/[^A-Za-z0-9_.\\-]/g,"").slice(0,40)}\nvar NK="forge-runner-name";\n',
   "", "nm()/ut()/NK"],
  // POKI-4: challenge via the SDK (score only), track() no-op, share via the SDK
  [body(CHALLENGE), POKI_CHALLENGE, "02-challenge.js fragment"],
  [BEACON_PART, POKI_TRACK, "03-beacons.js pid/UTM + track()"],
  [body(SHARE), POKI_SHARE, "09-share.js fragment"],
  // POKI-4: no demo autopilot, no name prompt, no leaderboard hooks
  [LBSFX_PART, POKI_LBSFX, "08b flag-pass SFX"],
  [AUTO_PART, "", "auto() (demo autopilot)"],
  ["  if(demo)auto();\n", "", "demo autopilot call"],
  ["  window.FRLB&&FRLB.hide();\n", "", "start() leaderboard hook"],
  ['  shB.style.display="none";np.style.display="none";', '  shB.style.display="none";', "start() name prompt hide"],
  ["  if(!demo&&!tpu&&window.FRLB)lbOver(s,runS);\n", "", "die() leaderboard hook"],
  ["  if(window.FRLB&&FRLB.isOpen())return;\n", "", "press() leaderboard hook"],
  ["  lbDraw();\n", "", "draw() leaderboard flags"],
  ["[btn,shB,np].forEach(", "[btn,shB].forEach(", "input stopPropagation list"],
  // site functions, wrapped by poki/mobile.js (after the POKI-4 fragment swaps: the Poki share code's placeShare() is wrapped too)
  ["function fit(){", "function fit_web(){", "fit()"],
  ["function placeShare(){", "function placeShare_web(){", "placeShare()"],
  ["function draw(){", "function draw_web(){", "draw()"],
  // start/over text: portrait puts it in the sky; landscape cover keeps the site's playfield positions
  ["var ty=OY?Math.round(-OY*.5):Math.round(H*.32);", "var ty=PT?Math.round(-OY*.5):Math.round(H*.32);", "title y"],
  ["ty+(OY?112:84)*HS", "ty+(PT?112:84)*HS", "challenge line y"],
  ["var oy=OY?Math.round(-OY*.5):Math.round(H*.28);", "var oy=PT?Math.round(-OY*.5):Math.round(H*.28);", "game-over y"],
  // hints by input type (touch vs keyboard), not orientation
  ['txt("tap to start",', 'txt(PKT?"tap to start":"press space to start",', "start prompt"],
  [`    var hint="tap / space: jump (hold = higher) · swipe down / ↓: duck";
    if(OY){
      txt("tap: jump (hold = higher)",XO+VW/2,ty+60*HS,fitPx("tap: jump (hold = higher)",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt("swipe down: duck",XO+VW/2,ty+80*HS,fitPx("swipe down: duck",12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);`,
   `    var h1=PKT?"tap: jump (hold = higher)":"space / ↑: jump (hold = higher)",h2=PKT?"swipe down: duck":"↓: duck",hint=h1+" · "+h2;
    if(PT){
      txt(h1,XO+VW/2,ty+60*HS,fitPx(h1,12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
      txt(h2,XO+VW/2,ty+80*HS,fitPx(h2,12*HS,VW-24,true,false),"#cbd5e1","center",true,false,true);
    }else txt(hint,XO+VW/2,ty+56,fitPx(hint,12,VW-24,true,false),"#cbd5e1","center",true,false,true);`, "control hints"],
  ['txt("tap to retry",', 'txt(PKT?"tap to retry":"space to retry",', "retry prompt"],
  // POKI-2 (Dev): ads lifecycle hooks (poki/ads.js holds ads, retry(), upRetry(), the Continue logic)
  ["function start(){\n  startMusic();", "function start(){\n  ads.gameplayStart();continuedThisRun=false;rtArm=false;hideContinue();\n  startMusic();", "start(): gameplayStart"],
  ["function die(){\n", "function die(){\n  ads.gameplayStop();deaths++;\n", "die(): gameplayStop"],
  ["if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}\n}", "if(!rm()){sparks(PX+PW/2,GY-15,30,280);shake=.4}\n  maybeOfferContinue();\n}", "die(): Continue offer"],
  ["function press(){\n", "function press(){\n  if(ads.busy||adPaused)return;\n", "press(): ad guard"],
  ['else if(state==="over"){if(t-deathAt>400)start()}', 'else if(state==="over"){if(ads.enabled){if(t-deathAt>800)rtArm=true}else if(t-deathAt>400)start()}', "press(): retry on release, 800 ms"],
  ["function update(dt){\n", "function update(dt){\n  if(adPaused)return;\n", "update(): frozen during ads"],
  ["  e.preventDefault();\n  if(e.touches.length===1){", "  e.preventDefault();\n  if(ads.busy||adPaused)return;\n  if(e.touches.length===1){", "touchstart guard"],
  ["if(e.touches.length===0){release();duck=false}", "if(e.touches.length===0){release();duck=false;upRetry()}", "touchend retry"],
  ["if(e.button!==0||isUI(e.target))return;", "if(e.button!==0||isUI(e.target)||ads.busy||adPaused)return;", "mousedown guard"],
  ['window.addEventListener("mouseup",function(){release()});', 'window.addEventListener("mouseup",function(){release();upRetry()});', "mouseup retry"],
  ['window.addEventListener("keydown",function(e){\n  var k=e.code;\n', 'window.addEventListener("keydown",function(e){\n  var k=e.code;\n  if(ads.busy||adPaused)return;\n', "keydown guard"],
  ['if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release()}', 'if(k==="Space"||k==="ArrowUp"||k==="KeyW"){release();upRetry()}', "keyup retry"],
  ['window.addEventListener("blur",function(){release();duck=false});', 'window.addEventListener("blur",function(){release();duck=false;rtArm=false});', "blur disarm"],
  // last: Mobile's Poki layer (after Dev's ads layer) goes in right before the boot fragment (after the renames above, so they can't match it)
  [body(LOOP), body(POKI_ADS) + "\n" + body(POKI_MOBILE) + "\n" + body(LOOP), "16-loop.js fragment"],
  // POKI-2: loop/boot hooks (16-loop.js text, now after the inserted layers)
  ['document.addEventListener("visibilitychange",function(){\n  if(document.hidden){', 'document.addEventListener("visibilitychange",function(){\n  document.hidden?ads.onHidden():ads.onVisible();\n  if(document.hidden){', "visibilitychange: onHidden/onVisible"],
  ["    release();duck=false;\n  }else", "    release();duck=false;rtArm=false;\n  }else", "visibilitychange: disarm retry"],
  ['fit();\ntrack("visit");', 'pkChal();\nfit();\ntrack("visit");', "boot: read the challenge (POKI-4)"],
  // POKI-4: no demo autostart (gameplayStart only on the first player input); the challenge is read again once init resolves
  ["if(demo)start();\nraf=requestAnimationFrame(frame);", "raf=requestAnimationFrame(frame);\n/* ads init in the background (never delays the first draw); Poki may reject init, the adapter swallows that */\nads.init().then(function(){ads.gameLoadingFinished();pkChal()});", "boot: init -> gameLoadingFinished"],
];

export function buildPokiScript(script = buildScript({ exclude: POKI_EXCLUDE })) {
  let s = script;
  for (const [from, to, what] of EDITS) {
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`poki script: expected exactly 1 match for ${what}, found ${n} (did the site code change?)`);
    s = s.replace(from, () => to);
  }
  for (const m of POKI_FORBIDDEN) if (s.includes(m)) throw new Error(`poki script: forbidden marker ${JSON.stringify(m)} present (web-only code leaked)`);
  return s;
}
export const POKI_SCRIPT = buildPokiScript();

// Poki copy of the ads adapter (vendored from the ads draft; the site never ships it): the other backends' SDK URLs and the
// doc links in comments are removed, so dist/poki holds no external URL but the Poki SDK. With no SDK_URL entry, the adsense
// and crazygames backends fall back to "none" (they are never configured on Poki anyway). The poki backend is unchanged.
const ADAPTER_EDITS = [
  [` * Sources: Poki https://sdk.poki.com/html5 · Google Ad Placement API https://developers.google.com/ad-placement/apis/adbreak
 *          AdSense tag params https://support.google.com/adsense/answer/9955214 · CrazyGames https://docs.crazygames.com/sdk/video-ads/
`, ` * Poki build copy: the other backends' SDK URLs and the doc links are stripped (Poki allows no external requests).
`, "sources comment"],
  [`    poki: "${POKI_SDK_URL}",
    adsense: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    crazygames: "https://sdk.crazygames.com/crazygames-sdk-v3.js"
`, `    poki: "${POKI_SDK_URL}"
`, "SDK_URL table"],
  ["/* Poki: https://sdk.poki.com/html5 . No internal", "/* Poki: No internal", "Poki doc link"],
  ["       https://developers.google.com/ad-placement/apis/adbreak . Placement", "       Placement", "Ad Placement doc link"],
  ["/* CrazyGames HTML5 SDK v3: https://docs.crazygames.com/sdk/intro/ . SDK caps", "/* CrazyGames HTML5 SDK v3: SDK caps", "CrazyGames doc link"],
];
export function buildPokiAdapter(src) {
  let s = src;
  for (const [from, to, what] of ADAPTER_EDITS) {
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`poki adapter: expected exactly 1 match for ${what}, found ${n} (did ads-adapter.js change?)`);
    s = s.replace(from, () => to);
  }
  return s;
}

// HARD FAIL: every http(s) URL in a dist/poki file must be on POKI_ALLOWED_URLS. Returns the offending "file: url" list.
export function externalUrls(files /* [[name, text]] */) {
  const bad = [];
  for (const [f, t] of files) for (const m of t.matchAll(URL_RE)) if (!POKI_ALLOWED_URLS.includes(m[0])) bad.push(`${f}: ${m[0]}`);
  return [...new Set(bad)];
}
