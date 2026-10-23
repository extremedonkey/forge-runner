// Quick headless checks for ads-adapter.js (node >= 18). Uses fake SDKs only; makes no network requests.
// Run: node test-ads-adapter.mjs
// Repo copy: loads src/client/ads-adapter.js (a UMD browser script) through a CommonJS shim, since the repo is "type": "module".
// Run: node scripts/test-ads-adapter.mjs
import assert from "assert/strict";
import { readFileSync } from "fs";
const module = { exports: {} };
new Function("module", "exports", readFileSync(new URL("../src/client/ads-adapter.js", import.meta.url), "utf8"))(module, module.exports);
const FRAds = module.exports;

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("ok -", name); };

function fakeWindow(extra = {}) {
  const appended = [];
  const document = {
    head: { appendChild: (s) => { appended.push(s); setTimeout(() => s.onload && s.onload(), 0); } },
    createElement: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
    querySelector: () => null,
  };
  return Object.assign({ document, _appended: appended }, extra);
}
function counters(ads) {
  const c = { pause: 0, resume: 0 };
  ads.onPause(() => c.pause++).onResume(() => c.resume++);
  return c;
}

await t("default config is OFF (none), injects nothing, shows nothing", async () => {
  const w = fakeWindow();
  const ads = FRAds.create({ window: w });
  const c = counters(ads);
  assert.equal(ads.backend, "none"); assert.equal(ads.enabled, false);
  await ads.init(); ads.gameLoadingFinished(); ads.gameplayStart(); ads.gameplayStop();
  assert.deepEqual(await ads.showInterstitial(), { shown: false, status: "disabled" });
  assert.equal(await ads.prepareRewarded(), false);
  assert.deepEqual(await ads.showRewarded(), { rewarded: false, status: "disabled" });
  assert.equal(w._appended.length, 0); assert.deepEqual(c, { pause: 0, resume: 0 }); assert.equal(ads.busy, false);
});

await t("backend set but enabled not literally true => none", async () => {
  for (const enabled of [undefined, "true", 1, false]) {
    const ads = FRAds.create({ window: fakeWindow(), backend: "poki", enabled });
    assert.equal(ads.backend, "none");
  }
});

await t("adsense with placeholder publisher id stays OFF", async () => {
  const ads = FRAds.create({ window: fakeWindow(), enabled: true, backend: "adsense", adsense: { client: "ca-pub-0000000000000000" } });
  assert.equal(ads.backend, "none");
});

await t("poki: events deduped, interstitial pauses/resumes once, rewarded only on success", async () => {
  const calls = [];
  let rewardSuccess = true, adPlays = true;
  const PokiSDK = {
    init: async () => calls.push("init"), gameLoadingFinished: () => calls.push("loaded"),
    gameplayStart: () => calls.push("start"), gameplayStop: () => calls.push("stop"),
    commercialBreak: async (cb) => { calls.push("cb"); if (adPlays) cb(); },
    rewardedBreak: async (cb) => { calls.push("rb"); cb(); return rewardSuccess; },
  };
  const w = fakeWindow({ PokiSDK });
  const ads = FRAds.create({ window: w, enabled: true, backend: "poki" });
  const c = counters(ads);
  await ads.init(); ads.gameLoadingFinished();
  ads.gameplayStart(); ads.gameplayStart(); ads.gameplayStop(); ads.gameplayStop();
  assert.deepEqual(calls, ["init", "loaded", "start", "stop"]);
  assert.equal(w._appended.length, 0, "SDK already present, nothing injected");
  const r1 = await ads.showInterstitial("retry");
  assert.equal(r1.shown, true); assert.deepEqual(c, { pause: 1, resume: 1 });
  adPlays = false;
  const r2 = await ads.showInterstitial("retry");
  assert.equal(r2.shown, false); assert.deepEqual(c, { pause: 1, resume: 1 }, "no ad => no pause/resume");
  assert.equal((await ads.showRewarded()).rewarded, true);
  rewardSuccess = false;
  assert.equal((await ads.showRewarded()).rewarded, false);
  assert.deepEqual(c, { pause: 3, resume: 3 });
});

await t("poki init rejection does not break the game", async () => {
  const PokiSDK = { init: () => Promise.reject(new Error("blocked")) };
  const ads = FRAds.create({ window: fakeWindow({ PokiSDK }), enabled: true, backend: "poki" });
  await ads.init(); // must resolve
});

