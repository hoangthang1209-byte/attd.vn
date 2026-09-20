#!/usr/bin/env bash
# Shared helpers for ATTD event-driven build/repair orchestration (Phase F1b).
set -euo pipefail

ORCHESTRATOR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.github/scripts/task-status-common.sh
source "${ORCHESTRATOR_SCRIPT_DIR}/task-status-common.sh"

readonly ORCHESTRATOR_MARKER_PREFIX="ORCHESTRATOR_IDEMPOTENCY:"
readonly ORCHESTRATOR_BLOCKED_COMMENT='ORCHESTRATOR_BLOCKED: P0/P1 findings require human attention before auto-repair.'
readonly ORCHESTRATOR_READY_COMMENT='READY TO MERGE'
readonly ORCHESTRATOR_QUEUE_DEFERRED_COMMENT='ORCHESTRATOR_QUEUE_DEFERRED: Another Builder task is active; repair trigger deferred.'
readonly ORCHESTRATOR_HIGH_RISK_COMMENT='ORCHESTRATOR_BLOCKED: High-risk task cannot auto-advance without HIGH_RISK_APPROVED.'
readonly ORCHESTRATOR_CI_REPAIR_LABEL="orchestrator:ci-repair"
readonly ORCHESTRATOR_REVIEW_REPAIR_LABEL="orchestrator:review-repair"
readonly GITHUB_ACTIONS_BOT="github-actions[bot]"

ensure_orchestrator_labels() {
  ensure_task_status_labels

  local labels=(
    "status:ready-to-merge|2EA043|Independent review clean; awaiting human merge"
    "status:blocked|B60205|Blocked for human attention (P0/P1 or high-risk)"
    "status:ci-failed|D93F0B|Required CI failed; repair may be queued"
    "status:queued|EDEDED|Deferred repair waiting for Builder queue"
    "orchestrator:review-repair|5319E7|Automated P2 repair issue from PR review"
    "orchestrator:ci-repair|5319E7|Automated repair issue from CI failure"
  )

  for entry in "${labels[@]}"; do
    IFS='|' read -r name color description <<< "$entry"
    gh label create "$name" --color "$color" --description "$description" --force >/dev/null
  done
}

normalize_whitespace() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

is_orchestrator_build_approved_author() {
  local author="$1"
  local issue_number="$2"

  if [ "$author" = "${BUILD_APPROVED_AUTHOR}" ]; then
    return 0
  fi

  if [ "$author" = "$GITHUB_ACTIONS_BOT" ]; then
    gh issue view "$issue_number" --json labels --jq \
      '[.labels[].name | select(startswith("orchestrator:"))] | length > 0' \
      | grep -qx 'true'
    return $?
  fi

  return 1
}

is_attd_pr_reviewer_review() {
  local body="$1"
  [[ "$body" == *"CURSOR_AUTOMATION_ID:"* ]] && [[ "$body" == *"Independent ATTD PR Review"* ]]
}

parse_review_severity_counts() {
  local body="$1"
  local p0=0 p1=0 p2=0 p3=0

  if [[ "$body" =~ No[[:space:]]P0/P1[[:space:]]findings ]]; then
    p0=0
    p1=0
  else
    p0="$(count_findings_in_section "$body" "P0")"
    p1="$(count_findings_in_section "$body" "P1")"
  fi

  p2="$(count_findings_in_section "$body" "P2")"
  p3="$(count_findings_in_section "$body" "P3")"

  printf '%s %s %s %s' "$p0" "$p1" "$p2" "$p3"
}

