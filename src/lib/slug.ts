export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical URL slug segment used by admin forms and publish validation. */
export const PUBLISH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidPublishSlug(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const slug = value.trim().toLowerCase();
  return PUBLISH_SLUG_PATTERN.test(slug);
}
