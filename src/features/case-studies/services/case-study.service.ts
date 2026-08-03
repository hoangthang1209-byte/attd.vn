import { prisma } from "@/lib/prisma";
import {
  CASE_STUDIES as staticStudies,
  type VisibleCaseStudy,
} from "@/lib/caseStudies";
import { resolveUploadImage, isValidImageSrc } from "@/lib/imagePaths";
import {
  MEDIA_ASSET_PUBLIC_SELECT,
  resolveEntityMediaSrc,
  buildCanonicalMediaWrite,
} from "@/features/media/resolve-media";

const caseStudyMediaInclude = {
  mediaAsset: { select: MEDIA_ASSET_PUBLIC_SELECT },
} as const;

export async function listCaseStudies() {
  try {
    return await prisma.caseStudyRecord.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: caseStudyMediaInclude,
    });
  } catch (err) {
    console.error("[case-study.service] listCaseStudies failed:", err);
    return [];
  }
}

export async function getCaseStudyById(id: string) {
  return prisma.caseStudyRecord.findUnique({
    where: { id },
    include: caseStudyMediaInclude,
  });
}

export async function createCaseStudy(data: {
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  summary: string;
  imageUrl: string;
  mediaAssetId?: string | null;
  isVisible?: boolean;
  sortOrder?: number;
}) {
  const media = buildCanonicalMediaWrite({
    mediaAssetId: data.mediaAssetId,
    url: data.imageUrl,
  });
  return prisma.caseStudyRecord.create({
    data: {
      title: data.title,
      category: data.category,
      quantity: data.quantity,
      timeline: data.timeline,
      summary: data.summary,
      imageUrl: media.imageUrl ?? data.imageUrl,
      mediaAssetId: media.mediaAssetId,
      isVisible: data.isVisible,
      sortOrder: data.sortOrder,
    },
  });
}

export async function updateCaseStudy(
  id: string,
  data: Partial<{
    title: string;
    category: string;
    quantity: string;
    timeline: string;
    summary: string;
    imageUrl: string;
    mediaAssetId: string | null;
    isVisible: boolean;
    sortOrder: number;
  }>
) {
  const patch: Record<string, unknown> = { ...data };
  if (data.imageUrl !== undefined || data.mediaAssetId !== undefined) {
    const media = buildCanonicalMediaWrite({
      mediaAssetId: data.mediaAssetId,
      url: data.imageUrl,
    });
    if (data.imageUrl !== undefined) {
      patch.imageUrl = media.imageUrl ?? data.imageUrl;
    }
    if (data.mediaAssetId !== undefined) {
      patch.mediaAssetId = media.mediaAssetId;
    } else if (data.imageUrl !== undefined && media.mediaAssetId) {
      patch.mediaAssetId = media.mediaAssetId;
    }
  }
  return prisma.caseStudyRecord.update({ where: { id }, data: patch });
}

export async function deleteCaseStudy(id: string) {
  return prisma.caseStudyRecord.delete({ where: { id } });
}

function isCompleteRecord(row: {
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  summary: string;
  imageUrl: string;
  isVisible: boolean;
  resolvedSrc: string | null;
}): boolean {
  return (
    row.isVisible &&
    Boolean(row.title?.trim()) &&
    Boolean(row.category?.trim()) &&
    Boolean(row.quantity?.trim()) &&
    Boolean(row.timeline?.trim()) &&
    Boolean(row.summary?.trim()) &&
    Boolean(row.resolvedSrc && isValidImageSrc(row.resolvedSrc))
  );
}

export async function getVisibleCaseStudiesFromDb(): Promise<VisibleCaseStudy[]> {
  try {
    const rows = await prisma.caseStudyRecord.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: caseStudyMediaInclude,
    });

    if (rows.length === 0) return getStaticVisibleCaseStudies();

    return rows
      .map((row) => {
        const resolvedSrc =
          resolveEntityMediaSrc({
            mediaAsset: row.mediaAsset,
            mediaAssetId: row.mediaAssetId,
            imageUrl: row.imageUrl,
          }) ?? row.imageUrl;
        return { ...row, resolvedSrc };
      })
      .filter(isCompleteRecord)
      .map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        quantity: row.quantity,
        timeline: row.timeline,
        summary: row.summary,
        image: row.resolvedSrc!,
        isVisible: row.isVisible,
        imageSrc: row.resolvedSrc!,
      }));
  } catch {
    return getStaticVisibleCaseStudies();
  }
}

function getStaticVisibleCaseStudies(): VisibleCaseStudy[] {
  return staticStudies
    .filter((study) => {
      if (!study.isVisible) return false;
      const imageSrc = resolveUploadImage("caseStudies", study.image);
      return (
        Boolean(study.title?.trim()) &&
        Boolean(study.category?.trim()) &&
        Boolean(study.quantity?.trim()) &&
        Boolean(study.timeline?.trim()) &&
        Boolean(study.summary?.trim()) &&
        Boolean(imageSrc)
      );
    })
    .map((study) => ({
      ...study,
      imageSrc: resolveUploadImage("caseStudies", study.image)!,
    }));
}

export async function countCaseStudies() {
  try {
    return await prisma.caseStudyRecord.count();
  } catch {
    return 0;
  }
}
