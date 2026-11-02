// ANDROID / GOOGLE PLAY (Trusted Web Activity): the files the Play app needs from the live origin.
//  - /.well-known/assetlinks.json: Digital Asset Links. Lets the Android app com.forgerunnergames.forgerunner open this site full
//    screen (no browser URL bar). SHA256_FINGERPRINTS must list EVERY key that signs installed APKs:
//      [0] our upload key (/home/box/agent-data/shared/forge-runner/play/upload-keystore.jks, Bitwarden "Forge Runner Play upload key")
//      [+] after the first Play upload: add the Google "App signing key" SHA-256 from Play Console
//          (Test and release > App integrity / Play app signing). Without it, Play-installed copies show the URL bar.
//  - /manifest.webmanifest + /icons/*.png: the web app manifest (name, icons, colours, orientation) used by Bubblewrap and by
//    "Add to Home screen". Orientation "any": the game supports portrait and landscape (04-viewport.js).
import { ICONS } from "./icons.mjs";

export const PACKAGE_NAME = "com.forgerunnergames.forgerunner";
export const SHA256_FINGERPRINTS = [
  "8F:E8:BA:48:10:84:50:BD:B2:3F:E7:87:81:3A:55:56:F4:87:D4:96:DD:66:3E:2E:48:03:1E:6F:6B:C9:A0:E4", // upload key, 2026-11-02
];

export const ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: PACKAGE_NAME, sha256_cert_fingerprints: SHA256_FINGERPRINTS },
  },
];

export const MANIFEST = {
  id: "/",
  name: "Forge Runner",
  short_name: "Forge Runner",
  description: "Jump, duck and outrun the forge in a free endless runner. Beat your friend's score.",
  start_url: "/",
  scope: "/",
  display: "fullscreen",
  orientation: "any",
  background_color: "#05070d",
  theme_color: "#05070d",
  categories: ["games"],
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  related_applications: [{ platform: "play", id: PACKAGE_NAME }],
};

const CACHE = "public, max-age=3600";
const json = (type, obj) => ({
  statusCode: 200,
  headers: { "content-type": type, "cache-control": CACHE, "x-content-type-options": "nosniff", "access-control-allow-origin": "*" },
  body: JSON.stringify(obj, null, 2),
});

// GET/HEAD responses for the Android paths, or null when the path is not one of them.
export function androidResponse(path) {
  if (path === "/.well-known/assetlinks.json") return json("application/json", ASSETLINKS);
  if (path === "/manifest.webmanifest") return json("application/manifest+json", MANIFEST);
  if (Object.hasOwn(ICONS, path))
    return {
      statusCode: 200,
      headers: { "content-type": "image/png", "cache-control": CACHE, "x-content-type-options": "nosniff" },
      body: ICONS[path],
      isBase64Encoded: true,
    };
  return null;
}
