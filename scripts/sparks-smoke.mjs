// Sparks smoke (sparks SPEC §9 PR10): browser checks of the spark economy and the upgrade row, real time, no seeding.
// Used by scripts/smoke.mjs (site build at a URL: preview and live, run by pr.yml / main.yml) and by
// scripts/test-sparks-browser.mjs (local site + Poki builds). Beacons and /api/* are aborted (lib/browser.mjs newContext),
// so no run reaches the play stats or the global leaderboard.
//
// Per viewport (390x844, 844x390, 1280x800), site only, with ?sk=500 (debug switch: in-memory save, nothing written):
//   - the runner dies -> the upgrade row #up is visible, 1-5 visible tiles >= 44 px (the Poki-submission build shows only
//     Spark Magnet), Magnet affordable at level 0
//   - Magnet tile taps buy until the next level costs more than the bank left (costs read from the tiles; today 8+60+150 =>
//     bank 282, L4 at 300 "too expensive"): the level goes up per tap, the bank drop shows as the too-expensive state, the
//     state stays game-over, and nothing is written to localStorage (forge-runner-sparks)
//     [needs the tile input of sparks PR8; on a build without it (#up never gets class "in") this step is reported as SKIPPED]
//   - a tap/click outside the tiles is a one-tap retry (row and Share hidden, run going)
// Once per build (first viewport), with real storage:
//   - earn + save + load: run 1 dies -> forge-runner-sparks {v:1,n:1,b>=8} (starter floor); reload, run 2 -> n=2 and the bank
//     grew by >= 8 (so the save was loaded); with PR8 input: tap Magnet -> saved l.m=1 and b minus its cost; reload keeps l.m=1
//   - Poki build: loaded with ?sk=500, which must be ignored (no debug code on Poki): bank is the real one (< 500) and written
//   - localStorage that throws on every access (addInitScript): the game still starts, dies, shows the row and retries
import { newContext, withQuery } from "./lib/browser.mjs";

const KEY = "forge-runner-sparks";
const shown = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== "none"; }, id);
const save = (page) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return "unreadable"; } }, KEY);
const tiles = (page) => page.evaluate(() => [...document.querySelectorAll("#up .ut")].map((b) => {
  const r = b.getBoundingClientRect(); return { k: b.dataset.k, cls: b.className, label: b.getAttribute("aria-label") || "", w: r.width, h: r.height, vis: getComputedStyle(b).display !== "none" };
}));
const tile = (ts, k) => ts.find((t) => t.k === k) || { cls: "", label: "" };
const cost = (t) => { const m = /costs (\d+) sparks/.exec(t.label); return m ? +m[1] : null; };
const level = (t) => +((/level (\d+)/.exec(t.label) || [])[1] ?? -1);

// a point on the canvas that no UI element (row, Share, mute, leaderboard, Retry) covers
async function freePoint(page) {
  return page.evaluate(() => {
    const c = document.getElementById("c").getBoundingClientRect();
    for (const [fx, fy] of [[0.5, 0.45], [0.5, 0.3], [0.3, 0.3], [0.7, 0.3], [0.5, 0.15], [0.2, 0.6]]) {
      const x = Math.round(c.left + c.width * fx), y = Math.round(c.top + c.height * fy);
      if (document.elementFromPoint(x, y)?.id === "c") return { x, y };
    }
    return null;
  });
}
async function press(page, vp) {
  const p = await freePoint(page);
  if (!p) throw new Error("no free canvas point to tap");
  if (vp.touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function tapTile(page, vp, k) {
  const l = page.locator(`#up .ut[data-k="${k}"]`);
  if (vp.touch) await l.tap(); else await l.click();
  await page.waitForTimeout(80);
}
async function load(page, url) {
  const r = await page.goto(url, { waitUntil: "load", timeout: 30000 });
  if (!r || r.status() !== 200) throw new Error(`HTTP ${r?.status()}`);
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(300);
}
// start a run (no jumps) and wait for the death: Share (#sh) appears on game over
async function runToDeath(page, vp) {
  await press(page, vp);
  await page.waitForTimeout(300);
  if (await shown(page, "sh")) throw new Error("run did not start");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("sh")).display !== "none", null, { timeout: 20000 })
    .catch(() => { throw new Error("no game over within 20 s"); });
  await page.waitForTimeout(900); // row fade-in (300 ms + transition) and the 400/800 ms retry lockout
}
const hasInput = (page) => page.evaluate(() => { const u = document.getElementById("up"); return !!u && u.classList.contains("in"); });

