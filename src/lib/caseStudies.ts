/** Case studies — add real project records when available. */

import { resolveUploadImage } from "@/lib/imagePaths";

export type CaseStudy = {
  id: string;
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  /** Filename in /public/uploads/case-studies/ or full URL */
  image: string;
  summary: string;
  isVisible: boolean;
};

export const CASE_STUDIES_SECTION = {
  title: "Dự án tiêu biểu",
  description:
    "Các hạng mục ATTD đã hỗ trợ nguồn hàng và gia công cho đại lý, xưởng in và doanh nghiệp.",
} as const;

/**
 * Add real case studies here when available. All required fields must be filled.
 */
export const CASE_STUDIES: CaseStudy[] = [];

function isCaseStudyComplete(study: CaseStudy): boolean {
  return (
    study.isVisible &&
    Boolean(study.title?.trim()) &&
    Boolean(study.category?.trim()) &&
    Boolean(study.quantity?.trim()) &&
    Boolean(study.timeline?.trim()) &&
    Boolean(study.image?.trim()) &&
    Boolean(study.summary?.trim()) &&
    Boolean(resolveUploadImage("caseStudies", study.image))
  );
}

export type VisibleCaseStudy = CaseStudy & { imageSrc: string };

export function getVisibleCaseStudies(): VisibleCaseStudy[] {
  return CASE_STUDIES.filter(isCaseStudyComplete).map((study) => ({
    ...study,
    imageSrc: resolveUploadImage("caseStudies", study.image)!,
  }));
}

export function hasVisibleCaseStudies(): boolean {
  return getVisibleCaseStudies().length > 0;
}

export function countCaseStudyCandidates(): { total: number; complete: number; visible: number } {
  const visible = CASE_STUDIES.filter((s) => s.isVisible).length;
  const complete = CASE_STUDIES.filter(isCaseStudyComplete).length;
  return { total: CASE_STUDIES.length, complete, visible };
}
