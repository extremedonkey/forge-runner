#!/usr/bin/env bash
# Local test for scripts/automerge-guard.sh with a stub `gh` (no network). Needs bash + jq (both on ubuntu-latest).
# The stub applies the guard's real -q jq expression to a fixture JSON, so the query itself is tested too.
#   bash scripts/test-automerge-guard.sh
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
GUARD="$ROOT/scripts/automerge-guard.sh"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
cat >"$TMP/gh" <<'STUB'
#!/usr/bin/env bash
# stub gh: `gh pr view N --repo R --json F -q EXPR` -> jq EXPR over $FAKE_GH_JSON; FAKE_GH_RC!=0 simulates a gh failure
[[ ${FAKE_GH_RC:-0} != 0 ]] && { echo "stub gh: HTTP 502" >&2; exit "$FAKE_GH_RC"; }
q=; while [[ $# -gt 0 ]]; do [[ $1 == -q ]] && { q=$2; shift; }; shift; done
[[ -n ${FAKE_GH_RAW:-} ]] && { printf '%s\n' "$FAKE_GH_RAW"; exit 0; }
printf '%s' "$FAKE_GH_JSON" | jq -r "$q"
STUB
chmod +x "$TMP/gh"
export PATH="$TMP:$PATH"

fail=0
check() { # name expected-exit [env...] -- args...
  local name=$1 want=$2; shift 2
  local envs=(); while [[ $1 != -- ]]; do envs+=("$1"); shift; done; shift
  local got; env "${envs[@]}" bash "$GUARD" "$@" >"$TMP/out" 2>&1; got=$?
  if [[ $got == "$want" ]]; then echo "ok   $name (exit $got)"; else echo "FAIL $name: want exit $want, got $got"; sed 's/^/     /' "$TMP/out"; fail=1; fi
}
L='{"name":"no-automerge"}'
check "open, no labels -> merge"            0  FAKE_GH_JSON='{"state":"OPEN","isDraft":false,"labels":[]}' -- 1 o/r
check "open, other labels -> merge"         0  FAKE_GH_JSON='{"state":"OPEN","isDraft":false,"labels":[{"name":"bug"},{"name":"no-automerge-later"}]}' -- 1 o/r
check "no-automerge label -> skip"          78 FAKE_GH_JSON="{\"state\":\"OPEN\",\"isDraft\":false,\"labels\":[{\"name\":\"bug\"},$L]}" -- 1 o/r
check "draft -> skip"                       78 FAKE_GH_JSON='{"state":"OPEN","isDraft":true,"labels":[]}' -- 1 o/r
check "draft + label -> skip"               78 FAKE_GH_JSON="{\"state\":\"OPEN\",\"isDraft\":true,\"labels\":[$L]}" -- 1 o/r
check "already merged -> skip"              78 FAKE_GH_JSON='{"state":"MERGED","isDraft":false,"labels":[]}' -- 1 o/r
check "closed -> skip"                      78 FAKE_GH_JSON='{"state":"CLOSED","isDraft":false,"labels":[]}' -- 1 o/r
check "gh fails -> fail closed"             1  FAKE_GH_RC=1 -- 1 o/r
check "gh empty output -> fail closed"      1  FAKE_GH_RAW=' ' -- 1 o/r
check "gh garbage output -> fail closed"    1  FAKE_GH_RAW='oops' -- 1 o/r
check "missing args -> fail closed"         2  FAKE_GH_JSON='{}' -- 
check "non-numeric PR -> fail closed"       2  FAKE_GH_JSON='{}' -- abc o/r
[[ $fail == 0 ]] && echo "automerge-guard tests: all passed" || { echo "automerge-guard tests: FAILED"; exit 1; }
