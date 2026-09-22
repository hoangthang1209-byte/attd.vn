# 10. Module Ownership Map

Minimize conflicts with CRM, Quotation, and Mobile UX lanes.

## Lane ownership (Order & Production Operations)

| Area | Own (modify in OP lane) | Coordinate (read/consume) | Do not touch |
|------|-------------------------|---------------------------|--------------|
| Order CRUD & status | `src/features/orders/order.service.ts`, `order-status.ts` | — | Payment recording logic |
| Order UI | `src/components/admin/orders/**` | Mobile shared components | Quote editor |
| Quote conversion | — | `order-conversion.service.ts` (Quotation) | Quote pricing |
| Production execution | `production-execution.service.ts`, readiness/handover | Lean Ops services | Workflow template admin |
| Production UI | `src/components/admin/production/**` (order-linked) | `production-planning/`, `item-production/` | Manufacturing tech pack mutations |
| Delivery execution | `delivery-execution.service.ts`, delivery UI sections | Carrier/method master CRUD | — |
| Operations dashboard | `OperationsDashboard` tiles (order/production/delivery) | CRM widgets | Settings/admin users |
| Notifications | Order/production notification types | `notification-center.service.ts` core | Sales follow-up types |
| Docs | `docs/orders-production/**` | — | Other lane docs |

## File tree reference

### Primary — OP lane

```
src/features/orders/
  order.service.ts
  order-status.ts
  order-conversion.service.ts          # coordinate with Quotation
  order-operations.service.ts
  order-list-dashboard.service.ts
  production-pack.service.ts
  production-readiness.service.ts
  handover-readiness.service.ts
  delivery-fulfillment.service.ts
  production-execution.service.ts
  production-stage.service.ts
  delivery-execution.service.ts
  delivery-execution-board.service.ts
  execution-board.service.ts
  production-sheet/
  delivery-note/

src/components/admin/orders/
src/components/admin/delivery/
src/app/(backend)/admin/orders/
src/app/(backend)/admin/delivery/
src/app/api/orders/
```

### Shared — coordinate before changing

```
src/features/production-planning/       # Production plan domain
src/features/item-production-tracking/  # Lean Ops domain
src/features/delivery/                  # Method/carrier master data
src/features/sales/opportunities/       # CRM handover
src/components/admin/production/        # Shared production managers
src/app/(backend)/admin/production/
src/app/(backend)/admin/manufacturing/
src/app/api/production/
src/app/api/manufacturing/
```

### Other lanes — do not modify in OP work

```
src/features/pricing/                   # Pricing Engine
src/features/payments/                  # Payment lane
src/features/invoices/                  # Accounting lane
src/features/auth/                      # Auth lane
src/components/admin/quotes/            # Quotation lane
src/features/crm/                       # CRM lane
src/features/quotes/                    # Quotation lane (except read)
```

## API route ownership

| Prefix | Owner lane | OP lane typical change |
|--------|------------|------------------------|
| `/api/orders/*` | Operations (orders) | Yes |
| `/api/production/*` | Operations (production) | Coordinate |
| `/api/manufacturing/production-items/*` | Manufacturing + Operations | Coordinate |
| `/api/quotes/*` | Quotation | No |
| `/api/crm/*` | CRM | No |
| `/api/payments/*` | Payment | No |

## Prisma models

| Model group | OP lane may extend (additive) | Requires cross-lane review |
|-------------|-------------------------------|----------------------------|
| Order, OrderItem, OrderItemVariant | Yes | Financial fields |
| OrderActivity | Yes (metadata) | — |
| ProductionPlan, ItemProduction* | Coordinate | Manufacturing |
| OrderDeliveryExecution* | Yes | — |
| Quote, Customer, Lead | No | CRM/Quotation |

## Conflict prevention checklist

Before opening a Phase 2 PR:

1. List files changed — if any path is in "Other lanes", stop and split PR.
2. If touching `order-conversion.service.ts`, notify Quotation lane reviewer.
3. If touching shared production components, check Manufacturing lane open PRs.
4. If adding mobile components, import from Mobile UX shared folder when available.
5. Update this ownership map if new modules are introduced.

## Suggested CODEOWNERS alignment (future)

Not implemented in Phase 1. Recommend adding:

```
/docs/orders-production/     @ops-lane
/src/features/orders/        @ops-lane
/src/components/admin/orders/ @ops-lane
```

Human decision — outside Phase 1 scope.
