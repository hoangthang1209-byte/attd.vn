# Order & Production Operations — Phase 1 Audit

**Issue:** [#105 — Order & Production Operations Phase 1](https://github.com/hoangthang1209-byte/attd.vn/issues/105)  
**Date:** 2026-09-22  
**Risk level:** Low (analysis-only; no runtime or schema changes)  
**Lane:** Order & Production Operations

## Purpose

Phase 1 is **analysis-first**. This folder documents the current end-to-end operational flow after quotation:

```
Lead → Customer → Quote → Order → Production → Delivery → Completion
```

The goal is to distinguish **existing capability** from **real gaps** so Phase 2 implementation stays business-first, additive, and aligned with CRM, Quotation, and Mobile UX lanes.

## Executive summary

| Area | Maturity | Summary |
|------|----------|---------|
| Order intake | **Strong** | Manual, quick, and quote→order paths exist with validation, BOM seed, and cost continuity |
| Order workspace | **Moderate–Strong** | `OrderWorkspaceShell` with summary cards, production panel, and milestone strip already exist; gaps are next-action rollup, quote link prominence, and execution-first delivery card |
| Production handoff | **Moderate** | Lean Ops timeline + legacy stages + production plan coexist; initialization is manual |
| Production visibility | **Moderate** | Multiple boards/plan views with KPIs; overlapping entry points |
| Delivery handoff | **Moderate** | Execution model with fulfillment gates; order header fields can diverge |
| Mobile operations | **Weak** | Order form sticky bar only; no field-optimized production/delivery UX |
| CRM / quote continuity | **Strong** | Idempotent conversion, CRM activity, opportunity handover |
| Operational signals | **Partial** | List KPIs + notification center (overdue delivery); no production-at-risk alerts |

**Key architectural finding:** three overlapping production execution layers (Lean Ops item tracking, legacy order-item stages, production plan) bridged by `production-execution.service.ts`. Order-level status is **not automatically synced** from item production or delivery execution completion.

**Phase 2 recommendation:** consolidate operator navigation around **Order Workspace + Production Plan + Delivery Board**, harden handoff gates without weakening overrides, and coordinate mobile polish with the Internal Admin Mobile UX lane.

## Deliverables index

| # | Document | Contents |
|---|----------|----------|
| 1 | [01-workflow-map.md](./01-workflow-map.md) | Current operator workflow from quote acceptance through completion |
| 2 | [02-capability-inventory.md](./02-capability-inventory.md) | Routes, services, models, and APIs by domain |
| 3 | [03-business-ux-gaps.md](./03-business-ux-gaps.md) | Business and UX gaps vs Phase 1 goals |
| 4 | [04-status-state-map.md](./04-status-state-map.md) | Order, production, plan, and delivery state machines |
| 5 | [05-data-continuity-risks.md](./05-data-continuity-risks.md) | Quote→order, CRM, costing, and execution continuity risks |
| 6 | [06-mobile-friction-points.md](./06-mobile-friction-points.md) | Mobile usability audit and coordination notes |
| 7 | [07-recommended-architecture.md](./07-recommended-architecture.md) | Recommended primitives and lane boundaries |
| 8 | [08-prioritized-roadmap.md](./08-prioritized-roadmap.md) | OP2–OP10 roadmap with priorities |
| 9 | [09-phase-2-acceptance-criteria.md](./09-phase-2-acceptance-criteria.md) | Suggested acceptance criteria for Phase 2 intake |
| 10 | [10-module-ownership-map.md](./10-module-ownership-map.md) | File/module ownership to minimize cross-lane conflicts |

## Guardrails (unchanged)

Phase 1 did **not** modify:

- Pricing formulas, VAT/margin/cost calculations
- Accounting, invoice, payment, banking, SePay, reconciliation
- Auth or permission model
- Destructive migrations or data rewrites
- Public website, PWA, or native apps

## Related documentation

- [Development workflow](../development-workflow.md)
- [Architecture](../engineering/architecture.md)
- [Permission matrix](../security/permission-matrix.md)
- [CTO-7E Operations mutation hardening](../audits/CTO-7E-operations-mutation-hardening.md)
