# Synthetic Sunflower import fixtures

These fixtures are test-only inputs for the planned Sunflower Bank PDF import path.

## Privacy and provenance

The corpus is entirely synthetic. It must never contain a real customer statement, copied account details, names, addresses, balances, transaction history, merchant history, dates, amounts, or other identifying financial information.

A privately inspected statement informed only generic structural observations for the initial V1 shape: text-extractable PDF pages, `Deposits`, `Electronic Transactions`, transaction continuation across a page boundary, debit/credit source formatting, and unrelated balance/disclosure pages. The private statement is not a golden file and must not be committed, attached to GitHub, stored as a CI artifact, or copied into logs/comments.

Future real statements may be inspected privately to discover layout variants, but any resulting regression case must be reconstructed with invented data before it enters this directory.

## Fixture layers

`SunflowerFixtureCorpus` defines the human-readable representative statement shape and scenario metadata. `SyntheticPdfBuilder` turns those definitions into deterministic, text-extractable PDF bytes in memory without adding a production PDF dependency. Rebuilding the same corpus should produce identical bytes so later idempotency tests can reuse it as an exact-document duplicate.

`SunflowerAdversarialFixtures` provides small malformed/unsupported inputs plus parameterized page-count, candidate-row-count, and text-volume generators. Limit tests should generate large-enough inputs at test time rather than checking oversized binary fixtures into the repository.

## Expected financial semantics

Fixture metadata follows the approved current single-checking-account model:

- every supported valid debit is an `expense_candidate`;
- known deposits/credits are `non_expense`;
- `needs_review` is reserved for source-parsing uncertainty, not for deciding whether a valid debit is economically "true spending".

These files do not implement or prove parser behavior. Parser extraction/classification assertions belong in the later parser implementation issue.

## Intentionally deferred F1 cases

The following threat-model cases remain required, but are intentionally deferred until the production parser library and its exact PDF capabilities are selected:

- encrypted/password-protected PDFs;
- standards-valid image-only/scanned PDFs;
- PDFs containing embedded actions, links, attachments, or other active-content structures used to prove they remain inert;
- timeout/cancellation behavior tied to the actual parser execution path.

Deferral here does not weaken `docs/import-threat-model.md`; it avoids prematurely choosing or depending on a parser library solely to manufacture fixtures.
