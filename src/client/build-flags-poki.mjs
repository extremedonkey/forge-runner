// Poki build-target head (used only by scripts/build-poki.mjs, never by the Lambda/site build):
// FR_BUILD='poki' + FR_ADS_CONFIG, then the Poki SDK (in <head>, as Poki's docs show) and the ads adapter, before game.js.
export const POKI_SDK_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";

export const POKI_HEAD = [
  "<script>window.FR_BUILD='poki';window.FR_ADS_CONFIG={enabled:true,backend:'poki'}</script>",
  `<script src="${POKI_SDK_URL}"></script>`,
  '<script src="ads-adapter.js"></script>',
].join("\n");
