import type { Prisma } from "@prisma/client";

/** Row locks are transaction-scoped and also serialize concurrent editor writes. */
export async function tryLockDueBlogPost(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  blogPostId: string,
  now: Date,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BlogPost"
    WHERE "id" = ${blogPostId}
      AND "status" = 'SCHEDULED'
      AND "scheduledAt" <= ${now}
    FOR UPDATE SKIP LOCKED
  `;
  return rows.length === 1;
}
