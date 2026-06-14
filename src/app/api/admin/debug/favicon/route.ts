import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBrandingSettings,
  isBrandingTableReady,
} from "@/features/settings/services/settings.service";
import {
  resolveFaviconFromBranding,
  describeRenderedIconLinks,
  DEFAULT_FAVICON_PATH,
  toAbsoluteAssetUrl,
} from "@/lib/branding/favicon-metadata";
import { SITE_URL } from "@/lib/seo";

export async function GET() {
  try {
    const brandingTable = await isBrandingTableReady();
    const branding = await getBrandingSettings();

    let updatedAt: string | null = null;
    if (brandingTable) {
      try {
        const row = await prisma.brandingSettings.findUnique({
          where: { id: "default" },
          select: { updatedAt: true, faviconUrl: true },
        });
        updatedAt = row?.updatedAt?.toISOString() ?? null;
      } catch {
        updatedAt = null;
      }
    }

    const resolution = resolveFaviconFromBranding(branding, brandingTable);

    return NextResponse.json({
      faviconUrl: resolution.faviconUrl,
      brandingTable,
      metadataSource: resolution.metadataSource,
      fallbackUsed: resolution.fallbackUsed,
      generatedIconUrl: resolution.generatedIconUrl,
      updatedAt,
      renderedIconLinks: describeRenderedIconLinks(resolution),
      routes: {
        iconRoute: `${SITE_URL}${DEFAULT_FAVICON_PATH}`,
        faviconIcoRoute: `${SITE_URL}/favicon.ico`,
        appleIconRoute: `${SITE_URL}/apple-icon`,
      },
      hardcodedFiles: {
        publicFaviconIco: false,
        appFaviconIcoStatic: false,
        appFaviconIcoRoute: true,
        appIconFile: false,
        appIconTsx: true,
        appAppleIconTsx: true,
      },
      cmsApi: {
        settingsFaviconUrl: resolution.faviconUrl,
        absoluteFaviconUrl: resolution.faviconUrl
          ? toAbsoluteAssetUrl(resolution.faviconUrl)
          : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Favicon debug failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
