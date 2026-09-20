#!/usr/bin/env bash
# Direct contract tests for pull_request_has_terminal_idempotency_for_marker jq predicate.
# Exercises the real jq terminal_comment filter via mocked gh pr view JSON (no GitHub API).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="attd/test"

failures=0
MOCK_PR_VIEW_JSON=""

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }

gh() {
  if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
    shift 2
    shift # pull number
    local jq_program=""
    local marker_value=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --json)
          shift 2
          ;;
        --jq)
          shift
          ;;
        --arg)
          if [ "$2" = "marker" ]; then
            marker_value="$3"
            shift 3
          else
            shift 3
          fi
          ;;
        *)
          jq_program="$1"
          shift
          ;;
      esac
    done
    jq --arg marker "$marker_value" "$jq_program" <<< "$MOCK_PR_VIEW_JSON"
    return 0
  fi
  echo "unexpected gh call: $*" >&2
  return 1
}

# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${SCRIPT_DIR}/build-orchestrator-common.sh"

pull_number=51
head_sha="deadbeef"
marker="$(orchestrator_idempotency_marker "review" "$pull_number" "$head_sha")"

pr_view_json() {
  local comment_body="$1"
  jq -n --arg body "$comment_body" '{body: "", comments: [{body: $body}]}'
}

assert_terminal_predicate() {
  local name="$1"
  local comment_body="$2"
  local expect_terminal="$3"

  MOCK_PR_VIEW_JSON="$(pr_view_json "$comment_body")"
  if pull_request_has_terminal_idempotency_for_marker "$pull_number" "$marker"; then
    if [ "$expect_terminal" = "true" ]; then
      pass "$name"
    else
      fail "$name (expected not terminal, got terminal)"
    fi
  else
    if [ "$expect_terminal" = "false" ]; then
      pass "$name"
    else
      fail "$name (expected terminal, got not terminal)"
    fi
  fi
}

claim_only_body="${marker}
${ORCHESTRATOR_REPAIR_CLAIM_PREFIX} Reserving idempotency for PR #${pull_number}."

triggered_body="${marker}
${ORCHESTRATOR_REPAIR_TRIGGERED_PREFIX} Created/reused repair issue #99."

deferred_body="${marker}
${ORCHESTRATOR_QUEUE_DEFERRED_COMMENT}"

assert_terminal_predicate \
  "marker + ORCHESTRATOR_REPAIR_CLAIM only is not terminal" \
  "$claim_only_body" \
  "false"

assert_terminal_predicate \
  "marker + ORCHESTRATOR_REPAIR_TRIGGERED is terminal" \
  "$triggered_body" \
  "true"

assert_terminal_predicate \
  "marker + ORCHESTRATOR_QUEUE_DEFERRED is terminal" \
  "$deferred_body" \
  "true"

if [ "$failures" -ne 0 ]; then
  echo "${failures} terminal predicate contract test(s) failed."
  exit 1
fi

echo "All build-orchestrator terminal predicate contract tests passed."
