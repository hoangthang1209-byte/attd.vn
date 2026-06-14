import { generateBrandingIconResponse } from "@/lib/branding/favicon-metadata";

export const revalidate = 3600;
export const runtime = "nodejs";

/**
 * Serves /favicon.ico from BrandingSettings (same source as /icon).
 */
export async function GET() {
  const response = await generateBrandingIconResponse();
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set("Content-Disposition", 'inline; filename="favicon.ico"');
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
