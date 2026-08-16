# Budget Planner Agent Instructions

## Purpose

This repository uses AI-assisted software engineering with human approval at risk-sensitive boundaries.

Agents should optimize for:

- correctness;
- small, reviewable changes;
- preservation of existing behavior unless a task explicitly changes it;
- strong automated verification;
- clear GitHub history;
- minimal unrelated churn.

## Repository structure

- `frontend/` — React + Vite frontend
- `backend/` — ASP.NET Core backend
- `backend.Tests/` — backend test suite
- `.github/workflows/` — CI workflows

## General workflow

### New work

When starting a new issue or change:

1. Fetch current `origin/main`.
2. Start from an up-to-date `main`.
3. Confirm the worktree is clean.
4. Create a fresh feature branch.
5. Inspect the relevant code and tests before editing.
6. Identify the risk level of the task.

If unexpected tracked or untracked changes exist before starting new work, stop and report them.

Do not automatically stash, reset, clean, discard, or overwrite unexpected work.

### Existing PR follow-up

When addressing review feedback or continuing work on an existing draft PR:

1. Remain on the existing PR branch.
2. Confirm the branch and worktree state match the expected PR.
3. Inspect the review finding and affected code.
4. Make only the smallest correction required.
5. Rerun affected verification.
6. Commit and push to the existing PR branch.

Do not create a new branch for ordinary review corrections.

Do not rebase or merge `main` into an existing PR branch unless explicitly requested or required to resolve a known integration problem.

### General safety

Do not modify unrelated files.

Do not use destructive git operations unless explicitly authorized.

Prefer exact-path staging over `git add .` or `git add -A`.

## Risk levels

### LOW

Examples:

- tests;
- copy changes;
- isolated styling;
- mechanical moves or renames;
- small accessibility fixes;
- small repository-maintenance changes.

Agent authority:

- inspect;
- implement;
- test;
- commit;
- push;
- open a draft PR.

No separate implementation approval is required unless the task reveals unexpected risk.

### MEDIUM

Examples:

- new feature behavior;
- meaningful frontend state changes;
- API consumption changes;
- cross-feature refactors;
- new user workflows.

Agent authority:

1. inspect;
2. produce a concise implementation plan;
3. stop for approval;
4. after approval, implement;
5. verify;
6. commit;
7. push;
8. open a draft PR.

### HIGH

Examples:

- authentication or authorization;
- security-sensitive behavior;
- database schema changes;
- EF Core migrations;
- production configuration;
- secrets;
- destructive data operations;
- financial/business-rule semantic changes;
- deployment or migration procedures.

Agent authority:

1. inspect only;
2. produce a plan, risks, rollback considerations, and verification plan;
3. stop for explicit human approval before implementation.

High-risk production operations require separate explicit authorization.

Never perform a production migration or destructive production action merely because implementation is complete.

## Behavioral preservation

Existing tests and characterization tests are evidence of current behavior.

Do not opportunistically fix unrelated quirks during a refactor.

If a task is intended to preserve behavior:

- preserve payload shapes;
- preserve state transitions;
- preserve API contracts;
- preserve date semantics;
- preserve normalization behavior;
- preserve error behavior unless explicitly changed.

If existing behavior appears incorrect but is outside task scope, report it instead of silently changing it.

## Frontend verification

From `frontend/`, run:

```bash
npm test
npm run lint
npm run build
```

Or, when available:

```bash
npm run verify
```

Any new or changed behavior should have appropriate tests.

A refactor intended to preserve behavior should keep existing assertions unless the task explicitly authorizes semantic change.

## Backend verification

For backend-affecting changes, run the relevant restore/build/test commands.

At minimum, before publication of backend-affecting work, confirm the full backend test suite passes.

Do not create or apply EF Core migrations unless the issue explicitly authorizes a schema change.

## Dependencies

Do not add or upgrade dependencies unless needed for the task.

If a dependency change is required:

- explain why;
- identify alternatives considered;
- include lockfile changes;
- verify the resulting build.

## Secrets and configuration

Never commit:

- secrets;
- tokens;
- credentials;
- production connection strings;
- private keys.

Use existing environment/configuration mechanisms.

## Draft pull requests

Normal agent-created PRs should begin as draft PRs.

PRs should include:

- summary;
- issue reference;
- risk classification;
- important implementation details;
- verification performed;
- explicit scope boundaries;
- migration/API/dependency impact if applicable.

Do not merge pull requests.

Merge authority remains with the human repository owner after CI and independent review.

## Review and correction

Once a draft PR exists, the PR itself is the primary review artifact.

Do not create temporary review-packet files unless specifically requested.

If review identifies a problem:

1. make the smallest appropriate correction;
2. rerun affected verification;
3. push to the existing branch;
4. report what changed.

Do not hide or dismiss review findings.

## Scope control

If implementation requires work outside the authorized issue:

1. stop;
2. explain why;
3. propose the smallest scope adjustment.

Do not silently expand into adjacent roadmap work.
