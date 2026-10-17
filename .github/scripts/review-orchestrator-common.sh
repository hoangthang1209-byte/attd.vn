#!/usr/bin/env bash
# Exact-head independent reviewer orchestration for ATTD Agent OS / software factory PRs.
set -euo pipefail

REVIEW_ORCHESTRATOR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.github/scripts/build-orchestrator-common.sh
source "${REVIEW_ORCHESTRATOR_SCRIPT_DIR}/build-orchestrator-common.sh"

readonly REVIEW_ORCHESTRATOR_MARKER_PREFIX="REVIEW_ORCHESTRATOR_IDEMPOTENCY:"
readonly REVIEW_ORCHESTRATOR_REQUESTED_PREFIX="REVIEW_ORCHESTRATOR_REQUESTED:"
readonly REVIEW_ORCHESTRATOR_STALLED_PREFIX="REVIEW_ORCHESTRATOR_STALLED:"
readonly REQUEST_INDEPENDENT_REVIEW_TOKEN="REQUEST_INDEPENDENT_REVIEW"
REVIEW_WATCHDOG_TIMEOUT_MINUTES="${REVIEW_WATCHDOG_TIMEOUT_MINUTES:-25}"
REVIEW_WATCHDOG_RETRY_COOLDOWN_MINUTES="${REVIEW_WATCHDOG_RETRY_COOLDOWN_MINUTES:-25}"

review_orchestrator_idempotency_marker() {
  local kind="$1"
  local pull_number="$2"
  local head_sha="$3"
  printf '%s %s-pr-%s-sha-%s' "$REVIEW_ORCHESTRATOR_MARKER_PREFIX" "$kind" "$pull_number" "$head_sha"
}

pull_request_head_sha() {
  local pull_number="$1"
  gh pr view "$pull_number" --json headRefOid --jq '.headRefOid'
}

pull_request_is_draft() {
  local pull_number="$1"
  gh pr view "$pull_number" --json isDraft --jq '.isDraft' | grep -qx 'true'
}

commit_ci_state_for_sha() {
  local head_sha="$1"
  gh api "repos/${GITHUB_REPOSITORY}/commits/${head_sha}/status" --jq '.state' 2>/dev/null || printf 'unknown'
}

commit_ci_is_green() {
  local state
  state="$(commit_ci_state_for_sha "$1")"
  [ "$state" = "success" ]
}

is_factory_pull_request_for_review() {
  local pull_number="$1"
  local issue_number

  if pull_request_is_draft "$pull_number"; then
    return 1
  fi

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" 2>/dev/null || true)
  if [ "${#linked_issues[@]}" -eq 0 ]; then
    return 1
  fi

  for issue_number in "${linked_issues[@]}"; do
    if is_high_risk_issue "$issue_number"; then
      return 1
    fi
  done

  return 0
}

pr_comment_bodies_containing_marker() {
  local pull_number="$1"
  local marker="$2"

  gh pr view "$pull_number" --json comments --jq \
    --arg marker "$marker" '[.comments[].body | select(contains($marker))] | length' 2>/dev/null || printf '0'
}

pr_has_marker_comment() {
  local pull_number="$1"
  local marker="$2"
  [ "$(pr_comment_bodies_containing_marker "$pull_number" "$marker")" -gt 0 ]
}

independent_review_body_matches() {
  local body="$1"
  is_attd_pr_reviewer_review "$body"
}

