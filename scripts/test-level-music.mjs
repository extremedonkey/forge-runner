// LEVEL MUSIC tests (Audio; L6 ARC FURNACE): evaluates the real 08-audio.js engine + 08e-level-music.js + 08f-enemy-sfx.js in
// one scope (like the client IIFE) with a fake AudioContext (no-op nodes with AudioParam-like fields; setPeriodicWave and
// exponential ramps throw like the real ones), captured setInterval/setTimeout (they only run when a test advances the
// clock), document / mute button / window stubs, lsg/lss and a seeded Math. Checks the track table, the level count (LVN),
// musicLevel / levelSting / bossMusic for L6, and the L6 arc SFX (EN_MAP.arc).
// Run: node scripts/test-level-music.mjs (also via npm test).
import assert from "node:assert/strict";
import AUDIO from "../src/client/08-audio.js";
import LM from "../src/client/08e-level-music.js";
import ESFX from "../src/client/08f-enemy-sfx.js";
import { POKI_FORBIDDEN } from "../src/client/poki/script.mjs";
const body = (f) => f.slice(1, -1);
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("ok   level-music:", name); };
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// env: { snd: false = the player muted (fr_snd2 "0"), level: currentLevel() stub value (undefined = no currentLevel at all,
// like a build without 06d), lm: replacement 08e text, seed }
function game(env = {}) {
  let seed = env.seed || 1;
  const rnd = { n: 0 };
  const M = Object.create(Math); M.random = () => { rnd.n++; return (seed = (seed * 16807) % 2147483647) / 2147483647; };
  const rec = { starts: 0, tones: [], noises: [], steps: [], pans: 0 };
  const clock = { ms: 0 }, tm = { iv: [], to: [], id: 0 }, store = { fr_snd2: env.snd === false ? "0" : "1" }, ls = [];
  const P = (v) => ({ value: v, ev: [], setValueAtTime(x, t) { this.ev.push(["set", x, t]); }, linearRampToValueAtTime(x, t) { this.ev.push(["lin", x, t]); },
    exponentialRampToValueAtTime(x, t) { if (!(x > 0)) throw new RangeError("exponentialRampToValueAtTime: value must be > 0"); this.ev.push(["exp", x, t]); },
    setTargetAtTime(x, t) { this.ev.push(["tgt", x, t]); }, cancelScheduledValues(t) { this.ev.push(["cancel", t]); } });
  const node = (kind) => ({ kind, gain: P(1), frequency: P(440), playbackRate: P(1), pan: P(0), Q: P(1), type: "", buffer: null, loop: false, onended: null,
    connect(n) { return n; }, disconnect() {}, start() { rec.starts++; }, stop() {},
    setPeriodicWave(w) { if (!w || !w.real) throw new TypeError("setPeriodicWave: parameter 1 is not of type 'PeriodicWave'"); } });
  const fakeAc = { currentTime: 0, state: env.locked ? "suspended" : "running", sampleRate: 8000, destination: node("dest"),
    createGain: () => node("gain"), createOscillator: () => node("osc"), createBufferSource: () => node("src"),
    createBiquadFilter: () => node("biquad"), createStereoPanner: () => { rec.pans++; return node("pan"); },
    createPeriodicWave: (re, im) => ({ real: re, imag: im }),
    createBuffer: (ch, n) => { const d = new Float32Array(n); return { getChannelData: () => d }; },
    resume() { if (!env.locked) this.state = "running"; return Promise.resolve(); }, suspend() { this.state = "suspended"; return Promise.resolve(); } };
  const svgPath = { setAttribute() {} }, svg = { style: {}, setAttribute() {}, firstChild: svgPath };
  const btn = { style: {}, innerHTML: "", firstChild: svg, setAttribute() {}, addEventListener(e, f) { ls.push(["btn:" + e, f]); }, blur() {} };
  const win = { AudioContext: function () { return fakeAc; }, addEventListener(e, f) { ls.push([e, f]); } };
  const doc = { getElementById: () => btn, hidden: false };
  const pre = `"use strict";var window=__w,document=__d,Math=__M,performance={now:function(){return __c.ms}};
    function lsg(k){return Object.prototype.hasOwnProperty.call(__st,k)?__st[k]:null}function lss(k,v){__st[k]=v}
    function setInterval(f){__tm.iv.push(f);return ++__tm.id}
    function setTimeout(f,ms){var id=++__tm.id;__tm.to.push({id:id,f:f,due:__c.ms+(+ms||0)});return id}
    function clearTimeout(id){__tm.to=__tm.to.filter(function(o){return o.id!==id})}
    var Q={get:function(){return null}};var demo=false,state="run",runS=0,speed=340,py=0,paused=false;
    ${env.level === undefined ? "" : "function currentLevel(){return __lv.v}"}`;
  const post = `
    var __t0=tone,__n0=noise,__m0=mstep;
    tone=function(A,f1,f2,t,d,w,v,s,o){__r.tones.push({f1:f1,f2:f2,t:t,d:d,w:w,v:v,s:s});return __t0(A,f1,f2,t,d,w,v,s,o)};
    noise=function(A,t,d,rate,v,o){__r.noises.push({t:t,d:d,rate:rate,v:v});return __n0(A,t,d,rate,v,o)};
    mstep=function(A,T,i,t,L,sd,o){__r.steps.push({j:TRK.indexOf(T),i:i,t:t,L:L});return __m0(A,T,i,t,L,sd,o)};
    return {TRK:TRK,TRN:TRN,LVN:LVN,BT:BT,LS_W:LS_W,EN_MAP:EN_MAP,mstep:mstep,
      musicLevel:musicLevel,levelSting:levelSting,bossMusic:bossMusic,bossOn:bossOn,startMusic:startMusic,enemySfx:enemySfx,
      audioAdPause:audioAdPause,audioAdResume:audioAdResume,mtick:mtick,
      fns:{sfxWarnArc:sfxWarnArc,sfxArcTick1:sfxArcTick1,sfxArcTick2:sfxArcTick2,sfxArcTick3:sfxArcTick3,sfxArcZap:sfxArcZap},
      get TI(){return TI},get mPend(){return mPend},get mI(){return mI},get MB(){return MB},get AU(){return AU},get snd(){return snd},
      get lsN(){return lsN},get lsEA(){return lsEA},get lsEnd(){return lsEnd},set mLT(v){mLT=v}};`;
  const lv = { v: env.level };
  const g = new Function("__w", "__d", "__M", "__c", "__st", "__tm", "__lv", "__r", pre + body(AUDIO) + (env.lm ?? body(LM)) + body(ESFX) + post)(win, doc, M, clock, store, tm, lv, rec);
  const fire = (type) => { for (const [e, f] of ls) if (e === type) f({ type }); };
  // advance the clock in 10 ms steps: the 50 ms scheduler (mtick) and due timeouts run like in a browser
  const run = (sec) => {
    for (let k = 0, n = Math.round(sec * 100); k < n; k++) {
      fakeAc.currentTime += 0.01; clock.ms += 10;
      for (let o; (o = tm.to.find((x) => x.due <= clock.ms));) { tm.to = tm.to.filter((x) => x !== o); o.f(); }
      if (clock.ms % 50 === 0) for (const f of tm.iv) f();
    }
  };
  return { g, rec, rnd, ac: fakeAc, clock, lv, run, gesture: () => fire("pointerdown"), mute: () => fire("btn:click") };
}
// a live game: sound on, unlocked by a gesture, a run started (random pick), the scheduler past bar 1 (mI >= 16)
function live(env = {}) {
  const s = game(env); s.gesture(); assert.ok(s.g.AU && s.ac.state === "running", "unlocked"); s.g.startMusic(); s.run(2.5);
  assert.ok(s.g.mI >= 16, "past bar 1"); return s;
}

