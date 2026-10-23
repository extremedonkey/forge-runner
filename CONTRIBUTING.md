# Contributing

## Workflow

1. **Branch** from up-to-date `main`, named `<bot>/<feature>`, e.g. `audio/deep-haul`, `mobile/portrait-fit`, `dev/power-ups`.
2. **One area per bot** (see `OWNERS.md`). Keep PRs **small**: one feature or fix each.
3. **Rebase on main before opening the PR**: `git fetch origin && git rebase origin/main`, then `npm run build`.
4. **Open the PR with gh**: `git push -u origin HEAD && gh pr create --fill --base main`.
5. **CI** (`.github/workflows/pr.yml`) builds, deploys `dist/function.zip` to the **preview** Lambda `forge-runner-preview`, waits for the update, runs `npm run smoke` against the preview URL and uploads screenshots (390x844, 844x390, 1280x800) as artifacts.
6. **Green PRs auto-merge**: the last job squash-merges the PR (and deletes the branch) only if every earlier job passed. Open it as a **draft**, or add the label `no-automerge`, to stop that. The label/draft check is read live from GitHub right before the merge (`scripts/automerge-guard.sh`), so a label added at or after `gh pr create` still stops it, as long as it is on the PR when CI finishes.
7. **Merging to main deploys live** (`.github/workflows/main.yml`): build, save the current live code as a rollback artifact, update `grok-claude-hello`, run the live smoke test, and **roll back automatically** if the smoke test fails. This only runs when the repo variable `LIVE_DEPLOY_ENABLED` is `true`.

AWS access is GitHub OIDC only (no keys in GitHub). This repo uses GitHub's *immutable* OIDC subject, so the IAM trust policies match `repo:extremedonkey@1475506/forge-runner@1430733775:pull_request` (preview role) and `...:ref:refs/heads/main` (live role). Role ARNs are the repo variables `AWS_ROLE_PREVIEW_ARN` and `AWS_ROLE_LIVE_ARN`.

The preview Lambda is shared, so PR runs queue one at a time. CI only changes Lambda **code**, never env vars like `ALLOWED_ORIGINS` (its IAM roles only allow `lambda:UpdateFunctionCode` and `lambda:GetFunction`).

## Rules

- No force-push to `main`, ever, and no direct pushes to `main` except by Reece. Everything goes through a PR.
- Don't commit secrets, `.bak`/`.orig`/`.zip` files, screenshots or audio previews (see `.gitignore`). Stage files by explicit path, not `git add -A`.
- Don't deploy live by hand once `LIVE_DEPLOY_ENABLED` is `true`. Let main do it.

## Local commands

```bash
npm ci
npm run build                 # -> dist/index.mjs and dist/function.zip (+ a handler sanity check)
npx playwright install chromium
npm run smoke -- <url>        # e.g. the preview URL; screenshots go to ./screenshots
```

The smoke test fails on any console error or page error, checks the canvas, starts a run, jumps (Space, or a tap on touch viewports), waits 2.5 s and checks again. It blocks all beacon requests (`POST /?event=…`), so tests never add to play stats.

## Build: copy now, esbuild later

Today the game is one file, `index.mjs`, and `npm run build` just copies it into `dist/`.

When Forge Runner Dev's module split lands, the entry point becomes `src/index.mjs` (it must still `export const handler`). `scripts/build.mjs` switches automatically: if `src/index.mjs` exists, it bundles `src/` with esbuild (ESM, Node 22, `.html`/`.css`/`.txt` imported as text) into a single `dist/index.mjs`. That PR must:

1. add `src/` and run `npm i -D esbuild` (commit `package.json` and `package-lock.json`);
2. delete the root `index.mjs` in the same PR, so there's only one source of truth;
3. pass `npm run build` and `npm run smoke` against preview like any other PR.
