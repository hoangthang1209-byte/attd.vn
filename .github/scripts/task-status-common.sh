#!/usr/bin/env bash
# Shared helpers for ATTD GitHub task status label automation (Phase F1a).
set -euo pipefail

readonly STATUS_LABEL_PREFIX="status:"
readonly STALLED_COMMENT='TASK_STALLED: No linked PR was created within 45 minutes after BUILD_APPROVED.'
readonly BUILD_APPROVED_AUTHOR="${BUILD_APPROVED_AUTHOR:-${GITHUB_REPOSITORY_OWNER:-}}"
readonly STALL_THRESHOLD_MINUTES="${STALL_THRESHOLD_MINUTES:-45}"

ensure_task_status_labels() {
  local labels=(
    "status:approved|0E8A16|Approved for implementation"
    "status:building|1D76DB|Build in progress"
    "status:stalled|D93F0B|Approved but no linked PR within watchdog threshold"
    "status:pr-open|FBCA04|Linked pull request is open"
    "status:merged|6F42C1|Linked pull request merged"
    "risk:low|C2E0C6|Low-risk change"
    "risk:medium|FEF2C0|Medium-risk change"
    "risk:high|B60205|High-risk change"
  )

  for entry in "${labels[@]}"; do
    IFS='|' read -r name color description <<< "$entry"
    gh label create "$name" --color "$color" --description "$description" --force >/dev/null
  done
}

is_authorized_build_approved_comment() {
  local body="$1"
  local author="$2"
  local normalized

  normalized="$(printf '%s' "$body" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ "$normalized" = "BUILD_APPROVED" ] && [ "$author" = "$BUILD_APPROVED_AUTHOR" ]
}

closing_issue_numbers_from_pr_body_text() {
  local body_text="$1"

  if [ -z "$body_text" ]; then
    return 0
  fi

  printf '%s' "$body_text" | grep -ioE '(close[ds]?|fixe[ds]?|resolve[ds]?)[[:space:]]+([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+#|#)[0-9]+' \
    | grep -ioE '[0-9]+$' \
    | sort -nu
}

clear_issue_status_labels() {
  local issue_number="$1"

  mapfile -t current_status_labels < <(
    gh issue view "$issue_number" --json labels --jq \
      --arg prefix "$STATUS_LABEL_PREFIX" '.labels[].name | select(startswith($prefix))'
  )

  if [ "${#current_status_labels[@]}" -eq 0 ]; then
    return 0
  fi

  local remove_args=()
  for label in "${current_status_labels[@]}"; do
    remove_args+=(--remove-label "$label")
  done

  gh issue edit "$issue_number" "${remove_args[@]}"
}

set_issue_status_label() {
  local issue_number="$1"
  local target_status="$2"

  mapfile -t current_status_labels < <(
    gh issue view "$issue_number" --json labels --jq \
      --arg prefix "$STATUS_LABEL_PREFIX" '.labels[].name | select(startswith($prefix))'
  )

  local remove_args=()
  for label in "${current_status_labels[@]}"; do
    if [[ "$label" != "$target_status" ]]; then
      remove_args+=(--remove-label "$label")
    fi
  done

  gh issue edit "$issue_number" --add-label "$target_status" "${remove_args[@]}"
}

open_linked_pull_request_count() {
  local issue_number="$1"
  gh pr list \
    --repo "$GITHUB_REPOSITORY" \
    --search "linked:issue-${issue_number}" \
    --state open \
    --json number \
    --jq 'length'
}

latest_authorized_build_approved_timestamp() {
  local issue_number="$1"
  gh api "repos/${GITHUB_REPOSITORY}/issues/${issue_number}/comments" --paginate \
    --jq \
    --arg author "$BUILD_APPROVED_AUTHOR" \
    '[.[]
      | select(
          (.body | gsub("^\\s+|\\s+$"; "") == "BUILD_APPROVED")
          and (.user.login == $author)
        )
      | .created_at] | max // empty'
}

issue_has_stalled_comment() {
  local issue_number="$1"
  gh api "repos/${GITHUB_REPOSITORY}/issues/${issue_number}/comments" --paginate \
    --jq \
    --arg body "$STALLED_COMMENT" \
    '([.[] | select(.body == $body)] | length) > 0'
}

linked_issue_numbers_from_pr() {
  local pull_number="$1"
  gh pr view "$pull_number" --json closingIssuesReferences --jq \
    '[.closingIssuesReferences[] | select(.number != null) | .number] | unique | .[]'
}

reconcile_issue_without_open_pr() {
  local issue_number="$1"
  local approved_at now_epoch threshold_seconds approved_epoch age_seconds

  if [ "$(open_linked_pull_request_count "$issue_number")" -gt 0 ]; then
    return 0
  fi

  approved_at="$(latest_authorized_build_approved_timestamp "$issue_number")"
  if [ -z "$approved_at" ]; then
    echo "Issue #${issue_number} has no open linked PR and no authorized BUILD_APPROVED; clearing stale status labels."
    clear_issue_status_labels "$issue_number"
    return 0
  fi

  now_epoch="$(date -u +%s)"
  threshold_seconds=$((STALL_THRESHOLD_MINUTES * 60))
  approved_epoch="$(date -u -d "$approved_at" +%s)"
  age_seconds=$((now_epoch - approved_epoch))

  if [ "$age_seconds" -ge "$threshold_seconds" ]; then
    echo "Issue #${issue_number} has no open linked PR and is past stall threshold; setting status:stalled."
    set_issue_status_label "$issue_number" "status:stalled"

    if [ "$(issue_has_stalled_comment "$issue_number")" != "true" ]; then
      gh issue comment "$issue_number" --body "$STALLED_COMMENT"
    fi
    return 0
  fi

  echo "Issue #${issue_number} has no open linked PR; reverting to status:approved."
  set_issue_status_label "$issue_number" "status:approved"
}

reconcile_previously_linked_issues_from_pr_body() {
  local previous_body="$1"
  local issue_number

  mapfile -t previously_linked < <(closing_issue_numbers_from_pr_body_text "$previous_body")

  if [ "${#previously_linked[@]}" -eq 0 ]; then
    echo "No closing issue references in previous PR body; skipping stale reconciliation."
    return 0
  fi

  for issue_number in "${previously_linked[@]}"; do
    echo "Reconciling previously linked issue #${issue_number} after PR body removed closing references."
    reconcile_issue_without_open_pr "$issue_number"
  done
}

reconcile_stale_pr_open_issues() {
  mapfile -t stale_candidates < <(
    gh issue list \
      --repo "$GITHUB_REPOSITORY" \
      --state open \
      --label "status:pr-open" \
      --limit 500 \
      --json number \
      --jq '.[].number'
  )

  for issue_number in "${stale_candidates[@]}"; do
    reconcile_issue_without_open_pr "$issue_number"
  done
}

list_stall_watchdog_candidate_issues() {
  gh search issues \
    --repo "$GITHUB_REPOSITORY" \
    --limit 500 \
    'is:issue is:open (label:"status:approved" OR label:"status:pr-open")' \
    --json number \
    --jq '.[].number'
}
