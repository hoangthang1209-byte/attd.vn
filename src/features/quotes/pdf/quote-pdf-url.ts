/**
 * Resolve absolute base URL for server-side Chromium to fetch the document route.
 * Prefers NEXT_PUBLIC_SITE_URL in production, then forwarded request headers on Vercel.
 */
export function resolveQuoteDocumentBaseUrl(
  requestHeaders?: { get(name: string): string | null },
): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && process.env.NODE_ENV === "production") {
    return configured.replace(/\/$/, "");
  }

  if (requestHeaders) {
    const host =
      requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      requestHeaders.get("host")?.trim();
    const proto =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

    if (host) {
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      if (!isLocal || process.env.NODE_ENV !== "production") {
        return `${proto}://${host}`.replace(/\/$/, "");
      }
    }
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function buildQuoteDocumentUrl(
  publicToken: string,
  options?: {
    mode?: "pdf" | "print";
    baseUrl?: string;
  },
): string {
  const base = (options?.baseUrl ?? resolveQuoteDocumentBaseUrl()).replace(/\/$/, "");
  const mode = options?.mode ?? "pdf";
  return `${base}/q/${encodeURIComponent(publicToken)}/document?mode=${mode}`;
}
