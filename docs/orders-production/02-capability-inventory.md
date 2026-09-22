# 2. Current Capability Inventory

## Admin routes

### Orders

| Route | Component | Capability |
|-------|-----------|------------|
| `/admin/orders` | `OrderListManager` | KPI dashboard, filters, search, pagination |
| `/admin/orders/new` | `OrderForm` | Full manual create |
| `/admin/orders/new/quick` | `QuickOrderForm` | Bulk/spreadsheet entry, Excel import |
| `/admin/orders/[id]` | `OrderDetailView` | Workspace: products, info, delivery, payment, activity, notes |
| `/admin/orders/[id]/edit` | `OrderForm` | Edit (financial admin permission required) |
| `/admin/orders/[id]/production-sheet` | Document view | Production sheet HTML/PDF |
| `/admin/orders/[id]/delivery-note` | Document view | Delivery note (requires `executionId`) |

**Key UI modules:** `src/components/admin/orders/` — workspace shell, forms, execution sections, document components.

### Production

| Route | Component | Capability |
|-------|-----------|------------|
| `/admin/production` | `ProductionDashboardManager` | KPI sections, navigation |
| `/admin/production/plan` | `ProductionPlanManager` | Primary jobs list — plan status, docs, materials, QC |
| `/admin/production/jobs/[orderItemId]` | `ProductionJobDetailView` | Per-item job workspace |
| `/admin/production/jobs` | Redirect | → `/admin/production/plan` |
| `/admin/production/board` | `ProductionItemBoardManager` | Item-level kanban |
| `/admin/production/orders-board` | `ProductionBoardManager` | Order-level board |
| `/admin/manufacturing/production-timeline` | `ItemProductionTimelineManager` | Lean Ops timeline |
| `/admin/operations` | `OperationsDashboard` | Cross-functional summary |

### Delivery master data

| Route | Component | Capability |
|-------|-----------|------------|
| `/admin/delivery` | `DeliveryBoardManager` | Operational delivery board |
| `/admin/delivery-methods` | CRUD | `DeliveryMethod` master data |
| `/admin/delivery-carriers` | CRUD | `DeliveryCarrier` master data |

## Domain services

### Orders (`src/features/orders/`)

| Service | Responsibility |
|---------|----------------|
| `order.service.ts` | CRUD, status transitions, payments, list queries |
| `order-conversion.service.ts` | Quote → order (idempotent) |
| `order-operations.service.ts` | Production & delivery board data |
| `order-list-dashboard.service.ts` | List KPIs |
| `production-pack.service.ts` | Files, BOM copy, material requirements |
| `production-readiness.service.ts` | Pre-`IN_PRODUCTION` checklist |
| `handover-readiness.service.ts` | Pre-`READY_TO_SHIP` checklist |
| `delivery-fulfillment.service.ts` | Pre-`SHIPPED` / `COMPLETED` checks |
| `production-execution.service.ts` | Unified execution bundle (Lean Ops bridge) |
| `production-stage.service.ts` | Legacy shop-floor stages |
| `delivery-execution.service.ts` | Multi-execution shipment model |
| `delivery-note/delivery-note.service.ts` | Delivery note view model + PDF |
| `production-sheet/production-sheet.service.ts` | Production sheet view model + PDF |
| `qc-inspection.service.ts` | QC inspections and evidence |
| `order-actual-cost.service.ts` | Post-order actual costing |

### Production planning (`src/features/production-planning/`)

| Service | Responsibility |
|---------|----------------|
| `production-plan.service.ts` | Plan CRUD, board columns, dashboard KPIs, eligibility |

### Lean Ops (`src/features/item-production-tracking/`)

| Service | Responsibility |
|---------|----------------|
| `item-production.service.ts` | Tracking init, stage progress, risk, batches |
| `production-approval.service.ts` | Artwork/sample release gates |

### Delivery master data (`src/features/delivery/`)

| Service | Responsibility |
|---------|----------------|
| `delivery-method.service.ts` | Method CRUD + snapshots |
| `delivery-carrier.service.ts` | Carrier CRUD + snapshots |

### CRM handover (`src/features/sales/opportunities/`)

| Service | Responsibility |
|---------|----------------|
| `order-handover.service.ts` | Opportunity → order draft via quote conversion |

## API surface (representative)

### Orders (`src/app/api/orders/`)

~51 routes including: CRUD, status, payments, production stages/files, delivery executions, QC, materials, actual cost, documents/PDF, dashboard, boards.

Notable endpoints:

- `POST /api/orders/from-quote/[quoteId]` — quote conversion
- `PATCH /api/orders/[id]/status` — gated status transitions
- `GET/POST .../production-execution` — execution bundle
- `.../delivery-executions/*` — shipment lifecycle

### Production / manufacturing

- `/api/production/dashboard`, `/api/production/board`, `/api/production/plan/*`
- `/api/orders/production-board`
- `/api/manufacturing/production-items/*` — Lean Ops CRUD, batches, stages, issues
- `POST /api/manufacturing/production-items/initialize-from-order` — Lean Ops init

## Data models (Prisma)

### Order graph

| Model | Role |
|-------|------|
| `Order` | Commercial header, ownership, delivery snapshots, timestamps |
| `OrderItem` | Line items, supply/processing classification |
| `OrderItemVariant` | Color/size matrix |
| `OrderPayment` | DEPOSIT / PAYMENT / REFUND / ADJUSTMENT |
| `OrderActivity` | Audit trail |
| `OrderActualCostEntry`, `OrderActualCostClose` | Post-order costing |

### Production

| Model | Role |
|-------|------|
| `ProductionPlan` | 1:1 with `OrderItem` — planning layer |
| `OrderProductionStage` | Legacy per-item stages |
| `OrderQcInspection`, `OrderQcEvidence` | QC |
| `OrderProductionFile` | Document pack (order or item scoped) |
| `OrderItemProductionApproval` | Release gates |
| `OrderItemMaterialRequirement`, `OrderMaterialAllocation` | BOM / stock |
| `ItemProductionTracking` | Lean Ops header |
| `ItemProductionStage`, `ItemProductionBatch`, `ItemProductionIssue` | Timeline detail |
| `ItemProductionWorkflowTemplate` | Configurable stage sequences |

### Delivery

| Model | Role |
|-------|------|
| `DeliveryMethod`, `DeliveryCarrier` | Master data |
| `OrderDeliveryExecution` | Shipment batch |
| `OrderDeliveryExecutionItem` | Line qty tracking |
| `OrderDeliveryAttempt` | Delivery attempts |
| `OrderDeliveryProof` | Photo/receipt evidence |

## Permissions

From `admin-permission-catalog.ts` and route guards:

| Domain | Permissions |
|--------|-------------|
| Orders | `orders.view`, `orders.create`, `orders.update`, `orders.delete`, `orders.assign`, `orders.view_financials` |
| Production | `production.view`, `production.update` |
| Manufacturing | `manufacturing.production.view/create/update/assign/manage_workflows` |

Financial pages (order edit/create) use `requireFinancialAdminPage` via `order-financial-permissions.ts`.

## Notifications & activity

| Mechanism | Coverage |
|-----------|----------|
| `OrderActivity` | Create, status, payment, production, delivery, notes, overrides |
| `CRMActivity` | Quote conversion status on linked lead/customer |
| `notification-center.service` | NEW_ORDER, ORDER_OVERDUE, READY_FOR_HANDOVER |

## Test coverage (reference)

Lean Ops handover behavior documented in tests such as `lean-ops-handover.test.ts`. Production readiness and fulfillment gates have dedicated service tests under `src/features/orders/`.
