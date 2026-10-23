// Static per-PR preview (run after `npm run build`): writes dist/pr-preview/ for
// https://preview.forgerunnergames.com/pr-<n>/ (S3 prefix pr-<n>/, uploaded by .github/workflows/pr.yml).
//   index.html  = the game page rendered by the built Lambda handler (GET /), plus <meta name="robots" content="noindex, nofollow">
//   poki/       = copy of dist/poki/ (the static Poki build)
// The page is a static snapshot: same-path beacons (POST ?event=...) get 403 from S3 and are harmless; /api/* goes to the preview Lambda.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const OUT = "dist/pr-preview";
if (!existsSync("dist/index.mjs") || !existsSync("dist/poki/index.html")) {
  console.error("build-pr-preview: run `npm run build` first");
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const { handler } = await import(pathToFileURL(resolve("dist/index.mjs")).href + `?t=${Date.now()}`);
const res = await handler({ requestContext: { http: { method: "GET" } }, queryStringParameters: {} });
if (res?.statusCode !== 200 || !/<canvas/i.test(res.body || "")) {
  console.error("build-pr-preview: handler did not render the game page", res?.statusCode);
  process.exit(1);
}
let html = res.body;
if (!/name=["']robots["']/i.test(html)) html = html.replace(/<head([^>]*)>/i, '<head$1><meta name="robots" content="noindex, nofollow">');
writeFileSync(`${OUT}/index.html`, html);
cpSync("dist/poki", `${OUT}/poki`, { recursive: true });
if (existsSync("dist/lab")) cpSync("dist/lab", `${OUT}/lab`, { recursive: true }); // lab builds -> /pr-<n>/lab/<variant>/
console.log(`build-pr-preview: wrote ${OUT}/index.html (${html.length} bytes) and ${OUT}/poki/`);
