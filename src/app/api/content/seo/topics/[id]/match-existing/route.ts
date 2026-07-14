import { NextRequest, NextResponse } from "next/server";
import { getSeoTopicById } from "@/features/content/services/seo-topic.service";
import { matchExistingContentForTopic } from "@/features/content/services/seo-existing-content.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const topic = await getSeoTopicById(id);
  if (!topic) return NextResponse.json({ message: "Không tìm thấy chủ đề" }, { status: 404 });

  const matches = await matchExistingContentForTopic({
    title: topic.title,
    primaryKeyword: topic.primaryKeyword,
    slug: topic.slug,
    targetUrl: topic.targetUrl,
  });

  return NextResponse.json({ matches });
}
