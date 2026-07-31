/**
 * Governed recovery path: hand an APPROVED Review over to its existing Blog.
 *
 * Runs the same service the admin CTA calls — it reuses the linked Blog,
 * relinks it to the approved Review, syncs only conflict-free fields and never
 * publishes. Nothing is written without --confirm.
 *
 *   npx tsx scripts/content-handoff-approved-review.ts --review=<id> --actor=<name>
 *   npx tsx scripts/content-handoff-approved-review.ts --review=<id> --actor=<name> --confirm
 */
import { prisma } from "../src/lib/prisma";
import {
  getReviewHandoffStatus,
  handoffApprovedReviewToBlog,
} from "../src/features/content/services/writing-blog-handoff.service";

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const reviewId = arg("review");
  const actorId = arg("actor");
  const confirm = process.argv.includes("--confirm");
  if (!reviewId || !actorId) {
    console.error("Usage: --review=<reviewId> --actor=<actorId> [--confirm]");
    process.exit(1);
  }

  const before = await getReviewHandoffStatus(reviewId);
  console.log("BEFORE", JSON.stringify(before, null, 2));

  if (!confirm) {
    console.log("\nDry run — add --confirm to execute the handoff. Nothing was written.");
    return;
  }

  const result = await handoffApprovedReviewToBlog({ reviewId, actorId });
  console.log("RESULT", {
    reviewId: result.reviewId ?? reviewId,
    blogPostId: result.blogPostId,
    blogStatus: result.blogStatus,
    reused: result.reused,
    relinked: result.relinked,
    relinkedFromReviewId: result.relinkedFromReviewId,
    mode: result.mode,
    matchedBy: result.matchedBy,
    synchronizedFields: result.synchronizedFields,
    preservedFields: result.preservedFields,
    conflicts: result.conflicts,
    adminRoute: result.adminRoute,
    readiness: {
      ready: result.readiness.ready,
      errors: result.readiness.errors,
      warnings: result.readiness.warnings,
    },
    message: result.message,
  });

  const after = await getReviewHandoffStatus(reviewId);
  console.log("AFTER", JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
