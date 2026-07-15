# Knowledge Graph × Enterprise AI Retrieval Integration

Design only. Retrieval remains the primary factual pipeline.

## Pattern

```
Text/structured source adapters (existing)
        +
Optional bounded graph expansion (new adapter OR post-retrieve expander)
        +
Visibility ∩ consumer policy
        +
Authority / conflict resolution (existing ai-authority.ts)
        +
Dedup + public-output safety
        +
Context / Writer package
```

Graph **enriches** neighbourhood context; it does **not** invent MOQ/price/lead-time.

## Proposed surface

`src/features/ai-retrieval/sources/knowledge-graph.adapter.ts` (future)  
or `expandAiRetrievalWithGraph(facts, scope, policy)` after initial retrieve.

### Inputs

- Seed entity IDs from query (Product, SeoTopic, KB hits)  
- Consumer profile (public SEO writer vs internal sales)  
- Max depth (default **2**)  
- Max neighbours (**40**)  
- Allowed relationship types by consumer  

### Public SEO writer allowlist (example)

SUITABLE_FOR, TARGETS, HAS_MEDIA, DOCUMENTED_BY, EVIDENCED_BY, HAS_SEO_TOPIC, LINKS_TO, COMPATIBLE_WITH, RELATED_TO, FEATURED_IN, APPLIES_TO

Deny: anything incident on CUSTOMER; CONFIDENTIAL edges; HAS_MOQ_POLICY value payloads (may include policy *titles* only)

### Scoring

Small bonus for ACTIVE curated edges with evidence (`+` confidence / authorityRank).  
SYSTEM_DERIVED edges get lower narrative weight than Product adapter facts.

### Conflict

If graph-linked KB structured fact conflicts with Product MOQ, existing Product authority wins. Graph expansion must attach provenance path: `PRODUCT --SUITABLE_FOR--> USE_CASE --DOCUMENTED_BY--> ENTRY`.

### Manifest

Add optional `graphPaths: Array<{ from, type, to, origin, status }>` to Retrieval / Context manifests (no confidential nodes).

## Feature flag

`KNOWLEDGE_GRAPH_EXPANSION_ENABLED=false` default.

## Non-goals

- Graph-only retrieval without Product/KB adapters  
- Unbounded BFS  
- Embedding similarity as graph substitute in 12.0  
