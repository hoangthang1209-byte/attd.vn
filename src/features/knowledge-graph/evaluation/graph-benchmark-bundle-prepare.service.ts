/**
 * Bundle preparation: only when enough public assets exist. Never empty placeholders.
 */

import { prisma } from "@/lib/prisma";

export async function prepareBenchmarkBundles(opts: { dryRun?: boolean }) {
  const dryRun = opts.dryRun !== false;
  const publicAssets = await prisma.mediaAsset.count({ where: { visibility: "PUBLIC" } });

  // Require tagged/public assets with keyword overlap before creating a DRAFT bundle.
  const candidates = await prisma.mediaAsset.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [
        { tags: { hasSome: ["polo", "dong-phuc", "gift", "in-lua", "oem"] } },
        { keywords: { hasSome: ["polo", "đồng phục", "quà tặng", "in lụa", "oem"] } },
        { title: { contains: "polo", mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, tags: true },
    take: 20,
  });

  const report = {
    dryRun,
    publicAssetCount: publicAssets,
    relevantAssetCount: candidates.length,
    bundlesCreated: 0,
    bundlesSkipped: 0,
    gaps: [] as string[],
    sampleAssets: candidates.slice(0, 5).map((a) => ({ id: a.id, title: a.title })),
  };

  if (candidates.length < 3) {
    report.gaps.push(
      "Insufficient tagged public MediaAssets for benchmark bundles — not creating empty bundles."
    );
    report.bundlesSkipped = 1;
    return report;
  }

  // Even when assets exist, do not auto-assign without editorial confirmation in this sprint.
  report.gaps.push(
    "Relevant public assets found, but auto-assignment is deferred to editorial Media Bundle workflow."
  );
  report.bundlesSkipped = 1;
  return report;
}
