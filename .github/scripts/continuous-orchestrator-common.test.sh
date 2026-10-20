#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-hoangthang1209-byte/attd.vn}"
# shellcheck source=.github/scripts/continuous-orchestrator-common.sh
source "${SCRIPT_DIR}/continuous-orchestrator-common.sh"

pass=0
fail=0

pass() { pass=$((pass + 1)); echo "PASS: $1"; }
fail() { fail=$((fail + 1)); echo "FAIL: $1"; }

MOCK_PR_HEAD="merge-head-sha"
MOCK_MERGEABLE="MERGEABLE"
MOCK_MERGE_STATE="CLEAN"
MOCK_CHECKS="SUCCESS"
MOCK_CI_GREEN=1
MOCK_REVIEW_CLEAN=1
MOCK_READY_TO_MERGE=1
MOCK_FACTORY_ELIGIBLE=1
MOCK_MERGE_API_CALLS=0
MOCK_PR_COMMENT_COUNT=0

pull_request_head_sha() { printf '%s' "$MOCK_PR_HEAD"; }
pull_request_is_draft() { return 1; }
is_factory_continuous_loop_pull_request() { [ "${MOCK_FACTORY_ELIGIBLE:-1}" -eq 1 ]; }
commit_ci_is_green() { [ "${MOCK_CI_GREEN:-1}" -eq 1 ]; }
independent_review_clean_for_merge() { [ "${MOCK_REVIEW_CLEAN:-1}" -eq 1 ]; }
pull_request_has_ready_to_merge_for_head() { [ "${MOCK_READY_TO_MERGE:-1}" -eq 1 ]; }
pull_request_merge_state() {
  printf '%s\t%s\tAPPROVED\t%s' "$MOCK_MERGEABLE" "$MOCK_MERGE_STATE" "$MOCK_CHECKS"
}
pr_has_marker_comment() { return 1; }
post_continuous_pr_comment() { MOCK_PR_COMMENT_COUNT=$((MOCK_PR_COMMENT_COUNT + 1)); }
set_linked_issues_status() { :; }
pull_request_is_draft() { return 1; }

gh() {
  if [ "$1" = "api" ] && [ "$2" = "--method" ] && [ "$3" = "PUT" ]; then
    MOCK_MERGE_API_CALLS=$((MOCK_MERGE_API_CALLS + 1))
    return 0
  fi
  return 0
}

reset() {
  MOCK_PR_HEAD="merge-head-sha"
  MOCK_MERGEABLE="MERGEABLE"
  MOCK_MERGE_STATE="CLEAN"
  MOCK_CHECKS="SUCCESS"
  MOCK_CI_GREEN=1
  MOCK_REVIEW_CLEAN=1
  MOCK_READY_TO_MERGE=1
  MOCK_FACTORY_ELIGIBLE=1
  MOCK_MERGE_API_CALLS=0
  MOCK_PR_COMMENT_COUNT=0
}

reset
attempt_auto_merge_for_head 42 "merge-head-sha" "test"
if [ "$MOCK_MERGE_API_CALLS" -eq 1 ] && [ "$MOCK_PR_COMMENT_COUNT" -eq 1 ]; then
  pass "merge gate satisfied triggers exactly one merge API call"
else
  fail "merge gate satisfied triggers exactly one merge API call (api=${MOCK_MERGE_API_CALLS}, comments=${MOCK_PR_COMMENT_COUNT})"
fi

reset
MOCK_PR_HEAD="other-head"
attempt_auto_merge_for_head 42 "stale-head" "test"
if [ "$MOCK_MERGE_API_CALLS" -eq 0 ]; then
  pass "stale head sha does not attempt merge"
else
  fail "stale head sha does not attempt merge"
fi

reset
MOCK_REVIEW_CLEAN=0
attempt_auto_merge_for_head 42 "merge-head-sha" "test"
if [ "$MOCK_MERGE_API_CALLS" -eq 0 ]; then
  pass "missing clean exact-head review blocks merge"
else
  fail "missing clean exact-head review blocks merge"
fi

if [ "$fail" -gt 0 ]; then
  echo "continuous orchestrator tests failed: ${fail} failure(s), ${pass} pass(es)."
  exit 1
fi

echo "continuous orchestrator tests passed: ${pass} pass(es)."
