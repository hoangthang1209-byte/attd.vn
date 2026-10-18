#!/usr/bin/env bash
# Regression: gh CLI accepts a single --jq expression; `--jq -r` and `--jq --arg` are invalid.
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

scan_file_for_invalid_gh_jq() {
  local path="$1"
  local check_jq_arg="${2:-0}"
  local line next

  [ -f "$path" ] || return 0

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    invalid_matches+=("${path}:${line}")
  done < <(grep -nE -- '--jq[[:space:]]+-r[[:space:]]+' "$path" 2>/dev/null || true)

  if [ "$check_jq_arg" -eq 1 ]; then
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      invalid_matches+=("${path}:${line}")
    done < <(
      grep -nE -- '--jq[[:space:]]+--arg[[:space:]]+' "$path" 2>/dev/null || true
    )
    while IFS= read -r line; do
      next=$((line + 1))
      if sed -n "${next}p" "$path" | grep -qE '^[[:space:]]*--arg[[:space:]]+'; then
        invalid_matches+=("${path}:${line}: --jq continuation followed by --arg")
      fi
    done < <(grep -nE -- '--jq[[:space:]]*\\$' "$path" 2>/dev/null | cut -d: -f1 || true)
  fi
}

collect_invalid_gh_jq() {
  local path
  while IFS= read -r path; do
    scan_file_for_invalid_gh_jq "$path" 0
  done < <(
    find "${REPO_ROOT}/.github" -type f \( -name '*.sh' -o -name '*.yml' -o -name '*.yaml' \) \
      ! -name 'gh-cli-jq-syntax.test.sh'
  )

  scan_file_for_invalid_gh_jq "${REPO_ROOT}/.github/scripts/review-orchestrator-common.sh" 1
}

invalid_matches=()
collect_invalid_gh_jq

if [ "${#invalid_matches[@]}" -eq 0 ]; then
  pass "no invalid gh --jq -r / --jq --arg usage under .github/"
else
  fail "invalid gh --jq -r / --jq --arg usage under .github/"
  printf '%s\n' "${invalid_matches[@]}"
fi

if command -v gh >/dev/null 2>&1; then
  if gh pr view --help 2>&1 | grep -q -- '--jq'; then
    pass "gh pr view exposes --jq flag in help"
  else
    fail "gh pr view help missing --jq (unexpected gh version)"
  fi

  if gh pr view 1 --repo "${GITHUB_REPOSITORY:-octocat/Hello-World}" --json number --jq '.number' >/dev/null 2>&1; then
    pass "gh pr view --json --jq single expression succeeds"
  else
    echo "SKIP: gh pr view --jq live probe failed (auth/network); static scan only"
  fi
else
  echo "SKIP: gh not installed; static --jq scan only"
fi

if [ "$fail" -gt 0 ]; then
  echo "gh CLI jq syntax tests failed: ${fail} failure(s), ${pass} pass(es)."
  exit 1
fi

echo "gh CLI jq syntax tests passed: ${pass} pass(es)."
