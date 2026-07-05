# Patterns

CMS/Admin patterns define how users move through operational work.

## Standard CRUD Flow

Use a consistent create, read, update, delete model:

- List records in a table-first view.
- Open a record detail page or drawer.
- Create and edit with predictable form structure.
- Confirm risky delete/archive actions.
- Return users to their previous list context after save or cancel.

## List to Detail to Create/Edit to Delete

Recommended flow:

1. User lands on a module list.
2. User searches, filters, sorts, or pages through records.
3. User opens a detail page or quick drawer.
4. User creates or edits using a shared form pattern.
5. User saves, cancels, or confirms destructive action.
6. System gives feedback and preserves useful context.

Do not force users through unrelated navigation for common list-detail work.

## Table-First Operational UX

Most admin modules should start with a table.

Tables should prioritize:

- Record identity.
- Status.
- Ownership or source.
- Last activity or updated time.
- Primary operational metric.
- Row actions.

Avoid replacing dense operational lists with decorative cards unless the module is visual by nature, such as media.

## Drawer-First Quick Edit

Use drawer-first editing when the user is making a small change from a list:

- Status changes.
- Assignment.
- Short metadata updates.
- Notes.
- Category or supplier relationship edits.

Use full-page editing for complex records such as product, quote, tech pack, pattern, or manufacturing setup.

## Bulk Actions

Bulk actions must be explicit and reversible where possible.

- Show selected count.
- Disable bulk actions until selection exists.
- Confirm destructive or high-impact bulk changes.
- Report partial failure clearly.
- Preserve filters and pagination after completion.

## Search, Filter, Sort, and Pagination

List controls must work together predictably.

- Search narrows by primary record identity and common metadata.
- Filters narrow by structured fields.
- Sort changes order without clearing filters.
- Pagination keeps filters and search active.
- URL state should be used for important list context when practical.

## Upload and Media Selection

Upload and media selection should be consistent across modules.

- Show supported file types and limits.
- Provide progress and failure feedback.
- Allow preview before confirm when media affects public content or production assets.
- Reuse media library selection patterns instead of custom pickers.
- Do not silently replace existing media.

## Confirmation and Destructive Actions

Destructive actions include delete, archive, revoke access, reject, remove media, and irreversible status changes.

Confirmation must include:

- The action.
- The affected record or count.
- Whether the action is reversible.
- A clear destructive button label.

Use stronger confirmation for bulk or irreversible actions.

## Undo Where Appropriate

Offer undo when the action is fast, local, and reversible:

- Archive.
- Remove from selection.
- Reorder.
- Clear assignment.
- Dismiss non-critical item.

Do not offer fake undo for actions that already changed external state, sent messages, generated invoices, or modified production-critical data unless the backend supports reversal.
