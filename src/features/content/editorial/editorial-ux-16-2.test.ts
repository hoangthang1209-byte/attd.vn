import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildEditorialProgressSnapshot,
  deriveSectionEditorialState,
  flattenOutlineForNav,
  getTopicNextAction,
  groupEditorialActivity,
  resolveTopicPrimaryCta,
  summarizeChecklistGroups,
  type EditorialChecklistItem,
} from "@/features/content/editorial/editorial-ux";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Sprint 16.2 — Editorial Workspace UX 2.0", () => {
  it("1. resolveTopicPrimaryCta surfaces exactly one Vietnamese CTA per status", () => {
    const drafting = resolveTopicPrimaryCta({ status: "DRAFTING" });
    assert.equal(drafting.label, "Tiếp tục viết");
    assert.equal(drafting.staysOnPage, true);
    assert.equal(drafting.href, null);

    const briefReady = resolveTopicPrimaryCta({ status: "BRIEF_READY" });
    assert.equal(briefReady.label, "Bắt đầu viết");
    assert.equal(briefReady.staysOnPage, true);

    const reviewNoId = resolveTopicPrimaryCta({ status: "REVIEW" });
    assert.equal(reviewNoId.label, "Mở kiểm duyệt");
    assert.equal(reviewNoId.href, "/admin/content/reviews");
    assert.equal(reviewNoId.staysOnPage, false);

    const reviewWithId = resolveTopicPrimaryCta({ status: "REVIEW", hasActiveReviewId: "rev1" });
    assert.equal(reviewWithId.label, "Mở kiểm duyệt");
    assert.equal(reviewWithId.href, "/admin/content/reviews/rev1");

    const publishedNoUrl = resolveTopicPrimaryCta({ status: "PUBLISHED" });
    assert.equal(publishedNoUrl.label, "Xem bài đã đăng");
    assert.equal(publishedNoUrl.staysOnPage, true);
    assert.equal(publishedNoUrl.href, null);

    const publishedWithUrl = resolveTopicPrimaryCta({ status: "PUBLISHED", publishedUrl: "/blog/abc" });
    assert.equal(publishedWithUrl.label, "Xem bài đã đăng");
    assert.equal(publishedWithUrl.href, "/blog/abc");
    assert.equal(publishedWithUrl.staysOnPage, false);

    // Every branch returns exactly one shape — no arrays, no multiple CTAs.
    for (const cta of [drafting, briefReady, reviewNoId, reviewWithId, publishedNoUrl, publishedWithUrl]) {
      assert.equal(typeof cta.label, "string");
      assert.equal(typeof cta.intent, "string");
    }
  });

  it("2. summarizeChecklistGroups compacts into 5 groups with tones", () => {
    const items: EditorialChecklistItem[] = [
      { id: "a", group: "content", label: "A", done: true },
      { id: "b", group: "content", label: "B", done: true },
      { id: "c", group: "seo", label: "C", done: false },
      { id: "d", group: "media", label: "D", done: true },
      { id: "e", group: "media", label: "E", done: false },
      { id: "f", group: "review", label: "F", done: false },
      { id: "g", group: "publish", label: "G", done: true },
    ];
    const groups = summarizeChecklistGroups(items);
    assert.equal(groups.length, 5);
    assert.deepEqual(
      groups.map((g) => g.key),
      ["content", "seo", "media", "review", "publish"],
    );
    const content = groups.find((g) => g.key === "content")!;
    assert.equal(content.total, 2);
    assert.equal(content.done, 2);
    assert.equal(content.tone, "complete");

    const seo = groups.find((g) => g.key === "seo")!;
    assert.equal(seo.tone, "blocked");

    const media = groups.find((g) => g.key === "media")!;
    assert.equal(media.tone, "needs_attention");

    const labels = groups.map((g) => g.label);
    assert.deepEqual(labels, ["Nội dung", "SEO", "Hình ảnh", "Kiểm duyệt", "Xuất bản"]);
  });

  it("3. buildEditorialProgressSnapshot exposes stage label and word targets, nulls when unknown", () => {
    const snapshot = buildEditorialProgressSnapshot({
      status: "DRAFTING",
      wordTargetMin: 800,
      wordTargetMax: 1200,
      internalLinkCount: 3,
      ctaReady: true,
    });
    assert.equal(snapshot.stageLabel, "Bản nháp");
    assert.equal(snapshot.progressPercent, 62);
    assert.equal(snapshot.wordTargetMin, 800);
    assert.equal(snapshot.wordTargetMax, 1200);
    assert.equal(snapshot.internalLinkCount, 3);
    assert.equal(snapshot.ctaReady, true);
    // Unknown writing metrics degrade to null/false rather than fabricated numbers.
    assert.equal(snapshot.wordCount, null);
    assert.equal(snapshot.sectionsWithContent, null);
    assert.equal(snapshot.qaBlockers, null);
    assert.equal(snapshot.reviewState, null);
    assert.equal(snapshot.mediaReady, false);
  });

  it("4. deriveSectionEditorialState never marks approved without a real review approval", () => {
    assert.equal(deriveSectionEditorialState({ hasHtml: false }), "empty");
    assert.equal(deriveSectionEditorialState({ hasHtml: true }), "drafting");
    assert.equal(deriveSectionEditorialState({ hasHtml: true, qaFailed: true }), "needs_attention");
    assert.equal(deriveSectionEditorialState({ hasHtml: true, qaFailed: false }), "qa_ok");
    // Only an explicit reviewApproved: true can produce "approved" — even with QA failing.
    assert.equal(deriveSectionEditorialState({ hasHtml: true, qaFailed: true, reviewApproved: true }), "approved");
    assert.equal(deriveSectionEditorialState({ hasHtml: false, reviewApproved: false }), "empty");
    assert.notEqual(deriveSectionEditorialState({ hasHtml: true, qaFailed: false }), "approved");
  });

  it("5. flattenOutlineForNav preserves order and marks H3 as nested", () => {
    const items = flattenOutlineForNav([
      { level: "H2", heading: "Giới thiệu" },
      { level: "H3", heading: "Bối cảnh" },
      { level: "H2", heading: "Kết luận" },
    ]);
    assert.equal(items.length, 3);
    assert.equal(items[0].depth, 0);
    assert.equal(items[1].depth, 1);
    assert.equal(items[2].depth, 0);
    assert.equal(items[0].heading, "Giới thiệu");
    assert.deepEqual(
      items.map((i) => i.index),
      [0, 1, 2],
    );
  });

  it("6. groupEditorialActivity de-duplicates repeated entries and sorts newest first", () => {
    const grouped = groupEditorialActivity([
      { at: "2024-01-01T00:00:00.000Z", text: "Đã lưu" },
      { at: "2024-01-03T00:00:00.000Z", text: "Đã lưu" },
      { at: "2024-01-02T00:00:00.000Z", text: "Brief đã duyệt" },
    ]);
    assert.equal(grouped.length, 2);
    assert.equal(grouped[0].text, "Đã lưu");
    assert.equal(grouped[0].count, 2);
    assert.equal(grouped[0].at, "2024-01-03T00:00:00.000Z");
    assert.equal(grouped[1].text, "Brief đã duyệt");
    assert.equal(grouped[1].count, 1);
  });

  it("7. getTopicNextAction maps DRAFTING to the Vietnamese 'Tiếp tục viết' CTA", () => {
    assert.equal(getTopicNextAction("DRAFTING").label, "Tiếp tục viết");
    assert.equal(getTopicNextAction("REVIEW").label, "Mở kiểm duyệt");
    assert.equal(getTopicNextAction("PUBLISHED").label, "Xem bài đã đăng");
  });

  const CLIENT = read("src/components/admin/seo-content/SeoTopicDetailClient.tsx");
  const CANVAS = read("src/components/admin/seo-content/topic-workspace/TopicWritingCanvas.tsx");
  const RAIL = read("src/components/admin/seo-content/topic-workspace/TopicContextRail.tsx");
  const TOOLBAR = read("src/components/admin/seo-content/topic-workspace/TopicEditorToolbar.tsx");
  const HEADER = read("src/components/admin/seo-content/topic-workspace/TopicDocumentHeader.tsx");
  const WRITING_ENGINE = read("src/components/admin/content/WritingEnginePanel.tsx");
  const PROJECT_DETAILS = read("src/components/admin/seo-content/topic-workspace/TopicProjectDetails.tsx");
  const ADVANCED_DRAWER = read("src/components/admin/seo-content/topic-workspace/TopicAdvancedDrawer.tsx");

  it("8. SeoTopicDetailClient rebuilds the layout around the document-first workspace components", () => {
    assert.match(CLIENT, /styles\.workspace/);
    assert.match(CLIENT, /<TopicDocumentHeader/);
    assert.match(CLIENT, /<TopicEditorToolbar/);
    assert.match(CLIENT, /<TopicWritingCanvas/);
    assert.match(CLIENT, /<TopicContextRail/);
    assert.match(CLIENT, /<TopicOutlineNav/);
    assert.match(CLIENT, /<TopicAdvancedDrawer/);
    assert.match(CLIENT, /<TopicProjectDetails/);
    assert.match(CLIENT, /<TopicMobileSheets/);
    // Full-width admin card stacks (Overview / Checklist / Knowledge / Media / Activity) are gone.
    assert.doesNotMatch(CLIENT, /admin-sidebar-title">Editorial Progress</);
    assert.doesNotMatch(CLIENT, /admin-sidebar-title">Checklist</);
  });

  it("9. id=\"writing\" still marks the writing canvas for scroll targets", () => {
    assert.match(CANVAS, /id="writing"/);
  });

  it("10. WritingEnginePanel accepts an optional canvasMode prop", () => {
    assert.match(WRITING_ENGINE, /canvasMode\??:\s*boolean/);
    assert.match(WRITING_ENGINE, /canvasMode\s*=\s*false/);
    assert.match(WRITING_ENGINE, /Cài đặt tạo nội dung/);
    // AI assistant and generate/edit actions are preserved, not removed.
    assert.match(WRITING_ENGINE, /WritingSectionAiAssistant/);
    assert.match(WRITING_ENGINE, /generateOne\(s\.id, "generate"\)/);
  });

  it("11. Focus mode is driven by the shared useEditorFocusMode hook and persists a preference", () => {
    assert.match(CLIENT, /useEditorFocusMode/);
    assert.match(CLIENT, /TOPIC_FOCUS_PREF_KEY|readTopicFocusPreference|writeTopicFocusPreference/);
    assert.match(TOOLBAR, /focus/);
    assert.match(HEADER, /aiStatusLabel/);
  });

  it("12. never flips on paid AI generation in source", () => {
    for (const source of [CLIENT, WRITING_ENGINE, RAIL, HEADER, TOOLBAR]) {
      assert.doesNotMatch(source, /CONTENT_GENERATION_ENABLED\s*=\s*true/);
      assert.doesNotMatch(source, /aiConfigured=\{true\}/);
    }
  });

  it("13. the Review CTA still points at /admin/content/reviews", () => {
    const editorialUx = read("src/features/content/editorial/editorial-ux.ts");
    assert.match(editorialUx, /\/admin\/content\/reviews/);
    assert.equal(getTopicNextAction("REVIEW").href("t1"), "/admin/content/reviews");
    assert.equal(resolveTopicPrimaryCta({ status: "REVIEW" }).href, "/admin/content/reviews");
  });

  it("14. plan details and advanced settings collapse by default", () => {
    assert.match(PROJECT_DETAILS, /defaultOpen(\s*=\s*false|\??:\s*boolean)/);
    assert.match(CLIENT, /<TopicProjectDetails\s*\n\s*defaultOpen=\{false\}/);
    assert.match(ADVANCED_DRAWER, /<details className="admin-sidebar-card">/);
  });
});
