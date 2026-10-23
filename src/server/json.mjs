// ?format=json: the plain JSON API (kept from the original hello-lambda).
import { MESSAGE, BUILT_BY } from "./config.mjs";

export function jsonResponse(now, isCold, requestCount) {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify({
      message: MESSAGE,
      builtBy: BUILT_BY,
      region: process.env.AWS_REGION,
      timestamp: now.toISOString(),
      coldStart: isCold,
      requestCount,
      memoryMB: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
      arch: process.arch,
    }),
  };
}
