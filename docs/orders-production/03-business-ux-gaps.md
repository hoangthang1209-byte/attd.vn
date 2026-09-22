# 3. Business & UX Gaps

Gaps are assessed against Phase 1 business goals from issue #105.

## Goal: accepted/won work moves into operations cleanly

| Status | Finding |
|--------|---------|
| ✅ Exists | Quote→order conversion is idempotent with cost/BOM continuity |
| ✅ Exists | CRM opportunity handover creates order via quote |
| ⚠️ Gap | Conversion lands at `NEW` — no guided "confirm and hand to production" step |
| ⚠️ Gap | Lean Ops initialization is manual; easy to advance order status without item tracking |

**Recommendation (OP4):** Post-conversion checklist or guided handoff prompt (confirm owner, due date, initialize production).

## Goal: orders easy to create and operate

| Status | Finding |
|--------|---------|
| ✅ Exists | Manual + quick order + quote conversion |
| ✅ Exists | Duplicate-order prevention via unique `quoteId` |
| ⚠️ Gap | Order edit requires financial admin — ops staff may be blocked from line corrections |
| ⚠️ Gap | Quick order optimized for stock SKUs; custom/variant-heavy orders still heavy |

**Recommendation (OP2):** Separate ops-editable fields (qty, dates, notes, owners) from financial fields without weakening pricing integrity.

## Goal: production status visible to sales/operations

| Status | Finding |
|--------|---------|
| ✅ Exists | Production plan KPIs, boards, timeline, order workspace section |
| ⚠️ Gap | Three boards + timeline + plan — operators unsure which is canonical |
| ⚠️ Gap | Order list shows order status, not aggregated item production state |
| ⚠️ Gap | Business-facing labels mixed with implementation statuses (plan sub-statuses) |

**Recommendation (OP6):** Single business-first production summary on order workspace; deprecate redundant nav entry points gradually.

## Goal: surface overdue and next-action states

| Status | Finding |
|--------|---------|
| ✅ Exists | `ORDER_OVERDUE` notification (delivery expected date) |
| ✅ Exists | Production plan risk/KPI indicators |
| ⚠️ Gap | No in-app alert for production blocked, QC failed, or approval pending |
| ⚠️ Gap | Order workspace lacks prominent "next action" chip derived from gates |
| ⚠️ Gap | No owner workload view |

**Recommendation (OP7):** Unified next-action resolver on order workspace + notification extensions.

## Goal: reduce manual coordination

| Status | Finding |
|--------|---------|
| ✅ Exists | Readiness/handover/fulfillment gate services |
| ⚠️ Gap | Order status not synced from item production or delivery execution |
| ⚠️ Gap | Override-with-reason escape hatches reduce gate enforcement |
| ⚠️ Gap | Delivery header fields vs execution records can diverge |

**Recommendation (OP5, OP8):** Optional auto-advance suggestions (not silent auto-status) when all items reach milestone.

## Goal: mobile usability for day-to-day work

| Status | Finding |
|--------|---------|
| ⚠️ Weak | Only order form sticky action bar is mobile-aware |
| ❌ Missing | Production timeline, boards, job detail have no mobile patterns |
| ❌ Missing | No bottom-nav or touch-optimized status updates |

**Recommendation (OP9):** Coordinate with Internal Admin Mobile UX lane — prioritize order open, status update, due/blocker view.

See [06-mobile-friction-points.md](./06-mobile-friction-points.md).

## Goal: preserve quote → order → fulfillment continuity

| Status | Finding |
|--------|---------|
| ✅ Exists | Variant matrix seeded from quote snapshots |
| ✅ Exists | Quoted cost snapshot per line item |
| ⚠️ Gap | Product BOM changes don't sync to existing orders |
| ⚠️ Gap | `OrderActivity` lacks actor attribution in UI |

See [05-data-continuity-risks.md](./05-data-continuity-risks.md).

## Goal: operational KPIs (not BI-heavy)

| Status | Finding |
|--------|---------|
| ✅ Exists | Orders list dashboard KPIs |
| ✅ Exists | Production dashboard sections |
| ⚠️ Gap | No single operational cockpit combining orders in progress, blocked, due this week, ready to ship |
| ⚠️ Gap | `/admin/operations` exists but depth varies vs dedicated boards |

**Recommendation (OP10):** Lightweight operations dashboard tiles wired to existing services — no new analytics warehouse.

## Phase 1 audit vs Phase 2 build

| Category | Phase 1 (this audit) | Phase 2 (future) |
|----------|---------------------|------------------|
| Documentation | ✅ Complete | Maintain as source of truth |
| Schema changes | None | Additive only if strictly necessary |
| Pricing/payment/auth | Untouched | Requires explicit HIGH_RISK_APPROVED |
| UX consolidation | Identified | Implement OP2–OP9 incrementally |
