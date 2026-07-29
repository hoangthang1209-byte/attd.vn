/**
 * Hotfix 13.5.2 — first article recovery helper.
 *
 * Removes the media-bundle fact reference that sprint 13.5 injected into the
 * Writing Draft purely to silence MISSING_REQUIRED_FACT. Media bundles are no
 * longer validated as Knowledge required facts, so the workaround must go.
 *
 * Dry-run by default. Pass --apply to write.
 *
 * This script never approves a Review, never approves a section and never
 * publishes a Blog.
 */
import { PrismaClient } from "@prisma/client";
import { isMediaFactId } from "../src/features/content/editorial/review-approval.policy";
import { runWritingQa } from "../src/features/writing-engine/qa/writing-qa.service";
import type {
  WritingPlan,
  WritingStructuredDraft,
} from "../src/features/writing-engine/writing-engine.types";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const ACTOR = "content-ops-hotfix-13.5.2";

const REVIEW_ID = "cms4tvnlo003hrwbpy3yoxu8e";

async function main() {
  const review = await prisma.contentReviewSession.findUnique({ where: { id: REVIEW_ID } });
  if (!review) throw new Error("Review not found");

  const draftRow = await prisma.writingDraftRecord.findUnique({
    where: { id: review.writingDraftId },
  });
  if (!draftRow) throw new Error("Draft not found");

  const planRow = await prisma.writingPlanRecord.findUnique({
    where: { id: review.writingPlanId },
  });
  if (!planRow) throw new Error("Plan not found");

  const plan = planRow.planJson as unknown as WritingPlan;
  const draft = draftRow.structuredDraft as unknown as WritingStructuredDraft;

  const removals: Array<{ sectionId: string; factId: string }> = [];
  const sections = draft.sections.map((section) => {
    const keep = section.factIdsUsed.filter((factId) => {
      if (!isMediaFactId(factId)) return true;
      removals.push({ sectionId: section.sectionId, factId });
      return false;
    });
    return keep.length === section.factIdsUsed.length ? section : { ...section, factIdsUsed: keep };
  });

  console.log("review", { id: review.id, status: review.status, snapshotVersion: review.writingDraftVersion });
  console.log("draft", { id: draftRow.id, status: draftRow.status, version: draftRow.version });
  console.log("mediaFactReferencesToRemove", removals);

  const cleaned: WritingStructuredDraft = { ...draft, sections };
  const qa = runWritingQa(plan, cleaned);
  console.log("qaAfterCleanup", {
    passed: qa.passed,
    score: qa.score,
    blocking: qa.issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR"),
    warningCount: qa.issues.filter((i) => i.severity === "WARNING").length,
  });

  if (removals.length === 0) {
    console.log("Nothing to clean.");
    return;
  }
  if (!APPLY) {
    console.log("DRY RUN — rerun with --apply to persist.");
    return;
  }
  if (!qa.passed) {
    throw new Error("QA would fail after cleanup — aborting without writes.");
  }

  const nextVersion = draftRow.version + 1;
  const nextDraft: WritingStructuredDraft = {
    ...cleaned,
    qa,
    updatedAt: new Date().toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.writingDraftRecord.update({
      where: { id: draftRow.id },
      data: {
        structuredDraft: nextDraft as never,
        qaReport: qa as never,
        version: nextVersion,
        status: qa.passed ? "REVIEW_READY" : "QA_FAILED",
      },
    });
    await tx.writingDraftVersion.create({
      data: {
        writingDraftId: draftRow.id,
        version: nextVersion,
        reason: "hotfix_13_5_2_media_fact_cleanup",
        structuredDraft: nextDraft as never,
        qaReport: qa as never,
        createdBy: ACTOR,
      },
    });
  });

  console.log("APPLIED", { draftVersion: nextVersion, qaScore: qa.score });
  console.log(
    "Next human steps: open the stale Review → “Tạo phiên kiểm duyệt mới” → review → approve sections → approve Review.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
