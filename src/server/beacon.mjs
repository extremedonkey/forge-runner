// ---- play tracking beacon ----
// POST /?event=visit|start|over|share with a small JSON body. One structured JSON line per accepted
// event goes to stdout (CloudWatch). No IPs, user agents or other headers are logged.
const EVENTS = new Set(["visit", "start", "over", "share", "mission_shown", "mission_done"]);
// MISSIONS-3 (revenue spec §5): optional telemetry fields. Only preview hosts send them (client switch TLM2 in 03-beacons.js).
// Invalid values are dropped (never a 400), so a bad field can't cost the core start/over line. Fixed enums / small ints only.
const DB = new Set(["lt5", "lt10", "lt20", "ge20"]);
const SB = new Set(["lt60", "lt180", "lt600", "ge600"]);
const MID = /^[a-z][a-z0-9]{1,15}$/i;
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function telemetry(ev, d) {
  const o = {};
  if (ev === "start" || ev === "over") {
    if (int(d.rv, 0, 9)) o.rv = d.rv;
    if (int(d.rn, 1, 10000)) o.rn = d.rn;
    if (int(d.rl, 1, 9999999)) o.rl = d.rl;
  }
  if (ev === "over") {
    if (DB.has(d.db)) o.db = d.db;
    if (SB.has(d.sb)) o.sb = d.sb;
  }
  if (ev === "mission_shown" || ev === "mission_done") o.mid = typeof d.mid === "string" && MID.test(d.mid) ? d.mid : "(none)";
  return o;
}
const MAX_BODY = 1024;
const RATE_PER_PID = 30; // events per player per minute, per container
const RATE_GLOBAL = 600; // events per minute, per container
const rate = new Map();
let globalWin = 0;
let globalCount = 0;

let originsRaw;
let originsSet = new Set();
function allowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  if (raw !== originsRaw) {
    originsRaw = raw;
    originsSet = new Set(raw.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter((o) => /^https?:\/\/[^/\s]+$/.test(o)));
  }
  return originsSet;
}

export function noContent(statusCode = 204) {
  return { statusCode, headers: { "cache-control": "no-store" }, body: "" };
}

function utmField(v) {
  const s = typeof v === "string" ? v.replace(/[^A-Za-z0-9_.\-]/g, "").slice(0, 40) : "";
  return s || "(none)";
}

function allowed(pid, nowMs) {
  const win = Math.floor(nowMs / 60000);
  if (win !== globalWin) {
    globalWin = win;
    globalCount = 0;
    rate.clear();
  }
  if (++globalCount > RATE_GLOBAL) return false;
  const n = (rate.get(pid) || 0) + 1;
  rate.set(pid, n);
  return n <= RATE_PER_PID;
}

export function handleBeacon(event, nowMs) {
  const ev = event.queryStringParameters?.event;
  const headers = event.headers || {};
  // Same-origin only: browsers send Origin / Sec-Fetch-Site on beacons; reject cross-site posts.
  // Allowed: the request's own host, plus exact scheme+host origins in ALLOWED_ORIGINS (comma-separated),
  // e.g. a CloudFront domain in front of the Function URL (CloudFront does not forward the viewer Host).
  const origin = headers.origin;
  if (origin && origin !== `https://${headers.host}` && !allowedOrigins().has(origin)) return noContent(403);
  const site = headers["sec-fetch-site"];
  if (site && site !== "same-origin") return noContent(403);

  const raw = event.body || "";
  if (raw.length > MAX_BODY * 2) return noContent(413);
  const text = event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw;
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) return noContent(413);
  if (!EVENTS.has(ev)) return noContent(204); // unknown events are ignored

  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return noContent(400);
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return noContent(400);
  if (typeof d.pid !== "string" || !/^[a-f0-9]{16}$/.test(d.pid)) return noContent(400);
  let sc = 0;
  if (ev === "over" || ev === "share") {
    if (!Number.isInteger(d.score) || d.score < 0 || d.score > 99999) return noContent(400);
    sc = d.score;
  }
  // 'over' only: dur = run length in seconds (0-36000), ses = seconds since page load (0-86400).
  // Optional (pages loaded before this build don't send them), but rejected if present and invalid.
  let dur, ses;
  if (ev === "over") {
    if (d.dur !== undefined) {
      if (!Number.isInteger(d.dur) || d.dur < 0 || d.dur > 36000) return noContent(400);
      dur = d.dur;
    }
    if (d.ses !== undefined) {
      if (!Number.isInteger(d.ses) || d.ses < 0 || d.ses > 86400) return noContent(400);
      ses = d.ses;
    }
  }
  if (!allowed(d.pid, nowMs)) return noContent(429);

  const line = {
    t: "fr",
    ev,
    pid: d.pid,
    sc,
    src: utmField(d.utm_source),
    cmp: utmField(d.utm_campaign),
    cnt: utmField(d.utm_content),
    ch: d.challenge === 1 || d.challenge === true ? 1 : 0,
  };
  if (dur !== undefined) line.dur = dur;
  if (ses !== undefined) line.ses = ses;
  Object.assign(line, telemetry(ev, d));
  process.stdout.write(JSON.stringify(line) + "\n");
  return noContent(204);
}
