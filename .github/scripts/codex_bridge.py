#!/usr/bin/env python3
"""Small standard-library helpers for the Budget Planner Codex bridge."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

OWNER = "OL1V3S"
MODES = {"plan", "audit", "implement", "fix"}
RISKS = {"LOW", "MEDIUM", "HIGH"}
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
REF_RE = re.compile(r"^[A-Za-z0-9._/-]+$")
BRANCH_RE = re.compile(r"^(feat|fix|chore|docs|test)/[A-Za-z0-9._/-]+$")
TASK_FENCE_RE = re.compile(r"```codex-task\s*(\{.*?\})\s*```", re.DOTALL)
PLAN_FENCE_RE = re.compile(r"```codex-plan\s*(\{.*?\})\s*```", re.DOTALL)
APPROVAL_FENCE_RE = re.compile(r"```codex-approval\s*(\{.*?\})\s*```", re.DOTALL)
GLOB_CHARS = "*?["


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: str | Path) -> Any:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str | Path, value: Any) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def canonical_digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def safe_repo_path(value: str, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{field} must contain non-empty repository-relative paths")
    value = value.strip().replace("\\", "/")
    path = Path(value)
    if path.is_absolute() or value.startswith("/") or ".." in path.parts or ".git" in path.parts:
        fail(f"unsafe path in {field}: {value}")
    return value


def safe_ref(value: str, *, field: str) -> str:
    if not isinstance(value, str) or not REF_RE.fullmatch(value):
        fail(f"invalid {field}")
    if value.startswith("/") or value.endswith("/") or ".." in value or "//" in value:
        fail(f"invalid {field}")
    return value


def list_of_paths(packet: dict[str, Any], field: str, *, required: bool) -> list[str]:
    raw = packet.get(field, [])
    if not isinstance(raw, list) or any(not isinstance(item, str) for item in raw):
        fail(f"{field} must be an array of strings")
    if len(raw) > 200:
        fail(f"{field} contains too many entries")
    paths = [safe_repo_path(item, field=field) for item in raw]
    if field != "allowed_write_paths" and any(any(char in path for char in GLOB_CHARS) for path in paths):
        fail(f"{field} must name exact files, not glob patterns")
    if required and not paths:
        fail(f"{field} must not be empty")
    if len(paths) != len(set(paths)):
        fail(f"{field} contains duplicates")
    return paths


def validate_authority_docs(paths: list[str]) -> None:
    for path in paths:
        allowed = path in {"AGENTS.md", "ARCHITECTURE.md", "ROADMAP.md"} or (
            path.startswith("docs/") and path.endswith(".md")
        )
        if not allowed:
            fail(f"authority_docs may contain only canonical root docs or docs/*.md: {path}")


def emit_output(name: str, value: Any) -> None:
    output = os.environ.get("GITHUB_OUTPUT")
    if not output:
        return
    if isinstance(value, bool):
        text = "true" if value else "false"
    elif value is None:
        text = ""
    else:
        text = str(value)
    if "\n" in text or "\r" in text:
        fail(f"workflow output {name} may not contain newlines")
    with open(output, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={text}\n")


def comment_issue_matches(comment: dict[str, Any], issue: int) -> bool:
    issue_url = comment.get("issue_url", "")
    return isinstance(issue_url, str) and issue_url.rstrip("/").endswith(f"/{issue}")


def parse_task_comment(args: argparse.Namespace) -> None:
    body = Path(args.comment_file).read_text(encoding="utf-8")
    first_line = next((line.strip() for line in body.splitlines() if line.strip()), "")
    command = re.fullmatch(r"/codex\s+(plan|audit|implement|fix)", first_line)
    if not command:
        fail("comment must begin with an exact /codex plan|audit|implement|fix command")
    command_mode = command.group(1)

    match = TASK_FENCE_RE.search(body)
    if not match:
        fail("missing fenced codex-task JSON packet")
    try:
        packet = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        fail(f"invalid codex-task JSON: {exc}")
    if not isinstance(packet, dict):
        fail("codex-task payload must be a JSON object")

    mode = packet.get("mode")
    if mode != command_mode or mode not in MODES:
        fail("task packet mode must exactly match the command")

    issue = packet.get("issue")
    if not isinstance(issue, int) or issue <= 0:
        fail("issue must be a positive integer")

    pr = packet.get("pr")
    if mode == "fix":
        if not isinstance(pr, int) or pr <= 0:
            fail("fix mode requires a positive pr number")
        if args.event_issue not in {issue, pr}:
            fail("fix command must be posted on the governing issue or target PR")
    else:
        if issue != args.event_issue:
            fail("task packet issue must match the issue receiving the command")
        if pr is not None and (not isinstance(pr, int) or pr <= 0):
            fail("pr must be a positive integer when supplied")

    risk = packet.get("risk")
    if risk not in RISKS:
        fail("risk must be LOW, MEDIUM, or HIGH")

    base_ref = safe_ref(packet.get("base_ref", ""), field="base_ref")
    base_sha = packet.get("base_sha")
    if not isinstance(base_sha, str) or not GIT_SHA_RE.fullmatch(base_sha):
        fail("base_sha must be a full 40-character lowercase Git commit SHA")

    instructions = packet.get("instructions")
    if not isinstance(instructions, str) or not instructions.strip():
        fail("instructions must be a non-empty string")
    if len(instructions) > 20000:
        fail("instructions are too large")

    target_files = list_of_paths(packet, "target_files", required=True)
    authority_docs = list_of_paths(packet, "authority_docs", required=True)
    validate_authority_docs(authority_docs)
    allowed_write_paths = list_of_paths(
        packet, "allowed_write_paths", required=mode in {"implement", "fix"}
    )

    branch = packet.get("branch", "")
    title = packet.get("title", "")

    if mode in {"plan", "audit"} and base_ref != "main":
        fail("v1 plan/audit runs must target current main")

    if mode in {"implement", "fix"}:
        if not isinstance(branch, str) or not BRANCH_RE.fullmatch(branch):
            fail("implementation/fix branch must use feat|fix|chore|docs|test/<name>")
        safe_ref(branch, field="branch")
        if branch == "main":
            fail("main may never be used as a Codex write branch")
        if (
            not isinstance(title, str)
            or not title.strip()
            or len(title) > 160
            or "\n" in title
            or "\r" in title
        ):
            fail("implementation/fix title must be one non-empty line <= 160 characters")

    if mode == "implement" and base_ref != "main":
        fail("new implementation runs must start from main")
    if mode == "fix" and base_ref != branch:
        fail("fix runs must bind base_ref to the existing PR branch")

    requires_approval = mode in {"implement", "fix"} and risk in {"MEDIUM", "HIGH"}
    plan_sha256 = packet.get("plan_sha256", "")
    plan_comment_id = packet.get("plan_comment_id")
    approval_comment_id = packet.get("approval_comment_id")

    if requires_approval:
        if not isinstance(plan_sha256, str) or not SHA256_RE.fullmatch(plan_sha256):
            fail("MEDIUM/HIGH write mode requires plan_sha256")
        if not isinstance(plan_comment_id, int) or plan_comment_id <= 0:
            fail("MEDIUM/HIGH write mode requires plan_comment_id")
        if not isinstance(approval_comment_id, int) or approval_comment_id <= 0:
            fail("MEDIUM/HIGH write mode requires approval_comment_id")

    normalized = {
        "issue": issue,
        "pr": pr,
        "mode": mode,
        "risk": risk,
        "base_ref": base_ref,
        "base_sha": base_sha,
        "branch": branch,
        "title": title.strip() if isinstance(title, str) else "",
        "target_files": target_files,
        "authority_docs": authority_docs,
        "allowed_write_paths": allowed_write_paths,
        "instructions": instructions.strip(),
        "plan_sha256": plan_sha256,
        "plan_comment_id": plan_comment_id,
        "approval_comment_id": approval_comment_id,
    }
    write_json(args.output, normalized)

    all_paths = target_files + allowed_write_paths
    emit_output("mode", mode)
    emit_output("risk", risk)
    emit_output("issue", issue)
    emit_output("pr", pr or "")
    emit_output("base_ref", base_ref)
    emit_output("base_sha", base_sha)
    emit_output("branch", branch)
    emit_output("title", normalized["title"])
    emit_output("requires_approval", requires_approval)
    emit_output("plan_comment_id", plan_comment_id or "")
    emit_output("approval_comment_id", approval_comment_id or "")
    emit_output("plan_sha256", plan_sha256)
    emit_output("needs_frontend", any(path.startswith("frontend/") for path in all_paths))
    emit_output("needs_backend", any(path.startswith("backend") for path in all_paths))


def extract_fenced_json(body: str, pattern: re.Pattern[str], label: str) -> dict[str, Any]:
    match = pattern.search(body)
    if not match:
        fail(f"missing fenced {label} JSON")
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        fail(f"invalid {label} JSON: {exc}")
    if not isinstance(value, dict):
        fail(f"{label} must be a JSON object")
    return value


def verify_approval(args: argparse.Namespace) -> None:
    packet = load_json(args.packet)
    if packet["risk"] not in {"MEDIUM", "HIGH"} or packet["mode"] not in {"implement", "fix"}:
        fail("approval verification is only for MEDIUM/HIGH write modes")

    plan_comment = load_json(args.plan_comment)
    approval_comment = load_json(args.approval_comment)
    if not comment_issue_matches(plan_comment, packet["issue"]):
        fail("plan comment does not belong to the governing issue")
    if not comment_issue_matches(approval_comment, packet["issue"]):
        fail("approval comment does not belong to the governing issue")

    plan_author = ((plan_comment.get("user") or {}).get("login") or "")
    if plan_author not in {"github-actions[bot]", OWNER}:
        fail("plan comment was not produced by the trusted workflow/owner")
    plan = extract_fenced_json(plan_comment.get("body", ""), PLAN_FENCE_RE, "codex-plan")
    digest = canonical_digest(plan)
    if digest != packet["plan_sha256"]:
        fail("plan digest does not match the implementation task packet")

    approval_author = ((approval_comment.get("user") or {}).get("login") or "")
    if approval_author != OWNER:
        fail("approval marker must be authored by the repository owner")
    approval_body = approval_comment.get("body", "")
    first_line = next((line.strip() for line in approval_body.splitlines() if line.strip()), "")
    if first_line != "/codex approve":
        fail("approval comment must begin with /codex approve")
    approval = extract_fenced_json(approval_body, APPROVAL_FENCE_RE, "codex-approval")
    if approval.get("issue") != packet["issue"]:
        fail("approval marker issue does not match")
    if approval.get("plan_sha256") != digest:
        fail("approval marker is not bound to the exact approved plan")

    write_json(args.output_plan, plan)


def build_context(args: argparse.Namespace) -> None:
    packet = load_json(args.packet)
    repo = Path(args.repo).resolve()
    output = Path(args.output).resolve()
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    shutil.copy2(args.packet, output / "task-packet.json")
    shutil.copy2(args.repo_map, output / "repo-map.txt")

    for field, folder in (("target_files", "targeted"), ("authority_docs", "authority")):
        for raw_path in packet[field]:
            relative = Path(safe_repo_path(raw_path, field=field))
            source = (repo / relative).resolve()
            try:
                source.relative_to(repo)
            except ValueError:
                fail(f"{raw_path} resolves outside repository")
            if not source.is_file():
                fail(f"target context file does not exist: {raw_path}")
            destination = output / folder / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


def git_paths(repo: Path) -> set[str]:
    changed = subprocess.run(
        ["git", "-C", str(repo), "diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    untracked = subprocess.run(
        ["git", "-C", str(repo), "ls-files", "--others", "--exclude-standard"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    return {path.replace("\\", "/") for path in changed + untracked if path.strip()}


def rule_matches(path: str, rule: str) -> bool:
    if rule.endswith("/"):
        return path.startswith(rule)
    if any(char in rule for char in GLOB_CHARS):
        return fnmatch.fnmatchcase(path, rule)
    return path == rule


def validate_writes(args: argparse.Namespace) -> None:
    packet = load_json(args.packet)
    repo = Path(args.repo).resolve()
    allowed = packet.get("allowed_write_paths", [])
    changed = sorted(git_paths(repo))
    if not changed:
        fail("Codex produced no repository changes")
    violations = [path for path in changed if not any(rule_matches(path, rule) for rule in allowed)]
    if violations:
        fail("Codex changed paths outside allowed_write_paths: " + ", ".join(violations))
    for path in changed:
        print(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)

    parse = sub.add_parser("parse")
    parse.add_argument("--comment-file", required=True)
    parse.add_argument("--event-issue", required=True, type=int)
    parse.add_argument("--output", required=True)
    parse.set_defaults(func=parse_task_comment)

    approval = sub.add_parser("verify-approval")
    approval.add_argument("--packet", required=True)
    approval.add_argument("--plan-comment", required=True)
    approval.add_argument("--approval-comment", required=True)
    approval.add_argument("--output-plan", required=True)
    approval.set_defaults(func=verify_approval)

    context = sub.add_parser("build-context")
    context.add_argument("--packet", required=True)
    context.add_argument("--repo-map", required=True)
    context.add_argument("--repo", required=True)
    context.add_argument("--output", required=True)
    context.set_defaults(func=build_context)

    writes = sub.add_parser("validate-writes")
    writes.add_argument("--packet", required=True)
    writes.add_argument("--repo", required=True)
    writes.set_defaults(func=validate_writes)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
