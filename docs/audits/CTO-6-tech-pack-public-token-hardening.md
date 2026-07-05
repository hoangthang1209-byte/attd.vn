# CTO-6 Tech Pack Public Token Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-6 hardened Tech Pack public token/document/PDF surfaces by adding an explicit public serializer and applying the CTO-5 public-token payload guard. This sprint did not refactor the Tech Pack module, rename routes, rename Prisma models, redesign the Tech Pack PDF, or change admin-only Tech Pack behavior.

The pre-existing unstaged quote/manufacturing-evidence local work was not modified.

## Routes And Files Inspected

Public/token Tech Pack surfaces:

- `/tech-pack/:id/document?mode=pdf&pdfToken=...`
- `/api/tech-packs/:id/pdf`
- `src/app/(document)/tech-pack/[id]/document/page.tsx`
- `src/app/api/tech-packs/[id]/pdf/route.ts`
- `src/features/tech-pack/pdf/tech-pack-pdf-route.ts`
- `src/features/tech-pack/pdf/tech-pack-html-pdf.service.ts`
- `src/features/tech-pack/pdf/tech-pack-pdf.service.ts`
- `src/features/tech-pack/pdf/tech-pack-pdf.types.ts`
- `src/components/tech-pack/TechPackDocument.tsx`

Admin Tech Pack API routes were inspected as route families but not changed because they are not public token surfaces.

## Current Data Source And DTO Behavior

The admin PDF route `/api/tech-packs/:id/pdf` checks production/admin access, creates a PDF token, and renders `/tech-pack/:id/document?mode=pdf&pdfToken=...` through Chromium.

Before CTO-6, the document page built `TechPackPdfDto` directly from `buildTechPackPdfDto(pack, baseUrl)` and passed it to `TechPackDocument`. That DTO intentionally supported the internal production document layout and could include internal production fields.

## Unsafe Or Potentially Unsafe Fields

The public document DTO could include:

- internal production owner name;
- workshop/team value;
- internal production deadline;
- internal notes;
- production notes;
- QC notes;
- released-by staff identifier/name;
- supplier display data;
- supplier master-code fragments in BOM rows;
- asset notes that may contain staff-only context.

The shared public-token forbidden field list also continues to block exact forbidden keys such as `internalNote`, `internalNotes`, `costPrice`, `costEstimate`, `marginAmount`, `marginRate`, `pricingSnapshot`, `metadata`, and staff-only identifiers.

## Serializer Added

`src/features/tech-pack/public-tech-pack.serializer.ts` now exports:

- `serializePublicTechPack`
- `serializePublicTechPackForDocument`
- `serializePublicTechPackForPdf`

The serializer keeps the existing `TechPackPdfDto` shape for renderer compatibility while removing public-unsafe values:

- `releasedBy` -> `null`
- `general.productionOwner` -> `null`
- `general.workshop` -> `null`
- `general.internalDeadline` -> `null`
- `notes.qc` -> `null`
- `notes.production` -> `null`
- `notes.internal` -> `null`
- BOM `supplier` -> `null`
- supplier `NCC:` fragments removed from `masterCodes`
- asset `note` -> `null`

## Routes Protected In CTO-6

- `/tech-pack/:id/document?mode=pdf&pdfToken=...`

The document page now:

1. verifies the PDF token;
2. loads the Tech Pack detail;
3. builds the existing PDF DTO;
4. sanitizes it through `serializePublicTechPackForDocument`;
5. runs `assertPublicTokenSafePayload`;
6. renders only the sanitized DTO.

Because `/api/tech-packs/:id/pdf` renders that document page using a generated token, the generated public PDF path receives the same sanitized payload.

## Deferred Risks

- There is still no dedicated route-level integration test that calls the Tech Pack document route with a fixture pack and verifies rendered HTML omits internal labels/values.
- The Tech Pack public serializer currently preserves the existing DTO shape for visual compatibility; a future sprint can introduce a narrower public DTO and update the component labels if the business wants a customer-facing Tech Pack layout distinct from the internal production sheet.
- Admin Tech Pack APIs remain outside this public-token sprint and should be handled in permission hardening sprints.

## Test Command

Run:

```bash
npm run security:public-token
```

CTO-6 added Tech Pack-shaped checks for safe payloads, nested internal notes, BOM cost/margin fields, and metadata.
