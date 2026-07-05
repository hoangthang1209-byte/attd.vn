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
