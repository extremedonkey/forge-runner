// Build test: npm test (after npm run build). Checks the site (Lambda) build and the Poki build target.
//   node scripts/test-build.mjs [--baseline <git-ref>]
// --baseline: also builds <git-ref> (e.g. origin/main before the Poki target landed) in a temporary git worktree and asserts the
// site HTML is byte-identical apart from the one window.FR_BUILD='site' line. One-off check for the POKI-1 PR (base = pre-POKI-1),
// not run in CI; against later refs it reports any intended page change as a difference. Since sparks, equivalence is checked by
// behaviour instead: scripts/test-canvas.mjs (seeded canvas hashes) and scripts/sparks-smoke.mjs (see README).
//
// External-URL allowlist for dist/poki (Poki blocks external requests and outgoing links): ONLY the Poki SDK URL
// (POKI_ALLOWED_URLS in src/client/poki/script.mjs). Since POKI-4 any other http(s):// URL in any dist/poki file is a HARD FAIL
// (build-poki.mjs fails on it too). The 1 MB size limit and the no-absolute-path checks always fail.
// POKI-4 strip checks: no beacon/ids/UTM, no ?demo/?pu, no name prompt, no own-site links, no leaderboard, no Supporter Pack,
// share/challenge through PokiSDK.shareableURL/getURLParam (score only), PokiSDK.measure() the only measurement; and the site
// build still has all of those features.
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POKI = join(ROOT, "dist/poki");
const SDK = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const ALLOWED_URLS = new Set([SDK]);
const MAX_BYTES = 1024 * 1024;
const SITE_FLAG_LINE = "<script>window.FR_BUILD='site'</script>\n";

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) failed++; };

async function renderSite(distDir) {
  const { handler } = await import(pathToFileURL(join(distDir, "index.mjs")).href + `?t=${Date.now()}`);
  const res = await handler({ requestContext: { http: { method: "GET" } }, queryStringParameters: {} });
  return res.body;
}

