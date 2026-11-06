// Opening crest zoom (portrait camera only): absolute zoom is OCZ (> PZW 1.12) at t=0 of a start-hill run,
// smoothstep back to exactly the layout zoom by OCZT (3 s), and landscape/desktop never leave 1.
// Runs the real functions from 04-viewport.js + 14-render.js (no browser). Part of npm test.
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frag = (p) => {
  const t = readFileSync(join(ROOT, p), "utf8");
  return t.slice(t.indexOf("String.raw`") + "String.raw`".length, t.lastIndexOf("`"));
};
const vp = frag("src/client/04-viewport.js");
const render = frag("src/client/14-render.js");
const layout = readFileSync(join(ROOT, "src/client/10-layout.js"), "utf8");
const poki = readFileSync(join(ROOT, "src/client/poki/mobile.js"), "utf8");
function grab(src, name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("missing " + name);
  let i = src.indexOf("{", start), d = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") d++;
    else if (c === "}") { d--; if (d === 0) return src.slice(start, i + 1); }
  }
  throw new Error("unclosed " + name);
}
const cam = ["ocMul", "ocZoom", "ocPush", "ocPop"].map((n) => grab(render, n)).join("\n") + "\nvar ocSPC=null;\n";

const api = new Function("localStorage", "KEY", `"use strict";
  var __rm = false;
  function rm(){return __rm}
  var state = "start", runS = 0, hlSH = 0, hsc = 0, hlSX = 0, skyK = 0, SPC = new Map();
  ${vp}
  ${cam}
  return {
    ocZoom: ocZoom, ocMul: ocMul, ocPush: ocPush, ocPop: ocPop,
    get PZW(){return PZW}, get OCZ(){return OCZ}, get OCZT(){return OCZT}, get OCX(){return OCX}, get OCY(){return OCY},
    get PX(){return PX}, get GY(){return GY},
    set: function (o) {
      if ("ZM" in o) ZM = o.ZM; if ("XO" in o) XO = o.XO; if ("OY" in o) OY = o.OY; if ("VW" in o) VW = o.VW;
      if ("K" in o) K = o.K; if ("SX" in o) SX = o.SX; if ("SY" in o) SY = o.SY;
      if ("state" in o) state = o.state; if ("runS" in o) runS = o.runS;
      if ("hlSH" in o) hlSH = o.hlSH; if ("hsc" in o) hsc = o.hsc; if ("hlSX" in o) hlSX = o.hlSX;
      if ("skyK" in o) skyK = o.skyK; if ("SPC" in o) SPC = o.SPC; if ("rm" in o) __rm = o.rm;
    },
    get: function () { return { K: K, XO: XO, OY: OY, VW: VW, SX: SX, SY: SY, ZM: ZM, skyK: skyK, SPC: SPC }; }
  };
`)({ getItem: () => null, setItem() {} }, "k");

let failed = 0;
const t = (name, fn) => {
  try { fn(); console.log("ok  " + name); }
  catch (e) { failed++; console.error("FAIL " + name + "\n" + (e.stack || e.message)); }
};

const portrait = { ZM: api.PZW, XO: 44, OY: 636, VW: 600 / api.PZW, K: 4, SX: 0, SY: 0, state: "run", hlSH: 126, hsc: 0, hlSX: 1001, rm: false, skyK: 2 };

t("constants: start zoom above the portrait fit, ease ends at 3 s", () => {
  assert.ok(api.OCZ > api.PZW, `OCZ ${api.OCZ} should be > PZW ${api.PZW}`);
  assert.equal(api.PZW, 1.12);
  assert.equal(api.OCZT, 3);
});

t("portrait t=0 is the start zoom; t=1.5 is the smoothstep midpoint; t=3 and later are exactly 1.12", () => {
  api.set({ ...portrait, runS: 0 });
  assert.ok(api.ocZoom() > 1.12);
  assert.equal(api.ocZoom(), api.OCZ);
  api.set({ runS: 1.5 });
  assert.ok(Math.abs(api.ocZoom() - (api.OCZ + api.PZW) / 2) < 1e-9);
  api.set({ runS: 3 });
  assert.equal(api.ocZoom(), api.PZW);
  assert.equal(api.ocZoom(), 1.12);
  api.set({ runS: 10 });
  assert.equal(api.ocZoom(), 1.12);
});