export async function sparksSmoke(browser, { url, build = "site", viewports, out, log = console.log }) {
  const failures = [];
  const step = async (name, vp, fn, opts = {}) => {
    const { ctx, page, errs } = await newContext(browser, vp, opts);
    const notes = [];
    try { await fn(page, (c, m) => { if (!c) errs.push(m); }, notes); }
    catch (e) { errs.push(String(e.message || e).split("\n")[0]); }
    finally {
      if (out) await page.screenshot({ path: `${out}/sparks-${build}-${vp.name}-${name}.png` }).catch(() => {});
      await ctx.close();
    }
    log(`${errs.length ? "FAIL" : "ok  "} sparks ${build} ${vp.name} ${name}${notes.length ? " (" + notes.join("; ") + ")" : ""}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
    failures.push(...errs.map((e) => `sparks ${build} ${vp.name} ${name}: ${e}`));
  };

  if (build === "site") for (const vp of viewports) {
    await step("?sk=500 row/buy/retry", vp, async (page, ok, notes) => {
      await load(page, withQuery(url, { sk: "500" }));
      await runToDeath(page, vp);
      ok(await shown(page, "up"), "upgrade row #up not visible after death");
      let ts = (await tiles(page)).filter((t) => t.vis);
      ok(ts.length >= 1 && ts.length <= 5 && ts.every((t) => t.w >= 44 && t.h >= 44), `want 1-5 visible tiles >= 44 px, got ${ts.map((t) => `${t.k}:${Math.round(t.w)}x${Math.round(t.h)}`).join(" ") || "none"}`);
      ok(level(tile(ts, "m")) === 0 && /\bok\b/.test(tile(ts, "m").cls), `Magnet not affordable at level 0 with ?sk=500: ${tile(ts, "m").cls} / ${tile(ts, "m").label}`);
      if (await hasInput(page)) {
        // buy Magnet until its next level costs more than the bank left (but no more than the 500 we started with):
        // then "too expensive" proves the bank dropped, and the level proves each buy
        let bank = 500, n = 0, c = cost(tile(ts, "m"));
        while (c != null && c <= bank && n < 5) { await tapTile(page, vp, "m"); bank -= c; n++; ts = (await tiles(page)).filter((t) => t.vis); c = cost(tile(ts, "m")); }
        const m = tile(ts, "m");
        ok(n >= 1 && level(m) === n, `${n} Magnet taps, tile shows level ${level(m)}: ${m.label}`);
        ok(c != null && c > bank && c <= 500 && /\bno\b/.test(m.cls), `bank did not drop to ${bank} (next Magnet level costs ${c}, should be too expensive): ${m.cls}`);
        ok(await shown(page, "sh") && await shown(page, "up"), "a tile tap left the game-over screen (tile taps must never retry)");
        ok((await save(page)) === null, "?sk run wrote forge-runner-sparks (debug save must be in memory only)");
        notes.push(`Magnet x${n} -> level ${level(m)}, bank 500 -> ${bank}, next ${c} too expensive; ${ts.length} tile(s) shown`);
      } else notes.push("tile buy SKIPPED: no tile input on this build (sparks PR8)");
      await press(page, vp);
      await page.waitForTimeout(250);
      ok(!(await shown(page, "up")) && !(await shown(page, "sh")), "tap outside the tiles did not retry (row/Share still visible)");
    });
  }

  const vp = viewports[0];
  await step("earn/save/load", vp, async (page, ok, notes) => {
    const u = build === "poki" ? withQuery(url, { sk: "500" }) : url;
    await load(page, u);
    await runToDeath(page, vp);
    const s1 = await save(page);
    ok(s1 && s1.v === 1 && s1.n === 1 && s1.b >= 8 && s1.e >= 8, `after run 1 want {v:1,n:1,b>=8}, got ${JSON.stringify(s1)}`);
    if (build === "poki") ok(s1 && s1.b < 500, "Poki build honoured ?sk=500 (debug switch must be absent on Poki)");
    ok(await shown(page, "up"), "upgrade row not visible after death");
    await load(page, u);
    await runToDeath(page, vp);
    const s2 = await save(page);
    ok(s2 && s1 && s2.n === 2 && s2.b >= s1.b + 8, `after reload + run 2 want n=2 and b>=${s1?.b}+8, got ${JSON.stringify(s2)}`);
    notes.push(`bank ${s1?.b} -> ${s2?.b}`);
    const mc = cost(tile(await tiles(page), "m"));
    if (s2 && mc != null && s2.b >= mc && await hasInput(page)) {
      await tapTile(page, vp, "m");
      const s3 = await save(page);
      ok(s3 && s3.l && s3.l.m === 1 && s3.b === s2.b - mc, `buy Magnet (${mc}): want l.m=1, b=${s2.b - mc}; got ${JSON.stringify(s3)}`);
      await load(page, url);
      const s4 = await save(page);
      ok(s4 && s4.l && s4.l.m === 1, `reload lost the Magnet level: ${JSON.stringify(s4)}`);
      notes.push(`bought Magnet for ${mc}, saved bank ${s2.b} -> ${s2.b - mc}, reloaded`);
    } else notes.push("buy SKIPPED (no tile input on this build: sparks PR8)");
  });

  await step("storage throws", vp, async (page, ok) => {
    await load(page, url);
    await runToDeath(page, vp);
    ok(await shown(page, "up"), "upgrade row not visible after death (in-memory save)");
    await press(page, vp);
    await page.waitForTimeout(250);
    ok(!(await shown(page, "sh")), "retry failed with throwing localStorage");
  }, { throwStorage: true });

  return failures;
}
