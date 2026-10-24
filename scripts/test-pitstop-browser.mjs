// PIT STOP browser test: npm run test:pitstop-browser (after npm run build; needs `npx playwright install chromium`).
// Plays the lab page dist/lab/pitstop/ (the live 14c-pitstop.js fragment with its real hooks + the lab probe ?pkdbg=1, memory-only
// save) in real time: a scripted held jump onto the pit deck, park, buy Spare Core / Forge Plate / Power Cell, Continue.
//   - 390x844, 844x390, 1280x800 with ?pit=6 (a pit every 6 s): parks on the deck, the cards are centred, Continue sits under
//     them, each buy applies to the run (cores +1, shield on, spring 10 -> 11.5 s), Continue resumes the run with the row hidden
//   - 1280x800 level mode (no ?pit): the pit comes before Level 2 (score < LV_AT[1] = 410) and the button says "Level 2"
// Fails on any page error. Run by the ui-browser job (pr.yml).
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "dist/lab/pitstop/index.html");
if (!existsSync(PAGE)) throw new Error("run `npm run build` first");
const fails = [];
const ok = (c, m) => { if (c) console.log("ok   pitstop:", m); else { console.log("FAIL pitstop:", m); fails.push(m); } };

async function park(p, ms) {
  const t0 = Date.now();
  let jumped = null;
  while (Date.now() - t0 < ms) {
    const s = await p.evaluate(() => ({ st: __pk.state, pk: __pk.pk, front: __pk.front, f: __pk.f }));
    if (s.st === "pit") return true;
    if (s.st === "over") return false;
    if (s.pk && !s.pk.used && jumped !== s.pk.x0 && (s.pk.x0 - s.front) / s.f < 0.06) {
      jumped = s.pk.x0; await p.keyboard.down("Space"); await p.waitForTimeout(260); await p.keyboard.up("Space");
    }
    await p.waitForTimeout(8);
  }
  return false;
}

const b = await chromium.launch();
try {
  for (const [w, h, tag, q] of [[390, 844, "portrait", "?pit=6"], [844, 390, "landscape", "?pit=6"], [1280, 800, "desktop", "?pit=6"], [1280, 800, "level-mode", ""]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(PAGE).href + (q ? q + "&" : "?") + "bank=400&pkdbg=1");
    await p.waitForTimeout(400);
    await p.keyboard.press("Space"); await p.evaluate(() => __pk.god());
    const parked = await park(p, q ? 25000 : 40000);
    ok(parked, `${tag}: drove onto the deck and parked in the pit`);
    if (!parked) { await p.close(); continue; }
    await p.waitForTimeout(400);
    const L = await p.evaluate(() => {
      const r = (id) => document.querySelector(id).getBoundingClientRect(), up = r("#up"), go = r("#pkgo");
      return { upL: up.left, upR: innerWidth - up.right, upB: up.bottom, goT: go.top, goC: go.left + go.width / 2, w: innerWidth,
        cls: document.getElementById("up").className, txt: document.getElementById("pkgo").textContent, score: __pk.score, n: __pk.pk.n,
        ds: [...document.querySelectorAll("#up .ds")].map((e) => e.textContent) };
    });
    ok(L.cls.includes("pit") && Math.abs(L.upL - L.upR) <= 2, `${tag}: cards centred (${Math.round(L.upL)} / ${Math.round(L.upR)} px)`);
    ok(L.goT >= L.upB && Math.abs(L.goC - L.w / 2) <= 2, `${tag}: Continue centred under the cards`);
    ok(L.ds.length >= 5 && L.ds.every((d) => d.length > 8), `${tag}: every card explains itself`);
    if (!q) ok(L.n === 2 && L.score < 410 && /Level 2/.test(L.txt), `level-mode: pit before Level 2 (score ${Math.round(L.score)}, "${L.txt}")`);
    if (q) {
      const s0 = await p.evaluate(() => ({ b: __pk.bank, c: __pk.cores, s: __pk.shd }));
      await p.click('#up .ut[data-k="r"]'); await p.click('#up .ut[data-k="p"]'); await p.click('#up .ut[data-k="c"]');
      const s1 = await p.evaluate(() => ({ b: __pk.bank, c: __pk.cores, s: __pk.shd, sp: __pk.spMax, st: __pk.state }));
      ok(s1.st === "pit" && s1.b === s0.b - 345 && s1.c === s0.c + 1 && s1.s === 1 && s1.sp === 11.5, `${tag}: buys apply to the run (${JSON.stringify(s1)})`);
    }
    await p.click("#pkgo");
    await p.waitForTimeout(600);
    const s2 = await p.evaluate(() => ({ st: __pk.state, row: getComputedStyle(document.getElementById("up")).display, go: getComputedStyle(document.getElementById("pkgo")).display }));
    ok(s2.st === "run" && s2.row === "none" && s2.go === "none", `${tag}: Continue resumes the run (${JSON.stringify(s2)})`);
    ok(errs.length === 0, `${tag}: no page errors ${errs.join(" | ")}`);
    await p.close();
  }
} finally { await b.close(); }
if (fails.length) { console.log(`PITSTOP BROWSER FAILED (${fails.length})`); process.exit(1); }
console.log("PITSTOP BROWSER PASSED");
