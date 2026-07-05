# CTO-7F Manufacturing / Tech Pack Mutation Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-7F applied the CTO-4 `requireAdminPermission()` pattern to Manufacturing Platform and Tech Pack Platform admin mutation routes without changing business logic, Prisma models, route names, UI, public frontend behavior, revenue-launch frontend work, or Content Platform routes.

The guard remains transitional per `docs/security/permission-guard-foundation.md`: unauthenticated requests receive normalized permission errors, owner-like super admin sessions pass, and authenticated admin/staff sessions pass until later action-level permission enforcement lands.

Existing domain-specific checks remain after the guard where present (`requireProductionView`, `requireProductionUpdate`, `can(manufacturingAsset.*)`, etc.).

## Manufacturing Route Files Inspected

44 route files were inspected under Manufacturing ownership boundaries:

- `src/app/api/materials/route.ts`
- `src/app/api/materials/[id]/route.ts`
- `src/app/api/materials/[id]/stock-adjustments/route.ts`
- `src/app/api/materials/[id]/suppliers/route.ts`
- `src/app/api/materials/[id]/suppliers/[linkId]/route.ts`
- `src/app/api/materials/[id]/warehouse-history/route.ts`
- `src/app/api/material-suppliers/route.ts`
- `src/app/api/material-suppliers/[id]/route.ts`
- `src/app/api/material-suppliers/[id]/materials/route.ts`
- `src/app/api/production-materials/route.ts`
- `src/app/api/production-materials/[id]/route.ts`
- `src/app/api/production-materials/import/route.ts`
- `src/app/api/production-materials/export/route.ts`
- `src/app/api/production-suppliers/route.ts`
- `src/app/api/production-suppliers/[id]/route.ts`
- `src/app/api/production-suppliers/[id]/merge/route.ts`
- `src/app/api/production-suppliers/import/route.ts`
- `src/app/api/production-suppliers/export/route.ts`
- `src/app/api/production-trims/route.ts`
- `src/app/api/production-trims/[id]/route.ts`
- `src/app/api/production-trims/import/route.ts`
- `src/app/api/production-trims/export/route.ts`
- `src/app/api/print-methods/route.ts`
- `src/app/api/print-methods/[id]/route.ts`
- `src/app/api/print-methods/import/route.ts`
- `src/app/api/print-methods/export/route.ts`
- `src/app/api/purchase-requests/route.ts`
- `src/app/api/purchase-requests/[id]/route.ts`
- `src/app/api/purchase-requests/[id]/status/route.ts`
- `src/app/api/purchase-requests/[id]/receive/route.ts`
- `src/app/api/production/plans/route.ts`
- `src/app/api/production/plans/[orderItemId]/route.ts`
- `src/app/api/production-files/upload-session/route.ts`
- `src/app/api/production-files/upload-complete/route.ts`
- `src/app/api/production-files/[id]/download/route.ts`
- `src/app/api/production-files/[id]/open/route.ts`
- `src/app/api/production-files/status/route.ts`
- `src/app/api/admin/manufacturing-library/route.ts`
- `src/app/api/admin/manufacturing-library/[id]/route.ts`
- `src/app/api/admin/manufacturing-library/categories/route.ts`
- `src/app/api/admin/manufacturing-library/categories/[id]/route.ts`
- `src/app/api/admin/manufacturing-library/display-locations/route.ts`
- `src/app/api/admin/manufacturing-library/display-locations/[id]/route.ts`
- `src/app/api/admin/manufacturing-library/workflows/route.ts`
- `src/app/api/admin/manufacturing-library/workflows/[id]/route.ts`
- `src/app/api/admin/manufacturing-library/lookups/route.ts`

## Tech Pack Route Files Inspected

27 route files were inspected under Tech Pack ownership boundaries:

