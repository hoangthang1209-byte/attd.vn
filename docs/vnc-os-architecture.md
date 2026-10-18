# VNC OS — Vietnam Clothing Operating System

Canonical architecture and single source of truth (SSOT) for the company-wide operating platform implemented in this repository.

**Related:** `AGENTS.md`, `docs/architecture.md`, `docs/development-workflow.md`, `docs/agent-os.md` (VNC Agent OS).

## Platform identity

The company-wide operating platform is **VNC OS** (Vietnam Clothing Operating System).

Target admin hostname after QA and explicit DNS cutover: `os.vietnamclothing.vn`.

During transition, **`/admin/*` on the current production host remains supported**; do not remove legacy admin paths until a separate approved cutover.

Public consumer and B2B sites (including `attd.vn`) keep their own brand and SEO metadata. VNC OS is the internal operating layer, not a rename of the ATTD public brand.

## Module map

VNC OS is one system composed of product modules (names are organizational, not separate deployables in Phase 0–1):

| Module | Scope |
| --- | --- |
| **VNC CRM** | Leads, customers, contacts, activities, opportunities |
| **VNC ERP** | Quotes, orders, production, costing, finance/ops data |
| **VNC CMS** | Admin content, site pages, merchandising visibility (site-scoped over time) |
| **VNC Automation** | GitHub task factory, BUILD_APPROVED gate, orchestrator, `/admin/automation` |
| **VNC Agent OS** | Agent registry, routing, run history — **evolves from existing Agent OS** (no second Agent OS) |
| **VNC Intelligence** | Analytics, reporting, and decision-support surfaces (roadmap) |

Technical identifiers (Prisma models, API routes, env vars, package name, repository name) stay stable unless a future issue explicitly approves migration.

## Managed sites

Sites operated under VNC OS (multi-brand, shared back office):

1. **`vietnamclothing.vn`** — international B2B, merchandise, apparel & sourcing.
2. **`attd.vn`** — domestic B2B (ATTD remains a managed business brand on this site).
3. **`aothunthongdiep.com`** — uniforms / custom printing.

Each site has independent public branding, content, and SEO while sharing identity, CRM, and operational data where policy allows.

## Data-boundary principle

### Shared centrally (single database, shared models today)

- Identity: users, roles, capabilities
- CRM: customers, contacts, lead/sales data
- Commercial ops: quotes, orders, production, costing, finance-related records
- VNC Agent OS: `AgentRun`, `TaskRun`, `AgentEvent`, `AgentDecision` (existing Prisma models)

### Site-scoped or site-independent (target model)

- Marketing content and page composition
- SEO metadata and structured data
- Navigation, footer, homepage layout
- Site product visibility / merchandising rules
- Per-site branding and settings

Phase 0–1 documents this split only; **no production schema migration** is included in issue #220.

## Transition principles

1. Rebrand **admin / SSOT documentation** to VNC OS; leave repo, database, schema/table names, API routes, and env vars unchanged.
2. Keep `/admin` routes and current production admin URL until DNS moves to `os.vietnamclothing.vn`.
3. Do not change public `attd.vn` root metadata or customer-facing ATTD legal/company identity in Phase 0–1.
4. Existing Agent OS UI and persistence become **VNC Agent OS** in naming only — same code paths and tables.

## Multi-site architecture (design only — Phase 2)

This section is the approved **design baseline** for a later implementation issue. It does not authorize production migration by itself.

### Site concept

Introduce a first-class **`Site`** (or `siteKey` enum/table) representing each managed domain:

- Stable `siteKey`: e.g. `vietnamclothing`, `attd`, `aothunthongdiep`
- Display name, primary domain, locale defaults, feature flags
- Optional link to legacy “tenant” settings if introduced later

### Reuse vs site-scope (existing models)

| Area | Reuse as-is initially | Site-scope later |
| --- | --- | --- |
| User, Role, Permission | Central | Optional `siteId` on role assignments for content-only roles |
| Customer, Contact, Opportunity | Central | Rarely site-scoped (shared CRM) |
| Quote, Order, Production | Central | Site key on quote/order **source** for reporting, not duplicate ERP |
| Product catalog (master) | Central | **SiteProduct** or visibility join for merchandising |
| CMS pages, blocks, SEO | Partially via paths today | `siteId` on content entities |
| Media library | Central storage | Site tagging for usage |
| Agent OS runs | Central audit | No per-site split required |

### Access control

Extend RBAC with **function + site** where needed:

- Global capabilities (pricing, production, banking) remain global.
- Content/editor roles gain `siteKeys[]` or join table `UserSiteAccess`.
- Single login session across all sites; UI filters by allowed sites.

### Frontend consumption

- **`vietnamclothing.vn`**: public App Router site reads VNC CMS APIs filtered by `siteKey=vietnamclothing`.
- **`attd.vn`**: compatibility layer — existing admin and content paths continue; gradual alignment to site filter.
- Shared components; site resolved from host header or explicit config.

### Migration and backfill strategy (future)

1. Add `Site` table and seed three managed sites.
2. Add nullable `siteId` / `siteKey` to CMS-related tables; backfill `attd` from current implicit default.
3. Add indexes: `(siteId, slug)` unique for pages; `(siteId, productId)` for visibility.
4. Deploy application code that defaults null `siteId` to `attd` for backward compatibility.
5. Backfill non-null values; then enforce NOT NULL on new writes only (phased).
6. Rollback: feature flag to ignore `siteId` filter and treat all content as legacy default.

### Deployment sequence (future)

1. Schema migration in isolated dev/staging with replay tests.
2. Vercel Preview per site host headers.
3. Production migration during low traffic; no DNS change required for DB phase.
4. DNS cutover for `os.vietnamclothing.vn` admin only after admin QA.

### Explicit non-goals in Phase 0–1

- No `Site` table in production
- No DNS changes
- No rename of repository, Neon database, or Prisma model names for branding

## Engineering references

- Stack and safety rules: `AGENTS.md`
- Domain guardrails: `docs/architecture.md`
- VNC Agent OS (G1/G2): `docs/agent-os.md`
- Admin UI standards: `docs/cms-design-system/` (VNC CMS admin UX)
