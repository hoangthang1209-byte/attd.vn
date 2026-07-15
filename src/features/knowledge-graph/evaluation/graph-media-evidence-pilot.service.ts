/**
 * Media evidence audit + governed Media Bundle pilot (Sprint 12.4).
 * Dry-run by default; never copies MediaAsset files; never auto-READY.
 */

import { prisma } from "@/lib/prisma";
import {
  addAssetsToSlot,
  createMediaBundle,
  createSlot,
} from "@/features/media/services/media-bundle.service";
import { syncGraphEntityForSource } from "@/features/knowledge-graph/services/knowledge-graph-entity-sync.service";
import {
  getRelationshipPolicy,
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import type { KnowledgeBaseVisibility, KnowledgeGraphRelationshipType } from "@prisma/client";

async function upsertSystemEdge(input: {
  fromSourceType: string;
  fromSourceId: string;
  toSourceType: string;
  toSourceId: string;
  relationshipType: KnowledgeGraphRelationshipType;
  evidenceUrl?: string | null;
  notes?: string;
}) {
  const [from, to] = await Promise.all([
    prisma.knowledgeGraphEntity.findFirst({
      where: { sourceType: input.fromSourceType, sourceId: input.fromSourceId },
    }),
    prisma.knowledgeGraphEntity.findFirst({
      where: { sourceType: input.toSourceType, sourceId: input.toSourceId },
    }),
  ]);
  if (!from || !to) return null;

  const pair = validateRelationshipPair({
    relationshipType: input.relationshipType,
    fromEntityType: from.entityType,
    toEntityType: to.entityType,
    origin: "SYSTEM_DERIVED",
    fromEntityId: from.id,
    toEntityId: to.id,
  });
  if (!pair.ok) return null;

  const policy = getRelationshipPolicy(input.relationshipType);
  if (!policy) return null;

  const visibility = resolveRelationshipVisibility({
    policy,
    fromVisibility: from.visibility as KnowledgeBaseVisibility,
    toVisibility: to.visibility as KnowledgeBaseVisibility,
  });

  const existing = await prisma.knowledgeGraphRelationship.findUnique({
    where: {
      fromEntityId_toEntityId_relationshipType: {
        fromEntityId: from.id,
        toEntityId: to.id,
        relationshipType: input.relationshipType,
      },
    },
  });
  if (existing) {
    if (existing.status === "ACTIVE" && existing.origin === "SYSTEM_DERIVED") return existing;
    return prisma.knowledgeGraphRelationship.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        origin: "SYSTEM_DERIVED",
        visibility,
        evidenceUrl: input.evidenceUrl ?? existing.evidenceUrl,
        metadata: {
          ...(typeof existing.metadata === "object" && existing.metadata
            ? (existing.metadata as object)
            : {}),
          notes: input.notes ?? null,
          syncKey: "kg_eval_12_4_content_links",
        },
      },
    });
  }

  return prisma.knowledgeGraphRelationship.create({
    data: {
      fromEntityId: from.id,
      toEntityId: to.id,
      relationshipType: input.relationshipType,
      status: "ACTIVE",
      origin: "SYSTEM_DERIVED",
      visibility,
      authorityRank: policy.defaultAuthorityRank,
      confidence: 100,
      evidenceUrl: input.evidenceUrl ?? null,
      metadata: {
        notes: input.notes ?? null,
        syncKey: "kg_eval_12_4_content_links",
      },
    },
  });
}

export type MediaEvidenceCandidate = {
  id: string;
  title: string | null;
  originalName: string;
  roleId: string | null;
  seoScore: number | null;
  altText: string | null;
  visibility: string;
  hasAlt: boolean;
  hasTitle: boolean;
  tags: string[];
  keywords: string[];
};

function mapCandidate(a: {
  id: string;
  title: string | null;
  originalName: string | null;
  roleId: string | null;
  seoScore: number | null;
  altText: string | null;
  visibility: string;
  tags: string[];
  keywords: string[];
}): MediaEvidenceCandidate {
  return {
    id: a.id,
    title: a.title,
    originalName: a.originalName ?? "",
    roleId: a.roleId,
    seoScore: a.seoScore,
    altText: a.altText,
    visibility: a.visibility,
    tags: a.tags,
    keywords: a.keywords,
    hasAlt: Boolean(a.altText?.trim()),
    hasTitle: Boolean(a.title?.trim()),
  };
}

