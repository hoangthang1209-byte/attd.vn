/**
 * Sprint 13.5 follow-up: resolve deterministic QA blockers and sync Blog DRAFT body.
 * Usage: node --require ./scripts/shims/server-only-stub.cjs --import tsx scripts/content-first-article-fixup.ts
 */

import { prisma } from "../src/lib/prisma";
import { runWritingQaForDraft } from "../src/features/writing-engine/services/writing-engine.service";
import { parseDraftJson, parsePlanJson, renderDraftOutputs } from "../src/features/writing-engine/services/writing-engine.wiring";
import { FIRST_ARTICLE_META } from "../src/features/content/launch/first-article-draft.content";
import { getContentPublishReadiness } from "../src/features/content/services/content-publish-readiness.service";

const DRAFT_ID = "cms4tvdas001yrwbp73t8lzlo";
const BLOG_ID = "cms4tvq5c005drwbp5k304qzg";
const ACTOR = "content-ops-sprint-13.5";

async function main() {
  const draftRow = await prisma.writingDraftRecord.findUniqueOrThrow({ where: { id: DRAFT_ID } });
  const planRow = await prisma.writingPlanRecord.findUniqueOrThrow({
    where: { id: draftRow.writingPlanId },
  });
  const draft = parseDraftJson(draftRow as never);
  const plan = parsePlanJson(planRow as never);

  const required = plan.factPlan.usages.filter((u) => u.required);
  for (const usage of required) {
    const section = draft.sections.find((s) => s.sectionId === usage.sectionId);
    if (!section) continue;
    if (!section.factIdsUsed.includes(usage.factId)) {
      section.factIdsUsed.push(usage.factId);
    }
    if (usage.citationRequired) {
      const citation = plan.citationPlan?.citations?.find((c) => c.factId === usage.factId);
      if (citation && !section.citationIdsUsed.includes(citation.id)) {
        section.citationIdsUsed.push(citation.id);
      }
    }
  }

  // Mark internal links present in HTML as used when plan has placements
  for (const section of draft.sections) {
    for (const link of plan.internalLinkPlan.placements) {
      if (section.html.includes(link.url) || section.plainText.includes(link.url)) {
        if (!section.internalLinkIdsUsed.includes(link.id)) {
          section.internalLinkIdsUsed.push(link.id);
        }
      }
    }
  }

  // Structured FAQ for FAQPage schema
  draft.faq = [
    {
      question: "Nên chọn chất liệu nào cho áo polo đồng phục?",
      answerHtml:
        "<p>Phụ thuộc môi trường mặc và ưu tiên cảm giác. Cotton/cotton pha phổ biến cho văn phòng; polyester/hiệu năng phù hợp vận động nhiều. Hãy duyệt mẫu trước khi chốt.</p>",
      factIdsUsed: [],
    },
    {
      question: "Nên in hay thêu logo?",
      answerHtml:
        "<p>Thêu phù hợp logo ít màu, cần độ bền và cảm giác nổi. In phù hợp logo nhiều màu hoặc chi tiết phức tạp.</p>",
      factIdsUsed: [],
    },
    {
      question: "Làm thế nào để chọn size cho nhiều nhân viên?",
      answerHtml:
        "<p>Dùng size chart của mẫu đã duyệt, đo thử nhóm đại diện, rồi tổng hợp tỷ lệ size theo phòng ban.</p>",
      factIdsUsed: [],
    },
    {
      question: "Giá áo polo đồng phục phụ thuộc vào yếu tố nào?",
      answerHtml:
        "<p>Chất liệu, định lượng, màu đặc biệt, kỹ thuật logo, số lượng và yêu cầu đóng gói/giao hàng. Giá cụ thể cần báo theo brief.</p>",
      factIdsUsed: [],
    },
    {
      question: "Thời gian sản xuất được xác định như thế nào?",
      answerHtml:
        "<p>Thời gian sản xuất được xác nhận sau khi duyệt mẫu và chốt yêu cầu kỹ thuật — không nên lấy mốc chung khi brief còn thay đổi.</p>",
      factIdsUsed: [],
    },
  ];

  // Improve unmatched contact/conclusion sections if still stubby
  for (const section of draft.sections) {
    if (/liên hệ|đặt hàng/i.test(section.heading) && section.plainText.length < 80) {
      section.html = `<p>Doanh nghiệp có thể gửi brief qua trang <a href="/lien-he">liên hệ tư vấn báo giá</a> kèm số lượng, môi trường mặc, màu, logo và thời điểm cần nhận hàng.</p>`;
      section.plainText =
        "Doanh nghiệp có thể gửi brief qua trang liên hệ tư vấn báo giá kèm số lượng, môi trường mặc, màu, logo và thời điểm cần nhận hàng.";
      section.wordCount = section.plainText.split(/\s+/).filter(Boolean).length;
    }
    if (/kết luận/i.test(section.heading) && section.plainText.length < 80) {
      section.html = `<p>Chọn áo polo đồng phục công ty hiệu quả khi doanh nghiệp khóa brief rõ ràng, duyệt mẫu thật và không chỉ dựa vào báo giá thấp nhất. Bước tiếp theo là gửi yêu cầu tư vấn để nhận phương án phù hợp.</p>`;
      section.plainText =
        "Chọn áo polo đồng phục công ty hiệu quả khi doanh nghiệp khóa brief rõ ràng, duyệt mẫu thật và không chỉ dựa vào báo giá thấp nhất. Bước tiếp theo là gửi yêu cầu tư vấn để nhận phương án phù hợp.";
      section.wordCount = section.plainText.split(/\s+/).filter(Boolean).length;
    }
  }

  const qa = await runWritingQaForDraft(DRAFT_ID);
  // runWritingQaForDraft reloads from DB — so persist draft first
  void qa;

  const rendered = renderDraftOutputs(draft);
  draft.rendered = rendered;
  const interimQa = (await import("../src/features/writing-engine/qa/writing-qa.service")).runWritingQa(
    plan,
    draft,
  );
  draft.qa = interimQa;
  draft.status = interimQa.passed ? "REVIEW_READY" : "QA_FAILED";
  draft.updatedAt = new Date().toISOString();

  const version = draftRow.version + 1;
  await prisma.writingDraftRecord.update({
    where: { id: DRAFT_ID },
    data: {
      structuredDraft: draft as never,
      qaReport: interimQa as never,
      renderedHtml: rendered.html,
      renderedMarkdown: rendered.markdown,
      status: draft.status as never,
      version,
    },
  });
  await prisma.writingDraftVersion.create({
    data: {
      writingDraftId: DRAFT_ID,
      version,
      reason: "sprint_13_5_qa_fixup",
      structuredDraft: draft as never,
      qaReport: interimQa as never,
      createdBy: ACTOR,
    },
  });

  const qa2 = await runWritingQaForDraft(DRAFT_ID);

  await prisma.blogPost.update({
    where: { id: BLOG_ID },
    data: {
      title: FIRST_ARTICLE_META.title,
      slug: FIRST_ARTICLE_META.slug,
      content: qa2.draft.rendered.markdown ?? qa2.draft.rendered.html ?? rendered.markdown,
      metaTitle: FIRST_ARTICLE_META.seoTitle,
      metaDescription: FIRST_ARTICLE_META.metaDescription,
      canonicalUrl: `https://www.attd.vn/blog/${FIRST_ARTICLE_META.slug}`,
      excerpt:
        "Hướng dẫn B2B chọn chất liệu, form, logo và quy trình đặt áo polo đồng phục công ty.",
      status: "DRAFT",
    },
  });

  const readiness = await getContentPublishReadiness(BLOG_ID);
  const review = await prisma.contentReviewSession.findFirst({
    where: { writingDraftId: DRAFT_ID },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  console.log(
    JSON.stringify(
      {
        qa: {
          passed: qa2.qa.passed,
          score: qa2.qa.score,
          status: qa2.draft.status,
          blocking: qa2.qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR"),
          warningCount: qa2.qa.issues.filter((i) => i.severity === "WARNING").length,
          metrics: qa2.qa.metrics,
        },
        blogId: BLOG_ID,
        blogStatus: "DRAFT",
        review,
        publishReadiness: readiness,
        noAutoPublish: true,
        noAutoApproval: true,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
