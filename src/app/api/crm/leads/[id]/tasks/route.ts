import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can } from "@/features/auth/admin-permissions";
import { canAccessLeadRecord } from "@/features/auth/lead-scope";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import {
  completeLeadTask,
  createLeadTask,
} from "@/features/crm/services/crm-lead-task.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

async function assertLeadUpdate(req: NextRequest, id: string) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return { response: permission.response } as const;
  if (!can(permission.session, "leads.update")) {
    return {
      response: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    } as const;
  }
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { assignedEmployeeId: true },
  });
  if (!lead) {
    return {
      response: NextResponse.json({ message: "Không tìm thấy lead" }, { status: 404 }),
    } as const;
  }
  if (!canAccessLeadRecord(permission.session, lead, "leads.update")) {
    return {
      response: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    } as const;
  }
  return { permission, response: null } as const;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const gate = await assertLeadUpdate(req, id);
  if (gate.response) return gate.response;

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
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const dueAt =
    typeof raw.dueAt === "string" && raw.dueAt ? new Date(raw.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ message: "Thời hạn không hợp lệ" }, { status: 400 });
  }

  try {
    const task = await createLeadTask({
      leadId: id,
      ownerId:
        typeof raw.ownerId === "string" && raw.ownerId
          ? raw.ownerId
          : gate.permission.session.employeeId,
      title,
      note: typeof raw.note === "string" ? raw.note : null,
      dueAt,
      createdBy:
        gate.permission.session.userId ??
        gate.permission.session.username ??
        gate.permission.session.employeeId,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo việc cần làm" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const gate = await assertLeadUpdate(req, id);
  if (gate.response) return gate.response;

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
  const taskId = typeof raw.taskId === "string" ? raw.taskId : "";
  if (!taskId) {
    return NextResponse.json({ message: "taskId là bắt buộc" }, { status: 400 });
  }

  try {
    const task = await completeLeadTask({
      leadId: id,
      taskId,
      outcome: typeof raw.outcome === "string" ? raw.outcome : null,
      actorId:
        gate.permission.session.userId ??
        gate.permission.session.username ??
        gate.permission.session.employeeId,
    });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể hoàn tất việc cần làm" },
      { status: 400 },
    );
  }
}
