import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateDealerActivityInput,
  DealerActivityRecord,
} from "@/features/dealer/types";

function mapActivity(row: {
  id: string;
  dealerCompanyId: string;
  dealerUserId: string | null;
  type: DealerActivityRecord["type"];
  title: string;
  description: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): DealerActivityRecord {
  return {
    id: row.id,
    dealerCompanyId: row.dealerCompanyId,
    dealerUserId: row.dealerUserId,
    type: row.type,
    title: row.title,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createDealerActivity(
  input: CreateDealerActivityInput,
): Promise<DealerActivityRecord> {
  const row = await prisma.dealerActivity.create({
    data: {
      dealerCompanyId: input.dealerCompanyId,
      dealerUserId: input.dealerUserId ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
  return mapActivity(row);
}

export async function listDealerActivities(
  dealerCompanyId: string,
  limit = 50,
): Promise<{ activities: DealerActivityRecord[]; total: number }> {
  const take = Math.min(200, Math.max(1, limit));
  const [rows, total] = await Promise.all([
    prisma.dealerActivity.findMany({
      where: { dealerCompanyId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.dealerActivity.count({ where: { dealerCompanyId } }),
  ]);

  return { activities: rows.map(mapActivity), total };
}
