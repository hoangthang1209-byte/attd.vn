# CTO-3 Mutation Security Audit

Date: 2026-07-05
Status: Completed audit
Scope: Documentation, permission matrix, and lightweight constant registry only

CTO-4 introduced guard foundations. Route-by-route enforcement will be done in CTO-5 hardening sprints.

## Summary

This audit inspected admin auth, dealer portal auth, public-token routes, and all API route handlers under `src/app/api/**/route.ts` for mutation methods. It did not refactor business logic, rename routes, rename Prisma models, redesign UI, or touch the pre-existing unstaged quote/manufacturing-evidence implementation work.

Generated inventory:

- API route handler files scanned: 300
- Mutation method entries audited: 268
- Distinct mutation route paths audited: 229
- High-risk route paths: 173
- Medium-risk route paths: 16
- Low-risk route paths: 40

Risk interpretation:

- `low`: explicit handler/service guard was detected or the route is an auth/login flow.
- `medium`: guard exists but needs a more specific action/export/destructive/ownership permission, or the route is a public capture endpoint that needs stronger abuse controls.
- `high`: no explicit handler/service authorization was detected for a non-public mutation. Middleware may still protect the route, but CTO-3 treats middleware/proxy as defense-in-depth only.

## Current Auth and Permission Entry Points

Admin session and permission entry points:

- `src/middleware.ts` currently performs admin page/API broad protection. Next.js 16 documents the `middleware` convention as deprecated in favor of `proxy`.
- `src/lib/admin-auth/middleware-utils.ts` defines protected admin/API route prefixes and public mutation exceptions.
- `src/lib/admin-auth/require-admin.ts` exposes `requireAdmin`, `requireAdminApi`, and `requireAdminApiFromCookies`.
- `src/lib/admin-auth/get-admin-session.ts` and edge/node session helpers resolve owner, staff, and legacy sessions.
- `src/features/auth/admin-permission-catalog.ts` is the current permission code catalog.
- `src/features/auth/admin-permissions.ts` implements `can`, legacy role fallback, financial visibility, and permission denial helpers.
- `src/lib/admin-auth/financial-access.ts` and order-scope helpers enforce important commercial/financial access checks.

Dealer portal entry points:

- `src/lib/dealer-auth/require-dealer-portal.ts`
- `src/features/dealer/auth/dealer-auth.service.ts`
- `src/features/dealer/auth/dealer-session.ts`
- `/api/portal/auth/*` and `/api/portal/rfqs/*`
- Deprecated compatibility routes `/api/dealer-portal/*`

Public-token/document entry points:

- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`
- `/q/:token` and `/q/:token/document`
- `/quote-link/:quoteLink`
- `/o/:orderNo/:docType`
- PDF token services in `src/features/quotes/pdf`, `src/features/orders/*/pdf-token.ts`, and `src/features/tech-pack/pdf`

## Key Findings

1. Broad middleware protection exists for many admin/API routes, but many mutation handlers do not perform explicit platform/action authorization inside the handler or service.
2. Newer Manufacturing Library and some admin role/user/product import routes already contain explicit handler-level admin/session or permission checks.
3. Dealer portal RFQ mutations correctly show dealer session/company ownership patterns; portal logout should still receive an explicit session guard for consistency.
4. Public capture routes `/api/leads`, `/api/dealers`, and `/api/dealer-leads` are intentionally public but need rate/abuse controls and stricter service allowlists.
5. Public-token quote routes are read routes, but require data-minimization regression tests before revenue workflows expand.
6. Export/download/PDF/upload routes need explicit future `export`, `download`, `file`, or elevated permissions instead of generic module access.
7. Destructive actions and seed/demo routes should require elevated admin permissions later.
8. The visible local unstaged quote manufacturing evidence route appears in this inventory but was not modified by CTO-3.
9. API response shapes remain inconsistent; security refactors should pair permission checks with normalized error codes in future sprints.
10. No test framework changes were added; public-token exclusion tests are documented as a gap.

## High-Risk Route Groups

These route groups should be prioritized in CTO-4 security hardening because no explicit handler/service guard was detected in the generated scan:

- Product mutations: `/api/admin/products*`, `/api/products*`, `/api/categories`, `/api/variants`, `/api/colors`
- CRM mutations: `/api/crm/*`, `/api/admin/sales*`, `/api/admin/revenue-categories*`
- Content mutations: `/api/blog/*`, `/api/posts*`, `/api/case-studies*`, `/api/client-logos*`, `/api/admin/seo/brief`
- Commercial mutations: `/api/quotes*`, `/api/orders*`, `/api/pricing*`
- Manufacturing mutations: `/api/materials*`, `/api/purchase-requests*`, `/api/production-*`, `/api/print-methods*`, `/api/production/plans*`
- Tech Pack mutations: `/api/tech-packs*`, `/api/patterns*`, `/api/measurement-templates*`
- AI/Knowledge Base mutations: `/api/admin/knowledge-base*`, `/api/admin/ai/knowledge-context`
- Operations/settings mutations: `/api/settings/*`, `/api/admin/demo/*`, generic admin attribute routes

## Public Token Data Minimization Audit

Public-token routes must be read-only and must never expose internal notes, margins, costs, staff-only identifiers, or unrelated customer data. The explicit forbidden field list is now mirrored in `src/lib/permissions/permission-registry.ts` as `PUBLIC_TOKEN_FORBIDDEN_FIELDS`.

Routes needing data-minimization tests:

- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`
- `/q/:token`
- `/q/:token/document`
- `/quote-link/:quoteLink`
- `/o/:orderNo/:docType`
- `/api/orders/:id/documents/:docType/pdf`
- `/api/orders/:id/documents/production-sheet/pdf`
- `/api/orders/:id/documents/delivery-note/pdf`
- `/api/tech-packs/:id/pdf`

Forbidden public fields include:

- `internalNote`
- internal notes of any kind
- `costPrice`
- `costEstimate`
- `marginAmount`
- `marginRate`
- internal `manualOverrideReason`
- internal `pricingSnapshot`
- internal `inputSnapshot`
- internal `resultSnapshot`
- internal `metadata`
- `assignedToAdminUserId`
- staff-only identifiers
- private customer details not required for the public document

## Sensitive Read, Upload, Export, Download, and PDF Routes

The following route families are security-sensitive even when they are GET/read routes:

- `/api/admin/demo/images`
- `/api/admin/products/export`
- `/api/admin/products/import/jobs/:id/download-feedback`
- `/api/admin/products/import/jobs/:id/download-original`
- `/api/crm/reports/sales/export`
- `/api/crm/reports/sources/export`
- `/api/dealer-portal/login`
- `/api/dealer-portal/logout`
- `/api/images`
- `/api/images/:id`
- `/api/media`
- `/api/media/:id`
- `/api/orders/:id/documents/:docType/pdf`
- `/api/orders/:id/documents/delivery-note/pdf`
- `/api/orders/:id/documents/production-sheet/pdf`
- `/api/orders/:id/production-files`
- `/api/orders/:id/production-files/:fileId`
- `/api/orders/:id/production-files/:fileId/archive`
- `/api/patterns/:id/files`
- `/api/patterns/:id/files/:fileId`
- `/api/patterns/:id/files/:fileId/download`
- `/api/portal/auth/login`
- `/api/portal/auth/logout`
- `/api/portal/auth/me`
- `/api/portal/rfqs`
- `/api/portal/rfqs/:id`
- `/api/portal/rfqs/:id/submit`
- `/api/print-methods/export`
- `/api/production-files/:id/download`
- `/api/production-files/:id/open`
- `/api/production-files/status`
- `/api/production-files/upload-complete`
- `/api/production-files/upload-session`
- `/api/production-materials/export`
- `/api/production-suppliers/export`
- `/api/production-trims/export`
- `/api/quotes/:id/pdf`
- `/api/quotes/pdf-health`
- `/api/quotes/pdf-renderer-health`
- `/api/quotes/public/:token`
- `/api/quotes/public/:token/pdf`
- `/api/tech-packs/:id/assets/:assetId/download`
- `/api/tech-packs/:id/pdf`

## Complete Mutation Route Table

| Route | Method(s) | Platform | Current guard found | Expected guard | Risk | Recommendation | Safe now? | Future sprint |
|---|---|---|---|---|---|---|---|---|
| /api/admin/ai/knowledge-context | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/attributes/:id | PATCH,DELETE | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/attributes/:id/values/:valueId | PATCH,DELETE | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/attributes/:id/values | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/attributes/presets/apply | POST | Operations | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/attributes | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/attributes/seed | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/auth/login | POST | Operations | no explicit handler guard found | Auth flow guard; no platform permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/auth/logout | POST | Operations | no explicit handler guard found | Auth flow guard; no platform permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/admin/demo/images | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/demo/seed | POST,DELETE | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/:id | PATCH,DELETE | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/bulk | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/categories/:id | PATCH,DELETE | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/categories | POST,PATCH | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/context-preview | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/context/preview | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/import/execute | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/import/preview | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/knowledge-base/starter | POST | AI | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/manufacturing-library/:id | PATCH,DELETE | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/categories/:id | PATCH,DELETE | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/categories | POST | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/display-locations/:id | PATCH,DELETE | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/display-locations | POST | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library | POST | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/workflows/:id | PATCH,DELETE | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/manufacturing-library/workflows | POST | Manufacturing | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products/:id/materials/:materialId | PATCH,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/:id/materials | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/:id | POST,PATCH,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/:id/variant-matrix | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/:id/variants/:variantId | DELETE | Product | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products/:id/variants/bulk | POST | Product | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products/attributes/:id | PATCH,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/attributes | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/attributes/seed | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/categories/:id | PUT,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/categories | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/export | POST | Product | handler admin/session or permission | Admin explicit export permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/admin/products/import/execute | POST | Product | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products/import/jobs/:id | DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/import/parse | POST | Product | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products/import/preview | POST | Product | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/products | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/sku-preview | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/products/starter | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/revenue-categories/:id | PATCH,DELETE | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/revenue-categories | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/roles/:id | PATCH | Operations | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/roles | POST | Operations | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/sales/:id/default | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/sales/:id | PATCH | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/sales/:id/toggle-active | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/sales | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/seo/brief | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/admin/users/:id/reset-password | POST | Operations | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/admin/users/:id | PATCH | Operations | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/admin/users | POST | Operations | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/blog/categories/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/blog/categories | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/blog/posts/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/blog/posts | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/case-studies/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/case-studies | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/categories | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/client-logos/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/client-logos | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/colors | POST,PATCH | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/activities | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/contacts | POST,PATCH | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/customers/:id/contacts/:contactId | PATCH,DELETE | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/customers/:id/contacts/:contactId/set-primary | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/customers/:id/contacts | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/customers/:id | PATCH | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/customers | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/leads/:id/convert | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/leads/:id/link-customer | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/leads/:id/notes | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/leads/:id | PATCH | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/leads | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/product-interests | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/whatsapp-assistant/analyze | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/crm/whatsapp-assistant/leads | POST | CRM | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/dealer-leads/:id | PATCH | Dealer | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/dealer-leads/:id/status | PATCH | Dealer | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/dealer-leads | POST | Dealer | no explicit handler guard found | Public validation/rate guard + service allowlist | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/dealer-portal/login | POST | Dealer | token logic | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer-portal/logout | POST | Dealer | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/dealer/companies/:id/approve | POST | Dealer | handler admin/session or permission | Admin Dealer permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/dealer/companies/:id/assign-price-group | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/companies/:id/link-customer | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/companies/:id/reject | POST | Dealer | handler admin/session or permission | Admin Dealer permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/dealer/companies/:id | PATCH | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/companies/:id/users | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/companies | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/rfqs/:id/assign | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/rfqs/:id/convert-lead | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/rfqs/:id/link-customer | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/rfqs/:id | PATCH | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/rfqs/:id/status | POST | Dealer | handler admin/session or permission | Admin Dealer permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/dealer/users/:id/disable | POST | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/users/:id | PATCH | Dealer | handler admin/session or permission | Admin Dealer permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/dealer/users/:id/set-password | POST | Dealer | handler admin/session or permission | Admin Dealer permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/dealers | POST | Dealer | no explicit handler guard found | Public validation/rate guard + service allowlist | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/delivery-carriers/:id | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/delivery-carriers | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/delivery-methods/:id | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/delivery-methods | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/employees/:id | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/employees | POST | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/images/:id | PATCH,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/images | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/landing-pages/:slug | PATCH | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/leads | POST | CRM | no explicit handler guard found | Public validation/rate guard + service allowlist | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/material-suppliers/:id | PATCH | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/material-suppliers | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/materials/:id | PATCH | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/materials/:id/stock-adjustments | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/materials/:id/suppliers/:linkId | PATCH,DELETE | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/materials/:id/suppliers | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/materials | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/measurement-templates/:id/duplicate | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/measurement-templates/:id | PATCH | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/measurement-templates | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/media/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/media | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/attempts/:attemptId | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/attempts | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/dispatch | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/proofs/:proofId | DELETE | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/proofs | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions/:executionId/status | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery-executions | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/delivery | PATCH | Commercial | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/orders/:id/handover-readiness/override | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/material-allocations/:allocationId | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/material-allocations | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/materials/:materialId | PATCH,DELETE | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/materials | POST,PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/payments/:paymentId | PATCH | Commercial | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/orders/:id/payments/:paymentId/void | POST | Commercial | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/orders/:id/payments | POST | Commercial | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/orders/:id/production-files/:fileId/archive | POST | Commercial | no explicit handler guard found | Admin elevated delete/admin permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/production-files/:fileId | PATCH,DELETE | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/production-files | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/production-stages/:stageId | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/production-stages/initialize | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/production | PATCH | Commercial | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/orders/:id/purchase-request | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/qc/evidence/:evidenceId | PATCH,DELETE | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/qc/evidence | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id/qc | POST,PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/:id | PATCH | Commercial | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/orders/:id/status | POST | Commercial | handler admin/session or permission | Admin session + platform/action permission | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/orders/custom-product | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders/from-quote/:quoteId | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/orders | POST | Commercial | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/patterns/:id/apply-measurement-template | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/approve | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/archive | POST | Tech Pack | no explicit handler guard found | Admin elevated delete/admin permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/copy-from-tech-pack | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/files/:fileId | PATCH,DELETE | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/files | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id/new-version | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns/:id | PATCH | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/patterns | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/portal/auth/login | POST | Dealer | token logic | Dealer session + company ownership | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/portal/auth/logout | POST | Dealer | no explicit handler guard found | Dealer session + company ownership | medium | Add explicit route/service guard and targeted tests. | no | CTO-4 permission sweep |
| /api/portal/rfqs/:id | PATCH | Dealer | dealer session/ownership | Dealer session + company ownership | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/portal/rfqs/:id/submit | POST | Dealer | dealer session/ownership | Dealer session + company ownership | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/portal/rfqs | POST | Dealer | dealer session/ownership | Dealer session + company ownership | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/posts/:id | PATCH,DELETE | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/posts | POST | Content | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/calculate | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/calculations | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/price-groups/:id | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/price-groups | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/product-tiers/:id | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/product-tiers | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/service-rules/:id | PATCH | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/pricing/service-rules | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/print-methods/:id | PATCH,DELETE | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/print-methods/import | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/print-methods | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-files/upload-complete | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-files/upload-session | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-materials/:id | PATCH,DELETE | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-materials/import | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-materials | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-suppliers/:id/merge | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-suppliers/:id | PATCH,DELETE | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-suppliers/import | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-suppliers | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-trims/:id | PATCH,DELETE | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-trims/import | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production-trims | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production/plans/:orderItemId | PATCH | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/production/plans | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/products/:id | PATCH,DELETE | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/products | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/purchase-requests/:id/receive | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/purchase-requests/:id | PATCH | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/purchase-requests/:id/status | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/purchase-requests | POST | Manufacturing | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/quotes/:id/duplicate | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/quotes/:id/manufacturing-evidence | PUT | Commercial | handler admin/session or permission | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/quotes/:id | PATCH | Commercial | token logic | Admin session + platform/action permission | low | Keep; add normalized response/tests later. | yes | CTO-4 permission sweep |
| /api/quotes/:id/status | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/quotes | POST | Commercial | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/settings/branding | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/settings/company | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/settings/homepage | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/settings/trust | PATCH | Operations | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/apply-measurement-template | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/artwork-placements | PUT | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/assets/:assetId | PATCH,DELETE | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/assets | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/attach-pattern | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/bom | PUT | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/new-version | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/publish | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/release | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id | PATCH | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs/:id/select-pattern | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/tech-packs | POST | Tech Pack | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |
| /api/variants | POST | Product | no explicit handler guard found | Admin session + platform/action permission | high | Prioritize explicit guard in handler/service; do not rely on middleware only. | no | CTO-4 security hardening |

## Recommendations

P0/P1 follow-up order:

1. Add explicit handler/service authorization to high-risk admin mutations, starting with commercial, CRM, product, and tech-pack write routes.
2. Add public-token data-minimization tests for quote, order document, and PDF routes.
3. Add explicit dealer ownership assertions to every dealer mutation and make logout/session semantics consistent.
4. Introduce export/download/file permissions before expanding bulk exports and private file access.
5. Migrate `src/middleware.ts` to the Next.js `proxy` convention in a separate infrastructure sprint with auth smoke tests.
6. Normalize permission failure responses using stable error codes.

## Test Gap

No test scaffolding was added in CTO-3. Existing test infrastructure is present in the repo, but this sprint is documentation-first and route contracts vary widely. Recommended first tests for CTO-4:

- Public quote token response excludes `PUBLIC_TOKEN_FORBIDDEN_FIELDS`.
- Public quote PDF route excludes internal pricing/cost metadata.
- Admin mutation without session returns 401 from handler/service even if middleware is bypassed in test harness.
- Dealer RFQ mutation cannot access another dealer company.
