// Poki build target: static dist/poki/ (index.html + game.js + style.css + ads-adapter.js) and dist/forge-runner-poki.zip
// (index.html at the zip root). Relative paths only, no server/Lambda/API code, so it runs from any (sub)path.
// Run by `npm run build` (after the site/Lambda build) or on its own with `npm run build:poki`.
// The page is client/shell.html with the Poki head (client/build-flags-poki.mjs: FR_BUILD='poki', FR_ADS_CONFIG, Poki SDK,
// adapter), WITHOUT the canonical link and og:*/twitter:* meta, and the CSS/game script as files instead of inline.
// The game script is the site's SCRIPT plus the Poki-only layer from client/poki/script.mjs (POKI-3), minus the web-only code
// (POKI-4 strip: beacon/ids/UTM, ?demo/?pu, name prompt, own-site links, leaderboard); the site build is unaffected.
// Any http(s) URL in dist/poki other than the Poki SDK fails the build.
import { mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const POKI_DIR = join(ROOT, "dist/poki");
export const POKI_ZIP = join(ROOT, "dist/forge-runner-poki.zip");

function replaceOnce(s, from, to, what) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`build-poki: expected exactly 1 ${what} in shell.html, found ${n}`);
  return s.replace(from, () => to);
}

export async function buildPoki() {
  const src = (p) => join(ROOT, "src/client", p);
  // Poki game script = the site SCRIPT + Mobile's Poki layer, minus the leaderboard and the beacon (client/poki/script.mjs)
  const { POKI_SCRIPT, buildPokiAdapter, externalUrls } = await import(pathToFileURL(src("poki/script.mjs")).href);
  const { POKI_HEAD } = await import(pathToFileURL(src("build-flags-poki.mjs")).href);
  // POKI-4: the Poki CSS drops the name-prompt (#np) rules (no name prompt on Poki).
  const SITE_STYLE = readFileSync(src("style.css"), "utf8");
  const STYLE = SITE_STYLE.split("\n").filter((l) => !l.startsWith("#np")).join("\n");
  if (SITE_STYLE.split("\n").length - STYLE.split("\n").length !== 3) throw new Error("build-poki: expected 3 #np rules in style.css");
  let html = readFileSync(src("shell.html"), "utf8");

  // Portal page: no canonical / og:* / twitter:* (they point at the own site).
  const before = html.split("\n").length;
  let npLines = 0;
  html = html.split("\n").filter((l) => !/^<link rel="canonical"|^<meta (property="og:|name="twitter:)/.test(l)).join("\n");
  if (before - html.split("\n").length < 2) throw new Error("build-poki: canonical/og/twitter lines not found in shell.html");
  // POKI-4: no player-name prompt (challenges are score only on Poki).
  html = html.replace(/^<div id="np"[^\n]*\n/m, (m) => { npLines++; return ""; });
  if (npLines !== 1) throw new Error(`build-poki: expected exactly 1 name-prompt (#np) line in shell.html, found ${npLines}`);
  html = replaceOnce(html, "{{HEAD}}", POKI_HEAD, "{{HEAD}}");
  html = replaceOnce(html, "<style>\n{{STYLE}}</style>", '<link rel="stylesheet" href="style.css">', "<style>{{STYLE}}</style>");
  html = replaceOnce(html, "<script>{{SCRIPT}}</script>", '<script src="game.js"></script>', "<script>{{SCRIPT}}</script>");
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("build-poki: unfilled placeholder: " + html.match(/\{\{[A-Z_]+\}\}/)[0]);

  // Poki copy of the ads adapter: no other backends' SDK URLs or doc links (client/poki/script.mjs buildPokiAdapter).
  const ADAPTER = buildPokiAdapter(readFileSync(src("ads-adapter.js"), "utf8"));
  const OUT = { "index.html": html, "style.css": STYLE, "game.js": POKI_SCRIPT, "ads-adapter.js": ADAPTER };
  // HARD FAIL (POKI-4): no http(s) URL in dist/poki but the Poki SDK (POKI_ALLOWED_URLS). Poki blocks external requests and
  // outgoing links; the own-site link, trackers and other ad SDKs must never ship in the Poki build.
  const bad = externalUrls(Object.entries(OUT));
  if (bad.length) throw new Error(`build-poki: external URL(s) besides the Poki SDK:\n  ${bad.join("\n  ")}`);

  rmSync(POKI_DIR, { recursive: true, force: true });
  rmSync(POKI_ZIP, { force: true });
  mkdirSync(POKI_DIR, { recursive: true });
  for (const [f, t] of Object.entries(OUT)) writeFileSync(join(POKI_DIR, f), t);

  // Zip with index.html at the root (python3 zipfile, as build.mjs does for the Lambda zip).
  const files = readdirSync(POKI_DIR).sort();
  execFileSync("python3", ["-c",
    "import zipfile,sys,os; z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)\n" +
    "for f in sys.argv[3:]: z.write(os.path.join(sys.argv[2],f),f)\nz.close()",
    POKI_ZIP, POKI_DIR, ...files], { stdio: "inherit", windowsHide: true });
  console.log(`build: wrote dist/poki/ (${files.join(", ")}) and dist/forge-runner-poki.zip`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPoki();
