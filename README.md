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
