// Build: produces dist/index.mjs and dist/function.zip (the Lambda package), then the static Poki build
// (dist/poki/ + dist/forge-runner-poki.zip, see scripts/build-poki.mjs). The Lambda output does not depend on the Poki build.
// Today: copies ./index.mjs. When src/index.mjs exists (Forge Runner Dev's module split),
// it bundles src/ with esbuild into one dist/index.mjs instead. No other change needed.
import { existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const DIST = "dist";
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);

if (existsSync("src/index.mjs")) {
  const { build } = await import("esbuild"); // npm i -D esbuild (added with the split)
  await build({
    entryPoints: ["src/index.mjs"],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    outfile: `${DIST}/index.mjs`,
    loader: { ".html": "text", ".css": "text", ".txt": "text" },
    legalComments: "none",
    logLevel: "info",
  });
  console.log("build: bundled src/ with esbuild -> dist/index.mjs");
} else {
  copyFileSync("index.mjs", `${DIST}/index.mjs`);
  console.log("build: copied index.mjs -> dist/index.mjs");
}

// Sanity check: the handler must render the game page.
const { handler } = await import(pathToFileURL(resolve(DIST, "index.mjs")).href + `?t=${Date.now()}`);
const res = await handler({ requestContext: { http: { method: "GET" } }, queryStringParameters: {} });
if (res?.statusCode !== 200 || !/<canvas/i.test(res.body || "")) {
  console.error("build: handler sanity check FAILED", res?.statusCode);
  process.exit(1);
}
console.log(`build: handler OK (${res.body.length} bytes HTML)`);

// Package (python3 zipfile: present on the box and on GitHub's ubuntu runners).
execFileSync("python3", ["-c",
  "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED); z.write(sys.argv[2],'index.mjs'); z.close()",
  `${DIST}/function.zip`, `${DIST}/index.mjs`], { stdio: "inherit" });
console.log("build: wrote dist/function.zip");

// Poki build target (static, separate from the Lambda package above).
const { buildPoki } = await import("./build-poki.mjs");
await buildPoki();

// LAB builds (ENEMIES v2, THE CRUSHER): dist/lab/<variant>/index.html, see scripts/build-lab.mjs (LABS). Not part of the Lambda or Poki output.
const { buildLab } = await import("./build-lab.mjs");
await buildLab();
