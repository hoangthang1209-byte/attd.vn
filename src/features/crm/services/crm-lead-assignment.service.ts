import "server-only";
import { prisma } from "@/lib/prisma";

export async function assignLead(input: {
  leadId: string;
  employeeId: string | null;
  actorId?: string | null;
  reason?: string | null;
  source?: string | null;
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true, assignedEmployeeId: true },
  });
  if (!lead) throw new Error("Không tìm thấy lead.");

  if (input.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, isActive: true },
      select: { id: true },
    });
    if (!employee) throw new Error("Nhân viên phụ trách không hợp lệ.");
  }

  if (lead.assignedEmployeeId === input.employeeId) return;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: input.leadId },
      data: {
        assignedEmployeeId: input.employeeId,
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
