export const PATTERN_ADMIN_LIST_PATH = "/admin/pattern";

export function patternAdminDetailPath(patternId: string): string {
  return `${PATTERN_ADMIN_LIST_PATH}/${encodeURIComponent(patternId)}`;
}
