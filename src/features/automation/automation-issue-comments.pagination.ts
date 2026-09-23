import { hasBuildApprovedComment } from "@/features/automation/automation-build-approved";

export const ISSUE_COMMENTS_PAGE_SIZE = 100;
export const ISSUE_COMMENTS_MAX_PAGES = 50;

/** Merge paginated comment pages until BUILD_APPROVED is found or pages are exhausted. */
export function mergeIssueCommentPages(
  pages: ReadonlyArray<ReadonlyArray<{ body: string }>>,
): Array<{ body: string }> {
  const comments: Array<{ body: string }> = [];
  for (const page of pages) {
    comments.push(...page);
    if (hasBuildApprovedComment(comments)) {
      return comments;
    }
    if (page.length < ISSUE_COMMENTS_PAGE_SIZE) {
      return comments;
    }
  }
  return comments;
}

export function shouldFetchNextCommentPage(
  pageComments: ReadonlyArray<{ body: string }>,
  accumulatedComments: ReadonlyArray<{ body: string }>,
  pageNumber: number,
): boolean {
  if (hasBuildApprovedComment(accumulatedComments)) return false;
  if (pageComments.length < ISSUE_COMMENTS_PAGE_SIZE) return false;
  return pageNumber < ISSUE_COMMENTS_MAX_PAGES;
}
