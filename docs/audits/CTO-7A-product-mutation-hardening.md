# CTO-7A Product Mutation Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-7A applied the CTO-4 `requireAdminPermission()` pattern to Product Platform mutation routes. This sprint did not change Product Platform business logic, Prisma models, route names, UI, public GET behavior, CRM/Commercial/Dealer code, or the pre-existing local quote/manufacturing-evidence work.

The guard remains transitional per `docs/security/permission-guard-foundation.md`: unauthenticated requests receive normalized permission errors, owner-like super admin sessions pass, and authenticated admin/staff sessions pass until later action-level permission enforcement lands.

## Product Route Files Inspected

29 route files were inspected:

- `src/app/api/admin/products/[id]/materials/[materialId]/route.ts`
- `src/app/api/admin/products/[id]/materials/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/products/[id]/variant-matrix/route.ts`
- `src/app/api/admin/products/[id]/variants/[variantId]/route.ts`
- `src/app/api/admin/products/[id]/variants/bulk/route.ts`
- `src/app/api/admin/products/attributes/[id]/route.ts`
- `src/app/api/admin/products/attributes/route.ts`
- `src/app/api/admin/products/attributes/seed/route.ts`
- `src/app/api/admin/products/categories/[id]/route.ts`
- `src/app/api/admin/products/categories/code-preview/route.ts`
- `src/app/api/admin/products/categories/route.ts`
- `src/app/api/admin/products/export/route.ts`
- `src/app/api/admin/products/import/execute/route.ts`
- `src/app/api/admin/products/import/jobs/[id]/download-feedback/route.ts`
- `src/app/api/admin/products/import/jobs/[id]/download-original/route.ts`
- `src/app/api/admin/products/import/jobs/[id]/route.ts`
- `src/app/api/admin/products/import/jobs/route.ts`
- `src/app/api/admin/products/import/parse/route.ts`
- `src/app/api/admin/products/import/preview/route.ts`
- `src/app/api/admin/products/import/templates/route.ts`
- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/sku-preview/route.ts`
- `src/app/api/admin/products/starter/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/colors/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/variants/route.ts`

## Mutation Methods Guarded

31 Product Platform mutation handlers now call `requireAdminPermission()` before parsing request bodies or executing Product service/database writes.

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/products` | `POST` | `product/create` |
| `/api/products/:id` | `PATCH`, `DELETE` | `product/update`, `product/delete` |
| `/api/categories` | `POST` | `product/create` |
| `/api/variants` | `POST` | `product/create` |
| `/api/colors` | `POST`, `PATCH` | `product/create`, `product/update` |
| `/api/admin/products` | `POST` | `product/create` |
| `/api/admin/products/:id` | `PATCH`, `POST`, `DELETE` | `product/update`, `product/update`, `product/delete` |
| `/api/admin/products/:id/materials` | `POST` | `product/update` |
| `/api/admin/products/:id/materials/:materialId` | `PATCH`, `DELETE` | `product/update`, `product/delete` |
| `/api/admin/products/:id/variant-matrix` | `POST` | `product/create` |
| `/api/admin/products/:id/variants/:variantId` | `DELETE` | `product/delete` |
| `/api/admin/products/:id/variants/bulk` | `POST` | `product/update` |
| `/api/admin/products/attributes` | `POST` | `product/create` |
| `/api/admin/products/attributes/:id` | `PATCH`, `DELETE` | `product/update`, `product/delete` |
| `/api/admin/products/attributes/seed` | `POST` | `product/admin` |
| `/api/admin/products/categories` | `POST` | `product/create` |
| `/api/admin/products/categories/:id` | `PUT`, `DELETE` | `product/update`, `product/delete` |
| `/api/admin/products/export` | `POST` | `product/export` |
| `/api/admin/products/import/parse` | `POST` | `product/create` |
| `/api/admin/products/import/preview` | `POST` | `product/create` |
| `/api/admin/products/import/execute` | `POST` | `product/admin` |
| `/api/admin/products/import/jobs/:id` | `DELETE` | `product/delete` |
| `/api/admin/products/sku-preview` | `POST` | `product/create` |
| `/api/admin/products/starter` | `POST` | `product/admin` |

## Deferred Routes And Reasons

- Product GET/list/detail routes were intentionally not guarded in CTO-7A because the sprint focused on `POST`, `PATCH`, `PUT`, and `DELETE`.
- `/api/admin/products/categories/code-preview` remains GET-only and was not changed.
- `/api/admin/products/import/jobs`, `/api/admin/products/import/jobs/:id`, `/api/admin/products/import/templates`, `/api/admin/products/import/jobs/:id/download-feedback`, and `/api/admin/products/import/jobs/:id/download-original` keep their current GET behavior. Download/template read/export authorization should be revisited in a read/export hardening sprint.
- `/api/admin/products/:id/variants/bulk` accepts mixed body operations including archive, restore, status, stock, image, SKU, and delete. CTO-7A guards the endpoint as `product/update` without changing body parsing. A later sprint should map body operation types to `update` or `delete` after the permission registry enforces action-level rules.

## Notable Findings

- Legacy-looking Product mutation routes under `/api/products`, `/api/categories`, `/api/variants`, and `/api/colors` still perform Product writes. They now require admin Product permissions, but their public-looking paths should be reviewed in a future API IA sprint.
- Several admin Product mutation routes already delegated business behavior into `src/features/products`, which made guard insertion low-risk.
- Product import execution is correctly treated as higher-risk `product/admin`.
- Product import parse/preview can create or store import job context and are treated as `product/create`.
- Product export is a `POST` route and now uses `product/export`.
- Product starter and attribute seed endpoints are broad bootstrap actions and now use `product/admin`.
- Variant lifecycle preview remains a GET route. The destructive lifecycle action is still the guarded `DELETE`.
- Public Product GET/list routes were left unchanged to avoid accidental storefront regressions.
- CTO-4 still does not enforce concrete `AdminPermission` codes by platform/action for authenticated staff. CTO-7A adds the insertion points needed for that later enforcement.
- Pre-existing unstaged quote/manufacturing-evidence changes remained outside this sprint.

## P0/P1 Roadmap

| Priority | Title | Affected Platform | Risk | Recommended Sprint | Safe Now |
| --- | --- | --- | --- | --- | --- |
| P0 | Enforce concrete Product action permissions in `requireAdminPermission` | Product, Operations | High | CTO-7B/permission enforcement | No, requires role matrix rollout |
| P0 | Review Product import download/original-file GET authorization | Product | High | CTO-7B read/export hardening | No, needs admin UX/download flow verification |
| P0 | Body-aware permission mapping for bulk variant destructive operations | Product | Medium-High | CTO-7B | No, requires preserving bulk behavior and tests |
| P1 | Move legacy public-looking Product mutation paths behind admin route naming or document compatibility layer | Product | Medium | API IA sprint | No, route rename/compatibility planning required |
| P1 | Add integration tests for unauthenticated Product mutations returning normalized 401 | Product | Medium | CTO-7B | Yes, if test harness is ready |
| P1 | Add Product permission smoke fixtures for create/update/delete/export/admin actions | Product | Medium | CTO-7B | No, depends on concrete permission enforcement |

## Validation Notes

Required validation for this sprint:

```bash
npm run security:public-token
npx tsc --noEmit
npm run build
git diff --check
git diff --cached --check
```

Smoke coverage should include public storefront routes, admin login/products route load or redirect behavior, at least one Product GET, and an unauthenticated Product mutation returning a normalized permission failure.
