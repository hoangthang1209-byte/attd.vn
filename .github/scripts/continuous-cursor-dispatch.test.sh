#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GITHUB_REPOSITORY="hoangthang1209-byte/vnc-os"
export CURSOR_API_KEY="test-only-not-real"
source "${SCRIPT_DIR}/continuous-orchestrator-common.sh"
MOCK_AGENT_MODE="fail"
MOCK_LABELS='{"state":"OPEN","labels":[{"name":"risk:low"},{"name":"cursor:pilot-approved"}]}'
COMMENTS=0
LEASES=0
BUILDING=0
gh() {
  if [[ "$1 $2" == "issue view" ]]; then printf '%s\n' "$MOCK_LABELS"; return 0; fi
  if [[ "$1 $2" == "issue comment" ]]; then COMMENTS=$((COMMENTS + 1)); return 0; fi
  return 1
}
issue_has_idempotency_marker() { return 1; }
set_issue_status_label() { [[ "$2" != "status:building" ]] || BUILDING=$((BUILDING + 1)); }
record_builder_lease() { LEASES=$((LEASES + 1)); }
python3() {
  if [[ "$MOCK_AGENT_MODE" == "fail" ]]; then return 1; fi
  printf '{"agentId":"bc-test-agent","runId":"run-test"}\n'
}
if dispatch_approved_cursor_issue 123; then echo "FAIL: unconfirmed API response accepted"; exit 1; fi
[[ "$COMMENTS" -eq 0 && "$LEASES" -eq 0 && "$BUILDING" -eq 0 ]] || { echo "FAIL: false lease/building"; exit 1; }
MOCK_AGENT_MODE="success"
dispatch_approved_cursor_issue 123
[[ "$COMMENTS" -eq 1 && "$LEASES" -eq 1 && "$BUILDING" -eq 1 ]] || { echo "FAIL: confirmed dispatch not persisted"; exit 1; }
MOCK_LABELS='{"state":"OPEN","labels":[{"name":"risk:low"},{"name":"cursor:pilot-approved"},{"name":"risk:high"}]}'
if dispatch_approved_cursor_issue 124; then echo "FAIL: high-risk launch permitted"; exit 1; fi
[[ "$COMMENTS" -eq 1 && "$LEASES" -eq 1 && "$BUILDING" -eq 1 ]] || { echo "FAIL: rejected launch changed state"; exit 1; }
echo "PASS: dispatch failure, acknowledgement and high-risk denial contracts"
