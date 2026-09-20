#!/usr/bin/env bash
# Scoped regression harness for task-status shell/workflow contract helpers.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export BUILD_APPROVED_AUTHOR="${BUILD_APPROVED_AUTHOR:-repo-owner}"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-example/test}"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/task-status-common.sh"

TESTS_RUN=0
TESTS_FAILED=0

assert_eq() {
  local description="$1"
  local expected="$2"
  local actual="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$expected" = "$actual" ]; then
    echo "PASS: ${description}"
    return 0
  fi

  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo "FAIL: ${description}" >&2
  echo "  expected: ${expected}" >&2
  echo "  actual:   ${actual}" >&2
  return 1
}

assert_true() {
  local description="$1"
  shift
  TESTS_RUN=$((TESTS_RUN + 1))
  if "$@"; then
    echo "PASS: ${description}"
    return 0
  fi

  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo "FAIL: ${description}" >&2
  return 1
}

assert_false() {
  local description="$1"
  shift
  TESTS_RUN=$((TESTS_RUN + 1))
  if ! "$@"; then
    echo "PASS: ${description}"
    return 0
  fi

  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo "FAIL: ${description}" >&2
  return 1
}

assert_output_contains() {
  local description="$1"
  local expected_fragment="$2"
  local output="$3"

  TESTS_RUN=$((TESTS_RUN + 1))
  if grep -Fq "$expected_fragment" <<< "$output"; then
    echo "PASS: ${description}"
    return 0
  fi

  TESTS_FAILED=$((TESTS_FAILED + 1))
  echo "FAIL: ${description}" >&2
  echo "  expected fragment: ${expected_fragment}" >&2
  echo "  output: ${output}" >&2
  return 1
}

test_build_approved_authorization() {
  assert_true "exact BUILD_APPROVED from owner is authorized" \
    is_authorized_build_approved_comment "BUILD_APPROVED" "repo-owner"
  assert_true "trimmed BUILD_APPROVED from owner is authorized" \
    is_authorized_build_approved_comment "  BUILD_APPROVED  " "repo-owner"
  assert_false "BUILD_APPROVED from non-owner is rejected" \
    is_authorized_build_approved_comment "BUILD_APPROVED" "other-user"
  assert_false "variant BUILD_APPROVED text is rejected" \
    is_authorized_build_approved_comment "BUILD_APPROVED please" "repo-owner"
  assert_false "lowercase build_approved is rejected" \
    is_authorized_build_approved_comment "build_approved" "repo-owner"
}

test_closing_issue_extraction() {
  local extracted

  mapfile -t extracted < <(
    closing_issue_numbers_from_pr_body_text $'Fixes #12 and closes #34\nRandom #99 mention without keyword.'
  )
  assert_eq "closing keywords extract linked issue numbers" "12
34" "$(printf '%s\n' "${extracted[@]}")"

  mapfile -t extracted < <(
    closing_issue_numbers_from_pr_body_text $'Resolved hoangthang1209-byte/attd.vn#56'
  )
  assert_eq "owner/repo closing reference is extracted" "56" "$(printf '%s\n' "${extracted[@]}")"

  mapfile -t extracted < <(
    closing_issue_numbers_from_pr_body_text $'Title-only style edit with #77 but no keyword.'
  )
  assert_eq "bare issue mentions without closing keywords are ignored" "" "$(printf '%s\n' "${extracted[@]}")"
}

test_reconcile_without_open_pr_paths() {
  local output
  local mock_has_build_approved="false"
  local mock_recent_build_approved_at

  mock_recent_build_approved_at="$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ)"

  gh() {
    case "$1" in
      pr)
        printf '0\n'
        ;;
      api)
        if [[ "$*" == *"/comments"* && "$*" == *"BUILD_APPROVED"* ]]; then
          if [ "$mock_has_build_approved" = "true" ]; then
            printf '%s\n' "$mock_recent_build_approved_at"
          fi
          return 0
        fi
        if [[ "$*" == *"/comments"* && "$*" == *"TASK_STALLED"* ]]; then
          printf 'false\n'
          return 0
        fi
        ;;
      issue)
        if [ "$2" = "view" ]; then
          printf '{"labels":[{"name":"status:pr-open"}]}\n'
        elif [ "$2" = "edit" ]; then
          :
        fi
        ;;
      *)
        echo "unexpected gh call: $*" >&2
        return 1
        ;;
    esac
  }

  export -f gh

  mock_has_build_approved="false"
  output="$(reconcile_issue_without_open_pr 101 2>&1)"
  assert_output_contains \
    "stale status:pr-open without BUILD_APPROVED clears labels" \
    "clearing stale status labels" \
    "$output"

  mock_has_build_approved="true"
  output="$(reconcile_issue_without_open_pr 102 2>&1)"
  assert_output_contains \
    "authorized BUILD_APPROVED without open PR reverts to approved" \
    "reverting to status:approved" \
    "$output"
}

main() {
  test_build_approved_authorization
  test_closing_issue_extraction
  test_reconcile_without_open_pr_paths

  echo "Task status contract tests: ${TESTS_RUN} run, ${TESTS_FAILED} failed."
  if [ "$TESTS_FAILED" -gt 0 ]; then
    exit 1
  fi
}

main "$@"
