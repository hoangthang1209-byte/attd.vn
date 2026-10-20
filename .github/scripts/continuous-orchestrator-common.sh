#!/usr/bin/env bash
# Continuous autonomous factory loop: merge → production exact-SHA verify → smoke → claim next task.
set -euo pipefail

CONTINUOUS_ORCHESTRATOR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.github/scripts/review-orchestrator-common.sh
source "${CONTINUOUS_ORCHESTRATOR_SCRIPT_DIR}/review-orchestrator-common.sh"

readonly CONTINUOUS_ORCHESTRATOR_MARKER_PREFIX="CONTINUOUS_ORCHESTRATOR_IDEMPOTENCY:"
readonly CONTINUOUS_ORCHESTRATOR_MERGE_TRIGGERED_PREFIX="CONTINUOUS_ORCHESTRATOR_MERGE_TRIGGERED:"
readonly CONTINUOUS_ORCHESTRATOR_MERGE_FAILED_PREFIX="CONTINUOUS_ORCHESTRATOR_MERGE_FAILED:"
readonly CONTINUOUS_ORCHESTRATOR_PRODUCTION_VERIFIED_PREFIX="CONTINUOUS_ORCHESTRATOR_PRODUCTION_VERIFIED:"
readonly CONTINUOUS_ORCHESTRATOR_SMOKE_PASSED_PREFIX="CONTINUOUS_ORCHESTRATOR_SMOKE_PASSED:"
readonly CONTINUOUS_ORCHESTRATOR_COMPLETED_PREFIX="CONTINUOUS_ORCHESTRATOR_COMPLETED:"
readonly CONTINUOUS_ORCHESTRATOR_STALLED_PREFIX="CONTINUOUS_ORCHESTRATOR_STALLED:"
readonly CONTINUOUS_ORCHESTRATOR_NEXT_TASK_PREFIX="CONTINUOUS_ORCHESTRATOR_NEXT_TASK_CLAIMED:"
readonly CONTINUOUS_QUEUE_CLAIM_LABEL="orchestrator:queue-claim"
readonly AUTOMATION_PRODUCTION_SMOKE_URL="${AUTOMATION_PRODUCTION_SMOKE_URL:-https://attd.vn/}"
CONTINUOUS_PRODUCTION_VERIFY_TIMEOUT_MINUTES="${CONTINUOUS_PRODUCTION_VERIFY_TIMEOUT_MINUTES:-45}"
CONTINUOUS_MAIN_CI_TIMEOUT_MINUTES="${CONTINUOUS_MAIN_CI_TIMEOUT_MINUTES:-30}"
CONTINUOUS_SMOKE_TIMEOUT_MINUTES="${CONTINUOUS_SMOKE_TIMEOUT_MINUTES:-20}"
CONTINUOUS_BUILDER_STALE_MINUTES="${CONTINUOUS_BUILDER_STALE_MINUTES:-15}"
CONTINUOUS_BUILDER_MAX_REDISPATCH="${CONTINUOUS_BUILDER_MAX_REDISPATCH:-3}"

continuous_orchestrator_marker() {
  local kind="$1"
  local pull_number="$2"
  local head_sha="$3"
  printf '%s %s-pr-%s-sha-%s' "$CONTINUOUS_ORCHESTRATOR_MARKER_PREFIX" "$kind" "$pull_number" "$head_sha"
}

ensure_continuous_orchestrator_labels() {
  ensure_orchestrator_labels
  local labels=(
    "status:merging|1B7FCE|Auto-merge in progress for exact PR head"
    "status:verifying|FBCA04|Post-merge production exact-SHA verification"
    "status:completed|0E8A16|Factory loop completed; production verified"
    "${CONTINUOUS_QUEUE_CLAIM_LABEL}|5319E7|Automated queue claim for next Agent OS task"
  )
  for entry in "${labels[@]}"; do
    IFS='|' read -r name color description <<< "$entry"
    gh label create "$name" --color "$color" --description "$description" --force >/dev/null
  done
}

is_factory_continuous_loop_pull_request() {
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
    if issue_has_label "$issue_number" "risk:low" || issue_has_label "$issue_number" "risk:medium"; then
      continue
    fi
    return 1
  done

  return 0
}

