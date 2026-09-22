# 8. Prioritized Roadmap

Refined from issue #105 suggested roadmap after Phase 1 audit.

## Priority matrix

| ID | Initiative | Priority | Risk | Depends on |
|----|------------|----------|------|------------|
| OP2 | Order Intake / Quick Order UX | P1 | Low | — |
| OP3 | Order Workspace consolidation | P1 | Low | — |
| OP4 | Quote → Order continuity hardening | P1 | Low | CRM/Quotation coordination |
| OP5 | Production handoff + job ownership | P2 | Medium | — |
| OP6 | Production board business-first polish | P2 | Low | OP3 |
| OP7 | Overdue / blocker / next-action workflow | P2 | Low | OP3 |
| OP8 | Delivery handoff | P2 | Medium | OP3 |
| OP9 | Mobile operations polish | P3 | Low | Mobile UX lane |
| OP10 | End-to-end operator QA | P3 | Low | OP2–OP9 subsets |

## OP2 — Order Intake / Quick Order UX

**Problem:** Ops blocked from edits; quick order poor for complex variants.

**Scope:**
- Ops-editable fields without financial permission (dates, owners, notes, non-price qty)
- Quick order mobile-friendly row entry
- Post-create validation summary

**Out of scope:** Pricing formula changes.

## OP3 — Order Workspace

**Problem:** Context spread across tabs, document routes, and boards.

**Scope:**
- Operational summary header (P1 primitive)
- Inline production/delivery summary cards
- Next-action chip
- Link to production sheet / delivery note without leaving workspace

**Out of scope:** Rewriting entire `OrderDetailView` in one PR — incremental extraction.

## OP4 — Quote → Order Continuity

**Problem:** Conversion stops at NEW without guided handoff.

**Scope:**
- Post-conversion confirm dialog (owner, promised date)
- CRM activity cross-link in workspace
- Conversion audit metadata

**Coordinate:** Quotation lane for accept-status rules.

## OP5 — Production Handoff

**Problem:** Manual Lean Ops init; dual execution models.

**Scope:**
- Prompt to initialize Lean Ops on CONFIRMED
- Unified execution panel using `buildProductionExecutionBundle()`
- Owner assignment defaults from order

**Out of scope:** Removing legacy stages (keep for old orders).

## OP6 — Production Board Polish

**Problem:** Too many boards; implementation-heavy labels.

**Scope:**
- Business-first column labels on plan board
- Filter presets: overdue, blocked, my jobs
- Soft-hide redundant nav links with role-based defaults

## OP7 — Overdue / Blocker / Next Action

**Problem:** Signals scattered; weak notifications.

**Scope:**
- `buildOrderOperationalSummary()` service
- Extend notification center: production blocked, approval pending
- Orders list columns: due date, next action

## OP8 — Delivery Handoff

**Problem:** Header vs execution divergence.

**Scope:**
- Execution-first delivery tab
- Ready-to-dispatch checklist from order workspace
- Shipped transition shows execution summary

**Out of scope:** Carrier API integrations.

## OP9 — Mobile Operations Polish

**Problem:** No field-optimized flows.

**Scope:** Per [06-mobile-friction-points.md](./06-mobile-friction-points.md).

**Coordinate:** Internal Admin Mobile UX lane for shared components.

## OP10 — End-to-End Operator QA

**Problem:** Regressions across lanes.

**Scope:**
- Scripted operator test path: quote → order → production → delivery → complete
- Vercel Preview sign-off checklist
- Update this doc folder with as-built notes

## Sequencing recommendation

```
Phase 2a (parallel-safe):  OP2 + OP3 + OP4
Phase 2b:                  OP5 + OP7
Phase 2c:                  OP6 + OP8
Phase 2d:                  OP9 (with Mobile lane)
Phase 2e:                  OP10
```

One active Builder task per lane at a time — do not run OP5 and OP8 in the same PR.
