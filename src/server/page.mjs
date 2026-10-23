// Renders the game page: client/shell.html with the CSS, the client script and PUBLIC_URL filled in.
// The page is constant per deploy, so it is rendered once per container.
import SHELL from "../client/shell.html";
import STYLE from "../client/style.css";
import { SCRIPT } from "../client/index.mjs";
import { PUBLIC_URL } from "./config.mjs";
import { SITE_HEAD } from "../client/build-flags.mjs";

// HEAD = the build-target flags (site: window.FR_BUILD='site' only; no Poki SDK, no ads). The Poki build is scripts/build-poki.mjs.
const fill = (tpl, vars) => tpl.replace(/\{\{(STYLE|SCRIPT|PUBLIC_URL|HEAD)\}\}/g, (_, k) => vars[k]);
let html;
export function renderHtml() {
  return (html ??= fill(SHELL, { STYLE, SCRIPT, PUBLIC_URL, HEAD: SITE_HEAD }));
}
