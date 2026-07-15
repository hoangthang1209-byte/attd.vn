/**
 * Report curated relation quality tiers — refine recommendations without auto-archive.
 */
import { prisma } from "../src/lib/prisma";
import { resolveRelationQualityTier } from "../src/features/knowledge-graph/evaluation/graph-expansion-budgets";
import { getRelationshipValueClass } from "../src/features/knowledge-graph/evaluation/graph-expansion-path-policy";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  const rows = await prisma.knowledgeGraphRelationship.findMany({
    where: { origin: "CURATED", status: "ACTIVE" },
    include: {
      fromEntity: { select: { entityType: true, displayName: true } },
      toEntity: { select: { entityType: true, displayName: true } },
    },
  });

  const report = rows.map((r) => {
    const tier = resolveRelationQualityTier({
      origin: r.origin,
      relationshipType: r.relationshipType,
      evidenceUrl: r.evidenceUrl,
      confidence: r.confidence,
    });
    const valueClass = getRelationshipValueClass(r.relationshipType);
    let action: "retain" | "review_policy_noise" | "review_taxonomy" = "retain";
    if (r.toEntity.entityType === "POLICY" || r.fromEntity.entityType === "POLICY") {
      action = "review_policy_noise";
    }
    if (valueClass === "NOISY_BY_DEFAULT") action = "review_taxonomy";
    return {
      id: r.id,
      type: r.relationshipType,
      from: r.fromEntity.displayName,
      to: r.toEntity.displayName,
      visibility: r.visibility,
      tier,
      valueClass,
      action,
      dryRun,
    };
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        count: report.length,
        byAction: {
          retain: report.filter((r) => r.action === "retain").length,
          review_policy_noise: report.filter((r) => r.action === "review_policy_noise").length,
          review_taxonomy: report.filter((r) => r.action === "review_taxonomy").length,
        },
        rows: report,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
