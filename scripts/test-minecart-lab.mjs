// MINE CART lab: registered in LABS, builds a self-contained page with the lab markers and no network calls.
// Run: npm run build:lab && node scripts/test-minecart-lab.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LABS } from "./build-lab.mjs";
assert.ok(LABS.some(([v]) => v === "minecart"), "LABS includes minecart");
const html = readFileSync(new URL("../dist/lab/minecart/index.html", import.meta.url), "utf8");
for (const m of ["FR_LAB='minecart'", "LAB PROTOTYPE", "MINE CART"]) assert.ok(html.includes(m), "missing " + m);
for (const m of ["sendBeacon", "fetch("]) assert.ok(!html.includes(m), "forbidden " + m);
console.log("ok   minecart lab");
