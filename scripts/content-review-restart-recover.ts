/**
 * Production-safe recovery for an interrupted Review restart.
 *
 * A restart that superseded the old Review but failed to create the successor
 * leaves the Topic with no open Review. This script reports that state and, with
 * --apply, creates the missing successor through the governed service so the
 * new session is seeded exactly like a normal restart.
 *
 * Usage:
 *   npx tsx scripts/content-review-restart-recover.ts --review <id> [--apply]
 *
 * Never approves a section, never approves a Review, never publishes a Blog.
 */
import { prisma } from "../src/lib/prisma";
import {
  findSuccessorReview,
  restartContentReview,
} from "../src/features/content/services/content-review.service";

const APPLY = process.argv.includes("--apply");
const ACTOR = "content-ops-restart-recovery";

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

async function main() {
  const reviewId = argValue("--review");
  if (!reviewId) throw new Error("Missing --review <reviewId>");

  const session = await prisma.contentReviewSession.findUnique({ where: { id: reviewId } });
  if (!session) throw new Error(`Review ${reviewId} not found`);

  const draft = await prisma.writingDraftRecord.findUnique({
    where: { id: session.writingDraftId },
    select: { id: true, status: true, version: true },
  });
  const successor = await findSuccessorReview(session);

  console.log("review", {
    id: session.id,
    status: session.status,
    snapshotVersion: session.writingDraftVersion,
  });
  console.log("draft", draft);
  console.log("successor", successor);

  if (successor) {
    console.log(
      `Successor already exists: ${successor.id} (/admin/content/reviews/${successor.id}). Nothing to recover.`,
    );
    return;
  }
  if (session.status !== "SUPERSEDED") {
    console.log(`Review is ${session.status}, not an orphaned supersede. Nothing to recover.`);
    return;
  }
  if (!APPLY) {
    console.log("DRY RUN — rerun with --apply to create the missing successor Review.");
    return;
  }

  const result = await restartContentReview({
    reviewId,
    actorId: ACTOR,
    note: `Recovery: successor missing after interrupted restart of ${reviewId}`,
  });

  console.log("CREATED", {
    previousReviewId: result.previousReviewId,
    newReviewId: result.session.id,
    status: result.session.status,
    snapshotVersion: result.session.writingDraftVersion,
    sections: result.session.sections.length,
    approvedSections: result.session.sections.filter((s) => s.status === "APPROVED").length,
    adminRoute: `/admin/content/reviews/${result.session.id}`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
