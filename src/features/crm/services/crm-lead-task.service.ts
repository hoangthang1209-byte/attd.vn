import "server-only";
import { prisma } from "@/lib/prisma";

export async function createLeadTask(input: {
  leadId: string;
  ownerId?: string | null;
  title: string;
  note?: string | null;
  dueAt?: Date | null;
  createdBy?: string | null;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Nội dung việc cần làm là bắt buộc.");

  return prisma.$transaction(async (tx) => {
    const task = await tx.leadTask.create({
      data: {
        leadId: input.leadId,
        ownerId: input.ownerId ?? null,
        title,
        note: input.note?.trim() || null,
        dueAt: input.dueAt ?? null,
        createdBy: input.createdBy?.trim() || null,
      },
      include: { owner: { select: { id: true, fullName: true } } },
    });
    await tx.lead.update({
      where: { id: input.leadId },
      data: { nextFollowUpAt: input.dueAt ?? null },
    });
    await tx.cRMActivity.create({
      data: {
        leadId: input.leadId,
        type: "FOLLOW_UP",
        title: "Tạo việc cần làm",
        content: title,
        nextFollowUpAt: input.dueAt ?? null,
        createdBy: input.createdBy?.trim() || null,
      },
    });
    return task;
  });
}

export async function completeLeadTask(input: {
  leadId: string;
  taskId: string;
  outcome?: string | null;
  actorId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.leadTask.findFirst({
      where: { id: input.taskId, leadId: input.leadId },
    });
    if (!task) throw new Error("Không tìm thấy việc cần làm.");
    if (task.completedAt) return task;

    const completed = await tx.leadTask.update({
      where: { id: task.id },
      data: {
        completedAt: new Date(),
        outcome: input.outcome?.trim() || null,
      },
      include: { owner: { select: { id: true, fullName: true } } },
    });
    const next = await tx.leadTask.findFirst({
      where: { leadId: input.leadId, completedAt: null },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      select: { dueAt: true },
    });
    await tx.lead.update({
      where: { id: input.leadId },
      data: { nextFollowUpAt: next?.dueAt ?? null },
    });
    await tx.cRMActivity.create({
      data: {
        leadId: input.leadId,
        type: "FOLLOW_UP",
        title: "Hoàn tất việc cần làm",
        content: task.title,
        outcome: input.outcome?.trim() || null,
        createdBy: input.actorId?.trim() || null,
      },
    });
    return completed;
  });
}
