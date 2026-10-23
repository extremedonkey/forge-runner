// BIG AIR label browser test (Playtest #80 retest, item 6): the label's REAL on-screen size and the reduced-motion fallback.
// Usage: npm run build && node scripts/test-bigair-browser.mjs   (needs `npx playwright install chromium`)
// The Poki build's game.js is served with a test-only probe before "var HILLS_ON=true;" (the shipped file is untouched). Real fonts
// (no glyph stubs), seeded Math.random and a test-driven clock / rAF. The probe starts a run on flat ground (no entities), lands a
// crest launch 130 px high through the real hlLand() (pays +2, "BIG AIR +2*"), draws frames and diffs them against the same frame
// without the label. The label's fill (#fde047) pixels give the on-screen ink box; device px -> CSS px with the canvas's
// getBoundingClientRect(). Checks, at 390x844 (DPR 3, touch) normal and reduced-motion, plus 1280x800 normal:
//  - font >= 15 CSS px on the phone (txt() px x K / canvas-to-CSS scale), cap height of the drawn glyphs >= 0.6 x 15 CSS px
//  - reduced motion: a label is drawn, and it is static (same ink box and colour over 0.5 s: no rise, no fade)
//  - normal motion: it still rises (ink box moves up over 0.5 s)
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, newContext, ROOT } from "./lib/browser.mjs";

const CLOCK = `(() => {
  let s = 7; Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 1000; performance.now = () => now; let q = [], id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((e) => e[0] !== i); };
  window.__frStep = (n) => { for (let i = 0; i < n; i++) { now += 1000 / 60; const c = q; q = []; for (const e of c) e[1](now); } return now; };
  try { localStorage.setItem("fr_snd2", "0"); } catch (e) {}
})();`;
const PROBE = String.raw`var __ba={txt:[]};var __baT=txt;txt=function(s,x,y,px){if(typeof s==="string"&&s.indexOf("BIG AIR")===0)__ba.txt.push(px*K);return __baT.apply(null,arguments)};
window.__ba={
  go:function(){start();puNext=1e9;nextGap=1e9;inv=1e9;ents=[];py=0;vy=0;shake=0;update(1/240);
    hlCL=1;hlPk=hlB()+130;skLbT=0;hlLand(hlB());return {lbT:skLbT,s:skLbS,rm:rm(),hl:hlOn}},
  frame:function(lb){var t=skLbT;if(!lb)skLbT=0;draw();skLbT=t;var d=ctx.getImageData(0,0,cv.width,cv.height).data;return d},
  ink:function(){var a=window.__ba.frame(false),b=window.__ba.frame(true),W0=cv.width,H0=cv.height,x0=1e9,y0=1e9,x1=-1,y1=-1,n=0,r=0,g=0,bl=0;
    for(var y=0;y<H0;y++)for(var x=0;x<W0;x++){var i=(y*W0+x)*4,dd=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      if(dd>60&&b[i]>200&&b[i+1]>185&&b[i+2]<150){n++;r+=b[i];g+=b[i+1];bl+=b[i+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
    var R=cv.getBoundingClientRect();__ba.txt=[];window.__ba.frame(true);
    return {n:n,bb:[x0,y0,x1+1,y1+1],css:R.width/cv.width,col:n?[r/n,g/n,bl/n].map(Math.round):null,fontDev:__ba.txt[0]||0,lbT:skLbT,dpr:devicePixelRatio}},
  adv:function(n){for(var i=0;i<n;i++){inv=1e9;ents=[];update(1/240)}return skLbT}};
`;
const GAME = readFileSync(join(ROOT, "dist/poki/game.js"), "utf8");
if (!GAME.includes("var HILLS_ON=true;")) throw new Error("probe anchor missing");
const PROBED = GAME.replace("var HILLS_ON=true;", PROBE + "var HILLS_ON=true;");
const CASES = [
  { name: "390x844", width: 390, height: 844, touch: true, rm: false, minFont: 15 },
  { name: "390x844 reduced-motion", width: 390, height: 844, touch: true, rm: true, minFont: 15 },
  { name: "1280x800", width: 1280, height: 800, touch: false, rm: false, minFont: 15 },
];
const srv = await serveBuilds(), browser = await chromium.launch(), fails = [];
try {
  for (const c of CASES) {
    const { ctx, page, errs } = await newContext(browser, c, { init: [CLOCK] });
    if (c.rm) await page.emulateMedia({ reducedMotion: "reduce" });
    await ctx.route("**/game.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: PROBED }));
    await page.goto(srv.poki, { waitUntil: "load" }); await page.evaluate(() => window.__frStep(5));
    const g = await page.evaluate(() => window.__ba.go());
    const a = await page.evaluate(() => window.__ba.ink());
    await page.evaluate(() => window.__ba.adv(120));   // 0.5 s
    const b = await page.evaluate(() => window.__ba.ink());
    const font = a.fontDev * a.css, cap = (a.bb[3] - a.bb[1]) * a.css, wid = (a.bb[2] - a.bb[0]) * a.css, rise = (a.bb[1] - b.bb[1]) * a.css;
    const line = `${c.name}: "${g.s}" rm ${g.rm}, font ${font.toFixed(1)} CSS px, drawn ink ${wid.toFixed(1)} x ${cap.toFixed(1)} CSS px (${a.n} px), after 0.5 s: rise ${rise.toFixed(1)} CSS px, colour ${a.col} -> ${b.col}`;
    const f = [];
    if (!(g.lbT > 0) || a.n < 20) f.push("no label drawn");
    if (g.rm !== c.rm) f.push("reduced-motion emulation not active");
    if (!(font >= c.minFont)) f.push(`font ${font.toFixed(1)} < ${c.minFont} CSS px`);
    if (!(cap >= 0.6 * c.minFont)) f.push(`cap height ${cap.toFixed(1)} < ${(0.6 * c.minFont).toFixed(1)} CSS px`);
    if (c.rm) { if (b.n < 20 || Math.abs(rise) > 0.5 || Math.abs(b.bb[3] - a.bb[3]) > 1 || b.col.some((v, i) => Math.abs(v - a.col[i]) > 6)) f.push("reduced-motion label not static") }
    else if (!(rise > 2)) f.push("label does not rise");
    if (errs.length) f.push(errs.join("; "));
    if (f.length) fails.push(line + " -- " + f.join(", ")); else console.log("ok   " + line);
    await ctx.close();
  }
} finally { await browser.close(); await srv.close() }
if (fails.length) { console.error(fails.join("\n") + "\nBIG AIR BROWSER TEST FAILED"); process.exit(1) }
console.log("BIG AIR BROWSER TEST PASSED");