find_independent_review_for_head_sha() {
  local pull_number="$1"
  local head_sha="$2"

  gh api "repos/${GITHUB_REPOSITORY}/pulls/${pull_number}/reviews" --paginate \
    --jq --arg head "$head_sha" '
      [.[]
        | select(.commit_id == $head)
        | select((.body // "") | length > 0)
        | select(
            ((.body // "") | contains("CURSOR_AUTOMATION_ID:"))
            and ((.body // "") | contains("Independent ATTD PR Review"))
          )
      ] | length > 0
    ' 2>/dev/null | grep -qx 'true'
}

latest_marker_comment_created_epoch() {
  local pull_number="$1"
  local marker="$2"

  gh pr view "$pull_number" --json comments --jq \
    --arg marker "$marker" '
      [.comments[]
        | select(.body | contains($marker))
        | .createdAt] | max // empty
    ' 2>/dev/null
}

review_orchestrator_now_epoch() {
  if [ -n "${REVIEW_ORCHESTRATOR_NOW_EPOCH:-}" ]; then
    printf '%s' "$REVIEW_ORCHESTRATOR_NOW_EPOCH"
    return 0
  fi
  date -u +%s
}

minutes_since_iso_timestamp() {
  local iso="$1"
  local now_epoch then_epoch
  [ -z "$iso" ] && return 1
  now_epoch="$(review_orchestrator_now_epoch)"
  then_epoch="$(date -u -d "$iso" +%s 2>/dev/null || return 1)"
  printf '%s' "$(( (now_epoch - then_epoch) / 60 ))"
}

post_review_orchestrator_pr_comment() {
  local pull_number="$1"
  local marker="$2"
  local body="$3"

  if pr_has_marker_comment "$pull_number" "$marker"; then
    echo "PR #${pull_number} already has review orchestrator marker ${marker}; skipping duplicate comment."
    return 0
  fi

  gh pr comment "$pull_number" --body "${body}

${marker}"
}

post_review_stalled_on_linked_issues() {
  local pull_number="$1"
  local head_sha="$2"
  local marker="$3"
  local body="${REVIEW_ORCHESTRATOR_STALLED_PREFIX} Independent reviewer did not complete for head \`${head_sha:0:7}\` after bounded retries. WAIT_HUMAN required.

${marker}"

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" 2>/dev/null || true)
  for issue_number in "${linked_issues[@]}"; do
    if gh issue view "$issue_number" --json comments --jq \
      --arg marker "$marker" '[.comments[].body | select(contains($marker))] | length > 0' \
      | grep -qx 'true'; then
      continue
    fi
    gh issue comment "$issue_number" --body "$body"
  done
}

request_independent_review_for_head() {
  local pull_number="$1"
  local head_sha="$2"
  local kind="$3"
  local marker
  marker="$(review_orchestrator_idempotency_marker "$kind" "$pull_number" "$head_sha")"

  post_review_orchestrator_pr_comment "$pull_number" "$marker" \
    "${REQUEST_INDEPENDENT_REVIEW_TOKEN}

${REVIEW_ORCHESTRATOR_REQUESTED_PREFIX} Queue Independent ATTD PR Review for exact head \`${head_sha}\`.

PR_HEAD_SHA: \`${head_sha}\`"
}

handle_exact_head_review_orchestration() {
  local pull_number="$1"
  local head_sha="$2"
  local source="${3:-unknown}"

  ensure_orchestrator_labels

  if ! is_factory_pull_request_for_review "$pull_number"; then
    echo "PR #${pull_number} is not eligible for factory review orchestration (${source}); skipping."
    return 0
  fi

  local current_head
  current_head="$(pull_request_head_sha "$pull_number")"
  if [ "$head_sha" != "$current_head" ]; then
    echo "Ignoring stale head ${head_sha}; PR #${pull_number} is now at ${current_head} (${source})."
    head_sha="$current_head"
  fi

  if ! commit_ci_is_green "$head_sha"; then
    echo "CI is not green for PR #${pull_number} @ ${head_sha} (${source}); waiting."
    set_linked_issues_status "$pull_number" "status:ci-review"
    return 0
  fi

  if find_independent_review_for_head_sha "$pull_number" "$head_sha"; then
    echo "Independent review already present for PR #${pull_number} @ ${head_sha}."
    return 0
  fi

  local request_marker retry_marker stalled_marker
  request_marker="$(review_orchestrator_idempotency_marker "request" "$pull_number" "$head_sha")"
  retry_marker="$(review_orchestrator_idempotency_marker "retry" "$pull_number" "$head_sha")"
  stalled_marker="$(review_orchestrator_idempotency_marker "stalled" "$pull_number" "$head_sha")"

  if pr_has_marker_comment "$pull_number" "$stalled_marker"; then
    echo "PR #${pull_number} @ ${head_sha} is already REVIEW_ORCHESTRATOR_STALLED; skipping."
    post_review_stalled_on_linked_issues "$pull_number" "$head_sha" "$stalled_marker"
    return 0
  fi

  if ! pr_has_marker_comment "$pull_number" "$request_marker"; then
    echo "Requesting independent review for PR #${pull_number} @ ${head_sha} (${source})."
    request_independent_review_for_head "$pull_number" "$head_sha" "request"
    set_linked_issues_status "$pull_number" "status:ci-review"
    return 0
  fi

  local request_created minutes_waiting
  request_created="$(latest_marker_comment_created_epoch "$pull_number" "$request_marker")"
  minutes_waiting="$(minutes_since_iso_timestamp "$request_created" || printf '0')"

  if ! pr_has_marker_comment "$pull_number" "$retry_marker"; then
    if [ "${minutes_waiting:-0}" -lt "$REVIEW_WATCHDOG_TIMEOUT_MINUTES" ]; then
      echo "Review request pending for ${minutes_waiting}m (< ${REVIEW_WATCHDOG_TIMEOUT_MINUTES}m); waiting (${source})."
      return 0
    fi

    echo "Retrying independent review for PR #${pull_number} @ ${head_sha} (${source})."
    request_independent_review_for_head "$pull_number" "$head_sha" "retry"
    return 0
  fi

  local retry_created minutes_since_retry
  retry_created="$(latest_marker_comment_created_epoch "$pull_number" "$retry_marker")"
  minutes_since_retry="$(minutes_since_iso_timestamp "$retry_created" || printf '0')"

  if [ "${minutes_since_retry:-0}" -lt "$REVIEW_WATCHDOG_RETRY_COOLDOWN_MINUTES" ]; then
    echo "Review retry pending for ${minutes_since_retry}m; waiting (${source})."
    return 0
  fi

  echo "Marking PR #${pull_number} @ ${head_sha} as REVIEW_ORCHESTRATOR_STALLED (${source})."
  post_review_orchestrator_pr_comment "$pull_number" "$stalled_marker" \
    "${REVIEW_ORCHESTRATOR_STALLED_PREFIX} Independent reviewer did not complete for head \`${head_sha}\` after bounded retries. WAIT_HUMAN required."
  post_review_stalled_on_linked_issues "$pull_number" "$head_sha" "$stalled_marker"
}

list_open_factory_pull_requests() {
  gh pr list \
    --repo "$GITHUB_REPOSITORY" \
    --state open \
    --json number \
    --jq '.[].number' 2>/dev/null || true
}

process_review_orchestrator_watchdog() {
  local pull_number

  while IFS= read -r pull_number; do
    [ -z "$pull_number" ] && continue
    if ! is_factory_pull_request_for_review "$pull_number"; then
      continue
    fi
    handle_exact_head_review_orchestration "$pull_number" "$(pull_request_head_sha "$pull_number")" "watchdog"
  done < <(list_open_factory_pull_requests)
}

review_is_stale_for_current_head() {
  local pull_number="$1"
  local reviewed_sha="$2"
  local current_head
  current_head="$(pull_request_head_sha "$pull_number")"
  [ "$reviewed_sha" != "$current_head" ]
}
