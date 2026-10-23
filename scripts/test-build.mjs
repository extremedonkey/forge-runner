// Build test: npm test (after npm run build). Checks the site (Lambda) build and the Poki build target.
//   node scripts/test-build.mjs [--baseline <git-ref>]
// --baseline: also builds <git-ref> (e.g. origin/main before the Poki target landed) in a temporary git worktree and asserts the
// site HTML is byte-identical apart from the one window.FR_BUILD='site' line. One-off check for build-target PRs, not run in CI.
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
ok(!/poki/i.test(site), "site: no Poki SDK / no 'poki' anywhere in the page");
ok(!site.includes("FR_ADS_CONFIG") && !site.includes("FRAds"), "site: ads OFF (no FR_ADS_CONFIG, no ads adapter)");
ok(!/FR_ADS_CONFIG|FRAds|poki-sdk/.test(readFileSync(join(ROOT, "dist/index.mjs"), "utf8")), "site: Lambda bundle has no adapter/SDK code");

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
