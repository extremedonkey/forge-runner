// Poki build target: static dist/poki/ (index.html + game.js + style.css + ads-adapter.js) and dist/forge-runner-poki.zip
// (index.html at the zip root). Relative paths only, no server/Lambda/API code, so it runs from any (sub)path.
// Run by `npm run build` (after the site/Lambda build) or on its own with `npm run build:poki`.
// The page is client/shell.html with the Poki head (client/build-flags-poki.mjs: FR_BUILD='poki', FR_ADS_CONFIG, Poki SDK,
// adapter), WITHOUT the canonical link and og:*/twitter:* meta, and the CSS/game script as files instead of inline.
// The game script is the site's SCRIPT plus the Poki-only layer from client/poki/script.mjs (POKI-3); the site build is unaffected.
import { mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
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
  const { POKI_SCRIPT } = await import(pathToFileURL(src("poki/script.mjs")).href);
  const { POKI_HEAD } = await import(pathToFileURL(src("build-flags-poki.mjs")).href);
  const STYLE = readFileSync(src("style.css"), "utf8");
  let html = readFileSync(src("shell.html"), "utf8");

  // Portal page: no canonical / og:* / twitter:* (they point at the own site).
  const before = html.split("\n").length;
  html = html.split("\n").filter((l) => !/^<link rel="canonical"|^<meta (property="og:|name="twitter:)/.test(l)).join("\n");
  if (before - html.split("\n").length < 2) throw new Error("build-poki: canonical/og/twitter lines not found in shell.html");
  html = replaceOnce(html, "{{HEAD}}", POKI_HEAD, "{{HEAD}}");
  html = replaceOnce(html, "<style>\n{{STYLE}}</style>", '<link rel="stylesheet" href="style.css">', "<style>{{STYLE}}</style>");
  html = replaceOnce(html, "<script>{{SCRIPT}}</script>", '<script src="game.js"></script>', "<script>{{SCRIPT}}</script>");
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("build-poki: unfilled placeholder: " + html.match(/\{\{[A-Z_]+\}\}/)[0]);

  rmSync(POKI_DIR, { recursive: true, force: true });
  rmSync(POKI_ZIP, { force: true });
  mkdirSync(POKI_DIR, { recursive: true });
  writeFileSync(join(POKI_DIR, "index.html"), html);
  writeFileSync(join(POKI_DIR, "style.css"), STYLE);
  writeFileSync(join(POKI_DIR, "game.js"), POKI_SCRIPT);
  copyFileSync(src("ads-adapter.js"), join(POKI_DIR, "ads-adapter.js"));

  // Zip with index.html at the root (python3 zipfile, as build.mjs does for the Lambda zip).
  const files = readdirSync(POKI_DIR).sort();
  execFileSync("python3", ["-c",
    "import zipfile,sys,os; z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)\n" +
    "for f in sys.argv[3:]: z.write(os.path.join(sys.argv[2],f),f)\nz.close()",
    POKI_ZIP, POKI_DIR, ...files], { stdio: "inherit" });
  console.log(`build: wrote dist/poki/ (${files.join(", ")}) and dist/forge-runner-poki.zip`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPoki();
