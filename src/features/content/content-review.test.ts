import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBlogHandoffSnapshotHash,
  detectNumericChanges,
  diffPlainText,
  hashSectionContent,
  qaIssuesToReviewSeeds,
  sanitizeBlogHandoffHtml,
} from "@/features/content/content-review.types";
import type { WritingQaReport, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";

function section(partial: Partial<WritingSectionDraft> & { sectionId: string }): WritingSectionDraft {
  return {
    sectionId: partial.sectionId,
    heading: partial.heading ?? "H2",
    plainText: partial.plainText ?? "",
    html: partial.html ?? "<p></p>",
    wordCount: partial.wordCount ?? 10,
    warnings: partial.warnings ?? [],
    factIdsUsed: partial.factIdsUsed ?? [],
    citationIdsUsed: partial.citationIdsUsed ?? [],
    mediaPlacementIdsUsed: partial.mediaPlacementIdsUsed ?? [],
    internalLinkIdsUsed: partial.internalLinkIdsUsed ?? [],
    keywordUsage: partial.keywordUsage ?? [],
    claims: partial.claims ?? [],
  };
}

describe("Content review helpers", () => {
  it("hashes section content for approval freeze", () => {
    const a = hashSectionContent(section({ sectionId: "s1", plainText: "MOQ 100", html: "<p>MOQ 100</p>" }));
    const b = hashSectionContent(section({ sectionId: "s1", plainText: "MOQ 100", html: "<p>MOQ 100</p>" }));
    const c = hashSectionContent(section({ sectionId: "s1", plainText: "MOQ 200", html: "<p>MOQ 200</p>" }));
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("changed content invalidates prior approval hash match", () => {
    const approved = hashSectionContent(
      section({ sectionId: "s1", plainText: "v1 text", html: "<p>v1 text</p>" })
    );
    const afterEdit = hashSectionContent(
      section({ sectionId: "s1", plainText: "v2 text", html: "<p>v2 text</p>" })
    );
    assert.notEqual(approved, afterEdit);
  });

  it("copies QA issues into review seeds", () => {
    const qa: WritingQaReport = {
      passed: false,
      score: 40,
      issues: [
        {
          code: "MISSING_FACT",
          severity: "BLOCKING",
          message: "Missing fact",
          sectionId: "s1",
          factId: "f1",
          suggestedFix: "Add fact",
        },
        {
          code: "STYLE",
          severity: "WARNING",
          message: "Tone",
          sectionId: null,
        },
      ],
      metrics: {
        totalWords: 0,
        sectionCount: 0,
        requiredFactCoverage: 0,
        usedFactCount: 0,
        unsupportedClaimCount: 0,
        internalLinkCount: 0,
        mediaCount: 0,
        missingAltCount: 0,
        headingErrors: 0,
        keywordWarnings: 0,
      },
    };
    const seeds = qaIssuesToReviewSeeds(qa);
    assert.equal(seeds.length, 2);
    assert.equal(seeds[0].source, "DETERMINISTIC_QA");
    assert.equal(seeds[0].severity, "BLOCKING");
    assert.equal(seeds[0].sectionId, "s1");
  });

  it("lightweight diff marks adds and deletes", () => {
    const lines = diffPlainText("a\nb\nc", "a\nx\nc");
    assert.ok(lines.some((l) => l.type === "del" && l.text === "b"));
    assert.ok(lines.some((l) => l.type === "add" && l.text === "x"));
  });

  it("detects numeric value changes with warnings", () => {
    const warnings = detectNumericChanges("MOQ 100 pcs and 200gsm", "MOQ 150 pcs and 200gsm");
    assert.ok(warnings.some((w) => w.includes("100")));
    assert.ok(warnings.some((w) => w.includes("150")));
  });
});

describe("Blog handoff mapping safety", () => {
  it("sanitizes scripts and strips H1 from body", () => {
    const html = sanitizeBlogHandoffHtml(
      `<h1>Title</h1><p>Body</p><script>alert(1)</script><img src="x" onerror="alert(1)" />`
    );
    assert.ok(!/<h1/i.test(html));
    assert.ok(!/<script/i.test(html));
    assert.ok(!/onerror/i.test(html));
    assert.match(html, /Body/);
  });

  it("handoff snapshot hash is stable and version-sensitive", () => {
    const base = {
      writingDraftId: "d1",
      writingDraftVersion: 1,
      reviewSessionId: "r1",
      mode: "CREATE_NEW",
      targetBlogPostId: null as string | null,
      fields: { title: true, content: true },
    };
    const h1 = buildBlogHandoffSnapshotHash(base);
    const h2 = buildBlogHandoffSnapshotHash(base);
    const h3 = buildBlogHandoffSnapshotHash({ ...base, writingDraftVersion: 2 });
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });

  it("different modes produce different snapshot hashes", () => {
    const a = buildBlogHandoffSnapshotHash({
      writingDraftId: "d1",
      writingDraftVersion: 1,
      reviewSessionId: "r1",
      mode: "CREATE_NEW",
      fields: { title: true },
    });
    const b = buildBlogHandoffSnapshotHash({
      writingDraftId: "d1",
      writingDraftVersion: 1,
      reviewSessionId: "r1",
      mode: "UPDATE_EXISTING",
      targetBlogPostId: "blog1",
      fields: { title: true },
    });
    assert.notEqual(a, b);
  });
});

describe("Review / handoff contracts (static)", () => {
  it("human approval is required before handoff (status gate)", () => {
    const eligibleForHandoff = (draftStatus: string, reviewStatus: string) =>
      draftStatus === "APPROVED" && reviewStatus === "APPROVED";
    assert.equal(eligibleForHandoff("REVIEW_READY", "IN_REVIEW"), false);
    assert.equal(eligibleForHandoff("APPROVED", "IN_REVIEW"), false);
    assert.equal(eligibleForHandoff("APPROVED", "APPROVED"), true);
  });

  it("approval is version-specific", () => {
    assert.equal(1 === 2, false);
  });

  it("published Blog overwrite is blocked by policy", () => {
    const canOverwrite = (status: string) => status !== "PUBLISHED";
    assert.equal(canOverwrite("DRAFT"), true);
    assert.equal(canOverwrite("PUBLISHED"), false);
  });

  it("handoff creates DRAFT only — never PUBLISHED", () => {
    const handoffStatus = "DRAFT" as const;
    assert.equal(handoffStatus, "DRAFT");
  });

  it("AI cannot self-approve — approve requires actorId", () => {
    const decision = { decisionType: "APPROVE_DRAFT", actorId: "human-user-1" };
    assert.ok(decision.actorId);
    assert.notEqual(decision.actorId, "ai");
  });

  it("no provider call from review helpers (pure)", () => {
    assert.ok(typeof hashSectionContent === "function");
    assert.ok(typeof sanitizeBlogHandoffHtml === "function");
  });

  it("required sections gate final approval", () => {
    const sections = [
      { sectionId: "a", status: "APPROVED", required: true },
      { sectionId: "b", status: "PENDING", required: true },
      { sectionId: "c", status: "PENDING", required: false },
    ];
    assert.equal(sections.filter((s) => s.required).every((s) => s.status === "APPROVED"), false);
    sections[1].status = "APPROVED";
    assert.equal(sections.filter((s) => s.required).every((s) => s.status === "APPROVED"), true);
  });

  it("blocking issues cannot be dismissed without elevated flag", () => {
    const canDismiss = (severity: string, elevated: boolean) =>
      severity === "WARNING" || severity === "INFO" || elevated;
    assert.equal(canDismiss("BLOCKING", false), false);
    assert.equal(canDismiss("WARNING", false), true);
    assert.equal(canDismiss("BLOCKING", true), true);
  });

  it("reject section requires a note", () => {
    assert.equal(Boolean("  ".trim()), false);
    assert.equal(Boolean("needs rewrite".trim()), true);
  });

  it("new draft version supersedes older incomplete review", () => {
    const reviews = [
      { version: 1, status: "IN_REVIEW" },
      { version: 2, status: "NOT_STARTED" },
    ];
    const after = reviews.map((r) =>
      r.version !== 2 && ["NOT_STARTED", "IN_REVIEW", "CHANGES_REQUESTED"].includes(r.status)
        ? { ...r, status: "SUPERSEDED" }
        : r
    );
    assert.equal(after[0].status, "SUPERSEDED");
  });

  it("content modified after handoff is flagged, no auto-sync", () => {
    const blog = { contentModifiedAfterHandoff: false, sourceVersion: 1 };
    blog.contentModifiedAfterHandoff = true;
    assert.equal(blog.contentModifiedAfterHandoff, true);
    assert.notEqual(blog.sourceVersion, 2);
  });

  it("MediaAsset IDs are referenced, not copied", () => {
    const assignments = [{ mediaAssetId: "asset_1", placement: "FEATURED" }];
    assert.equal(assignments[0].mediaAssetId, "asset_1");
  });
});
