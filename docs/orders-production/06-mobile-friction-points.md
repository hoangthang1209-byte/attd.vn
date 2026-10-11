# 6. Mobile Friction Points

**Coordination:** Internal Admin Mobile UX lane — reuse shared components; do not duplicate.

## Current mobile support

| Surface | Mobile behavior | Files |
|---------|-----------------|-------|
| Order create/edit | Sticky bottom action bar (submit/cancel) | `OrderMobileActionBar`, `OrderWorkflow.module.css` |
| Order form totals | Inline mobile summary for discount/shipping/VAT | `OrderForm.tsx` |
| Admin layout | General responsive CSS | Admin layout components |
| Order detail workspace | Desktop tab layout — cramped on small screens | `OrderWorkspaceShell.tsx` |
| Production plan/board/timeline | No mobile-specific patterns | `production-planning/`, `item-production/` |
| Delivery board | No mobile-specific patterns | `DeliveryBoardManager` |
| Quick order | Spreadsheet grid — poor touch UX | `QuickOrderForm` |

## Priority mobile flows (from issue #105)

| Flow | Current state | Friction | Phase 2 target (OP9) |
|------|---------------|----------|---------------------|
| Open order quickly | List is responsive; detail tabs hard to scan | Tab overflow, no sticky summary | Order summary header + single-scroll mobile layout |
| Update order/production status | Status modals exist but desktop-oriented | Small touch targets, multi-step gates | Bottom sheet status actions with gate checklist |
| See due date / blocker / next action | Data exists in services | Not surfaced prominently on mobile | Next-action chip + due date banner |
| Upload/inspect production files | File upload exists | R2 preview gap affects all viewports | Reuse mobile file picker from Mobile UX lane |
| Create quick order | Route exists | Grid not touch-friendly | Simplified quick-order mobile form |
| Confirm delivery milestones | Execution flow desktop-only | Multi-panel execution UI | Mobile delivery confirmation sheet |

## Recommended approach

1. **Do not** build parallel `/mobile/orders` routes — extend responsive patterns on existing admin pages.
2. **Reuse** shared mobile primitives from Internal Admin Mobile UX lane (bottom sheets, sticky headers, touch lists).
3. **Scope OP9** to order detail + status update + delivery confirm — defer full production timeline mobile redesign.
4. **Test** on 375px viewport with real order data in Vercel Preview.

## Out of scope

- PWA / native apps
- Public customer order tracking
- Offline mode
