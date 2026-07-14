import { NextRequest, NextResponse } from "next/server";
import {
  bulkUpdateSeoTopics,
  createSeoTopic,
  listSeoTopics,
  type SeoTopicListFilters,
} from "@/features/content/services/seo-topic.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  parseEnum,
  parseJsonBody,
  SEO_CONTENT_TYPES,
  SEO_FUNNEL_STAGES,
  SEO_SEARCH_INTENTS,
  SEO_TOPIC_PRIORITIES,
  SEO_TOPIC_STATUSES,
} from "@/features/content/seo/seo-api-utils";

function filtersFromSearchParams(sp: URLSearchParams): SeoTopicListFilters {
  const statusParam = sp.get("status");
  const status = statusParam?.includes(",")
    ? statusParam.split(",").filter((s) => SEO_TOPIC_STATUSES.includes(s as never)) as SeoTopicListFilters["status"]
    : parseEnum(statusParam, SEO_TOPIC_STATUSES) ?? undefined;

  return {
    strategyId: sp.get("strategyId") ?? undefined,
    clusterId: sp.get("clusterId") ?? undefined,
    status,
    searchIntent: parseEnum(sp.get("searchIntent"), SEO_SEARCH_INTENTS) ?? undefined,
    contentType: parseEnum(sp.get("contentType"), SEO_CONTENT_TYPES) ?? undefined,
    funnelStage: parseEnum(sp.get("funnelStage"), SEO_FUNNEL_STAGES) ?? undefined,
    priority: parseEnum(sp.get("priority"), SEO_TOPIC_PRIORITIES) ?? undefined,
    assignedTo: sp.get("assignedTo") ?? undefined,
    hasTargetUrl: sp.get("hasTargetUrl") === "1" ? true : sp.get("hasTargetUrl") === "0" ? false : undefined,
    hasBundle: sp.get("hasBundle") === "1" ? true : sp.get("hasBundle") === "0" ? false : undefined,
    mediaPlanStatus: sp.get("mediaPlanStatus") ?? undefined,
    overdue: sp.get("overdue") === "1",
    search: sp.get("search") ?? undefined,
    quickView: sp.get("quickView") ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const topics = await listSeoTopics(filtersFromSearchParams(new URL(req.url).searchParams));
    return NextResponse.json({ topics });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải chủ đề" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "create", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  if (raw.action === "bulk-update") {
    const ids = Array.isArray(raw.ids) ? raw.ids.filter((v): v is string => typeof v === "string") : [];
    const count = await bulkUpdateSeoTopics(ids, {
      status: parseEnum(raw.status, SEO_TOPIC_STATUSES) ?? undefined,
      priority: parseEnum(raw.priority, SEO_TOPIC_PRIORITIES) ?? undefined,
      assignedTo: raw.assignedTo === null ? null : typeof raw.assignedTo === "string" ? raw.assignedTo : undefined,
      dueDate: typeof raw.dueDate === "string" ? new Date(raw.dueDate) : raw.dueDate === null ? null : undefined,
    });
    return NextResponse.json({ updated: count });
  }

  const clusterId = typeof raw.clusterId === "string" ? raw.clusterId : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  const primaryKeyword = typeof raw.primaryKeyword === "string" ? raw.primaryKeyword : "";
  const searchIntent = parseEnum(raw.searchIntent, SEO_SEARCH_INTENTS);
  const contentType = parseEnum(raw.contentType, SEO_CONTENT_TYPES);
  const funnelStage = parseEnum(raw.funnelStage, SEO_FUNNEL_STAGES);

  if (!clusterId || !title.trim() || !primaryKeyword.trim() || !searchIntent || !contentType || !funnelStage) {
    return NextResponse.json({ message: "Thiếu trường bắt buộc cho chủ đề" }, { status: 400 });
  }

  try {
    const result = await createSeoTopic({
      clusterId,
      title,
      primaryKeyword,
      searchIntent,
      contentType,
      funnelStage,
      slug: typeof raw.slug === "string" ? raw.slug : null,
      description: typeof raw.description === "string" ? raw.description : null,
      priority: parseEnum(raw.priority, SEO_TOPIC_PRIORITIES) ?? undefined,
      allowDuplicate: raw.allowDuplicate === true,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo chủ đề";
    const duplicates =
      err && typeof err === "object" && "duplicates" in err
        ? (err as { duplicates: unknown }).duplicates
        : undefined;
    return NextResponse.json(
      { message, duplicates },
      { status: message.includes("đã tồn tại") ? 409 : 400 },
    );
  }
}
