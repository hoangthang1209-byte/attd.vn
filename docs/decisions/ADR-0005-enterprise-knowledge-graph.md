# ADR-0005: Enterprise Knowledge Graph (Design Decision)

## Status

Accepted (design only — **not implemented**)

## Date

2026-07-15

## Context

ATTD.vn already operates a governed Knowledge Base, Enterprise AI Retrieval Layer, SEO/Content Context, Product/Manufacturing/Media/CRM platforms, and a Content Review→Publish pipeline (migrations through `0074_governed_content_publishing_pipeline`).

KB cross-links today are soft Postgres `String[]` fields (`relatedProductIds`, `relatedBlogPostIds`, `relatedMediaBundleIds`, `relatedSeoTopicIds`, `relatedEntryIds`, `relatedLandingPageSlugs`) without FK integrity. Operational truths (MOQ, lead time, material codes, pricing) live in Product / Production* / Pricing tables, while KB `structuredData` can hold educational or policy-shaped duplicates. Retrieval already resolves conflicts via authority ranks (`src/features/ai-retrieval/ai-authority.ts`).

The question is whether ATTD should introduce an Enterprise Knowledge Graph, and if so how to do so **without creating a second copy of Product, Manufacturing, Pricing, CRM, Media, or SEO records**.

## Decision

### 1. Build a Knowledge Graph?

**ACCEPTED — yes, but as a thin relational overlay**, not as a parallel master database.

Graph is justified for:

- Curated cross-domain edges Product ↔ UseCase ↔ Audience ↔ Capability ↔ Technique
- Migrating soft KB arrays to integrity-checked relationships
- Bounded one/two-hop expansion for SEO Context and Retrieval
- Provenance/visibility on curated business claims

Graph is **not** justified as a replacement for:

- Product→Variant→Category joins
- TechPack BOM / measurement matrices
- Price tiers / quotation math
- Media Bundle slot composition
- SEO Strategy→Cluster→Topic FK trees

### 2. Implementation approach

**ACCEPTED — Option A: PostgreSQL / Prisma graph tables** (`KnowledgeGraphEntity`, `KnowledgeGraphRelationship`) on Neon.

| Option | Verdict |
|--------|---------|
| A. Relational graph in Postgres | **ACCEPTED** |
| B. Many typed join tables per pair | **REJECTED** for V1 (combinatorial blow-up; harder governance) |
| C. Neo4j / external graph DB | **DEFERRED** until depth≥3 open traversal, multi-million edges, or Postgres CTE cost exceeds ops budget |

### 3. V1 entity types (first-class projection nodes)

**ACCEPTED:** PRODUCT, PRODUCT_CATEGORY, MATERIAL (`ProductionMaterial`), TRIM, PRINT_METHOD, CAPABILITY (from ManufacturingAsset/capability content), INDUSTRY, AUDIENCE, USE_CASE, CASE_STUDY (KB or CaseStudyRecord via sourceType), POLICY, FAQ, SEO_TOPIC, BLOG_POST, MEDIA_ASSET, MEDIA_BUNDLE, TECH_PACK, PATTERN, KNOWLEDGE_ENTRY

**DEFERRED / external-reference only:** FACTORY (use ProductionSupplier with category), SUPPLIER (reference via sourceType), CUSTOMER (INTERNAL only; no public node leak), CAMPAIGN, PROJECT, CERTIFICATE, BRAND_CONCEPT, PROCESS (ops-only until curated)

**REJECTED as automatic mirror of every row:** warehouse `Material`, every CRM Activity, every Quote/Order line, every Media term string.

### 4. V1 relationship types

**ACCEPTED curated/system set:**

- BELONGS_TO, PART_OF, USES, MADE_FROM, COMPATIBLE_WITH, NOT_COMPATIBLE_WITH
- SUPPORTS, REQUIRES, SUITABLE_FOR, TARGETS, APPLIES_TO
- HAS_CAPABILITY, HAS_MEDIA, FEATURED_IN, DOCUMENTED_BY, EVIDENCED_BY
- HAS_SEO_TOPIC, LINKS_TO, RELATED_TO, ALTERNATIVE_TO
- HAS_POLICY, HAS_MOQ_POLICY, HAS_LEAD_TIME_POLICY (policies point to KB POLICY entries — **values stay on Product**)

**REJECTED:** unrestricted free-form edge strings without allowlist; deep PRECEDES/FOLLOWS process graphs in V1.

### 5. Array migration order

1. `relatedEntryIds` → RELATED_TO / DOCUMENTED_BY  
2. `relatedProductIds` → APPLIES_TO / FEATURED_IN / DOCUMENTED_BY  
3. `relatedSeoTopicIds` → HAS_SEO_TOPIC / LINKS_TO  
4. `relatedMediaBundleIds` → HAS_MEDIA  
5. `relatedBlogPostIds` → FEATURED_IN / DOCUMENTED_BY  
6. `relatedLandingPageSlugs` last (slug soft refs → CONTENT nodes only when landing model is stable)

Arrays **remain** readable during dual-write until Retrieval prefers graph.

### 6. Retrieval consumption

**ACCEPTED:** Retrieval remains primary. Graph adds a **bounded expansion** adapter (max depth 2, max neighbours 40, visibility∩authority). Graph does not replace source adapters or conflict resolution.

### 7. Authority outside the graph

Product MOQ/lead/price, ProductionMaterial specs, CRM Customer PII, MediaAsset storage/URLs, SEO brief fields, TechPack BOM rows remain in their platforms. Graph stores pointers + display labels + edge metadata only.

### 8. Explicitly deferred

- Neo4j / embeddings / vector search  
- Full visual force-directed editor as primary UX  
- Auto-sync of every Product field into node metadata  
- Business rule engine  
- Reverse-publishing from graph into Product  
- Open recursive traversal  

### 9. Rollback

Graph tables are additive. Dual-write keeps arrays. Kill switch: disable graph expansion in Retrieval policy. Drop/ignore graph tables without changing master data.

### 10. When Neo4j later?

Only if: (a) bounded Postgres recursive CTE for approved query profiles exceeds ~200ms p95 at production cardinality, (b) multi-team need for open exploratory GQL, or (c) edge count/query mix that defeats indexed adjacency. Revisit after Phase 4 Retrieval integration with metrics.

## Consequences

- Sprint **12.0 (implementation)** may add migration `0075+` for graph foundation only after this ADR.  
- Sprint **12.0A** (this document set) creates **no** migration and **no** runtime change.  
- Graph editors must deep-link out to Product/Media/SEO/CRM admin screens — never re-edit source fields.

## References

- Schema: `prisma/schema.prisma` (KB ~2416+, SEO ~844+, Media, Production*, TechPack)  
- Authority: `src/features/ai-retrieval/ai-authority.ts`  
- Domain ownership: `docs/decisions/ADR-0003-domain-boundaries.md`  
- Detail: `docs/architecture/knowledge-graph/`
