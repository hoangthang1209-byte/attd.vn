# 9. Phase 2 Acceptance Criteria (Recommended)

Use these as starting acceptance criteria when opening Phase 2 implementation issues. Adjust per initiative (OP2–OP10).

## Global criteria (all Phase 2 OP work)

- [ ] No changes to pricing formulas, VAT/margin calculations, or Pricing Engine logic
- [ ] No changes to payment, banking, SePay, invoice, or accounting logic
- [ ] No changes to auth/permission model without explicit HIGH_RISK_APPROVED
- [ ] No destructive migrations; additive schema only with documented rollback
- [ ] Existing quote→order idempotency preserved
- [ ] Legacy orders continue to function (readiness/handover bypass paths intact)
- [ ] Changed JS/TS files pass ESLint
- [ ] `npm run typecheck`, `security:public-token`, `npm test --if-present`, `npm run build` pass
- [ ] Vercel Preview verified for user-visible changes
- [ ] `docs/orders-production/` updated if behavior diverges from audit

## OP2 — Order Intake

- [ ] Ops role can update non-financial order fields without financial admin permission
- [ ] Financial fields remain gated
- [ ] Quick order supports touch-friendly entry on 375px viewport
- [ ] Duplicate quote→order prevention unchanged

## OP3 — Order Workspace

- [ ] Order detail shows operational summary: customer, quote link, owners, promised date
- [ ] Next-action chip visible when gate failure or overdue
- [ ] Production and delivery summary cards reflect live service data
- [ ] No regression to payment or actual cost tabs

## OP4 — Quote → Order Continuity

- [ ] Post-conversion prompt captures production/delivery owner and promised date (optional skip)
- [ ] CRM activity visible or linked from order workspace when lead/customer exists
- [ ] Conversion errors surface in Vietnamese with actionable messages

## OP5 — Production Handoff

- [ ] CONFIRMED orders without Lean Ops show initialize prompt
- [ ] Execution panel shows single bundle (plan + Lean Ops or legacy indicator)
- [ ] Production owner visible on plan board from order assignment

## OP6 — Production Board Polish

- [ ] Plan board default view uses business-first status labels
- [ ] Filters: overdue, blocked, assigned to me
- [ ] Navigation docs updated if entry points consolidated

## OP7 — Next Action & Alerts

- [ ] `ORDER_OVERDUE` unchanged; add at least one production-related notification type
- [ ] Orders list shows due date column (sortable or filterable)
- [ ] Next-action resolver unit tested with gate combinations

## OP8 — Delivery Handoff

- [ ] Delivery tab lists executions as primary; header fields labeled as summary
- [ ] SHIPPED transition message references execution state when present
- [ ] Delivery note link available from execution row

## OP9 — Mobile Operations

- [ ] Order detail usable on 375px without horizontal scroll on summary section
- [ ] Status update achievable in ≤3 taps from order detail
- [ ] Reuses shared mobile components from Mobile UX lane (list component names in PR)

## OP10 — Operator QA

- [ ] Written test script executed on Preview
- [ ] No P0/P1 defects open for happy path
- [ ] Sign-off note in PR from operator perspective (role-play checklist)

## Definition of done alignment

Matches [docs/authority/definition-of-done.md](../authority/definition-of-done.md):

- Business behavior documented
- Authorization preserved
- CI green on changed scope
- Human review for medium-risk OP initiatives (OP5, OP8)
