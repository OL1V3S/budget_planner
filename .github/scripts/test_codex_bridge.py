#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
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

    def test_allowed_write_paths_reject_globs(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    mode="implement",
                    risk="LOW",
                    branch="feat/45-smoke",
                    title="test: harmless smoke",
                    allowed_write_paths=["docs/*.md"],
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

    def test_medium_implement_rejects_incorrect_scope_digest(self):
        with self.assertRaises(SystemExit):
            self.run_parse(
                packet(
                    mode="implement",
                    risk="MEDIUM",
                    branch="feat/45-smoke",
                    title="test: harmless smoke",
                    allowed_write_paths=["docs/smoke.md"],
                    plan_sha256="b" * 64,
                    plan_comment_id=10,
                    approval_comment_id=11,
                    scope_sha256="c" * 64,
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

    def test_fix_may_be_triggered_on_target_pr_without_new_plan_approval(self):
        result = self.run_parse(
            packet(
                issue=45,
                pr=99,
                mode="fix",
                risk="HIGH",
                base_ref="fix/99-review",
                branch="fix/99-review",
                title="fix: review finding",
                allowed_write_paths=["backend/Program.cs"],
            ),
            event_issue=99,
        )
        self.assertEqual(result["pr"], 99)
        self.assertIsNone(result["plan_comment_id"])

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
    def build_approval_fixture(
        self,
        root: Path,
        *,
        binding_base_sha: str = "a" * 40,
        plan_author: str = "github-actions[bot]",
        approval_scope_override: str | None = None,
    ):
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
        task["scope_sha256"] = bridge.canonical_digest(bridge.implementation_scope(task))
        binding = {
            "issue": 45,
            "mode": "plan",
            "base_sha": binding_base_sha,
            "plan_sha256": digest,
        }
        plan_comment = {
            "issue_url": "https://api.github.com/repos/OL1V3S/budget_planner/issues/45",
            "user": {"login": plan_author},
            "body": (
                "```codex-plan-binding\n"
                + json.dumps(binding)
                + "\n```\n```codex-plan\n"
                + json.dumps(plan)
                + "\n```"
            ),
        }
        approval_scope = approval_scope_override or task["scope_sha256"]
        approval_comment = {
            "issue_url": "https://api.github.com/repos/OL1V3S/budget_planner/issues/45",
            "user": {"login": "OL1V3S"},
            "body": "/codex approve\n```codex-approval\n"
            + json.dumps(
                {
                    "issue": 45,
                    "plan_sha256": digest,
                    "scope_sha256": approval_scope,
                }
            )
            + "\n```",
        }
        for name, value in (
            ("packet.json", task),
            ("plan.json", plan_comment),
            ("approval.json", approval_comment),
        ):
            (root / name).write_text(json.dumps(value), encoding="utf-8")
        return plan, approval_comment

    def make_args(self, root: Path):
        args = Args()
        args.packet = str(root / "packet.json")
        args.plan_comment = str(root / "plan.json")
        args.approval_comment = str(root / "approval.json")
        args.output_plan = str(root / "approved.json")
        return args

    def test_approval_is_bound_to_exact_plan_issue_base_and_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            plan, approval_comment = self.build_approval_fixture(root)
            args = self.make_args(root)
            bridge.verify_approval(args)
            self.assertEqual(json.loads((root / "approved.json").read_text()), plan)

            approval_comment["issue_url"] = "https://api.github.com/repos/OL1V3S/budget_planner/issues/44"
            (root / "approval.json").write_text(json.dumps(approval_comment), encoding="utf-8")
            with self.assertRaises(SystemExit):
                bridge.verify_approval(args)

    def test_stale_plan_base_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.build_approval_fixture(root, binding_base_sha="b" * 40)
            with self.assertRaises(SystemExit):
                bridge.verify_approval(self.make_args(root))

    def test_owner_cannot_substitute_for_codex_plan_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.build_approval_fixture(root, plan_author="OL1V3S")
            with self.assertRaises(SystemExit):
                bridge.verify_approval(self.make_args(root))

    def test_approval_cannot_be_reused_for_different_implementation_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.build_approval_fixture(root, approval_scope_override="d" * 64)
            with self.assertRaises(SystemExit):
                bridge.verify_approval(self.make_args(root))


class WriteBoundaryTests(unittest.TestCase):
    def initialize_repo(self, repo: Path):
        repo.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
        (repo / "seed.txt").write_text("seed\n", encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=repo, check=True)
        subprocess.run(["git", "commit", "-qm", "base"], cwd=repo, check=True)

    def validate(self, repo: Path, allowed_write_paths):
        task = packet(allowed_write_paths=allowed_write_paths)
        task_path = repo.parent / "task.json"
        task_path.write_text(json.dumps(task), encoding="utf-8")
        args = Args()
        args.packet = str(task_path)
        args.repo = str(repo)
        bridge.validate_writes(args)

    def test_out_of_scope_change_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            self.initialize_repo(repo)
            (repo / "blocked.txt").write_text("after\n", encoding="utf-8")
            with self.assertRaises(SystemExit):
                self.validate(repo, ["allowed.txt"])

    def test_allowed_prefix_accepts_new_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            self.initialize_repo(repo)
            (repo / "docs").mkdir()
            (repo / "docs" / "new.md").write_text("new\n", encoding="utf-8")
            self.validate(repo, ["docs/"])

    def test_symlink_change_fails_closed(self):
        if not hasattr(os, "symlink"):
            self.skipTest("symlinks unavailable")
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "repo"
            self.initialize_repo(repo)
            os.symlink("seed.txt", repo / "link.txt")
            with self.assertRaises(SystemExit):
                self.validate(repo, ["link.txt"])


if __name__ == "__main__":
    unittest.main()
