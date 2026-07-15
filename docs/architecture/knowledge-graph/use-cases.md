# Knowledge Graph — Use-Case Validations

Walkthroughs against the proposed design (no implementation). Depth ≤2, ≤40 neighbours.

---

## SEO — “áo polo đồng phục công ty”

**Seeds:** SeoTopic (primary keyword), matched Product (áo polo), Category.

**Expected useful expansion:**

| Hop | Relation | Target | Why useful |
|-----|----------|--------|------------|
| 1 | BELONGS_TO | Category polo/uniform | Outline structure |
| 1 | SUITABLE_FOR | USE_CASE corporate uniform | Intent |
| 1 | TARGETS | AUDIENCE enterprise buyer | Tone |
| 1 | USES / MADE_FROM | MATERIAL cotton/Cavil / GSM | Specs via Manufacturing deep-link |
| 1 | SUPPORTS / COMPATIBLE_WITH | PRINT_METHOD embroidery / silk | Capability narrative |
| 1 | HAS_MEDIA | MEDIA_BUNDLE topic bundle | Imagery |
| 1 | HAS_SEO_TOPIC / LINKS_TO | sibling topics | Internal links |
| 2 | EVIDENCED_BY | CASE_STUDY / KB | Social proof |
| 2 | DOCUMENTED_BY | FAQ / POLICY | FAQPage fuel |

**Must not explode into:** all products, all media assets, all customers, price tiers, every BOM line.

**MOQ / lead:** pulled from Product adapter — **not** from graph edge payloads.

Additional topic smoke (same pattern): quà tặng doanh nghiệp; xưởng may áo thun số lượng lớn; in lụa số lượng lớn; OEM private label; đồng phục ngân hàng — each needs INDUSTRY/USE_CASE curated seeds.

---

## Sales Q&A

| Question | Authority | Graph role | Visibility |
|----------|-----------|------------|------------|
| MOQ áo polo? | Product.defaultMoq | At most HAS_MOQ_POLICY → narrative POLICY | Public only if Product public |
| Chất liệu đồng phục nhà hàng? | ProductionMaterial + curated SUITABLE_FOR | Graph matches MATERIAL↔USE_CASE | Public materials only |
| Private label? | Product.supportsOem + KB OEM POLICY | HAS_CAPABILITY / DOCUMENTED_BY | Public FAQ/policy |
| Ngân sách? | Quotation / price tiers — **not graph** | Point to Commercial; avoid inventing | INTERNAL pricing |
| Concert merchandise? | USE_CASE + Product SUITABLE_FOR | Curated | Public |

---

## Manufacturing

| Need | Authority | Graph |
|------|-----------|-------|
| Material ↔ print compatibility | Curated COMPATIBLE_WITH + evidence | Yes |
| Wash / trim / construction | TechPack BOM + notes | Graph pointers TECH_PACK INTERNAL; no BOM copy |
| Supplier availability | ProductionSupplier / ops | INTERNAL SUPPLIER nodes; not public SEO |
| Pattern ↔ TechPack | Existing FK | SYSTEM edge optional |

Graph must **not** duplicate BOM quantities or measurement matrices.

---

## Media

| Need | Prefer |
|------|--------|
| Images for Product | ContentMediaAssignment + Bundle → SYSTEM HAS_MEDIA |
| Process/factory shots | Bundle / ManufacturingAsset media; CAPABILITY HAS_MEDIA |
| Case-study authorized media | Case study + visibility; never leak Customer-linked confidential assets |
| SEO topic media | Topic.mediaBundleId FK already — sync as SYSTEM |

**Decision:** MEDIA_ASSET nodes useful when assignment-level provenance is needed; **Media Bundle relations cover most SEO/content flows**. V1 priorities: MEDIA_BUNDLE first; MEDIA_ASSET on demand from assignments.

---

## Outcome

Design passes these use cases **if** curated USE_CASE/AUDIENCE/COMPATIBLE_WITH edges exist and expansion stays bounded. Without curation, graph adds little beyond existing FKs and soft arrays — Phase 5 curation is mandatory for SEO/Sales ROI.
