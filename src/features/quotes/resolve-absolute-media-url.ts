/** Convert relative media URLs to absolute for server-side PDF/print rendering. */
export function resolveAbsoluteMediaUrl(
  url: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const base =
    baseUrl?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}` : "") ||
    "http://127.0.0.1:3000";

  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}
