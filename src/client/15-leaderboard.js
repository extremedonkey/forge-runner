// LEADERBOARD: global top-10 client (FRLB, from Forge Runner Mobile's final leaderboard.js) + game glue lbDraw()/lbOver().
// Client fragment, not an ES module: all fragments are joined in src/client/index.mjs order inside ONE IIFE
// (shared scope). Write plain browser JS inside the String.raw template; no backticks, no ${...} except ${PUBLIC_URL}.
// Must run before 16-loop.js (boot): the demo autostart calls start() -> FRLB.hide().
// Same-origin only: /api/leaderboard + /api/score. On forgerunnergames.com CloudFront routes /api/* to forge-runner-api;
// on the raw Lambda URLs the game Lambda answers /api/* with an empty 204 (src/index.mjs), so the module stays silent.
// Integrator edits to the upstream module: C.ro (read-only in demo / ?pu= / ?sk=): no submit, no entry, no start panel, no hint;
// and no initials entry until the board has loaded once (gameOver() retries load() first), so nothing shows where /api/* is absent.
export default String.raw`
/* leaderboard: read-only in demo mode, with the ?pu= test switch and in ?sk= sparks debug runs */
window.FRLB_CONFIG={ro:!!(demo||tpu||skDebug)};
/* Forge Runner global leaderboard client. Plain JS, no dependencies, fails silently.
   Calls same-origin /api/* only (the site's CSP is connect-src 'self'; CloudFront routes /api/* to forge-runner-api).
   API: window.FRLB = { load, screenX, worldX, draw, gameOver, showTop, hide, isOpen, initials }
   See CLIENT.md for the integration hooks. */
(function () {
  "use strict";
  var C = window.FRLB_CONFIG || {}, API = C.api || "/api", PPP = 20; /* px of track per score point: game does score += speed*dt*.05, scroll += speed*dt */
  var KI = "forge-runner-initials", KP = "forge-runner-pid";
  var top = [], flags = [], live = false, mine = 0, open = false, panel = null, entry = null, askedBad = false;
  function lsg(k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lss(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function pid() { var p = lsg(KP) || ""; return /^[a-f0-9]{16}$/.test(p) ? p : "" }
  function initials() { var i = (lsg(KI) || "").toUpperCase(); return /^[A-Z0-9]{1,3}$/.test(i) ? i : "" }
  function req(path, opt) {
    try {
      return fetch(API + path, opt || {}).then(function (r) { return r.json().then(function (j) { j._s = r.status; return j }) })
        .catch(function () { return null });
    } catch (e) { return Promise.resolve(null) }
  }
  /* fetch flags + top 10 (call on page load, and it is re-called after each submit) */
  function load() {
    return req("/leaderboard?limit=10").then(function (j) {
      if (j && j.top && j.flags) { top = j.top; flags = j.flags; live = true }
      return j;
    });
  }
  /* world x of a score (px from the run's start) and its screen x given the current score.
     playerX = PX + PW/2 (56 + 45/2 in the game), the same anchor drawGhost() uses. */
  function worldX(score) { return score * PPP }
  function screenX(flagScore, curScore, playerX) { return Math.round((playerX == null ? 78.5 : playerX) + (flagScore - curScore) * PPP) }

  /* pixel flag with initials; call every frame from the game's draw, after the ground, before the player.
     o: {gy: ground y (GY), px: player x anchor, x0: left visible x (XO), w: visible width (VW), font} */
  /* labels: rendered once per (text, colour, size) into a small outlined canvas and blitted at device pixels, so they
     stay >= 11-13 CSS px at any zoom (portrait 1.35x, landscape, desktop) with no per-frame text rendering */
  var groundCss = 0, cvTopV = null, cvTopW = -1;
  function cvTop(cv) { if (cvTopW !== cv.width) { cvTopW = cv.width; cvTopV = cv.getBoundingClientRect().top } return cvTopV }
  var LBL = {}, lblDpr = 0, lblCw = 0, MONO = "ui-monospace,Menlo,Consolas,monospace";
  function label(t, color, px) {
    var k = t + "|" + color + "|" + px, c = LBL[k];
    if (c) return c;
    c = document.createElement("canvas");
    var o = c.getContext("2d"), f = "bold " + px + "px " + MONO, lw = Math.max(2, Math.round(px / 4.5));
    o.font = f;
    var tw = Math.ceil(o.measureText(t).width), pd = lw + 1;
    c.width = tw + 2 * pd; c.height = Math.ceil(px * 1.25) + 2 * pd;
    o.font = f; o.textBaseline = "alphabetic"; o.lineJoin = "round"; o.lineWidth = lw;
    o.strokeStyle = "rgba(5,7,13,.9)"; o.strokeText(t, pd, pd + Math.round(px * 0.95));
    o.fillStyle = color; o.fillText(t, pd, pd + Math.round(px * 0.95));
    c._a = pd + Math.round(px * 0.95); /* baseline offset */
    return (LBL[k] = c);
  }
  function draw(ctx, curScore, o) {
    if (!ctx) return;
    o = o || {};
    var gy = o.gy == null ? 232 : o.gy, x0 = o.x0 || 0, w = o.w || 600, me = initials();
    var cv = ctx.canvas, m = ctx.getTransform ? ctx.getTransform() : { a: 1, d: 1, e: 0, f: 0 };
    if (cv && cv.width !== lblCw) { lblCw = cv.width; var cr = cv.getBoundingClientRect(); lblDpr = cr.width ? cv.width / cr.width : 1; LBL = {} }
    var dp = lblDpr || 1, pxI = Math.round(13 * dp), pxS = Math.round(11 * dp);
    if (cv && lblDpr) { var r0 = cv.getBoundingClientRect ? cvTop(cv) : 0; groundCss = r0 + (gy * m.d + m.f) / lblDpr }
    if (panel && panelFit) { var cm = chipMin(); if (cm && parseInt(panel.style.top, 10) < cm) panelFit() }
    if (!flags.length) return; /* (after groundCss: the panel is placed on the real ground line even with no flags yet) */
    ctx.save();
    for (var pass = 0; pass < 2; pass++) {
      /* pass 0: pole + cloth in game units; pass 1: cached labels in device pixels (one transform switch per frame) */
      if (pass) ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (var i = 0; i < flags.length; i++) {
        var f = flags[i], x = screenX(f.score, curScore, o.px);
        if (x < x0 - 40 || x > x0 + w + 40) continue;
        var passed = curScore >= f.score, own = me && f.initials === me && f.score === mine;
        var c = own ? "#22d3ee" : i === flags.length - 1 ? "#facc15" : "#f97316";
        ctx.globalAlpha = passed ? .35 : .9;
        if (!pass) {
          if (!hintDone && x > x0 && x < x0 + w) hint();
          ctx.fillStyle = "#94a3b8"; ctx.fillRect(x, gy - 30, 2, 30);            /* pole */
          ctx.fillStyle = c; ctx.fillRect(x + 2, gy - 30, 12, 8);                 /* cloth */
          ctx.fillStyle = "#05070d"; ctx.fillRect(x + 4, gy - 28, 2, 2); ctx.fillRect(x + 8, gy - 26, 2, 2); /* pixel detail */
          continue;
        }
        /* per-flag label cache (no per-frame strings or text rendering); centred on the pole, just above the cloth */
        if (f._k !== pxI + c) { f._k = pxI + c; f._li = label(f.initials, c, pxI); f._ls = label(String(f.score), "#cbd5e1", pxS) }
        var li = f._li, ls = f._ls, X = Math.round((x + 1) * m.a + m.e), Y = Math.round((gy - 33) * m.d + m.f) - Math.round(pxI * 0.3);
        ctx.drawImage(li, X - (li.width >> 1), Y - li._a);
        ctx.drawImage(ls, X - (ls.width >> 1), Y - li._a - ls.height + Math.round(pxS * 0.2));
      }
    }
    ctx.restore();
  }

  /* every node starts as display:block;position:static;font:inherit: the game's stylesheet has .ui{position:absolute;display:none;font:...} */
  function el(tag, css, text) { var e = document.createElement(tag); e.style.cssText = "display:block;position:static;font:inherit;" + (css || ""); if (text != null) e.textContent = text; e.className = "ui"; return e }
  var BOX = "position:fixed;left:50%;transform:translateX(-50%);z-index:20;background:rgba(5,7,13,.94);border:2px solid #f97316;" +
    "border-radius:10px;color:#f1f5f9;font:bold 14px ui-monospace,Menlo,Consolas,monospace;padding:10px 12px;text-align:center;" +
    "touch-action:manipulation;user-select:none;-webkit-user-select:none;box-sizing:border-box;max-width:calc(100vw - 12px);";
  var BTN = "display:block;position:static;min-width:44px;min-height:44px;margin:0;border:1px solid #334155;border-radius:8px;background:#0b1020;" +
    "color:#f1f5f9;font:bold 18px ui-monospace,Menlo,Consolas,monospace;padding:0 10px;cursor:pointer;touch-action:manipulation;";
  function stop(e) { e.stopPropagation() }
  function guard(n) { ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click"].forEach(function (t) { n.addEventListener(t, stop) }) }
  function land() { return window.innerWidth > window.innerHeight }
  /* vertical placement: portrait -> centred in the sky above the ground line; landscape -> centred in the viewport */
  /* portrait game over: the top-10 panel's top must be >= 8 px below the mission chips (bottom edge recorded by 10-layout.js) */
  var panelFit = null;
  function chipMin() { return typeof ovChipB === "number" && ovChipB > 0 && performance.now() - ovChipT < 1000 && typeof state !== "undefined" && state === "over" ? Math.ceil(ovChipB + 8) : 0 }
  function place(box, cfgTop, below) {
    if (cfgTop) { box.style.top = cfgTop; return }
    var vh = window.innerHeight, h = box.offsetHeight, g = groundCss > 0 && groundCss <= vh ? groundCss : land() ? vh : Math.round(vh * 0.66);
    var t = land() ? (vh - h) / 2 : below ? g - h - 10 : Math.max(56, (g - h) / 2); /* portrait entry: clear of the HUD when it fits */
    var cb = below && !land() ? chipMin() : 0; if (cb && t < cb) t = cb; /* portrait game over: below the mission chips */
    box.style.top = Math.max(6, Math.min(vh - h - 6, Math.round(t))) + "px";
  }

  /* arcade 3-letter entry, thumb-sized and keyboard-free: 3 slots + an A-Z/0-9 grid (no <input>, so no soft keyboard,
     no viewport shift or zoom). Tap a letter = fill the current slot and move on; tap a slot to pick it; DEL steps back.
     Keys still work (letters, arrows up/down/left/right, Backspace, Enter, Esc). Resolves with initials or "" if skipped. */
  var CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function ask() {
    return new Promise(function (done) {
      if (!document.body) return done("");
      var v = [-1, -1, -1], cur = 0, slots = [], t0 = Date.now(), L = land();
      open = true;
      entry = el("div", BOX + "top:6px;" + (L ? "width:min(620px,calc(100vw - 12px));padding:8px 12px;" : "width:min(340px,calc(100vw - 12px));"));
      guard(entry);
      entry.appendChild(el("div", "color:#f97316;margin-bottom:8px;font-size:15px", "NEW SCORE! ENTER INITIALS"));
      var row = el("div", "display:flex;gap:10px;justify-content:center;margin-bottom:8px");
      function tapOK() { return Date.now() - t0 > 350 } /* ignore taps carried over from the last jump */
      function paint() {
        for (var i = 0; i < 3; i++) { slots[i].textContent = v[i] < 0 ? "_" : CH[v[i]]; slots[i].style.borderColor = i === cur ? "#22d3ee" : "#334155"; slots[i].style.color = v[i] < 0 ? "#475569" : "#f1f5f9" }
        ok.style.opacity = v[0] < 0 ? ".45" : "1";
      }
      function b(t, css, f) { var x = el("button", BTN + (css || ""), t); x.type = "button"; x.addEventListener("click", function (e) { e.stopPropagation(); if (!tapOK()) return; f(); paint() }); return x }
      [0, 1, 2].forEach(function (i) {
        var sl = b("_", "width:52px;height:" + (L ? 48 : 58) + "px;font-size:" + (L ? 28 : 34) + "px;border-width:2px;padding:0", function () { cur = i });
        slots.push(sl); row.appendChild(sl);
      });
      entry.appendChild(row);
      var cols = L ? 12 : 6, gr = el("div", "display:grid;grid-template-columns:repeat(" + cols + ",minmax(44px,1fr));gap:" + (L ? 4 : 5) + "px;margin-bottom:8px");
      for (var k = 0; k < CH.length; k++) (function (n) {
        var c = b(CH[n], "padding:0;min-height:" + (L ? 44 : 46) + "px;" + (n >= 26 ? "color:#94a3b8;" : ""), function () { v[cur] = n; cur = Math.min(2, cur + 1) });
        c.setAttribute("data-ch", CH[n]); gr.appendChild(c);
      })(k);
      entry.appendChild(gr);
      var bar = el("div", "display:flex;gap:8px;justify-content:center");
      bar.appendChild(b("\u232B DEL", "font-size:15px;flex:1", function () { if (v[cur] < 0 && cur > 0) cur--; v[cur] = -1 }));
      bar.appendChild(b("SKIP", "font-size:15px;flex:1;color:#94a3b8", function () { close("") }));
      var ok = b("OK", "font-size:16px;flex:1.4;color:#05070d;background:#22d3ee;border-color:#22d3ee", function () { finish() });
      bar.appendChild(ok);
      entry.appendChild(bar);
      function close(r) {
        open = false; window.removeEventListener("keydown", key, true);
        if (entry && entry.parentNode) entry.parentNode.removeChild(entry); entry = null; done(r);
      }
      function finish() { var r = v.filter(function (n) { return n >= 0 }).map(function (n) { return CH[n] }).join(""); if (r) close(r) }
      function key(e) {
        e.stopPropagation(); /* keep the game from restarting while typing */
        var k = e.key, u = (k || "").toUpperCase();
        if (u.length === 1 && CH.indexOf(u) >= 0) { v[cur] = CH.indexOf(u); cur = Math.min(2, cur + 1) }
        else if (k === "ArrowUp") v[cur] = (v[cur] + 1) % 36;
        else if (k === "ArrowDown") v[cur] = (v[cur] + 35) % 36;
        else if (k === "ArrowLeft") cur = Math.max(0, cur - 1);
        else if (k === "Backspace") { if (v[cur] < 0 && cur > 0) cur--; v[cur] = -1 }
        else if (k === "ArrowRight") cur = Math.min(2, cur + 1);
        else if (k === "Enter") { e.preventDefault(); return finish() }
        else if (k === "Escape") return close("");
        else return;
        e.preventDefault(); paint();
      }
      window.addEventListener("keydown", key, true);
      paint(); document.body.appendChild(entry); place(entry, C.entryTop, false);
    });
  }

  /* ---- pending-best queue: a new personal best is never lost ----
     localStorage[KQ] = {s: score, d: dur, p: pid, i: initials, t: ms} holds the single highest unsent best.
     flush() sends it at most once at a time, never sooner than 10.5 s after the previous counted POST (the server allows
     1 per 10 s per pid; KT survives reloads), retries after 429 / network / offline / 5xx, and is also called on page
     load, at the start of each run and on the browser's "online" event. It is cleared once the server confirms a best
     >= the queued score. A score that is not above the confirmed best (KS) is not submitted at all. */
  var KQ = "forge-runner-lb-pending", KS = "forge-runner-lb-best", KT = "forge-runner-lb-last", GAP = 10500;
  var busy = false, tmr = 0, tries = 0;
  function num(k) { var n = parseInt(lsg(k), 10); return n > 0 ? n : 0 }
  function pend() { try { var q = JSON.parse(lsg(KQ) || "null"); return q && q.s > 0 && /^[a-f0-9]{16}$/.test(q.p || "") ? q : null } catch (e) { return null } }
  function queue(score, dur) {
    var p = pid(), q = pend();
    if (!p || score <= num(KS)) return false;
    if (!q || score > q.s) lss(KQ, JSON.stringify({ s: score, d: dur, p: p, i: initials(), t: Date.now() }));
    return true;
  }
  function later(ms) { clearTimeout(tmr); tmr = setTimeout(function () { tmr = 0; flush(true) }, Math.max(0, ms)) }
  /* bg = true for background sends (timer / load / run start / online): refreshes the panel if it is showing */
  function flush(bg) {
    var q = pend(), ini = initials();
    if (C.ro) return Promise.resolve(null); /* read-only (demo / ?pu= / ?sk=): never submit */
    if (!q || !ini || busy) return Promise.resolve(q ? { queued: true } : null); /* no initials yet: the next game over asks */
    var wait = num(KT) + GAP - Date.now();
    if (wait > 0) { later(wait); return Promise.resolve({ queued: true }) }
    if (navigator.onLine === false) return Promise.resolve({ queued: true }); /* the "online" listener flushes */
    busy = true; clearTimeout(tmr); tmr = 0;
    var prevT = lsg(KT); lss(KT, String(Date.now()));
    return req("/score", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", keepalive: true,
      body: JSON.stringify({ pid: q.p, initials: ini, score: q.s, dur: q.d }) }).then(function (j) {
      busy = false;
      var cur = pend();
      if (j && j.ok) {
        tries = 0; mine = j.score; lss(KS, String(Math.max(num(KS), j.score)));
        if (cur && cur.s > j.score) later(GAP); else lss(KQ, ""); /* a higher best was queued meanwhile: send that next */
        if (bg && panel && !open) load().then(function () { if (panel && !open) showTop(j) });
        return j;
      }
      if (j && j._s === 400) { /* not counted by the server's rate limit */
        lss(KT, prevT || "");
        if (j.error === "initials") { lss(KI, ""); return j } /* keep the score; gameOver() asks for new initials */
        lss(KQ, ""); return j; /* implausible / malformed: permanent, drop it */
      }
      if (j && j._s === 429) { later(GAP); return { queued: true, _s: 429 } }
      tries++; if (tries <= 5) later(GAP * tries); /* network, offline, non-JSON, 403, 5xx: back off (10, 21, 31.. s) */
      return { queued: true };
    }, function () { busy = false; return { queued: true } });
  }
  /* call once from die(): FRLB.gameOver(Math.floor(score), runS) */
  function gameOver(score, dur) {
    if (C.ro) return Promise.resolve(null);
    /* integrator: never ask for initials while the board is unreachable (raw Function URLs have no /api/*); retry the load once */
    if (!live) return load().then(function () { if (live) return gameOver(score, dur); queue(Math.floor(score), Math.ceil(dur || 0)); return null });  /* ceil: never under the run time, so the server ceiling always holds */
    score = Math.floor(score); dur = Math.max(0, Math.min(36000, Math.ceil(dur || 0)));
    if (!(score >= 1)) { showTop(); return Promise.resolve(null) }
    var isBest = queue(score, dur);
    if (!isBest && initials()) { showTop(); return Promise.resolve(null) } /* not above the confirmed best: nothing to send */
    function getIni() { return initials() ? Promise.resolve(initials()) : ask().then(function (i) { if (i) lss(KI, i); return i }) }
    return getIni().then(function (i) {
      if (!i) return pend() ? { queued: true } : null;
      return flush(false).then(function (r) {
        if (r && r._s === 400 && r.error === "initials" && !askedBad) {
          askedBad = true; /* blocked initials: ask once more, then send the same queued score */
          return getIni().then(function (i2) { return i2 ? flush(false) : { queued: true } });
        }
        return r;
      });
    }).then(function (r) { return load().then(function () { showTop(r); return r }) })
      .catch(function () { return null });
  }
  /* top-10 panel for the game-over screen; r = optional submit result to show the player's rank.
     Portrait: sits in the sky just above the ground line (below the GAME OVER text, above Share).
     Landscape: right-hand side, vertically centred, clear of the HUD. Taps on the list fall through to the game
     (tap to retry as before); RETRY is a real control that does the same, X closes the panel. */
  function showTop(r, st) {
    hidePanel();
    if (!top.length || !document.body || open) return;
    var L = land(), fs = 13, nTop = st && L ? 4 : 10; /* landscape start screen: top 4 in the lower right, clear of the title and hint */
    panel = el("div", BOX + "min-width:200px;font-size:" + fs + "px;line-height:" + (L ? 1.35 : 1.2) + ";padding:6px 10px 8px;pointer-events:" + (st ? "none" : "auto") + ";" +
      (L ? "left:auto;right:8px;transform:none;" : ""));
    var hd = el("div", "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px");
    var hdT = el("div", "color:#f97316", "GLOBAL TOP " + nTop); hd.appendChild(hdT);
    var x = el("button", BTN + "pointer-events:auto;min-width:44px;min-height:44px;margin:-6px -8px -4px 0;border:0;background:none;color:#94a3b8;font-size:20px", "\u2715");
    x.type = "button"; x.setAttribute("aria-label", "Close leaderboard"); guard(x);
    x.addEventListener("click", function (e) { e.stopPropagation(); hidePanel() });
    hd.appendChild(x); panel.appendChild(hd);
    var me = initials();
    top.slice(0, nTop).forEach(function (t, i) {
      var own = me && t.initials === me && t.score === mine;
      var row = el("div", "white-space:pre;text-align:left;color:" + (own ? "#22d3ee" : i ? "#f1f5f9" : "#facc15"),
        (i + 1 < 10 ? " " : "") + (i + 1) + " " + (t.initials + "   ").slice(0, 3) + " " + (t.cc ? t.cc : "  ") + "  " + String(t.score).padStart(5, "0"));
      if (!own) row.setAttribute("data-lr", i); panel.appendChild(row);
    });
    var q = pend();
    if (q && (!r || !r.ok)) panel.appendChild(el("div", "color:#facc15;margin-top:3px", "BEST " + q.s + " SAVED, SENDING…"));
    if (r && r.ok && r.rank) panel.appendChild(el("div", "color:#22d3ee;margin-top:3px", (r.best ? "NEW BEST! " : "BEST " + r.score + " ") + "#" + r.rank));
    /* RETRY: deliberately not class "ui"/not a <button>, so its touch/mouse event reaches the game's tap-to-retry */
    var rt = document.createElement("div");
    rt.style.cssText = BTN + "display:flex;align-items:center;justify-content:center;pointer-events:auto;margin-top:5px;color:#05070d;background:#22d3ee;border-color:#22d3ee;font-size:16px";
    rt.setAttribute("role", "button"); rt.textContent = st ? "PLAY \u25B6" : "RETRY \u25B6";
    panel.appendChild(rt);
    panel.className = ""; /* not "ui": a tap on RETRY must reach the game's tap-to-retry (isUI ignores .ui) */
    /* game over: a tap on the rest of the panel (the list) is swallowed, so only RETRY retries from it. The start-screen panel
       stays tap-through (any tap starts) */
    if (!st) ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click"].forEach(function (t) {
      panel.addEventListener(t, function (e) { if (!rt.contains(e.target)) e.stopPropagation() });
    });
    document.body.appendChild(panel); place(panel, C.panelTop, true);
    /* portrait game over: when the panel can't fit between the mission chips and the ground line, drop list rows from the
       bottom (never the player's own row, never below the top 5) until it does */
    if (!st && !L && !C.panelTop) {
      var n = Math.min(nTop, top.length);
      panelFit = function () {
        if (!panel || !chipMin()) return;
        place(panel, C.panelTop, true);
        var gl = groundCss > 0 && groundCss <= window.innerHeight ? groundCss : Math.round(window.innerHeight * 0.66), lr;
        while (panel.getBoundingClientRect().bottom > gl - 9 && n > 5 && (lr = panel.querySelectorAll("[data-lr]")).length) {
          var last = lr[lr.length - 1]; if (+last.getAttribute("data-lr") < 5) break;
          last.parentNode.removeChild(last); n--; hdT.textContent = "GLOBAL TOP " + n; place(panel, C.panelTop, true);
        }
      };
      panelFit(); /* again from draw() if the chips were not drawn yet / move later */
    }
    if (st && L && !C.panelTop) panel.style.top = Math.max(6, window.innerHeight - panel.offsetHeight - 6) + "px";
  }
  function hidePanel() { if (panel && panel.parentNode) panel.parentNode.removeChild(panel); panel = null; panelFit = null }
  /* call from start() */
  /* start screen: show the top 10 until the first run starts (hide() from start()); same placement as game over */
  var started = false;
  function showStart() { if (!C.ro && !started && !panel && !open && top.length) showTop(null, true) }
  /* one-time hint the first time flags are on screen (remembered in localStorage) */
  var KH = "forge-runner-lb-hint", hintEl = null, hintDone = !!lsg(KH);
  function hint() {
    if (hintEl || hintDone || C.ro || !document.body) return;
    hintDone = true; lss(KH, "1");
    hintEl = document.createElement("div");
    hintEl.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);top:" + (land() ? 56 : 64) + "px;z-index:19;pointer-events:none;" +
      "background:rgba(5,7,13,.85);border:1px solid #f97316;border-radius:999px;padding:6px 14px;color:#f1f5f9;" +
      "font:bold 14px ui-monospace,Menlo,Consolas,monospace;white-space:nowrap;max-width:calc(100vw - 16px);transition:opacity .4s";
    hintEl.textContent = "\u2691 Flags = other players' best runs";
    document.body.appendChild(hintEl);
    setTimeout(function () { if (hintEl) hintEl.style.opacity = "0" }, 3600);
    setTimeout(function () { if (hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl); hintEl = null }, 4100);
  }
  function hide() { started = true; hidePanel(); flush(true) } /* run start: a quick-restart best goes out when the 10 s gap allows */

  window.FRLB = { load: load, worldX: worldX, screenX: screenX, draw: draw, gameOver: gameOver, showTop: showTop, hide: hide,
    isOpen: function () { return open }, initials: initials, flags: function () { return flags }, top: function () { return top },
    pending: pend, flush: function () { return flush(true) } };
  mine = num(KS);
  window.addEventListener("online", function () { tries = 0; flush(true) });
  load().then(function () { showStart(); flush(true) });
})();

/* hook 2 (from draw(), after drawGhost()): flags on the track; a short chirp when a flag is passed mid-run */
var lbPS=0;
function lbDraw(){
  if(!window.FRLB||state==="start")return;
  FRLB.draw(ctx,score,{gy:GY,px:PX+PW/2,x0:XO,w:VW});
  if(state==="run"&&score>lbPS){
    var f=FRLB.flags();
    for(var i=0;i<f.length;i++)if(lbPS<f[i].score&&score>=f[i].score){sfxFlagPass();break}
  }
  lbPS=score;
}
/* hook 3 (from die()): entry + submit + top-10 panel; fanfare on a confirmed new personal best */
function lbOver(s,runS){
  if(typeof rsBn!=="undefined"&&rsBn>0)return;  /* rescue fairness (F2): a run that bounced off a crate is not submitted */
  FRLB.gameOver(s,runS).then(function(r){if(r&&r.ok&&r.best)sfxNewBest()});
}
`;
