#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"
export BUILD_APPROVED_AUTHOR="attd-owner"
export REVIEW_WATCHDOG_TIMEOUT_MINUTES="${REVIEW_WATCHDOG_TIMEOUT_MINUTES:-25}"
export REVIEW_WATCHDOG_RETRY_COOLDOWN_MINUTES="${REVIEW_WATCHDOG_RETRY_COOLDOWN_MINUTES:-25}"
# shellcheck source=.github/scripts/review-orchestrator-common.sh
source "${SCRIPT_DIR}/review-orchestrator-common.sh"

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

MOCK_PR_HEAD_SHA="bbb111"
MOCK_PR_DRAFT="false"
MOCK_CI_STATE="success"
MOCK_LINKED_ISSUES=(210)
MOCK_PR_COMMENTS=""
MOCK_REVIEWS_JSON='[]'
MOCK_HIGH_RISK=1
MOCK_ISSUE_COMMENTS=""
declare -A MOCK_MARKER_CREATED_EPOCH=()

mock_epoch_to_iso() {
  date -u -d "@$1" +"%Y-%m-%dT%H:%M:%SZ"
}

mock_record_marker_from_body() {
  local body="$1"
  local marker line
  while IFS= read -r line; do
    if [[ "$line" == REVIEW_ORCHESTRATOR_IDEMPOTENCY:* ]]; then
      marker="$line"
      MOCK_MARKER_CREATED_EPOCH["$marker"]="${REVIEW_ORCHESTRATOR_NOW_EPOCH:-$(date -u +%s)}"
    fi
  done <<< "$body"
}

gh() {
  case "$1" in
    pr)
      if [ "$2" = "view" ]; then
        local json_field="${5:-}"
        if [ "$4" = "--json" ] && [ "$json_field" = "headRefOid" ]; then
          printf '%s' "$MOCK_PR_HEAD_SHA"
          return 0
        fi
        if [ "$4" = "--json" ] && [ "$json_field" = "isDraft" ]; then
          printf '%s' "$MOCK_PR_DRAFT"
          return 0
        fi
        if [ "$4" = "--json" ] && [ "$json_field" = "comments" ]; then
          if [ "${6:-}" = "--jq" ]; then
            local jq_expr="${10:-}"
            local marker="${9:-}"
            if [[ "$jq_expr" == *"createdAt"* ]]; then
              if [ -n "$marker" ] && [ -n "${MOCK_MARKER_CREATED_EPOCH[$marker]:-}" ]; then
                mock_epoch_to_iso "${MOCK_MARKER_CREATED_EPOCH[$marker]}"
              else
                printf ''
              fi
              return 0
            fi
            if [ -n "$marker" ] && [[ "$MOCK_PR_COMMENTS" == *"$marker"* ]]; then
              printf '1'
            else
              printf '0'
            fi
            return 0
          fi
          printf '{"comments":[]}'
          return 0
        fi
      fi
      if [ "$2" = "comment" ]; then
        shift 2
        while [ $# -gt 0 ]; do
          if [ "$1" = "--body" ]; then
            mock_record_marker_from_body "$2"
            MOCK_PR_COMMENTS="${MOCK_PR_COMMENTS}"$'\n'"$2"
            shift 2
            continue
          fi
          shift
        done
        return 0
      fi
      ;;
    api)
      if [[ "$2" == *"/status" ]]; then
        printf '%s' "$MOCK_CI_STATE"
        return 0
      fi
      if [[ "$2" == *"/reviews" ]]; then
        printf '%s' "$MOCK_REVIEWS_JSON"
        return 0
      fi
      ;;
    issue)
      if [ "$2" = "view" ] && [ "$4" = "labels" ]; then
        printf '[]'
        return 0
      fi
      if [ "$2" = "view" ] && [ "$4" = "comments" ]; then
        if [[ "${6:-}" == *"contains(\$marker)"* ]]; then
          local marker="${9:-}"
          if [ -n "$marker" ] && [[ "$MOCK_ISSUE_COMMENTS" == *"$marker"* ]]; then
            printf '1'
          else
            printf '0'
          fi
          return 0
        fi
        printf '{"comments":[]}'
        return 0
      fi
      if [ "$2" = "comment" ]; then
        shift 2
        while [ $# -gt 0 ]; do
          if [ "$1" = "--body" ]; then
            mock_record_marker_from_body "$2"
            MOCK_ISSUE_COMMENTS="${MOCK_ISSUE_COMMENTS}"$'\n'"$2"
            shift 2
            continue
          fi
          shift
        done
        return 0
      fi
      ;;
    label)
      return 0
      ;;
  esac
  return 1
}

linked_issue_numbers_from_pr() {
  printf '%s\n' "${MOCK_LINKED_ISSUES[@]}"
}

is_high_risk_issue() {
  [ "$MOCK_HIGH_RISK" -eq 0 ]
}

set_issue_status_label() {
  return 0
}

ensure_orchestrator_labels() {
  return 0
}

ensure_task_status_labels() {
  return 0
}

