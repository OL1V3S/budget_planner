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

## Canonical repository knowledge

Use this file as the concise operational entry point, then read only the
sources relevant to the task:

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — current system boundaries, module organization,
  dependency direction, and planned extension points;
- [`ROADMAP.md`](ROADMAP.md) — engineering priorities, sequencing, and dependencies;
- [`docs/financial-domain-invariants.md`](docs/financial-domain-invariants.md) — approved financial semantics and
  decisions that require explicit human approval to change;
- [`docs/verification.md`](docs/verification.md) — canonical commands, required evidence, environment
  fallbacks, and review-ready criteria;
- the applicable GitHub Issue — task-specific scope and acceptance criteria.

Do not treat planned roadmap behavior as current architecture or executable
behavior.

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

### Post-merge branch lifecycle

Review corrections stay on the existing feature/PR branch until merge. Keep a
feature branch until GitHub confirms that its PR is merged and the associated
work is complete.

After that confirmation, delete the merged remote feature branch when the
current environment and tooling permit the target and merge state to be
verified safely. Never delete `main`, the default branch, a protected branch, a
branch with an open or unmerged PR, or a branch containing unmerged work.
Prefer remote cleanup after merge; local stale branches may be removed later
when local Git tooling is available.

If deletion cannot be performed or verified safely, do not guess and do not
block the already-approved merge. Report that remote branch cleanup remains
required. Human merge authority remains unchanged.

### General safety

Do not modify unrelated files.

Do not use destructive git operations unless explicitly authorized.

Prefer exact-path staging over `git add .` or `git add -A`.

### Implementation and publication capabilities

Treat local implementation capability and GitHub publication capability as
separate concerns.

Before editing, establish the branch and worktree state safely. If local Git or
an equivalent repository tool cannot establish that state, stop and report the
missing evidence. Do not edit based on a guessed branch or worktree state.

When implementation is authorized and safe local Git operations are available,
missing GitHub CLI (`gh`) alone does not block implementation. The agent may
create the approved feature branch, edit, run available verification, inspect
the diff, and create an intentional local commit.

Push and draft-PR creation require working publication tooling and
authentication. If either cannot be completed, stop at the safest durable local
state, normally a clean local commit, and report **publication handoff
required**. Include the branch, commit SHA, changed files, verification that
passed or was unavailable, and the exact remaining publication steps. The human
repository owner may publish the branch with GitHub Desktop and open the draft
PR through GitHub Desktop or the GitHub web interface.

Never claim that a push, PR, or CI result exists unless it has been verified.
Publication handoff does not weaken the requirement for a draft PR, successful
required CI, independent review, or human merge authority.

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

At minimum, before a backend-affecting PR is review-ready, confirm the full
applicable backend test suite passes locally or through required CI evidence.

Do not create or apply EF Core migrations unless the issue explicitly authorizes a schema change.

## Verification evidence and environment capabilities

Follow `docs/verification.md`. At the start of work, determine which required
tools and local services are actually available. Report each relevant result
as passed locally, not run locally because a capability is unavailable, or
required/proven by CI. Never report unavailable verification as passed.

A draft PR may be published with disclosed local verification gaps when the
risk workflow permits it. It is not review-ready until all required executable
CI evidence has succeeded and remaining gaps are disclosed.

Do not use Neon, Render, production, or another hosted database as a substitute
for unavailable local PostgreSQL test infrastructure. Use the repository's
PostgreSQL CI lane.

## Harness improvement

When an agent failure reveals a recurring or important weakness, prefer the
smallest appropriate durable harness improvement over indefinite prompt
reminders, in this order:

1. mechanical prevention or check when practical;
2. automated verification or test;
3. durable repository instruction;
4. one-off prompt reminder only for genuinely task-specific concerns.

Do not add automation solely to satisfy this principle. The existing
PostgreSQL integration-test guard, which rejects remote and non-disposable
database targets, is an example of mechanical prevention.

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
