import "server-only";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACTIVE_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "NEED_PRICING",
  "QUOTING",
  "QUOTED",
  "NEGOTIATING",
];

export async function assignLead(input: {
  leadId: string;
  employeeId: string | null;
  actorId?: string | null;
  reason?: string | null;
  source?: string | null;
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true, assignedEmployeeId: true, assignedTo: true },
  });
  if (!lead) throw new Error("Không tìm thấy lead.");

  if (input.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, isActive: true, role: "SALES" },
      select: { id: true },
    });
    if (!employee) throw new Error("Nhân viên phụ trách không hợp lệ.");
  }

  if (lead.assignedEmployeeId === input.employeeId && lead.assignedTo === input.employeeId) return;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: input.leadId },
      data: {
        assignedEmployeeId: input.employeeId,
        assignedTo: input.employeeId,
        assignedAt: input.employeeId ? new Date() : null,
        assignmentSource: input.source?.trim() || "MANUAL",
      },
    }),
    prisma.leadAssignmentHistory.create({
      data: {
        leadId: input.leadId,
        fromEmployeeId: lead.assignedEmployeeId,
        toEmployeeId: input.employeeId,
        actorId: input.actorId?.trim() || null,
        reason: input.reason?.trim() || null,
      },
    }),
    prisma.cRMActivity.create({
      data: {
        leadId: input.leadId,
        type: "NOTE",
        title: input.employeeId ? "Phân công lead" : "Bỏ phân công lead",
        content: input.reason?.trim() || null,
        createdBy: input.actorId?.trim() || null,
      },
    }),
  ]);
}

export async function autoAssignLead(leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedEmployeeId: true, assignedTo: true },
  });
  if (!lead) return null;
  if (lead.assignedEmployeeId) return lead.assignedEmployeeId;
  if (lead.assignedTo) return lead.assignedTo;

  const employees = await prisma.employee.findMany({
    where: { isActive: true, role: "SALES" },
    select: { id: true, employeeCode: true },
    orderBy: { employeeCode: "asc" },
  });
  if (employees.length === 0) return null;

  const counts = await prisma.lead.groupBy({
    by: ["assignedEmployeeId"],
    where: {
      assignedEmployeeId: { in: employees.map((employee) => employee.id) },
      status: { in: ACTIVE_LEAD_STATUSES },
    },
    _count: { _all: true },
  });
  const countMap = new Map(
    counts.map((row) => [row.assignedEmployeeId, row._count._all]),
  );
  const selected = [...employees].sort((a, b) => {
    const delta = (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0);
    return delta || a.employeeCode.localeCompare(b.employeeCode);
  })[0];

  await assignLead({
    leadId,
    employeeId: selected.id,
    source: "AUTO_INTAKE",
    reason: "Tự động phân công theo tải lead đang hoạt động.",
  });
  return selected.id;
}
