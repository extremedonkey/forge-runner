// Forge Runner: a tiny endless-runner game served from Lambda. Node.js 22 ESM, no runtime dependencies.
// HTML by default; ?format=json returns the plain JSON API; POST /?event=... is the play-tracking beacon.
// Source entry: bundled by scripts/build.mjs (esbuild) into dist/index.mjs. See SECTIONS.md for the module map.
import { handleBeacon, noContent } from "./server/beacon.mjs";
import { jsonResponse } from "./server/json.mjs";
import { renderHtml } from "./server/page.mjs";
import { HTML_HEADERS } from "./server/csp.mjs";

let coldStart = true;
let requestCount = 0;

export const handler = async (event) => {
  requestCount++;
  const isCold = coldStart;
  coldStart = false;

  const now = new Date();
  const method = event?.requestContext?.http?.method || "GET";

  // /api/* belongs to forge-runner-api, which CloudFront routes on forgerunnergames.com. If a request reaches the game
  // Lambda (raw Function URLs), answer an empty 204: not an error in the browser console, and the leaderboard stays silent.
  if ((event?.rawPath || "").startsWith("/api/")) return noContent(204);

  if (method === "POST") {
    if (event?.queryStringParameters?.event === undefined) return noContent(400);
    return handleBeacon(event, now.getTime());
  }
  if (method !== "GET" && method !== "HEAD") return noContent(405);

  if (event?.queryStringParameters?.format === "json") return jsonResponse(now, isCold, requestCount);

  return {
    statusCode: 200,
    headers: HTML_HEADERS,
    body: renderHtml(),
  };
};
