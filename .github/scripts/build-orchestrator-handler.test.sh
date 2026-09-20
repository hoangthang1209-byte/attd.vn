#!/usr/bin/env bash
# Handler-level contract tests for orchestrator resume paths (issue #50).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"
export BUILD_APPROVED_AUTHOR="attd-owner"

failures=0
MOCK_PR_TERMINAL_MARKERS=""
MOCK_REPAIR_ISSUES=""
MOCK_PR_COMMENT_COUNT=0
MOCK_BUILD_APPROVED_POSTS=0
MOCK_ISSUE_HAS_BUILD_APPROVED=0
MOCK_LAST_PR_COMMENT_BODY=""

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${SCRIPT_DIR}/build-orchestrator-common.sh"

ensure_orchestrator_labels() { :; }
ensure_task_status_labels() { :; }
set_linked_issues_status() { :; }
set_issue_status_label() { :; }
is_low_risk_pull_request() { return 0; }
should_defer_for_active_builder_queue() { return 1; }
issue_is_deferred_repair() { return 1; }
issue_has_idempotency_marker() { return 1; }
issue_has_label() { return 1; }
linked_issue_numbers_from_pr() { printf '%s\n' "44"; }

post_orchestrator_build_approved() {
  MOCK_BUILD_APPROVED_POSTS=$((MOCK_BUILD_APPROVED_POSTS + 1))
  MOCK_ISSUE_HAS_BUILD_APPROVED=1
}

issue_has_orchestrator_build_approved() {
  [ "${MOCK_ISSUE_HAS_BUILD_APPROVED:-0}" -eq 1 ]
}

pull_request_has_terminal_idempotency_for_marker() {
  local pull_number="$1"
  local marker="$2"
  [[ "$MOCK_PR_TERMINAL_MARKERS" == *"|${marker}|"* ]]
}

find_open_repair_issue_for_pr() {
  local pull_number="$1"
  local head_sha="$2"
  local kind="$3"
  local marker
  marker="$(orchestrator_idempotency_marker "$kind" "$pull_number" "$head_sha")"
  if [[ "$MOCK_REPAIR_ISSUES" == *"|${marker}|"* ]]; then
    printf '8888'
  fi
}