count_findings_in_section() {
  local body="$1"
  local severity="$2"
  local section count

  section="$(printf '%s' "$body" | awk -v sev="$severity" '
    BEGIN { in_section=0; count=0 }
    /^####[[:space:]]+/ {
      if ($0 ~ ("####[[:space:]]*" sev "([^0-9]|$)")) {
        in_section=1
        next
      }
      if (in_section) { exit }
    }
    in_section && /^\*\*[0-9]+\./ { count++ }
    END { print count }
  ')"

  count="${section:-0}"
  if [ "$count" -gt 0 ]; then
    printf '%s' "$count"
    return 0
  fi

  if printf '%s' "$body" | grep -Eq "^[[:space:]]*-[[:space:]]*${severity}:[[:space:]]*[0-9]+"; then
    printf '%s' "$body" | grep -Eo "^[[:space:]]*-[[:space:]]*${severity}:[[:space:]]*[0-9]+" | head -1 | grep -Eo '[0-9]+'
    return 0
  fi

  printf '0'
}

orchestrator_idempotency_marker() {
  local kind="$1"
  local pull_number="$2"
  local head_sha="$3"
  printf '%s %s-pr-%s-sha-%s' "$ORCHESTRATOR_MARKER_PREFIX" "$kind" "$pull_number" "$head_sha"
}

repository_has_idempotency_for_pr_sha() {
  local kind="$1"
  local pull_number="$2"
  local head_sha="$3"
  local marker count

  marker="$(orchestrator_idempotency_marker "$kind" "$pull_number" "$head_sha")"
  count="$(gh search issues \
    --repo "$GITHUB_REPOSITORY" \
    --match title,body,comments \
    --json number \
    --jq 'length' \
    "$marker" 2>/dev/null || printf '0')"

  [ "${count:-0}" -gt 0 ]
}

repository_has_idempotency_marker() {
  local marker="$1"
  local count

  count="$(gh search issues \
    --repo "$GITHUB_REPOSITORY" \
    --match title,body,comments \
    --json number \
    --jq 'length' \
    "$marker" 2>/dev/null || printf '0')"

  [ "${count:-0}" -gt 0 ]
}

issue_has_idempotency_marker() {
  local issue_number="$1"
  local marker="$2"

  gh issue view "$issue_number" --json body,comments --jq \
    --arg marker "$marker" '
      (.body | contains($marker))
      or ([.comments[].body | select(contains($marker))] | length > 0)
    ' | grep -qx 'true'
}

pull_request_has_idempotency_marker() {
  local pull_number="$1"
  local marker="$2"

  gh pr view "$pull_number" --json body,comments --jq \
    --arg marker "$marker" '
      (.body | contains($marker))
      or ([.comments[].body | select(contains($marker))] | length > 0)
    ' | grep -qx 'true'
}

linked_issue_numbers_array() {
  local pull_number="$1"
  mapfile -t _linked_issues < <(linked_issue_numbers_from_pr "$pull_number")
  if [ "${#_linked_issues[@]}" -eq 0 ]; then
    return 1
  fi
  printf '%s\n' "${_linked_issues[@]}"
}

issue_has_label() {
  local issue_number="$1"
  local label="$2"

  gh issue view "$issue_number" --json labels --jq \
    --arg label "$label" '[.labels[].name | select(. == $label)] | length > 0' \
    | grep -qx 'true'
}

issue_body_and_title() {
  local issue_number="$1"
  gh issue view "$issue_number" --json title,body --jq '[.title, .body] | join("\n")'
}

is_high_risk_issue() {
  local issue_number="$1"
  local combined

  if issue_has_label "$issue_number" "risk:high"; then
    return 0
  fi

  combined="$(issue_body_and_title "$issue_number")"
  if printf '%s' "$combined" | grep -Fq 'HIGH_RISK_APPROVED'; then
    return 1
  fi

  if printf '%s' "$combined" | grep -Eiq \
    'HIGH_RISK|pricing|margin|payment|banking|sepay|reconciliation|authentication|permissions?|invoice|accounting|destructive[[:space:]]+migration|bulk[[:space:]]+(data[[:space:]]+)?(rewrite|delete)'; then
    return 0
  fi

  return 1
}

