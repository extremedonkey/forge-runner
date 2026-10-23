// Renders the game page: client/shell.html with the CSS, the client script and PUBLIC_URL filled in.
// The page is constant per deploy, so it is rendered once per container.
import SHELL from "../client/shell.html";
import STYLE from "../client/style.css";
import { SCRIPT } from "../client/index.mjs";
import { PUBLIC_URL } from "./config.mjs";

const fill = (tpl, vars) => tpl.replace(/\{\{(STYLE|SCRIPT|PUBLIC_URL)\}\}/g, (_, k) => vars[k]);
let html;
export function renderHtml() {
  return (html ??= fill(SHELL, { STYLE, SCRIPT, PUBLIC_URL }));
}
