#!/usr/bin/env python3
"""Minimal fail-closed Cursor Cloud Agent API bridge for GitHub Actions.

No API keys in source, stdout, logs, or PR comments. Dispatch is manual-only
until independent review and a verified non-production smoke prove safety.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from base64 import b64encode

API_BASE = "https://api.cursor.com/v1"
REPO = "https://github.com/hoangthang1209-byte/vnc-os"


def api(method: str, path: str, payload: dict | None = None) -> dict:
    key = os.environ.get("CURSOR_API_KEY", "").strip()
    if not key:
        raise RuntimeError("CURSOR_API_KEY is missing from GitHub Actions secrets")
    token = b64encode(f"{key}:".encode()).decode()
    headers = {"Authorization": f"Basic {token}", "Accept": "application/json"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(API_BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # Never print response bodies (may echo credentials or customer data).
        raise RuntimeError(f"Cursor API returned HTTP {exc.code} for {method} {path}") from None


def main() -> None:
    mode = os.environ.get("CURSOR_BRIDGE_MODE", "verify")
    if mode == "verify":
        info = api("GET", "/me")
        print("Cursor API authenticated; key name:", info.get("apiKeyName", "(unnamed)"))
        return
    if mode == "status":
        agent_id = os.environ.get("CURSOR_AGENT_ID", "")
        if not agent_id.startswith("bc-") or "/" in agent_id:
            raise ValueError("Invalid agent id")
        agent = api("GET", f"/agents/{agent_id}")
        print(json.dumps({
            "id": agent.get("id"),
            "status": agent.get("status"),
            "latestRunId": agent.get("latestRunId"),
            "url": agent.get("url"),
        }))
        return
    if mode != "launch":
        raise ValueError("Unsupported bridge mode")

    issue_number = os.environ.get("CURSOR_ISSUE_NUMBER", "")
    if not issue_number.isascii() or not issue_number.isdecimal() or int(issue_number) < 1:
        raise ValueError("Issue number must be a positive integer")
    if os.environ.get("CURSOR_LAUNCH_APPROVED") != "true":
        raise RuntimeError("Explicit launch approval required")

    prompt = (
        f"Work on VNC OS issue #{issue_number}. First read AGENTS.md, "
        "docs/development-workflow.md, and the issue specification. "
        "Do not use production database or production credentials. "
        "Implement only the approved low-risk scope with tests. "
        "Open a draft PR; do not merge, deploy, or change protected "
        "business/security domains. If the task is blocked, report why."
    )
    result = api("POST", "/agents", {
        "prompt": {"text": prompt},
        "repos": [{"url": REPO, "startingRef": "main"}],
        "autoCreatePR": True,
    })
    agent = result.get("agent", {})
    run = result.get("run", {})
    if not agent.get("id") or not run.get("id"):
        raise RuntimeError("Cursor API returned no agent/run id")
    print(json.dumps({
        "agentId": agent["id"],
        "runId": run["id"],
        "runStatus": run.get("status"),
        "url": agent.get("url"),
        "issue": int(issue_number),
    }))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError) as error:
        print(f"Cursor bridge error: {error}", file=sys.stderr)
        sys.exit(1)
