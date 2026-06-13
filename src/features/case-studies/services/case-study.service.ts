import { prisma } from "@/lib/prisma";
import {
  CASE_STUDIES as staticStudies,
  type VisibleCaseStudy,
} from "@/lib/caseStudies";
import { resolveUploadImage, isValidImageSrc } from "@/lib/imagePaths";

export async function listCaseStudies() {
  return prisma.caseStudyRecord.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCaseStudyById(id: string) {
  return prisma.caseStudyRecord.findUnique({ where: { id } });
}

export async function createCaseStudy(data: {
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  summary: string;
  imageUrl: string;
  isVisible?: boolean;
  sortOrder?: number;
}) {
  return prisma.caseStudyRecord.create({ data });
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
    isVisible: boolean;
    sortOrder: number;
  }>
) {
  return prisma.caseStudyRecord.update({ where: { id }, data });
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
}): boolean {
  return (
    row.isVisible &&
    Boolean(row.title?.trim()) &&
    Boolean(row.category?.trim()) &&
    Boolean(row.quantity?.trim()) &&
    Boolean(row.timeline?.trim()) &&
    Boolean(row.summary?.trim()) &&
    isValidImageSrc(row.imageUrl)
  );
}

export async function getVisibleCaseStudiesFromDb(): Promise<VisibleCaseStudy[]> {
  try {
    const rows = await prisma.caseStudyRecord.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (rows.length === 0) return getStaticVisibleCaseStudies();

    return rows
      .filter(isCompleteRecord)
      .map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        quantity: row.quantity,
        timeline: row.timeline,
        summary: row.summary,
        image: row.imageUrl,
        isVisible: row.isVisible,
        imageSrc: row.imageUrl,
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
