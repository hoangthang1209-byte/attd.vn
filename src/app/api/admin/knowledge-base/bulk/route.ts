import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateKnowledgeBaseEntries } from "@/features/knowledge-base/knowledge-base-import-service";
import { bulkUpdateKnowledgeGovernance } from "@/features/knowledge-base/knowledge-base-governance.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type BulkAction =
  | "verify"
  | "unverify"
  | "archive"
  | "delete"
  | "changeCategory"
  | "changeStatus"
  | "changePriority"
  | "change_category"
  | "change_status"
  | "change_priority"
  | "setVisibility"
  | "setDomain"
  | "setReviewInterval"
  | "setOwner"
  | "linkSeoTopic"
  | "linkMediaBundle";

const GOVERNANCE_ACTIONS = new Set([
  "setVisibility",
  "setDomain",
  "setReviewInterval",
  "setOwner",
  "linkSeoTopic",
  "linkMediaBundle",
]);

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const entryIds = Array.isArray(raw.ids)
    ? raw.ids.filter((id): id is string => typeof id === "string")
    : Array.isArray(raw.entryIds)
      ? raw.entryIds.filter((id): id is string => typeof id === "string")
      : [];
  const action = raw.action as BulkAction;

  if (entryIds.length === 0) {
    return NextResponse.json({ message: "Chưa chọn mục nào." }, { status: 400 });
  }

  if ((action as string) === "approve" || (action as string) === "bulkApprove") {
    return NextResponse.json(
      { message: "Không hỗ trợ phê duyệt hàng loạt." },
      { status: 400 }
    );
  }

  const validActions: BulkAction[] = [
    "verify", "unverify", "archive", "delete",
    "changeCategory", "changeStatus", "changePriority",
    "change_category", "change_status", "change_priority",
    "setVisibility", "setDomain", "setReviewInterval", "setOwner",
    "linkSeoTopic", "linkMediaBundle",
  ];
  if (!validActions.includes(action)) {
    return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
  }

  try {
    if (GOVERNANCE_ACTIONS.has(action)) {
      const result = await bulkUpdateKnowledgeGovernance(entryIds, {
        visibility: typeof raw.visibility === "string" ? raw.visibility : undefined,
        domain: typeof raw.domain === "string" ? raw.domain : undefined,
        reviewIntervalDays:
          typeof raw.reviewIntervalDays === "number"
            ? raw.reviewIntervalDays
            : typeof raw.reviewIntervalDays === "string" && raw.reviewIntervalDays
              ? Number(raw.reviewIntervalDays)
              : undefined,
        ownerId: typeof raw.ownerId === "string" ? raw.ownerId : undefined,
        relatedSeoTopicIdsAppend:
          typeof raw.seoTopicId === "string" && raw.seoTopicId.trim()
            ? [raw.seoTopicId.trim()]
            : undefined,
        relatedMediaBundleIdsAppend:
          typeof raw.mediaBundleId === "string" && raw.mediaBundleId.trim()
            ? [raw.mediaBundleId.trim()]
            : undefined,
      });
      return NextResponse.json(result);
    }

    const result = await bulkUpdateKnowledgeBaseEntries({
      entryIds,
      action,
      value: typeof raw.value === "string" ? raw.value : undefined,
      categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
      status: typeof raw.status === "string" ? raw.status : undefined,
      priority: typeof raw.priority === "string" ? raw.priority : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/admin/knowledge-base/bulk]", err);
    return NextResponse.json({ message: "Bulk operation thất bại" }, { status: 500 });
  }
}
