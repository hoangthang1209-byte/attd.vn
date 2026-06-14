import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import type { BrandingSettingsData } from "@/features/settings/services/settings.service";

/** Next.js file-based icon route served at /icon (and /favicon.ico via rewrite). */
export const DEFAULT_FAVICON_PATH = "/icon";

export type FaviconResolution = {
  faviconUrl: string | null;
  brandingTable: boolean;
  metadataSource: string;
  fallbackUsed: boolean;
  generatedIconUrl: string;
};

export function toAbsoluteAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${SITE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function resolveFaviconFromBranding(
  branding: Pick<BrandingSettingsData, "faviconUrl">,
  brandingTable = true
): FaviconResolution {
  const faviconUrl = branding.faviconUrl?.trim() || null;
  const fallbackUsed = !faviconUrl;
  const generatedIconUrl = faviconUrl
    ? toAbsoluteAssetUrl(faviconUrl)
    : `${SITE_URL}${DEFAULT_FAVICON_PATH}`;

  return {
    faviconUrl,
    brandingTable,
    metadataSource: faviconUrl ? "BrandingSettings.faviconUrl" : "app/icon (default)",
    fallbackUsed,
    generatedIconUrl,
  };
}

export function buildFaviconMetadata(
  branding: Pick<BrandingSettingsData, "faviconUrl">
): Pick<Metadata, "icons"> {
  const { faviconUrl } = resolveFaviconFromBranding(branding);
  const iconHref = faviconUrl ? toAbsoluteAssetUrl(faviconUrl) : DEFAULT_FAVICON_PATH;

  return {
    icons: {
      icon: [{ url: iconHref, sizes: "any" }],
      shortcut: iconHref,
      apple: iconHref,
    },
  };
}

export async function fetchIconResponse(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return null;
  }
}

export async function generateBrandingIconResponse(): Promise<Response> {
  const { getBrandingSettings } = await import(
    "@/features/settings/services/settings.service"
  );
  const branding = await getBrandingSettings();

  if (branding.faviconUrl) {
    const cmsIcon = await fetchIconResponse(toAbsoluteAssetUrl(branding.faviconUrl));
    if (cmsIcon) return cmsIcon;
  }

  const fallback = await fetchIconResponse(`${SITE_URL}/attd-logo.svg`);
  if (fallback) return fallback;

  return new Response("Favicon unavailable", { status: 404 });
}

/** Expected link tags from metadata + file-based icon routes. */
export function describeRenderedIconLinks(resolution: FaviconResolution): string[] {
  const href = resolution.generatedIconUrl;
  return [
    `<link rel="icon" href="${href}" sizes="any" />`,
    `<link rel="shortcut icon" href="${href}" />`,
    `<link rel="apple-touch-icon" href="${href}" />`,
    `<link rel="icon" href="${SITE_URL}${DEFAULT_FAVICON_PATH}" /> (app/icon.tsx)`,
    `<link rel="icon" href="${SITE_URL}/favicon.ico" /> (app/favicon.ico/route.ts)`,
  ];
}
