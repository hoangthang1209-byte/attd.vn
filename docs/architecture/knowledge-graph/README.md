# Enterprise Knowledge Graph — Architecture Review (Sprint 12.0A)

**Status:** Design complete — **no runtime implementation**  
**ADR:** [ADR-0005](../decisions/ADR-0005-enterprise-knowledge-graph.md)  
**Verified against:** `hoangthang1209-byte/attd.vn` `main`, migrations through `0074_governed_content_publishing_pipeline`  
**Date:** 2026-07-15

## Executive recommendation

Build a **thin PostgreSQL Knowledge Graph overlay** that stores **governed entities (as projections) and relationships**, while Product, Manufacturing, CRM, Media, SEO, Pricing, and Tech Pack remain authoritative in their current models.

Do **not** introduce Neo4j, embeddings, or vector search now.

Do **not** copy MOQ, prices, lead times, BOM lines, or Media URLs into graph nodes.

---

## Documents in this folder

| Doc | Purpose |
|-----|---------|
| [source-of-truth-matrix.md](./source-of-truth-matrix.md) | Concept → authority → duplicates → graph role |
| [schema-proposal.md](./schema-proposal.md) | Implementation-ready Prisma sketch (not migrated) |
| [migration-roadmap.md](./migration-roadmap.md) | Phased rollout, dual-write, rollback |
| [retrieval-integration.md](./retrieval-integration.md) | How Retrieval + Context consume graph |
| [use-cases.md](./use-cases.md) | SEO / Sales / Manufacturing / Media walkthroughs |

---

## Repository findings (Phase 0)

### What already works without a graph

- Product ↔ Category ↔ Variant (FK)
- SeoStrategy ↔ Cluster ↔ Topic ↔ Keyword / Brief / InternalLink (FK)
- MediaBundle ↔ Slot ↔ Asset; `ContentMediaAssignment` polymorphic (FK)
- TechPack ↔ Pattern / BOM / Measurement (FK + optional ProductionMaterial/Trim/PrintMethod)
- Retrieval conflict resolution by domain authority ranks
- Content Context Package assembly from Retrieval + Media Bundle + internal links

### What is graph-shaped but soft today

KB entry arrays without FK:

- `relatedProductIds`, `relatedBlogPostIds`, `relatedLandingPageSlugs`
- `relatedMediaBundleIds`, `relatedSeoTopicIds`, `relatedEntryIds`

Plus freeform Product `useCases` / `targetCustomers` / `tags` and Media vocabulary term arrays — useful signals, weak integrity.

### Critical duplication risk

| Domain | Risk |
|--------|------|
| MOQ / lead time | Product fields **and** KB `structuredData` (`moqValue`, `leadTime*`) |
| Material | Product.material / ProductionMaterial **and** KB MATERIAL type |
| Case study | `CaseStudyRecord` homepage **and** KB type CASE_STUDY — not FK-linked |
| Two Material worlds | Warehouse `Material` vs Manufacturing `ProductionMaterial` |

Retrieval already prefers Product over general KB for MOQ/lead/material — graph must **preserve** that rule, never invert it.

### Migration head

Latest: **0074**. No `0075` exists. Next graph foundation migration (future sprint) should be `0075_knowledge_graph_foundation` if ADR remains accepted.

---

## Where a graph adds real value

1. Curated Product → UseCase → Audience → Industry chains for SEO/Sales answers  
2. Material ↔ PrintMethod COMPATIBLE_WITH / NOT_COMPATIBLE_WITH claims with evidence  
3. Capability / manufacturing evidence linking media and case studies  
4. Integrity + provenance for today's soft KB relation arrays  
5. Bounded expansion for internal-link and media suggestions  

## Where a graph is unnecessary

1. Category tree walks already in Prisma  
2. Quotation / price tier calculation  
3. Tech Pack measurement matrix and BOM lines (operational)  
4. Media Bundle slot membership (already relational)  
5. SEO topic keyword uniqueness and brief storage  

---

## Implementation options summary