function publicSelect() {
  return {
    id: true,
    title: true,
    originalName: true,
    roleId: true,
    seoScore: true,
    altText: true,
    visibility: true,
    tags: true,
    keywords: true,
  } as const;
}

export async function auditMediaEvidenceForBenchmarks() {
  const publicCount = await prisma.mediaAsset.count({ where: { visibility: "PUBLIC" } });
  const privateCount = await prisma.mediaAsset.count({
    where: { visibility: { in: ["INTERNAL", "PRIVATE"] } },
  });

  const polo = await prisma.mediaAsset.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [
        { title: { contains: "polo", mode: "insensitive" } },
        { originalName: { contains: "polo", mode: "insensitive" } },
        { altText: { contains: "polo", mode: "insensitive" } },
        { tags: { hasSome: ["polo", "dong-phuc"] } },
      ],
    },
    select: publicSelect(),
    take: 40,
  });

  const factory = await prisma.mediaAsset.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [
        { roleId: { in: ["mr_factory", "mr_process", "mr_printing"] } },
        { title: { contains: "xuong", mode: "insensitive" } },
        { title: { contains: "in lua", mode: "insensitive" } },
        { originalName: { contains: "in-lua", mode: "insensitive" } },
        { originalName: { contains: "XUONG", mode: "insensitive" } },
        { originalName: { contains: "in lua", mode: "insensitive" } },
      ],
    },
    select: publicSelect(),
    take: 40,
  });

  const missingAlt = [...polo, ...factory].filter((a) => !a.altText?.trim()).length;
  const missingTitle = [...polo, ...factory].filter((a) => !a.title?.trim()).length;

  const poloBundleReady =
    polo.filter((a) => a.roleId === "mr_product_main" || /polo/i.test(a.title ?? a.originalName ?? ""))
      .length >= 3 &&
    factory.some((a) => a.roleId === "mr_factory" || a.roleId === "mr_process");

  const printBundleReady =
    factory.filter((a) =>
      /in\s*lua|printing|factory|process|xuong/i.test(
        `${a.title ?? ""} ${a.originalName ?? ""} ${a.roleId ?? ""}`
      )
    ).length >= 4;

  return {
    candidateCount: polo.length + factory.length,
    publicCount,
    privateCount,
    bundleReadyCount: (poloBundleReady ? 1 : 0) + (printBundleReady ? 1 : 0),
    missingAlt,
    missingTitle,
    polo: {
      count: polo.length,
      bundleReady: poloBundleReady,
      sample: polo.slice(0, 8).map(mapCandidate),
    },
    printManufacturing: {
      count: factory.length,
      bundleReady: printBundleReady,
      sample: factory.slice(0, 8).map(mapCandidate),
    },
    gaps: [
      ...(!poloBundleReady
        ? [
            "Polo bundle needs ≥3 PUBLIC product polo assets plus ≥1 factory/process asset (roles or filenames).",
          ]
        : []),
      ...(!printBundleReady
        ? ["Print/manufacturing bundle needs ≥4 PUBLIC factory/process/printing assets."]
        : []),
      ...(missingAlt
        ? [`${missingAlt} candidate assets missing alt text (not blocking if titles exist).`]
        : []),
    ],
  };
}

type SlotAssignment = { slotType: string; label: string; assetIds: string[]; required: boolean };

function pickIds(
  assets: MediaEvidenceCandidate[],
  n: number,
  pred: (a: MediaEvidenceCandidate) => boolean
) {
  return assets.filter(pred).slice(0, n).map((a) => a.id);
}

