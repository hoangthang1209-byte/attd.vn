import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiRetrievedFact } from "@/features/ai-retrieval/ai-retrieval-types";
import {
  assertAndRepairFinalGraphGrowth,
  compactGraphAddedFact,
  enforcePreAssemblyGraphBudget,
  estimateFactRenderCharacters,
  getIntentGraphFactCaps,
  mandatoryBaselineChecksum,
  resolveGraphContextBudget,
  scoreGraphFactValue,
} from "@/features/ai-retrieval/graph-context-budget.service";
import { GRAPH_CONTEXT_GROWTH } from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";

function fact(partial: Partial<AiRetrievedFact> & Pick<AiRetrievedFact, "id" | "sourceType" | "sourceId" | "title">): AiRetrievedFact {
  return {
    visibility: "PUBLIC",
    publicOutputAllowed: true,
    authorityRank: 70,
    stale: false,
    matchedOn: ["graph:PRODUCT→SUITABLE_FOR→USE_CASE"],
    relevanceScore: 20,
    warnings: ["graph_scope_enrichment_only"],
    summary: "short",
    ...partial,
  };
}

describe("Graph context budget reservation", () => {
  it("reserves baseline and calculates graph allowance from target growth", () => {
    const budget = resolveGraphContextBudget({
      baselineCharacters: 1000,
      maxContextCharacters: 50_000,
    });
    assert.equal(budget.targetGrowthPercent, 0.3);
    assert.equal(budget.hardGrowthPercent, 0.35);
    assert.equal(budget.maximumGraphCharacters, 300);
    assert.equal(GRAPH_CONTEXT_GROWTH.hardMaxPercent, 35);
  });

  it("trims proposed graph package before merge while preserving baseline", () => {
    const baseline = fact({
      id: "b1",
      sourceType: "PRODUCT",
      sourceId: "p1",
      title: "baseline product",
      warnings: [],
      matchedOn: [],
      relevanceScore: 50,
      authorityRank: 90,
    });
    const verbose = fact({
      id: "g1",
      sourceType: "KNOWLEDGE_BASE",
      sourceId: "k1",
      title: "long kb",
      summary: "x".repeat(2000),
      relevanceScore: 12,
    });
    const compactUseful = fact({
      id: "g2",
      sourceType: "PRINT_METHOD",
      sourceId: "pm1",
      title: "in lua",
      summary: "compatible",
      matchedOn: ["graph:PRODUCT→SUPPORTS→PRINT_METHOD"],
      relevanceScore: 40,
      authorityRank: 85,
    });

    const { facts, diagnostics } = enforcePreAssemblyGraphBudget({
      baselineFactIds: new Set(["b1"]),
      facts: [baseline, verbose, compactUseful],
      consumer: "SEO_BRIEF",
      query: "áo polo đồng phục công ty",
      maxContextCharacters: 8000,
      baselineCharactersOverride: 1000,
    });

    assert.ok(facts.some((f) => f.id === "b1"));
    assert.equal(diagnostics.mandatoryBaselinePreserved, true);
    assert.ok(diagnostics.acceptedGraphCharacters <= diagnostics.graphAllowance + 5);
    assert.ok(diagnostics.acceptedGrowthPercent <= 35);
  });

  it("prefers compact authoritative fact over long duplicate KB text", () => {
    const longKb = fact({
      id: "kb",
      sourceType: "KNOWLEDGE_BASE",
      sourceId: "k1",
      title: "kb",
      summary: "y".repeat(900),
      relevanceScore: 15,
    });
    const print = fact({
      id: "pm",
      sourceType: "PRINT_METHOD",
      sourceId: "pm1",
      title: "Screen print",
      summary: "compatible with cotton",
      matchedOn: ["graph:PRODUCT→COMPATIBLE_WITH→PRINT_METHOD"],
      relevanceScore: 30,
      authorityRank: 90,
    });
    const longScore = scoreGraphFactValue({
      fact: longKb,
      consumer: "SEO_BRIEF",
      intent: "TECHNIQUE",
      baselineKeys: new Set(),
    });
    const printScore = scoreGraphFactValue({
      fact: print,
      consumer: "SEO_BRIEF",
      intent: "TECHNIQUE",
      baselineKeys: new Set(),
    });
    assert.ok(printScore.valueDensity > longScore.valueDensity);
  });

  it("compacts planner Blog payload without full body", () => {
    const blog = fact({
      id: "blog1",
      sourceType: "BLOG_POST",
      sourceId: "b",
      title: "Polo guide",
      summary: "full excerpt ".repeat(40),
      content: "FULL BODY ".repeat(200),
      sourceUrl: "/blog/polo",
      structuredData: { slug: "polo" },
    });
    const compact = compactGraphAddedFact(blog, "SEO_TOPIC_PLANNER");
    assert.equal(compact.content, null);
    assert.ok((compact.summary?.length ?? 0) <= 160);
    assert.ok(!String(compact.summary).includes("FULL BODY"));
  });

  it("bounds brief Blog excerpt", () => {
    const blog = fact({
      id: "blog1",
      sourceType: "BLOG_POST",
      sourceId: "b",
      title: "OEM",
      summary: "z".repeat(500),
    });
    const compact = compactGraphAddedFact(blog, "SEO_BRIEF");
    assert.ok((compact.summary?.length ?? 0) <= 221);
  });

  it("falls back to baseline when rendered growth stays over hard target", () => {
    const baseline = fact({
      id: "b1",
      sourceType: "PRODUCT",
      sourceId: "p1",
      title: "base",
      warnings: [],
      matchedOn: [],
    });
    const huge = fact({
      id: "g1",
      sourceType: "KNOWLEDGE_BASE",
      sourceId: "k1",
      title: "huge",
      summary: "w".repeat(5000),
      relevanceScore: 11,
    });
    const repaired = assertAndRepairFinalGraphGrowth({
      baselineFactIds: new Set(["b1"]),
      facts: [baseline, huge],
      baselineCharacters: 100,
      finalCharacters: 8000,
    });
    assert.equal(repaired.fallbackToBaseline, true);
    assert.ok(repaired.facts.every((f) => f.id === "b1"));
  });

  it("preserves mandatory baseline checksum", () => {
    const a = [
      fact({ id: "1", sourceType: "PRODUCT", sourceId: "p", title: "t", warnings: [], matchedOn: [] }),
    ];
    const checksum = mandatoryBaselineChecksum(a);
    assert.ok(checksum.includes("PRODUCT:p"));
  });

  it("applies PRODUCT_COMMERCIAL intent caps", () => {
    const caps = getIntentGraphFactCaps("PRODUCT_COMMERCIAL");
    assert.equal(caps.maxCapability, 2);
    assert.equal(caps.maxKnowledge, 2);
    assert.equal(caps.maxBlog, 2);
    assert.equal(caps.excludeCategory, true);
  });

  it("estimates fact render characters deterministically", () => {
    const f = fact({
      id: "x",
      sourceType: "PRODUCT",
      sourceId: "p",
      title: "Title",
      summary: "abc",
    });
    assert.ok(estimateFactRenderCharacters(f) > 50);
  });
});