// ---------------------------------------------------------------- track table
t("track table: every TRK entry is well formed (8 bars of 16ths: 128-char lead, 8 roots / bass offsets / thirds, 16-step patterns) and plays through the engine's own mstep at every layer", () => {
  const s = game(); s.gesture();
  const { TRK } = s.g, PAT = /^[x.]{16}$/;
  TRK.forEach((T, j) => {
    const w = `TRK[${j}]`;
    assert.equal(typeof T.l, "string", w); assert.equal(T.l.length, 128, `${w} lead length`);
    assert.notEqual(T.l.charAt(0), ".", `${w} lead starts on a note or rest`);
    for (const c of T.l) assert.ok(c === "." || c === "_" || (c.charCodeAt(0) > 32 && c.charCodeAt(0) < 127 && c !== "`" && c !== "\\"), `${w} lead char ${JSON.stringify(c)}`);
    assert.equal(T.r.length, 8, `${w} roots`); assert.ok(T.r.every((r) => Number.isInteger(r) && r >= 24 && r <= 60), `${w} roots MIDI`);
    assert.equal(T.b.length, 8, `${w} bass`); assert.ok(T.b.every((b) => Number.isInteger(b) && b >= 0 && b <= 24), `${w} bass offsets`);
    assert.ok(/^\d{8}$/.test(T.q), `${w} q = 8 digits`);
    assert.ok(T.sd > 0 && T.sd <= 0.2 && T.s3 > 0 && T.s3 <= T.sd, `${w} sd/s3`);
    assert.ok(T.w.length === 2 && T.w.every((x) => Number.isInteger(x) && x >= 0 && x <= 3) && Number.isInteger(T.aw) && T.aw >= 0 && T.aw <= 3, `${w} waves`);
    for (const k of ["k", "k3", "sn", "h"]) assert.ok(PAT.test(T[k]), `${w}.${k}`);
    for (const k of ["kl", "a"]) assert.ok(T[k] === undefined || PAT.test(T[k]), `${w}.${k}`);
    for (let L = 0; L < 4; L++) {
      const sd = L > 2 ? T.s3 : T.sd, n0 = s.rec.tones.length;
      for (let i = 0; i < 128; i++) s.g.mstep(s.g.AU, T, i, 1 + i * sd, L, sd, null);
      assert.ok(s.rec.tones.slice(n0).every((x) => Number.isFinite(x.f1) && x.f1 > 20 && x.f1 < 8000 && x.d > 0 && x.v > 0), `${w} L${L} tones`);
    }
  });
});
t("layout: TRN 5 (the random pool), LVN 6, BT === TRN+6: L6 Arc Furnace at TRK[TRN+5] (F# minor, 200 BPM at L3, MIDI 73-90), the boss loop last", () => {
  const { g } = game({ snd: false });
  assert.equal(g.TRN, 5); assert.equal(g.LVN, 6); assert.equal(g.BT, g.TRN + 6); assert.equal(g.TRK.length, g.BT + 1);
  const L6 = g.TRK[g.TRN + 5], notes = [...L6.l].filter((c) => c !== "." && c !== "_").map((c) => c.charCodeAt(0));
  assert.equal(L6.r[0], 42, "F#2 root"); assert.equal(Math.round(15 / L6.s3), 200, "200 BPM at L3"); assert.equal(L6.aw, 3, "triangle arp");
  assert.ok(Math.min(...notes) >= 73 && Math.max(...notes) <= 90, "lead C#5-F#6");
  assert.equal(g.TRK[g.BT].kl, "xxxxxxxxxxxxxxxx", "TRK[BT] is the Crusher boss loop");
  assert.equal(g.TRK[g.TRN + 4].r[0], 48, "TRK[TRN+4] is still L5 (C)");
});

