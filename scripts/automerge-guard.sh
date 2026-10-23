#!/usr/bin/env bash
# Automerge guard: reads the PR's LIVE state from GitHub right before pr.yml's automerge job merges.
#   scripts/automerge-guard.sh <pr-number> <owner/repo>
# Exit 0  = OK to merge (open, not a draft, no `no-automerge` label).
# Exit 78 = skip: do NOT merge (label present, draft, or not open). Not an error.
# Any other exit = error (bad args, gh failed, unexpected output): fail closed, do NOT merge.
# Why live: the event payload's labels are stale. `gh pr create --label` adds the label in a later event than `opened`,
# and re-runs reuse the original payload, so a payload-only check can miss the label (PR #45 merged that way).
# Needs GH_TOKEN with pull-requests: read. Local test (stubs gh): bash scripts/test-automerge-guard.sh
set -uo pipefail

SKIP_LABEL=no-automerge
PR=${1:-}
REPO=${2:-}
if [[ ! $PR =~ ^[0-9]+$ || -z $REPO ]]; then
  echo "automerge-guard: usage: $0 <pr-number> <owner/repo> (got '${PR}' '${REPO}'); fail closed" >&2
  exit 2
fi

# One call: state, draft flag, has-skip-label, then the label list (for the log).
if ! out=$(gh pr view "$PR" --repo "$REPO" --json state,isDraft,labels \
      -q "[.state, (.isDraft|tostring), (any(.labels[]; .name == \"$SKIP_LABEL\")|tostring), ([.labels[].name]|join(\",\"))] | @tsv"); then
  echo "automerge-guard: PR #$PR: 'gh pr view' failed; fail closed, NOT merging" >&2
  exit 1
fi

IFS=$'\t' read -r STATE DRAFT HAS_SKIP LABELS <<<"$out"
if [[ -z ${STATE:-} || ! ${DRAFT:-} =~ ^(true|false)$ || ! ${HAS_SKIP:-} =~ ^(true|false)$ ]]; then
  echo "automerge-guard: PR #$PR: unexpected gh output '$out'; fail closed, NOT merging" >&2
  exit 1
fi

echo "automerge-guard: PR #$PR live state: state=$STATE draft=$DRAFT labels=[${LABELS:-}]"
if [[ $HAS_SKIP == true ]]; then
  echo "automerge-guard: PR #$PR has the '$SKIP_LABEL' label: SKIP, not merging"; exit 78
fi
if [[ $DRAFT == true ]]; then
  echo "automerge-guard: PR #$PR is a draft: SKIP, not merging"; exit 78
fi
if [[ $STATE != OPEN ]]; then
  echo "automerge-guard: PR #$PR is $STATE (not OPEN): SKIP, not merging"; exit 78
fi
echo "automerge-guard: PR #$PR is open, not a draft, no '$SKIP_LABEL' label: OK to merge"
exit 0
