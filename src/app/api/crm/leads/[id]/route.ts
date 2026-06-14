import { NextRequest, NextResponse } from "next/server";
import {
  getCrmLeadById,
  isValidLeadStatus,
  updateCrmLead,
} from "@/features/crm/services/crm-lead.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const lead = await getCrmLeadById(id);

  if (!lead) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

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
  const patch: { status?: Parameters<typeof updateCrmLead>[1]["status"]; followUpAt?: Date | null } =
    {};

  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !isValidLeadStatus(raw.status)) {
      return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    patch.status = raw.status;
  }

  if (raw.followUpAt !== undefined) {
    if (raw.followUpAt === null || raw.followUpAt === "") {
      patch.followUpAt = null;
    } else if (typeof raw.followUpAt === "string") {
      const date = new Date(raw.followUpAt);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
      }
      patch.followUpAt = date;
    } else {
      return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
    }
  }

  if (patch.status === undefined && patch.followUpAt === undefined) {
    return NextResponse.json({ message: "Không có dữ liệu cập nhật" }, { status: 400 });
  }

  const lead = await updateCrmLead(id, patch);
  if (!lead) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