t("portrait zoom eases down through the opening and never rises again", () => {
  let prev = Infinity;
  for (const s of [0, 0.1, 0.5, 1, 1.5, 2, 2.5, 2.99]) {
    api.set({ ...portrait, runS: s });
    const z = api.ocZoom();
    assert.ok(z > 1.12, `t=${s} zoom ${z}`);
    assert.ok(z < prev, `t=${s} zoom ${z} rose above ${prev}`);
    prev = z;
  }
  api.set({ runS: 3 });
  assert.equal(api.ocZoom(), 1.12);
});

t("landscape and desktop stay at 1 for the whole opening", () => {
  for (const runS of [0, 0.1, 1, 2, 3, 30]) {
    api.set({ ...portrait, ZM: 1, XO: 0, VW: 600, OY: 0, runS });
    assert.equal(api.ocZoom(), 1, "t=" + runS);
    assert.equal(api.ocMul(), 1);
    assert.equal(api.ocPush(), null);
  }
});

t("reduced motion, title screen, no start hill, and a jumped hsc do not zoom", () => {
  api.set({ ...portrait, runS: 0, rm: true });
  assert.equal(api.ocZoom(), 1.12);
  api.set({ rm: false, state: "start" });
  assert.equal(api.ocZoom(), 1.12);
  api.set({ state: "run", hlSH: 0 });
  assert.equal(api.ocZoom(), 1.12);
  api.set({ hlSH: 126, hsc: 1001 + 2400 + 1 });
  assert.equal(api.ocZoom(), 1.12, "hills-browser style jumped hsc");
});

t("push keeps the anchor on the same pixel and pop restores the layout camera", () => {
  const spc = new Map();
  api.set({ ...portrait, runS: 0, K: 4, SX: 3, SY: -2, SPC: spc, skyK: 7 });
  const g0 = api.get();
  const saved = api.ocPush();
  assert.ok(saved);
  const g1 = api.get();
  const z = g1.K / g0.K;
  assert.ok(Math.abs(z - api.OCZ / api.PZW) < 1e-9);
  const ax = api.PX - api.OCX, ay = api.GY - 126 + api.OCY;
  assert.ok(Math.abs((ax + g0.SX - g0.XO) * g0.K - (ax + g1.SX - g1.XO) * g1.K) < 1e-6, "anchor x");
  assert.ok(Math.abs((ay + g0.SY + g0.OY) * g0.K - (ay + g1.SY + g1.OY) * g1.K) < 1e-6, "anchor y");
  assert.notEqual(g1.SPC, spc);
  assert.ok(g1.VW < g0.VW);
  api.ocPop(saved);
  const g2 = api.get();
  assert.equal(g2.K, g0.K);
  assert.equal(g2.XO, g0.XO);
  assert.equal(g2.OY, g0.OY);
  assert.equal(g2.VW, g0.VW);
  assert.equal(g2.SX, g0.SX);
  assert.equal(g2.SY, g0.SY);
  assert.equal(g2.SPC, spc);
  assert.equal(g2.skyK, -1, "sky cache invalidated so the next frame is the layout zoom");
  assert.equal(g2.ZM, api.PZW, "layout ZM untouched");
});

t("draw applies the camera to the world and restores it before the HUD", () => {
  const draw = render.slice(render.indexOf("function draw()"));
  const push = draw.indexOf("ocPush()");
  const pop = draw.indexOf("ocPop(oc)");
  const hud = draw.indexOf("drawHud()");
  assert.ok(push > 0 && push < pop && pop < hud, "ocPush, ocPop, then drawHud");
  assert.ok(draw.indexOf("try{base();") > 0 && draw.indexOf("}finally{ocPop(oc)}") > 0);
});

t("both builds keep the portrait layout zoom at PZW (the opening camera multiplies it in draw only)", () => {
  assert.match(layout, /ZM=tall\?PZW:1/);
  assert.match(poki, /ZM=tall\?PZW:1/);
  const game = readFileSync(join(ROOT, "dist/poki/game.js"), "utf8");
  const site = readFileSync(join(ROOT, "dist/index.mjs"), "utf8");
  assert.match(game, /function ocZoom\(\)/);
  assert.match(site, /function ocZoom\(\)/);
});

if (failed) { console.error("OPENING ZOOM FAILED " + failed); process.exit(1); }
console.log("OPENING ZOOM PASSED");
