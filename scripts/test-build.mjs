// Build test: npm test (after npm run build). Checks the site (Lambda) build and the Poki build target.
//   node scripts/test-build.mjs [--baseline <git-ref>]
// --baseline: also builds <git-ref> (e.g. origin/main before the Poki target landed) in a temporary git worktree and asserts the
// site HTML is byte-identical apart from the one window.FR_BUILD='site' line. One-off check for the POKI-1 PR (base = pre-POKI-1),
// not run in CI; against later refs it reports any intended page change as a difference.
//
// External-URL allowlist for dist/poki (Poki blocks external requests): ONLY the Poki SDK URL. Any other http(s):// URL found in
// dist/poki is listed. Today the game script still holds the own-site link (PUBLIC_URL, used by share/challenge links) and the
// ads adapter holds its other backends' SDK URLs and doc links in comments; POKI-4 strips those. Until then this is a WARNING;
// set POKI_URLS_STRICT=1 to make it fail. The 1 MB size limit and the no-absolute-path checks always fail.
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
const warn = (msg) => console.log(`WARN ${msg}`);

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
// POKI-2: ads hooks are in the Poki game script (poki/ads.js + edits in poki/script.mjs); the leaderboard is #12's stub (no FRLB, no /api/)
ok(["ads.gameplayStart()", "ads.gameplayStop()", 'ads.showInterstitial("retry")', "if(adPaused)return;", "ads.onHidden()", "ads.gameLoadingFinished()"].every((k) => game.includes(k)),
  "poki: game.js has the POKI-2 ads hooks");
ok(game.includes("function lbOver(){}") && !/FRLB\.(load|gameOver)|\/api\//.test(game), "poki: leaderboard kept out (stub only, no /api/)");

const urls = [];
for (const f of files) {
  const t = readFileSync(join(POKI, f), "utf8");
  for (const m of t.matchAll(/https?:\/\/[^\s"'`<>)\\,;]+/g)) if (!ALLOWED_URLS.has(m[0])) urls.push(`${f}: ${m[0]}`);
}
const uniq = [...new Set(urls)];
if (!uniq.length) ok(true, "poki: no external URLs except the Poki SDK");
else if (process.env.POKI_URLS_STRICT === "1") ok(false, `poki: external URLs besides the Poki SDK:\n    ${uniq.join("\n    ")}`);
else warn(`poki: ${uniq.length} external URL(s) besides the Poki SDK (warning until POKI-4 strips them):\n    ${uniq.join("\n    ")}`);

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
  const probe = (build) => new Function(`"use strict";var window={FR_BUILD:"${build}"};var SPT=10,BGT=6;` +
    ["06b-sparks.js", "06c-sparks-debug.js", "08c-sparks-sfx.js", "14b-upgrades-ui.js"].map(body).join("\n") +
    `;skLoad();skSave();skEarn(5);sfxSpark();sfxBuy("m",1);upShow();upHide();
    return {SKON,poki:isPoki(),buy:skBuy("m"),can:skCanBuy("m"),cost:skCost("m"),lv:skLv("m"),b:sk.b,run:skRun,
      g:[skSPT(),skBGT(),skMagR(),skPuF(),skInvShield(),skCores()]}`)();
  const w = probe("site"), k = probe("poki");
  ok(w.SKON === true && w.poki === false && k.poki === true && k.SKON === true, "sparks: SKON on for web (WEB_SPARKS) and Poki; isPoki() = window.FR_BUILD==='poki'");
  ok(!w.buy && !w.can && w.cost === null && w.lv === 0 && w.b === 0 && w.run === 0 && w.g.join() === "10,6,0,1,1.2,0",
     `sparks: stubs inert (no buy/earn; getters = base ${w.g.join("/")})`);
  ok(!/Math\.random|localStorage|lss\(|addEventListener/.test(["06b-sparks.js", "06c-sparks-debug.js", "08c-sparks-sfx.js", "14b-upgrades-ui.js"].map(body).join("")),
     "sparks: scaffold makes no Math.random/storage/listener calls");
  const pg = files.includes("game.js") ? readFileSync(join(POKI, "game.js"), "utf8") : "";
  ok(!/\bPLATFORM\b/.test(pg) && !/\bPLATFORM\b/.test(site), "sparks: no PLATFORM variable in either build");
  ok(!pg.includes(body("06c-sparks-debug.js")) && pg.includes("function skEarn(") && pg.includes("function upShow("),
     "poki: 06c-sparks-debug.js dropped, the other sparks fragments kept");
  ok(files.every((f) => !readFileSync(join(POKI, f), "utf8").includes("SKDBG")), "poki: no SKDBG debug marker in dist/poki");
  const { buildPokiScript, POKI_EXCLUDE } = await import(pathToFileURL(join(ROOT, "src/client/poki/script.mjs")).href);
  let guard = false;
  try { buildPokiScript(buildScript({ exclude: POKI_EXCLUDE }).replace("function upShow(){}", "function upShow(){/*SKDBG*/}")) } catch (e) { guard = /SKDBG/.test(e.message) }
  ok(guard && POKI_EXCLUDE.includes("06c-sparks-debug.js"), "poki: script.mjs drops 06c and its SKDBG guard fails the build on the marker");
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

if (failed) { console.error(`BUILD TEST FAILED (${failed})`); process.exit(1); }
console.log("BUILD TEST PASSED");
