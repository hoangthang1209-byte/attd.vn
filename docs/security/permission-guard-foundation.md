# Permission Guard Foundation

Date: 2026-07-05
Status: CTO-4 baseline

## Purpose

CTO-4 introduces reusable permission guard foundations for admin, dealer portal, and public-token routes. The goal is to standardize the pattern without refactoring every mutation route in one sprint.

## Normalized Permission Errors

Permission failures should use `src/lib/errors/permission-errors.ts` for new and migrated permission checks.

```ts
return forbiddenResponse();
```

The response shape follows `docs/engineering/api-conventions.md`:

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền thực hiện thao tác này."
  }
}
```

## Admin Guard

Use `requireAdminPermission` in route handlers or platform services before mutating admin data.

```ts
const permission = await requireAdminPermission({
  platform: "ai",
  action: "create",
  request,
});

if (!permission.ok) return permission.response;
```

Transitional enforcement note:

- Unauthenticated admin requests fail with normalized `UNAUTHORIZED`.
- Owner-like super admin sessions pass.
- Authenticated admin/staff sessions pass for now.
- CTO-5 must map `platform` and `action` to concrete `AdminPermission` codes and scopes.

This transitional behavior avoids breaking current production access while creating a stable guard insertion point.

## Dealer Guard

Use `requireDealerPermission` for dealer portal mutations.

```ts
const permission = await requireDealerPermission({
  action: "update",
  request,
  dealerCompanyId,
});

