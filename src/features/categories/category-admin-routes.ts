/** Full category editor on the admin list page (inline form). */
export function getCategoryAdminDetailHref(categoryId: string): string {
  return `/admin/danh-muc?editCategory=${encodeURIComponent(categoryId)}`;
}
