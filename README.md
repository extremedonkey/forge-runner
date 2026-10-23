# Forge Runner

An endless pixel runner (a jumping anvil) served as one HTML page by an AWS Lambda Function URL (Node 22, arm64, account `grokbot-lab`, `ap-southeast-2`).

- Live: https://6y5xqyafkixzlj4k2nenhy63ou0ngkmi.lambda-url.ap-southeast-2.on.aws/
- Preview (PR builds): https://3nslnfimuztmjlqvbt4rdp4w2q0lpfoe.lambda-url.ap-southeast-2.on.aws/

`index.mjs` is the Lambda handler. It returns the game page, `?format=json`, and the `POST /?event=…` play beacon.

```bash
npm ci && npm run build          # dist/function.zip
npm run smoke -- <url>           # Playwright Chromium smoke test + screenshots
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, PR and CI/CD workflow, and [OWNERS.md](OWNERS.md) for who owns what.

CI/CD: PRs deploy to preview and auto-merge when green; main deploys live when `LIVE_DEPLOY_ENABLED` is `true`.

## Build targets: site and Poki

`npm run build` produces two targets:

- **site** (Lambda, unchanged): `dist/index.mjs` + `dist/function.zip`. The page `<head>` sets `window.FR_BUILD='site'`; no Poki SDK, no ads adapter, ads OFF (`FR_ADS_CONFIG` absent).
- **poki** (static): `dist/poki/` (`index.html`, `game.js`, `style.css`, `ads-adapter.js`, relative paths only, runs from any subpath) and `dist/forge-runner-poki.zip` (`index.html` at the zip root). `npm run build:poki` builds only this. The `<head>` sets `window.FR_BUILD='poki'` and `window.FR_ADS_CONFIG={enabled:true,backend:'poki'}`, then loads `https://game-cdn.poki.com/scripts/v2/poki-sdk.js` and `ads-adapter.js` (`src/client/ads-adapter.js`). No canonical/og/twitter tags. The game script is the same as the site's (no ad hooks yet).

Tests: `npm test` (build checks: flags, no absolute `/` paths, `dist/poki` ≤ 1 MB, external-URL allowlist = the Poki SDK only, a hard fail since POKI-4, plus the POKI-4 strip checks: no beacon/pid/UTM, `?demo`/`?pu`, name prompt, own-site links, leaderboard or Supporter Pack in `dist/poki`, and the site build still has them all) and `npm run test:poki-browser` (Chromium, served from a subpath, with a fake and a blocked SDK). `node scripts/test-build.mjs --baseline origin/main` also compares the site HTML with another ref. CI runs both on PRs and main and uploads `dist/poki/` as the artifact **`forge-runner-poki`**.

Preview (noindex): https://preview.forgerunnergames.com/poki/ (S3 `forgerunnergames-static-354245662991/poki/`, uploaded by hand for now; see `aws-lab/custom-domain.md`, "Poki preview build").