# Scenario: first request emits exactly one REQUEST comment for head.
MOCK_PR_COMMENTS=""
MOCK_PR_HEAD_SHA="head-b"
MOCK_CI_STATE="success"
handle_exact_head_review_orchestration "99" "head-b" "test"
if [[ "$MOCK_PR_COMMENTS" == *"REQUEST_INDEPENDENT_REVIEW"* ]] \
  && [[ "$MOCK_PR_COMMENTS" == *"REVIEW_ORCHESTRATOR_IDEMPOTENCY: request-pr-99-sha-head-b"* ]]; then
  pass "initial exact-head review request posts one marker comment"
else
  fail "initial exact-head review request posts one marker comment"
fi

# Scenario: duplicate orchestration call does not duplicate marker.
before="$MOCK_PR_COMMENTS"
handle_exact_head_review_orchestration "99" "head-b" "test-dedupe"
if [ "$MOCK_PR_COMMENTS" = "$before" ]; then
  pass "duplicate request is idempotent for the same head"
else
  fail "duplicate request is idempotent for the same head"
fi

# Scenario: stale reviewed sha vs current head is ignored by merge gate helper.
MOCK_PR_HEAD_SHA="head-current"
if review_is_stale_for_current_head "99" "head-old"; then
  pass "review_is_stale_for_current_head detects stale SHA"
else
  fail "review_is_stale_for_current_head detects stale SHA"
fi

# Scenario: watchdog request → timeout → one retry → cooldown dedupe → stall + WAIT_HUMAN on linked issue.
MOCK_PR_COMMENTS=""
MOCK_ISSUE_COMMENTS=""
MOCK_MARKER_CREATED_EPOCH=()
MOCK_PR_HEAD_SHA="head-watchdog"
MOCK_CI_STATE="success"
BASE_EPOCH=1700000000
REVIEW_ORCHESTRATOR_NOW_EPOCH="$BASE_EPOCH"

handle_exact_head_review_orchestration "88" "head-watchdog" "watchdog-request"
request_marker="${REVIEW_ORCHESTRATOR_MARKER_PREFIX} request-pr-88-sha-head-watchdog"
retry_marker="${REVIEW_ORCHESTRATOR_MARKER_PREFIX} retry-pr-88-sha-head-watchdog"
stalled_marker="${REVIEW_ORCHESTRATOR_MARKER_PREFIX} stalled-pr-88-sha-head-watchdog"

if [[ "$MOCK_PR_COMMENTS" == *"$request_marker"* ]] \
  && [[ "$MOCK_PR_COMMENTS" != *"$retry_marker"* ]]; then
  pass "watchdog step 1 posts initial request only"
else
  fail "watchdog step 1 posts initial request only"
fi

REVIEW_ORCHESTRATOR_NOW_EPOCH=$((BASE_EPOCH + 10 * 60))
before_wait="$MOCK_PR_COMMENTS"
handle_exact_head_review_orchestration "88" "head-watchdog" "watchdog-wait"
if [ "$MOCK_PR_COMMENTS" = "$before_wait" ]; then
  pass "watchdog waits before timeout (no premature retry)"
else
  fail "watchdog waits before timeout (no premature retry)"
fi

REVIEW_ORCHESTRATOR_NOW_EPOCH=$((BASE_EPOCH + 26 * 60))
handle_exact_head_review_orchestration "88" "head-watchdog" "watchdog-retry"
if [[ "$MOCK_PR_COMMENTS" == *"$retry_marker"* ]]; then
  pass "watchdog posts exactly one retry after timeout"
else
  fail "watchdog posts exactly one retry after timeout"
fi

REVIEW_ORCHESTRATOR_NOW_EPOCH=$((BASE_EPOCH + 35 * 60))
before_cooldown="$MOCK_PR_COMMENTS"
handle_exact_head_review_orchestration "88" "head-watchdog" "watchdog-retry-cooldown"
if [ "$MOCK_PR_COMMENTS" = "$before_cooldown" ]; then
  pass "watchdog retry cooldown prevents third request before stall"
else
  fail "watchdog retry cooldown prevents third request before stall"
fi

REVIEW_ORCHESTRATOR_NOW_EPOCH=$((BASE_EPOCH + 52 * 60))
handle_exact_head_review_orchestration "88" "head-watchdog" "watchdog-stall"
if [[ "$MOCK_PR_COMMENTS" == *"$stalled_marker"* ]] \
  && [[ "$MOCK_PR_COMMENTS" == *"WAIT_HUMAN"* ]] \
  && [[ "$MOCK_ISSUE_COMMENTS" == *"$stalled_marker"* ]] \
  && [[ "$MOCK_ISSUE_COMMENTS" == *"WAIT_HUMAN"* ]]; then
  pass "watchdog marks stalled and posts WAIT_HUMAN on linked issue"
else
  fail "watchdog marks stalled and posts WAIT_HUMAN on linked issue"
fi

request_count="$(printf '%s' "$MOCK_PR_COMMENTS" | grep -c 'REQUEST_INDEPENDENT_REVIEW' || true)"
if [ "$request_count" -eq 2 ]; then
  pass "watchdog emits two review requests total (initial + retry, no storm)"
else
  fail "watchdog emits two review requests total (initial + retry, no storm) (count=${request_count})"
fi

if [ "$fail" -gt 0 ]; then
  echo "Review orchestrator tests failed: ${fail} failure(s), ${pass} pass(es)."
  exit 1
fi

echo "Review orchestrator tests passed: ${pass} pass(es)."
