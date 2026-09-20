#!/usr/bin/env bash
# Contract tests for issue_is_deferred_repair stale defer comment handling.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"
export BUILD_APPROVED_AUTHOR="attd-owner"

failures=0
MOCK_ISSUE_COMMENTS_JSON=""
MOCK_ISSUE_HAS_QUEUED_LABEL=0
MOCK_ISSUE_HAS_BUILD_APPROVED=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

gh() {
  if [ "$1" = "issue" ] && [ "$2" = "view" ]; then
    shift 2
    local issue_number=""
    local jq_program=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --json)
          shift
          ;;
        --jq)
          shift
          ;;
        *)
          if [[ "$1" =~ ^[0-9]+$ ]]; then
            issue_number="$1"
            shift
          else
            jq_program="$1"
            shift
          fi
          ;;
      esac
    done

    if [ "$issue_number" != "9001" ]; then
      echo "unexpected issue view: ${issue_number}" >&2
      return 1
    fi

    jq "$jq_program" <<< "$MOCK_ISSUE_COMMENTS_JSON"
    return 0
  fi

  echo "unexpected gh call: $*" >&2
  return 1
}

# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${SCRIPT_DIR}/build-orchestrator-common.sh"

issue_has_label() {
  local issue_number="$1"
  local label="$2"
  if [ "$issue_number" = "9001" ] && [ "$label" = "status:queued" ]; then
    [ "${MOCK_ISSUE_HAS_QUEUED_LABEL:-0}" -eq 1 ]
    return $?
  fi
  return 1
}

issue_has_orchestrator_build_approved() {
  [ "${MOCK_ISSUE_HAS_BUILD_APPROVED:-0}" -eq 1 ]
}

MOCK_ISSUE_HAS_QUEUED_LABEL=0
MOCK_ISSUE_HAS_BUILD_APPROVED=0
MOCK_ISSUE_COMMENTS_JSON='{"comments":[{"body":"ORCHESTRATOR_QUEUE_DEFERRED: Another Builder task is active; repair trigger deferred."}]}'

if issue_is_deferred_repair 9001; then
  pass "defer comment without BUILD_APPROVED is still treated as deferred"
else
  fail "defer comment without BUILD_APPROVED is still treated as deferred"
fi

MOCK_ISSUE_HAS_BUILD_APPROVED=1
if issue_is_deferred_repair 9001; then
  fail "defer comment with BUILD_APPROVED must not keep issue deferred"
else
  pass "defer comment with BUILD_APPROVED must not keep issue deferred"
fi

MOCK_ISSUE_HAS_QUEUED_LABEL=1
if issue_is_deferred_repair 9001; then
  pass "status:queued still marks issue as deferred even with BUILD_APPROVED"
else
  fail "status:queued still marks issue as deferred even with BUILD_APPROVED"
fi

if [ "$failures" -ne 0 ]; then
  echo "${failures} deferred repair contract test(s) failed."
  exit 1
fi

echo "All build-orchestrator deferred repair contract tests passed."
