import { generateBrandingIconResponse } from "@/lib/branding/favicon-metadata";

export const runtime = "nodejs";

/**
 * Serves /favicon.ico from BrandingSettings when configured, otherwise the ATTD brand icon.
 */
export async function GET() {
  const response = await generateBrandingIconResponse();
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set("Content-Type", response.headers.get("content-type") || "image/png");
  headers.set("Content-Disposition", 'inline; filename="favicon.ico"');
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
