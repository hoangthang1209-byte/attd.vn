export function resolveTechPackDocumentBaseUrl(
  requestHeaders?: { get(name: string): string | null },
): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (requestHeaders) {
    const host =
      requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      requestHeaders.get("host")?.trim();
    const proto =
      requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (host) {
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const isProduction =
        process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
      if (!isLocal || !isProduction) {
        return `${proto}://${host}`.replace(/\/$/, "");
      }
    }
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function buildTechPackDocumentUrl(
  techPackId: string,
  options?: { baseUrl?: string; pdfToken?: string | null },
): string {
  const base = options?.baseUrl?.replace(/\/$/, "") ?? resolveTechPackDocumentBaseUrl();
  const params = new URLSearchParams({ mode: "pdf" });
  if (options?.pdfToken) params.set("pdfToken", options.pdfToken);
  return `${base}/tech-pack/${encodeURIComponent(techPackId)}/document?${params.toString()}`;
}
