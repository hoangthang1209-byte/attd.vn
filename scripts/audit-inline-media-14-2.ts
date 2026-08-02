/**
 * Sprint 14.2 read-only audit + placement plan for the polo article.
 * Never applies. Never changes status.
 */
import { prisma } from "@/lib/prisma";
import { planInlineMediaPlacement } from "@/features/content/inline-media/inline-media-planner.service";
import { serializeInlineMediaPlan } from "@/features/content/inline-media/serialize-inline-media-plan";

const BLOG_ID = "cms4tvq5c005drwbp5k304qzg";
const BUNDLE_ID = "cmrmfoose0000rwswz7kemovv";
const TOPIC_ID = "cmrmb0fqo0004rwya95a6h4ij";

async function main() {
  const [post, bundle, topic, assignments] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id: BLOG_ID },
      select: { id: true, slug: true, status: true, mediaBundleId: true, content: true },
    }),
    prisma.mediaBundle.findUnique({
      where: { id: BUNDLE_ID },
      select: {
        id: true,
        name: true,
        status: true,
        slots: {
          select: {
            slotType: true,
            label: true,
            assets: { select: { mediaAssetId: true, mediaAsset: { select: { visibility: true, title: true, altText: true } } } },
          },
        },
      },
    }),
    prisma.seoTopic.findUnique({
      where: { id: TOPIC_ID },
      select: { id: true, title: true, mediaBundleId: true },
    }),
    prisma.contentMediaAssignment.findMany({
      where: { entityType: "BLOG_POST", entityId: BLOG_ID },
      select: { placement: true, mediaAssetId: true },
    }),
  ]);

  console.log("post", { id: post?.id, status: post?.status, slug: post?.slug, bundle: post?.mediaBundleId });
  console.log("topic", topic);
  console.log(
    "bundle slots",
    bundle?.slots.map((slot) => ({
      type: slot.slotType,
      label: slot.label,
      publicAssets: slot.assets.filter((a) => a.mediaAsset.visibility === "PUBLIC").length,
    })),
  );
  console.log(
    "assignments",
    assignments.reduce<Record<string, number>>((acc, row) => {
      acc[row.placement] = (acc[row.placement] ?? 0) + 1;
      return acc;
    }, {}),
  );
  console.log("body img count", (post?.content?.match(/<img\b/gi) ?? []).length);

  const plan = await planInlineMediaPlacement({
    blogPostId: BLOG_ID,
    topicId: TOPIC_ID,
    mediaBundleId: BUNDLE_ID,
    mode: "SUGGEST_ONLY",
  });

  console.log("\nPLAN", JSON.stringify(serializeInlineMediaPlan(plan), null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
