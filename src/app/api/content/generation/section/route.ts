import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  CONTENT_GENERATION_SECTION_TYPES,
  type ContentGenerationType,
} from "@/features/content-generation/contracts/generation.types";
import type { ContentGenerationSelection } from "@/features/content-generation/services/proposal.service";
import { createContentProposal } from "@/features/content-generation/services/proposal.wiring";
import { toSafeProposalDetail } from "@/features/content-generation/services/history.service";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/**
 * Sprint 16.1 — the inline "✨ AI" section menu also offers a few
 * non-section-scoped suggestion types (FAQ/CTA/internal link/media) from
 * the same section context. They still validate/apply through the same
 * governed proposal pipeline; only the allow-list here needed to grow.
 */
const ADDITIONAL_ALLOWED_SECTION_ROUTE_TYPES: ContentGenerationType[] = [
  "FAQ_SUGGESTION",
  "CTA_SUGGESTION",
  "INTERNAL_LINK_SUGGESTION",
  "MEDIA_SUGGESTION",
];

const ALLOWED_SECTION_ROUTE_TYPES: string[] = [
  ...CONTENT_GENERATION_SECTION_TYPES,
  ...ADDITIONAL_ALLOWED_SECTION_ROUTE_TYPES,
];

function parseSectionType(raw: unknown): ContentGenerationType {
  if (typeof raw === "string" && ALLOWED_SECTION_ROUTE_TYPES.includes(raw)) {
    return raw as ContentGenerationType;
  }
  return "SECTION_DRAFT";
}

/**
 * Sprint 18.0 — optional text-selection anchor. Only accepted when every
 * field is present and well-typed; a malformed/partial selection is
 * dropped (never persisted half-formed) rather than rejecting the whole
 * request.
 */
function parseSelection(raw: unknown): ContentGenerationSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.start === "number" &&
    typeof o.end === "number" &&
    typeof o.textHash === "string" &&
    typeof o.draftVersion === "number"
  ) {
    return { start: o.start, end: o.end, textHash: o.textHash, draftVersion: o.draftVersion };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const topicId = typeof raw.topicId === "string" ? raw.topicId.trim() : "";
  const writingPlanId = typeof raw.writingPlanId === "string" ? raw.writingPlanId.trim() : "";
  const sectionId = typeof raw.sectionId === "string" ? raw.sectionId.trim() : "";

  if (!topicId || !writingPlanId || !sectionId) {
    return NextResponse.json(
      { message: "topicId, writingPlanId và sectionId là bắt buộc.", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const run = await createContentProposal({
      type: parseSectionType(raw.type),
      topicId,
      writingPlanId,
      writingDraftId: typeof raw.writingDraftId === "string" ? raw.writingDraftId : null,
      sectionId,
      contextBuildId: typeof raw.contextBuildId === "string" ? raw.contextBuildId : null,
      editorInstruction: typeof raw.editorInstruction === "string" ? raw.editorInstruction.slice(0, 2000) : null,
      selection: parseSelection(raw.selection),
      requestedBy: permission.user.userId ?? permission.user.username ?? null,
    });

    return NextResponse.json({
      proposal: toSafeProposalDetail(run),
      message: "Đã tạo đề xuất section. Cần Apply để ghi vào bản nháp — chưa tự động duyệt.",
    });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
