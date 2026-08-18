# Sunflower PDF Import Threat Model

## Status and authority

This document records the approved security and privacy boundary for the first Budget Planner bank-statement import capability. It governs future work that accepts or parses user-provided Sunflower Bank PDF statements.

The initial import scope is intentionally narrow: authenticated Budget Planner users may submit **Sunflower Bank text-extractable PDF statements** for bounded text extraction and later review. This document does not make statement import current executable behavior and does not authorize a production operation.

Changes that broaden supported document types, retention, rendering, OCR, active-content handling, resource limits, or sensitive-data exposure require a new explicit human review and approval.

## Security objectives

The import boundary must:

- treat every uploaded PDF as untrusted input;
- keep statement data scoped to the authenticated Budget Planner user;
- prevent document content from executing code or initiating external actions;
- bound CPU, memory, time, pages, text, rows, and concurrency;
- avoid retaining the original financial document;
- avoid leaking financial or identifying information through logs or errors;
- fail closed without partial financial persistence when parsing or validation fails; and
- keep format-specific parsing separate from approved financial-domain semantics.

## Supported input

V1 supports only Sunflower Bank statements that contain extractable text.

The import implementation must:

1. require an authenticated Budget Planner user;
2. accept only PDF input within the approved resource limits;
3. reject scanned or image-only PDFs rather than introducing OCR;
4. reject encrypted or password-protected PDFs;
5. reject corrupted or structurally invalid PDFs;
6. reject statements that cannot be identified as the supported Sunflower format with controlled errors; and
7. validate actual PDF structure and bounded parse success rather than trusting only the filename extension or browser-supplied MIME type.

A `.pdf` filename or `application/pdf` request header is not sufficient proof that a file is an acceptable PDF.

## Resource boundaries

The initial hard limits are:

- maximum upload size: **10 MiB**;
- maximum PDF pages: **25**;
- maximum extracted text: **2,000,000 characters**;
- maximum candidate transaction rows: **1,000**;
- maximum parse/extraction wall-clock time: **10 seconds**, with cancellation;
- maximum active parses per authenticated user: **1**; and
- a small explicitly configured global parse-concurrency cap appropriate to the deployed Render instance.

Implementations must enforce limits as early as practical and stop processing promptly once a limit or cancellation condition is reached. Later changes to these limits require evidence from sanitized fixtures or production-safe operational data and explicit approval rather than silent relaxation.

## Active and embedded content

The V1 import path is **text extraction only**. It does not render PDFs and must never execute, open, follow, or invoke document-provided active content, including:

- JavaScript or PDF actions;
- embedded files or attachments;
- launch actions;
- hyperlinks or external references;
- forms or other interactive behavior; or
- network requests derived from document content.

URLs or action-like text found in a statement are inert input data. No browser, shell, external viewer, or network client should be invoked because of content inside the uploaded document.

## Raw-document handling and retention

Original PDF bytes must not be persisted to:

- PostgreSQL;
- object or blob storage;
- application logs;
- analytics or telemetry payloads; or
- long-lived application filesystem storage.

Prefer bounded stream or in-memory processing.

If a future approved parser technically requires a temporary file, the implementation must use an internally generated filename in operating-system temporary storage with restrictive access, never use the user-supplied name as a filesystem path, and delete the temporary file in a `finally`-equivalent cleanup path.

Future F2 work may define persistence for normalized preview/import state. That does not authorize retaining the raw statement.

## Sensitive logging and telemetry

Never log or emit telemetry containing:

- raw PDF bytes;
- extracted statement text;
- account or routing numbers;
- balances;
- transaction amounts;
- transaction descriptions or merchant text;
- customer names, addresses, or other statement PII;
- a user-supplied filename when it may itself contain personal information; or
- parser stack traces or parser-internal details in client responses.

Operational logging may include only safe metadata needed for diagnosis, such as correlation/request identifier, generic import error code, uploaded byte count, page count, elapsed parse time, and aggregate candidate/accepted/rejected row counts when those concepts exist.

Safe metadata must not be combined in a way that reconstructs sensitive statement content.

## Failure and error behavior

Malformed, encrypted, unsupported, image-only, cancelled, timed-out, or resource-limit-exceeding files must fail closed.

A failed parse must not partially persist financial transactions. Client errors should be stable and useful enough for the UI to explain what the user can do next, while omitting extracted content, parser internals, filesystem details, and sensitive statement data.

Cancellation and timeout paths must stop parser work promptly and release any held resources or temporary files.

## Parser dependency posture

Parser-library selection is not authorized by this document. A later implementation issue must select a maintained .NET PDF text-extraction library and review its license, maintenance posture, security history, API behavior, and compatibility with these non-execution and resource-boundary requirements.

Do not introduce antivirus infrastructure for the initial text-only, non-retained scope unless implementation evidence demonstrates a concrete need. If future work stores, renders, transforms, shares, or broadens the accepted file types, re-evaluate that decision as part of a new threat-model review.

## Verification requirements for implementation

Later implementation work must use privacy-safe fixtures. No real customer statement or identifying financial information may be committed to the repository as a test fixture.

Security-focused verification must cover at least:

- a valid sanitized Sunflower text PDF;
- extension/MIME mismatch;
- invalid PDF signature or structure;
- truncated or corrupted PDF;
- encrypted/password-protected PDF;
- image-only or otherwise unsupported PDF;
- upload-size limit;
- page-count limit;
- extracted-text limit;
- candidate-row limit;
- timeout and cancellation;
- embedded links/actions/attachments remaining inert;
- authentication and cross-user isolation;
- no financial persistence after parse failure; and
- absence of sensitive statement data from logs and client error responses.

The applicable independent repository CI remains required in addition to any Codex/development-time verification.

## Relationship to financial semantics

This threat model governs the document trust boundary, not transaction meaning. Imported data must still obey [`financial-domain-invariants.md`](financial-domain-invariants.md) before it can be persisted as expenses.

In particular, deposits, income, refunds, credits, transfers, card payments, and other non-expense movements must not be forced into the positive-expense model. Classification, duplicate handling, provenance, preview/confirmation, batch behavior, source-account semantics, and date-only persistence remain separate F2/A5 or later decisions.

## Re-evaluation triggers

Revisit this threat model before any change that introduces:

- OCR or support for image-only/scanned statements;
- another bank or non-PDF statement format;
- raw statement retention or archival;
- PDF rendering, preview rendering, transformation, or sharing;
- embedded-file extraction;
- external/network processing of document content;
- materially higher resource or concurrency limits; or
- a new parser architecture whose trust or isolation properties differ from the approved V1 boundary.

If a later implementation cannot satisfy this document, the safe fallback is to keep the upload/import capability disabled or reject the unsupported input. Do not silently weaken the boundary.

## Non-goals

This document does not define or implement:

- the upload endpoint or frontend upload UI;
- a PDF parser library;
- transaction classification or merchant extraction;
- deposits or income semantics;
- transfer, card-payment, refund, or reversal rules;
- duplicate fingerprints or idempotency;
- preview and confirmation lifecycle;
- batch atomicity or partial-commit policy;
- source-account modeling;
- A5 date/month/category migration work; or
- raw-statement archival.

Those require their own scoped issues and approvals under `AGENTS.md` and `ROADMAP.md`.
