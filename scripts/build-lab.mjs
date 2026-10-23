// LAB build (lab/* branches only, never merged to main): a throwaway gameplay prototype as ONE static page,
// dist/lab/<variant>/index.html (CSS + script inline, no external assets, relative/no paths, so it works under any subpath).
// Game script = the site fragments minus the leaderboard (15) and the ?sk= debug switch (06c), a few asserted text edits
// (no beacons/ids, own high-score key, sparks off), then the lab layer (lab/common.js + lab/<variant>.js) right before boot.
// HARD FAIL: no fetch/sendBeacon/XHR or /api/ string may reach the page (scores never get submitted).
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

export const LAB_VARIANT = "enemies";
export const LAB_TITLE = "Forge Enemies";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => join(ROOT, "src/client", p);

function once(s, from, to, what) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`build-lab: expected exactly 1 match for ${what}, found ${n}`);
  return s.replace(from, () => to);
}

export async function buildLab() {
  const { buildScript } = await import(pathToFileURL(src("index.mjs")).href);
  const LOOP = (await import(pathToFileURL(src("16-loop.js")).href)).default.slice(1, -1);
  const { SITE_HEAD } = await import(pathToFileURL(src("build-flags.mjs")).href);
  const { PUBLIC_URL } = await import(pathToFileURL(join(ROOT, "src/server/config.mjs")).href);
  const layer = readFileSync(src("lab/common.js"), "utf8") + "\n" + readFileSync(src(`lab/${LAB_VARIANT}.js`), "utf8");
  if (layer.includes("`")) throw new Error("build-lab: no backticks in lab fragments");

  let s = buildScript({ exclude: ["06c-sparks-debug.js", "15-leaderboard.js"] });
  const EDITS = [
    ['var KEY="forge-runner-hi";', `var KEY="forge-runner-lab-${LAB_VARIANT}-hi";`, "high-score key"],
    ["var WEB_SPARKS=true;", "var WEB_SPARKS=false;", "sparks off"],
    ["if(!skDebug)\nif(!demo&&!tpu){", "if(false){", "no player id / UTM"],
    ['  var b=JSON.stringify(d),u=location.pathname+"?event="+ev;\n', "", "beacon url"],
    ['  try{if(navigator.sendBeacon&&navigator.sendBeacon(u,b))return}catch(e){}\n', "", "beacon send"],
    ['  try{fetch(u,{method:"POST",body:b,keepalive:true,credentials:"omit"}).catch(function(){})}catch(e){}\n', "", "beacon fetch"],
    ["function track(ev,score,dur){\n", "function track(ev,score,dur){\n  return;\n", "track() no-op"],
    ["function start(){\n  startMusic();", "function start(){\n  labStart();startMusic();", "start() lab hook"],
    ["function drawHud(){", "function drawHud(){labHud();drawHud_site()}\nfunction drawHud_site(){", "drawHud() lab hook"],
    [LOOP, layer + "\n" + LOOP.replace('track("visit");\n', ""), "lab layer before boot"],
  ];
  for (const [a, b, w] of EDITS) s = once(s, a, b, w);
  for (const m of ["sendBeacon", "fetch(", "XMLHttpRequest", "/api/", "?event="]) {
    if (s.includes(m)) throw new Error(`build-lab: forbidden marker ${JSON.stringify(m)} in the lab script`);
  }

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
  if (s.includes("${")) throw new Error("build-lab: unfilled ${...} in script");

  const out = join(ROOT, "dist/lab", LAB_VARIANT);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
  console.log(`build: wrote dist/lab/${LAB_VARIANT}/index.html (${html.length} bytes)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildLab();