// ---------------------------------------------------------------- musicLevel
t("musicLevel(6): TRK[TRN+5] at once in bar 1 (muted, and live from its bar 1), queued as mPend for the next bar line later", () => {
  const m = game({ snd: false }); m.g.startMusic();
  assert.equal(m.g.musicLevel(6), true); assert.equal(m.g.TI, m.g.TRN + 5); assert.equal(m.g.mPend, -1);
  assert.equal(m.g.musicLevel(6), false, "already on it");
  const a = game(); a.gesture(); a.g.startMusic(); a.run(0.2); assert.ok(a.g.mI > 0 && a.g.mI < 16);
  assert.equal(a.g.musicLevel(6), true); assert.equal(a.g.TI, a.g.TRN + 5); assert.equal(a.g.mI, 0, "restarts from bar 1");
  const s = live(), prev = s.g.TI;
  assert.equal(s.g.musicLevel(6), true); assert.equal(s.g.mPend, s.g.TRN + 5); assert.equal(s.g.TI, prev, "not before the bar line");
  const n0 = s.rec.steps.length; s.run(2);
  const first = s.rec.steps.slice(n0).find((x) => x.j === s.g.TRN + 5);
  assert.ok(first && first.i === 0, "switched on a bar line, from its bar 1"); assert.equal(s.g.TI, s.g.TRN + 5); assert.equal(s.g.mPend, -1);
});
t("out of range: musicLevel(7) and levelSting(7) return false (also 0, 6.5, '6'; levelSting(1)); nothing changes", () => {
  const { g } = game({ snd: false }); g.startMusic(); const ti = g.TI;
  for (const n of [7, 0, 6.5, "6", NaN, undefined]) { assert.equal(g.musicLevel(n), false, `musicLevel(${n})`); assert.equal(g.levelSting(n), false, `levelSting(${n})`); }
  assert.equal(g.levelSting(1), false); assert.equal(g.TI, ti); assert.equal(g.mPend, -1);
});