// ---------- Poki build ----------
const indexPath = join(POKI, "index.html");
ok(existsSync(indexPath), "dist/poki/index.html exists");
const html = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
const head = html.split("</head>")[0];
ok(head.includes("window.FR_BUILD='poki'"), "poki: <head> sets window.FR_BUILD='poki'");
ok(head.includes("window.FR_ADS_CONFIG={enabled:true,backend:'poki'}"), "poki: <head> sets window.FR_ADS_CONFIG={enabled:true,backend:'poki'}");
ok(head.includes(`<script src="${SDK}"></script>`), "poki: Poki SDK <script> tag in <head>");
ok(head.includes('<script src="ads-adapter.js"></script>'), "poki: ads-adapter.js loaded in <head>");
const iFlag = html.indexOf("FR_BUILD='poki'"), iSdk = html.indexOf(SDK), iAd = html.indexOf('src="ads-adapter.js"'), iGame = html.indexOf('src="game.js"');
ok(iFlag >= 0 && iFlag < iSdk && iSdk < iAd && iAd < iGame, "poki: order is flags -> Poki SDK -> adapter -> game.js");
ok(!/rel="canonical"|property="og:|name="twitter:/.test(html), "poki: no canonical link, no og:* / twitter:* meta");
ok(!/<script>[^<]*\(function\(\)\{/.test(html), "poki: game script is an external file (game.js), not inline");

const files = existsSync(POKI) ? readdirSync(POKI, { recursive: true }).filter((f) => statSync(join(POKI, f)).isFile()) : [];
ok(["index.html", "game.js", "style.css", "ads-adapter.js"].every((f) => files.includes(f)), `poki: files = ${files.join(", ")}`);
ok(!files.some((f) => /\.(mjs|zip)$|^index\.mjs$|function|lambda|server/i.test(f)), "poki: no server/Lambda files");
const total = files.reduce((n, f) => n + statSync(join(POKI, f)).size, 0);
ok(total <= MAX_BYTES, `poki: total size ${total} bytes <= 1 MB (${MAX_BYTES})`);

// Relative paths only: every src/href/url() is relative, data:, a fragment or the allowlisted SDK; and it exists.
const refs = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
const css = files.includes("style.css") ? readFileSync(join(POKI, "style.css"), "utf8") : "";
refs.push(...[...css.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]));
const absolute = refs.filter((r) => r.startsWith("/"));
ok(absolute.length === 0, `poki: no absolute "/" asset paths${absolute.length ? ": " + absolute.join(", ") : ""}`);
const local = refs.filter((r) => !/^(data:|#|https?:)/.test(r) && !r.startsWith("/"));
ok(local.every((r) => existsSync(join(POKI, r.split(/[?#]/)[0]))), `poki: relative assets exist (${local.join(", ")})`);
ok(refs.filter((r) => /^https?:/.test(r)).every((r) => ALLOWED_URLS.has(r)), "poki: the only external src/href is the Poki SDK");
const game = files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "";
ok(!/export\s+const\s+handler|process\.env|require\(/.test(game), "poki: game.js has no server/Lambda code");
// POKI-2: ads hooks are in the Poki game script (poki/ads.js + edits in poki/script.mjs); the leaderboard is excluded (POKI-4)
ok(["ads.gameplayStart()", "ads.gameplayStop()", 'ads.showInterstitial("retry")', "if(adPaused)return;", "ads.onHidden()", "ads.gameLoadingFinished()"].every((k) => game.includes(k)),
  "poki: game.js has the POKI-2 ads hooks");
ok(!/FRLB|lbOver|\/api\//.test(game), "poki: leaderboard kept out (POKI-4: fragment excluded, hooks removed, no /api/)");

const pokiTexts = files.map((f) => [f, readFileSync(join(POKI, f), "utf8")]);
{
  const { POKI_ALLOWED_URLS, externalUrls } = await import(pathToFileURL(join(ROOT, "src/client/poki/script.mjs")).href);
  ok(POKI_ALLOWED_URLS.length === 1 && POKI_ALLOWED_URLS[0] === SDK, `poki: URL allowlist is exactly the Poki SDK (${POKI_ALLOWED_URLS.join(", ")})`);
  const bad = externalUrls(pokiTexts);
  ok(!bad.length, `poki: no external URLs except the Poki SDK (HARD FAIL)${bad.length ? ":\n    " + bad.join("\n    ") : ""}`);
  const all = pokiTexts.map(([, t]) => t).join("\n");
  ok(!/https?:\/\/(?!game-cdn\.poki\.com\/)/.test(all), "poki: no http(s) host other than game-cdn.poki.com in dist/poki");
  // the check really fails: a planted own-site URL is reported
  ok(externalUrls([["x.js", "var u='https://forgerunnergames.com/?c=1'"]]).length === 1, "poki: URL check reports a planted external URL");
}

const zip = join(ROOT, "dist/forge-runner-poki.zip");
ok(existsSync(zip), "dist/forge-runner-poki.zip exists");
if (existsSync(zip)) {
  const names = execFileSync("python3", ["-c", "import zipfile,sys; print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zip], { encoding: "utf8" }).trim().split("\n");
  ok(names.includes("index.html") && names.every((n) => !n.includes("/")), `zip: index.html at the root (${names.join(", ")})`);
}

// ---------- Site (Lambda) build ----------
const site = await renderSite(join(ROOT, "dist"));
ok(/<canvas/i.test(site), "site: handler renders the game page");
ok(site.includes(SITE_FLAG_LINE), "site: <head> sets window.FR_BUILD='site'");
// Since POKI-2 the shared game script has the ads hooks: it READS window.FR_ADS_CONFIG / window.FRAds (falls back to a no-op stub)
// and skips the leaderboard when FR_BUILD==='poki'. The site must still never SET the config, load the SDK or ship the adapter.
ok(!/poki-sdk|game-cdn\.poki\.com|<script[^>]*\ssrc=/i.test(site), "site: no Poki SDK, no external <script src>");
ok(!/FR_ADS_CONFIG\s*=[^=]/.test(site) && !/SDK_URL|function create\(userCfg\)/.test(site), "site: ads OFF (FR_ADS_CONFIG never set, no ads adapter)");
ok(!/poki-sdk|SDK_URL|function create\(userCfg\)|FR_ADS_CONFIG\s*=[^=]/.test(readFileSync(join(ROOT, "dist/index.mjs"), "utf8")), "site: Lambda bundle has no adapter/SDK code");

// ---------- Sparks scaffold (sparks SPEC §7/§9 PR0): fragments, order, interfaces, inert stubs, Poki exclusions ----------
{
  const { FRAGMENTS, buildScript, SCRIPT } = await import(pathToFileURL(join(ROOT, "src/client/index.mjs")).href);
  const order = FRAGMENTS.map(([n]) => n);
  const after = (a, b) => order.indexOf(a) === order.indexOf(b) + 1;
  ok(after("06b-sparks.js", "06-state.js") && after("06c-sparks-debug.js", "06b-sparks.js") &&
     after("08c-sparks-sfx.js", "08b-leaderboard-sfx.js") && after("14b-upgrades-ui.js", "14-render.js"),
     "sparks: fragments registered in order (06b after 06, 06c after 06b, 08c after 08b, 14b after 14)");
  ok(buildScript() === SCRIPT, "sparks: SCRIPT = buildScript() (every fragment)");
  let threw = false; try { buildScript({ exclude: ["nope.js"] }) } catch { threw = true }
  ok(threw, "sparks: buildScript() rejects unknown fragment names");
  const IFACE = ["isPoki", "skLoad", "skSave", "skLv", "skCost", "skCanBuy", "skBuy", "skEarn", "skSPT", "skBGT", "skMagR", "skPuF",
    "skInvShield", "skCores", "sfxSpark", "sfxBuy", "sfxNoBuy", "sfxAfford", "sfxReboot", "sfxReforge", "sfxAllMax", "upShow", "upHide"];
  const VARS = ["WEB_SPARKS", "SKON", "SKV", "SKU", "sk", "skRun"];
  const site = await renderSite(join(ROOT, "dist"));
  const missing = IFACE.filter((f) => !site.includes(`function ${f}(`)).concat(VARS.filter((v) => !new RegExp(`var ${v}=`).test(site)));
  ok(!missing.length, `sparks: site page defines ${IFACE.length} functions + ${VARS.length} vars${missing.length ? "; missing " + missing.join(",") : ""}`);
  ok(site.includes("var WEB_SPARKS=true;"), "sparks: WEB_SPARKS=true in the site build");
  // Inert: run the stub fragments with the 06-state constants they read; base values only, nothing bought or earned.
  const body = (n) => FRAGMENTS.find(([x]) => x === n)[1].slice(1, -1);
  const probe = (build) => new Function(`"use strict";var window={FR_BUILD:"${build}"};var SPT=10,BGT=6,demo=false,tpu="",snd=false,AU=null;function lsg(){return null}function lss(){}` +
    ["06b-sparks.js", "06c-sparks-debug.js", "08c-sparks-sfx.js", "14b-upgrades-ui.js"].map(body).join("\n") +
    `;skLoad();skSave();skEarn(5);sfxSpark();sfxBuy("m",1);upShow();upHide();
    return {SKON,poki:isPoki(),buy:skBuy("m"),can:skCanBuy("m"),cost:skCost("m"),lv:skLv("m"),b:sk.b,run:skRun,
      g:[skSPT(),skBGT(),skMagR(),skPuF(),skInvShield(),skCores()]}`)();
  const w = probe("site"), k = probe("poki");
  ok(w.SKON === true && w.poki === false && k.poki === true && k.SKON === true, "sparks: SKON on for web (WEB_SPARKS) and Poki; isPoki() = window.FR_BUILD==='poki'");
  // sparks PR1: 06b is live (economy in scripts/test-sparks.mjs); with an empty bank nothing can be bought and getters are base
  ok(!w.buy && !w.can && w.cost === 8 && w.lv === 0 && w.b === 5 && w.run === 5 && w.g.join() === "10,6,0,1,1.2,0",
     `sparks: core live (empty bank: no buy, Magnet costs 8, earn 5 banks 5; getters = base ${w.g.join("/")})`);
  ok(!/Math\.random|localStorage/.test(["06b-sparks.js", "06c-sparks-debug.js", "08c-sparks-sfx.js", "14b-upgrades-ui.js"].map(body).join("")) &&
     !/addEventListener/.test(["06b-sparks.js", "06c-sparks-debug.js", "08c-sparks-sfx.js"].map(body).join("")),
     "sparks: no Math.random / direct localStorage in the sparks fragments (storage only via lsg/lss); no listeners outside the 14b UI row (sparks PR8 input)");
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-sparks.mjs")], { stdio: "pipe" }); ok(true, "sparks: scripts/test-sparks.mjs passed") }
  catch (e) { ok(false, "sparks: scripts/test-sparks.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-levels.mjs")], { stdio: "pipe" }); ok(true, "levels: scripts/test-levels.mjs passed") }
  catch (e) { ok(false, "levels: scripts/test-levels.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-speed-levels.mjs")], { stdio: "pipe" }); ok(true, "speed-levels: scripts/test-speed-levels.mjs passed") }
  catch (e) { ok(false, "speed-levels: scripts/test-speed-levels.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-enemies-v2.mjs")], { stdio: "pipe" }); ok(true, "enemies-v2: scripts/test-enemies-v2.mjs passed") }
  catch (e) { ok(false, "enemies-v2: scripts/test-enemies-v2.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-crusher.mjs")], { stdio: "pipe" }); ok(true, "crusher: scripts/test-crusher.mjs passed") }
  catch (e) { ok(false, "crusher: scripts/test-crusher.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // HILLS (06i): terrain, felt speed, BIG AIR, fairness (scripts/test-hills.mjs)
  ok(site.includes("var HILLS_ON=true;") && (files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "").includes("var HILLS_ON=true;"), "hills: 06i-hills.js in the site and Poki builds");
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-hills.mjs")], { stdio: "pipe" }); ok(true, "hills: scripts/test-hills.mjs passed") }
  catch (e) { ok(false, "hills: scripts/test-hills.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // GAPS (06k): holes, clearability sweep, fall / revive (scripts/test-gaps.mjs)
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-gaps.mjs")], { stdio: "pipe" }); ok(true, "gaps: scripts/test-gaps.mjs passed") }
  catch (e) { ok(false, "gaps: scripts/test-gaps.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // LOOK-AHEAD contract (Levels #82): crest look-ahead >= flat at the same lvSpeedMul (0.8 / 1.0 / 1.10) - 1 frame, 390x844 + desktop
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-lookahead.mjs")], { stdio: "pipe" }); ok(true, "look-ahead: scripts/test-lookahead.mjs passed") }
  catch (e) { ok(false, "look-ahead: scripts/test-lookahead.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // FORK (06l): raised decks, the research rules 1-15 (scripts/test-fork.mjs; QUICK = fewer seeds / a 40 ms sweep, FULL=1 for the 500-seed run)
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-fork.mjs")], { stdio: "pipe", env: { ...process.env, QUICK: "1" } }); ok(true, "fork: scripts/test-fork.mjs passed") }
  catch (e) { ok(false, "fork: scripts/test-fork.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-orecart.mjs"), "--quiet"], { stdio: "pipe" }); ok(true, "orecart: scripts/test-orecart.mjs passed") }
  catch (e) { ok(false, "orecart: scripts/test-orecart.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-chaser.mjs"), "--quiet"], { stdio: "pipe" }); ok(true, "chaser: scripts/test-chaser.mjs passed") }
  catch (e) { ok(false, "chaser: scripts/test-chaser.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // LEVELS-5 crusher on Dev's terrain (HILLS / GAPS / FORK stubs on main; the real fragments when they are in src/client)
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-crusher-terrain.mjs")], { stdio: "pipe" }); ok(true, "crusher-terrain: scripts/test-crusher-terrain.mjs passed") }
  catch (e) { ok(false, "crusher-terrain: scripts/test-crusher-terrain.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // leaderboard dur rounds up: every sim-run (score, dur) passes the server ceiling (scripts/test-lb-dur.mjs)
  try { execFileSync(process.execPath, [join(ROOT, "scripts/test-lb-dur.mjs")], { stdio: "pipe" }); ok(true, "lb-dur: scripts/test-lb-dur.mjs passed") }
  catch (e) { ok(false, "lb-dur: scripts/test-lb-dur.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // MISSIONS-1: core fragment in both builds (not hooked yet); its node:test suite (spec §3 acceptance 1-4, 6, 7)
  ok(site.includes("function createMissions(") && (files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "").includes("function createMissions("),
     "missions: 06e-missions.js in the site and Poki builds");
  try { execFileSync(process.execPath, ["--test", join(ROOT, "scripts/test-missions.mjs")], { stdio: "pipe" }); ok(true, "missions: scripts/test-missions.mjs passed") }
  catch (e) { ok(false, "missions: scripts/test-missions.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  // MISSIONS-3/6 telemetry: TLM2 switch (shipped "all" = live on since MISSIONS-6), nothing in the Poki build (needs dist/poki)
  try { execFileSync(process.execPath, ["--test", join(ROOT, "scripts/test-telemetry.mjs")], { stdio: "pipe", cwd: ROOT }); ok(true, "telemetry: scripts/test-telemetry.mjs passed") }
  catch (e) { ok(false, "telemetry: scripts/test-telemetry.mjs FAILED\n" + String(e.stdout || "") + String(e.stderr || "")) }
  const pg = files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "";
  ok(!/\bPLATFORM\b/.test(pg) && !/\bPLATFORM\b/.test(site), "sparks: no PLATFORM variable in either build");
  ok(!pg.includes(body("06c-sparks-debug.js")) && pg.includes("function skEarn(") && pg.includes("function upShow("),
     "poki: 06c-sparks-debug.js dropped, the other sparks fragments kept");
  ok(files.every((f) => !readFileSync(join(POKI, f), "utf8").includes("SKDBG")), "poki: no SKDBG debug marker in dist/poki");
  // sparks PR10: the shipped artefact too, i.e. every file inside dist/forge-runner-poki.zip (what goes to Poki), and no ?sk reader
  {
    const zipHits = execFileSync("python3", ["-c",
      "import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\nn=z.namelist()\nprint(len(n))\n" +
      "for f in n:\n  d=z.read(f)\n  if b'SKDBG' in d or b'Q.get(\"sk\")' in d: print(f)", join(ROOT, "dist/forge-runner-poki.zip")], { encoding: "utf8" }).trim().split("\n");
    ok(+zipHits[0] >= 4 && zipHits.length === 1, `poki: no SKDBG marker / ?sk reader in any of the ${zipHits[0]} files of dist/forge-runner-poki.zip${zipHits.length > 1 ? "; found in " + zipHits.slice(1).join(", ") : ""}`);
    ok(files.every((f) => !readFileSync(join(POKI, f), "utf8").includes('Q.get("sk")')), "poki: no ?sk reader in dist/poki");
  }
  const { buildPokiScript, POKI_EXCLUDE } = await import(pathToFileURL(join(ROOT, "src/client/poki/script.mjs")).href);
  let guard = false;
  try { buildPokiScript(buildScript({ exclude: POKI_EXCLUDE }).replace("function upShow(){", "function upShow(){/*SKDBG*/")) } catch (e) { guard = /SKDBG/.test(e.message) }
  ok(guard && POKI_EXCLUDE.includes("06c-sparks-debug.js"), "poki: script.mjs drops 06c and its SKDBG guard fails the build on the marker");
}

// ---------- POKI-4 strip: each point asserted against dist/poki; the site build keeps every feature ----------
{
  const { POKI_FORBIDDEN, POKI_EXCLUDE, buildPokiScript } = await import(pathToFileURL(join(ROOT, "src/client/poki/script.mjs")).href);
  const { buildScript } = await import(pathToFileURL(join(ROOT, "src/client/index.mjs")).href);
  const pg = files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "";
  const page = pokiTexts.filter(([f]) => f !== "ads-adapter.js").map(([, t]) => t).join("\n"); // game.js + index.html + style.css
  const has = (t, ...xs) => xs.filter((x) => (x instanceof RegExp ? x.test(t) : t.includes(x)));
  const none = (what, ...xs) => { const hit = has(page, ...xs); ok(!hit.length, `poki ${what}${hit.length ? "; found " + hit.join(", ") : ""}`); };
  // 1. track() no-op, no ids/UTM, no requests to our own endpoints
  ok(/function track\(\)\{\}/.test(pg), "poki 1: track() is a no-op (function track(){})");
  none("1: no beacon/fetch/XHR, no ?event= endpoint", "sendBeacon", "fetch(", "XMLHttpRequest", "?event=", "location.pathname+");
  none("1: no pid/UTM/name localStorage keys", "forge-runner-pid", "forge-runner-utm", "forge-runner-name", "utm_", /\bpid\b/, /\butm\b/);
  const keys = [...pg.matchAll(/(?:lss|lsg|localStorage\.(?:setItem|getItem))\(\s*("[^"]*"|KEY)/g)].map((m) => m[1]);
  ok(keys.length > 0 && keys.every((k) => k === "KEY" || /^"(fr_snd2|forge-runner-sparks)"$/.test(k)) && /var KEY="forge-runner-hi"/.test(pg),
     `poki 1: localStorage keys are only hi score / sound / sparks (${[...new Set(keys)].join(", ")})`);
  // 2. no ?demo / ?pu, no name prompt, no outbound links, no Supporter Pack
  none("2: no ?demo / ?pu / ?sk switches, no autopilot", 'Q.get("demo")', 'Q.get("pu")', 'Q.get("sk")', "demo=1", "function auto(", "if(demo)");
  ok(/var demo=false,tpu="";/.test(pg) && /var skDebug=false;/.test(pg), "poki 2: demo=false, tpu='' and skDebug=false are constants");
  none("2: no player-name prompt", 'id="np"', 'getElementById("np")', "Your name", "nameGo", 'Q.get("n")', "&n=", "#np{");
  ok(!html.includes('id="np"') && html.includes('id="sh"'), "poki 2: index.html has the Share button but no name prompt");
  none("2: no outbound links / own-site URL", "PUBLIC_URL", "forgerunnergames", "<a ", "href=\"http", "location.href=", "window.open(", "openExternalLink");
  none("2: no Supporter Pack", /supporter/i);
  // 3. share + challenge through the SDK, score only, guarded for a missing SDK
  ok(/PokiSDK\.getURLParam\("c"\)/.test(pg) && /typeof PokiSDK\.getURLParam==="function"/.test(pg) && /cq=Q\.get\("c"\)/.test(pg),
     "poki 3: challenge read via PokiSDK.getURLParam('c'), guarded, falls back to ?c=");
  ok(/S\.shareableURL\(\{c:String\(sc\)\}\)/.test(pg) && /typeof S\.shareableURL==="function"/.test(pg) && /shareOut\(text,""\)/.test(pg),
     "poki 3: share link = PokiSDK.shareableURL({c:score}) only, guarded, text-only fallback");
  ok(/var chal=0,cname="";/.test(pg) && !/cname=/.test(pg.replace('var chal=0,cname="";', "")), "poki 3: challenge names never set (score only)");
  // 4. leaderboard fully excluded
  ok(POKI_EXCLUDE.includes("15-leaderboard.js"), "poki 4: 15-leaderboard.js excluded");
  none("4: no leaderboard API/UI/SFX hooks", "/api/", "FRLB", "lbDraw", "lbOver", "sfxFlagPass", /leaderboard/i, "initials");
  ok(pg.includes("function sfxNewBest(") && pg.includes("function sfxAllMax("), "poki 4: new-best fanfare kept (sparks sfxAllMax uses it)");
  // 5. the only measurement is PokiSDK.measure()
  ok(/S\.measure\(c,w,a\)/.test(pg) && /typeof S\.measure==="function"/.test(pg) && /pkMeasure\("button","share","interact"\)/.test(pg), "poki 5: PokiSDK.measure() (guarded) for share");
  none("5: no other analytics", /gtag|google-analytics|googletagmanager|dataLayer|analytics\./i);
  // markers: none in dist/poki, and the build guard really fails on each one
  const leaked = POKI_FORBIDDEN.filter((m) => page.includes(m));
  ok(!leaked.length, `poki: none of the ${POKI_FORBIDDEN.length} POKI_FORBIDDEN markers in dist/poki${leaked.length ? "; found " + leaked.join(", ") : ""}`);
  const base = buildScript({ exclude: POKI_EXCLUDE });
  const unguarded = POKI_FORBIDDEN.filter((m) => { try { buildPokiScript(base.replace("function upShow(){", () => `function upShow(){/*${m}*/`)); return true } catch (e) { return !e.message.includes("forbidden marker") } });
  ok(!unguarded.length, `poki: the build fails on every POKI_FORBIDDEN marker${unguarded.length ? "; not on " + unguarded.join(", ") : ""}`);
  // the ads adapter copy: only the Poki SDK URL, poki backend unchanged
  const ad = files.includes("ads-adapter.js") ? readFileSync(join(POKI, "ads-adapter.js"), "utf8") : "";
  ok(ad.includes(`poki: "${SDK}"`) && !/googlesyndication|crazygames-sdk/.test(ad) && /POKI\.sdk\(\)\.init\(\)/.test(ad), "poki: adapter copy keeps the poki backend, other SDK URLs stripped");

  // site build: every stripped feature is still there (one codebase; the strip is Poki-only)
  const has1 = (what, ...xs) => { const miss = xs.filter((x) => !(x instanceof RegExp ? x.test(site) : site.includes(x))); ok(!miss.length, `site: ${what}${miss.length ? "; missing " + miss.join(", ") : ""}`); };
  has1("play beacon + pid/UTM (track -> ?event=)", 'location.pathname+"?event="', "sendBeacon", 'lss("forge-runner-pid"', 'lss("forge-runner-utm"', "utm_source");
  has1("?demo / ?pu switches + autopilot", 'Q.get("demo")==="1"', 'Q.get("pu")', "function auto(", "if(demo)start();");
  has1("name prompt + named challenge links", 'id="np"', 'getElementById("np")', "function nameGo(", 'var NK="forge-runner-name"', 'cname=nm(Q.get("n"))');
  has1("own-site share link", 'var PUBLIC_URL="https://forgerunnergames.com"', 'PUBLIC_URL+"/?c="');
  has1("global leaderboard (/api client) + its SFX hooks", 'C.api || "/api"', "window.FRLB", "lbDraw();", "lbOver(s,runS)", "function sfxFlagPass(", "function sfxNewBest(");
  ok(!/PokiSDK|shareableURL|getURLParam|pkMeasure/.test(site), "site: no PokiSDK share/challenge/measure code");
}

// ---------- Optional: site HTML vs a baseline ref ----------
const bi = process.argv.indexOf("--baseline");
if (bi >= 0) {
  const ref = process.argv[bi + 1];
  const wt = mkdtempSync(join(tmpdir(), "fr-baseline-"));
  try {
    execFileSync("git", ["worktree", "add", "--detach", wt, ref], { cwd: ROOT, stdio: "ignore" });
    symlinkSync(join(ROOT, "node_modules"), join(wt, "node_modules"));
    execFileSync("node", ["scripts/build.mjs"], { cwd: wt, stdio: "ignore" });
    const base = await renderSite(join(wt, "dist"));
    const stripped = site.replace(SITE_FLAG_LINE, "");
    ok(stripped === base, `site: HTML identical to ${ref} apart from the FR_BUILD='site' line (${base.length} vs ${stripped.length} bytes)`);
  } finally {
    execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: ROOT, stdio: "ignore" });
    rmSync(wt, { recursive: true, force: true });
  }
}

// ---------- POKI-7 rewarded 🎬 Continue / Double (revenue spec §6): Poki only, OFF by default ----------
{
  const { POKI_HEAD } = await import(pathToFileURL(join(ROOT, "src/client/build-flags-poki.mjs")).href);
  const cfg = (POKI_HEAD.match(/FR_ADS_CONFIG=(\{[^}]*\})/) || [])[1] || "";
  ok(cfg && !/continue|double/.test(cfg), `rewarded: the Poki FR_ADS_CONFIG sets no continue/double flag, so both are OFF (${cfg})`);
  const pg = readFileSync(join(POKI, "game.js"), "utf8");
  ok(pg.includes("var CNON=ADS.continue===true&&ads.enabled,DBON=ADS.double===true&&ads.enabled;") &&
     pg.includes("if(CNON)wrap.appendChild(cnB);") && pg.includes("if(DBON)wrap.appendChild(dbB);"),
     "rewarded: a 🎬 button enters the DOM only when its flag is literally true");
  const sr = [...pg.matchAll(/showRewarded\(/g)].length, srClick = [...pg.matchAll(/addEventListener\("click",function\(e\)\{[^}]*?\n  ads\.showRewarded\("(continue|double)"\)/g)].length;
  ok(sr === 2 && srClick === 2 && !/rewardedBreak/.test(pg), `rewarded: game.js calls ads.showRewarded only from the two 🎬 click handlers (${sr}/${srClick}), never rewardedBreak directly`);
  ok(!/rewardedBreak|showRewarded|🎬|FR_ADS_CONFIG\s*=[^=]/.test(site), "rewarded: the site build has no rewarded code and no 🎬 button");
}

if (failed) { console.error(`BUILD TEST FAILED (${failed})`); process.exit(1); }
console.log("BUILD TEST PASSED");
