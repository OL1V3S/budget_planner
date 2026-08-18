#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("codex_bridge.py")
spec = importlib.util.spec_from_file_location("codex_bridge", SCRIPT)
bridge = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(bridge)


class Args:
    pass


def packet(**overrides):
    value = {
        "issue": 45,
        "mode": "plan",
        "risk": "HIGH",
        "base_ref": "main",
        "base_sha": "a" * 40,
        "target_files": ["backend/Program.cs"],
        "authority_docs": ["AGENTS.md", "docs/verification.md"],
        "allowed_write_paths": [],
        "instructions": "Inspect only the selected boundary.",
    }
    value.update(overrides)
    return value


def command_body(value):
    return f"/codex {value['mode']}\n\n```codex-task\n{json.dumps(value)}\n```\n"


class ParseTests(unittest.TestCase):
    def run_parse(self, value, event_issue=45):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            comment = root / "comment.md"
            output = root / "task.json"
            comment.write_text(command_body(value), encoding="utf-8")
            args = Args()
            args.comment_file = str(comment)
            args.event_issue = event_issue
            args.output = str(output)
            bridge.parse_task_comment(args)
            return json.loads(output.read_text(encoding="utf-8"))

    def test_valid_plan_is_normalized(self):
        result = self.run_parse(packet())
        self.assertEqual(result["mode"], "plan")
        self.assertEqual(result["base_ref"], "main")
        self.assertEqual(result["target_files"], ["backend/Program.cs"])

    def test_plan_requires_exact_target_files(self):
        with self.assertRaises(SystemExit):
            self.run_parse(packet(target_files=["backend/**/*.cs"]))

    def test_implement_requires_write_paths(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    mode="implement",
                    risk="LOW",
                    branch="feat/45-smoke",
                    title="test: harmless smoke",
                    allowed_write_paths=[],
                )
            )

    def test_medium_implement_requires_plan_binding(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    mode="implement",
                    risk="MEDIUM",
                    branch="feat/45-smoke",
                    title="test: harmless smoke",
                    allowed_write_paths=["docs/smoke.md"],
                )
            )

    def test_fix_must_bind_to_existing_branch_ref(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    issue=45,
                    pr=99,
                    mode="fix",
                    risk="LOW",
                    base_ref="main",
                    branch="fix/99-review",
                    title="fix: review finding",
                    allowed_write_paths=["backend/Program.cs"],
                ),
                event_issue=99,
            )

    def test_fix_may_be_triggered_on_target_pr(self):
        result = self.run_parse(
            packet(
                issue=45,
                pr=99,
                mode="fix",
                risk="LOW",
                base_ref="fix/99-review",
                branch="fix/99-review",
                title="fix: review finding",
                allowed_write_paths=["backend/Program.cs"],
            ),
            event_issue=99,
        )
        self.assertEqual(result["pr"], 99)

    def test_title_rejects_newline_output_injection(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    mode="implement",
                    risk="LOW",
                    branch="feat/45-smoke",
                    title="safe\nmalicious=true",
                    allowed_write_paths=["docs/smoke.md"],
                )
            )


class ApprovalTests(unittest.TestCase):
    def test_approval_is_bound_to_exact_plan_and_issue(self):
        plan = {
            "status": "plan",
            "summary": "bounded plan",
            "files_considered": ["backend/Program.cs"],
            "plan": ["change one thing"],
            "findings": [],
            "risks": ["none beyond scope"],
            "verification": ["run focused tests"],
            "context_expansion_requests": [],
        }
        digest = bridge.canonical_digest(plan)
        task = packet(
            mode="implement",
            risk="HIGH",
            branch="feat/45-smoke",
            title="test: harmless smoke",
            allowed_write_paths=["docs/smoke.md"],
            plan_sha256=digest,
            plan_comment_id=10,
            approval_comment_id=11,
        )
        task.update({"pr": None})
        plan_comment = {
            "issue_url": "https://api.github.com/repos/OL1V3S/budget_planner/issues/45",
            "user": {"login": "github-actions[bot]"},
            "body": "```codex-plan\n" + json.dumps(plan) + "\n```",
        }
        approval_comment = {
            "issue_url": "https://api.github.com/repos/OL1V3S/budget_planner/issues/45",
            "user": {"login": "OL1V3S"},
            "body": "/codex approve\n```codex-approval\n" + json.dumps({"issue": 45, "plan_sha256": digest}) + "\n```",
        }

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, value in (
                ("packet.json", task),
                ("plan.json", plan_comment),
                ("approval.json", approval_comment),
            ):
                (root / name).write_text(json.dumps(value), encoding="utf-8")
            args = Args()
            args.packet = str(root / "packet.json")
            args.plan_comment = str(root / "plan.json")
            args.approval_comment = str(root / "approval.json")
            args.output_plan = str(root / "approved.json")
            bridge.verify_approval(args)
            self.assertEqual(json.loads((root / "approved.json").read_text()), plan)

            approval_comment["issue_url"] = "https://api.github.com/repos/OL1V3S/budget_planner/issues/44"
            (root / "approval.json").write_text(json.dumps(approval_comment), encoding="utf-8")
            with self.assertRaises(SystemExit):
                bridge.verify_approval(args)


class WriteBoundaryTests(unittest.TestCase):
    def test_out_of_scope_change_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
            (repo / "allowed.txt").write_text("before\n", encoding="utf-8")
            (repo / "blocked.txt").write_text("before\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "base"], cwd=repo, check=True)
            (repo / "blocked.txt").write_text("after\n", encoding="utf-8")

            task = packet(allowed_write_paths=["allowed.txt"])
            task_path = Path(tmp) / "task.json"
            task_path.write_text(json.dumps(task), encoding="utf-8")
            args = Args()
            args.packet = str(task_path)
            args.repo = str(repo)
            with self.assertRaises(SystemExit):
                bridge.validate_writes(args)

    def test_allowed_prefix_accepts_new_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
            (repo / "seed.txt").write_text("seed\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "base"], cwd=repo, check=True)
            (repo / "docs").mkdir()
            (repo / "docs" / "new.md").write_text("new\n", encoding="utf-8")

            task = packet(allowed_write_paths=["docs/"])
            task_path = Path(tmp) / "task.json"
            task_path.write_text(json.dumps(task), encoding="utf-8")
            args = Args()
            args.packet = str(task_path)
            args.repo = str(repo)
            bridge.validate_writes(args)


if __name__ == "__main__":
    unittest.main()