// ---------------------------------------------------------------- levelSting
t("levelSting(6) with a running context: plays without throwing (F#4 A4 C#5 F#5 A5 C#6 in 25% pulse, then the arc discharge one step after the climax), ducks the music bus, fits the 1.5 s banner, and hands off to TRK[TRN+5] on the first bar line after it", () => {
  const s = live(); s.g.mLT = 3; s.run(2);
  const { g } = s, t0 = s.ac.currentTime, n0 = s.rec.tones.length, st0 = s.rec.starts, now = s.clock.ms;
  assert.equal(g.musicLevel(6), true, "06d: lvMusic(6) first"); assert.equal(g.mPend, g.TRN + 5);
  let r; assert.doesNotThrow(() => { r = g.levelSting(6); }); assert.equal(r, true);
  assert.ok(s.rec.starts - st0 >= 16, "sound played"); assert.equal(g.mPend, -1, "switch re-deferred to after the sting"); assert.equal(g.lsN, 6);
  const tn = s.rec.tones.slice(n0), run6 = tn.filter((x) => x.w === 1 && x.t < t0 + 6 * 0.07 - 1e-9);
  assert.deepEqual(run6.map((x) => Math.round(12 * Math.log2(x.f1 / 440) + 69)), [66, 69, 73, 78, 81, 85], "rise in F# minor");
  const c = t0 + 6 * 0.07, zap = tn.find((x) => x.f1 === 2400 && x.f2 === 180), thump = tn.find((x) => x.f1 === 95 && x.f2 === 40);
  assert.ok(zap && thump && near(zap.t, c + 0.07) && near(thump.t, c + 0.07), "discharge one rise step after the climax");
  assert.ok(near(g.lsEnd - now, 870, 1e-6) && g.lsEnd - now <= 1500, "d = 0.87 s, inside LV_BANNER 1.5 s");
  assert.ok(g.MB.gain.ev.some((e) => e[0] === "lin" && e[1] === 0.3), "music bus ducked to 30%");
  assert.equal(g.musicLevel(6), false, "held while the sting plays");
  const k0 = s.rec.steps.length; s.run(3);
  const first = s.rec.steps.slice(k0).find((x) => x.j === g.TRN + 5);
  assert.ok(first && first.i === 0 && first.t >= g.lsEA - 0.005, "TRK[TRN+5] from its bar 1, on a bar line at/after the sting end");
  assert.equal(g.TI, g.TRN + 5); assert.equal(g.lsN, 0); assert.ok(g.MB.gain.ev.some((e) => e[0] === "tgt" && e[1] === 1), "bus pinned back to full");
});
t("L6 sting level: per voice pulse <= .05, triangle <= .12, noise <= .09, and no instant starts more summed voice level than the death crash (noise .25 + pulse .09)", () => {
  const s = live(), n0 = s.rec.tones.length, m0 = s.rec.noises.length; s.g.levelSting(6);
  const tn = s.rec.tones.slice(n0), ns = s.rec.noises.slice(m0);
  assert.ok(tn.filter((x) => x.w < 3).every((x) => x.v <= 0.05) && tn.filter((x) => x.w === 3).every((x) => x.v <= 0.12) && ns.every((x) => x.v <= 0.09));
  const at = new Map(); for (const x of [...tn, ...ns]) { const k = x.t.toFixed(6); at.set(k, (at.get(k) || 0) + x.v); }
  assert.ok(Math.max(...at.values()) <= 0.25 + 0.09, `max onset sum ${Math.max(...at.values()).toFixed(3)}`);
});
t("silent levelSting(6) (muted / locked / ad pause): returns true, no sound, hands off at once: TRK[TRN+5] in bar 1, mPend later", () => {
  for (const env of [{ snd: false }, {}]) {   // muted; sound on but never unlocked (no AudioContext yet)
    const { g, rec } = game(env); g.startMusic();
    assert.equal(g.levelSting(6), true); assert.equal(g.TI, g.TRN + 5); assert.equal(rec.starts, 0); assert.equal(g.lsN, 0);
  }
  const k = game({ locked: true }); k.gesture(); k.g.startMusic(); assert.equal(k.ac.state, "suspended");
  const s0 = k.rec.starts; assert.equal(k.g.levelSting(6), true); assert.equal(k.g.TI, k.g.TRN + 5, "locked context: handoff"); assert.equal(k.rec.starts, s0);
  const a = live(); a.g.audioAdPause(); const s1 = a.rec.starts;
  assert.equal(a.g.levelSting(6), true); assert.equal(a.g.mPend, a.g.TRN + 5, "ad: queued for the next bar line"); assert.equal(a.rec.starts, s1);
});
t("LS_W: one sting wave per level (length LVN), each 0..3; L1-L5 unchanged, L6 = 25% pulse", () => {
  const { g } = game({ snd: false });
  assert.equal(g.LS_W.length, g.LVN); assert.ok(g.LS_W.every((w) => Number.isInteger(w) && w >= 0 && w <= 3));
  assert.deepEqual(g.LS_W.slice(0, 5), [0, 2, 1, 0, 2]); assert.equal(g.LS_W[5], 1);
});
t("negative control: with the old 5-entry wave table, levelSting(6) throws in setPeriodicWave (the fake catches the bug the hoisted LS_W fixes)", () => {
  const old = body(LM).replace("var LS_W=[0,2,1,0,2,1];", "var LS_W=[0,2,1,0,2];");
  assert.notEqual(old, body(LM));
  const s = game({ lm: old }); s.gesture(); s.g.startMusic();
  assert.throws(() => s.g.levelSting(6), TypeError);
});

