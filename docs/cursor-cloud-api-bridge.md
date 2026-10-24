# Cursor Cloud Agents API bridge — pilot

This adds a controlled, **manual workflow_dispatch** bridge for the official Cursor Cloud Agents v1 API.
The repository secret `CURSOR_API_KEY` is read by GitHub Actions only; never put its value in issues or PRs.

## Pilot sequence

1. Merge this PR only after normal CI and independent review.
2. Actions → **Cursor Cloud API Bridge — Controlled Dispatch** → `verify`.
   Successful output includes only the API key display name, not the secret.
3. For a dedicated **low-risk** test issue (not #218 production rollout), choose `launch`, provide its issue number, and check `approve_launch`.
4. Save the printed agent ID/run ID and verify the Cloud Agent created a draft PR. Check progress through `status` using that agent ID.
5. Inspect the PR, CI and reviewer results before any manual merge.

## Safety and known limitations

- Does not automatically launch on `BUILD_APPROVED`; GitHub event identity,
  authorization, one-active-worker lease and idempotent dispatch must be
  implemented and tested before connecting this bridge to the continuous queue.
- Does **not** repair PR #219 on its existing branch. Cursor v1 follow-up runs
  require the existing Cloud Agent ID; never launch a second agent for the same PR
  without reconciliation.
- Does not modify production or auto-merge.
- `status` is a point-in-time snapshot of agent lifecycle plus the latest run
  status. It does not stream tool calls or prove which files the agent is editing.
  Poll `status` with the saved agent id to follow progress.
- Launches can incur Cursor usage charges. Admin-scoped API keys should be rotated
  or replaced by narrower scoped credentials when available.
- This is a **pilot**, not proof of an unattended factory loop.

## Troubleshooting

### Verification

Dispatch **Cursor Cloud API Bridge — Controlled Dispatch** with `mode=verify`. Only the repository owner can start the workflow. Success prints one line and nothing else:

`Cursor API authenticated; key name: <display name>`

That name comes from `GET /v1/me`. It is not the API key. Do not paste secret values into issues, pull requests, or this document.

A missing secret fails with `Cursor bridge error: CURSOR_API_KEY is missing from GitHub Actions secrets`. Any other API rejection fails with `Cursor bridge error: Cursor API returned HTTP <code> for GET /me`. The script does not print response bodies.

Pilot check: workflow run [40060492218](https://github.com/hoangthang1209-byte/vnc-os/actions/runs/40060492218) completed `verify` successfully and printed only the key display name.

### Status lookup

Save `agentId` and `runId` from a successful `launch` log, then dispatch the same workflow with `mode=status` and that agent id. The id must match `bc-` followed by letters, digits, and hyphens. The job prints one JSON object:

- `id` — agent id
- `status` — agent lifecycle, such as `ACTIVE`
- `latestRunId` — newest run id, when one exists
- `latestRunStatus` — that run's status, such as `CREATING`, `RUNNING`, or `FINISHED`
- `url` — Cloud Agent page

The call reads `GET /v1/agents/{id}` and, when `latestRunId` is present, `GET /v1/agents/{id}/runs/{runId}`. Dispatch `status` again to poll. An id that fails the pattern is rejected before the API call (`Invalid agent ID`). An unknown id fails as `Cursor API returned HTTP <code> for GET /agents/<id>`.

Pilot launch [40060699419](https://github.com/hoangthang1209-byte/vnc-os/actions/runs/40060699419) returned agent `bc-a93e19a1-7fb1-5fc2-9639-c5f339ede39e`, run `run-6af50d33-9146-4d45-908a-fd27d9f61b15`, and run status `RUNNING` at dispatch time.

### HTTP 409 agent-id conflict

`launch` sends a stable client `agentId`: `bc-` plus the UUIDv5 (URL namespace) of `https://github.com/hoangthang1209-byte/vnc-os/issues/<issue number>`. The same issue always maps to the same id. Cursor treats a repeated create as idempotent and returns **HTTP 409** `agent_id_conflict` instead of creating a second agent.

The bridge does not print the response body, so the failed job shows only:

`Cursor bridge error: Cursor API returned HTTP 409 for POST /agents`

That denies the duplicate. It does not cancel or replace the agent that already exists. Reconcile by running `status` with the id from the original launch log. If that log is gone, recompute the id and do not launch again:

```python
import uuid
issue_number = "234"
agent_id = "bc-" + str(uuid.uuid5(
    uuid.NAMESPACE_URL,
    "https://github.com/hoangthang1209-byte/vnc-os/issues/" + issue_number,
))
```

For issue #234 that value is `bc-a93e19a1-7fb1-5fc2-9639-c5f339ede39e`. This 409 is the create conflict. It is separate from `409 agent_busy`, which applies when a follow-up run is posted while another run is still active. This bridge only creates an agent; it does not send follow-up runs.

API reference: https://cursor.com/docs/cloud-agent/api/endpoints
