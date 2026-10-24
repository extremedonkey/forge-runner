# Contributing

## Workflow

1. **Branch** from up-to-date `main`, named `<bot>/<feature>`, e.g. `audio/deep-haul`, `mobile/portrait-fit`, `dev/power-ups`.
2. **One area per bot** (see `OWNERS.md`). Keep PRs **small**: one feature or fix each.
3. **Rebase on main before opening the PR**: `git fetch origin && git rebase origin/main`, then `npm run build`.
4. **Open the PR with gh**: `git push -u origin HEAD && gh pr create --fill --base main`.
5. **CI** (`.github/workflows/pr.yml`) builds, deploys `dist/function.zip` to a preview Lambda (odd PRs → `forge-runner-preview`, even PRs → `forge-runner-preview-2`), waits for the update, runs `npm run smoke` against that function's URL and uploads screenshots (390x844, 844x390, 1280x800) as artifacts.
6. **Green PRs auto-merge**: the last job squash-merges the PR (and deletes the branch) only if every earlier job passed. Open it as a **draft**, or add the label `no-automerge`, to stop that. The label/draft check is read live from GitHub right before the merge (`scripts/automerge-guard.sh`), so a label added at or after `gh pr create` still stops it, as long as it is on the PR when CI finishes.
7. **Merging to main deploys live** (`.github/workflows/main.yml`): build, save the current live code as a rollback artifact, update `grok-claude-hello`, run the live smoke test, and **roll back automatically** if the smoke test fails. This only runs when the repo variable `LIVE_DEPLOY_ENABLED` is `true`. On main, `npm test` runs in its own `test` job **beside** the deploy, not before it (the PR already ran it on that code); a red `test` on main means fix forward with a PR.
8. **Waiting on CI: no polling loops.** Use one blocking `gh pr checks <n> --watch` (or `gh run watch <id>`). Announce twice: **preview ready** (`https://preview.forgerunnergames.com/pr-<n>/`, once `pr-preview-site` passes) and **live** (the main run's `deploy-live` green). Don't rebase/force-push a PR that is already in CI just to pick up unrelated main changes: it restarts CI, and automerge squashes onto current main anyway.

## Keeping CI lean

Budget: **PR open → merged ≤ ~10 min, merge → live ≤ ~5 min.** Every bot's change waits on this clock, so a slow test costs everyone. (Oct 2026: it had grown to ~30 min, mostly `npm test` running ~16 sim suites one after another, twice.)

- **Test once, in the PR.** The live deploy gates only on the build and the live smoke test + auto-rollback. Heavy tests run on the PR; on main they run beside the deploy and only report.
- **Sim suites run in parallel.** `scripts/test-build.mjs` starts every `scripts/test-*.mjs` sim at once. **Adding one:** add it to `SIMS` at the top of the sparks block and `await simOk("<name>")` where its result should print. It must be independent: no shared files, ports or global state.
- **Each suite stays fast in CI** (aim < 60 s on the runner). Exhaustive sweeps go behind a flag: `npm test` passes `QUICK=1` (coarser sweeps, fewer seeds); running the script directly (or `FULL=1`) does the big sweep. See `QUICK` in `test-fork.mjs` and `test-gaps.mjs` (gaps: 90 s -> 32 s; its quick sweep step is still far finer than the windows' margin over their thresholds).
- **Browser tests go in the `poki-browser` or `ui-browser` job** (PRs; they start beside `build`, not after it), each with its own `timeout-minutes`, never in `build`. Add a new suite to whichever of the two is shorter so they stay balanced (~2.3 min each).
- **Slow test? Make it faster, don't raise the timeout.** Fewer seeds, a shorter sim, or move it to a `FULL=1` path.
- **New jobs reuse the build.** Download the `function-zip` / `forge-runner-poki` artifacts instead of running `npm ci && npm run build` again. (`poki-browser` still rebuilds: known debt, cheap today.)
- **Measure before and after a CI change**: `gh api repos/extremedonkey/forge-runner/actions/jobs/<job-id> -q '.steps[] | [.name,.started_at,.completed_at]'`, and give the step timings in the PR.
- Main deploys queue one at a time (`concurrency: live-deploy`), so a fast deploy also shortens the queue behind it.

## Windows clones

`.gitattributes` forces LF on checkout (the build scripts match exact `"\n"` text and fail on CRLF). If a clone predates it: `git rm -rq --cached . && git reset --hard`. Python's output on Windows ends lines in `\r\n`; split on `/\r?\n/` when parsing it.

AWS access is GitHub OIDC only (no keys in GitHub). This repo uses GitHub's *immutable* OIDC subject, so the IAM trust policies match `repo:extremedonkey@1475506/forge-runner@1430733775:pull_request` (preview role) and `...:ref:refs/heads/main` (live role). Role ARNs are the repo variables `AWS_ROLE_PREVIEW_ARN` and `AWS_ROLE_LIVE_ARN`.

Two preview Lambdas: odd and even PRs smoke in parallel. Same-slot PRs still queue one at a time, and odd PRs share slot 1 with the main preview-root deploy (`forge-runner-preview` only). Static previews stay at `https://preview.forgerunnergames.com/pr-<n>/` on S3. CI only changes Lambda **code**, never env vars like `ALLOWED_ORIGINS` (its IAM roles only allow `lambda:UpdateFunctionCode` and `lambda:GetFunction`).

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