// ---------------------------------------------------------------- bossMusic
t("bossMusic(true) then (false) goes back to the CURRENT level: currentLevel() 6 -> TRK[TRN+5], 5 -> TRK[TRN+4], no currentLevel -> TRK[TRN+4]; out-of-range levels clamp to 1..LVN", () => {
  for (const [level, want] of [[6, 5], [5, 4], [undefined, 4], [9, 5], [0, 0], [3, 2]]) {
    const { g } = game({ snd: false, level }); g.startMusic();
    assert.equal(g.bossMusic(true), true); assert.equal(g.TI, g.BT, "boss at once in bar 1");
    assert.equal(g.bossMusic(false), true); assert.equal(g.mPend, g.TRN + want, `currentLevel ${level}`);
    assert.equal(g.bossMusic(false), false, "idempotent");
  }
});
t("stalled Crusher fight past the L6 threshold: the L6 banner mid-boss plays its sting but keeps the boss loop; CRUSHER DOWN then returns to L6 (not L5) from its bar 1", () => {
  const s = live({ level: 5 }), { g } = s;
  assert.equal(g.bossMusic(true), true); s.run(2); assert.equal(g.TI, g.BT);
  s.lv.v = 6; assert.equal(g.musicLevel(6), false, "boss on: refused"); const st0 = s.rec.starts;
  assert.equal(g.levelSting(6), true); assert.ok(s.rec.starts > st0, "sting sound"); s.run(3);
  assert.equal(g.TI, g.BT, "boss loop kept"); assert.equal(g.mPend, -1); assert.equal(g.lsN, 0, "handoff dropped");
  assert.equal(g.bossMusic(false), true); assert.equal(g.mPend, g.TRN + 5);
  const k0 = s.rec.steps.length; s.run(3);
  const first = s.rec.steps.slice(k0).find((x) => x.j === g.TRN + 5);
  assert.ok(first && first.i === 0); assert.equal(g.TI, g.TRN + 5);
  const n = live({ level: 5 }); n.g.bossMusic(true); n.run(2); n.g.bossMusic(false); n.run(3); assert.equal(n.g.TI, n.g.TRN + 4, "normal CRUSHER DOWN: still L5");
});

