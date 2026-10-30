// BIG AIR label browser test (Playtest #80 retest, item 6; portrait clip): the label's REAL on-screen size, the reduced-motion
// fallback, and that the glyphs stay inside the canvas. Usage: npm run build && node scripts/test-bigair-browser.mjs
// (needs `npx playwright install chromium`)
// The Poki build's game.js is served with a test-only probe before "var HILLS_ON=true;" (the shipped file is untouched). Real fonts
// (no glyph stubs), seeded Math.random and a test-driven clock / rAF. The probe starts a run on flat ground (no entities), lands a
// crest launch 130 px high through the real hlLand() (pays +2, "BIG AIR +2*"), draws frames and diffs them against the same frame
// without the label. The label's fill (#fde047) pixels give the on-screen ink box; device px -> CSS px with the canvas's
// getBoundingClientRect(). A second draw parks the same string at mid-screen in the sky: its ink width is the full unclipped
// string. The cart-anchored ink must match that width (a clipped "B", or a cut through "SHIELD RE-FORGED", comes out short)
// and sit inside the canvas. Checks:
//  - 390x844 and 1280x800: font >= 15 CSS px, cap height >= 0.6 x 15 CSS px
//  - 360x640 and 844x390: on-screen (font scales with the screen; the 15 CSS px bar is the 390x844 playtest)
//  - reduced motion: a label is drawn, and it is static (same ink box and colour over 0.5 s: no rise, no fade)
//  - normal motion: it still rises (ink box moves up over 0.5 s)
//  - portrait: "BIG AIR +2*" and "SHIELD RE-FORGED" ink is as wide as the unclipped string and inside the canvas
//  - landscape/desktop: same, and the ink stays on the cart anchor (mid-screen reference is wider only if we clipped)
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
const PROBE = String.raw`var __ba={txt:[]};var __baT=txt;var __baRef=0;
txt=function(s,x,y,px,c,al,mo,bo,st,gl,id,edge){if(__baRef&&typeof s==="string"&&(s.indexOf("BIG AIR")===0||s.indexOf("SHIELD")===0)){x=XO+VW/2;y=-OY+70}if(typeof s==="string"&&s.indexOf("BIG AIR")===0)__ba.txt.push(px*K);return __baT(s,x,y,px,c,al,mo,bo,st,gl,id,edge)};
window.__ba={
  go:function(){start();puNext=1e9;nextGap=1e9;inv=1e9;ents=[];py=0;vy=0;shake=0;update(1/240);
    hlCL=1;hlPk=hlB()+130;skLbT=0;hlLand(hlB());return {lbT:skLbT,s:skLbS,rm:rm(),hl:hlOn}},
  frame:function(lb){var t=skLbT;if(!lb)skLbT=0;draw();skLbT=t;return ctx.getImageData(0,0,cv.width,cv.height).data},
  mask:function(a,b){var W0=cv.width,H0=cv.height,x0=1e9,y0=1e9,x1=-1,y1=-1,n=0,r=0,g=0,bl=0;
    for(var y=0;y<H0;y++)for(var x=0;x<W0;x++){var i=(y*W0+x)*4,dd=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
      if(dd>60&&b[i]>200&&b[i+1]>185&&b[i+2]<150){n++;r+=b[i];g+=b[i+1];bl+=b[i+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
    return {n:n,bb:[x0,y0,x1+1,y1+1],w:n?x1+1-x0:0,col:n?[r/n,g/n,bl/n].map(Math.round):null}},
  ink:function(){var m=window.__ba.mask(window.__ba.frame(false),window.__ba.frame(true));
    __baRef=1;var r=window.__ba.mask(window.__ba.frame(false),window.__ba.frame(true));__baRef=0;
    var R=cv.getBoundingClientRect();__ba.txt=[];window.__ba.frame(true);
    return {n:m.n,bb:m.bb,actW:m.w,refW:r.w,css:R.width/cv.width,col:m.col,fontDev:__ba.txt[0]||0,lbT:skLbT,dpr:devicePixelRatio,cw:cv.width,nat:PX+pW()/2+20,xo:XO,k:K,zm:ZM}},
  wide:function(){var s=skLbS,c=skLbC,t=skLbT;skLbS="SHIELD RE-FORGED";skLbC="#fde047";skLbT=1.1;var o=window.__ba.ink();skLbS=s;skLbC=c;skLbT=t;return o},
  adv:function(n){for(var i=0;i<n;i++){inv=1e9;ents=[];update(1/240)}return skLbT}};
`;
const GAME = readFileSync(join(ROOT, "dist/poki/game.js"), "utf8");
if (!GAME.includes("var HILLS_ON=true;")) throw new Error("probe anchor missing");
const PROBED = GAME.replace("var HILLS_ON=true;", PROBE + "var HILLS_ON=true;");
const CASES = [
  { name: "360x640", width: 360, height: 640, touch: true, rm: false, minFont: 0 },
  { name: "390x844", width: 390, height: 844, touch: true, rm: false, minFont: 15 },
  { name: "390x844 reduced-motion", width: 390, height: 844, touch: true, rm: true, minFont: 15 },
  { name: "844x390", width: 844, height: 390, touch: true, rm: false, minFont: 0 },
  { name: "1280x800", width: 1280, height: 800, touch: false, rm: false, minFont: 15 },
];
const srv = await serveBuilds(), browser = await chromium.launch(), fails = [];
try {
  for (const c of CASES) {
    const { ctx, page, errs } = await newContext(browser, c, { init: [CLOCK] });
    if (c.rm) await page.emulateMedia({ reducedMotion: "reduce" });
    await ctx.route("**/game.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: PROBED }));
    await page.goto(srv.poki + "?f30=0", {   // t454u: a flat start (no start hill under the buggy: the label is measured against a fixed anchor)
 waitUntil: "load" }); await page.evaluate(() => window.__frStep(5));
    const g = await page.evaluate(() => window.__ba.go());
    const a = await page.evaluate(() => window.__ba.ink());
    const wide = await page.evaluate(() => window.__ba.wide());
    await page.evaluate(() => window.__ba.adv(120));   // 0.5 s
    const b = await page.evaluate(() => window.__ba.ink());
    const font = a.fontDev * a.css, cap = (a.bb[3] - a.bb[1]) * a.css, wid = (a.bb[2] - a.bb[0]) * a.css, rise = (a.bb[1] - b.bb[1]) * a.css;
    const line = `${c.name}: "${g.s}" rm ${g.rm}, font ${font.toFixed(1)} CSS px, drawn ink ${wid.toFixed(1)} x ${cap.toFixed(1)} CSS px (${a.n} px, full ${a.refW} dev px), shield ink ${wide.actW}/${wide.refW}, after 0.5 s: rise ${rise.toFixed(1)} CSS px, colour ${a.col} -> ${b.col}`;
    const f = [];
    const inside = (box, cw) => box[0] >= 1 && box[2] <= cw - 1 && box[2] > box[0];
    const anchored = (box, nat, xo, k) => Math.abs((box[0] + box[2]) / 2 - (nat - xo) * k) <= 6;
    if (!(g.lbT > 0) || a.n < 20) f.push("no label drawn");
    if (g.rm !== c.rm) f.push("reduced-motion emulation not active");
    if (c.minFont && !(font >= c.minFont)) f.push(`font ${font.toFixed(1)} < ${c.minFont} CSS px`);
    if (c.minFont && !(cap >= 0.6 * c.minFont)) f.push(`cap height ${cap.toFixed(1)} < ${(0.6 * c.minFont).toFixed(1)} CSS px`);
    if (c.rm) { if (b.n < 20 || Math.abs(rise) > 0.5 || Math.abs(b.bb[3] - a.bb[3]) > 1 || b.col.some((v, i) => Math.abs(v - a.col[i]) > 6)) f.push("reduced-motion label not static") }
    else if (!(rise > 2)) f.push("label does not rise");
    if (!inside(a.bb, a.cw) || a.refW - a.actW > 2) f.push(`BIG AIR clipped (ink ${a.actW} vs full ${a.refW}, box ${a.bb} canvas ${a.cw})`);
    if (!inside(wide.bb, wide.cw) || wide.refW - wide.actW > 2) f.push(`SHIELD RE-FORGED clipped (ink ${wide.actW} vs full ${wide.refW}, box ${wide.bb} canvas ${wide.cw})`);
    if (!(a.zm > 1) && !anchored(a.bb, a.nat, a.xo, a.k)) f.push(`anchor moved off the cart (ink mid ${((a.bb[0] + a.bb[2]) / 2).toFixed(1)} vs ${(a.nat - a.xo) * a.k})`);
    if (!(wide.zm > 1) && !anchored(wide.bb, wide.nat, wide.xo, wide.k)) f.push("SHIELD anchor moved off the cart");
    if (errs.length) f.push(errs.join("; "));
    if (f.length) fails.push(line + " -- " + f.join(", ")); else console.log("ok   " + line);
    await ctx.close();
  }
} finally { await browser.close(); await srv.close() }
if (fails.length) { console.error(fails.join("\n") + "\nBIG AIR BROWSER TEST FAILED"); process.exit(1) }
console.log("BIG AIR BROWSER TEST PASSED");
