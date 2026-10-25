// Sparks smoke (sparks SPEC §9 PR10; pit-stop-only shop since 25 Oct 2026): browser checks of the spark economy at game over,
// real time, no seeding. Used by scripts/smoke.mjs (site build at a URL: preview and live, run by pr.yml / main.yml) and by
// scripts/test-sparks-browser.mjs (local site + Poki builds). Beacons and /api/* are aborted (lib/browser.mjs newContext),
// so no run reaches the play stats or the global leaderboard. Buying is only possible inside a pit stop (14c), which this
// real-time smoke can't reach reliably; scripts/test-pitstop-browser.mjs covers it (park, buy, Continue).
//
// Per viewport (390x844, 844x390, 1280x800), site only, with ?sk=500 (debug switch: in-memory save, nothing written):
//   - the runner dies -> NO upgrade row (#up hidden: upgrades are bought only at pit stops), nothing written to
//     forge-runner-sparks, and a tap/click is a one-tap retry (Share hidden, run going)
// Once per build (first viewport), with real storage:
//   - earn + save + load: run 1 dies -> forge-runner-sparks {v:1,n:1,b>=8} (starter floor); reload, run 2 -> n=2 and the bank
//     grew by >= 8 (so the save was loaded); no row at either game over
//   - Poki build: loaded with ?sk=500, which must be ignored (no debug code on Poki): bank is the real one (< 500) and written
//   - localStorage that throws on every access (addInitScript): the game still starts, dies (no row) and retries
// All steps run concurrently: each has its own browser context, so its own (empty) localStorage, and none reads another's
// state (the ?sk=500 steps write nothing; earn/save/load starts from an empty save either way). The lines and failures are
// reported in the order above once every step is done.
import { newContext, withQuery } from "./lib/browser.mjs";

const KEY = "forge-runner-sparks";
const shown = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== "none"; }, id);
const save = (page) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return "unreadable"; } }, KEY);

// a point on the canvas that no UI element (Share, mute, leaderboard, Retry) covers
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
  await page.waitForTimeout(900); // the 400/800 ms retry lockout
}

export async function sparksSmoke(browser, { url, build = "site", viewports, out, log = console.log }) {
  const runStep = async (name, vp, fn, opts = {}) => {
    const { ctx, page, errs } = await newContext(browser, vp, opts);
    const notes = [];
    try { await fn(page, (c, m) => { if (!c) errs.push(m); }, notes); }
    catch (e) { errs.push(String(e.message || e).split("\n")[0]); }
    finally {
      if (out) await page.screenshot({ path: `${out}/sparks-${build}-${vp.name}-${name.replace(/[^A-Za-z0-9.-]+/g, "_")}.png` }).catch(() => {});
      await ctx.close();
    }
    return {
      line: `${errs.length ? "FAIL" : "ok  "} sparks ${build} ${vp.name} ${name}${notes.length ? " (" + notes.join("; ") + ")" : ""}${errs.length ? "\n    " + errs.join("\n    ") : ""}`,
      fails: errs.map((e) => `sparks ${build} ${vp.name} ${name}: ${e}`),
    };
  };
  const steps = []; // all started at once, reported in this order
  const step = (...a) => steps.push(runStep(...a));

  if (build === "site") for (const vp of viewports) {
    step("?sk=500 game over: no shop, one-tap retry", vp, async (page, ok) => {
      await load(page, withQuery(url, { sk: "500" }));
      await runToDeath(page, vp);
      ok(!(await shown(page, "up")), "upgrade row #up visible at game over (upgrades are bought only at pit stops)");
      ok((await save(page)) === null, "?sk run wrote forge-runner-sparks (debug save must be in memory only)");
      await press(page, vp);
      await page.waitForTimeout(250);
      ok(!(await shown(page, "sh")), "tap did not retry (Share still visible)");
    });
  }

  const vp = viewports[0];
  step("earn/save/load", vp, async (page, ok, notes) => {
    const u = build === "poki" ? withQuery(url, { sk: "500" }) : url;
    await load(page, u);
    await runToDeath(page, vp);
    const s1 = await save(page);
    ok(s1 && s1.v === 1 && s1.n === 1 && s1.b >= 8 && s1.e >= 8, `after run 1 want {v:1,n:1,b>=8}, got ${JSON.stringify(s1)}`);
    if (build === "poki") ok(s1 && s1.b < 500, "Poki build honoured ?sk=500 (debug switch must be absent on Poki)");
    ok(!(await shown(page, "up")), "upgrade row visible at game over");
    await load(page, u);
    await runToDeath(page, vp);
    const s2 = await save(page);
    ok(s2 && s1 && s2.n === 2 && s2.b >= s1.b + 8, `after reload + run 2 want n=2 and b>=${s1?.b}+8, got ${JSON.stringify(s2)}`);
    notes.push(`bank ${s1?.b} -> ${s2?.b}`);
    ok(!(await shown(page, "up")), "upgrade row visible at the second game over");
  });

  step("storage throws", vp, async (page, ok) => {
    await load(page, url);
    await runToDeath(page, vp);
    ok(!(await shown(page, "up")), "upgrade row visible at game over (in-memory save)");
    await press(page, vp);
    await page.waitForTimeout(250);
    ok(!(await shown(page, "sh")), "retry failed with throwing localStorage");
  }, { throwStorage: true });

  const failures = [];
  for (const r of await Promise.all(steps)) { log(r.line); failures.push(...r.fails); }
  return failures;
}
