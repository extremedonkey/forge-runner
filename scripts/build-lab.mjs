// LAB builds: dist/lab/<variant>/index.html for each LABS entry (enemies-v2, orecart), each ONE static self-contained page (CSS + script inline, no asset paths, works under
// any subpath). Ported from Dev's lab/enemies prototype build (4799cd1), adapted to main.
// Script = the site fragments minus the leaderboard (15) and the ?sk= debug switch (06c), asserted text edits (no beacons/ids,
// own high-score key, sparks off so the real sparks save is never touched), then the lab layer (lab/enemies-v2.js) right before
// boot. HARD FAIL: no fetch/sendBeacon/XHR, /api/ or ?event= string may reach the page. noindex + a LAB PROTOTYPE tag.
// The PR preview copies dist/lab/ to https://preview.forgerunnergames.com/pr-<n>/lab/ (scripts/build-pr-preview.mjs).
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

export const LAB_VARIANT = "enemies-v2";
export const LAB_TITLE = "Forge Enemies v2";
// every lab page: [variant (= src/client/lab/<variant>.js and the dist/lab/<variant>/ folder), title]
export const LABS = [[LAB_VARIANT, LAB_TITLE], ["orecart", "Ore Cart"]];
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => join(ROOT, "src/client", p);

function once(s, from, to, what) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`build-lab: expected exactly 1 match for ${what}, found ${n}`);
  return s.replace(from, () => to);
}

export async function labScript(LAB_VARIANT = "enemies-v2") {
  const { buildScript } = await import(pathToFileURL(src("index.mjs")).href);
  const LOOP = (await import(pathToFileURL(src("16-loop.js")).href)).default.slice(1, -1);
  const LAYER = (await import(pathToFileURL(src(`lab/${LAB_VARIANT}.js`)).href)).default.slice(1, -1);
  if (LAYER.includes("`")) throw new Error("build-lab: no backticks in lab fragments");
  let s = buildScript({ exclude: ["06c-sparks-debug.js", "15-leaderboard.js"] });
  const i = s.indexOf("function track(ev,score,dur,x){"), j = s.indexOf("\nvar MONO=", i);
  if (i < 0 || j < 0) throw new Error("build-lab: track() markers not found");
  s = s.slice(0, i) + "function track(){}" + s.slice(j);
  const EDITS = [
    ['var KEY="forge-runner-hi";', `var KEY="forge-runner-lab-${LAB_VARIANT}-hi";`, "high-score key"],
    ["var WEB_SPARKS=true;", "var WEB_SPARKS=false;", "sparks off"],
    ["if(!skDebug)\nif(!demo&&!tpu){", "if(false){", "no player id / UTM"],
    [LOOP, "/* lab: no leaderboard */\nfunction lbDraw(){}\nfunction lbOver(){}\n" + LAYER + "\n" + LOOP.replace('track("visit");\n', ""), "lab layer before boot"],
  ];
  for (const [a, b, w] of EDITS) s = once(s, a, b, w);
  for (const m of ["sendBeacon", "fetch(", "XMLHttpRequest", "/api/", "?event="]) {
    if (s.includes(m)) throw new Error(`build-lab: forbidden marker ${JSON.stringify(m)} in the lab script`);
  }
  if (s.includes("${")) throw new Error("build-lab: unfilled ${...} in script");
  return s;
}

export async function buildLab() {
  for (const [v, t] of LABS) await buildOne(v, t);
}
async function buildOne(LAB_VARIANT, LAB_TITLE) {
  const s = await labScript(LAB_VARIANT);
  const { SITE_HEAD } = await import(pathToFileURL(src("build-flags.mjs")).href);
  const { PUBLIC_URL } = await import(pathToFileURL(join(ROOT, "src/server/config.mjs")).href);
  let html = readFileSync(src("shell.html"), "utf8");
  html = html.split("\n").filter((l) => !/^<link rel="canonical"|^<meta (property="og:|name="twitter:)/.test(l)).join("\n");
  const HEAD = [SITE_HEAD, '<meta name="robots" content="noindex,nofollow">', `<script>window.FR_LAB='${LAB_VARIANT}'</script>`].join("\n");
  html = once(html, "{{HEAD}}", HEAD, "{{HEAD}}");
  html = once(html, "<title>Forge Runner</title>", `<title>Forge Runner LAB: ${LAB_TITLE}</title>`, "title");
  const STYLE = readFileSync(src("style.css"), "utf8") +
    "#sh,#np{display:none!important}\n" +
    "#labtag{position:fixed;left:8px;bottom:8px;z-index:9;padding:3px 8px;border:1px solid #f97316;border-radius:6px;background:rgba(5,7,13,.75);color:#fdba74;font:700 11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;pointer-events:none}\n";
  html = once(html, "{{STYLE}}", STYLE, "{{STYLE}}");
  html = once(html, '<div id="toast"', `<div id="labtag">LAB PROTOTYPE · ${LAB_TITLE.toUpperCase()}</div>\n<div id="toast"`, "lab tag");
  html = once(html, "{{SCRIPT}}", s, "{{SCRIPT}}");
  html = html.replace(/\{\{PUBLIC_URL\}\}/g, PUBLIC_URL);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("build-lab: unfilled placeholder");
  const out = join(ROOT, "dist/lab", LAB_VARIANT);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
  console.log(`build: wrote dist/lab/${LAB_VARIANT}/index.html (${html.length} bytes)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildLab();
