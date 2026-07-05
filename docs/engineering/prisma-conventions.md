# Prisma Conventions

Prisma is the source of database truth for ATTD.vn.

## Migrations

- Name migrations with a concise verb and domain, such as `add_quote_expiry`, `create_dealer_portal_session`, or `index_product_status`.
- Never edit old migrations casually after they have been applied.
- Do not include destructive migrations without an explicit note, risk summary, and approval path.
- Keep migration scope aligned with the sprint.

## Models and Enums

- Use clear model names that match business concepts.
- Use enum names that describe the domain and field role, such as `QuoteStatus`, `DealerStatus`, or `ProductionStage`.
- Use uppercase enum values unless the existing enum already follows another pattern.

## Standard Fields

- Use `createdAt` and `updatedAt` for records that are created and changed through the application.
- Use soft delete fields where business recovery, audit, or historical references matter.
- Do not use soft delete as a substitute for domain statuses such as archived, suspended, inactive, or rejected.

## Code Fields

Business-facing code fields should use stable prefixes and sequential or deterministic numbering where required by the domain, for example:

- Lead codes: `LEAD-000001`.
- Customer codes: `KH-000001`.
- Quote codes: `BG-000001`.

Code generation must be transaction-safe when collisions are possible.

## Transactions

- Use Prisma transactions for multi-model writes that must succeed or fail together.
- Keep transaction work focused and short.
- Do not perform external network side effects inside a database transaction unless there is no safer alternative.

## Integrity

- Prefer database constraints for uniqueness and required relationships where the business rule is durable.
- Keep UI convenience secondary to database integrity.
- Validate data at the boundary, but do not rely on UI validation alone.
