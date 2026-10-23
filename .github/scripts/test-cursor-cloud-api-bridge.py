#!/usr/bin/env python3
"""Offline safety tests for the Cursor Cloud Agent bridge."""
import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch
from subprocess import CompletedProcess

path = Path(__file__).with_name("cursor-cloud-api-bridge.py")
spec = importlib.util.spec_from_file_location("cursor_cloud_bridge", path)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class BridgeTests(unittest.TestCase):
    def test_no_credentials_fails_closed(self):
        with patch.dict(os.environ, {"CURSOR_API_KEY": ""}):
            with self.assertRaisesRegex(RuntimeError, "missing"):
                bridge.api("GET", "/me")

    def test_reject_non_numeric_issue(self):
        for value in ["0", "-2", "1; echo hi", "", "１"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                bridge.validate_launch_issue(value)

    @patch.object(bridge.subprocess, "run")
    def test_low_risk_issue_must_be_approved(self, run):
        for state, labels, allowed in [
            ("OPEN", ["cursor:pilot-approved", "risk:low"], True),
            ("CLOSED", ["cursor:pilot-approved", "risk:low"], False),
            ("OPEN", ["risk:low"], False),
            ("OPEN", ["cursor:pilot-approved"], False),
            ("OPEN", ["cursor:pilot-approved", "risk:high"], False),
        ]:
            run.return_value = CompletedProcess([], 0, json.dumps({
                "state": state, "labels": [{"name": name} for name in labels]
            }), "")
            if allowed:
                bridge.validate_launch_issue("345")
            else:
                with self.assertRaises(RuntimeError):
                    bridge.validate_launch_issue("345")

    @patch.object(bridge.subprocess, "run", side_effect=bridge.subprocess.TimeoutExpired(["gh"], 20))
    def test_github_timeout_fails_closed(self, _run):
        with self.assertRaisesRegex(RuntimeError, "Unable to verify"):
            bridge.validate_launch_issue("345")


if __name__ == "__main__":
    unittest.main()
