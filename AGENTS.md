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

## Project continuation and task resolution

Conversation memory, project summaries, and prior-chat context may provide
useful hints, but they are not authoritative for current execution state. Live
GitHub and repository state override them when they conflict.

When asked to **“Continue Budget Planner”** or **“Where are we?”**, reconstruct
current state before declaring current work, in this order:

1. current `main` and the latest merged repository state;
2. open pull requests;
3. open GitHub issues;
4. recent merged pull requests and their linked issues;
5. `ROADMAP.md` and other applicable canonical repository documents.

Then report what most recently completed, whether any work is currently active,
what roadmap or product decision is next to consider, and any unresolved
approval or cleanup state.

Never select a closed or merged issue as current work merely because prior
conversation context names it.

When asked to **“Work on the next task”**, resolve executable work in this order:

1. an explicitly attached or current GitHub issue;
2. an issue number explicitly named by the human;
3. durable GitHub or repository state that explicitly designates an active or
   next issue.

If none of those selects executable work, stop and enter product/planning mode
with the human instead of choosing a roadmap item autonomously. Product planning
and engineering execution remain distinct. `ROADMAP.md` is an engineering
roadmap, not a product backlog or automatic execution queue.

These continuation rules do not change existing risk approvals, verification
requirements, publication rules, production-operation authority, or human merge
authority.

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

## ChatGPT-to-Codex execution bridge

When `.github/workflows/codex-agent.yml` is configured and available, normal
repository audits, plans, implementations, and review corrections should use the
GitHub-native Codex bridge rather than having ChatGPT directly manufacture
application-code commits through raw repository file writes. Direct ChatGPT
writes remain appropriate for small GitHub administration and an explicitly
approved bootstrap/emergency exception.

The human and ChatGPT remain the product/engineering command center: discuss
product direction, select the task, record the GitHub Issue, resolve ambiguity,
and provide the approvals required by the risk gates above. Codex owns the
actual repository engineering execution after that authority is established.

Owner-authored bridge commands are:

- `/codex plan` — read-only engineering plan;
- `/codex audit` — read-only bounded audit;
- `/codex implement` — authorized implementation;
- `/codex fix` — bounded correction on an existing PR branch.

ChatGPT prepares the structured task packet and posts these commands; the human
should not need to copy prompts into an IDE during the normal workflow.

### Repository Context Pruning

`/codex plan` and `/codex audit` must use pruned context by default. A separate
trusted preparation step provides Codex only:

- a lightweight tracked-path and symbol map;
- the exact targeted raw files selected from the approved UX/scope discussion;
- the allowed canonical authority documents; and
- the fixed task packet/prompt wrapper.

Codex must not silently fall back to a full-repository raw read. If the supplied
context cannot resolve a concrete dependency, contract, call path, test
boundary, security rule, or financial invariant, stop and request the smallest
specific path/symbol expansion and explain why it is needed.

Implementation and fix runs have a real checkout so they can compile and test,
but they still start from the structural map, targeted files, and approved plan
where applicable. Additional reads should be limited to concrete discovered
dependencies and recorded in the final report. Changed paths are mechanically
restricted by the task packet.

### Approval, publication, and review separation

For MEDIUM/HIGH implementation, the human approval marker must be bound to the
exact Codex read-only result and base commit. A changed plan or stale base is not
a valid approval. LOW work may proceed under the LOW authority above once the
task is explicitly selected.

Ordinary review corrections on an already approved PR do not require a second
product-risk approval when they stay within the original issue and bounded
review finding. Scope-expanding corrections must return to normal planning and
approval instead of using `/codex fix` as an authority bypass.

Codex execution receives no GitHub publication credential. A separate fresh
publication job applies the accepted patch, revalidates the allowed paths and
base/PR state, and creates or updates a draft PR using the dedicated
least-privilege publisher GitHub App. Codex may never merge, push to `main`, or
perform a production operation.

Codex's own test results are development evidence only. Existing applicable
Frontend, Backend, PostgreSQL, Vercel, and Codex bridge policy CI remain the
independent proof layer. After those checks succeed, ChatGPT reviews the actual
PR/diff and CI evidence. The human repository owner remains the sole merge
authority.
