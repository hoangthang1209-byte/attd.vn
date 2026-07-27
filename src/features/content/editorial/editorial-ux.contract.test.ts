import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adminNavigationSections } from "@/lib/admin/admin-navigation";
import { getAdminBreadcrumbMeta } from "@/lib/admin/admin-breadcrumbs";
import {
  deriveWorkflowNodeStates,
  getTopicNextAction,
  EDITORIAL_WORKFLOW_STEPS,
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
    assert.ok(labels.includes("Viết bài"));
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
      "Viết bài",
    ]);
    assert.deepEqual(getAdminBreadcrumbMeta("/admin/content/reviews").breadcrumbs, [
      "NỘI DUNG",
      "Kiểm duyệt",
    ]);
  });

  it("dashboard client uses editorial Today Work and My Tasks copy", () => {
    const source = read("src/components/admin/seo-content/SeoDashboardClient.tsx");
    assert.match(source, /Việc hôm nay/);
    assert.match(source, /Việc của tôi/);
    assert.match(source, /Quy trình biên tập/);
    assert.match(source, /Sức khỏe nội dung/);
    assert.doesNotMatch(source, /SEO Content Platform/);
  });

  it("provides one primary next action per topic status", () => {
    assert.equal(getTopicNextAction("APPROVED").label, "Tạo Brief");
    assert.equal(getTopicNextAction("DRAFTING").group, "needs_writing");
    assert.equal(getTopicNextAction("REVIEW").group, "needs_review");
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
});