export async function prepareMediaEvidencePilot(opts: { dryRun?: boolean; apply?: boolean }) {
  const dryRun = opts.dryRun !== false && !opts.apply;
  const audit = await auditMediaEvidenceForBenchmarks();

  const report = {
    dryRun,
    audit,
    proposals: [] as Array<{
      code: string;
      name: string;
      contentType: string;
      slots: SlotAssignment[];
      missingSlots: string[];
      createdBundleId: string | null;
      applied: boolean;
    }>,
    bundlesCreated: 0,
    graphSynced: 0,
    skipped: [] as string[],
  };

  const poloFull = (
    await prisma.mediaAsset.findMany({
      where: {
        visibility: "PUBLIC",
        OR: [
          { title: { contains: "polo", mode: "insensitive" } },
          { originalName: { contains: "polo", mode: "insensitive" } },
        ],
      },
      select: publicSelect(),
      take: 30,
    })
  ).map(mapCandidate);

  const factoryFull = (
    await prisma.mediaAsset.findMany({
      where: {
        visibility: "PUBLIC",
        OR: [
          { roleId: { in: ["mr_factory", "mr_process", "mr_printing"] } },
          { title: { contains: "xuong", mode: "insensitive" } },
          { originalName: { contains: "in lua", mode: "insensitive" } },
          { title: { contains: "in lua", mode: "insensitive" } },
        ],
      },
      select: publicSelect(),
      take: 30,
    })
  ).map(mapCandidate);

  const poloSlots: SlotAssignment[] = [
    {
      slotType: "FEATURED",
      label: "Nổi bật",
      required: true,
      assetIds: pickIds(poloFull, 1, (a) => /polo/i.test(a.title ?? a.originalName)),
    },
    {
      slotType: "PRODUCT",
      label: "Sản phẩm",
      required: true,
      assetIds: pickIds(
        poloFull,
        3,
        (a) => a.roleId === "mr_product_main" || /polo/i.test(a.title ?? "")
      ),
    },
    {
      slotType: "PROCESS",
      label: "Quy trình",
      required: false,
      assetIds: pickIds(
        factoryFull,
        1,
        (a) => a.roleId === "mr_process" || /process|may|cat/i.test(a.originalName)
      ),
    },
    {
      slotType: "FACTORY",
      label: "Nhà máy",
      required: false,
      assetIds: pickIds(
        factoryFull,
        1,
        (a) => a.roleId === "mr_factory" || /xuong|factory/i.test(a.originalName)
      ),
    },
    {
      slotType: "OG_IMAGE",
      label: "OG Image",
      required: false,
      assetIds: pickIds(poloFull, 1, (a) => /polo/i.test(a.title ?? a.originalName)),
    },
  ];

  const printSlots: SlotAssignment[] = [
    {
      slotType: "TECHNIQUE",
      label: "Kỹ thuật",
      required: true,
      assetIds: pickIds(
        factoryFull,
        1,
        (a) =>
          a.roleId === "mr_printing" ||
          /in\s*lua|printing|in-lua/i.test(`${a.title} ${a.originalName}`)
      ),
    },
    {
      slotType: "PROCESS",
      label: "Quy trình",
      required: true,
      assetIds: pickIds(
        factoryFull,
        1,
        (a) => a.roleId === "mr_process" || /process|may/i.test(a.originalName)
      ),
    },
    {
      slotType: "FACTORY",
      label: "Nhà máy",
      required: true,
      assetIds: pickIds(
        factoryFull,
        2,
        (a) => a.roleId === "mr_factory" || /xuong|nha may/i.test(a.originalName)
      ),
    },
    {
      slotType: "FEATURED",
      label: "Nổi bật",
      required: false,
      assetIds: pickIds(factoryFull, 1, () => true),
    },
  ];

  const proposals = [
    {
      code: "KG_PILOT_POLO_CORP",
      name: "Áo polo đồng phục công ty (KG pilot)",
      contentType: "LANDING_PAGE",
      slots: poloSlots,
      minFilledRequired: 2,
    },
    {
      code: "KG_PILOT_PRINT_MFG",
      name: "Năng lực in lụa / sản xuất áo thun (KG pilot)",
      contentType: "LANDING_PAGE",
      slots: printSlots,
      minFilledRequired: 3,
    },
  ] as const;

  for (const proposal of proposals) {
    const filledRequired = proposal.slots.filter((s) => s.required && s.assetIds.length > 0).length;
    const requiredCount = proposal.slots.filter((s) => s.required).length;
    const missingSlots = proposal.slots
      .filter((s) => s.required && s.assetIds.length === 0)
      .map((s) => s.slotType);
    const enough =
      filledRequired >= Math.min(proposal.minFilledRequired, requiredCount) && filledRequired > 0;

    if (!enough) {
      report.skipped.push(
        `${proposal.code}: insufficient PUBLIC assets for required slots (${missingSlots.join(",") || "coverage"})`
      );
      report.proposals.push({
        code: proposal.code,
        name: proposal.name,
        contentType: proposal.contentType,
        slots: proposal.slots,
        missingSlots,
        createdBundleId: null,
        applied: false,
      });
      continue;
    }

    const allIds = [...new Set(proposal.slots.flatMap((s) => s.assetIds))];
    const visibilityCheck = await prisma.mediaAsset.findMany({
      where: { id: { in: allIds } },
      select: { id: true, visibility: true },
    });
    if (visibilityCheck.some((a) => a.visibility !== "PUBLIC")) {
      report.skipped.push(`${proposal.code}: rejected non-PUBLIC asset in proposal`);
      continue;
    }

    let createdBundleId: string | null = null;
    let applied = false;

    if (!dryRun) {
      const existing = await prisma.mediaBundle.findFirst({
        where: { code: proposal.code },
        select: { id: true },
      });
      if (existing) {
        createdBundleId = existing.id;
      } else {
        const bundle = await createMediaBundle({
          name: proposal.name,
          code: proposal.code,
          description:
            "Governed DRAFT Media Bundle for Knowledge Graph retrieval media evidence pilot. Not auto-READY.",
          contentType: proposal.contentType,
          query: proposal.name,
          applyPreset: false,
        });
        createdBundleId = bundle.id;
        report.bundlesCreated += 1;

        for (const slot of proposal.slots) {
          if (!slot.assetIds.length) continue;
          const afterSlot = await createSlot(bundle.id, {
            slotType: slot.slotType,
            label: slot.label,
            required: slot.required,
            minAssets: 1,
            maxAssets: slot.slotType === "PRODUCT" ? 6 : 2,
            sortOrder:
              slot.slotType === "FEATURED" || slot.slotType === "HERO"
                ? 10
                : slot.slotType === "PRODUCT"
                  ? 20
                  : 30,
          });
          const created = afterSlot.slots.find(
            (s) => s.slotType === slot.slotType && s.label === slot.label
          );
          if (created) await addAssetsToSlot(created.id, slot.assetIds);
        }
      }

      if (createdBundleId) {
        await syncGraphEntityForSource("MediaBundle", createdBundleId);
        report.graphSynced += 1;
        applied = true;
      }
    }

    report.proposals.push({
      code: proposal.code,
      name: proposal.name,
      contentType: proposal.contentType,
      slots: proposal.slots,
      missingSlots,
      createdBundleId,
      applied,
    });
  }

  return report;
}