is_low_risk_pull_request() {
  local pull_number="$1"
  local issue_number

  if gh pr view "$pull_number" --json labels --jq \
    '[.labels[].name | select(. == "risk:high")] | length > 0' | grep -qx 'true'; then
    return 1
  fi

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" || true)
  if [ "${#linked_issues[@]}" -eq 0 ]; then
    return 1
  fi

  for issue_number in "${linked_issues[@]}"; do
    if is_high_risk_issue "$issue_number"; then
      return 1
    fi

    if issue_has_label "$issue_number" "risk:low"; then
      continue
    fi

    if issue_has_label "$issue_number" "risk:medium"; then
      return 1
    fi

    return 1
  done

  return 0
}

active_builder_tasks_search_query() {
  printf '%s' \
    'is:issue is:open (label:"status:approved" OR label:"status:building") -label:"status:ready-to-merge" -label:"status:merged" -label:"status:blocked" -label:"status:stalled" -label:"status:queued"'
}

count_active_builder_tasks() {
  gh search issues \
    --repo "$GITHUB_REPOSITORY" \
    "$(active_builder_tasks_search_query)" \
    --json number \
    --jq 'length'
}

should_defer_for_active_builder_queue() {
  local active_count
  active_count="$(count_active_builder_tasks)"

  [ "${active_count:-0}" -gt 0 ]
}

find_open_repair_issue_for_pr() {
  local pull_number="$1"
  local head_sha="$2"
  local kind="$3"
  local marker

  marker="$(orchestrator_idempotency_marker "$kind" "$pull_number" "$head_sha")"

  gh search issues \
    --repo "$GITHUB_REPOSITORY" \
    --match title,body \
    --json number,body,state \
    --jq \
      --arg marker "$marker" \
      --arg pr "$pull_number" \
      --arg sha "$head_sha" '
      [.[]
        | select(.state == "OPEN")
        | select(.body | contains($marker))
      ] | .[0].number // empty
    ' \
    "Repair PR #${pull_number}" "$head_sha" 2>/dev/null || true
}

issue_has_orchestrator_build_approved() {
  local issue_number="$1"
  [ -n "$(latest_authorized_build_approved_timestamp "$issue_number")" ]
}

issue_is_deferred_repair() {
  local issue_number="$1"

  if issue_has_label "$issue_number" "status:queued"; then
    return 0
  fi

  gh issue view "$issue_number" --json comments --jq \
    '[.comments[].body | select(contains("ORCHESTRATOR_QUEUE_DEFERRED"))] | length > 0' \
    | grep -qx 'true'
}

