# Budget Planner Architecture

## Purpose

This document describes the durable current architecture and its boundaries.
[`AGENTS.md`](AGENTS.md) governs how agents work, [`ROADMAP.md`](ROADMAP.md)
governs engineering sequencing, and
[`docs/financial-domain-invariants.md`](docs/financial-domain-invariants.md)
governs approved financial semantics.

## Current architecture

Budget Planner is a modular monolith with three deployable persistence/runtime
parts:

- a React 19 and Vite frontend;
- an ASP.NET Core 9 Web API; and
- a PostgreSQL database accessed through Entity Framework Core.

The browser calls the API over HTTP. The API owns authentication,
authorization, business-boundary enforcement, and persistence access. The
frontend does not connect directly to the database.

### Frontend

`frontend/src/app/` owns routing, the authenticated application shell, and
top-level pages. Product behavior is organized under `frontend/src/features/`
by capability, including authentication, expenses, budget limits, analytics,
and transactions. Shared HTTP, constants, theme, UI, and utilities live under
`frontend/src/shared/`; chart-specific presentation lives under
`frontend/src/charts/`.

Feature UI and hooks depend on feature or shared API modules. Shared modules
must not depend on feature-specific UI. The Axios client is the common API
transport and attaches the current bearer token to requests.

### Backend

`backend/Program.cs` is the composition root. It configures controllers,
PostgreSQL EF Core persistence, ASP.NET Core Identity, JWT bearer
authentication, Data Protection key persistence, CORS, and application
services.

Controllers under `backend/Controllers/` are the HTTP boundary. Authentication
and email concerns have supporting components under `backend/Authentication/`,
`backend/Configuration/`, and `backend/Services/`. `backend/Data/` owns the EF
Core context and design-time database configuration; `backend/Models/` contains
the current persistence and Identity models; `backend/Migrations/` contains the
schema history.

The intended dependency direction is HTTP boundary to application/service and
persistence concerns, with database access remaining behind the API. Keep this
structure appropriately simple; new layers require a demonstrated need.

### Authentication and ownership boundaries

ASP.NET Core Identity manages users, JWT bearer authentication establishes the
request identity, and protected controllers authorize access. Financial data
ownership comes from the authenticated identity, not from a client-selected
user. Cross-user isolation is a mandatory backend responsibility.

Approved financial meaning and future authoritative validation destinations
are defined in
[`docs/financial-domain-invariants.md`](docs/financial-domain-invariants.md).
That document may describe approved targets that the current API or schema has
not implemented yet.

### Persistence and migrations

PostgreSQL is the application persistence provider. The database stores
Identity data, expenses, budget limits, and the ASP.NET Core Data Protection key
ring. Normal application startup does not apply migrations. Production
migrations remain a separate, deliberate, human-authorized operation described
in [`README.md`](README.md).

### Deployment topology

The frontend is deployed to Vercel, the containerized backend to Render, and
PostgreSQL to Neon. These are separate deployment boundaries. Repository CI
builds and tests source changes but does not authorize production changes or
apply production migrations.

## Approved and planned extension points

Sunflower statement import is a planned future capability, not current
architecture. Its approved untrusted-document security and privacy boundary is
defined in [`docs/import-threat-model.md`](docs/import-threat-model.md). Later
approved F2 roadmap work may add an import boundary that parses untrusted
statement input, normalizes it into reviewed domain data, and persists accepted
transactions through the authoritative backend financial write boundary. Its
pipeline, provenance, idempotency, review workflow, and persistence design
remain future approved work.

Likewise, approved target representations such as date-only financial semantics
remain future roadmap work until their implementation issues are separately
approved and completed.

## Architecture non-goals

- Microservices or distributed orchestration without a demonstrated need.
- Direct browser access to PostgreSQL or production infrastructure.
- Client-controlled financial ownership or authoritative client-only
  validation.
- Applying migrations during normal application startup.
- Treating roadmap targets as already implemented behavior.
- New abstractions, services, or dependencies solely to make the architecture
  appear more elaborate.
