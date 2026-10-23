#!/usr/bin/env bash
# Upload a static build dir to the preview bucket under a prefix, with explicit content types, then delete stale keys.
# Usage: scripts/upload-preview.sh <local-dir> <prefix/>     e.g. dist/pr-preview pr-23/   or   dist/poki poki/
# Needs AWS creds with s3:PutObject/DeleteObject on that prefix and s3:ListBucket for it (see custom-domain.md).
#        scripts/upload-preview.sh --delete pr-<n>/   removes the whole prefix (pr-preview-cleanup.yml, PR closed unmerged)
set -euo pipefail
SRC="${1:?local dir or --delete}"; PREFIX="${2:?prefix/}"
BUCKET="${PREVIEW_BUCKET:-forgerunnergames-static-354245662991}"
case "$PREFIX" in pr-[0-9]*/|poki/) ;; *) echo "refusing prefix '$PREFIX' (only pr-<n>/ or poki/)"; exit 1;; esac
if [ "$SRC" = "--delete" ]; then
  case "$PREFIX" in pr-[0-9]*/) ;; *) echo "refusing to delete '$PREFIX' (only pr-<n>/)"; exit 1;; esac
  aws s3 rm --only-show-errors --recursive "s3://$BUCKET/$PREFIX"
  echo "deleted $PREFIX"
  exit 0
fi
cd "$SRC"
find . -type f | sed 's|^\./||' | sort | while read -r f; do
  case "$f" in
    *.html) ct="text/html; charset=utf-8"; cc="public, max-age=60";;
    *.js)   ct="text/javascript; charset=utf-8"; cc="public, max-age=300";;
    *.css)  ct="text/css; charset=utf-8"; cc="public, max-age=300";;
    *.json) ct="application/json"; cc="public, max-age=60";;
    *.png)  ct="image/png"; cc="public, max-age=300";;
    *.svg)  ct="image/svg+xml"; cc="public, max-age=300";;
    *)      ct="application/octet-stream"; cc="public, max-age=300";;
  esac
  aws s3 cp --only-show-errors "$f" "s3://$BUCKET/$PREFIX$f" --content-type "$ct" --cache-control "$cc"
  echo "uploaded $PREFIX$f ($ct)"
done
# Remove keys under the prefix that are no longer in the build. Everything was just uploaded with the same size,
# so with --size-only this only deletes stale keys (it never re-uploads with guessed content types).
aws s3 sync --delete --size-only . "s3://$BUCKET/$PREFIX"
echo "prefix $PREFIX in sync"
