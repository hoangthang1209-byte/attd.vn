import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getKnowledgeGraphExpansionFlagSnapshot } from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import {
  FIRST_ARTICLE_META,
  FIRST_ARTICLE_INTERNAL_LINKS,
  matchSectionContent,
} from "@/features/content/launch/first-article-draft.content";

describe("Sprint 13.5 first production article readiness", () => {
  it("keeps Knowledge Graph consumer expansion flags false by default", () => {
    const flags = getKnowledgeGraphExpansionFlagSnapshot();
    assert.equal(flags.global, false);
    assert.equal(flags.SEO_TOPIC_PLANNER, false);
    assert.equal(flags.SEO_BRIEF, false);
    assert.equal(flags.SEO_CONTENT, false);
    assert.equal(flags.rolloutMode, "OFF");
  });

  it("uses stable slug and primary keyword without fabricated metrics", () => {
    assert.equal(FIRST_ARTICLE_META.slug, "huong-dan-chon-ao-polo-dong-phuc-cong-ty");
    assert.equal(FIRST_ARTICLE_META.primaryKeyword, "áo polo đồng phục công ty");
    assert.match(FIRST_ARTICLE_META.metaDescription, /tư vấn|báo giá/i);
  });

  it("matches section content for core H2 headings", () => {
    assert.ok(matchSectionContent("Vì sao áo polo phù hợp làm đồng phục công ty?"));
    assert.ok(matchSectionContent("Quy trình đặt áo polo đồng phục"));
    assert.ok(matchSectionContent("Yêu cầu tư vấn và báo giá"));
    assert.match(
      matchSectionContent("Yêu cầu tư vấn và báo giá") ?? "",
      /số lượng dự kiến/i,
    );
  });

  it("only links to public non-admin destinations", () => {
    for (const link of FIRST_ARTICLE_INTERNAL_LINKS) {
      assert.ok(link.href.startsWith("/"));
      assert.doesNotMatch(link.href, /^\/admin/);
    }
  });

  it("rejects factory-ownership and exact commercial guarantees in draft corpus", () => {
    const body = readFileSync(
      "src/features/content/launch/first-article-draft.content.ts",
      "utf8",
    );
    assert.doesNotMatch(body, /sở hữu toàn bộ dây chuyền may|đảm bảo 100%|ISO\s*\d{3,}/i);
    assert.doesNotMatch(body, /MOQ từ \d+|giao hàng trong \d+ ngày/i);
  });

  it("GSC diagnostics remain connection-ready without secrets", () => {
    const service = readFileSync(
      "src/features/content/services/content-performance.service.ts",
      "utf8",
    );
    assert.match(service, /GOOGLE_SEARCH_CONSOLE_SITE_URL/);
    assert.match(service, /NOT_CONNECTED/);
    assert.doesNotMatch(service, /BEGIN PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}/);
  });

  it("documents GSC setup without secrets", () => {
    const doc = readFileSync("docs/operations/google-search-console.md", "utf8");
    assert.match(doc, /GOOGLE_SEARCH_CONSOLE_SITE_URL/);
    assert.match(doc, /DNS TXT/);
    assert.doesNotMatch(doc, /BEGIN PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}/);
  });

  it("ops script never auto-publishes or auto-approves review", () => {
    const script = readFileSync("scripts/content-first-article-ops.ts", "utf8");
    assert.match(script, /Never auto-approves Review/);
    assert.match(script, /Never publishes Blog/);
    assert.doesNotMatch(script, /approveContentReview\(/);
    assert.doesNotMatch(script, /approveSeoContentBrief\(/);
    assert.doesNotMatch(script, /publishBlog\(/);
    assert.doesNotMatch(script, /data:\s*\{\s*status:\s*"PUBLISHED"/);
  });
});
