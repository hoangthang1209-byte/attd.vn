import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  groupReviewActivity,
  reviewActivityLabel,
} from "@/features/content/editorial/review-activity";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const EDITOR = read("src/components/admin/BlogPostEditor.tsx");
const PUBLISH_PANEL = read("src/components/admin/blog-editor/BlogPublishPanel.tsx");
const SEO_PANEL = read("src/components/admin/BlogSeoPanel.tsx");
const AI_READINESS_PANEL = read("src/components/admin/BlogAiReadinessPanel.tsx");
const READINESS_SIDEBAR = read("src/components/admin/blog-editor/BlogReadinessSidebar.tsx");
const QUICK_INSERT = read("src/components/admin/blog-editor/BlogQuickInsert.tsx");
const VISUAL_EDITOR = read("src/components/admin/blog-editor/BlogVisualModeEditor.tsx");
const BLOCK_ASSISTANT = read("src/components/admin/blog-editor/BlogBlockAssistant.tsx");
const REVIEW_DETAIL = read("src/components/admin/content/ContentReviewDetailClient.tsx");
const GLOBAL_CSS = read("src/app/globals.css");

describe("Sprint 13.6 — editorial UX production polish", () => {
  it("1. organises the Blog workspace into the target IA", () => {
    for (const label of ["Editor", "SEO", "Publishing", "AI Assistant", "Traceability"]) {
      assert.match(EDITOR, new RegExp(`label: "${label}"`), `missing tab ${label}`);
    }
    for (const section of ["Content", "FAQ", "Images", "Metadata", "Score", "Recommendations"]) {
      assert.match(EDITOR, new RegExp(`title="${section}"`), `missing section ${section}`);
    }
    for (const section of ["Publish", "Schedule", "History"]) {
      assert.match(PUBLISH_PANEL, new RegExp(`title="${section}"`), `missing section ${section}`);
    }
  });

  it("2. renders tabs with accessible tab semantics", () => {
    const tabs = read("src/components/admin/blog-editor/BlogWorkspaceTabs.tsx");
    assert.match(tabs, /role="tablist"/);
    assert.match(tabs, /role="tab"/);
    assert.match(tabs, /aria-selected/);
    assert.match(tabs, /role="tabpanel"/);
  });

  it("3. replaces page-level loaders with panel skeletons", () => {
    assert.match(EDITOR, /PanelSkeleton/);
    assert.match(PUBLISH_PANEL, /PanelSkeleton/);
    assert.match(READINESS_SIDEBAR, /PanelSkeleton/);
    assert.match(REVIEW_DETAIL, /PanelSkeleton/);
    assert.doesNotMatch(REVIEW_DETAIL, /AdminLoadingState/);
    assert.match(GLOBAL_CSS, /\.attd-skeleton__line/);
  });

  it("4. keeps the SEO sidebar sticky while editing", () => {
    assert.match(GLOBAL_CSS, /\.blog-workspace-sidebar\s*\{[^}]*position:\s*sticky/);
    assert.match(EDITOR, /blog-workspace-sidebar/);
    // Sprint 14.0 folded the three sidebar cards into one status card.
    assert.match(READINESS_SIDEBAR, /readiness\.statusLabel/);
    assert.match(READINESS_SIDEBAR, /SEO \{readiness\.quality\.score\}/);
    assert.match(READINESS_SIDEBAR, /Metadata/);
  });

  it("5. never lets the SEO panel claim publish readiness", () => {
    assert.doesNotMatch(SEO_PANEL, /Sẵn sàng xuất bản/);
    assert.doesNotMatch(SEO_PANEL, /getPublishReadiness/);
    assert.match(SEO_PANEL, /Điều kiện xuất bản nằm ở tab Publishing/);
  });

  it("6. gates the publish button on the canonical readiness only", () => {
    assert.match(PUBLISH_PANEL, /readiness\.status !== "READY"/);
    assert.doesNotMatch(PUBLISH_PANEL, /publish-readiness`\)/);
    assert.match(EDITOR, /useBlogReadiness/);
  });

  it("7. groups AI widgets so they read as assistance", () => {
    assert.match(EDITOR, /blog-ai-zone/);
    assert.match(EDITOR, /Khu vực AI hỗ trợ/);
    assert.match(EDITOR, /tone="ai"/);
    assert.match(AI_READINESS_PANEL, /không phải điều kiện chặn xuất bản/);
    assert.match(GLOBAL_CSS, /\.blog-workspace-section--ai/);
  });

  it("8. separates cover, in-content and advanced media", () => {
    // Sprint 14.0 renamed these to Cover / In-content / Advanced.
    assert.match(EDITOR, /Cover Image/);
    assert.match(EDITOR, /In-content Images/);
    assert.match(EDITOR, /Media References/);
  });

  it("9. compacts Quick Insert without removing actions", () => {
    assert.match(VISUAL_EDITOR, /<BlogQuickInsert onInsert=\{insertSnippet\} compact \/>/);
    assert.match(QUICK_INSERT, /QUICK_INSERT_SNIPPETS\.map/);
    assert.match(GLOBAL_CSS, /\.admin-quick-insert--compact/);
  });

  it("10. turns the Block Assistant into a collapsible drawer", () => {
    assert.match(BLOCK_ASSISTANT, /admin-block-assistant--drawer/);
    assert.match(BLOCK_ASSISTANT, /aria-expanded/);
    assert.doesNotMatch(BLOCK_ASSISTANT, /\[\{block\.label\}\]/);
    assert.match(GLOBAL_CSS, /\.admin-block-assistant__toggle/);
  });

  it("11. shows the content chain as a horizontal timeline", () => {
    const blogTimeline = read("src/components/admin/blog-editor/BlogTraceabilityTimeline.tsx");
    const reviewTimeline = read("src/components/admin/content/ReviewTraceabilityTimeline.tsx");
    for (const step of ["Draft", "Review", "Handoff", "Blog", "Publish"]) {
      assert.match(blogTimeline, new RegExp(`label: "${step}"`));
      assert.match(reviewTimeline, new RegExp(`label: "${step}"`));
    }
    assert.match(GLOBAL_CSS, /\.content-timeline\s*\{[^}]*grid-auto-flow:\s*column/);
    assert.match(REVIEW_DETAIL, /ReviewTraceabilityTimeline/);
  });

  it("12. collapses a run of section approvals into one activity row", () => {
    const decisions = Array.from({ length: 27 }, (_, index) => ({
      decisionType: "APPROVE_SECTION",
      createdAt: new Date(Date.UTC(2026, 6, 31, 7, index)).toISOString(),
    }));
    const groups = groupReviewActivity(decisions);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].count, 27);
    assert.equal(groups[0].label, "Đã duyệt 27 đoạn");
    assert.equal(groups[0].collapsible, true);
    assert.equal(groups[0].items.length, 27);
  });

  it("13. keeps distinct decisions as their own rows, newest first", () => {
    const groups = groupReviewActivity([
      { decisionType: "APPROVE_SECTION", createdAt: "2026-07-31T07:00:00.000Z" },
      { decisionType: "APPROVE_SECTION", createdAt: "2026-07-31T07:01:00.000Z" },
      { decisionType: "APPROVE_DRAFT", createdAt: "2026-07-31T08:00:00.000Z" },
      { decisionType: "HANDOFF_TO_BLOG", createdAt: "2026-08-01T08:29:00.000Z" },
    ]);
    assert.deepEqual(
      groups.map((group) => group.decisionType),
      ["HANDOFF_TO_BLOG", "APPROVE_DRAFT", "APPROVE_SECTION"],
    );
    assert.equal(groups[0].collapsible, false);
    assert.equal(groups[2].count, 2);
  });

  it("14. labels single and repeated decisions differently", () => {
    assert.equal(reviewActivityLabel("APPROVE_SECTION", 1), "Đã duyệt đoạn");
    assert.equal(reviewActivityLabel("APPROVE_SECTION", 5), "Đã duyệt 5 đoạn");
    assert.equal(reviewActivityLabel("HANDOFF_TO_BLOG", 1), "Bàn giao sang Blog");
    assert.equal(reviewActivityLabel("UNKNOWN_TYPE", 1), "UNKNOWN_TYPE");
  });

  it("15. renders an empty activity timeline safely", () => {
    assert.deepEqual(groupReviewActivity([]), []);
  });

  it("16. makes an approved review read-only apart from the allowed actions", () => {
    assert.match(REVIEW_DETAIL, /\{!approved && \(\s*<AdminLoadingButton[\s\S]{0,400}Chạy lại QA/);
    assert.match(REVIEW_DETAIL, /i\.status === "OPEN" && !approved/);
    assert.match(REVIEW_DETAIL, /Phiên đã phê duyệt — chỉ xem/);
    assert.match(REVIEW_DETAIL, /Xem lịch sử/);
    assert.match(REVIEW_DETAIL, /Xem nội dung đã duyệt/);
  });

  it("17. shows no approval error banner for an approved review", () => {
    assert.match(REVIEW_DETAIL, /\{!approved && groups\.length > 0 &&/);
  });

  it("18. surfaces blockers and warnings with distinct labels", () => {
    assert.match(EDITOR, /Blocker<\/span>/);
    assert.match(EDITOR, /Warning<\/span>/);
    assert.match(GLOBAL_CSS, /\.blog-readiness-issues \.is-blocker/);
    assert.match(GLOBAL_CSS, /\.blog-readiness-issues \.is-warning/);
  });

  it("19. keeps the preview aligned with the public article renderer", () => {
    const preview = read("src/features/blog/preview-content.ts");
    assert.match(preview, /normalizeBlogContent/);
    assert.match(preview, /prepareBlogArticleContent/);
    const previewComponent = read("src/components/admin/blog-editor/BlogEditorPreview.tsx");
    assert.match(previewComponent, /prose-blog prose-blog--article/);
  });

  it("20. preserves every editor capability after the reorganisation", () => {
    for (const marker of [
      "AiContentFactory",
      "BlogClusterGenerator",
      "BlogMediaWorkspace",
      "BlogFaqBuilder",
      "BlogTagInput",
      "BlogVisualEditor",
      "BlogSeoPanel",
      "BlogAiRecommendationsPanel",
      "BlogAiReadinessPanel",
      "BlogPublishPanel",
      "MediaPicker",
    ]) {
      assert.match(EDITOR, new RegExp(`<${marker}`), `lost ${marker}`);
    }
    assert.match(EDITOR, /canonicalUrl/);
    assert.match(EDITOR, /Tạo bài demo/);
    assert.match(EDITOR, /Sao chép URL/);
  });
});
