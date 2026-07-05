# CTO-5 Public Token Data-Minimization Audit

Date: 2026-07-05
Status: Completed focused guardrail sprint

## Scope

CTO-5 inspected public-token and token-like document surfaces for quote, order document, and tech-pack PDF flows. This sprint added focused helper tests and minimal runtime assertions. It did not refactor quote/order business logic, rename routes, change Prisma models, redesign PDF output, or modify the pre-existing unstaged quote/manufacturing-evidence work.

## Public Routes Inspected

Quote public-token and short-link surfaces:

- `/quote-link/:quoteLink`
- `/q/:token`
- `/q/:token/document`
- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`

Order document token surfaces:

- `/o/:orderNo/:docType?mode=pdf&pdfToken=...`
- `/api/orders/:id/documents/:docType/pdf`
- `/api/orders/:id/documents/production-sheet/pdf`
- `/api/orders/:id/documents/delivery-note/pdf`

Tech-pack token surfaces:

- `/tech-pack/:id/document?mode=pdf&pdfToken=...`
- `/api/tech-packs/:id/pdf`

No separate `/api/quotes/public/:token/download` route exists; quote PDF download uses `/api/quotes/public/:token/pdf?disposition=attachment`.

## Routes Protected In CTO-5

- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`
- `/q/:token/document`
- `/o/:orderNo/:docType` when accessed through a valid `pdfToken`

These routes now call `assertPublicTokenSafePayload` before returning public JSON or rendering public-token document data. Unsafe payloads are logged server-side with forbidden field names and return a generic public error or `notFound()` for document pages.

## Routes Deferred

- `/quote-link/:quoteLink` delegates quote data loading to `/api/quotes/public/:token`, which is now protected.
- `/q/:token` is a legacy redirect and does not expose quote data.
- `/api/orders/:id/documents/*/pdf` routes mint document tokens and render via `/o/:orderNo/:docType`; the public document data is protected at the render surface.
- `/api/tech-packs/:id/pdf` and `/tech-pack/:id/document` need a dedicated tech-pack public serializer before helper enforcement. Current tech-pack PDF DTO includes internal production fields such as internal deadline and internal notes. This is a P1 public-token hardening risk.

## Forbidden Fields

The shared `PUBLIC_TOKEN_FORBIDDEN_FIELDS` list includes:

- `internalNote`
- `internalNotes`
- `costPrice`
- `costEstimate`
- `marginAmount`
- `marginRate`
- `manualOverrideReason`
- `pricingSnapshot`
- `inputSnapshot`
- `resultSnapshot`
- `metadata`
- `assignedToAdminUserId`
- `staffOnlyIdentifiers`
- `privateCustomerDetails`

CTO-5 made field matching case-insensitive.

## Test Command

Run:

```bash
npm run security:public-token
```

The dependency-free Node script mirrors the shared forbidden-field list and verifies:

- safe public quote payload passes;
- nested forbidden fields fail;
- arrays with forbidden fields fail;
- case-insensitive forbidden field matches fail;
- allowed public fields do not fail.

## Known Risks

- Public-token helper tests are focused unit checks, not full route integration tests.
- CTO-6 added a Tech Pack public serializer and applied the public-token guard to the Tech Pack document/PDF rendering surface. Route-level rendered-output tests are still recommended.
- Public quote JSON and PDF safety assertions depend on the existing quote public formatter remaining in the data path.
- Existing build warnings about deprecated `middleware` convention and Turbopack/NFT tracing are unchanged.

## Next Recommended Sprint

The next public-token sprint should add route-level tests that call public token handlers directly with fixture payloads and verify rendered Tech Pack HTML/PDF inputs omit internal labels and values.
