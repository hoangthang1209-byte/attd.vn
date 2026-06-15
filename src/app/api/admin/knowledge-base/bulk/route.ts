import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateKnowledgeBaseEntries } from "@/features/knowledge-base/knowledge-base-import-service";

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
  | "change_priority";

export async function POST(req: NextRequest) {
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

  const validActions: BulkAction[] = [
    "verify", "unverify", "archive", "delete",
    "changeCategory", "changeStatus", "changePriority",
    "change_category", "change_status", "change_priority",
  ];
  if (!validActions.includes(action)) {
    return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
  }

  try {
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
