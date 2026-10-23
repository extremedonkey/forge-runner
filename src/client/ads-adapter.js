/* Forge Runner ad adapter (FRAds). One interface, four backends: none | poki | adsense | crazygames.
 *
 * SAFETY: the default is OFF. Nothing loads, no network request is made and no ad is shown unless the page
 * passes BOTH  enabled: true  AND  a backend other than "none". Any error falls back to "none" behaviour.
 * Draft prepared 23 Oct 2026, not integrated into the game, not deployed.
 *
 * Usage (see integration-notes.md):
 *   var ads = FRAds.create({ enabled: false, backend: "none" });       // default: does nothing
 *   ads.onPause(function(){ pause game + suspend audio });              // called right before an ad shows
 *   ads.onResume(function(){ resume audio; game stays on its own state });// called once after every onPause
 *   ads.init().then(function(){ ads.gameLoadingFinished() });
 *   first player input:   ads.gameplayStart()
 *   death:                ads.gameplayStop()
 *   game-over screen:     ads.prepareRewarded("continue").then(function(ok){ show 🎬 Continue button if ok })
 *   tap 🎬 Continue:      ads.showRewarded("continue").then(function(r){ if (r.rewarded) continueRun() })
 *   tap Retry:            ads.showInterstitial("retry").then(function(){ ads.gameplayStart(); start() })
 *   while ads.busy is true the game must ignore gameplay input.
 *
 * Every show* call resolves (never rejects). Results: {shown:boolean, status:string} / {rewarded:boolean, status:string}.
 * Sources: Poki https://sdk.poki.com/html5 · Google Ad Placement API https://developers.google.com/ad-placement/apis/adbreak
 *          AdSense tag params https://support.google.com/adsense/answer/9955214 · CrazyGames https://docs.crazygames.com/sdk/video-ads/
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FRAds = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SDK_URL = {
    poki: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
    adsense: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    crazygames: "https://sdk.crazygames.com/crazygames-sdk-v3.js"
  };
  var PLACEHOLDER_PUB = "ca-pub-0000000000000000";

  function noop() {}
  function log(cfg, msg, x) { if (cfg.debug && typeof console !== "undefined") console.log("[FRAds] " + msg, x === undefined ? "" : x) }

  function create(userCfg) {
    var c = userCfg || {};
    var W = c.window || (typeof window !== "undefined" ? window : {});
    var cfg = {
      enabled: c.enabled === true,                      // must be literally true
      backend: String(c.backend || "none").toLowerCase(),
      debug: !!c.debug,
      loadScript: c.loadScript !== false,               // inject the SDK <script> if its global is missing
      timeoutMs: c.timeoutMs || 60000,                  // safety net if an SDK never calls back
      adsense: c.adsense || {},
      // Own-site interstitial policy. Applied ONLY to the adsense backend (portals forbid internal ad timers).
      ownSite: {
        skipFirstGameOvers: c.ownSite && c.ownSite.skipFirstGameOvers != null ? c.ownSite.skipFirstGameOvers : 1,
        minIntervalMs: c.ownSite && c.ownSite.minIntervalMs != null ? c.ownSite.minIntervalMs : 120000
      }
    };
    if (!cfg.enabled || !SDK_URL[cfg.backend]) cfg.backend = "none";
    if (cfg.backend === "adsense" && (!cfg.adsense.client || cfg.adsense.client === PLACEHOLDER_PUB)) {
      log(cfg, "adsense backend needs a real ca-pub id; staying OFF");
      cfg.backend = "none";
    }

    var hooks = { pause: noop, resume: noop };
    var st = { inited: false, playing: false, paused: false, busy: false, interstitialCalls: 0, lastAdAt: 0, rewardFn: null, rewardName: "" };
    var be; // backend impl

    var ads = {
      get backend() { return cfg.backend },
      get enabled() { return cfg.backend !== "none" },
      get busy() { return st.busy },
      onPause: function (fn) { hooks.pause = typeof fn === "function" ? fn : noop; return ads },
      onResume: function (fn) { hooks.resume = typeof fn === "function" ? fn : noop; return ads },
      init: function () {
        if (st.inited) return Promise.resolve();
        st.inited = true;
        return safe(be.init(), "init").then(function () { log(cfg, "ready: " + cfg.backend) });
      },
      gameLoadingFinished: function () { try { be.loaded() } catch (e) {} },
      gameplayStart: function () {
        if (st.playing || st.busy) return;                 // never twice in a row, never during an ad
        st.playing = true; try { be.start() } catch (e) {}
      },
      gameplayStop: function () {
        if (!st.playing) return;                           // never twice in a row
        st.playing = false; try { be.stop() } catch (e) {}
      },
      /* tab hidden / visible. Poki: counts as an interruption. CrazyGames: handled by the platform (no call). */
      onHidden: function () { if (be.stopOnHidden && st.playing) { ads.gameplayStop(); st.resumeOnVisible = true } },
      onVisible: function () { if (st.resumeOnVisible) { st.resumeOnVisible = false; ads.gameplayStart() } },
      setSoundEnabled: function (on) { try { be.sound(!!on) } catch (e) {} },
      /* Natural break between runs (player tapped Retry). Resolves when the game may continue. */
      showInterstitial: function (name) {
        name = name || "retry";
        if (st.busy) return Promise.resolve({ shown: false, status: "busy" });
        if (cfg.backend === "none") return Promise.resolve({ shown: false, status: "disabled" });
        st.interstitialCalls++;
        if (cfg.backend === "adsense") {
          if (st.interstitialCalls <= cfg.ownSite.skipFirstGameOvers) return Promise.resolve({ shown: false, status: "skippedFirst" });
          if (st.lastAdAt && now() - st.lastAdAt < cfg.ownSite.minIntervalMs) return Promise.resolve({ shown: false, status: "ownCap" });
        }
        if (st.playing) ads.gameplayStop();
        return run(function (done) { be.interstitial(name, done) }, "interstitial").then(function (r) {
          if (r.shown) st.lastAdAt = now();
          return r;
        });
      },
      /* Ask whether a rewarded "continue" can be offered right now. Resolves true/false. */
      prepareRewarded: function (name) {
        name = name || "continue";
        if (st.busy || cfg.backend === "none") return Promise.resolve(false);
        return safe(be.prepareReward(name), "prepareReward").then(function (ok) { return ok === true });
      },
      /* Player tapped the 🎬 button. Reward ONLY if r.rewarded === true. */
      showRewarded: function (name) {
        name = name || "continue";
        if (st.busy) return Promise.resolve({ rewarded: false, status: "busy" });
        if (cfg.backend === "none") return Promise.resolve({ rewarded: false, status: "disabled" });
        if (st.playing) ads.gameplayStop();
        return run(function (done) { be.reward(name, done) }, "reward").then(function (r) {
          if (r.shown) st.lastAdAt = now();
          return { rewarded: r.rewarded === true, status: r.status };
        });
      },
      _state: st // for tests
    };

    function now() { return Date.now() }
    function safe(p, what) {
      return Promise.resolve(p).catch(function (e) { log(cfg, what + " failed", e); return false });
    }
    /* pause/resume bookkeeping shared by all backends. onResume fires exactly once per onPause, even if the
       SDK never calls its "ad finished" callback (timeout). */
    function pauseOnce() { if (!st.paused) { st.paused = true; try { hooks.pause() } catch (e) {} } }
    function resumeOnce() { if (st.paused) { st.paused = false; try { hooks.resume() } catch (e) {} } }
    function run(start, what) {
      st.busy = true;
      return new Promise(function (resolve) {
        var finished = false, t = setTimeout(function () { finish({ shown: false, rewarded: false, status: "timeout" }) }, cfg.timeoutMs);
        function finish(r) {
          if (finished) return; finished = true; clearTimeout(t);
          resumeOnce(); st.busy = false; resolve(r);
        }
        try { start(finish) } catch (e) { log(cfg, what + " threw", e); finish({ shown: false, rewarded: false, status: "error" }) }
      });
    }
    function loadScript(src, attrs) {
      return new Promise(function (resolve, reject) {
        var d = W.document;
        if (!d || !d.createElement) return reject(new Error("no document"));
        var s = d.createElement("script");
        s.src = src; s.async = true;
        if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) s.setAttribute(k, attrs[k]);
        s.onload = function () { resolve() };
        s.onerror = function () { reject(new Error("load failed " + src)) };
        (d.head || d.documentElement).appendChild(s);
      });
    }

    /* ---------- backends ---------- */
    var NONE = {
      init: function () { return Promise.resolve() }, loaded: noop, start: noop, stop: noop, sound: noop,
      interstitial: function (n, done) { done({ shown: false, status: "disabled" }) },
      prepareReward: function () { return Promise.resolve(false) },
      reward: function (n, done) { done({ shown: false, rewarded: false, status: "disabled" }) }
    };

    /* Poki: https://sdk.poki.com/html5 . No internal timers; Poki decides frequency. Game must load even if init rejects. */
    var POKI = {
      stopOnHidden: true,
      sdk: function () { return W.PokiSDK },
      init: function () {
        var p = POKI.sdk() ? Promise.resolve() : (cfg.loadScript ? loadScript(SDK_URL.poki) : Promise.reject(new Error("PokiSDK missing")));
        return p.then(function () { return POKI.sdk().init() }).catch(function (e) { log(cfg, "Poki init rejected; game continues", e) });
      },
      loaded: function () { var s = POKI.sdk(); if (s) s.gameLoadingFinished() },
      start: function () { var s = POKI.sdk(); if (s) s.gameplayStart() },
      stop: function () { var s = POKI.sdk(); if (s) s.gameplayStop() },
      sound: noop,
      interstitial: function (n, done) {
        var s = POKI.sdk(); if (!s) return done({ shown: false, status: "noSdk" });
        var started = false;
        s.commercialBreak(function () { started = true; pauseOnce() })
          .then(function () { done({ shown: started, status: started ? "viewed" : "noAd" }) },
                function () { done({ shown: started, status: "error" }) });
      },
      prepareReward: function () { return Promise.resolve(!!POKI.sdk()) }, // Poki can't pre-check; success flag decides
      reward: function (n, done) {
        var s = POKI.sdk(); if (!s) return done({ shown: false, rewarded: false, status: "noSdk" });
        var started = false;
        s.rewardedBreak(function () { started = true; pauseOnce() })
          .then(function (success) { done({ shown: started, rewarded: success === true, status: success ? "viewed" : "notRewarded" }) },
                function () { done({ shown: started, rewarded: false, status: "error" }) });
      }
    };

    /* Google H5 Games Ads (Ad Placement API). By-application product; needs an approved AdSense account.
       https://developers.google.com/ad-placement/apis/adbreak . Placement types used: 'next' (between runs), 'reward'. */
    var ADS = {
      stopOnHidden: false,
      push: function (o) { (W.adsbygoogle = W.adsbygoogle || []).push(o) },
      init: function () {
        W.adsbygoogle = W.adsbygoogle || [];
        if (!W.adBreak) { W.adBreak = W.adConfig = function (o) { W.adsbygoogle.push(o) } }
        var a = cfg.adsense, attrs = { "data-ad-client": a.client, crossorigin: "anonymous" };
        if (a.test !== false) attrs["data-adbreak-test"] = "on";            // TEST MODE unless explicitly false
        attrs["data-ad-frequency-hint"] = a.frequencyHint || "120s";
        if (a.childDirected !== false) attrs["data-tag-for-child-directed-treatment"] = "1"; // conservative default
        if (a.underAgeOfConsent) attrs["data-tag-for-under-age-of-consent"] = "1";
        if (a.channel) attrs["data-ad-channel"] = String(a.channel);
        var already = W.document && W.document.querySelector && W.document.querySelector('script[src*="adsbygoogle.js"]');
        var p = already || !cfg.loadScript ? Promise.resolve() : loadScript(SDK_URL.adsense + "?client=" + encodeURIComponent(a.client), attrs);
        return p.then(function () {
          return new Promise(function (resolve) {
            var t = setTimeout(resolve, 3000);
            W.adConfig({ preloadAdBreaks: "on", sound: a.soundOn ? "on" : "off", onReady: function () { clearTimeout(t); resolve() } });
          });
        });
      },
      loaded: noop, start: noop, stop: noop,
      sound: function (on) { W.adConfig && W.adConfig({ sound: on ? "on" : "off" }) },
      interstitial: function (n, done) {
        var shown = false;
        W.adBreak({
          type: "next", name: n,
          beforeAd: function () { shown = true; pauseOnce() },
          afterAd: function () { resumeOnce() },
          adBreakDone: function (info) { done({ shown: shown, status: (info && info.breakStatus) || "done" }) }
        });
      },
      prepareReward: function (n) {
        return new Promise(function (resolve) {
          var settled = false;
          function once(v) { if (!settled) { settled = true; resolve(v) } }
          st.rewardFn = null; st.rewardName = n; st.rewardDone = null; st.rewardViewed = false; st.rewardShown = false;
          W.adBreak({
            type: "reward", name: n,
            beforeAd: function () { st.rewardShown = true; pauseOnce() },
            afterAd: function () { resumeOnce() },
            beforeReward: function (showAdFn) { st.rewardFn = showAdFn; once(true) },
            adDismissed: function () { st.rewardViewed = false },
            adViewed: function () { st.rewardViewed = true },
            adBreakDone: function (info) {
              var cb = st.rewardDone; st.rewardDone = null; st.rewardFn = null;
              if (cb) cb({ shown: st.rewardShown, rewarded: st.rewardViewed, status: (info && info.breakStatus) || "done" });
              once(false); // no ad available (beforeReward never called) or prompt ignored
            }
          });
          setTimeout(function () { once(!!st.rewardFn) }, 1500);
        });
      },
      reward: function (n, done) {
        if (!st.rewardFn) return done({ shown: false, rewarded: false, status: "notPrepared" });
        st.rewardDone = done;
        var f = st.rewardFn; st.rewardFn = null; f();
      }
    };

    /* CrazyGames HTML5 SDK v3: https://docs.crazygames.com/sdk/intro/ . SDK caps midgame (~1 per 3 min).
       Mute/pause only on adStarted; resume on adFinished/adError. Off-platform the SDK environment is "disabled". */
    var CG = {
      stopOnHidden: false,
      sdk: function () { return W.CrazyGames && W.CrazyGames.SDK },
      usable: function () { var s = CG.sdk(); return !!(s && s.environment !== "disabled") },
      init: function () {
        var p = CG.sdk() ? Promise.resolve() : (cfg.loadScript ? loadScript(SDK_URL.crazygames) : Promise.reject(new Error("CrazyGames SDK missing")));
        return p.then(function () { return CG.sdk().init() }).then(function () {
          if (!CG.usable()) log(cfg, "CrazyGames SDK environment disabled; ads off");
        });
      },
      loaded: function () { if (CG.usable()) CG.sdk().game.loadingStop() },
      start: function () { if (CG.usable()) CG.sdk().game.gameplayStart() },
      stop: function () { if (CG.usable()) CG.sdk().game.gameplayStop() },
      sound: noop,
      request: function (type, done) {
        if (!CG.usable()) return done({ shown: false, rewarded: false, status: "disabled" });
        var started = false;
        CG.sdk().ad.requestAd(type, {
          adStarted: function () { started = true; pauseOnce() },
          adFinished: function () { done({ shown: true, rewarded: type === "rewarded", status: "finished" }) },
          adError: function (e) { done({ shown: started, rewarded: false, status: (e && e.code) || "error" }) }
        });
      },
      interstitial: function (n, done) { CG.request("midgame", done) },
      prepareReward: function () { return Promise.resolve(CG.usable()) },
      reward: function (n, done) { CG.request("rewarded", done) }
    };

    be = { none: NONE, poki: POKI, adsense: ADS, crazygames: CG }[cfg.backend] || NONE;
    return ads;
  }

  return { create: create, version: "0.1.0-draft" };
});
