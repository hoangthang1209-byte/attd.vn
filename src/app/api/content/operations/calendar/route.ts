import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getOperationsCalendarRange } from "@/features/content/services/content-operations.service";
import type { OperationsCalendarView } from "@/features/content/operations/content-operations.types";

const VALID_VIEWS: OperationsCalendarView[] = ["month", "week", "agenda"];

function isValidView(v: string | null): v is OperationsCalendarView {
  return VALID_VIEWS.includes(v as OperationsCalendarView);
}

/**
 * Sprint 17.1 — Calendar range. GET-only, read-only. Server-side range query
 * on `dueDate` / `publishedAt` between `from`/`to` — not subject to the
 * command center's 800-row cap; bounded per-range with a `truncated` flag.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const viewParam = url.searchParams.get("view");
  const view: OperationsCalendarView = isValidView(viewParam) ? viewParam : "month";

  if (!from || !to) {
    return NextResponse.json({ message: "Thiếu tham số from/to." }, { status: 400 });
  }

  try {
    const range = await getOperationsCalendarRange({ from, to, view });
    return NextResponse.json({ range });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không tải được lịch vận hành.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