- `src/app/api/tech-packs/route.ts`
- `src/app/api/tech-packs/[id]/route.ts`
- `src/app/api/tech-packs/[id]/apply-measurement-template/route.ts`
- `src/app/api/tech-packs/[id]/artwork-placements/route.ts`
- `src/app/api/tech-packs/[id]/assets/route.ts`
- `src/app/api/tech-packs/[id]/assets/[assetId]/route.ts`
- `src/app/api/tech-packs/[id]/assets/[assetId]/download/route.ts`
- `src/app/api/tech-packs/[id]/attach-pattern/route.ts`
- `src/app/api/tech-packs/[id]/bom/route.ts`
- `src/app/api/tech-packs/[id]/diff/route.ts`
- `src/app/api/tech-packs/[id]/new-version/route.ts`
- `src/app/api/tech-packs/[id]/pdf/route.ts`
- `src/app/api/tech-packs/[id]/publish/route.ts`
- `src/app/api/tech-packs/[id]/release/route.ts`
- `src/app/api/tech-packs/[id]/release-history/route.ts`
- `src/app/api/tech-packs/[id]/release-readiness/route.ts`
- `src/app/api/tech-packs/[id]/select-pattern/route.ts`
- `src/app/api/tech-packs/item-links/route.ts`
- `src/app/api/tech-packs/source-items/route.ts`
- `src/app/api/patterns/route.ts`
- `src/app/api/patterns/[id]/route.ts`
- `src/app/api/patterns/[id]/apply-measurement-template/route.ts`
- `src/app/api/patterns/[id]/approve/route.ts`
- `src/app/api/patterns/[id]/archive/route.ts`
- `src/app/api/patterns/[id]/copy-from-tech-pack/route.ts`
- `src/app/api/patterns/[id]/files/route.ts`
- `src/app/api/patterns/[id]/files/[fileId]/route.ts`
- `src/app/api/patterns/[id]/files/[fileId]/download/route.ts`
- `src/app/api/patterns/[id]/new-version/route.ts`
- `src/app/api/measurement-templates/route.ts`
- `src/app/api/measurement-templates/[id]/route.ts`
- `src/app/api/measurement-templates/[id]/duplicate/route.ts`

## Routes Updated

40 Manufacturing route files and 25 Tech Pack route files now call `requireAdminPermission()` on mutation handlers (and Manufacturing/Tech Pack export GET handlers where applicable). **76 mutation/export methods** were guarded in this sprint.

### Manufacturing examples

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/materials` | `POST` | `manufacturing/create` |
| `/api/materials/:id` | `PATCH` | `manufacturing/update` |
| `/api/materials/:id/stock-adjustments` | `POST` | `manufacturing/create` |
| `/api/materials/:id/suppliers` | `POST` | `manufacturing/create` |
| `/api/materials/:id/suppliers/:linkId` | `PATCH`, `DELETE` | `manufacturing/update`, `manufacturing/delete` |
| `/api/material-suppliers` | `POST` | `manufacturing/create` |
| `/api/material-suppliers/:id` | `PATCH` | `manufacturing/update` |
| `/api/production-materials` | `POST` | `manufacturing/create` |
| `/api/production-materials/:id` | `PATCH`, `DELETE` | `manufacturing/update`, `manufacturing/delete` |
| `/api/production-materials/import` | `POST` | `manufacturing/admin` |
| `/api/production-materials/export` | `GET` | `manufacturing/export` |
| `/api/production-suppliers/:id/merge` | `POST` | `manufacturing/admin` |
| `/api/purchase-requests` | `POST` | `manufacturing/create` |
| `/api/purchase-requests/:id/status` | `POST` | `manufacturing/update` |
| `/api/production/plans` | `POST` | `manufacturing/create` |
| `/api/production-files/upload-session` | `POST` | `manufacturing/create` |
| `/api/admin/manufacturing-library` | `POST` | `manufacturing/create` |
| `/api/admin/manufacturing-library/:id` | `PATCH`, `DELETE` | `manufacturing/update`, `manufacturing/delete` |

### Tech Pack examples

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/tech-packs` | `POST` | `tech-pack/create` |
| `/api/tech-packs/:id` | `PATCH` | `tech-pack/update` |
| `/api/tech-packs/:id/bom` | `PUT` | `tech-pack/update` |
| `/api/tech-packs/:id/publish` | `POST` | `tech-pack/approve` |
| `/api/tech-packs/:id/release` | `POST` | `tech-pack/approve` |
| `/api/tech-packs/:id/new-version` | `POST` | `tech-pack/create` |
| `/api/tech-packs/:id/pdf` | `GET` | `tech-pack/export` |
| `/api/patterns/:id/approve` | `POST` | `tech-pack/approve` |
| `/api/patterns/:id/archive` | `POST` | `tech-pack/delete` |
| `/api/measurement-templates/:id/duplicate` | `POST` | `tech-pack/create` |

