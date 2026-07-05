# CTO-7B CRM Mutation Hardening Audit

Date: 2026-07-05
Status: Completed focused hardening sprint

## Scope

CTO-7B applied the CTO-4 `requireAdminPermission()` pattern to CRM Platform mutation routes and CRM high-risk admin-adjacent mutation routes identified in CTO-3. This sprint did not change CRM business logic, Prisma models, route names, UI, Dealer routes, Product routes, Commercial routes, or the pre-existing local quote/manufacturing-evidence/CSS work.

The guard remains transitional per `docs/security/permission-guard-foundation.md`: unauthenticated requests receive normalized permission errors, owner-like super admin sessions pass, and authenticated admin/staff sessions pass until later action-level permission enforcement lands.

## CRM Route Files Inspected

30 route files were inspected:

- `src/app/api/admin/revenue-categories/[id]/route.ts`
- `src/app/api/admin/revenue-categories/route.ts`
- `src/app/api/admin/sales/[id]/default/route.ts`
- `src/app/api/admin/sales/[id]/route.ts`
- `src/app/api/admin/sales/[id]/toggle-active/route.ts`
- `src/app/api/admin/sales/route.ts`
- `src/app/api/crm/activities/route.ts`
- `src/app/api/crm/contacts/route.ts`
- `src/app/api/crm/customers/[id]/contacts/[contactId]/route.ts`
- `src/app/api/crm/customers/[id]/contacts/[contactId]/set-primary/route.ts`
- `src/app/api/crm/customers/[id]/contacts/route.ts`
- `src/app/api/crm/customers/[id]/route.ts`
- `src/app/api/crm/customers/route.ts`
- `src/app/api/crm/leads/[id]/convert/route.ts`
- `src/app/api/crm/leads/[id]/link-customer/route.ts`
- `src/app/api/crm/leads/[id]/notes/route.ts`
- `src/app/api/crm/leads/[id]/route.ts`
- `src/app/api/crm/leads/route.ts`
- `src/app/api/crm/overview/route.ts`
- `src/app/api/crm/product-interests/route.ts`
- `src/app/api/crm/reports/customers/route.ts`
- `src/app/api/crm/reports/overview/route.ts`
- `src/app/api/crm/reports/pipeline/route.ts`
- `src/app/api/crm/reports/sales/export/route.ts`
- `src/app/api/crm/reports/sales/route.ts`
- `src/app/api/crm/reports/sources/export/route.ts`
- `src/app/api/crm/reports/sources/route.ts`
- `src/app/api/crm/whatsapp-assistant/analyze/route.ts`
- `src/app/api/crm/whatsapp-assistant/leads/route.ts`
- `src/app/api/leads/route.ts`

## Routes Updated

24 mutation methods now call `requireAdminPermission()` before validation/writes. Two CRM report export GET handlers were also guarded because CTO-3 flagged them and CTO-7B defines CRM export mapping.

| Route | Methods | Permission |
| --- | --- | --- |
| `/api/crm/activities` | `POST` | `crm/create` |
| `/api/crm/contacts` | `POST`, `PATCH` | `crm/create`, `crm/update` |
| `/api/crm/customers` | `POST` | `crm/create` |
| `/api/crm/customers/:id` | `PATCH` | `crm/update` |
| `/api/crm/customers/:id/contacts` | `POST` | `crm/create` |
| `/api/crm/customers/:id/contacts/:contactId` | `PATCH`, `DELETE` | `crm/update`, `crm/delete` |
| `/api/crm/customers/:id/contacts/:contactId/set-primary` | `POST` | `crm/update` |
| `/api/crm/leads` | `POST` admin-mode branch only | `crm/create` |
| `/api/crm/leads/:id` | `PATCH` | `crm/update` |
| `/api/crm/leads/:id/notes` | `POST` | `crm/create` |
| `/api/crm/leads/:id/convert` | `POST` | `crm/update` |
| `/api/crm/leads/:id/link-customer` | `POST` | `crm/update` |
| `/api/crm/product-interests` | `POST` | `crm/create` |
| `/api/crm/whatsapp-assistant/analyze` | `POST` | `crm/admin` |
| `/api/crm/whatsapp-assistant/leads` | `POST` | `crm/create` |
| `/api/admin/sales` | `POST` | `crm/create` |
| `/api/admin/sales/:id` | `PATCH` | `crm/update` |
| `/api/admin/sales/:id/default` | `POST` | `crm/update` |
| `/api/admin/sales/:id/toggle-active` | `POST` | `crm/update` |
| `/api/admin/revenue-categories` | `POST` | `crm/create` |
| `/api/admin/revenue-categories/:id` | `PATCH`, `DELETE` | `crm/update`, `crm/delete` |
| `/api/crm/reports/sales/export` | `GET` | `crm/export` |
| `/api/crm/reports/sources/export` | `GET` | `crm/export` |

## Public Routes Left Unguarded

- `/api/leads` remains public. It is used for website/product inquiry lead capture and should receive separate public validation/rate-abuse hardening, not admin permission.
- `/api/crm/leads` has a mixed `POST` handler. CTO-7B guarded only the explicit `adminMode === true` branch and left the public-style lead creation branch unchanged to avoid breaking existing lead capture.

## Routes Intentionally Deferred

- Ordinary CRM GET list/detail/report routes were not guarded in this mutation hardening sprint.
- Dealer and dealer-lead routes were not touched; those belong to the Dealer Platform hardening sprint.
- Full concrete role/action enforcement for `crm.create`, `crm.update`, `crm.delete`, `crm.export`, and `crm.admin` remains deferred until the permission registry maps platform/action pairs to `AdminPermission` codes.
- Public lead capture should get a separate anti-abuse sprint covering rate limits, validation allowlists, bot signals, and telemetry.

## Notable Risks

- `/api/crm/leads` still combines public capture and admin creation in one handler. The admin branch is now guarded, but the route should eventually split public and admin responsibilities.
- CRM report exports now have normalized unauthenticated failures before the existing report-scope check. Authorized report scope behavior is unchanged.
- WhatsApp assistant analysis is not a database write, but it accepts CRM-sensitive chat content and is guarded as `crm/admin`.
- Admin sales and revenue-category APIs remain CRM-adjacent ownership boundaries. CTO-7B guarded them because CTO-3 identified them as CRM high-risk, but a future source-boundary sprint should decide whether these routes move under a clearer CRM/Operations home.

## Next Recommended Sprint

CTO-7C should harden Commercial Platform mutations, then a later CRM follow-up should add concrete permission enforcement and route-level tests for unauthenticated, staff, and owner-like sessions.

Recommended CRM follow-up items:

- split public lead capture from admin CRM lead creation;
- add direct route-handler tests for guarded CRM mutations;
- add concrete `AdminPermission` mapping for `crm.create`, `crm.update`, `crm.delete`, `crm.export`, and `crm.admin`;
- add public lead capture abuse/rate-limit controls;
- review whether admin sales/revenue-category ownership should stay under CRM.

## Validation Notes

Required validation for this sprint:

```bash
npm run security:public-token
npx tsc --noEmit
npm run build
git diff --check
git diff --cached --check
```

Smoke coverage should include public homepage, admin login, CRM leads/admin customer pages, public lead capture reachability, a guarded unauthenticated CRM mutation returning normalized `401`, and existing CRM GET list route behavior.
