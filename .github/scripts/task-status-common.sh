#!/usr/bin/env bash
# Shared helpers for ATTD GitHub task status label automation (Phase F1a).
set -euo pipefail

readonly STATUS_LABEL_PREFIX="status:"
readonly STALLED_COMMENT='TASK_STALLED: No linked PR was created within 45 minutes after BUILD_APPROVED.'

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

issue_has_label_prefix() {
  local issue_number="$1"
  local prefix="$2"
  gh issue view "$issue_number" --json labels --jq \
    --arg prefix "$prefix" '[.labels[].name | select(startswith($prefix))] | length > 0'
}

list_issue_status_labels() {
  local issue_number="$1"
  gh issue view "$issue_number" --json labels --jq \
    --arg prefix "$STATUS_LABEL_PREFIX" '[.labels[].name | select(startswith($prefix))]'
}

set_issue_status_label() {
  local issue_number="$1"
  local target_status="$2"

  ensure_task_status_labels

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

linked_pull_request_count() {
  local issue_number="$1"
  gh pr list \
    --repo "$GITHUB_REPOSITORY" \
    --search "linked:issue-${issue_number}" \
    --state all \
    --json number \
    --jq 'length'
}

latest_build_approved_timestamp() {
  local issue_number="$1"
  gh issue view "$issue_number" --json comments --jq \
    '[.comments[] | select(.body | gsub("^\\s+|\\s+$"; "") == "BUILD_APPROVED") | .createdAt] | max // empty'
}

issue_has_stalled_comment() {
  local issue_number="$1"
  gh issue view "$issue_number" --json comments --jq \
    --arg body "$STALLED_COMMENT" '[.comments[] | select(.body == $body)] | length > 0'
}

linked_issue_numbers_from_pr() {
  local pull_number="$1"
  gh pr view "$pull_number" --json closingIssuesReferences --jq \
    '[.closingIssuesReferences[] | select(.number != null) | .number] | unique | .[]'
}
