import "server-only";

import { prisma } from "@/lib/prisma";
import type { EditorialCalendarCampaign, EditorialCalendarTopic } from "@/features/content/editorial/editorial-calendar";

/** Read-only planning aggregate — no workflow / scheduling writes. */
export async function getEditorialCalendarPlan(): Promise<{
  topics: EditorialCalendarTopic[];
  campaigns: EditorialCalendarCampaign[];
}> {
  const [topicRows, strategyRows] = await Promise.all([
    prisma.seoTopic.findMany({
      where: { status: { notIn: ["ARCHIVED"] } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      take: 500,
      select: {
        id: true,
        title: true,
        primaryKeyword: true,
        status: true,
        priority: true,
        assignedTo: true,
        dueDate: true,
        publishedAt: true,
        targetUrl: true,
        brief: { select: { wordCountMax: true } },
        cluster: {
          select: {
            id: true,
            name: true,
            strategyId: true,
            strategy: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.seoStrategy.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 40,
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        clusters: {
          select: {
            topics: { select: { status: true } },
          },
        },
      },
    }),
  ]);

  const topics: EditorialCalendarTopic[] = topicRows.map((row) => ({
    id: row.id,
    title: row.title,
    primaryKeyword: row.primaryKeyword,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assignedTo,
    dueDate: row.dueDate?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    targetUrl: row.targetUrl,
    wordCountMax: row.brief?.wordCountMax ?? null,
    clusterId: row.cluster.id,
    clusterName: row.cluster.name,
    strategyId: row.cluster.strategyId,
    strategyName: row.cluster.strategy.name,
  }));

  const campaigns: EditorialCalendarCampaign[] = strategyRows.map((row) => {
    const allTopics = row.clusters.flatMap((c) => c.topics);
    const publishedCount = allTopics.filter((t) => t.status === "PUBLISHED").length;
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      topicCount: allTopics.length,
      publishedCount,
    };
  });

  return { topics, campaigns };
}
