# Implementation Guide

This guide defines how future CMS/Admin UI work should adopt the ATTD CMS Design System.

## Required Sprint Opening

Every future admin sprint must start with:

> Before implementing, follow docs/cms-design-system as the authoritative ATTD CMS Design System. Do not invent new admin layouts, colors, spacing, components, or interaction patterns when an existing CMS standard exists. Public frontend UX is out of scope for this design system.

## Folder Conventions

Keep admin UI separated from public frontend UI.

Recommended conventions:

- `src/components/admin/`: shared and module-specific admin components.
- `src/components/admin/ui/`: reusable admin UI primitives.
- `src/components/admin/layout/`: admin shell, sidebar, header, breadcrumbs, page headers, split views.
- `src/components/admin/<module>/`: module-specific composition components.
- `src/app/(backend)/admin/`: admin route surfaces where the app already follows this structure.
- `src/features/<domain>/`: domain logic, data access, services, and business behavior.

Public frontend components should not depend on admin UI primitives.

## Shared Admin Component Path Proposal

Create shared CMS/Admin components gradually under:

- `src/components/admin/ui/`
- `src/components/admin/layout/`

Suggested `ui` candidates:

- `AdminButton`
- `AdminInput`
- `AdminSelect`
- `AdminTextarea`
- `AdminBadge`
- `AdminCard`
- `AdminDataTable`
- `AdminToolbar`
- `AdminSearchInput`
- `AdminFilterBar`
- `AdminDrawer`
- `AdminModal`
- `AdminTabs`
- `AdminToast`
- `AdminEmptyState`
- `AdminLoadingState`
- `AdminErrorState`

Suggested `layout` candidates:

- `AdminShell`
- `AdminSidebar`
- `AdminHeader`
- `AdminBreadcrumb`
- `AdminPageHeader`
- `AdminContent`
- `AdminSplitView`

Names may follow existing project naming conventions, but the shared responsibility should remain clear.

## Migration Strategy

Refactor gradually, not all at once.

Recommended migration steps:

1. Preserve existing module business logic.
2. Identify repeated admin UI patterns in the module being touched.
3. Extract only the shared component needed for the current sprint.
4. Replace local one-off UI with the shared admin component.
5. Keep behavior, permissions, validation, and data contracts unchanged.
6. Validate the changed module and any shared component consumers.
7. Document any intentional deviation from this design authority in the sprint notes.

Avoid broad visual rewrites that cross many modules without a dedicated migration sprint.

## Implementation Rules

- Start with the CMS design authority before making admin UI decisions.
- Prefer shared admin layout and UI components.
- Do not introduce new color, spacing, radius, shadow, or layout systems for a single module.
- Do not change business logic while normalizing UI.
- Keep table-first workflows for operational modules.
- Use drawer-first quick edit only for lightweight contextual work.
- Use full-page flows for complex records.
- Make loading, empty, error, and success states explicit.
- Keep public frontend UX separate.

## Validation

Run the validation required by the sprint before merging:

```bash
npx tsc --noEmit
npm run build
git diff --check
git diff --cached --check
```

If validation fails because of unrelated pre-existing worktree changes, record that clearly before continuing with commit or deployment.
