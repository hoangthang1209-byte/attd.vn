#!/usr/bin/env bash
# Unit tests for build-orchestrator-common.sh parsing helpers (no GitHub API).
set -euo pipefail

ORCHESTRATOR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${ORCHESTRATOR_SCRIPT_DIR}/build-orchestrator-common.sh"

failures=0

assert_eq() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" != "$actual" ]; then
    echo "FAIL: ${name} (expected '${expected}', got '${actual}')"
    failures=$((failures + 1))
  else
    echo "PASS: ${name}"
  fi
}

sample_review_clean_p2() {
  cat <<'EOF'
<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review — Phase F1a (#32)

No P0/P1 findings.

### Findings

#### P2 — Medium

**1. Example P2 finding**

#### P3 — Low

**1. Example P3 finding**
EOF
}

sample_review_blocked() {
  cat <<'EOF'
<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

### Findings

#### P1 — High

**1. Blocking finding**
EOF
}

sample_review_ready() {
  cat <<'EOF'
<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

No P0/P1 findings.

### Findings

#### P3 — Low

**1. Minor nit**
EOF
}

body="$(sample_review_clean_p2)"
if is_attd_pr_reviewer_review "$body"; then
  echo "PASS: detects ATTD PR Reviewer body"
else
  echo "FAIL: detects ATTD PR Reviewer body"
  failures=$((failures + 1))
fi

read -r p0 p1 p2 p3 <<< "$(parse_review_severity_counts "$(sample_review_clean_p2)")"
assert_eq "clean P2 review P0" "0" "$p0"
assert_eq "clean P2 review P1" "0" "$p1"
assert_eq "clean P2 review P2" "1" "$p2"
assert_eq "clean P2 review P3" "1" "$p3"

read -r p0 p1 p2 p3 <<< "$(parse_review_severity_counts "$(sample_review_blocked)")"
assert_eq "blocked review P0" "0" "$p0"
assert_eq "blocked review P1" "1" "$p1"

read -r p0 p1 p2 p3 <<< "$(parse_review_severity_counts "$(sample_review_ready)")"
assert_eq "ready review P2" "0" "$p2"
assert_eq "ready review P3" "1" "$p3"

marker="$(orchestrator_idempotency_marker "review" "33" "abc123" "run1")"
assert_eq "idempotency marker prefix" \
  "${ORCHESTRATOR_MARKER_PREFIX} review-pr-33-sha-abc123-run-run1" \
  "$marker"

if [ "$failures" -ne 0 ]; then
  echo "${failures} test(s) failed."
  exit 1
fi

echo "All build-orchestrator-common tests passed."
