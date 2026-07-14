import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Lightweight governance rule tests (no DB).
 * Approve/revoke identity rules are enforced in the service by requiring actor
 * and never reading approvedBy from generic validation saves.
 */
describe("Knowledge governance rules", () => {
  it("does not allow fabricating approver via validation payload", async () => {
    const { validateKnowledgeBaseEntry } = await import(
      "@/features/knowledge-base/knowledge-base-validation"
    );
    const result = validateKnowledgeBaseEntry({
      title: "Test MOQ policy",
      slug: "test-moq-policy",
      categoryId: "cat_1",
      type: "POLICY",
      approvedBy: "hacker",
      evidenceUrl: "https://example.com/evidence",
      visibility: "PUBLIC",
      claimStatus: "FACT",
    });
    assert.equal(result.valid, true);
    assert.equal(
      (result.data as { approvedBy?: string } | undefined)?.approvedBy,
      undefined
    );
  });

  it("keeps claim statuses and visibility enums intact", async () => {
    const { KNOWLEDGE_CLAIM_STATUS_OPTIONS } = await import(
      "@/features/knowledge-base/knowledge-base-claim-governance"
    );
    const { KNOWLEDGE_VISIBILITY_OPTIONS } = await import(
      "@/features/knowledge-base/knowledge-base-visibility"
    );
    assert.ok(KNOWLEDGE_CLAIM_STATUS_OPTIONS.some((o) => o.id === "NEEDS_EVIDENCE"));
    assert.ok(KNOWLEDGE_VISIBILITY_OPTIONS.some((o) => o.id === "PUBLIC"));
    assert.ok(KNOWLEDGE_VISIBILITY_OPTIONS.some((o) => o.id === "CONFIDENTIAL"));
  });
});