| | Complexity | Neon/Prisma | Ops | Authz | Verdict |
|--|------------|-------------|-----|-------|---------|
| **A. Postgres entity+edge tables** | Medium | Native | Same DB | Reuse Content/KB perms | **Selected** |
| B. Typed join per pair | High schema churn | Native | Same | Per-table | Rejected for V1 |
| C. Neo4j | High | Extra host | Secrets, sync | Parallel ACL | Deferred |

---

## Canonical identity (summary)

```
entityType + sourceType + sourceId   → unique projection
entityType + canonicalKey            → human/stable key within type
displayName                          → denormalized label only
metadata                             → optional non-authoritative hints
```

Nodes are **created on demand or via system sync** for high-value types; not forced for every row (hybrid).

Virtual-at-retrieval (Option “all virtual”) rejected as sole approach — soft arrays already suffer broken ID integrity; curated edges need persistence.

---

## Data ownership

| Platform | Owns | Graph may store |
|----------|------|-----------------|
| Product | Product, Variant, Category, attributes, MOQ, lead, capabilities flags | Node pointer + label |
| Manufacturing (Production*) | Material, Trim, PrintMethod, Supplier | Node pointer + label |
| Tech Pack | TechPack, Pattern, BOM lines | Node pointer; BOM stays operational |
| CRM | Customer, contacts | INTERNAL node; never public fields |
| Media DAM | MediaAsset, Bundle, assignments | Node pointer; no file copy |
| SEO | Strategy, Topic, Brief, links | Node pointer |
| Knowledge Base | Narrative entry, claim, FAQ, policy text | KNOWLEDGE_ENTRY node + evidence edges |
| Graph admin | Relationships, edge status/origin/visibility | Edge rows only |

---

## Visibility model

Reuse `KnowledgeBaseVisibility`: `PUBLIC | INTERNAL | CONFIDENTIAL` (see `prisma/schema.prisma`).

Effective visibility for a path = **strictest** of:

- from-entity visibility  
- relationship visibility  
- to-entity visibility  
- consumer policy (`ai-retrieval-policy`)

Customer entities default **INTERNAL**. Public case-study edges that expose a customer must use approved public projection or anonymized CASE_STUDY nodes only.

---

## Authority & provenance (edge)

Required on curated / claim edges:

- `origin` (SYSTEM_DERIVED | CURATED | AI_SUGGESTED | IMPORTED)
- `status` (DRAFT | SUGGESTED | ACTIVE | REJECTED | SUPERSEDED | ARCHIVED)
- `visibility`, `authorityRank` (defaults by source domain; Retrieval still wins for facts)
- optional: `sourceEntryId`, `evidenceUrl`, `approvedBy/At`, `confidence`, `validFrom/Until`, `lastVerifiedAt`

Not required on every SYSTEM_DERIVED BELONGS_TO Category edge (keep lean).

---

## System vs curated

| Origin | Examples | Approval |
|--------|----------|----------|
| SYSTEM_DERIVED | Product BELONGS_TO Category; Topic BELONGS_TO Cluster; Assignment HAS_MEDIA; Blog source handoff FEATURED_IN Topic | Auto ACTIVE |
| CURATED | Material SUITABLE_FOR UseCase; Technique COMPATIBLE_WITH Material | Human APPROVED → ACTIVE |
| AI_SUGGESTED | Suggested RELATED_TO SEO topics | SUGGESTED until human confirm |

---

## KnowledgeBaseEntry long-term role

Remain the home for:

1. Narrative documents  
2. Policy / FAQ / brand voice / sales scripts  
3. Evidence-backed claims that are not master-data rows  
4. Relationship **evidence** (`sourceEntryId`)

Do **not** use KB entries as shadow Products or Materials. Prefer linking entry → PRODUCT / MATERIAL nodes.

Types MATERIAL / PRODUCT / CASE_STUDY on KB should increasingly become DOCUMENTED_BY / RELATED_TO edges into canonical entities.

---

## Business rules architecture

