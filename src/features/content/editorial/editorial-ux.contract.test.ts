import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import {
  buildEditorialChecklist,
  deriveTopicDocumentNodes,
  deriveWorkflowNodeStates,
  DOCUMENT_WORKFLOW_STEPS,
  EDITORIAL_WORKFLOW_STEPS,
  getTopicNextAction,
  getTopicProgressPercent,
} from "@/features/content/editorial/editorial-ux";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Sprint 13.1 content editorial IA", () => {
  it("places editorial content routes under NỘI DUNG with editor-facing labels", () => {
    const content = adminNavigationSections.find((s) => s.label === "NỘI DUNG");
    assert.ok(content);
    const labels = content.platforms[0].items.map((i) => i.label);
    assert.ok(labels.includes("Dashboard"));
    assert.ok(labels.includes("Chủ đề"));
    assert.ok(labels.includes("Lịch biên tập"));
    assert.ok(labels.includes("Hướng dẫn biên tập"));
    assert.ok(labels.includes("Kiểm duyệt"));
    assert.ok(labels.includes("Xuất bản"));
    assert.ok(labels.includes("Blog"));
    assert.equal(
      content.platforms[0].items.find((i) => i.href === "/admin/content/seo")?.label,
      "Dashboard",
    );
  });

  it("removes SEO & GROWTH domain from the live sidebar", () => {
    assert.equal(
      adminNavigationSections.find((s) => s.label === "SEO & GROWTH"),
      undefined,
    );
  });

  it("maps content dashboard breadcrumbs to NỘI DUNG / Dashboard", () => {
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/seo").breadcrumbs, [
      "NỘI DUNG",
      "Dashboard",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/launch").breadcrumbs, [
      "NỘI DUNG",
      "Hướng dẫn biên tập",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/reviews").breadcrumbs, [
      "NỘI DUNG",
      "Kiểm duyệt",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/topics/abc").breadcrumbs, [
      "NỘI DUNG",
      "Workspace",
    ]);
  });

  it("dashboard client uses editorial Today Work and My Tasks copy", () => {
    const source = read("src/components/admin/seo-content/SeoDashboardClient.tsx");
    assert.match(source, /Today/);
    assert.match(source, /This Week/);
    assert.match(source, /Upcoming/);
    assert.match(source, /Việc của tôi/);
    assert.match(source, /Quy trình/);
    assert.match(source, /Sức khỏe nội dung/);
    assert.doesNotMatch(source, /SEO Content Platform/);
  });

  it("provides one primary next action per topic status", () => {
    assert.equal(getTopicNextAction("APPROVED").label, "Tạo Brief");
    assert.equal(getTopicNextAction("DRAFTING").label, "Tiếp tục viết");
    assert.equal(getTopicNextAction("DRAFTING").group, "needs_writing");
    assert.equal(getTopicNextAction("REVIEW").group, "needs_review");
    assert.equal(getTopicNextAction("DRAFTING").href("t1"), "/admin/content/topics/t1");
    assert.equal(EDITORIAL_WORKFLOW_STEPS.length, 8);
    const nodes = deriveWorkflowNodeStates({
      approvedTopics: 2,
      briefReadyTopics: 1,
      draftingTopics: 3,
      reviewTopics: 1,
      publishedTopics: 0,
      overdueTopics: 0,
      missingMediaTopics: 0,
    });
    assert.equal(nodes.writing, "active");
    assert.equal(nodes.review, "active");
  });

  it("document workspace helpers expose progress and checklist", () => {
    assert.equal(getTopicProgressPercent("DRAFTING"), 62);
    assert.equal(DOCUMENT_WORKFLOW_STEPS.length, 7);
    assert.equal(deriveTopicDocumentNodes("DRAFTING").draft, "active");
    const checklist = buildEditorialChecklist({
      status: "DRAFTING",
      briefApproved: true,
      outlineCount: 3,
      hasMetaTitle: true,
      hasMetaDescription: false,
      internalLinkCount: 0,
      hasMediaBundle: true,
      mediaPlanOk: false,
      hasTargetUrl: false,
    });
    assert.ok(checklist.some((i) => i.group === "content" && i.done));
    assert.ok(checklist.some((i) => i.id === "meta" && !i.done));
  });

  it("topic workspace route and client are document-first", () => {
    const page = read("src/app/(backend)/admin/content/topics/[id]/page.tsx");
    const client = read("src/components/admin/seo-content/SeoTopicDetailClient.tsx");
    // Sprint 16.2 split the workspace into a document header/toolbar/canvas/rail
    // component set — these markers now live in their respective files.
    const canvas = read("src/components/admin/seo-content/topic-workspace/TopicWritingCanvas.tsx");
    const rail = read("src/components/admin/seo-content/topic-workspace/TopicContextRail.tsx");
    const editorialUx = read("src/features/content/editorial/editorial-ux.ts");
    assert.match(page, /SeoTopicDetailClient/);
    assert.match(client, /Editorial Workspace/);
    assert.match(editorialUx, /Tiếp tục viết/);
    assert.match(rail, /Kiến thức|Knowledge/);
    assert.match(canvas, /id=\"writing\"/);
  });
});
