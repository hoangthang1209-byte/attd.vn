import "server-only";

import { prisma } from "@/lib/prisma";
import { CONTENT_LAUNCH_KNOWLEDGE_DOMAINS } from "@/features/content/launch/content-launch.constants";
import type {
  ContentLaunchKnowledgeDomainResult,
  ContentLaunchKnowledgeReadiness,
} from "@/features/content/launch/content-launch.types";

function matchesTerms(haystack: string, terms: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

export async function evaluatePoloLaunchKnowledgeReadiness(): Promise<ContentLaunchKnowledgeReadiness> {
  const entries = await prisma.knowledgeBaseEntry.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: "polo", mode: "insensitive" } },
        { title: { contains: "đồng phục", mode: "insensitive" } },
        { title: { contains: "áo polo", mode: "insensitive" } },
        { summary: { contains: "polo", mode: "insensitive" } },
        { tags: { hasSome: ["polo", "dong-phuc", "dong_phuc", "uniform", "áo polo"] } },
        { domain: { contains: "polo", mode: "insensitive" } },
        { domain: { contains: "uniform", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      content: true,
      tags: true,
      domain: true,
      visibility: true,
      claimStatus: true,
      approvedAt: true,
      isVerified: true,
      evidenceUrl: true,
      sourceId: true,
      lastVerifiedAt: true,
      nextReviewAt: true,
      expiresAt: true,
    },
    take: 200,
  });

  const publicApproved = entries.filter(
    (e) => e.visibility === "PUBLIC" && e.approvedAt != null,
  );
  const retrievalReady = entries.filter(
    (e) =>
      (e.visibility === "PUBLIC" || e.visibility === "INTERNAL") &&
      (e.approvedAt != null || e.isVerified),
  );
  const confidentialLeakRisk = entries.filter((e) => e.visibility === "CONFIDENTIAL");

  const conflicts = entries
    .filter(
      (e) =>
        e.visibility === "PUBLIC" &&
        (e.claimStatus === "NEEDS_EVIDENCE" || e.claimStatus === "MARKETING_CLAIM"),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      reason: `claimStatus=${e.claimStatus} — không dùng làm fact số liệu cứng`,
    }));

  const now = Date.now();
  const staleFacts = entries
    .filter((e) => {
      if (e.expiresAt && e.expiresAt.getTime() < now) return true;
      if (e.nextReviewAt && e.nextReviewAt.getTime() < now) return true;
      return false;
    })
    .map((e) => ({ id: e.id, title: e.title }));

  const evidenceGaps = publicApproved
    .filter((e) => !e.evidenceUrl && !e.sourceId)
    .map((e) => ({ id: e.id, title: e.title }));

  const sourceLinks = publicApproved.map((e) => ({
    id: e.id,
    title: e.title,
    href: `/admin/knowledge-base?entry=${e.id}`,
  }));

  const coveredDomains: ContentLaunchKnowledgeDomainResult[] = [];
  const missingDomains: ContentLaunchKnowledgeDomainResult[] = [];

  for (const domain of CONTENT_LAUNCH_KNOWLEDGE_DOMAINS) {
    const matched = publicApproved.filter((e) => {
      const blob = [e.title, e.summary ?? "", e.content ?? "", e.domain ?? "", e.tags.join(" ")].join(
        " ",
      );
      return matchesTerms(blob, domain.terms);
    });
    const result: ContentLaunchKnowledgeDomainResult = {
      key: domain.key,
      label: domain.label,
      required: domain.required,
      available: matched.length > 0,
      publicApprovedCount: matched.length,
      entryIds: matched.map((m) => m.id),
      entryTitles: matched.map((m) => m.title),
    };
    if (matched.length > 0) coveredDomains.push(result);
    else missingDomains.push(result);
  }

  const hardBlockers: string[] = [];
  const warnings: string[] = [];

  if (publicApproved.length === 0) {
    hardBlockers.push("no usable public facts");
  }
  if (confidentialLeakRisk.length > 0) {
    warnings.push(
      `${confidentialLeakRisk.length} entry confidential liên quan polo/đồng phục — không đưa vào bài public.`,
    );
  }
  for (const conflict of conflicts) {
    warnings.push(`Claim cần kiểm chứng trước khi dùng số liệu: ${conflict.title} (${conflict.reason})`);
  }

  const moqMissing = missingDomains.some((d) => d.key === "moq");
  const leadMissing = missingDomains.some((d) => d.key === "lead_time");
  if (moqMissing) {
    warnings.push("MOQ unavailable — bài thông tin có thể xuất bản nếu không nêu số MOQ chính xác.");
  }
  if (leadMissing) {
    warnings.push(
      "Lead time unavailable — bài thông tin có thể xuất bản nếu không nêu lead time đảm bảo.",
    );
  }

  for (const gap of evidenceGaps.slice(0, 5)) {
    warnings.push(`Missing evidence: ${gap.title}`);
  }
  for (const legacy of publicApproved.filter((e) => e.isVerified && !e.approvedAt).slice(0, 5)) {
    warnings.push(`Legacy verified fact (no approvedAt): ${legacy.title}`);
  }

  const unsupportedFactory = publicApproved.filter((e) => {
    const blob = `${e.title} ${e.summary ?? ""} ${e.content ?? ""}`.toLowerCase();
    return blob.includes("sở hữu xưởng") || blob.includes("own factory") || blob.includes("owns a factory");
  });
  if (unsupportedFactory.length) {
    hardBlockers.push("unsupported factory/certification claim");
    for (const entry of unsupportedFactory.slice(0, 3)) {
      warnings.push(`Factory ownership claim không được hỗ trợ cho launch: ${entry.title}`);
    }
  }
  const certificationMentions = publicApproved.filter((e) => {
    const blob = `${e.title} ${e.summary ?? ""} ${e.content ?? ""}`.toLowerCase();
    return blob.includes("iso ") || blob.includes("chứng nhận");
  });
  if (certificationMentions.length) {
    warnings.push(
      "Có fact đề cập chứng nhận — chỉ dùng nếu claim đã duyệt; QA claim sẽ chặn nếu thiếu evidence.",
    );
  }

  const requiredMissing = missingDomains.filter((d) => d.required);
  if (requiredMissing.length > 3 && publicApproved.length > 0) {
    warnings.push(
      `Thiếu nhiều domain bắt buộc: ${requiredMissing.map((d) => d.label).join(", ")}.`,
    );
  }

  // Informational article may proceed without MOQ/lead time when avoiding exact claims.
  // Factory/certification hard blocker remains; zero public facts blocks.
  const informationalOk =
    publicApproved.length > 0 &&
    !hardBlockers.includes("unsupported factory/certification claim");

  return {
    availableFacts: entries.length,
    publicApprovedFacts: publicApproved.length,
    retrievalReadyFacts: retrievalReady.length,
    missingDomains,
    coveredDomains,
    conflicts,
    staleFacts,
    evidenceGaps,
    sourceLinks,
    hardBlockers,
    warnings,
    readyForInformationalArticle: informationalOk,
  };
}