if (!permission.ok) return permission.response;
```

The helper verifies:

- dealer portal session exists;
- dealer account resolves to an approved company;
- optional `dealerCompanyId` matches the session company.

CTO-5 should add role/action enforcement for dealer owner, manager, sales, purchasing, and viewer roles.

## Public Token Safety

Use `assertPublicTokenSafePayload` before returning public-token document payloads in future hardening sprints.

```ts
const safety = assertPublicTokenSafePayload(payload);
if (!safety.ok) return createPublicTokenForbiddenFieldResponse(safety.forbiddenFields);
```

The helper recursively scans object keys for forbidden public-token fields mirrored from `PUBLIC_TOKEN_FORBIDDEN_FIELDS`.

Do not apply this broadly until public-token route tests are in place, especially for quote and PDF routes.

## Pilot Routes Updated

- `/api/admin/knowledge-base/starter`
- `/api/portal/rfqs/:id/submit`

Both pilots preserve the existing authorized business behavior and only normalize permission failures.

## CTO-7A Product Platform Mutation Hardening

CTO-7A applied `requireAdminPermission()` to Product Platform mutation handlers across admin Product APIs and legacy Product write routes. The sprint guarded 31 `POST`, `PATCH`, `PUT`, and `DELETE` handlers after inspecting 29 Product route files.

Applied Product action mapping:

- create/category/variant/color/size/attribute/import preview/import parse mutations: `platform: "product"`, `action: "create"`
- update/stock/material/category/attribute mutations: `platform: "product"`, `action: "update"`
- archive/delete/delete-job mutations: `platform: "product"`, `action: "delete"`
- export mutation: `platform: "product"`, `action: "export"`
- starter, seed, and import execution mutations: `platform: "product"`, `action: "admin"`

CTO-7A intentionally did not guard Product GET routes. Product import downloads/templates and body-aware bulk variant action mapping remain deferred for a later read/export and concrete-permission enforcement sprint.

## CTO-7B CRM Platform Mutation Hardening

CTO-7B applied `requireAdminPermission()` to CRM Platform mutation handlers and CRM high-risk admin-adjacent mutations identified in CTO-3. CRM create/update/delete mutations now use `platform: "crm"` with the matching `create`, `update`, or `delete` action. CRM report export handlers use `action: "export"`, and the WhatsApp assistant analysis endpoint uses `action: "admin"`.

Public lead capture remains public: `/api/leads` was not guarded, and the public-style branch of `/api/crm/leads` remains unguarded while the explicit `adminMode` branch now requires `crm/create`.

Full action-level enforcement remains future work until platform/action pairs are mapped to concrete `AdminPermission` codes.

## CTO-7C Commercial Platform Mutation Hardening

CTO-7C applied `requireAdminPermission()` to Commercial Platform quote, pricing, order, payment, production handoff, QC, and delivery-execution mutation handlers. Commercial create/update/delete mutations now use `platform: "commercial"` with the matching `create`, `update`, or `delete` action. Admin quote/order PDF routes use `action: "export"`, while payment void and handover override use `action: "admin"`.

Public quote/order token routes remain governed by public-token safety and were not converted to admin guards. This includes `/api/quotes/public/:token`, `/api/quotes/public/:token/pdf`, `/q/:token`, `/q/:token/document`, and `/o/:orderNo/:docType`.

Full action-level enforcement remains future work until platform/action pairs are mapped to concrete `AdminPermission` codes.

## CTO-7D Dealer Platform Mutation Hardening

CTO-7D applied `requireAdminPermission()` to admin-side Dealer Platform company, user, RFQ, lead, approval, price-group assignment, password administration, and CRM-link mutation handlers. Admin Dealer mutations now use `platform: "dealer"` with the appropriate `create`, `update`, `delete`, `approve`, or `admin` action.

Dealer portal RFQ create/update/submit mutations use `requireDealerPermission()` and keep dealer company ownership checks by passing the authenticated `permission.session.companyId` into the existing RFQ service calls.

Public dealer intake remains public: `/api/dealers` and the public `POST /api/dealer-leads` capture paths were not converted to admin or dealer guards. Dealer portal login remains public, and logout remains a cookie-clearing auth utility until a session-only guard is introduced that does not require approved company status.

Full admin action-code enforcement and dealer role/action enforcement remain future work until platform/action pairs are mapped to concrete `AdminPermission` codes and dealer portal roles.

## CTO-7E Operations Platform Mutation Hardening

CTO-7E applied `requireAdminPermission()` to Operations Platform admin user, role, employee, company/branding/trust settings, and demo bootstrap mutation handlers. Operations create/update/delete/admin mutations now use `platform: "operations"` with the matching `create`, `update`, `delete`, or `admin` action.

Public settings and branding reads remain public where required for the public frontend: `GET /api/settings/branding`, `GET /api/settings/company`, `GET /api/settings/trust`, and related read endpoints were not converted to admin guards. Homepage CMS mutations under `/api/settings/homepage` were intentionally deferred to CTO-7F Content Platform hardening.

Admin auth login/logout utilities remain public auth endpoints. Existing `canManageUsers` and `canManageRolesPermissions` checks remain in place after the guard for authenticated authorization behavior.

Full action-level enforcement remains future work until platform/action pairs are mapped to concrete `AdminPermission` codes.

## CTO-5 Pattern

Future hardening sprints should:

1. Add route-level tests that bypass middleware/proxy and call handlers directly.
2. Insert `requireAdminPermission` or `requireDealerPermission` before validation and writes.
3. Map platform/action pairs to concrete permission codes.
4. Add elevated handling for export, download, delete, approve, publish, release, and private-file routes.
5. Add public-token minimization tests before applying public-token safety to quote/order/tech-pack documents.

## CTO-5 Public-Token Data-Minimization Tests

CTO-5 added `npm run security:public-token` and applied `assertPublicTokenSafePayload` to the public quote JSON/PDF/document surfaces plus order PDF-token document rendering.

The guard is intentionally data-object based. It scans public payload keys before JSON responses or document rendering and does not inspect final HTML or PDF binaries.

Tech-pack public PDF output is documented as deferred because it needs a dedicated public serializer before internal tech-pack fields can be removed safely.

## CTO-6 Tech Pack Public Serializer Hardening

CTO-6 added `src/features/tech-pack/public-tech-pack.serializer.ts` and applies it before rendering `/tech-pack/:id/document?mode=pdf&pdfToken=...`.

The serializer preserves the existing PDF DTO shape for visual compatibility but removes public-unsafe values such as internal production owner/workshop/deadline fields, internal/QC/production notes, released-by staff identifiers, supplier display values, supplier master-code fragments, and asset notes.

The Tech Pack document page now runs `assertPublicTokenSafePayload` against the sanitized DTO before rendering. The admin PDF endpoint renders that same token document, so the generated PDF path uses the sanitized payload as well.