## Routes Intentionally Deferred

### Already covered in CTO-7C Commercial

- `/api/orders/:id/production` and related production-stage/file mutations
- `/api/orders/:id/qc` and QC evidence mutations
- `/api/orders/:id/materials` and material allocation mutations
- `/api/orders/:id/purchase-request` (order-scoped commercial workflow)
- `/api/orders/:id/documents/production-sheet/pdf`

### Public token / document surfaces (CTO-6)

- `/tech-pack/:id/document?mode=pdf&pdfToken=...` public document page
- Public quote/order token routes

### Read-only or follow-up export hardening

- `/api/production-files/:id/download` and `/api/production-files/:id/open` GET redirects (session-scoped file access service; export guard deferred)
- `/api/tech-packs/:id/assets/:assetId/download` GET (admin asset download; deferred to read/export sprint)
- `/api/patterns/:id/files/:fileId/download` GET (deferred)
- Manufacturing/Tech Pack GET list/detail routes outside mutation scope

### Product Platform overlap

- `/api/admin/products/:id/materials*` (guarded in CTO-7A Product)

## Guard / Action Mapping

| Operation class | Platform | Action |
| --- | --- | --- |
| create material/supplier/asset/process/purchase/plan/upload | `manufacturing` | `create` |
| update material/supplier/link/status/plan | `manufacturing` | `update` |
| delete/archive manufacturing library entities | `manufacturing` | `delete` |
| import/merge/bootstrap | `manufacturing` | `admin` |
| CSV export | `manufacturing` | `export` |
| create tech pack/pattern/template/version/BOM/asset | `tech-pack` | `create` |
| update tech pack/pattern/measurements/BOM/artwork | `tech-pack` | `update` |
| archive pattern | `tech-pack` | `delete` |
| approve/release/publish pattern or tech pack | `tech-pack` | `approve` |
| admin PDF/export | `tech-pack` | `export` |

Registry key used: `tech-pack` (hyphenated), matching `AdminPlatformKey` in `src/lib/permissions/permission-registry.ts`.

## Risks

- Tech Pack and pattern routes retain `requireProductionView` / `requireProductionUpdate` after the platform guard. Future sprints should map `tech-pack.*` actions to concrete permission codes and reconcile with legacy `production.view` / `production.update` scopes.
- Manufacturing library routes retain `can(manufacturingAsset.*)` checks after the guard.
- Admin Tech Pack PDF (`GET /api/tech-packs/:id/pdf`) is guarded as `tech-pack/export` but is not the public token document route; public token rendering remains on the page route hardened in CTO-6.
- Production file download/open redirects remain on legacy access resolution; a future sprint should add explicit export guards if needed.

## Smoke Checks

Recommended smoke targets:

- public homepage `/`
- `/admin/login`
- `/admin/manufacturing-library`
- `/admin/tech-packs`
- `/admin/patterns`
- unauthenticated `POST /api/materials` returns normalized `401`
- unauthenticated `POST /api/tech-packs` returns normalized `401`
- public Tech Pack document token route still renders when fixture/token exists

## Next Recommended Sprint

CTO-7G should harden Content Platform mutations (homepage CMS, media, blog, landing) while avoiding revenue-launch frontend conflicts.

Recommended Manufacturing/Tech Pack follow-up:

- map `manufacturing.*` and `tech-pack.*` to concrete `AdminPermission` codes
- add route-level tests for unauthenticated, staff, and owner-like sessions
- guard production-file download/open and tech-pack asset download GET handlers as export/read permissions
- reconcile legacy `production.view` / `production.update` helpers with platform guards