await t("timeout: SDK never calls back => resume once, no reward, not busy", async () => {
  const PokiSDK = { init: async () => {}, rewardedBreak: (cb) => { cb(); return new Promise(() => {}); } };
  const ads = FRAds.create({ window: fakeWindow({ PokiSDK }), enabled: true, backend: "poki", timeoutMs: 50 });
  const c = counters(ads);
  await ads.init();
  const p = ads.showRewarded(); assert.equal(ads.busy, true);
  assert.equal((await ads.showInterstitial()).status, "busy", "no overlapping ads");
  const r = await p;
  assert.deepEqual(r, { rewarded: false, status: "timeout" }); assert.deepEqual(c, { pause: 1, resume: 1 }); assert.equal(ads.busy, false);
});

await t("adsense: test mode + child-directed attrs by default, own-site caps, reward flow", async () => {
  const w = fakeWindow();
  let rewardAvailable = true, watch = true;
  // Fake Ad Placement API: handles objects pushed to adsbygoogle.
  const handle = (o) => {
    if (o.onReady) return setTimeout(o.onReady, 0);
    if (o.type === "next") { o.beforeAd(); o.afterAd(); o.adBreakDone({ breakStatus: "viewed" }); }
    if (o.type === "reward") {
      if (!rewardAvailable) return o.adBreakDone({ breakStatus: "noAdPreloaded" });
      o.beforeReward(() => { o.beforeAd(); watch ? o.adViewed() : o.adDismissed(); o.afterAd(); o.adBreakDone({ breakStatus: watch ? "viewed" : "dismissed" }); });
    }
  };
  w.adsbygoogle = { push: handle };
  const ads = FRAds.create({ window: w, enabled: true, backend: "adsense", adsense: { client: "ca-pub-1234567890123456" }, ownSite: { skipFirstGameOvers: 1, minIntervalMs: 120000 } });
  const c = counters(ads);
  await ads.init();
  const attrs = w._appended[0].attrs;
  assert.equal(attrs["data-adbreak-test"], "on"); assert.equal(attrs["data-tag-for-child-directed-treatment"], "1");
  assert.equal(attrs["data-ad-frequency-hint"], "120s");
  assert.equal((await ads.showInterstitial()).status, "skippedFirst");
  assert.equal((await ads.showInterstitial()).shown, true);
  assert.equal((await ads.showInterstitial()).status, "ownCap");
  assert.equal(await ads.prepareRewarded(), true);
  assert.equal((await ads.showRewarded()).rewarded, true);
  watch = false; assert.equal(await ads.prepareRewarded(), true);
  assert.equal((await ads.showRewarded()).rewarded, false);
  rewardAvailable = false; assert.equal(await ads.prepareRewarded(), false);
  assert.equal((await ads.showRewarded()).status, "notPrepared");
  assert.deepEqual(c, { pause: 3, resume: 3 });
});

await t("crazygames: disabled environment => no ads; crazygames env => midgame + rewarded", async () => {
  const mk = (env) => ({ CrazyGames: { SDK: {
    environment: env, init: async () => {},
    game: { gameplayStart() {}, gameplayStop() {}, loadingStop() {} },
    ad: { requestAd: (type, cb) => { cb.adStarted(); cb.adFinished(); } } } } });
  let ads = FRAds.create({ window: fakeWindow(mk("disabled")), enabled: true, backend: "crazygames" });
  let c = counters(ads); await ads.init();
  assert.equal((await ads.showInterstitial()).shown, false); assert.equal(await ads.prepareRewarded(), false);
  assert.deepEqual(c, { pause: 0, resume: 0 });
  ads = FRAds.create({ window: fakeWindow(mk("crazygames")), enabled: true, backend: "crazygames" });
  c = counters(ads); await ads.init();
  assert.equal((await ads.showInterstitial()).shown, true);
  assert.equal((await ads.showRewarded()).rewarded, true);
  assert.deepEqual(c, { pause: 2, resume: 2 });
});

await t("crazygames adError on rewarded => no reward", async () => {
  const w = fakeWindow({ CrazyGames: { SDK: { environment: "crazygames", init: async () => {}, game: {},
    ad: { requestAd: (type, cb) => cb.adError({ code: "unfilled" }) } } } });
  const ads = FRAds.create({ window: w, enabled: true, backend: "crazygames" });
  await ads.init();
  assert.deepEqual(await ads.showRewarded(), { rewarded: false, status: "unfilled" });
});

console.log(`\n${pass} checks passed`);
