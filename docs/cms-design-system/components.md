# Components

Shared CMS/Admin components should live in a common admin UI layer and be reused before local component variants are introduced.

## Button

Button variants:

- Primary: one main action per surface.
- Secondary: normal non-primary actions.
- Ghost: low-emphasis toolbar or inline action.
- Destructive: delete, revoke, reject, archive when irreversible or risky.
- Icon: compact familiar actions with accessible labels.

Buttons need loading, disabled, focus, and hover states. Destructive buttons require confirmation unless the action is trivially reversible.

## Input

Inputs must include:

- Label.
- Placeholder only as an example, not the only label.
- Helper text when format is not obvious.
- Error text when invalid.
- Disabled and read-only states.

Use consistent height and radius across all admin forms.

## Select

Use select controls for bounded choices.

- Keep option labels clear and domain-specific.
- Use searchable combobox behavior for long lists.
- Show selected state clearly.
- Avoid select controls for actions; use menus or buttons instead.

## Textarea

Use textarea for notes, descriptions, and free-form operational context.

- Provide a clear label.
- Use sensible min-height.
- Support validation and character guidance when required by the business rule.

## Badge

Use badges for status, type, role, priority, or compact metadata.

- Badge text must be explicit.
- Color must match semantic meaning.
- Do not use badges as decorative tags without operational value.

## Card

Use cards for grouped information or repeated items.

- Cards should have subtle border, restrained radius, and clear title hierarchy.
- Do not nest cards inside cards.
- Do not use cards as decorative page sections.

## DataTable

DataTable is the default list surface for operational modules.

Expected features:

- Stable columns.
- Sort where useful.
- Row selection when bulk actions exist.
- Row actions menu or compact action buttons.
- Empty, loading, and error states.
- Pagination or explicit infinite loading.
- Column content that truncates or wraps predictably.

## Toolbar

Toolbars sit above tables, editors, or media grids.

- Place primary action at the edge consistently.
- Group filters and search separately from record actions.
- Disable actions that require selection until rows are selected.

## Search Input

Search input should be easy to find in list views.

- Use a search icon.
- Keep placeholder specific, such as `Search products`.
- Debounce server queries where appropriate.
- Preserve search state in URL when useful for sharing or returning.

## Filter Bar

Filter bars should support common operational narrowing:

- Status.
- Category or type.
- Owner or assignee.
- Date range.
- Source.

Expose active filters clearly and provide a reset action.

## Drawer

Drawers are for contextual editing and review.

- Include title and close action.
- Keep save/cancel actions visible.
- Trap focus while open.
- Warn before closing with unsaved changes.

## Modal

Use modals for focused decisions:

- Confirmation.
- Short forms.
- Blocking alerts that require acknowledgement.

Avoid large multi-section editing inside modals. Use a drawer or page instead.

## Tabs

Use tabs for peer-level sections within one record or module.

- Keep labels short.
- Preserve active tab when the URL structure supports it.
- Do not use tabs for unrelated navigation that belongs in the sidebar.

## Toast

Use toast for brief system feedback:

- Created.
- Saved.
- Deleted.
- Uploaded.
- Failed action with concise reason.

Toast should not replace inline validation or persistent error states.

## Empty State

Empty states should explain what is missing and offer the next useful action.

- Use calm copy.
- Include a primary action when creation is allowed.
- Avoid promotional illustration-heavy empty states in CMS.

## Loading State

Loading states should preserve layout where possible.

- Use skeleton rows for tables.
- Use disabled controls during save.
- Use clear progress for upload.

Avoid full-page spinners for local refreshes when the surrounding layout can remain visible.

## Error State

Error states must tell the user what happened and how to proceed.

- Show inline errors near failed fields.
- Show table or page errors in the affected region.
- Offer retry when the operation can be retried.
- Keep technical detail available in logs, not as primary user copy.
