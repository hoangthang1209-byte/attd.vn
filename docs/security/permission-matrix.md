# ATTD.vn Permission Matrix

Date: 2026-07-05
Status: Initial CTO-3 baseline

## Purpose

This document is the official starting point for ATTD.vn platform/action permissions. It reflects the current system where possible and marks the intended target state where current coverage is incomplete.

Middleware/proxy is defense-in-depth only. Every mutation route must enforce authorization in the route handler or platform service.

## Role Groups

| Role group | Current meaning | Target boundary |
|---|---|---|
| Public Visitor | Anonymous website visitor. | May view public pages and submit public lead/dealer forms only. |
| Public Token Viewer | Holder of quote/order/tech-pack document token or link. | Read-only, token-scoped, data-minimized document access. |
| Dealer Portal User | Authenticated B2B portal account. | Scoped to the dealer company session and approved account state. |
| Dealer Company Owner | Dealer account owner/manager equivalent. | Manage company RFQs, users, profile, and pricing visibility when approved. |
| Dealer Company Manager | Dealer operations manager. | Manage RFQs and company workflow within owned company. |
| Dealer Company Sales | Dealer sales user. | Create/update RFQs and view company commercial context. |
| Dealer Company Purchasing | Dealer purchasing user. | View pricing/resources and create/update RFQs. |
| Dealer Company Viewer | Read-only dealer user. | View portal records for owned company only. |
| Admin User | Authenticated admin/staff user. | Permissions derive from role grants in `AdminPermission`. |
| Sales Admin | Legacy/current sales staff role. | CRM, quotes, orders, financial read where granted. |
| Content Admin | CMS/content operator. | Content, media, SEO, homepage, knowledge-base where granted. |
| Warehouse / Production | Production, warehouse, QC, and delivery staff. | Manufacturing, materials, production, QC, delivery with scoped financial redaction. |
| Super Admin | Owner-like session or all-permission admin. | Full platform/action access and admin operations. |

## Permission Levels

| Level | Meaning |
|---|---|
| none | No access. |
| view | Read/list/detail access. |
| create | Create records or start workflows. |
| update | Modify records or workflow state. |
| delete | Delete/archive/destructive mutation. |
| approve | Approve/reject/publish/release privileged state. |
| export | Export/download/bulk extract access. |
| admin | Platform administration, roles, settings, or elevated destructive control. |

## Platform Permission Matrix

Legend: `C` = current explicit or legacy coverage exists; `T` = target permission required; `-` = none.

| Platform | Public Visitor | Public Token Viewer | Dealer User | Admin User | Sales Admin | Content Admin | Warehouse / Production | Super Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | - | - | view portal dashboard | C/T view | C view | C view | C view | admin |
| CRM Platform | create public lead only | - | linked RFQ/customer context only | C/T view/create/update | C view/create/update | - | - | admin |
| Commercial Platform | public quote request only | T view token document | RFQ/order/quote portal view where owned | C/T view/create/update | C view/create/update | - | production-visible subsets | admin |
| Product Platform | view public catalog | product snapshots only | view portal catalog/pricing where approved | C/T view/create/update/delete | view | content edit where granted | view production-linked products | admin |
| Dealer Platform | submit dealer registration | - | C/T own company/RFQ scope | C/T admin dealer management | view/update RFQ where granted | - | - | admin |
| Manufacturing Platform | public evidence strips only | quote/order evidence subset only | - | C/T view/create/update/delete/approve | view linked readiness | media subset | C view/update/QC/warehouse | admin |
| Tech Pack Platform | - | token-scoped tech-pack doc only | - | C/T view/create/update/delete/approve | view linked quote/order tech data | - | C view/update production bridge | admin |
| Content Platform | view public content | - | portal resources only | C/T view/create/update/delete/publish | - | C/T admin | - | admin |
| Business Intelligence | - | - | company portal summary | T view/export | C/T view | content analytics target | production dashboards | admin |
| Operations Platform | - | - | own portal session/profile | C/T users/roles/settings/employees | limited employee view | settings where granted | delivery/employee subsets | admin |
| AI Platform | - | - | - | T view/create/update/admin | CRM assistant target | C/T knowledge/prompt/SEO AI | manufacturing knowledge target | admin |
| Growth Platform | public attribution only | - | referral target later | T view/create/update/export | campaign lead view target | campaign/content target | - | admin |

## Current Admin Permission Codes

The current catalog is `src/features/auth/admin-permission-catalog.ts`. Important existing codes include:

- Dashboard: `dashboard.view`
- CRM/customers/leads: `crm.view`, `customers.*`, `leads.*`
- Commercial: `quotes.*`, `pricing.manage`, `orders.*`, `orders.view_financials`, `payments.*`
- Manufacturing/warehouse/production: `production.*`, `qc.update`, `warehouse.*`, `purchasing.view`, `manufacturingAsset.*`, `manufacturingCategory.manage`, `manufacturingWorkflow.manage`, `manufacturingDisplayLocation.manage`
- Product/content/settings: `products.*`, `categories.manage`, `media.*`, `cms.manage`, `reports.view`, `settings.manage`
- Operations: `employees.manage`, `roles_permissions.manage`, `users.manage`

Current gaps:

- No first-class `export` permission yet.
- No explicit `approve` level for many state transitions outside manufacturing asset publish.
- Dealer portal roles exist in Prisma enums but are not fully mapped to per-action permissions.
- Public token field exclusion is not yet covered by automated tests.
- Several mutation route handlers rely on middleware coverage rather than explicit handler/service checks.

## Required Rules

- Middleware/proxy is not enough for mutations.
- Every `POST`, `PATCH`, `PUT`, and `DELETE` admin route must check server-side admin permission.
- Every dealer mutation must check dealer session and dealer company ownership.
- Public token routes must be read-only and data-minimized.
- Public token routes must never expose internal notes, margins, costs, staff-only metadata, or unrelated customer data.
- Export routes require explicit export permission later.
- Destructive actions require elevated permission later.
- Financial data must use redaction helpers when staff permissions are incomplete.
- Permission failures should migrate toward normalized `{ ok:false,error:{code,message,details} }` responses.

## Public Token Forbidden Fields

These fields must not be exposed through public-token routes or public document payloads:

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

This list is mirrored in `src/lib/permissions/permission-registry.ts`.

## Target Implementation Plan

1. Keep the current catalog as truth for existing admin behavior.
2. Add platform/action permission constants for new work.
3. Add route-level permission metadata for mutation routes.
4. Add tests proving middleware bypass cannot mutate protected data.
5. Add public-token data-minimization tests.
6. Add dealer portal role/action matrix and company ownership tests.
7. Introduce export and destructive-action permissions before expanding bulk operations.
