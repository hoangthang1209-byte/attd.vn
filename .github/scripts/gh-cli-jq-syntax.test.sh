#!/usr/bin/env bash
# Regression: gh CLI accepts a single --jq expression; `--jq -r 'expr'` is invalid.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

pass=0
fail=0

pass() {
  pass=$((pass + 1))
  echo "PASS: $1"
}

fail() {
  fail=$((fail + 1))
  echo "FAIL: $1"
}

invalid_matches=()
while IFS= read -r line; do
  [ -z "$line" ] && continue
  invalid_matches+=("$line")
done < <(
  grep -RInE -- '--jq[[:space:]]+-r[[:space:]]+' "${REPO_ROOT}/.github" 2>/dev/null \
    | grep -v 'gh-cli-jq-syntax.test.sh' \
    || true
)

if [ "${#invalid_matches[@]}" -eq 0 ]; then
  pass "no invalid gh --jq -r usage under .github/"
else
  fail "invalid gh --jq -r usage under .github/"
  printf '%s\n' "${invalid_matches[@]}"
fi

if command -v gh >/dev/null 2>&1; then
  if gh pr view --help 2>&1 | grep -q -- '--jq'; then
    pass "gh pr view exposes --jq flag in help"
  else
    fail "gh pr view help missing --jq (unexpected gh version)"
  fi
else
  echo "SKIP: gh not installed; static --jq -r scan only"
fi

if [ "$fail" -gt 0 ]; then
  echo "gh CLI jq syntax tests failed: ${fail} failure(s), ${pass} pass(es)."
  exit 1
fi

echo "gh CLI jq syntax tests passed: ${pass} pass(es)."
