# Knowledge Graph — Migration Roadmap

Design only (Sprint 12.0A). No migration in this sprint.

## Principles

- Additive tables only  
- Dual-write / dual-read compatibility with KB arrays  
- Idempotent backfills (`sourceType+sourceId`, `from+to+type` uniques)  
- Feature-flag Retrieval expansion  
- Rollback = disable flag + stop writers; master data untouched  

---

## Phase 1 — Foundation (Sprint 12.0)

**Deliver:** Prisma migration `0075_knowledge_graph_foundation`, entity/relationship models, allowlist validation service, health diagnostic script (read-only).

| Risk | Mitigation |
|------|------------|
| Migration on Neon | Additive; no status changes to Blog/Product |
| Empty graph | Sync jobs next phase |

**Rollback:** Drop unused tables only if never written in prod; else leave empty.

---

## Phase 2 — System-derived projections + edges

**Backfill:**

1. Categories → PRODUCT_CATEGORY  
2. Products (ACTIVE) → PRODUCT + BELONGS_TO Category  
3. ProductionMaterial / Trim / PrintMethod → MATERIAL / TRIM / PRINT_METHOD  
4. SeoTopic → SEO_TOPIC (+ LINKS_TO from SeoInternalLinkOpportunity)  
5. MediaBundle (+ featured assignment links) → MEDIA_BUNDLE / HAS_MEDIA  
6. KnowledgeBaseEntry ACTIVE → KNOWLEDGE_ENTRY  

**Origin:** SYSTEM_DERIVED, status ACTIVE automatically.

**Idempotency:** upsert by `@@unique([sourceType, sourceId])`.

**Validation:** count nodes vs sources; spot-check 20 Products.

---

## Phase 3 — Import existing soft arrays

For each KB related* array ID that resolves:

- Create edge IMPORTED / ACTIVE or SUGGESTED if target missing  
- Log unbroken IDs to health report  

Keep arrays writable in KB UI; writers also upsert graph edges (dual-write).

**Risk:** dangling IDs — edges skipped + reported, never silent invent.

---

## Phase 4 — Retrieval integration (flagged)

See [retrieval-integration.md](./retrieval-integration.md).

Default flag **off**. Measure latency + fact gain. Enable for INTERNAL consumers first, then public SEO context.

**Rollback:** flag off; context packages unchanged source mix.

---

## Phase 5 — Curated high-value relationships

Seed USE_CASE / AUDIENCE / INDUSTRY with human curation:

- Corporate uniform, hospitality, bank uniform, gift, OEM private label  
- Material ↔ print compatibility for top 20 materials  

CURATED edges require approval workflow.

---

## Phase 6 — Graph admin UI

Routes from ADR (lists first). Deep-link to Product/Media/SEO editors.

No primary force-directed editing.

---

## Phase 7 — Deprecate arrays (later)

When Retrieval + UI read graph for ≥1 release:

1. Mark related* arrays deprecated in docs  
2. Make arrays read-only derived export (optional)  
3. Eventually stop writing arrays  

**Do not** delete columns in the same sprint as UI cutover.

---

## Compatibility matrix

| Consumer | During dual-write | After deprecate arrays |
|----------|-------------------|------------------------|
| KB editor | Arrays + graph edges | Graph primary |
| Retrieval | Sources unchanged until flag | + graph expansion |
| Context Builder | Via Retrieval | Same |
| Writing / Review / Publish | Unchanged | Unchanged |

---

## Production validation checklist (each phase)

- [ ] `prisma migrate deploy` on Neon  
- [ ] Health: broken sourceId = 0 for SYSTEM edges  
- [ ] Sample SEO topic “áo polo đồng phục” expansion ≤40 neighbours, depth≤2  
- [ ] No Product.defaultMoq values present in graph entity metadata  
- [ ] Customer nodes INTERNAL; public consumer sees 0 customer neighbours  
- [ ] Existing Review / Publish / Retrieval regression smoke  

---

## Sprint 12.0 recommended cut line

Ship Phases 1–2 + diagnostic health + optional Phase 3 import behind admin-only UI.  
Phase 4 flag off by default until measured.
