/** Exact GitHub issue comment that authorizes Cursor Builder (F1a). */
export const BUILD_APPROVED_COMMENT = "BUILD_APPROVED";

export function isExactBuildApprovedComment(body: string): boolean {
  return body.trim() === BUILD_APPROVED_COMMENT;
}

export function hasBuildApprovedComment(
  comments: ReadonlyArray<{ body: string }>,
): boolean {
  return comments.some((comment) => isExactBuildApprovedComment(comment.body));
}
