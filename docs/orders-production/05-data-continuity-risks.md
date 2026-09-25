# 5. Data Continuity Risks

## Quote → Order

| Risk | Severity | Detail | Mitigation (Phase 2+) |
|------|----------|--------|----------------------|
| Single order per quote | Low | `quoteId` unique — intentional idempotency | Document in operator training |
| Cost snapshot drift | Medium | `buildOrderItemQuotedCostSnapshot()` captures at conversion; later quote edits don't flow | Show "quoted at conversion" indicator; optional re-sync with approval |
| Variant matrix mismatch | Low | Seeded from quote color/size snapshots | Validate matrix totals on conversion confirmation UI |
| BOM stale on order | Medium | `copyProductBomToOrderItems()` at create only | OP5: "Refresh BOM from product" action with audit |
| Status stuck at NEW | Medium | No auto-confirm after conversion | OP4: guided confirm step |

## CRM continuity

| Risk | Severity | Detail | Mitigation |
|------|----------|--------|------------|
| Orphan orders | Low | Customer/lead snapshots on order header | Existing CRM links preserved |
| Activity gap | Low | CRM activity on conversion; order activity separate | OP3: cross-link activity tab entries |
| Opportunity without quote | Medium | Handover uses `relaxAcceptedStatus` | Validate WON → quote → order chain in CRM lane |

## Production execution dual models

| Risk | Severity | Detail | Mitigation |
|------|----------|--------|------------|
| Lean Ops vs legacy divergence | **High (ops)** | Same order may use legacy stages or Lean Ops depending on init timing | OP5: init prompt on CONFIRMED; deprecate legacy path for new orders |
| Readiness bypass | Medium | Overrides weaken checklist enforcement | Strengthen audit metadata; require role for override |
| Approval bypass | Medium | `OrderItemProductionApprovalBypass` exists | Retain audit trail; surface in workspace |
| Plan vs timeline desync | Medium | ProductionPlan and ItemProductionTracking updated independently | Single execution bundle already exists — expose unified state in UI |

## Delivery data

| Risk | Severity | Detail | Mitigation |
|------|----------|--------|------------|
| Header vs execution divergence | **High (ops)** | Order delivery header fields vs `OrderDeliveryExecution` records — header `shippedAt`/`deliveredAt` set on order status transition to SHIPPED, not when execution reaches DELIVERED | OP8: workspace shows execution as source of truth; header as summary |
| Carrier/method snapshot | Low | Snapshots stored on order at assignment | Master data edits don't retroactively change orders — expected |
| Legacy delivery skip | Medium | Legacy orders skip execution requirements | Migration path to create executions for active legacy orders |

## Financial continuity (read-only in this lane)

| Risk | Severity | Detail | Note |
|------|----------|--------|------|
| Payment tab vs order status | Low | Payments independent of production status | Do not change in OP lane |
| Actual cost close | Low | Post-completion costing | Coordinate with Commercial lane |

## Audit & attribution

| Risk | Severity | Detail | Mitigation |
|------|----------|--------|------------|
| No actor on OrderActivity | Medium | Model lacks `actorId`; UI shows title/detail only | Additive schema + backfill optional in later phase |
| Inconsistent override metadata | Medium | Reasons in free-text detail | Structured JSON metadata on activity records |
| R2 file preview | Low | Production files on R2 not previewable in sheet | Infrastructure lane; document limitation |

## Schema change policy

Phase 2+ schema work in this lane must be:

- **Additive only** unless explicit HIGH_RISK_APPROVED
- Documented in PR with rollback plan
- Tested against dev database only

No destructive migrations identified as required for Phase 2 UX improvements.
