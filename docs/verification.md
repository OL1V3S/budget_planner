# Verification Contract

## Purpose

This document is the canonical source for proving repository changes correct.
Required evidence depends on the files and behavior changed, not merely on
which commands happen to be available locally.

Record verification using these exact evidence states:

- **Passed locally** — the command ran successfully in the current workspace.
- **Not run locally — capability unavailable** — the required tool or service
  was unavailable; this is a disclosed evidence gap, not a pass.
- **Required/proven by CI** — name the required GitHub Actions job and record
  its result when known.

Focused checks support iteration. They do not replace the full applicable
verification required before a pull request is review-ready.

## Frontend verification

The canonical frontend entry point is:

```bash
cd frontend
npm ci
npm run verify
```

`npm run verify` runs the Vitest suite, ESLint, and the Vite production build.
After dependencies are already installed and unchanged, `npm ci` need not be
repeated for every iteration.

Focused tests may be run during development, for example:

```bash
cd frontend
npm test -- src/path/to/changed.test.jsx
```

Before review-ready status, frontend changes require the complete
`npm run verify` result and successful **Frontend test, lint, and build** CI
evidence.

## Backend verification

Run the same non-PostgreSQL verification represented by Backend CI:

```bash
dotnet restore backend.Tests/backend.Tests.csproj
dotnet build backend/backend.csproj --configuration Release --no-restore
dotnet test backend.Tests/backend.Tests.csproj --configuration Release --no-restore --filter "Category!=PostgreSQL"
```

Focused `dotnet test` filters may be used while iterating. Before review-ready
status, backend changes require the applicable full suite and successful
**Backend build and tests** CI evidence.

## PostgreSQL integration verification

Changes affecting EF Core mappings, migrations, financial persistence,
relational queries, constraints, precision, timestamps, indexes, transactions,
or concurrency also require the PostgreSQL lane.

Local execution requires PostgreSQL and an isolated disposable local database.
Set `BUDGETPLANNER_POSTGRESQL_TEST_CONNECTION` to a connection using
`localhost`, `127.0.0.1`, or `::1`, with database `budget_planner_ci` or a name
beginning with `budget_planner_test_`. The tests deliberately delete and
recreate that database.

```bash
dotnet restore backend.Tests/backend.Tests.csproj
dotnet build backend.Tests/backend.Tests.csproj --configuration Release --no-restore
dotnet test backend.Tests/backend.Tests.csproj --configuration Release --no-build --filter "Category=PostgreSQL&FullyQualifiedName~Migration_chain"
dotnet test backend.Tests/backend.Tests.csproj --configuration Release --no-build --filter "Category=PostgreSQL&FullyQualifiedName!~Migration_chain"
```

The test harness mechanically rejects remote hosts and database names not
explicitly designated as disposable. Never substitute Neon, Render,
production, or another hosted database when local PostgreSQL is unavailable.
Use successful **PostgreSQL financial integration** CI evidence instead.

## Documentation-only changes

For changes limited to documentation or repository instructions:

- inspect every changed file and the complete diff;
- confirm referenced repository paths and relative Markdown links exist;
- verify commands and CI job names against the current executable definitions;
- run `git diff --check` when Git is available; and
- allow the repository's normal pull-request CI to detect unintended effects.

Documentation-only work does not require inventing runtime tests. If normal CI
runs for the PR, its required jobs must still succeed before review-ready
status.

## Restricted workstation fallback

At the beginning of work, distinguish three capability groups:

- **Implementation capability** — safely inspect the branch and worktree, edit,
  review the diff, and create a local commit.
- **Publication capability** — push the branch and create a draft pull request.
- **Executable verification capability** — run npm/Node.js, the .NET SDK, and a
  disposable local PostgreSQL database when relevant.

Missing one capability does not prove that another is missing.

- If npm is unavailable, report frontend verification as **Not run locally —
  capability unavailable** and require Frontend CI when relevant.
- If .NET is unavailable, report backend verification the same way and require
  Backend CI when relevant.