| Rule class | Home |
|------------|------|
| Operational MOQ / lead / price tier | Product / Pricing platforms |
| Quotation policy | Commercial / Quote services |
| Compatibility “soft claims” | Curated graph edges + KB policy evidence |
| Public marketing policies | KB POLICY + public-safe Retrieval |

**No** full rule engine in graph V1. Graph edges may express COMPATIBLE_WITH; executors of BOM/Tech Pack still use Production* and TechPack data.

---

## Temporal support (minimal)

Support optional `validFrom` / `validUntil` / `lastVerifiedAt` on relationships.

Do not build full bi-temporal versioning in V1.

Use for: campaign applicability, certificate expiry, case-study authorization windows, superseded compatibility claims.

---

## Search / traversal

| Mode | Max depth | Limit |
|------|-----------|-------|
| Entity lookup | 0 | paginated |
| One-hop | 1 | 50/type |
| Constrained two-hop | 2 | 40 combined |
| Path | 2 | 10 paths |
| Neighbour expansion for Retrieval | 2 | 40 |

No open recursion. Prefer indexed `(fromEntityId, relationshipType, status)`.

---

## Graph quality metrics (calculable)

- % of ACTIVE KB soft IDs that resolve to existing sources  
- Orphan nodes (no edges after N days)  
- Broken `sourceId` references  
- Unapproved curated SUGGESTED backlog age  
- Edges past `validUntil` still ACTIVE  
- Duplicate `canonicalKey` within type (should be zero)  
- Coverage: Products with ≥1 SUITABLE_FOR UseCase  
- Retrieval sessions using graph expansion with non-empty gain (future telemetry)

---

## Governance workflow

Statuses: DRAFT → SUGGESTED → ACTIVE / REJECTED → SUPERSEDED / ARCHIVED  

Permissions (reuse existing Content/KB matrices):

- view graph: content.read / kb equivalent  
- curate edges: content.update  
- approve curated claim edges: content.update (or existing KB approve pattern)  
- no new RBAC platform  

---

## Admin UX (design only)

Preferred routes (future):

- `/admin/knowledge-graph` — search + health counts  
- `/admin/knowledge-graph/entities/[id]` — neighbours, source deep-link  
- `/admin/knowledge-graph/relationships` — filters by type/status/origin  
- `/admin/knowledge-graph/health` — broken refs, stale, backlog  

Primary UI = tables and relationship panels. Force-directed diagram = optional secondary view.

---

## Performance assessment

Expected order of magnitude (present platform): thousands of products/variants, hundreds of ProductionMaterials/PrintMethods, hundreds–thousands KB entries, SEO topics, media assets; curated edges likely low tens of thousands in years 1–2.

Postgres adjacency with indexes is enough. Cache one-hop expansions per `(entityId, consumer, visibility)` for hot SEO topics.

Neo4j threshold: revisit if two-hop profiles regularly exceed ~200ms p95 or exploratory multi-hop becomes a product requirement.

---

## Risks

1. Editors copy MOQ into graph metadata → authority drift  
2. Public graph leak of CUSTOMER or CONFIDENTIAL edges  
3. Dual-write arrays vs graph diverge  
4. AI-suggested edges treated as facts without approval  
5. Warehouse Material confused with ProductionMaterial  

## Deferred scope

Neo4j, embeddings, vector search, visual-primary editor, process precedence graphs, auto price/MOQ nodes, Campaign/Project full modelling, Customer public graph.

---

## Recommended Sprint 12.0 implementation scope (next)

1. Migration `0075_knowledge_graph_foundation` — entity + relationship tables only  
2. System sync workers: Product, Category, ProductionMaterial, PrintMethod, SeoTopic, MediaBundle, KnowledgeBaseEntry → projection nodes  
3. Dual-write reader for KB related* arrays → graph edges (import, keep arrays)  
4. Read-only admin neighbour view  
5. Retrieval expansion behind feature flag (`KNOWLEDGE_GRAPH_EXPANSION_ENABLED`, default false)

Do not ship Content Context / Writing / Publish changes until expansion is feature-flagged and measured.
