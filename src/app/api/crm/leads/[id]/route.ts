import { NextRequest, NextResponse } from "next/server";
import {
  getCrmLeadById,
  isValidLeadPriority,
  isValidLeadSource,
  isValidLeadStatus,
  updateCrmLead,
} from "@/features/crm/services/crm-lead.service";

type RouteContext = { params: Promise<{ id: string }> };

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

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
  const patch: Parameters<typeof updateCrmLead>[1] = {};

  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !isValidLeadStatus(raw.status)) {
      return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    patch.status = raw.status;
  }

  if (raw.priority !== undefined) {
    if (typeof raw.priority !== "string" || !isValidLeadPriority(raw.priority)) {
      return NextResponse.json({ message: "Ưu tiên không hợp lệ" }, { status: 400 });
    }
    patch.priority = raw.priority;
  }

  const followUpAt = parseDate(raw.followUpAt);
  if (raw.followUpAt !== undefined && followUpAt === undefined) {
    return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
  }
  if (followUpAt !== undefined) patch.followUpAt = followUpAt;

  const nextFollowUpAt = parseDate(raw.nextFollowUpAt);
  if (raw.nextFollowUpAt !== undefined && nextFollowUpAt === undefined) {
    return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
  }
  if (nextFollowUpAt !== undefined) patch.nextFollowUpAt = nextFollowUpAt;

  if (raw.estimatedValue !== undefined) {
    if (raw.estimatedValue === null || raw.estimatedValue === "") {
      patch.estimatedValue = null;
    } else if (typeof raw.estimatedValue === "number") {
      if (!Number.isFinite(raw.estimatedValue) || raw.estimatedValue < 0) {
        return NextResponse.json({ message: "Giá trị không hợp lệ" }, { status: 400 });
      }
      patch.estimatedValue = raw.estimatedValue;
    } else if (typeof raw.estimatedValue === "string") {
      const parsed = Number(raw.estimatedValue.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json({ message: "Giá trị không hợp lệ" }, { status: 400 });
      }
      patch.estimatedValue = parsed;
    } else {
      return NextResponse.json({ message: "Giá trị không hợp lệ" }, { status: 400 });
    }
  }

  if (raw.contactName !== undefined) {
    patch.contactName = typeof raw.contactName === "string" ? raw.contactName : null;
  }
  if (raw.companyName !== undefined) {
    patch.companyName = typeof raw.companyName === "string" ? raw.companyName : null;
  }
  if (raw.phone !== undefined) {
    patch.phone = typeof raw.phone === "string" ? raw.phone : null;
  }
  if (raw.email !== undefined) {
    patch.email = typeof raw.email === "string" ? raw.email : null;
  }
  if (raw.zalo !== undefined) {
    patch.zalo = typeof raw.zalo === "string" ? raw.zalo : null;
  }
  if (raw.source !== undefined) {
    if (typeof raw.source !== "string" || !isValidLeadSource(raw.source)) {
      return NextResponse.json({ message: "Nguồn không hợp lệ" }, { status: 400 });
    }
    patch.source = raw.source;
  }
  if (raw.sourceDetail !== undefined) {
    patch.sourceDetail = typeof raw.sourceDetail === "string" ? raw.sourceDetail : null;
  }
  if (raw.demand !== undefined) {
    patch.demand = typeof raw.demand === "string" ? raw.demand : null;
  }
  if (raw.note !== undefined) {
    patch.note = typeof raw.note === "string" ? raw.note : null;
  }
  if (raw.assignedTo !== undefined) {
    patch.assignedTo = typeof raw.assignedTo === "string" ? raw.assignedTo : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Không có dữ liệu cập nhật" }, { status: 400 });
  }

  const lead = await updateCrmLead(id, patch);
  if (!lead) {
    return NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