// ---------------------------------------------------------------- 08f arc SFX
t("EN_MAP.arc has warn / tick1 / tick2 / tick3 / zap; enemySfx('arc','zap') === true and plays; unknown arc events are false; the other entries are intact", () => {
  const s = live(), { g } = s;
  assert.deepEqual(Object.keys(g.EN_MAP.arc).sort(), ["tick1", "tick2", "tick3", "warn", "zap"]);
  assert.equal(g.EN_MAP.arc.warn, g.fns.sfxWarnArc); assert.equal(g.EN_MAP.arc.zap, g.fns.sfxArcZap);
  assert.deepEqual([g.EN_MAP.arc.tick1, g.EN_MAP.arc.tick2, g.EN_MAP.arc.tick3], [g.fns.sfxArcTick1, g.fns.sfxArcTick2, g.fns.sfxArcTick3]);
  const s0 = s.rec.starts; assert.equal(g.enemySfx("arc", "zap"), true); assert.equal(s.rec.starts - s0, 3, "crack + zap + thump");
  for (const ev of ["boom", "tick4", "", "toString"]) assert.equal(g.enemySfx("arc", ev), false, ev);
  for (const [k, evs] of Object.entries({ slag: ["telegraph", "burst"], vent: ["telegraph", "burst"], drone: ["telegraph", "swing", "hover"], crusher: ["telegraph", "slam", "down"],
    orecart: ["approach", "pass"], roller: ["warn", "rumble", "pass"], gap: ["warn"], fork: ["warn"] })) assert.deepEqual(Object.keys(g.EN_MAP[k]), evs, k);
});
t("arc sounds: ticks C#6 / E6 / F#6 in 25% pulse at .04 / .045 / .05 (lamp 3 adds an F#5 triangle), zap = noise + falling 12.5% pulse + low triangle, warn = D6 -> G6 panned right; pulse voices <= .05 except the shared warn motif; cooldowns", () => {
  const s = live(), { g } = s, at = () => s.rec.tones.length;
  const tick = (ev) => { const n = at(), b = s.rec.starts; assert.equal(g.enemySfx("arc", ev), true); return [s.rec.tones.slice(n), s.rec.starts - b]; };
  const [t1, n1] = tick("tick1"), [t2, n2] = tick("tick2"), [t3, n3] = tick("tick3");
  assert.deepEqual([n1, n2, n3], [1, 1, 2]);
  assert.ok(near(t1[0].f1, mf(85)) && near(t2[0].f1, mf(88)) && near(t3[0].f1, mf(90)) && near(t3[1].f1, mf(78)) && t3[1].w === 3);
  assert.deepEqual([t1[0].v, t2[0].v, t3[0].v, t3[1].v], [0.04, 0.045, 0.05, 0.06]); assert.ok([t1[0], t2[0], t3[0]].every((x) => x.w === 1 && x.d === 0.05));
  assert.equal(tick("tick1")[1], 0, "tick cooldown"); s.run(0.13); assert.equal(tick("tick1")[1], 1, "after 0.12 s");
  const z = at(), m = s.rec.noises.length; g.enemySfx("arc", "zap"); const zt = s.rec.tones.slice(z);
  assert.deepEqual(zt.map((x) => [x.f1, x.f2, x.w, x.v]), [[1800, 140, 0, 0.045], [95, 40, 3, 0.12]]); assert.deepEqual(s.rec.noises.slice(m).map((x) => [x.rate, x.v]), [[2.4, 0.09]]);
  const b = s.rec.starts; g.enemySfx("arc", "zap"); assert.equal(s.rec.starts, b, "zap cooldown");
  s.run(0.21); const b2 = s.rec.starts; g.enemySfx("arc", "zap"); assert.equal(s.rec.starts - b2, 3, "after 0.2 s");
  const w = at(), p0 = s.rec.pans; g.enemySfx("arc", "warn"); const wt = s.rec.tones.slice(w);
  assert.deepEqual(wt.map((x) => [x.f1, x.w, x.v]), [[1175, 0, 0.07], [1568, 0, 0.07]]); assert.equal(s.rec.pans - p0, 1, "panned");
  assert.ok([...t1, ...t2, ...t3, ...zt].filter((x) => x.w < 3).every((x) => x.v <= 0.05), "pulse voices <= .05");
});
t("arc sounds are silent when muted (also via the mute button), before the unlock, with a suspended context, or during an ad; enemySfx still returns true", () => {
  const ev = ["warn", "tick1", "tick2", "tick3", "zap"];
  const m = game({ snd: false }); m.gesture(); for (const e of ev) assert.equal(m.g.enemySfx("arc", e), true); assert.equal(m.rec.starts, 0, "muted");
  const u = game(); for (const e of ev) u.g.enemySfx("arc", e); assert.equal(u.rec.starts, 0, "locked (no context)");
  const k = game({ locked: true }); k.gesture(); for (const e of ev) k.g.enemySfx("arc", e); assert.equal(k.rec.starts, 0, "suspended context");
  const a = live(); a.g.audioAdPause(); const s0 = a.rec.starts; for (const e of ev) a.g.enemySfx("arc", e); assert.equal(a.rec.starts, s0, "ad");
  const b = live(); b.mute(); assert.equal(b.g.snd, false); const s1 = b.rec.starts; for (const e of ev) b.g.enemySfx("arc", e); assert.equal(b.rec.starts, s1, "mute button");
});

