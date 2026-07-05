import { NextRequest, NextResponse } from "next/server";
import { addCrmLeadNote, getCrmLeadById } from "@/features/crm/services/crm-lead.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  const lead = await getCrmLeadById(id);
  if (!lead) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const content =
    typeof raw.content === "string" ? raw.content.trim() : "";

  if (!content) {
    return NextResponse.json({ message: "Nội dung ghi chú là bắt buộc" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ message: "Ghi chú quá dài (tối đa 5000 ký tự)" }, { status: 400 });
  }

  const note = await addCrmLeadNote(id, content);
  if (!note) {
    return NextResponse.json({ message: "Không thể thêm ghi chú" }, { status: 500 });
  }

  return NextResponse.json({ note }, { status: 201 });
}
