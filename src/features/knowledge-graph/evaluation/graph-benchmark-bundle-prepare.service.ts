/**
 * Bundle preparation delegates to media evidence pilot (Sprint 12.4).
 */

import { prepareMediaEvidencePilot } from "@/features/knowledge-graph/evaluation/graph-media-evidence-pilot.service";

export async function prepareBenchmarkBundles(opts: { dryRun?: boolean }) {
  const dryRun = opts.dryRun !== false;
  const report = await prepareMediaEvidencePilot({ dryRun, apply: !dryRun });
  return {
    dryRun: report.dryRun,
    publicAssetCount: report.audit.publicCount,
    relevantAssetCount: report.audit.candidateCount,
    bundlesCreated: report.bundlesCreated,
    bundlesSkipped: report.skipped.length,
    gaps: [...report.audit.gaps, ...report.skipped],
    proposals: report.proposals.map((p) => ({
      code: p.code,
      applied: p.applied,
      missingSlots: p.missingSlots,
      slotAssetCounts: p.slots.map((s) => ({
        slotType: s.slotType,
        assets: s.assetIds.length,
      })),
      createdBundleId: p.createdBundleId,
    })),
  };
}
