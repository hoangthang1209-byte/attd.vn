# Module Templates

These templates describe the expected CMS/Admin structure for common ATTD modules. Keep business logic intact when applying them.

## Product CMS

Default structure:

- Product list table with search, category filter, status filter, and updated date.
- Primary action: create product.
- Detail page with tabs for overview, variants, media, pricing visibility, SEO metadata, and activity.
- Drawer quick edit for status, category, tags, and simple metadata.
- Media selection through the shared media library pattern.

## Category CMS

Default structure:

- Category list or hierarchy table.
- Primary action: create category.
- Detail/edit view for name, slug, parent, visibility, ordering, and SEO metadata.
- Confirmation for delete, archive, or reparenting high-impact categories.

## CRM

Default structure:

- Lead/customer list table with stage, owner, source, last activity, and next action.
- Filters for stage, owner, source, date, and priority.
- Detail view with profile, timeline, notes, tasks, and related quotes.
- Drawer quick edit for stage, owner, next follow-up, and notes.

## Quote

Default structure:

- Quote list table with customer, status, value, owner, created date, and expiry.
- Detail page for line items, customer data, pricing, internal notes, and approval state.
- Clear status badges for draft, sent, approved, rejected, expired, and closed.
- Confirmation for sending, voiding, or deleting quotes.

## Customer

Default structure:

- Customer list table with company/person name, contact, segment, owner, and last activity.
- Detail page with profile, contacts, activity, quotes, orders or requests, and notes.
- Drawer quick edit for owner, segment, tags, and contact status.

## Dealer Admin

Default structure:

- Dealer list table with status, tier, region, contact, and last activity.
- Detail page with account data, tier, permissions, pricing visibility, documents, and activity.
- Confirmation for approval, suspension, tier change, and access revocation.

## Manufacturing Library Admin

Default structure:

- Library list table grouped by category, workflow, display location, or status.
- Primary actions for adding library item, category, workflow, or display location as allowed.
- Detail/edit view for operational metadata, attachments, version notes, and usage context.
- Drawer quick edit for status, category, sort order, and display location.

## Tech Pack Admin

Default structure:

- Tech pack list table with product or style, status, owner, version, and updated date.
- Detail page with sections for measurements, materials, construction, artwork, packaging, and approvals.
- Version and approval actions must be clearly separated from normal edits.
- Confirmation for publish, approve, reject, archive, and delete.

## Pattern Admin

Default structure:

- Pattern list table with code, name, status, base size, version, and updated date.
- Detail page for measurements, size values, tolerances, notes, and related tech packs.
- Drawer quick edit for status, metadata, and notes.
- Validation errors must appear inline near the affected measurement or value.

## Materials and Suppliers Admin

Default structure:

- Materials table with type, supplier, status, cost visibility, and updated date.
- Suppliers table with name, contact, region, status, and relationship owner.
- Detail pages for specs, certifications, notes, attachments, and related products or tech packs.
- Confirmation for supplier deactivation, material archive, and data removal.

## Media Library Admin

Default structure:

- Media grid or table with search, type filter, usage filter, and upload date.
- Primary action: upload media.
- Detail drawer for preview, metadata, alt text, usage, and replace/remove actions.
- Upload flow with progress, validation, preview, and failure handling.
- Destructive actions must show whether the asset is currently used.
