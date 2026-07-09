import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import type { BrandingSettingsData } from "@/features/settings/services/settings.service";
import { createAttdIconImageResponse } from "@/lib/branding/generate-attd-icon";

/** Next.js file-based icon route served at /icon. */
export const DEFAULT_FAVICON_PATH = "/icon/32";
export const DEFAULT_APPLE_ICON_PATH = "/apple-icon";
export const DEFAULT_FAVICON_ICO_PATH = "/favicon.ico";
export const DEFAULT_WEB_MANIFEST_PATH = "/site.webmanifest";

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
    metadataSource: faviconUrl ? "BrandingSettings.faviconUrl" : "ATTD brand icon (app/icon.tsx)",
    fallbackUsed,
    generatedIconUrl,
  };
}

export function buildFaviconMetadata(
  branding: Pick<BrandingSettingsData, "faviconUrl">
): Pick<Metadata, "icons" | "manifest"> {
  const faviconUrl = branding.faviconUrl?.trim() || null;

  if (faviconUrl) {
    const iconHref = toAbsoluteAssetUrl(faviconUrl);
    return {
      icons: {
        icon: [{ url: iconHref, sizes: "any" }],
        shortcut: iconHref,
        apple: iconHref,
      },
    };
  }

  return {
    manifest: DEFAULT_WEB_MANIFEST_PATH,
    icons: {
      icon: [
        { url: DEFAULT_FAVICON_PATH, sizes: "32x32", type: "image/png" },
        { url: "/icon/192", sizes: "192x192", type: "image/png" },
        { url: "/icon/512", sizes: "512x512", type: "image/png" },
      ],
      shortcut: DEFAULT_FAVICON_ICO_PATH,
      apple: [{ url: DEFAULT_APPLE_ICON_PATH, sizes: "180x180", type: "image/png" }],
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

  return createAttdIconImageResponse(32);
}

/** Expected link tags from metadata + file-based icon routes. */
export function describeRenderedIconLinks(resolution: FaviconResolution): string[] {
  if (resolution.faviconUrl) {
    const href = resolution.generatedIconUrl;
    return [
      `<link rel="icon" href="${href}" sizes="any" />`,
      `<link rel="shortcut icon" href="${href}" />`,
      `<link rel="apple-touch-icon" href="${href}" />`,
    ];
  }

  return [
    `<link rel="manifest" href="${SITE_URL}${DEFAULT_WEB_MANIFEST_PATH}" />`,
    `<link rel="icon" href="${SITE_URL}${DEFAULT_FAVICON_PATH}" type="image/png" sizes="32x32" />`,
    `<link rel="icon" href="${SITE_URL}/icon/192" type="image/png" sizes="192x192" />`,
    `<link rel="icon" href="${SITE_URL}/icon/512" type="image/png" sizes="512x512" />`,
    `<link rel="shortcut icon" href="${SITE_URL}${DEFAULT_FAVICON_ICO_PATH}" />`,
    `<link rel="apple-touch-icon" href="${SITE_URL}${DEFAULT_APPLE_ICON_PATH}" sizes="180x180" />`,
  ];
}
