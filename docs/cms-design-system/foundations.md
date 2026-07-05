# Foundations

These foundations define the shared visual language for ATTD CMS/Admin UI only.

## Colors and Tokens

Use semantic tokens instead of one-off colors.

- `background`: main admin page background.
- `surface`: panels, cards, drawers, modals, and table containers.
- `surface-muted`: subtle grouped areas and disabled backgrounds.
- `border`: default dividers, input borders, table rules, and card edges.
- `border-strong`: focused, selected, or emphasized borders.
- `text`: primary readable content.
- `text-muted`: secondary labels, hints, metadata, placeholders.
- `primary`: main action, active navigation, selected controls.
- `primary-foreground`: text or icon color on primary backgrounds.
- `success`: confirmed, active, completed, approved.
- `warning`: pending, needs attention, partial.
- `danger`: destructive, failed, blocked, rejected.
- `info`: neutral status, helper state, system note.

Admin color usage must be quiet and functional. Use color to communicate state and hierarchy, not decoration.

## Typography

Use the project font stack and keep typography compact.

- Page title: clear module or record name.
- Section heading: short label for grouped controls or data.
- Body: default admin reading text.
- Label: form labels, table headers, filter labels.
- Metadata: timestamps, IDs, secondary counts, helper copy.

Avoid marketing-scale type inside admin modules. Admin typography should support scanning dense information.

## Spacing

Use a consistent spacing scale:

- `4px`: tight gaps between icon and label, compact table affordances.
- `8px`: default control internals and small component gaps.
- `12px`: form field grouping and compact toolbar gaps.
- `16px`: default section spacing and card padding.
- `24px`: page header and major content groups.
- `32px`: large vertical separation between unrelated page regions.

Do not create custom spacing values unless the component already requires them for alignment.

## Radius

Use restrained radius:

- `4px`: inputs, badges, compact controls.
- `6px`: buttons, tabs, table containers.
- `8px`: cards, drawers, modals.

Avoid highly rounded admin surfaces. CMS UI should feel precise and operational.

## Border

Use borders to clarify structure:

- Tables need visible row and column grouping through borders or dividers.
- Cards and panels use a subtle border by default.
- Inputs use a visible border in default, focus, error, and disabled states.
- Avoid borderless controls unless the surrounding toolbar pattern already makes the interaction obvious.

## Shadow and Elevation

Use elevation sparingly.

- Base surfaces should rely on border and background.
- Drawers, modals, popovers, and menus may use shadow to separate from the page.
- Cards in normal page flow should not look like floating marketing tiles.

## Icons

Use icons to support recognition, not to decorate.

- Use existing icon libraries already present in the project.
- Pair icons with text for primary commands unless the action is globally familiar.
- Icon-only buttons require accessible names and tooltips.
- Use consistent icons for edit, delete, archive, restore, upload, filter, search, settings, copy, preview, and external link.

## Motion

Motion should be brief and functional.

- Use short transitions for hover, focus, drawer, modal, popover, and toast states.
- Avoid decorative animation in CMS/Admin surfaces.
- Respect reduced-motion preferences.
- Loading indicators should communicate progress without distracting from the task.

## Accessibility

Admin UI must be usable with keyboard and assistive technology.

- Every interactive element needs a clear accessible name.
- Focus states must be visible.
- Form fields need labels and error text connected to the control.
- Destructive actions must be distinguishable by more than color.
- Tables need meaningful headers and row actions.
- Modals and drawers must manage focus and provide an obvious close path.
- Status badges should have readable text, not only color.
