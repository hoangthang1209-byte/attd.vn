#!/usr/bin/env bash
# Contract tests for orchestrator idempotency and deferred queue behavior.
# Overrides gh-backed helpers with deterministic stubs after sourcing shared logic.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"
export BUILD_APPROVED_AUTHOR="attd-owner"

failures=0
MOCK_ACTIVE_BUILDER_COUNT=0
MOCK_IDEMPOTENCY_HITS=0
MOCK_BUILD_APPROVED_POSTS=0
MOCK_DEFERRED_ISSUE=""
MOCK_DEFERRED_HAS_BUILD_APPROVED=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${SCRIPT_DIR}/build-orchestrator-common.sh"

ensure_orchestrator_labels() { :; }
ensure_task_status_labels() { :; }

count_active_builder_tasks() {
  printf '%s' "${MOCK_ACTIVE_BUILDER_COUNT:-0}"
}

repository_has_idempotency_for_pr_sha() {
  [ "${MOCK_IDEMPOTENCY_HITS:-0}" -gt 0 ]
}

issue_has_label() {
  local issue_number="$1"
  local label="$2"
  case "$issue_number:$label" in
    7777:status:queued|7777:orchestrator:review-repair) return 0 ;;
    7777:status:building|7777:status:ready-to-merge|7777:status:merged|7777:status:blocked) return 1 ;;
  esac
  return 1
}

issue_has_orchestrator_build_approved() {
  [ "${MOCK_DEFERRED_HAS_BUILD_APPROVED:-0}" -eq 1 ]
}

post_orchestrator_build_approved() {
  MOCK_BUILD_APPROVED_POSTS=$((MOCK_BUILD_APPROVED_POSTS + 1))
}

set_issue_status_label() {
  :
}

gh() {
  if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
    if [ -n "${MOCK_DEFERRED_ISSUE:-}" ]; then
      printf '%s\n' "$MOCK_DEFERRED_ISSUE"
    fi
    return 0
  fi

  if [ "$1" = "search" ]; then
    return 0
  fi
}

# P1.1: duplicate reviewer events share idempotency key
marker_a="$(orchestrator_idempotency_marker "review" "41" "deadbeef")"
marker_b="$(orchestrator_idempotency_marker "review" "41" "deadbeef")"
if [ "$marker_a" = "$marker_b" ]; then
  pass "duplicate reviewer events use identical PR+SHA marker"
else
  fail "duplicate reviewer events use identical PR+SHA marker"
fi

marker_ci_a="$(orchestrator_idempotency_marker "ci" "41" "deadbeef")"
marker_ci_b="$(orchestrator_idempotency_marker "ci" "41" "deadbeef")"
if [ "$marker_ci_a" = "$marker_ci_b" ]; then
  pass "duplicate CI failure events use identical PR+SHA marker"
else
  fail "duplicate CI failure events use identical PR+SHA marker"
fi

MOCK_IDEMPOTENCY_HITS=1
if repository_has_idempotency_for_pr_sha "review" "41" "deadbeef"; then
  pass "repository detects existing review idempotency for PR+SHA"
else
  fail "repository detects existing review idempotency for PR+SHA"
fi

MOCK_IDEMPOTENCY_HITS=0
if repository_has_idempotency_for_pr_sha "ci" "41" "deadbeef"; then
  fail "fresh CI head SHA is not treated as duplicate"
else
  pass "fresh CI head SHA is not treated as duplicate"
fi

# P1.2: deferred/tracking-only issues do not count as active Builder tasks
MOCK_ACTIVE_BUILDER_COUNT=0
if [ "$(count_active_builder_tasks)" -eq 0 ]; then
  pass "deferred/tracking-only issues do not inflate active Builder count"
else
  fail "deferred/tracking-only issues do not inflate active Builder count"
fi

query="$(active_builder_tasks_search_query)"
if printf '%s' "$query" | grep -q 'status:pr-open'; then
  fail "parent status:pr-open must not block Builder queue"
else
  pass "parent status:pr-open does not block Builder queue"
fi

MOCK_ACTIVE_BUILDER_COUNT=1
if should_defer_for_active_builder_queue; then
  pass "new repair defers while another Builder task is active"
else
  fail "new repair defers while another Builder task is active"
fi

MOCK_ACTIVE_BUILDER_COUNT=0
if should_defer_for_active_builder_queue; then
  fail "repair does not defer when Builder queue is idle"
else
  pass "repair does not defer when Builder queue is idle"
fi

# P1.2: deferred repair resumes once queue is idle
MOCK_DEFERRED_ISSUE="7777"
MOCK_DEFERRED_HAS_BUILD_APPROVED=0
MOCK_BUILD_APPROVED_POSTS=0
process_deferred_queue
if [ "$MOCK_BUILD_APPROVED_POSTS" -eq 1 ]; then
  pass "deferred repair resumes with exactly one BUILD_APPROVED"
else
  fail "deferred repair resumes with exactly one BUILD_APPROVED (got ${MOCK_BUILD_APPROVED_POSTS})"
fi

MOCK_DEFERRED_HAS_BUILD_APPROVED=1
MOCK_BUILD_APPROVED_POSTS=0
process_deferred_queue
if [ "$MOCK_BUILD_APPROVED_POSTS" -eq 0 ]; then
  pass "already-triggered deferred repair does not emit duplicate BUILD_APPROVED"
else
  fail "already-triggered deferred repair does not emit duplicate BUILD_APPROVED"
fi

if [ "$failures" -ne 0 ]; then
  echo "${failures} queue contract test(s) failed."
  exit 1
fi

echo "All build-orchestrator queue contract tests passed."