gh() {
  if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
    shift 2
    while [ $# -gt 0 ]; do
      if [ "$1" = "--body" ]; then
        MOCK_LAST_PR_COMMENT_BODY="$2"
        MOCK_PR_COMMENT_COUNT=$((MOCK_PR_COMMENT_COUNT + 1))
        if [[ "$2" == *"ORCHESTRATOR_REPAIR_TRIGGERED:"* ]] \
          || [[ "$2" == *"ORCHESTRATOR_CI_REPAIR_TRIGGERED:"* ]] \
          || [[ "$2" == *"ORCHESTRATOR_BLOCKED:"* ]] \
          || [[ "$2" == *"READY TO MERGE"* ]] \
          || [[ "$2" == *"ORCHESTRATOR_QUEUE_DEFERRED:"* ]]; then
          local marker_line
          marker_line="$(printf '%s' "$2" | grep -F "${ORCHESTRATOR_MARKER_PREFIX}" | tail -1 || true)"
          if [ -n "$marker_line" ]; then
            MOCK_PR_TERMINAL_MARKERS="${MOCK_PR_TERMINAL_MARKERS}|${marker_line}|"
          fi
        fi
        shift 2
        continue
      fi
      shift
    done
    return 0
  fi
}

sample_review_p2() {
  cat <<'EOF'
<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

No P0/P1 findings.

### Findings

#### P2 — Medium

**1. Example P2 finding**
EOF
}

reset_mocks() {
  MOCK_PR_TERMINAL_MARKERS=""
  MOCK_REPAIR_ISSUES=""
  MOCK_PR_COMMENT_COUNT=0
  MOCK_BUILD_APPROVED_POSTS=0
  MOCK_ISSUE_HAS_BUILD_APPROVED=0
  MOCK_LAST_PR_COMMENT_BODY=""
}

# Issue #50 P2.1: claim-only PR marker + open repair issue + resume => one terminal marker.
reset_mocks
claim_marker="$(orchestrator_idempotency_marker "review" "50" "claim-only-sha")"
MOCK_REPAIR_ISSUES="|${claim_marker}|"
MOCK_PR_TERMINAL_MARKERS="|${claim_marker}|claim-only-legacy|"
# Simulate legacy claim-only comment: marker present but not in terminal set.
MOCK_PR_TERMINAL_MARKERS=""

resume_incomplete_repair_orchestration "50" "claim-only-sha" "review" "$claim_marker" \
  "${ORCHESTRATOR_REPAIR_TRIGGERED_PREFIX} Created/reused repair issue #8888 for P2 findings."

if [ "$MOCK_PR_COMMENT_COUNT" -eq 1 ]; then
  pass "claim-only marker + resume posts exactly one terminal PR comment"
else
  fail "claim-only marker + resume posts exactly one terminal PR comment (got ${MOCK_PR_COMMENT_COUNT})"
fi

if [[ "$MOCK_PR_TERMINAL_MARKERS" == *"|${claim_marker}|"* ]]; then
  pass "claim-only marker + resume finishes with terminal PR marker"
else
  fail "claim-only marker + resume finishes with terminal PR marker"
fi

if [[ "$MOCK_LAST_PR_COMMENT_BODY" == *"ORCHESTRATOR_REPAIR_TRIGGERED:"* ]]; then
  pass "claim-only marker + resume posts triggered terminal body"
else
  fail "claim-only marker + resume posts triggered terminal body"
fi

# Duplicate resume after terminal marker is a no-op.
resume_incomplete_repair_orchestration "50" "claim-only-sha" "review" "$claim_marker" \
  "${ORCHESTRATOR_REPAIR_TRIGGERED_PREFIX} Created/reused repair issue #8888 for P2 findings."
if [ "$MOCK_PR_COMMENT_COUNT" -eq 1 ]; then
  pass "duplicate resume after terminal marker is a no-op"
else
  fail "duplicate resume after terminal marker is a no-op (got ${MOCK_PR_COMMENT_COUNT})"
fi

# Handler: reviewer outcome resumes existing open repair issue.
reset_mocks
review_marker="$(orchestrator_idempotency_marker "review" "50" "handler-review-sha")"
MOCK_REPAIR_ISSUES="|${review_marker}|"
handle_reviewer_outcome "50" "handler-review-sha" "$(sample_review_p2)" "run-1"
if [ "$MOCK_BUILD_APPROVED_POSTS" -eq 1 ] && [ "$MOCK_PR_COMMENT_COUNT" -eq 1 ]; then
  pass "handle_reviewer_outcome resumes existing repair with BUILD_APPROVED and terminal marker"
else
  fail "handle_reviewer_outcome resumes existing repair (BUILD_APPROVED=${MOCK_BUILD_APPROVED_POSTS}, comments=${MOCK_PR_COMMENT_COUNT})"
fi

# Handler: CI failure outcome resumes existing open repair issue.
reset_mocks
ci_marker="$(orchestrator_idempotency_marker "ci" "50" "handler-ci-sha")"
MOCK_REPAIR_ISSUES="|${ci_marker}|"
handle_ci_failure_outcome "50" "handler-ci-sha" "run-2"
if [ "$MOCK_BUILD_APPROVED_POSTS" -eq 1 ] && [ "$MOCK_PR_COMMENT_COUNT" -eq 1 ]; then
  pass "handle_ci_failure_outcome resumes existing repair with BUILD_APPROVED and terminal marker"
else
  fail "handle_ci_failure_outcome resumes existing repair (BUILD_APPROVED=${MOCK_BUILD_APPROVED_POSTS}, comments=${MOCK_PR_COMMENT_COUNT})"
fi

if [ "$failures" -ne 0 ]; then
  echo "${failures} handler contract test(s) failed."
  exit 1
fi

echo "All build-orchestrator handler contract tests passed."
