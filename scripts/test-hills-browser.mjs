// Hills browser pixel test (Mobile #80 review, blocker 1): on a crest, every entity sprite is drawn on the terrain where its
// hitbox is. Usage: npm run test:hills-browser (after npm run build; needs `npx playwright install chromium`).
// The Poki build's game.js is served with a tiny test-only probe injected before "var HILLS_ON=true;" (the shipped file is
// untouched). The probe draws drawEnts() of the same frozen frame on black with and without one entity (after a full draw()
// so every per-frame value is live), diffs the canvas pixels and returns the
// changed bbox next to the hitbox (13's ey: GY - hlEG(e) - bot - h) in device px (base(): K, SX-XO, SY+OY).
// Control: with hlEP stubbed out (the pre-fix behaviour: sprite on flat GY) the same check must FAIL.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveBuilds, newContext, VIEWPORTS, DETERMINISTIC_INIT, ROOT } from "./lib/browser.mjs";

const PROBE = String.raw`var hpEP=hlEP;window.__hp={go:function(t,noEP){
  hlEP=noEP?function(){hlEO=0;return false}:hpEP;
  start();shake=0;hlOn=true;puNext=1e9;var best=0,bs=0,ex=300;
  for(var s=hlD0+30000;s<hlD0+90000;s+=37){hsc=s;var h=hlH(ex);if(h>best&&Math.abs(hlSl(ex))<.02){best=h;bs=s}}
  hsc=bs;var D={p:[26,50,0],b:[30,21,0],k:[12,12,8],r:[22,22,0],f:[33,18,40]}[t],e={x:ex-D[0]/2,w:D[0],h:D[1],bot:D[2],t:t,v:0,vx:0,k:0};
  var fr=function(){draw();SX=SY=0;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#000";ctx.fillRect(0,0,cv.width,cv.height);base();drawEnts()};
  ents=[];fr();var W0=cv.width,H0=cv.height,a=ctx.getImageData(0,0,W0,H0).data;
  ents=[e];fr();var b=ctx.getImageData(0,0,W0,H0).data,x0=1e9,y0=1e9,x1=-1,y1=-1;
  for(var y=0;y<H0;y++)for(var x=0;x<W0;x++){var i=(y*W0+x)*4;if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  var ox=Math.round((SX-XO)*K),oy=Math.round((SY+OY)*K),hy=GY-hlEG(e)-e.bot-e.h;
  return {lift:hlEG(e),K:K,bb:[x0,y0,x1+1,y1+1],hb:[K*e.x+ox,K*hy+oy,K*(e.x+e.w)+ox,K*(hy+e.h)+oy]}}};
`;
const GAME = readFileSync(join(ROOT, "dist/poki/game.js"), "utf8");
if (!GAME.includes("var HILLS_ON=true;")) throw new Error("probe anchor missing");
const PROBED = GAME.replace("var HILLS_ON=true;", PROBE + "var HILLS_ON=true;");

const srv = await serveBuilds(), browser = await chromium.launch(), fails = [];
try {
  for (const vp of VIEWPORTS) {
    const { ctx, page, errs } = await newContext(browser, vp, { init: [DETERMINISTIC_INIT(7)] });
    await ctx.route("**/game.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: PROBED }));
    await page.goto(srv.poki, { waitUntil: "load" }); await page.evaluate(() => window.__frStep(5));
    for (const t of ["p", "b", "k", "r", "f"]) {
      for (const noEP of [false, true]) {
        const r = await page.evaluate(([t, n]) => window.__hp.go(t, n), [t, noEP]);
        const tol = 3 * r.K, [bx0, by0, bx1, by1] = r.bb, [hx0, hy0, hx1, hy1] = r.hb;
        // the sprite sits on its hitbox: bottom edge on the hitbox bottom (within 1 sprite pixel = 3 game px), x overlap, and
        // the bbox centre inside the hitbox rows
        const ok = r.lift > 20 && bx1 > hx0 && bx0 < hx1 && Math.abs(by1 - hy1) <= tol && (by0 + by1) / 2 > hy0 - tol && (by0 + by1) / 2 < hy1 + tol;
        const line = `${vp.name} ${t}${noEP ? " (control: hlEP off)" : ""}: lift ${r.lift.toFixed(1)} px, sprite bbox [${bb(r.bb)}] vs hitbox [${bb(r.hb)}] device px`;
        if (noEP ? ok : !ok) fails.push(line + (noEP ? " -- control did not fail" : " -- MISMATCH")); else console.log((noEP ? "ok   (control fails as expected) " : "ok   ") + line);
      }
    }
    if (errs.length) fails.push(vp.name + ": " + errs.join("; "));
    await ctx.close();
  }
} finally { await browser.close(); await srv.close() }
function bb(a) { return a.map((v) => Math.round(v)).join(",") }
if (fails.length) { console.error(fails.join("\n") + "\nHILLS BROWSER TEST FAILED"); process.exit(1) }
console.log("HILLS BROWSER TEST PASSED");
