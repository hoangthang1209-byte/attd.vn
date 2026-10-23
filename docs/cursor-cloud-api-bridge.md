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
- GitHub Actions cannot prove a run is actively coding without polling a known
  run ID (and checking the run status). `status` reports agent lifecycle only.
- Launches can incur Cursor usage charges. Admin-scoped API keys should be rotated
  or replaced by narrower scoped credentials when available.
- This is a **pilot**, not proof of an unattended factory loop.

API reference: https://cursor.com/docs/cloud-agent/api/endpoints
