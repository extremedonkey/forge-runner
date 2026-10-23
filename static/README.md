# static/

Files served from S3 (`forgerunnergames-static-354245662991`) by the live CloudFront distribution E3FMAQI199ZV8.
CI does NOT publish these (the forge-runner-ci-live role can't write them): publish by hand with the grokbot-lab profile
after the PR merges, then invalidate.

| file | S3 key | live URL |
|---|---|---|
| privacy.html | `privacy` | https://forgerunnergames.com/privacy |

```bash
aws sts get-caller-identity --profile grokbot-lab   # must be 354245662991
aws s3 cp static/privacy.html s3://forgerunnergames-static-354245662991/privacy \
  --content-type 'text/html; charset=utf-8' --profile grokbot-lab
aws cloudfront create-invalidation --distribution-id E3FMAQI199ZV8 --paths /privacy /privacy/ --profile grokbot-lab
```

Start any edit from the live text (`curl -s https://forgerunnergames.com/privacy`) so this copy never drifts from live.
