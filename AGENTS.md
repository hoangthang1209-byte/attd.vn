<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ATTD Engineering Rules

## Project
- Product: ATTD Business OS / B2B sourcing platform.
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma, Neon PostgreSQL, Vercel.
- Code and technical comments: English.
- User-facing UI and labels: Vietnamese unless the existing surface uses another language.

## Source-of-truth rules
- Keep business logic in server/domain/service code, not duplicated across UI components.
- Reuse the existing Pricing Engine for pricing calculations. Do not create parallel pricing formulas.
- Reuse existing CRM, quotation, order, production, auth, and payment concepts before adding new models.
- Do not silently change existing business behavior outside the approved task scope.

## Database safety
- Every Prisma schema change must include an intentional migration strategy.
- Do not run destructive production migrations automatically.
- Treat DROP TABLE, DROP COLUMN, data rewrites, broad UPDATE/DELETE, and irreversible enum changes as high risk.
- Never point tests, local scripts, or cloud coding agents at the production database.
- For payment, banking, invoice, pricing, auth, and permission changes, require human approval before production deployment.

## Security
- Never commit secrets, credentials, tokens, private keys, bank credentials, or production database URLs.
- Never log credentials, full access tokens, or sensitive payment payloads.
- Preserve authorization checks on admin/server actions and route handlers.
- Payment and webhook handlers must be idempotent where duplicate delivery is possible.
- Prefer explicit audit trails for financially significant state changes.

## Development workflow
1. Read this file and the linked task/specification before changing code.
2. Inspect the existing implementation and reuse established patterns.
3. Work on a dedicated branch; never implement directly on `main`.
4. Keep changes scoped to the approved task.
5. Add/update validation and tests when behavior changes.
6. Before declaring completion, run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run security:public-token`
   - `npm test --if-present`
   - `npm run build`
7. Review the final diff for regressions, security issues, authorization gaps, database risks, and unintended business-rule changes.
8. Do not merge or deploy production unless explicitly authorized.

## Pull request expectations
Every PR should state:
- What changed.
- Why it changed.
- Database/migration impact.
- Security/auth impact.
- Checks run.
- Known risks or manual verification still required.

## Risk levels
### Low
Copy, styling, small UI polish, filters, pagination, documentation.

### Medium
CRUD flows, CRM workflow changes, production tracking, admin workflow changes.

### High
Pricing, payment, banking, auth, permissions, invoice/accounting logic, destructive or data-rewriting migrations.

High-risk changes always require human approval before merge/deploy.
