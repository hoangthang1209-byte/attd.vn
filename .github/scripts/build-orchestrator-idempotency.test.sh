#!/usr/bin/env bash
# Integration-style contract tests for orchestrator synchronous idempotency (issues #44, #46).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"
export BUILD_APPROVED_AUTHOR="attd-owner"

failures=0
MOCK_PR_COMMENTS=""
MOCK_PR_TERMINAL_MARKERS=""
MOCK_REPAIR_ISSUES=""
MOCK_REPAIR_ISSUE_CREATE_COUNT=0
MOCK_PR_COMMENT_COUNT=0
MOCK_BUILD_APPROVED_POSTS=0
MOCK_ACTIVE_BUILDER_COUNT=0
MOCK_LOW_RISK=1
MOCK_LINKED_ISSUES="44"
MOCK_CREATE_REPAIR_FAILS=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${SCRIPT_DIR}/build-orchestrator-common.sh"

ensure_orchestrator_labels() { :; }
ensure_task_status_labels() { :; }
set_linked_issues_status() { :; }
set_issue_status_label() { :; }
is_low_risk_pull_request() { [ "${MOCK_LOW_RISK:-0}" -eq 1 ]; }
should_defer_for_active_builder_queue() { [ "${MOCK_ACTIVE_BUILDER_COUNT:-0}" -gt 0 ]; }
issue_is_deferred_repair() { return 1; }
issue_has_orchestrator_build_approved() { return 1; }
post_orchestrator_build_approved() { MOCK_BUILD_APPROVED_POSTS=$((MOCK_BUILD_APPROVED_POSTS + 1)); }

pull_request_has_idempotency_marker() {
  local pull_number="$1"
  local marker="$2"
  [[ "$MOCK_PR_COMMENTS" == *"$marker"* ]]
}

pull_request_has_terminal_idempotency_for_marker() {
  local pull_number="$1"
  local marker="$2"
  [[ "$MOCK_PR_TERMINAL_MARKERS" == *"|${marker}|"* ]]
}

