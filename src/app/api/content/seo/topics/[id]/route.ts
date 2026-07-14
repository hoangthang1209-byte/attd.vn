import { NextRequest, NextResponse } from "next/server";
import {
  deleteSeoTopic,
  getSeoTopicById,
  updateSeoTopic,
} from "@/features/content/services/seo-topic.service";
import { listInternalLinksForTopic } from "@/features/content/services/seo-internal-link.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  parseEnum,
  parseJsonBody,
  parseStringArray,
  SEO_CONTENT_TYPES,
  SEO_FUNNEL_STAGES,
  SEO_SEARCH_INTENTS,
  SEO_TOPIC_PRIORITIES,
  SEO_TOPIC_STATUSES,
} from "@/features/content/seo/seo-api-utils";
import type { SeoTargetEntityType } from "@prisma/client";

const TARGET_ENTITY_TYPES = [
  "BLOG_POST",
  "LANDING_PAGE",
  "PRODUCT",
  "CATEGORY",
  "MANUFACTURING_ASSET",
  "DEALER_PAGE",
  "EXTERNAL",
  "NONE",
] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const topic = await getSeoTopicById(id);
  if (!topic) return NextResponse.json({ message: "Không tìm thấy chủ đề" }, { status: 404 });
  const internalLinks = await listInternalLinksForTopic(id);
  return NextResponse.json({ topic, internalLinks });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    const topic = await updateSeoTopic(id, {
      title: typeof raw.title === "string" ? raw.title : undefined,
      slug: raw.slug === null ? null : typeof raw.slug === "string" ? raw.slug : undefined,
      description:
        raw.description === null ? null : typeof raw.description === "string" ? raw.description : undefined,
      primaryKeyword: typeof raw.primaryKeyword === "string" ? raw.primaryKeyword : undefined,
      searchIntent: parseEnum(raw.searchIntent, SEO_SEARCH_INTENTS) ?? undefined,
      contentType: parseEnum(raw.contentType, SEO_CONTENT_TYPES) ?? undefined,
      funnelStage: parseEnum(raw.funnelStage, SEO_FUNNEL_STAGES) ?? undefined,
      priority: parseEnum(raw.priority, SEO_TOPIC_PRIORITIES) ?? undefined,
      status: parseEnum(raw.status, SEO_TOPIC_STATUSES) ?? undefined,
      targetAudience: parseStringArray(raw.targetAudience),
      businessValue: typeof raw.businessValue === "number" ? raw.businessValue : undefined,
      relevanceScore: typeof raw.relevanceScore === "number" ? raw.relevanceScore : undefined,
      opportunityScore: typeof raw.opportunityScore === "number" ? raw.opportunityScore : undefined,
      confidenceScore: typeof raw.confidenceScore === "number" ? raw.confidenceScore : undefined,
      targetEntityType:
        (parseEnum(raw.targetEntityType, TARGET_ENTITY_TYPES) as SeoTargetEntityType | null) ??
        undefined,
      targetEntityId:
        raw.targetEntityId === null ? null : typeof raw.targetEntityId === "string" ? raw.targetEntityId : undefined,
      targetUrl: raw.targetUrl === null ? null : typeof raw.targetUrl === "string" ? raw.targetUrl : undefined,
      existingUrl:
        raw.existingUrl === null ? null : typeof raw.existingUrl === "string" ? raw.existingUrl : undefined,
      canonicalUrl:
        raw.canonicalUrl === null ? null : typeof raw.canonicalUrl === "string" ? raw.canonicalUrl : undefined,
      notes: raw.notes === null ? null : typeof raw.notes === "string" ? raw.notes : undefined,
      assignedTo:
        raw.assignedTo === null ? null : typeof raw.assignedTo === "string" ? raw.assignedTo : undefined,
      dueDate:
        typeof raw.dueDate === "string" ? new Date(raw.dueDate) : raw.dueDate === null ? null : undefined,
      mediaBundleId:
        raw.mediaBundleId === null ? null : typeof raw.mediaBundleId === "string" ? raw.mediaBundleId : undefined,
      allowDuplicate: raw.allowDuplicate === true,
    });
    return NextResponse.json({ topic });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật chủ đề" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "delete", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    await deleteSeoTopic(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể xóa chủ đề" },
      { status: 400 },
    );
  }
}