// ---------------------------------------------------------------- RNG + text
t("Math.random: startMusic draws exactly one; musicLevel / levelSting / bossMusic / the arc SFX draw none while muted (the seeded canvas stream)", () => {
  const { g, rnd } = game({ snd: false, level: 6 }); const r0 = rnd.n; g.startMusic(); assert.equal(rnd.n, r0 + 1);
  g.musicLevel(6); g.levelSting(6); g.bossMusic(true); g.bossMusic(false); g.musicLevel(5); for (const e of ["warn", "tick1", "tick2", "tick3", "zap"]) g.enemySfx("arc", e);
  assert.equal(rnd.n, r0 + 1);
});
t("text: 08e / 08f stay String.raw-safe and Poki-clean (no backtick, no ${, no Poki marker, no if(demo)); no Math.random in 08e; the L6 track sits inside the first TRK.push, before var BT", () => {
  for (const [n, f] of [["08e", body(LM)], ["08f", body(ESFX)]]) {
    assert.ok(!f.includes("`") && !f.includes("${"), n);
    for (const k of POKI_FORBIDDEN) assert.ok(!f.includes(k), `${n}: ${k}`);
    assert.ok(!f.includes("if(demo)"), `${n}: if(demo)`);
  }
  const L = body(LM);
  assert.ok(!/Math\.random/.test(L));
  const p1 = L.indexOf("TRK.push("), arc = L.indexOf("10 L6 Arc Furnace"), end = L.indexOf("\n);", p1), bt = L.indexOf("var BT=TRK.length");
  assert.ok(p1 >= 0 && p1 < arc && arc < end && end < bt, "L6 is the last entry of the first push");
});

console.log(`level-music: ${pass} tests passed`);
