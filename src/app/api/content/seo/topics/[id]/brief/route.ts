import { NextRequest, NextResponse } from "next/server";
import {
  approveSeoContentBrief,
  getSeoContentBrief,
  upsertSeoContentBrief,
} from "@/features/content/services/seo-brief.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody, parseStringArray } from "@/features/content/seo/seo-api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const brief = await getSeoContentBrief(id);
  return NextResponse.json({ brief });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    const brief = await upsertSeoContentBrief(id, {
      workingTitle: typeof raw.workingTitle === "string" ? raw.workingTitle : null,
      proposedSlug: typeof raw.proposedSlug === "string" ? raw.proposedSlug : null,
      metaTitle: typeof raw.metaTitle === "string" ? raw.metaTitle : null,
      metaDescription: typeof raw.metaDescription === "string" ? raw.metaDescription : null,
      searchIntentNotes: typeof raw.searchIntentNotes === "string" ? raw.searchIntentNotes : null,
      audienceNotes: typeof raw.audienceNotes === "string" ? raw.audienceNotes : null,
      valueProposition: typeof raw.valueProposition === "string" ? raw.valueProposition : null,
      outline: raw.outline,
      questions: raw.questions,
      entities: parseStringArray(raw.entities),
      requiredSections: parseStringArray(raw.requiredSections),
      ctaType: typeof raw.ctaType === "string" ? raw.ctaType : null,
      ctaText: typeof raw.ctaText === "string" ? raw.ctaText : null,
      wordCountMin: typeof raw.wordCountMin === "number" ? raw.wordCountMin : null,
      wordCountMax: typeof raw.wordCountMax === "number" ? raw.wordCountMax : null,
      schemaTypes: parseStringArray(raw.schemaTypes),
      mediaRequirements: raw.mediaRequirements as never,
      editorNotes: typeof raw.editorNotes === "string" ? raw.editorNotes : null,
    });
    return NextResponse.json({ brief });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể lưu brief" },
      { status: 400 },
    );
  }
}