create_repair_issue() {
  local pull_number="$1"
  local head_sha="$2"
  local marker="$3"
  local repair_label="$4"
  local source_kind="$5"
  local parent_issue="${6:-}"
  local title body issue_number

  title="Repair PR #${pull_number} ${source_kind} findings (orchestrator)"
  body="$(cat <<EOF
## Objective

Automated ${source_kind} repair for PR #${pull_number} at \`${head_sha:0:7}\`.

${marker}

## Scope

- Address only the findings reported by the ATTD software factory for this PR head SHA.
- Do not expand scope beyond the linked PR review or CI failure context.

## Parent context

- Pull request: #${pull_number}
- Head SHA: \`${head_sha}\`
$(if [ -n "$parent_issue" ]; then echo "- Parent issue: #${parent_issue}"; fi)

## Risk

Low — orchestrator-triggered repair for a low-risk PR.

## Authorization

This issue was created by GitHub Actions orchestration. \`BUILD_APPROVED\` will be posted by \`${GITHUB_ACTIONS_BOT}\` when the Builder queue allows.
EOF
)"

  issue_number="$(gh issue create \
    --title "$title" \
    --body "$body" \
    --label "$repair_label" \
    --label "risk:low" \
    --json number \
    --jq '.number')"

  printf '%s' "$issue_number"
}

post_orchestrator_build_approved() {
  local issue_number="$1"
  gh issue comment "$issue_number" --body "BUILD_APPROVED"
}

post_unique_pr_comment() {
  local pull_number="$1"
  local marker="$2"
  local body="$3"

  if pull_request_has_idempotency_marker "$pull_number" "$marker"; then
    echo "PR #${pull_number} already has marker ${marker}; skipping comment."
    return 0
  fi

  gh pr comment "$pull_number" --body "${body}

${marker}"
}

set_linked_issues_status() {
  local pull_number="$1"
  local target_status="$2"

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" || true)
  for issue_number in "${linked_issues[@]}"; do
    set_issue_status_label "$issue_number" "$target_status"
  done
}

handle_reviewer_outcome() {
  local pull_number="$1"
  local head_sha="$2"
  local review_body="$3"
  local run_id="${4:-unknown}"

  ensure_orchestrator_labels

  if ! is_attd_pr_reviewer_review "$review_body"; then
    echo "Review is not a recognized ATTD PR Reviewer summary; skipping."
    return 0
  fi

  if ! is_low_risk_pull_request "$pull_number"; then
    echo "PR #${pull_number} is not low-risk; skipping auto-orchestration."
    post_unique_pr_comment "$pull_number" \
      "$(orchestrator_idempotency_marker "high-risk-skip" "$pull_number" "$head_sha")" \
      "$ORCHESTRATOR_HIGH_RISK_COMMENT"
    set_linked_issues_status "$pull_number" "status:blocked"
    return 0
  fi

  read -r p0 p1 p2 p3 <<< "$(parse_review_severity_counts "$review_body")"
  echo "Parsed review counts: P0=${p0} P1=${p1} P2=${p2} P3=${p3}"

  local marker
  marker="$(orchestrator_idempotency_marker "review" "$pull_number" "$head_sha")"

  if repository_has_idempotency_for_pr_sha "review" "$pull_number" "$head_sha"; then
    echo "Idempotency marker already exists for review PR #${pull_number} @ ${head_sha}; skipping."
    return 0
  fi

  if [ "$p0" -gt 0 ] || [ "$p1" -gt 0 ]; then
    post_unique_pr_comment "$pull_number" "$marker" "$ORCHESTRATOR_BLOCKED_COMMENT"
    set_linked_issues_status "$pull_number" "status:blocked"
    return 0
  fi

  if [ "$p2" -gt 0 ]; then
    local repair_issue parent_issue=""
    mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" || true)
    if [ "${#linked_issues[@]}" -gt 0 ]; then
      parent_issue="${linked_issues[0]}"
    fi

    repair_issue="$(find_open_repair_issue_for_pr "$pull_number" "$head_sha" "review")"
    if [ -z "$repair_issue" ]; then
      repair_issue="$(create_repair_issue "$pull_number" "$head_sha" "$marker" \
        "$ORCHESTRATOR_REVIEW_REPAIR_LABEL" "P2" "$parent_issue")"
      echo "Created repair issue #${repair_issue}."
    else
      echo "Reusing repair issue #${repair_issue}."
    fi

    if should_defer_for_active_builder_queue; then
      if ! issue_is_deferred_repair "$repair_issue"; then
        gh issue comment "$repair_issue" --body "${ORCHESTRATOR_QUEUE_DEFERRED_COMMENT}

${marker}"
      fi
      set_issue_status_label "$repair_issue" "status:queued"
      return 0
    fi

    if ! issue_has_idempotency_marker "$repair_issue" "$marker"; then
      gh issue comment "$repair_issue" --body "$marker"
    fi

    if ! issue_has_orchestrator_build_approved "$repair_issue"; then
      post_orchestrator_build_approved "$repair_issue"
    fi
    set_issue_status_label "$repair_issue" "status:building"
    post_unique_pr_comment "$pull_number" "$marker" \
      "ORCHESTRATOR_REPAIR_TRIGGERED: Created/reused repair issue #${repair_issue} for P2 findings."
    return 0
  fi

  post_unique_pr_comment "$pull_number" "$marker" "$ORCHESTRATOR_READY_COMMENT"
  set_linked_issues_status "$pull_number" "status:ready-to-merge"
}

handle_ci_failure_outcome() {
  local pull_number="$1"
  local head_sha="$2"
  local run_id="${3:-unknown}"

  ensure_orchestrator_labels

  if ! is_low_risk_pull_request "$pull_number"; then
    echo "PR #${pull_number} CI failed but PR is not low-risk; skipping auto-repair."
    return 0
  fi

  local marker
  marker="$(orchestrator_idempotency_marker "ci" "$pull_number" "$head_sha")"

  if repository_has_idempotency_for_pr_sha "ci" "$pull_number" "$head_sha"; then
    echo "CI repair marker already exists for PR #${pull_number} @ ${head_sha}; skipping."
    return 0
  fi

  set_linked_issues_status "$pull_number" "status:ci-failed"

  local repair_issue parent_issue=""
  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" || true)
  if [ "${#linked_issues[@]}" -gt 0 ]; then
    parent_issue="${linked_issues[0]}"
  fi

  repair_issue="$(find_open_repair_issue_for_pr "$pull_number" "$head_sha" "ci")"
  if [ -z "$repair_issue" ]; then
    repair_issue="$(create_repair_issue "$pull_number" "$head_sha" "$marker" \
      "$ORCHESTRATOR_CI_REPAIR_LABEL" "CI" "$parent_issue")"
    echo "Created CI repair issue #${repair_issue}."
  fi

  if should_defer_for_active_builder_queue; then
    if ! issue_is_deferred_repair "$repair_issue"; then
      gh issue comment "$repair_issue" --body "${ORCHESTRATOR_QUEUE_DEFERRED_COMMENT}

${marker}"
    fi
    set_issue_status_label "$repair_issue" "status:queued"
    return 0
  fi

  if ! issue_has_idempotency_marker "$repair_issue" "$marker"; then
    gh issue comment "$repair_issue" --body "$marker"
  fi

  if ! issue_has_orchestrator_build_approved "$repair_issue"; then
    post_orchestrator_build_approved "$repair_issue"
  fi
  set_issue_status_label "$repair_issue" "status:building"
  post_unique_pr_comment "$pull_number" "$marker" \
    "ORCHESTRATOR_CI_REPAIR_TRIGGERED: Created/reused repair issue #${repair_issue} for CI failure at \`${head_sha:0:7}\`."
}

process_deferred_queue() {
  ensure_orchestrator_labels

  if [ "$(count_active_builder_tasks)" -gt 0 ]; then
    echo "Active Builder task still running; queue unchanged."
    return 0
  fi

  mapfile -t deferred_issues < <(
    {
      gh issue list \
        --repo "$GITHUB_REPOSITORY" \
        --state open \
        --label "status:queued" \
        --json number \
        --jq '.[].number' 2>/dev/null || true
      gh search issues \
        --repo "$GITHUB_REPOSITORY" \
        --match comments \
        --json number,comments \
        --jq '
          [.[]
            | select([.comments[].body | select(contains("ORCHESTRATOR_QUEUE_DEFERRED"))] | length > 0)
            | .number
          ] | .[]
        ' \
        "ORCHESTRATOR_QUEUE_DEFERRED" 2>/dev/null || true
    } | sort -nu
  )

  for issue_number in "${deferred_issues[@]}"; do
    if issue_has_label "$issue_number" "status:ready-to-merge" \
      || issue_has_label "$issue_number" "status:merged" \
      || issue_has_label "$issue_number" "status:blocked" \
      || issue_has_label "$issue_number" "status:building"; then
      continue
    fi

    if issue_has_orchestrator_build_approved "$issue_number"; then
      echo "Deferred repair issue #${issue_number} already has BUILD_APPROVED; skipping duplicate trigger."
      continue
    fi

    echo "Re-triggering deferred repair issue #${issue_number}."
    post_orchestrator_build_approved "$issue_number"
    set_issue_status_label "$issue_number" "status:building"
    return 0
  done
}
