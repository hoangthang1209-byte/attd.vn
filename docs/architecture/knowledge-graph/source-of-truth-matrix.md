# Source-of-Truth Matrix

Verified against Prisma models on ATTD.vn (`schema.prisma`), Sprint 12.0A.

**Rule:** Graph nodes reference authority; they do not become mutable copies of operational fields.

| Concept | Authority | Secondary / duplicate locations | Conflicts today | Retrieval authority | Proposed graph behavior |
|---------|-----------|----------------------------------|-----------------|---------------------|-------------------------|
| Product | `Product` | KB type PRODUCT; SEO `targetEntityType/Id` | Soft ID arrays may dangle | PRODUCT rank highest for specs | PRODUCT node → `sourceType=Product`, `sourceId` |
| Product category | `Category` (tree FK) | — | — | N/A joins | PRODUCT_CATEGORY node; BELONGS_TO SYSTEM_DERIVED |
| Product variant | `ProductVariant` | Overrides moq/lead/material | Variant vs product defaults | Variant then Product | Optional VARIANT later; V1 expand via Product |
| MOQ | `Product.defaultMoq`, `ProductVariant.moqOverride` | KB `structuredData.moqValue`/`moq` | KB can disagree | Product 100 > KB | **Never stored on graph**; policy edge HAS_MOQ_POLICY → KB POLICY only |
| Lead time | `Product.leadTime`, variant override | KB `leadTime*` | Same | Product 100 | Same — no copy |
| Pricing / tiers | `ProductPriceTier`, variant prices | KB PRICING type / marketing claims | Claims vs quotes | Public policies constrained | No price amounts on graph; POLICY/FAQ only |
| Material (mfg) | `ProductionMaterial` | Product.material string; KB MATERIAL | Two systems + free text | ProductionMaterial / Product domain rules | MATERIAL node → ProductionMaterial |
| Warehouse material | `Material` (ops) | `ProductMaterialRequirement` | Distinct from ProductionMaterial | Ops, not public SEO | **Not first-class V1**; avoid conflation |
| Fabric / GSM / composition | ProductionMaterial + Product.gsm/material | KB structured | String drift | Prefer ProductionMaterial when linked | Node metadata: display only; edit in Manufacturing |
| Trim | `ProductionTrim` | TechPackBomItem text | Optional FK | BOM operational | TRIM node projection |
| Print method | `PrintMethod` | Product supportsPrinting/Embroidery flags; KB | Flags vs catalog | Product flags + PrintMethod | PRINT_METHOD node; TECHNIQUE alias if needed |
| Embroidery / wash | PrintMethod / free text notes; TechPack | KB manufacturing | Soft | Prefer PrintMethod / TechPack notes | TECHNIQUE / PROCESS deferred curated |
| Production process | TechPack notes / ManufacturingAsset | Workflow tables | Content vs ops | Content adapters | CAPABILITY / PROCESS curated carefully |
| Capability | Product supports*; ManufacturingAsset content | KB | Soft | Product flags + mfg | CAPABILITY curated + HAS_CAPABILITY |
| Factory | No `Factory` model | `ProductionSupplier` categories; PatternSourceType.FACTORY | Naming | INTERNAL | Map to SUPPLIER projection (`ProductionSupplier`) |
| Supplier | `ProductionSupplier`, `MaterialSupplier` | — | Two supplier domains | INTERNAL | ProductionSupplier first |
| Customer | `Customer` | Case study text; KB CUSTOMER_SEGMENT | PII leakage risk | INTERNAL only | INTERNAL node; no public fields |
| Industry | Freeform / KB / SEO audience | Media term arrays | Soft | Soft | INDUSTRY curated entity |
| Audience | SeoTopic / cluster audience arrays; Product.targetCustomers | KB | Soft | Soft | AUDIENCE curated |
| Use case | Product.useCases[]; KB; SEO | Soft arrays | Soft | Soft | USE_CASE curated (high value V1) |
| Campaign / Project | No first-class public models | Growth plans | — | — | DEFER |
| Case study | `CaseStudyRecord` **or** KB CASE_STUDY | Unlinked duplicates | Two sources | Prefer KB verified + Product links | CASE_STUDY with explicit sourceType |
| Certificate | Absent as model | KB / media | Soft | Soft | DEFER or KB POLICY |
| Policy | KB type POLICY | — | — | Claim governance | POLICY = KnowledgeBaseEntry projection |
| FAQ | KB FAQ; Blog faqJson | Dual public FAQ | Possible overlap | Context prefers planned FAQ | FAQ entry node; Blog FAQ stays on BlogPost |
| Brand voice | KB BRAND_VOICE | Context brand block | Soft | Soft | KNOWLEDGE_ENTRY only |
| CTA | Brief / Writing Plan | — | Soft | Soft | Not graph — content tooling |
| SEO topic | `SeoTopic` | KB relatedSeoTopicIds | Soft IDs | SEO adapter | SEO_TOPIC node; SYSTEM BELONGS_TO cluster |
| Blog post | `BlogPost` | KB relatedBlogPostIds; handoff sources | Soft IDs | Public PUBLISHED only | BLOG_POST node |
| Media Asset | `MediaAsset` | URLs on Product/Blog fields; assignments | URL denorm vs assets | Visibility + assignment | MEDIA_ASSET node; never copy bytes |
| Media Bundle | `MediaBundle` | Topic.mediaBundleId FK; KB ids[] | Soft + FK mix | Bundle health | MEDIA_BUNDLE node; HAS_MEDIA SYSTEM from Topic FK |
| Tech Pack | `TechPack` | Notes free text | Ops | INTERNAL | TECH_PACK node INTERNAL |
| Pattern | `Pattern` | — | — | INTERNAL | PATTERN node |
| Knowledge entry | `KnowledgeBaseEntry` | structuredData overlaps | With Product | Domain authority ranks | KNOWLEDGE_ENTRY node + edges |
| Internal link | `SeoInternalLinkOpportunity` | Draft plan links | Soft in drafts | SEO | Prefer existing FK; graph LINKS_TO optional |
| ContentMediaAssignment | Assignment table | Featured URLs on Blog | dual | Media readiness | Prefer SYSTEM HAS_MEDIA from assignments |

## Array field recommendations (do not delete in 12.0A)

| Field | Recommendation |
|-------|----------------|
| `relatedProductIds` | Migrate → graph; dual-write; then derive/readonly |
| `relatedEntryIds` | Migrate first (same domain) |
| `relatedSeoTopicIds` | Migrate after Topic nodes exist |
| `relatedMediaBundleIds` | Prefer Topic FK + assignments; still migrate array |
| `relatedBlogPostIds` | Migrate after Blog nodes |
| `relatedLandingPageSlugs` | Keep array longer; unstable target model |
| `tags` / `aliases` | Remain arrays (search aids), not graph edges |
| `subjectTerms` (Media) | Remain Media vocabulary |
| Product `useCases` / `targetCustomers` | Gradually seed USE_CASE / AUDIENCE curated links |