/**
 * Confirm Topic→Blog matches editorially using existing published blogs only.
 * Sets existingUrl — does not publish topics or blogs.
 */
export async function confirmTopicContentLinks(opts: { dryRun?: boolean; apply?: boolean }) {
  const dryRun = opts.dryRun !== false && !opts.apply;
  const strategy = await prisma.seoStrategy.findFirst({
    where: { code: "KG_EVAL_12_3" },
    select: { id: true },
  });
  if (!strategy) {
    return { dryRun, topics: [], linksConfirmed: 0, error: "KG_EVAL_12_3 strategy missing" };
  }

  const topics = await prisma.seoTopic.findMany({
    where: { cluster: { strategyId: strategy.id } },
    select: {
      id: true,
      title: true,
      primaryKeyword: true,
      existingUrl: true,
      mediaBundleId: true,
      status: true,
    },
  });

  const matches: Array<{
    topicId: string;
    topicTitle: string;
    blogId: string;
    blogTitle: string;
    blogSlug: string;
    existingUrl: string;
    reason: string;
    accepted: boolean;
    applied: boolean;
  }> = [];

  const published = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
  });

  const explicit: Array<{ topicNeedle: RegExp; blogId: string; reason: string }> = [
    {
      topicNeedle: /polo.*đồng phục|áo polo/i,
      blogId: "cmqfmcy7e003zk004r693fi4x",
      reason:
        "Confirmed existing published guide: Cách chọn áo polo trơn cho đồng phục doanh nghiệp",
    },
    {
      topicNeedle: /oem|private\s*label/i,
      blogId: "cmqfmczpb0042k004avmlua4t",
      reason: "Confirmed existing published OEM/private label explainer",
    },
    {
      topicNeedle: /quà tặng|gift/i,
      blogId: "cmqfmcxpe003yk004ck91s7al",
      reason: "Confirmed existing published corporate gift combo guide",
    },
  ];

  let linksConfirmed = 0;
  for (const topic of topics) {
    const hit = explicit.find((e) => e.topicNeedle.test(topic.primaryKeyword || topic.title));
    if (!hit) {
      matches.push({
        topicId: topic.id,
        topicTitle: topic.title,
        blogId: "",
        blogTitle: "",
        blogSlug: "",
        existingUrl: topic.existingUrl ?? "",
        reason: "No editorially confirmed Blog match (generic overlap rejected)",
        accepted: false,
        applied: false,
      });
      continue;
    }
    const blog = published.find((b) => b.id === hit.blogId);
    if (!blog) {
      matches.push({
        topicId: topic.id,
        topicTitle: topic.title,
        blogId: hit.blogId,
        blogTitle: "",
        blogSlug: "",
        existingUrl: "",
        reason: "Configured Blog ID missing or not PUBLISHED",
        accepted: false,
        applied: false,
      });
      continue;
    }
    const existingUrl = `/blog/${blog.slug}`;
    let applied = false;
    if (!dryRun) {
      await prisma.seoTopic.update({
        where: { id: topic.id },
        data: { existingUrl, targetUrl: existingUrl },
      });
      await syncGraphEntityForSource("SeoTopic", topic.id);
      await syncGraphEntityForSource("BlogPost", blog.id);
      try {
        await upsertSystemEdge({
          fromSourceType: "SeoTopic",
          fromSourceId: topic.id,
          toSourceType: "BlogPost",
          toSourceId: blog.id,
          relationshipType: "LINKS_TO",
          evidenceUrl: existingUrl,
          notes: "Sprint 12.4 confirmed Topic→Blog existing content link",
        });
      } catch {
        /* optional */
      }
      applied = true;
      linksConfirmed += 1;
    } else {
      linksConfirmed += 1;
    }
    matches.push({
      topicId: topic.id,
      topicTitle: topic.title,
      blogId: blog.id,
      blogTitle: blog.title,
      blogSlug: blog.slug,
      existingUrl,
      reason: hit.reason,
      accepted: true,
      applied,
    });
  }

  const poloBundle = await prisma.mediaBundle.findFirst({
    where: { code: "KG_PILOT_POLO_CORP" },
    select: { id: true },
  });
  if (poloBundle && !dryRun) {
    const poloTopic = topics.find((t) => /polo/i.test(t.primaryKeyword || t.title));
    if (poloTopic) {
      await prisma.seoTopic.update({
        where: { id: poloTopic.id },
        data: { mediaBundleId: poloBundle.id },
      });
      await syncGraphEntityForSource("SeoTopic", poloTopic.id);
      await syncGraphEntityForSource("MediaBundle", poloBundle.id);
      try {
        await upsertSystemEdge({
          fromSourceType: "SeoTopic",
          fromSourceId: poloTopic.id,
          toSourceType: "MediaBundle",
          toSourceId: poloBundle.id,
          relationshipType: "HAS_MEDIA",
          notes: "Sprint 12.4 Topic→MediaBundle pilot",
        });
      } catch {
        /* optional */
      }
    }
  }

  return { dryRun, topics: matches, linksConfirmed, poloBundleId: poloBundle?.id ?? null };
}