post_unique_pr_comment() {
  local pull_number="$1"
  local marker="$2"
  local body="$3"
  MOCK_PR_COMMENT_COUNT=$((MOCK_PR_COMMENT_COUNT + 1))
  MOCK_PR_COMMENTS="${MOCK_PR_COMMENTS}
${body}
${marker}"
  if [[ "$body" == *"ORCHESTRATOR_REPAIR_TRIGGERED:"* ]] \
    || [[ "$body" == *"ORCHESTRATOR_CI_REPAIR_TRIGGERED:"* ]] \
    || [[ "$body" == *"ORCHESTRATOR_BLOCKED:"* ]] \
    || [[ "$body" == *"READY TO MERGE"* ]] \
    || [[ "$body" == *"ORCHESTRATOR_QUEUE_DEFERRED:"* ]]; then
    MOCK_PR_TERMINAL_MARKERS="${MOCK_PR_TERMINAL_MARKERS}|${marker}|"
  fi
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

create_repair_issue() {
  local pull_number="$1"
  local head_sha="$2"
  local marker="$3"
  if [ "${MOCK_CREATE_REPAIR_FAILS:-0}" -eq 1 ]; then
    return 1
  fi
  MOCK_REPAIR_ISSUE_CREATE_COUNT=$((MOCK_REPAIR_ISSUE_CREATE_COUNT + 1))
  MOCK_REPAIR_ISSUES="${MOCK_REPAIR_ISSUES}|${marker}|"
  printf '9999'
}

repository_has_idempotency_for_pr_sha() {
  local kind="$1"
  local pull_number="$2"
  local head_sha="$3"
  local marker repair_issue
  marker="$(orchestrator_idempotency_marker "$kind" "$pull_number" "$head_sha")"

  repair_issue="$(find_open_repair_issue_for_pr "$pull_number" "$head_sha" "$kind")"
  if [ -n "$repair_issue" ]; then
    return 0
  fi

  if pull_request_has_terminal_idempotency_for_marker "$pull_number" "$marker"; then
    return 0
  fi

  return 1
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
  MOCK_PR_COMMENTS=""
  MOCK_PR_TERMINAL_MARKERS=""
  MOCK_REPAIR_ISSUES=""
  MOCK_REPAIR_ISSUE_CREATE_COUNT=0
  MOCK_PR_COMMENT_COUNT=0
  MOCK_BUILD_APPROVED_POSTS=0
  MOCK_ACTIVE_BUILDER_COUNT=0
  MOCK_CREATE_REPAIR_FAILS=0
}

# Issue #46: orphan claim-only marker must not permanently block retry.
reset_mocks
marker="$(orchestrator_idempotency_marker "review" "46" "orphan-sha")"
MOCK_PR_COMMENTS="${ORCHESTRATOR_REPAIR_CLAIM_PREFIX} Reserving idempotency
${marker}"

if repository_has_idempotency_for_pr_sha "review" "46" "orphan-sha"; then
  fail "orphan claim-only PR marker does not block retry"
else
  pass "orphan claim-only PR marker does not block retry"
fi

# Issue #46: failed repair issue creation leaves no blocking state; retry succeeds once.
reset_mocks
marker="$(orchestrator_idempotency_marker "review" "46" "retry-sha")"
MOCK_CREATE_REPAIR_FAILS=1
set +e
ensure_repair_issue_for_pr_sha "46" "retry-sha" "review" "$marker" \
  "orchestrator:review-repair" "P2" "44" >/dev/null 2>&1
create_result=$?
set -e
if [ "$create_result" -ne 0 ]; then
  pass "repair issue creation failure surfaces to caller"
else
  fail "repair issue creation failure surfaces to caller"
fi
MOCK_CREATE_REPAIR_FAILS=0
repair_issue="$(ensure_repair_issue_for_pr_sha "46" "retry-sha" "review" "$marker" \
  "orchestrator:review-repair" "P2" "44")"
if [ "$repair_issue" = "9999" ]; then
  pass "retry after create failure creates exactly one repair issue"
else
  fail "retry after create failure creates exactly one repair issue"
fi

# Duplicate reviewer event for same PR+SHA creates at most one repair issue (create-first flow).
reset_mocks
review_body="$(sample_review_p2)"
marker="$(orchestrator_idempotency_marker "review" "43" "deadbeef")"

if ! repository_has_idempotency_for_pr_sha "review" "43" "deadbeef"; then
  ensure_repair_issue_for_pr_sha "43" "deadbeef" "review" "$marker" \
    "orchestrator:review-repair" "P2" "44" >/dev/null
  post_unique_pr_comment "43" "$marker" \
    "${ORCHESTRATOR_REPAIR_TRIGGERED_PREFIX} Created/reused repair issue #9999 for P2 findings."
fi

first_create_count="$MOCK_REPAIR_ISSUE_CREATE_COUNT"

if repository_has_idempotency_for_pr_sha "review" "43" "deadbeef"; then
  pass "duplicate reviewer event detects repair issue or terminal PR marker"
else
  fail "duplicate reviewer event detects repair issue or terminal PR marker"
fi

if ! repository_has_idempotency_for_pr_sha "review" "43" "deadbeef"; then
  ensure_repair_issue_for_pr_sha "43" "deadbeef" "review" "$marker" \
    "orchestrator:review-repair" "P2" "44" >/dev/null
fi

if [ "$MOCK_REPAIR_ISSUE_CREATE_COUNT" -eq "$first_create_count" ]; then
  pass "duplicate reviewer event does not create second repair issue"
else
  fail "duplicate reviewer event does not create second repair issue"
fi

# Duplicate CI failure for same PR+SHA creates at most one repair issue.
reset_mocks
ci_marker="$(orchestrator_idempotency_marker "ci" "43" "cafebabe")"

if ! repository_has_idempotency_for_pr_sha "ci" "43" "cafebabe"; then
  ensure_repair_issue_for_pr_sha "43" "cafebabe" "ci" "$ci_marker" \
    "orchestrator:ci-repair" "CI" "44" >/dev/null
  post_unique_pr_comment "43" "$ci_marker" \
    "${ORCHESTRATOR_CI_REPAIR_TRIGGERED_PREFIX} Created/reused repair issue #9999 for CI failure."
fi

if repository_has_idempotency_for_pr_sha "ci" "43" "cafebabe"; then
  pass "duplicate CI failure detects repair issue or terminal PR marker"
else
  fail "duplicate CI failure detects repair issue or terminal PR marker"
fi

ci_create_count="$MOCK_REPAIR_ISSUE_CREATE_COUNT"
if ! repository_has_idempotency_for_pr_sha "ci" "43" "cafebabe"; then
  ensure_repair_issue_for_pr_sha "43" "cafebabe" "ci" "$ci_marker" \
    "orchestrator:ci-repair" "CI" "44" >/dev/null
fi

if [ "$MOCK_REPAIR_ISSUE_CREATE_COUNT" -eq "$ci_create_count" ]; then
  pass "duplicate CI failure does not create second repair issue"
else
  fail "duplicate CI failure does not create second repair issue"
fi

# Deferred path writes terminal PR-level marker only after repair issue exists.
reset_mocks
MOCK_ACTIVE_BUILDER_COUNT=1
defer_marker="$(orchestrator_idempotency_marker "review" "43" "defer-sha")"
ensure_repair_issue_for_pr_sha "43" "defer-sha" "review" "$defer_marker" \
  "orchestrator:review-repair" "P2" "44" >/dev/null
post_unique_pr_comment "43" "$defer_marker" "$ORCHESTRATOR_QUEUE_DEFERRED_COMMENT"

if [[ "$MOCK_PR_COMMENTS" == *"$ORCHESTRATOR_QUEUE_DEFERRED_COMMENT"* ]] \
  && [[ "$MOCK_PR_TERMINAL_MARKERS" == *"|${defer_marker}|"* ]]; then
  pass "deferred path writes terminal PR-level marker after repair issue exists"
else
  fail "deferred path writes terminal PR-level marker after repair issue exists"
fi

# Workflow concurrency groups are keyed by PR + event kind + SHA.
review_workflow="${SCRIPT_DIR}/../workflows/build-orchestrator-pr-review.yml"
ci_workflow="${SCRIPT_DIR}/../workflows/build-orchestrator-ci-failure.yml"
queue_workflow="${SCRIPT_DIR}/../workflows/build-orchestrator-queue.yml"

if grep -q 'concurrency:' "$review_workflow" \
  && grep -q 'orchestrator-review-pr-' "$review_workflow" \
  && grep -q 'review.commit_id' "$review_workflow"; then
  pass "review workflow concurrency keyed by PR and reviewed SHA"
else
  fail "review workflow concurrency keyed by PR and reviewed SHA"
fi

if grep -q 'concurrency:' "$ci_workflow" \
  && grep -q 'orchestrator-ci-pr-' "$ci_workflow" \
  && grep -q 'head_sha' "$ci_workflow"; then
  pass "CI workflow concurrency keyed by PR and head SHA"
else
  fail "CI workflow concurrency keyed by PR and head SHA"
fi

if grep -q 'concurrency:' "$queue_workflow" \
  && grep -q 'orchestrator-deferred-queue' "$queue_workflow"; then
  pass "queue workflow concurrency prevents overlapping deferred resume"
else
  fail "queue workflow concurrency prevents overlapping deferred resume"
fi

if [ "$failures" -ne 0 ]; then
  echo "${failures} idempotency contract test(s) failed."
  exit 1
fi

echo "All build-orchestrator idempotency contract tests passed."
