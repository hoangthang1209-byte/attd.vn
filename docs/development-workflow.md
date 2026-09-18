# Development Workflow

## Target flow
Business requirement → specification → branch → implementation → CI → review → Vercel Preview → human approval → merge → production.

## Before implementation
- Link the work to a clear task/specification.
- Define scope, acceptance criteria, out-of-scope items, data impact and risk level.
- Inspect existing code before adding new abstractions.

## During implementation
- Work only on the task branch.
- Keep unrelated refactors out of the change.
- Add validation and tests where practical.
- Do not use production credentials or production database access.

## Required verification
For local work, run:
```bash
npm run lint
npm run typecheck
npm run security:public-token
npm test --if-present
npm run build
```

## CI baseline policy
The repository currently contains legacy lint debt that predates the Safe Software Factory rollout. During the transition:
- Pull requests must pass ESLint on every changed JavaScript/TypeScript file.
- Existing untouched lint debt does not block unrelated PRs.
- Typecheck, security checks and production build still run across the repository.
- Do not introduce new lint errors.
- Legacy lint debt should be reduced in dedicated cleanup tasks, not mixed into unrelated feature PRs.

When the legacy lint backlog reaches zero, CI should be tightened to run full-repository lint as a required check.

## Pull request gate
A PR is ready for human approval only when:
- CI passes.
- No unresolved P0/P1 review finding remains.
- Database changes are documented.
- Auth/security impact is documented.
- A Vercel Preview is available when the feature has user-visible behavior.
- High-risk changes have an explicit manual verification note.

## Merge policy
- Low risk: can eventually be eligible for automation after the factory is proven stable.
- Medium risk: human approval required during rollout.
- High risk: always human approval; no automatic production deployment decisions by an agent.

## High-risk domains
Pricing, banking, payment reconciliation, invoices/accounting, authentication, authorization/permissions, destructive migrations, and bulk data rewrites.
