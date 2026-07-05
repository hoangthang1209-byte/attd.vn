# CTO-7C Commercial Mutation Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-7C applied the CTO-4 `requireAdminPermission()` pattern to Commercial Platform mutation routes and admin-only Commercial PDF/export routes. This sprint did not change Commercial business logic, quote/PDF visual design, public quote/order token behavior, Prisma models, route names, UI, Product routes, CRM routes, Dealer routes, or the pre-existing local quote/manufacturing-evidence/CSS work.

The guard remains transitional per `docs/security/permission-guard-foundation.md`: unauthenticated requests receive normalized permission errors, owner-like super admin sessions pass, and authenticated admin/staff sessions pass until later action-level permission enforcement lands.

## Commercial Route Files Inspected

66 route files were inspected under:

- `src/app/api/quotes/**/route.ts`
- `src/app/api/pricing/**/route.ts`
- `src/app/api/orders/**/route.ts`

The requested `src/app/api/admin/quotes`, `src/app/api/admin/pricing`, `src/app/api/admin/orders`, `src/app/api/order`, `src/app/api/production-orders`, `src/app/api/admin/production`, `src/app/api/delivery`, and `src/app/api/admin/delivery` path families were checked and did not add route files in this repository state. CTO-7B already handled `src/app/api/admin/sales/**` and `src/app/api/admin/revenue-categories/**`, so CTO-7C did not touch them.

## Routes Updated

49 Commercial mutation handlers now call `requireAdminPermission()` before validation/writes. Four admin-only PDF/export GET handlers were also guarded as `commercial/export`.

### Quote And Pricing

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/quotes` | `POST` | `commercial/create` |
| `/api/quotes/:id` | `PATCH` | `commercial/update` |
| `/api/quotes/:id/duplicate` | `POST` | `commercial/create` |
| `/api/quotes/:id/status` | `POST` | `commercial/update` |
| `/api/quotes/:id/pdf` | `GET` | `commercial/export` |
| `/api/pricing/calculate` | `POST` | `commercial/create` |
| `/api/pricing/calculations` | `POST` | `commercial/create` |
| `/api/pricing/price-groups` | `POST` | `commercial/create` |
| `/api/pricing/price-groups/:id` | `PATCH` | `commercial/update` |
| `/api/pricing/product-tiers` | `POST` | `commercial/create` |
| `/api/pricing/product-tiers/:id` | `PATCH` | `commercial/update` |
| `/api/pricing/service-rules` | `POST` | `commercial/create` |
| `/api/pricing/service-rules/:id` | `PATCH` | `commercial/update` |

### Orders And Operations

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/orders` | `POST` | `commercial/create` |
| `/api/orders/:id` | `PATCH` | `commercial/update` |
| `/api/orders/:id/status` | `POST` | `commercial/update` |
| `/api/orders/custom-product` | `POST` | `commercial/create` |
| `/api/orders/from-quote/:quoteId` | `POST` | `commercial/create` |
| `/api/orders/:id/delivery` | `PATCH` | `commercial/update` |
| `/api/orders/:id/production` | `PATCH` | `commercial/update` |
| `/api/orders/:id/payments` | `POST` | `commercial/update` |
| `/api/orders/:id/payments/:paymentId` | `PATCH` | `commercial/update` |
| `/api/orders/:id/payments/:paymentId/void` | `POST` | `commercial/admin` |
| `/api/orders/:id/documents/:docType/pdf` | `GET` | `commercial/export` |
| `/api/orders/:id/documents/delivery-note/pdf` | `GET` | `commercial/export` |
| `/api/orders/:id/documents/production-sheet/pdf` | `GET` | `commercial/export` |
| `/api/orders/:id/materials` | `POST`, `PATCH` | `commercial/update` |
| `/api/orders/:id/materials/:materialId` | `PATCH`, `DELETE` | `commercial/update`, `commercial/delete` |
| `/api/orders/:id/material-allocations` | `POST` | `commercial/update` |
| `/api/orders/:id/material-allocations/:allocationId` | `PATCH` | `commercial/update` |
| `/api/orders/:id/production-files` | `POST` | `commercial/update` |
| `/api/orders/:id/production-files/:fileId` | `PATCH`, `DELETE` | `commercial/update`, `commercial/delete` |
| `/api/orders/:id/production-files/:fileId/archive` | `POST` | `commercial/delete` |
| `/api/orders/:id/production-stages/initialize` | `POST` | `commercial/update` |
| `/api/orders/:id/production-stages/:stageId` | `PATCH` | `commercial/update` |
| `/api/orders/:id/handover-readiness/override` | `POST` | `commercial/admin` |
| `/api/orders/:id/purchase-request` | `POST` | `commercial/update` |
| `/api/orders/:id/qc` | `POST`, `PATCH` | `commercial/update` |
| `/api/orders/:id/qc/evidence` | `POST` | `commercial/update` |
| `/api/orders/:id/qc/evidence/:evidenceId` | `PATCH`, `DELETE` | `commercial/update`, `commercial/delete` |
| `/api/orders/:id/delivery-executions` | `POST` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId` | `PATCH` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/status` | `POST` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/dispatch` | `POST` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/attempts` | `POST` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/attempts/:attemptId` | `PATCH` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/proofs` | `POST` | `commercial/update` |
| `/api/orders/:id/delivery-executions/:executionId/proofs/:proofId` | `DELETE` | `commercial/delete` |

