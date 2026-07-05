# Layout

CMS/Admin layout is built for operational speed: stable navigation, table-first content, and predictable editing surfaces.

## Admin Shell

The admin shell owns global CMS structure:

- Persistent sidebar navigation.
- Header with context, account, and global actions.
- Main content area for the active module.
- Toast region for system feedback.

Do not create module-specific shells when the shared admin shell can host the workflow.

## Sidebar

The sidebar is the primary admin navigation.

- Group related modules under clear labels.
- Keep active state obvious.
- Use stable ordering across admin sessions.
- Avoid deep navigation trees when a module-level tab or filter can handle the distinction.
- Collapse behavior may hide labels, but icons must remain recognizable and accessible.

## Header

The header provides global context and utility.

- Include account/session controls where appropriate.
- Keep page-specific actions in the page header or toolbar, not the global header.
- Avoid duplicate primary actions across header, page header, and table toolbar.

## Breadcrumb

Use breadcrumbs when the user is below a module root.

Recommended pattern:

`Admin / Module / Record`

Breadcrumb labels should be short and stable. Do not use breadcrumbs as a replacement for sidebar navigation.

## Page Header

Each module page should start with a page header containing:

- Title.
- Optional description when the module is ambiguous.
- Primary action, such as `Create`, `Upload`, or `Add`.
- Optional secondary actions, such as export or settings.

Keep the primary action in a consistent position across modules.

## Content Width

Use content width by task:

- Data-heavy lists: full available width inside the admin shell.
- Forms: constrained width for readability.
- Detail views: split content into main detail and supporting side panel when needed.
- Settings: constrained sections with clear labels.

Avoid narrow centered layouts for table-first workflows.

## Split View

Use split view when a module benefits from keeping context visible:

- List plus selected record preview.
- Record detail plus activity/history.
- Editor plus live metadata.

Split view should preserve the user's place in the list and avoid forced navigation for quick inspection.

## Drawer Usage

Use drawers for quick, contextual work:

- Quick edit.
- Status update.
- Assignment.
- Notes.
- Media selection.
- Lightweight create flow.

Use a full page when the task is complex, has many sections, or requires careful review before save.

## Responsive Admin Behavior

Admin is desktop-first but must remain usable on smaller screens.

- Sidebar may collapse behind a menu.
- Tables may use horizontal scroll, column priority, or compact row cards depending on module complexity.
- Drawers should become full-screen panels on small screens.
- Toolbars should wrap cleanly without overlapping controls.
- Primary actions must remain reachable.

Do not remove important admin capabilities on smaller screens unless the sprint explicitly scopes a desktop-only workflow.