pull_request_merge_state() {
  local pull_number="$1"
  gh pr view "$pull_number" --json mergeable,mergeStateStatus,reviewDecision,statusCheckRollup \
    | jq -r '
      def check_state:
        (.statusCheckRollup // []) as $checks
        | if ($checks | length) == 0 then "UNKNOWN"
          elif any($checks[]; ((.status // "") != "COMPLETED")) then "PENDING"
          elif any($checks[]; ((.conclusion // "") | IN("SUCCESS","NEUTRAL","SKIPPED") | not)) then "FAILURE"
          else "SUCCESS"
          end;
      [.mergeable, .mergeStateStatus, (.reviewDecision // ""), check_state] | @tsv
    '
}

pull_request_has_ready_to_merge_for_head() {
  local pull_number="$1"
  local head_sha="$2"
  local marker
  marker="$(orchestrator_idempotency_marker "review" "$pull_number" "$head_sha")"

  gh pr view "$pull_number" --json comments \
    | jq -r --arg marker "$marker" \
      '[.comments[].body | select(contains($marker) and contains("READY TO MERGE"))] | length > 0' \
    | grep -qx 'true'
}

independent_review_clean_for_merge() {
  local pull_number="$1"
  local head_sha="$2"
  local review_body

  if ! find_independent_review_for_head_sha "$pull_number" "$head_sha"; then
    return 1
  fi

  review_body="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${pull_number}/reviews" --paginate 2>/dev/null \
    | jq -r --arg head "$head_sha" '
      [.[] | select(.commit_id == $head)
        | select((.body // "") | contains("Independent ATTD PR Review"))][0].body // empty
    ')"

  if [ -z "$review_body" ]; then
    return 1
  fi

  read -r p0 p1 p2 _p3 <<< "$(parse_review_severity_counts "$review_body")"
  [ "$p0" -eq 0 ] && [ "$p1" -eq 0 ] && [ "$p2" -eq 0 ]
}

pull_request_merge_gate_satisfied() {
  local pull_number="$1"
  local head_sha="$2"
  local mergeable merge_state review_decision checks_state

  if ! commit_ci_is_green "$head_sha"; then
    echo "Merge gate: CI not green for ${head_sha}."
    return 1
  fi

  if ! independent_review_clean_for_merge "$pull_number" "$head_sha"; then
    echo "Merge gate: missing exact-head clean independent review for ${head_sha}."
    return 1
  fi

  if ! pull_request_has_ready_to_merge_for_head "$pull_number" "$head_sha"; then
    echo "Merge gate: READY TO MERGE marker missing for ${head_sha}."
    return 1
  fi

  IFS=$'\t' read -r mergeable merge_state review_decision checks_state <<< "$(pull_request_merge_state "$pull_number")"
  if [ "$mergeable" != "MERGEABLE" ] || [ "$merge_state" != "CLEAN" ]; then
    echo "Merge gate: PR #${pull_number} not mergeable (mergeable=${mergeable}, state=${merge_state})."
    return 1
  fi

  if [ "$checks_state" != "SUCCESS" ]; then
    echo "Merge gate: required checks state=${checks_state}; only SUCCESS may merge."
    return 1
  fi

  return 0
}

post_continuous_pr_comment() {
  local pull_number="$1"
  local marker="$2"
  local body="$3"

  if pr_has_marker_comment "$pull_number" "$marker"; then
    echo "PR #${pull_number} already has continuous marker ${marker}; skipping duplicate."
    return 0
  fi

  gh pr comment "$pull_number" --body "${body}

${marker}"
}

attempt_auto_merge_for_head() {
  local pull_number="$1"
  local head_sha="$2"
  local source="${3:-unknown}"
  local marker triggered_body

  ensure_continuous_orchestrator_labels

  if ! is_factory_continuous_loop_pull_request "$pull_number"; then
    echo "PR #${pull_number} not eligible for continuous auto-merge (${source})."
    return 0
  fi

  current_head="$(pull_request_head_sha "$pull_number")"
  if [ "$head_sha" != "$current_head" ]; then
    echo "Ignoring stale merge attempt for ${head_sha}; PR head is ${current_head}."
    return 0
  fi

  marker="$(continuous_orchestrator_marker "merge" "$pull_number" "$head_sha")"
  if pr_has_marker_comment "$pull_number" "$marker"; then
    echo "Auto-merge already recorded for PR #${pull_number} @ ${head_sha}."
    return 0
  fi

  if ! pull_request_merge_gate_satisfied "$pull_number" "$head_sha"; then
    return 0
  fi

  set_linked_issues_status "$pull_number" "status:merging"
  triggered_body="${CONTINUOUS_ORCHESTRATOR_MERGE_TRIGGERED_PREFIX} Auto-merge for exact head \`${head_sha}\` (${source})."

  if gh api --method PUT "repos/${GITHUB_REPOSITORY}/pulls/${pull_number}/merge" \
    -f merge_method=squash \
    -f expected_head_sha="$head_sha" \
    -f commit_title="Merge PR #${pull_number} (Agent OS continuous loop)" \
    >/dev/null 2>&1; then
    post_continuous_pr_comment "$pull_number" "$marker" "$triggered_body"
    echo "Merged PR #${pull_number} at ${head_sha}."
    return 0
  fi

  post_continuous_pr_comment "$pull_number" "${marker}-failed" \
    "${CONTINUOUS_ORCHESTRATOR_MERGE_FAILED_PREFIX} Merge API rejected for head \`${head_sha}\`. WAIT_HUMAN may be required."
  set_linked_issues_status "$pull_number" "status:blocked"
  return 1
}

github_production_deployment_sha() {
  local merge_sha="$1"
  local deployment_id deployment_state
  while IFS= read -r deployment_id; do
    [ -z "$deployment_id" ] && continue
    deployment_state="$(gh api "repos/${GITHUB_REPOSITORY}/deployments/${deployment_id}/statuses?per_page=1" \
      --jq '.[0].state // empty' 2>/dev/null || true)"
    if [ "$deployment_state" = "success" ]; then
      printf '%s' "$merge_sha"
      return 0
    fi
  done < <(
    gh api "repos/${GITHUB_REPOSITORY}/deployments?environment=Production&per_page=30" 2>/dev/null \
      | jq -r --arg sha "$merge_sha" '
          .[] | select((.environment == "Production" or .environment == "production") and .sha == $sha) | .id
        ' || true
  )
  return 0
}

main_branch_ci_success_for_sha() {
  local merge_sha="$1"
  local state
  state="$(gh api "repos/${GITHUB_REPOSITORY}/commits/${merge_sha}/status" --jq '.state' 2>/dev/null || printf 'unknown')"
  [ "$state" = "success" ]
}

run_production_smoke_check() {
  local url="$1"
  local code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 30 "$url" 2>/dev/null || printf '000')"
  [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]
}

continuous_elapsed_minutes_since_merge() {
  local pull_number="$1"
  local merged_at merged_epoch now_epoch
  merged_at="$(gh pr view "$pull_number" --json mergedAt --jq '.mergedAt // empty' 2>/dev/null || true)"
  merged_epoch="$(date -u -d "$merged_at" +%s 2>/dev/null || printf '0')"
  now_epoch="${CONTINUOUS_NOW_EPOCH:-$(date -u +%s)}"
  if [ "$merged_epoch" -le 0 ] || [ "$now_epoch" -le "$merged_epoch" ]; then
    printf '0'
    return 0
  fi
  printf '%s' "$(( (now_epoch - merged_epoch) / 60 ))"
}

mark_continuous_stalled() {
  local pull_number="$1"
  local sha="$2"
  local reason="$3"
  local marker
  marker="$(continuous_orchestrator_marker "stalled" "$pull_number" "$sha")"
  post_continuous_pr_comment "$pull_number" "$marker" "${CONTINUOUS_ORCHESTRATOR_STALLED_PREFIX} ${reason} WAIT_HUMAN."
  set_linked_issues_status "$pull_number" "status:stalled"
}

handle_post_merge_verification() {
  local pull_number="$1"
  local merge_sha="$2"
  local source="${3:-unknown}"
  local marker verify_marker smoke_marker complete_marker

  ensure_continuous_orchestrator_labels
  marker="$(continuous_orchestrator_marker "verify" "$pull_number" "$merge_sha")"
  verify_marker="$(continuous_orchestrator_marker "production" "$pull_number" "$merge_sha")"
  smoke_marker="$(continuous_orchestrator_marker "smoke" "$pull_number" "$merge_sha")"
  complete_marker="$(continuous_orchestrator_marker "completed" "$pull_number" "$merge_sha")"

  set_linked_issues_status "$pull_number" "status:verifying"

  if ! main_branch_ci_success_for_sha "$merge_sha"; then
    local ci_elapsed
    ci_elapsed="$(continuous_elapsed_minutes_since_merge "$pull_number")"
    if [ "$ci_elapsed" -ge "$CONTINUOUS_MAIN_CI_TIMEOUT_MINUTES" ]; then
      mark_continuous_stalled "$pull_number" "$merge_sha" "Main CI did not become green within ${CONTINUOUS_MAIN_CI_TIMEOUT_MINUTES} minutes for \`${merge_sha}\`."
      return 0
    fi
    echo "Main CI not green yet for merge SHA ${merge_sha} (${source}); waiting (${ci_elapsed}m)."
    return 0
  fi

  local production_sha merged_at merged_epoch now_epoch verify_elapsed stall_marker
  production_sha="$(github_production_deployment_sha "$merge_sha")"

  if [ "$production_sha" != "$merge_sha" ]; then
    merged_at="$(gh pr view "$pull_number" --json mergedAt --jq '.mergedAt // empty' 2>/dev/null || true)"
    merged_epoch="$(date -u -d "$merged_at" +%s 2>/dev/null || printf '0')"
    now_epoch="${CONTINUOUS_NOW_EPOCH:-$(date -u +%s)}"
    verify_elapsed=0
    if [ "$merged_epoch" -gt 0 ] && [ "$now_epoch" -gt "$merged_epoch" ]; then
      verify_elapsed="$(( (now_epoch - merged_epoch) / 60 ))"
    fi

    if [ "$verify_elapsed" -ge "$CONTINUOUS_PRODUCTION_VERIFY_TIMEOUT_MINUTES" ]; then
      stall_marker="$(continuous_orchestrator_marker "stalled" "$pull_number" "$merge_sha")"
      post_continuous_pr_comment "$pull_number" "$stall_marker" \
        "${CONTINUOUS_ORCHESTRATOR_STALLED_PREFIX} Production exact-SHA verification timed out after ${CONTINUOUS_PRODUCTION_VERIFY_TIMEOUT_MINUTES} minutes for \`${merge_sha}\` (observed=\`${production_sha:-none}\`). WAIT_HUMAN."
      set_linked_issues_status "$pull_number" "status:stalled"
      return 0
    fi

    echo "Production deployment SHA mismatch for ${merge_sha} (production=${production_sha:-none}); waiting (${verify_elapsed}m)."
    return 0
  fi

  if ! pr_has_marker_comment "$pull_number" "$verify_marker"; then
    post_continuous_pr_comment "$pull_number" "$verify_marker" \
      "${CONTINUOUS_ORCHESTRATOR_PRODUCTION_VERIFIED_PREFIX} Production deployment matches merge SHA \`${merge_sha}\`."
  fi

  if ! pr_has_marker_comment "$pull_number" "$smoke_marker"; then
    if ! run_production_smoke_check "$AUTOMATION_PRODUCTION_SMOKE_URL"; then
      local smoke_elapsed
      smoke_elapsed="$(continuous_elapsed_minutes_since_merge "$pull_number")"
      if [ "$smoke_elapsed" -ge "$CONTINUOUS_SMOKE_TIMEOUT_MINUTES" ]; then
        mark_continuous_stalled "$pull_number" "$merge_sha" "Production smoke did not pass within ${CONTINUOUS_SMOKE_TIMEOUT_MINUTES} minutes for \`${merge_sha}\`."
        return 0
      fi
      echo "Production smoke check failed for ${AUTOMATION_PRODUCTION_SMOKE_URL}; waiting (${smoke_elapsed}m)."
      return 0
    fi
    post_continuous_pr_comment "$pull_number" "$smoke_marker" \
      "${CONTINUOUS_ORCHESTRATOR_SMOKE_PASSED_PREFIX} Smoke OK for ${AUTOMATION_PRODUCTION_SMOKE_URL}."
  fi

  if pr_has_marker_comment "$pull_number" "$complete_marker"; then
    return 0
  fi

  post_continuous_pr_comment "$pull_number" "$complete_marker" \
    "${CONTINUOUS_ORCHESTRATOR_COMPLETED_PREFIX} Factory loop completed for merge SHA \`${merge_sha}\`."
  set_linked_issues_status "$pull_number" "status:completed"
  claim_next_eligible_agent_os_task "$pull_number" "$merge_sha"
}

claim_next_eligible_agent_os_task() {
  local completed_pull_number="$1"
  local completed_sha="$2"
  local claim_marker issue_number

  if [ "$(count_active_builder_tasks)" -gt 0 ]; then
    echo "Builder queue active; deferring next-task claim."
    return 0
  fi

  issue_number="$(select_next_claimable_agent_os_issue "$completed_pull_number")"
  if [ -z "$issue_number" ]; then
    echo "No eligible Agent OS task to claim."
    return 0
  fi

  claim_marker="${CONTINUOUS_ORCHESTRATOR_MARKER_PREFIX} claim-issue-${issue_number}-after-pr-${completed_pull_number}-sha-${completed_sha}"
  if issue_has_idempotency_marker "$issue_number" "$claim_marker"; then
    echo "Issue #${issue_number} already claimed; skipping."
    return 0
  fi

  gh issue edit "$issue_number" --add-label "$CONTINUOUS_QUEUE_CLAIM_LABEL"
  gh issue comment "$issue_number" --body "${CONTINUOUS_ORCHESTRATOR_NEXT_TASK_PREFIX} Claimed after PR #${completed_pull_number} @ \`${completed_sha:0:7}\`.

${claim_marker}"

  if ! issue_has_orchestrator_build_approved "$issue_number"; then
    post_orchestrator_build_approved "$issue_number"
  fi
  set_issue_status_label "$issue_number" "status:building"
}

select_next_claimable_agent_os_issue() {
  local completed_pull_number="$1"
  local completed_issues candidate issue_json

  completed_issues="$(linked_issue_numbers_from_pr "$completed_pull_number" 2>/dev/null | paste -sd, - || true)"
  issue_json="$(gh issue list \
    --repo "$GITHUB_REPOSITORY" \
    --state open \
    --label "status:approved" \
    --json number,labels,title \
    --limit 50 2>/dev/null || printf '[]')"

  while IFS= read -r candidate; do
    [ -z "$candidate" ] && continue
    if printf ',%s,' "$completed_issues" | grep -Fq ",$candidate,"; then
      continue
    fi
    if issue_is_safe_claim_candidate "$candidate"; then
      printf '%s' "$candidate"
      return 0
    fi
  done < <(
    printf '%s' "$issue_json" | jq -r '
      [.[] 
        | select([.labels[].name] | any(. == "risk:low" or . == "risk:medium"))
        | select([.labels[].name] | all(. != "orchestrator:review-repair" and . != "orchestrator:ci-repair"))
        | select([.labels[].name] | all(. != "status:building" and . != "status:pr-open" and . != "status:completed"))
      ] | sort_by(.number) | .[].number
    '
  )
}

issue_has_unresolved_dependencies() {
  local issue_number="$1"
  local body dep state
  body="$(gh issue view "$issue_number" --json body --jq '.body // ""' 2>/dev/null || true)"
  while IFS= read -r dep; do
    [ -z "$dep" ] && continue
    state="$(gh issue view "$dep" --json state --jq '.state' 2>/dev/null || printf 'OPEN')"
    if [ "$state" != "CLOSED" ]; then
      return 0
    fi
  done < <(printf '%s\n' "$body" | grep -Eio '(depends on|blocked by)[[:space:]]+#([0-9]+)' | grep -Eo '[0-9]+' || true)
  return 1
}

issue_is_safe_claim_candidate() {
  local issue_number="$1"
  if is_high_risk_issue "$issue_number"; then
    return 1
  fi
  if issue_has_unresolved_dependencies "$issue_number"; then
    return 1
  fi
  return 0
}

process_stale_builder_tasks() {
  local now_epoch issue_number updated_at updated_epoch age retry_count
  now_epoch="${CONTINUOUS_NOW_EPOCH:-$(date -u +%s)}"

  while IFS=$'\t' read -r issue_number updated_at; do
    [ -z "$issue_number" ] && continue
    updated_epoch="$(date -u -d "$updated_at" +%s 2>/dev/null || printf '0')"
    [ "$updated_epoch" -le 0 ] && continue
    age="$(( (now_epoch - updated_epoch) / 60 ))"
    [ "$age" -lt "$CONTINUOUS_BUILDER_STALE_MINUTES" ] && continue

    retry_count="$(gh issue view "$issue_number" --json comments \
      --jq '[.comments[].body | select(contains("BUILDER_LIVENESS_REDISPATCH:"))] | length' \
      2>/dev/null || printf '0')"

    if [ "$retry_count" -ge "$CONTINUOUS_BUILDER_MAX_REDISPATCH" ]; then
      gh issue comment "$issue_number" --body "CONTINUOUS_ORCHESTRATOR_STALLED: Builder produced no progress after ${retry_count} redispatch attempts. WAIT_HUMAN."
      set_issue_status_label "$issue_number" "status:stalled"
      continue
    fi

    gh issue comment "$issue_number" --body "BUILDER_LIVENESS_REDISPATCH: stale BUILDING detected after ${age} minutes; redispatch attempt $((retry_count + 1))/${CONTINUOUS_BUILDER_MAX_REDISPATCH}."
    gh issue comment "$issue_number" --body "BUILD_APPROVED"
    echo "Redispatched stale Builder issue #${issue_number}."
  done < <(
    gh issue list --repo "$GITHUB_REPOSITORY" --state open --label "status:building" \
      --json number,updatedAt --jq '.[] | [.number, .updatedAt] | @tsv' 2>/dev/null || true
  )
}

process_continuous_merge_candidates() {
  local pull_number

  while IFS= read -r pull_number; do
    [ -z "$pull_number" ] && continue
    if ! is_factory_continuous_loop_pull_request "$pull_number"; then
      continue
    fi
    if issue_has_label_for_pr "$pull_number" "status:ready-to-merge"; then
      attempt_auto_merge_for_head "$pull_number" "$(pull_request_head_sha "$pull_number")" "watchdog-merge"
    fi
  done < <(list_open_factory_pull_requests)
}

issue_has_label_for_pr() {
  local pull_number="$1"
  local label="$2"
  local issue_number

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" 2>/dev/null || true)
  for issue_number in "${linked_issues[@]}"; do
    if issue_has_label "$issue_number" "$label"; then
      return 0
    fi
  done
  return 1
}

process_continuous_post_merge_watchdog() {
  local pull_number merge_sha merged_at

  while IFS= read -r pull_number; do
    [ -z "$pull_number" ] && continue
    merged_at="$(gh pr view "$pull_number" --json mergedAt --jq '.mergedAt // empty')"
    [ -z "$merged_at" ] && continue
    merge_sha="$(gh pr view "$pull_number" --json mergeCommit --jq '.mergeCommit.oid // empty')"
    [ -z "$merge_sha" ] && continue
    if ! is_factory_continuous_loop_pull_request "$pull_number"; then
      continue
    fi
    if issue_has_label_for_pr "$pull_number" "status:completed"; then
      continue
    fi
    handle_post_merge_verification "$pull_number" "$merge_sha" "watchdog-verify"
  done < <(
    gh pr list --repo "$GITHUB_REPOSITORY" --state merged --limit 30 --json number,mergedAt \
      --jq 'sort_by(.mergedAt) | reverse | .[].number' 2>/dev/null || true
  )
}

process_continuous_orchestrator_watchdog() {
  ensure_continuous_orchestrator_labels
  process_stale_builder_tasks
  process_continuous_merge_candidates
  process_continuous_post_merge_watchdog
  process_deferred_queue
}

handle_continuous_merge_orchestration() {
  local pull_number="$1"
  local head_sha="$2"
  local source="${3:-review-outcome}"
  attempt_auto_merge_for_head "$pull_number" "$head_sha" "$source"
}

handle_continuous_pr_merged_event() {
  local pull_number="$1"
  local merge_sha="$2"
  set_linked_issues_status "$pull_number" "status:merged"
  handle_post_merge_verification "$pull_number" "$merge_sha" "pr-merged-event"
}
\t' read -r issue_number updated_at; do
    [ -z "$issue_number" ] && continue
    updated_epoch="$(date -u -d "$updated_at" +%s 2>/dev/null || printf '0')"
    [ "$updated_epoch" -le 0 ] && continue
    age="$(( (now_epoch - updated_epoch) / 60 ))"
    [ "$age" -lt "$CONTINUOUS_BUILDER_STALE_MINUTES" ] && continue

    retry_count="$(gh issue view "$issue_number" --json comments --jq '[.comments[].body | select(contains("BUILDER_LIVENESS_REDISPATCH:"))] | length' 2>/dev/null || printf '0')"
    if [ "$retry_count" -ge "$CONTINUOUS_BUILDER_MAX_REDISPATCH" ]; then
      gh issue comment "$issue_number" --body "CONTINUOUS_ORCHESTRATOR_STALLED: Builder produced no progress after ${retry_count} redispatch attempts. WAIT_HUMAN."
      set_issue_status_label "$issue_number" "status:stalled"
      continue
    fi

    gh issue comment "$issue_number" --body "BUILDER_LIVENESS_REDISPATCH: stale BUILDING detected after ${age} minutes; redispatch attempt $((retry_count + 1))/${CONTINUOUS_BUILDER_MAX_REDISPATCH}."
    gh issue comment "$issue_number" --body "BUILD_APPROVED"
    echo "Redispatched stale Builder issue #${issue_number}."
  done < <(
    gh issue list --repo "$GITHUB_REPOSITORY" --state open --label "status:building" \
      --json number,updatedAt --jq '.[] | [.number, .updatedAt] | @tsv' 2>/dev/null || true
  )
}

process_continuous_merge_candidates() {
  local pull_number

  while IFS= read -r pull_number; do
    [ -z "$pull_number" ] && continue
    if ! is_factory_continuous_loop_pull_request "$pull_number"; then
      continue
    fi
    if issue_has_label_for_pr "$pull_number" "status:ready-to-merge"; then
      attempt_auto_merge_for_head "$pull_number" "$(pull_request_head_sha "$pull_number")" "watchdog-merge"
    fi
  done < <(list_open_factory_pull_requests)
}

issue_has_label_for_pr() {
  local pull_number="$1"
  local label="$2"
  local issue_number

  mapfile -t linked_issues < <(linked_issue_numbers_from_pr "$pull_number" 2>/dev/null || true)
  for issue_number in "${linked_issues[@]}"; do
    if issue_has_label "$issue_number" "$label"; then
      return 0
    fi
  done
  return 1
}

process_continuous_post_merge_watchdog() {
  local pull_number merge_sha merged_at

  while IFS= read -r pull_number; do
    [ -z "$pull_number" ] && continue
    merged_at="$(gh pr view "$pull_number" --json mergedAt --jq '.mergedAt // empty')"
    [ -z "$merged_at" ] && continue
    merge_sha="$(gh pr view "$pull_number" --json mergeCommit --jq '.mergeCommit.oid // empty')"
    [ -z "$merge_sha" ] && continue
    if ! is_factory_continuous_loop_pull_request "$pull_number"; then
      continue
    fi
    if issue_has_label_for_pr "$pull_number" "status:completed"; then
      continue
    fi
    handle_post_merge_verification "$pull_number" "$merge_sha" "watchdog-verify"
  done < <(
    gh pr list --repo "$GITHUB_REPOSITORY" --state merged --limit 30 --json number,mergedAt \
      --jq 'sort_by(.mergedAt) | reverse | .[].number' 2>/dev/null || true
  )
}

process_continuous_orchestrator_watchdog() {
  ensure_continuous_orchestrator_labels
  process_continuous_merge_candidates
  process_continuous_post_merge_watchdog
  process_deferred_queue
}

handle_continuous_merge_orchestration() {
  local pull_number="$1"
  local head_sha="$2"
  local source="${3:-review-outcome}"
  attempt_auto_merge_for_head "$pull_number" "$head_sha" "$source"
}

handle_continuous_pr_merged_event() {
  local pull_number="$1"
  local merge_sha="$2"
  set_linked_issues_status "$pull_number" "status:merged"
  handle_post_merge_verification "$pull_number" "$merge_sha" "pr-merged-event"
}