- If local PostgreSQL is unavailable, report it and require the PostgreSQL CI
  lane; do not use a hosted or production substitute.
- If Git CLI is unavailable, do not claim local branch, worktree, diff, or
  `git diff --check` evidence. Use GitHub Desktop or connected GitHub evidence
  where it can establish the fact, and disclose anything still unverified.
- If `gh` is unavailable but safe local Git operations work, implementation may
  continue after the applicable risk approval. Missing `gh` alone is not an
  implementation blocker.
- If push authentication or draft-PR tooling is unavailable, create a clean
  local commit when authorized and report **publication handoff required**.
  Include the branch, commit SHA, changed files, verification evidence and
  gaps, and the remaining human steps. GitHub Desktop may publish the branch;
  GitHub Desktop or the GitHub web interface may then open the draft PR.

The supported split workflow is:

```text
agent implementation + clean local commit
-> human GitHub Desktop/web publication
-> required CI evidence
-> independent review
-> human merge
```

A local commit is durable implementation evidence. It is not evidence that the
branch was pushed, a PR exists, or CI ran. Never fabricate those states.

A draft PR may be published with disclosed local gaps when `AGENTS.md` permits
it. Missing local tools do not weaken the verification requirement and must
never be recorded as a pass.

## Codex bridge evidence

When `.github/workflows/codex-agent.yml` is active, distinguish Codex worker
evidence from the repository's independent proof layer.

For `/codex plan` and `/codex audit`:

- a separate context-preparation job generates a structural repository map and
  copies only the exact targeted files plus allowed canonical authority docs;
- the Codex job receives only that pruned artifact, not a full repository
  checkout;
- insufficient context must produce a bounded context-expansion request rather
  than an unreported broad read; and
- a MEDIUM/HIGH implementation approval is bound to the exact read-only result,
  governing issue, and base commit before write-mode execution may start.

For `/codex implement` and `/codex fix`:

- Codex may run focused/full checks in its isolated worker, but those results are
  development evidence only;
- Codex receives no publication GitHub App token and its checkout has no
  persisted GitHub credential;
- exact allowed write paths are mechanically checked before a patch is accepted;
- the publication job runs separately without `OPENAI_API_KEY`, revalidates the
  base/PR state, applies the patch, runs `git diff --check`, and publishes only
  to the intended feature or existing PR branch; and
- ordinary review fixes stay on the existing PR branch and remain bounded to the
  review finding. Scope-expanding corrections return to normal planning and
  approval.

The draft PR then requires the same applicable **Frontend test, lint, and
build**, **Backend build and tests**, **PostgreSQL financial integration**, and
Vercel evidence as any other change. Codex saying that tests passed is never a
replacement for those independent checks.

The bridge also has its own **Codex bridge policy tests** PR check for task
packet parsing, approval binding, write-path enforcement, helper compilation,
repository-map generation, and workflow YAML syntax.

One-time repository configuration for the bridge uses these names:

- Actions secret `OPENAI_API_KEY` — a dedicated OpenAI API credential;
- repository variable `CODEX_PUBLISHER_CLIENT_ID` — client ID of the dedicated
  publisher GitHub App; and
- Actions secret `CODEX_PUBLISHER_PRIVATE_KEY` — private key for that App.

The publisher GitHub App should be installed only on this repository and grant
only **Contents: write** and **Pull requests: write** beyond GitHub's required
metadata access. It must not receive Actions/workflow administration, secrets,
deployments, environments, or production credentials. Secret values must never
be pasted into ChatGPT, issues, pull requests, or repository files.

## Full review-ready criteria

A draft PR is review-ready only when:

- the verification appropriate to the changed scope is identified;
- every local result and unavailable capability is reported accurately;
- all required Frontend CI, Backend CI, and PostgreSQL CI jobs have succeeded;
- remaining verification gaps are disclosed;
- the complete diff has been inspected for scope and unintended changes; and
- MEDIUM/HIGH approvals and all other `AGENTS.md` gates are satisfied.

Human review and merge authority remain unchanged.
