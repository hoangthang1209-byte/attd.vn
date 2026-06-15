import type { KnowledgeBaseEntryType } from "@prisma/client";
import { getDetailFieldsForType } from "@/features/knowledge-base/knowledge-base-detail-fields";
import { getCompletenessLabel } from "@/features/knowledge-base/knowledge-base-labels";

export type CompletenessCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  warning?: boolean;
};

export type CompletenessChecklistResult = {
  score: number;
  label: string;
  items: CompletenessCheckItem[];
  warnings: string[];
};

export function buildCompletenessChecklist(input: {
  title: string;
  summary: string | null;
  content: string | null;
  categoryId: string;
  tags: string[];
  structuredData: Record<string, unknown> | null;
  type: KnowledgeBaseEntryType;
  isVerified: boolean;
}): CompletenessChecklistResult {
  const items: CompletenessCheckItem[] = [];
  const warnings: string[] = [];

  items.push({
    id: "title",
    label: "Có tiêu đề",
    ok: Boolean(input.title.trim()),
  });
  items.push({
    id: "content",
    label: "Có nội dung",
    ok: Boolean(input.content?.trim() && input.content.trim().length >= 40),
  });
  items.push({
    id: "category",
    label: "Có danh mục",
    ok: Boolean(input.categoryId),
  });
  items.push({
    id: "tags",
    label: "Có tags",
    ok: input.tags.length > 0,
  });

  const detailFields = getDetailFieldsForType(input.type);
  const hasDetail = Boolean(
    input.structuredData && Object.keys(input.structuredData).length > 0
  );
  items.push({
    id: "detail",
    label: "Có dữ liệu chi tiết",
    ok: hasDetail,
  });

  items.push({
    id: "verified",
    label: "Đã kiểm chứng",
    ok: input.isVerified,
    warning: !input.isVerified,
  });

  if (!input.isVerified) {
    warnings.push("Chưa kiểm chứng");
  }

  const data = input.structuredData ?? {};
  const textBlob = `${input.title} ${input.summary ?? ""} ${input.content ?? ""}`.toLowerCase();

  if (detailFields.some((f) => f.key === "moq") && !data.moq && !/moq/i.test(textBlob)) {
    warnings.push("Thiếu MOQ");
  }
  if (
    detailFields.some((f) => f.key === "leadTime") &&
    !data.leadTime &&
    !/lead time|timeline|thời gian sản xuất/i.test(textBlob)
  ) {
    warnings.push("Thiếu Lead Time");
  }
  if (
    detailFields.some((f) => f.key === "material") &&
    !data.material &&
    !/cotton|cvc|poly|chất liệu/i.test(textBlob)
  ) {
    warnings.push("Thiếu chất liệu");
  }
  if (
    (input.type === "POLICY" || input.type === "LOGISTICS") &&
    !data.conditions &&
    !data.policyName
  ) {
    warnings.push("Thiếu chính sách chi tiết");
  }

  let score = 0;
  if (input.title.trim()) score += 12;
  if (input.summary?.trim()) score += 10;
  if (input.content?.trim() && input.content.trim().length >= 80) score += 22;
  if (input.categoryId) score += 8;
  if (input.tags.length > 0) score += 8;
  if (hasDetail) score += 20;
  if (input.isVerified) score += 10;
  if (warnings.length === 0 && hasDetail) score += 10;

  score = Math.min(100, score);

  return {
    score,
    label: getCompletenessLabel(score),
    items,
    warnings: [...new Set(warnings)],
  };
}

export function computeDashboardKpis(
  entries: Array<{ completenessScore?: number; isVerified: boolean }>
): {
  verifiedPercent: number;
  aiReadyPercent: number;
  missingDataCount: number;
} {
  if (entries.length === 0) {
    return { verifiedPercent: 0, aiReadyPercent: 0, missingDataCount: 0 };
  }
  const verifiedCount = entries.filter((e) => e.isVerified).length;
  const aiReadyCount = entries.filter((e) => (e.completenessScore ?? 0) >= 90).length;
  const missingDataCount = entries.filter((e) => (e.completenessScore ?? 0) < 40).length;

  return {
    verifiedPercent: Math.round((verifiedCount / entries.length) * 100),
    aiReadyPercent: Math.round((aiReadyCount / entries.length) * 100),
    missingDataCount,
  };
}
