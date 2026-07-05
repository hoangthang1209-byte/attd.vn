# CTO Principles

ATTD.vn engineering decisions follow these principles in order to protect revenue, production stability, data integrity, and long-term maintainability.

## Principles

- Revenue-first engineering: prioritize work that supports sales, operations, fulfillment, and customer trust.
- Stable production over perfect architecture: prefer safe, deployable improvements over speculative rewrites.
- Reusable foundations before duplicated feature code: shared patterns belong in shared foundations when more than one module needs them.
- Database integrity before UI convenience: do not make UI shortcuts that weaken persistence, relations, history, or auditability.
- Permission safety before speed: admin, staff, owner, dealer, and public-token access must be checked on the server.
- No hidden business logic in UI components: domain rules belong in `src/features` or `src/lib`, not inside presentation-only components.
- No one-off CMS components when shared components exist: admin modules must reuse established layout and UI primitives.
- Deployable increments: every sprint should leave the app in a buildable, shippable state.
- Every module must be maintainable by another AI or human later: code and docs should make intent, ownership, and boundaries clear.
