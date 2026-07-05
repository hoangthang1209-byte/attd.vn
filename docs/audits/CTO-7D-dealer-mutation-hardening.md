# CTO-7D Dealer Mutation Hardening

Date: 2026-07-05
Status: Completed
Sprint type: Foundation / Security Hardening

## Scope

CTO-7D applied the CTO-4 permission guard pattern to Dealer Platform mutation routes without changing Dealer business logic, Prisma models, route names, UI, Product, CRM, Commercial, or public frontend behavior.

Routes inspected: 30 route files under `src/app/api/dealer*`, `src/app/api/dealer-leads`, `src/app/api/dealers`, `src/app/api/dealer-portal`, and `src/app/api/portal`.

## Routes Updated

### Admin Dealer Management

These admin-side mutations now use `requireAdminPermission({ platform: "dealer", action, request })` before validation and writes:

| Route | Method | Action | Notes |
| --- | --- | --- | --- |
| `/api/dealer/companies` | `POST` | `create` | create dealer company |
| `/api/dealer/companies/:id` | `PATCH` | `update` | update dealer company |
| `/api/dealer/companies/:id/approve` | `POST` | `approve` | approval workflow |
| `/api/dealer/companies/:id/reject` | `POST` | `approve` | rejection is part of approval workflow |
| `/api/dealer/companies/:id/assign-price-group` | `POST` | `admin` | pricing/price-group assignment |
| `/api/dealer/companies/:id/link-customer` | `POST` | `admin` | CRM customer link |
| `/api/dealer/companies/:id/users` | `POST` | `create` | create dealer user |
| `/api/dealer/users/:id` | `PATCH` | `update` | update dealer user |
| `/api/dealer/users/:id/disable` | `POST` | `delete` | disable user |
| `/api/dealer/users/:id/set-password` | `POST` | `admin` | password administration |
| `/api/dealer/rfqs/:id` | `PATCH` | `update` | admin RFQ update |
| `/api/dealer/rfqs/:id/status` | `POST` | `update` | RFQ status update |
| `/api/dealer/rfqs/:id/assign` | `POST` | `update` | assign responsible admin |
| `/api/dealer/rfqs/:id/convert-lead` | `POST` | `admin` | CRM lead conversion |
| `/api/dealer/rfqs/:id/link-customer` | `POST` | `admin` | CRM customer link |
| `/api/dealer-leads/:id` | `PATCH` | `update` | admin dealer lead update |
| `/api/dealer-leads/:id/status` | `PATCH` | `update` | admin dealer lead pipeline status |

Existing admin `GET` handlers were left on the legacy admin cookie gate where present because this sprint targets mutations only.

### Dealer Portal

These dealer portal mutations now use `requireDealerPermission({ action, request })`:

| Route | Method | Action | Ownership boundary |
| --- | --- | --- | --- |
| `/api/portal/rfqs` | `POST` | `create` | RFQ is created with `permission.session.companyId` and `permission.session.userId`. |
| `/api/portal/rfqs/:id` | `PATCH` | `update` | Existing service call receives `permission.session.companyId` and enforces RFQ company ownership. |
| `/api/portal/rfqs/:id/submit` | `POST` | `update` | Existing CTO-4 pilot route already used `requireDealerPermission`; service receives `permission.session.companyId`. |

## Routes Intentionally Left Unguarded

- `/api/dealers` `POST`: public dealer application/intake.
- `/api/dealer-leads` `POST`: public dealer lead form.
- `/api/portal/auth/login` and `/api/dealer-portal/login`: public login endpoints.
- `/api/portal/auth/logout` and `/api/dealer-portal/logout`: cookie-clearing auth utilities. These remain unconverted because `requireDealerPermission` requires an approved dealer company, while login can create a pending-company session. Guarding logout with the approved-only helper could prevent pending dealers from signing out.
- Dealer Platform `GET` routes: outside CTO-7D mutation scope.

## Ownership Checks

- Admin-side dealer mutations are authorized through the admin Dealer Platform boundary.
- Portal RFQ create uses the authenticated dealer session company and user as the write owner.
- Portal RFQ update and submit keep the existing service-level ownership check by passing `dealerCompanyId: permission.session.companyId`.
- No new Prisma relations, route params, or database model names were introduced.

## Risks

- Concrete admin permission-code enforcement remains deferred. `requireAdminPermission` still admits authenticated staff while the platform/action matrix is mapped in a future sprint.
- Dealer role/action enforcement remains deferred. `requireDealerPermission` verifies approved session and company ownership, but does not yet enforce owner/manager/sales/purchasing/viewer capabilities.
- Dealer lead admin `GET` routes remain outside this mutation sprint and should be reviewed in a read-permission sprint.
- Logout routes need a future session-only guard that does not require approved company status.

## Smoke Checks

Recommended smoke targets for this sprint:

- public homepage `/`
- `/admin/login`
- dealer portal login/workspace, if seeded credentials are available
- admin dealer page, if seeded admin credentials are available
- unauthenticated `POST /api/dealer/companies` returns normalized admin `401`
- unauthenticated `POST /api/portal/rfqs` returns normalized dealer `401`
- public dealer lead intake remains unguarded

## Next Recommended Sprint

CTO-7E should map Dealer Platform concrete permissions:

- Admin permission codes for dealer company/user/RFQ/lead create, update, approve, delete, admin, and export actions.
- Dealer portal role/action matrix for owner, manager, sales, purchasing, and viewer roles.
- Session-only logout guard for portal logout routes.
- Read-permission audit for Dealer Platform admin lists/detail endpoints.