## Public Token Routes Preserved

The following public/token surfaces were intentionally not given admin guards:

- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`
- `/q/:token`
- `/q/:token/document`
- `/o/:orderNo/:docType`
- quote short-code redirect behavior

These remain governed by CTO-5 public-token safety and existing token validation.

## Routes Intentionally Deferred

- Ordinary Commercial GET list/detail/dashboard/readiness routes were not guarded in this mutation hardening sprint.
- The pre-existing untracked local file `src/app/api/quotes/[id]/manufacturing-evidence/route.ts` was not modified, per sprint instructions not to touch unrelated quote/manufacturing-evidence work. It remains visible as a deferred Commercial mutation surface.
- Delivery carrier/method routes were not touched because CTO-3 classified them as Operations Platform, not Commercial Platform.
- CTO-7B already guarded admin sales and revenue-category route families; CTO-7C did not rework them.
- Full concrete role/action enforcement for `commercial.create`, `commercial.update`, `commercial.delete`, `commercial.export`, and `commercial.admin` remains deferred until the permission registry maps platform/action pairs to `AdminPermission` codes.

## Notable Risks

- Several order operations are Commercial routes that also touch Manufacturing, Materials, Delivery, and QC concepts. CTO-7C used Commercial ownership because the routes mutate an order workflow, but future source-boundary work should clarify cross-platform service ownership.
- Payment void and handover readiness override are elevated as `commercial/admin`; concrete enforcement will matter once action-level permissions are live.
- Admin PDF/export routes now normalize unauthenticated failures before existing PDF/financial checks. Public token PDF routes are unchanged.
- Existing middleware/proxy may still intercept some unauthenticated HTTP requests before route handlers. Route-level guard insertion points are now present for direct handler/middleware-bypass tests in a later sprint.

## Next Recommended Sprint

CTO-7D should harden Dealer Platform mutations. A later Commercial follow-up should add route-handler tests for unauthenticated/staff/owner sessions and concrete permission enforcement.

Recommended Commercial follow-up items:

- add direct route-handler tests for guarded quote/pricing/order mutations;
- add concrete `AdminPermission` mapping for Commercial create/update/delete/export/admin actions;
- audit the deferred quote manufacturing-evidence route once that local work is ready;
- clarify ownership between Commercial, Manufacturing, Materials, and Operations for order-linked production/delivery routes;
- keep public quote/order token regression tests running before any document/PDF changes.

## Validation Notes

Required validation for this sprint:

```bash
npm run security:public-token
npx tsc --noEmit
npm run build
git diff --check
git diff --cached --check
```

Smoke coverage should include public homepage, admin login, admin quotes/orders pages, public quote token JSON/PDF/page behavior, a guarded unauthenticated Commercial mutation, and existing Commercial GET list route behavior.
