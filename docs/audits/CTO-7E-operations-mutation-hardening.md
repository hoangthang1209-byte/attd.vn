# CTO-7E Operations Mutation Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-7E applied the CTO-4 `requireAdminPermission()` pattern to Operations Platform mutation routes without changing Operations business logic, Prisma models, route names, UI, public frontend behavior, revenue-launch frontend work, quote/manufacturing-evidence changes, or Content Platform homepage mutations.

The guard remains transitional per `docs/security/permission-guard-foundation.md`: unauthenticated requests receive normalized permission errors, owner-like super admin sessions pass, and authenticated admin/staff sessions pass until later action-level permission enforcement lands.

## Operations Route Files Inspected

18 route files were inspected under the Operations ownership boundaries:

- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/users/[id]/reset-password/route.ts`
- `src/app/api/admin/roles/route.ts`
- `src/app/api/admin/roles/[id]/route.ts`
- `src/app/api/admin/permissions/route.ts`
- `src/app/api/employees/route.ts`
- `src/app/api/employees/[id]/route.ts`
- `src/app/api/settings/branding/route.ts`
- `src/app/api/settings/company/route.ts`
- `src/app/api/settings/trust/route.ts`
- `src/app/api/settings/homepage/route.ts`
- `src/app/api/admin/demo/seed/route.ts`
- `src/app/api/admin/demo/images/route.ts`
- `src/app/api/admin/demo/status/route.ts`
- `src/app/api/admin/auth/login/route.ts`
- `src/app/api/admin/auth/logout/route.ts`
- `src/app/api/admin/auth/session/route.ts`

Supporting feature modules reviewed for route ownership context:

- `src/features/settings/services/settings.service.ts`
- `src/features/employees/employee.service.ts`
- `src/features/admin-users/admin-user.service.ts`
- `src/features/admin-roles/admin-role.service.ts`

No dedicated `src/features/operations/**` route tree exists yet. Operations mutations are currently spread across admin users/roles, employees, settings, and demo bootstrap routes.

## Routes Updated

13 mutation methods across 12 route files now call `requireAdminPermission()` before validation and writes:

| Route | Method | Permission | Notes |
| --- | --- | --- | --- |
| `/api/admin/users` | `POST` | `operations/create` | create admin user |
| `/api/admin/users/:id` | `PATCH` | `operations/update` | update admin user |
| `/api/admin/users/:id/reset-password` | `POST` | `operations/admin` | password administration |
| `/api/admin/roles` | `POST` | `operations/create` | create custom role |
| `/api/admin/roles/:id` | `PATCH` | `operations/admin` | role meta + permission assignment |
| `/api/employees` | `POST` | `operations/create` | create employee |
| `/api/employees/:id` | `PATCH` | `operations/update` | update employee |
| `/api/settings/branding` | `PATCH` | `operations/update` | branding settings write |
| `/api/settings/company` | `PATCH` | `operations/update` | company settings write |
| `/api/settings/trust` | `PATCH` | `operations/update` | trust metrics settings write |
| `/api/admin/demo/seed` | `POST` | `operations/admin` | demo/bootstrap seed |
| `/api/admin/demo/seed` | `DELETE` | `operations/delete` | demo content removal |
| `/api/admin/demo/images` | `POST` | `operations/admin` | demo image refresh |

Existing `canManageUsers` and `canManageRolesPermissions` checks remain after the guard for authenticated authorization behavior. Employee and settings mutation routes previously had no admin session gate; they now fail with normalized `401` when unauthenticated.

## Public Reads Preserved

These public or frontend-required GET handlers were not guarded:

- `GET /api/settings/branding`
- `GET /api/settings/company`
- `GET /api/settings/trust`
- `GET /api/settings/homepage`
- `GET /api/employees`
- `GET /api/employees/:id`

Public homepage and layout rendering can continue loading branding and company settings through the existing read endpoints.

## Routes Intentionally Deferred

- `/api/settings/homepage` `PATCH`: Content Platform homepage CMS mutations belong to CTO-7F and may overlap with revenue-launch frontend work.
- `/api/admin/auth/login` and `/api/admin/auth/logout`: public auth utilities.
- `/api/admin/permissions` `GET`: read-only permission catalog; no mutation handler present.
- `/api/admin/demo/status` `GET`: read-only demo status.
- Notifications, audit logs, generic import/export jobs, and system job routes: no Operations-owned mutation routes were found in this repository snapshot.
- Full concrete `operations.*` permission-code enforcement remains deferred until platform/action pairs map to `AdminPermission` codes.
- Operations GET list/detail routes for users, roles, employees, and settings admin pages remain outside this mutation sprint.

## Guard / Action Mapping

| Operation class | Platform | Action |
| --- | --- | --- |
| create user/role/employee | `operations` | `create` |
| update user/employee/company/branding/trust settings | `operations` | `update` |
| role permission assignment, password reset, demo seed/images | `operations` | `admin` |
| demo content delete | `operations` | `delete` |
| export/download logs/jobs/settings | `operations` | `export` (no matching route in this sprint) |

## Risks

- Settings mutation routes previously accepted unauthenticated writes. CTO-7E now requires an authenticated admin session, but concrete role/action enforcement is still deferred.
- `/api/admin/roles/:id` `PATCH` uses `operations/admin` because the same handler can assign permissions and update role metadata.
- Employee `GET` routes remain unguarded for existing admin UI consumption patterns; a future read-permission sprint should review whether employee directory reads should require admin auth.
- Homepage CMS mutations remain unguarded and should be handled in CTO-7F with explicit Content Platform ownership.

## Smoke Checks

Recommended smoke targets for this sprint:

- public homepage `/` still loads branding/company settings
- `/admin/login`
- `/admin/settings` or equivalent settings workspace, if seeded admin credentials are available
- `/admin/settings/users` or equivalent users workspace, if available
- unauthenticated `POST /api/admin/users` returns normalized `401`
- unauthenticated `PATCH /api/settings/branding` returns normalized `401`
- public `GET /api/settings/branding` and `GET /api/settings/company` remain available

## Next Recommended Sprint

CTO-7F should harden Content Platform mutations, including homepage CMS writes under `/api/settings/homepage`, while avoiding conflicts with revenue-launch frontend work.

Recommended Operations follow-up items:

- map `operations.create`, `operations.update`, `operations.delete`, `operations.admin`, and `operations.export` to concrete `AdminPermission` codes
- add route-level tests for unauthenticated, staff, and owner-like sessions on users/roles/employees/settings mutations
- review Operations read routes for admin list/detail/export hardening
- add guards when notifications, audit logs, or generic job/import routes are introduced
