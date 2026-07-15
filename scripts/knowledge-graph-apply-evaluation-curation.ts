/**
 * Apply evaluation curation manifest.
 * Dry-run by default. Pass --apply to write DRAFT relations.
 * Pass --approve with --actor=<id> to approve after create (explicit only).
 */
import { applyEvaluationCuration } from "../src/features/knowledge-graph/evaluation/graph-curation-apply.service";

async function main() {
  const apply = process.argv.includes("--apply");
  const approve = process.argv.includes("--approve");
  const actorArg = process.argv.find((a) => a.startsWith("--actor="));
  const actorId = actorArg?.slice("--actor=".length) || null;

  if (approve && !apply) {
    console.error("--approve requires --apply");
    process.exitCode = 1;
    return;
  }
  if (approve && !actorId) {
    console.error("--approve requires --actor=<system-or-admin-id>");
    process.exitCode = 1;
    return;
  }

  console.log(
    `[knowledge-graph:apply-evaluation-curation] dryRun=${!apply} approve=${approve}`
  );
  const report = await applyEvaluationCuration({
    dryRun: !apply,
    approve,
    actorId,
  });
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
