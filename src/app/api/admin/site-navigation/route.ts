import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SiteNavPlacement } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import {
  getSiteNavigationCmsConfig,
  isSiteNavigationTableReady,
  upsertSiteNavigationCtas,
  upsertSiteNavigationFooterItems,
  upsertSiteNavigationItemsForPlacement,
  upsertSiteNavigationSettings,
  upsertSiteNavigationSocialLinks,
} from "@/features/site-navigation/site-navigation.service";
import type {
  SiteNavCtaConfig,
  SiteNavLinkConfig,
  SiteNavigationSettingsConfig,
  SiteSocialLinkConfig,
} from "@/features/site-navigation/site-navigation.types";
import {
  parseSiteNavigationPanel,
  placementForPanel,
} from "@/features/site-navigation/site-navigation-validation";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCacheTags,
} from "@/lib/public-cache-tags";

const MIGRATION_MESSAGE =
  "SiteNavigationSettings tables chưa tồn tại. Chạy prisma migrate deploy.";

function unauthorized() {
  return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

async function requireCmsManagePermission() {
  const session = await getAdminSessionFromCookies();
  if (!session.authenticated) return { ok: false as const, response: unauthorized() };
  if (!can(session, "cms.manage")) return { ok: false as const, response: forbidden() };
  return { ok: true as const };
}

function revalidatePublicNavigation() {
  revalidatePublicCacheTags(PUBLIC_CACHE_TAGS.navigation);
  revalidatePath("/", "layout");
  revalidatePath("/admin/site-navigation");
}

export async function GET() {
  const permission = await requireCmsManagePermission();
  if (!permission.ok) return permission.response;

  const tableReady = await isSiteNavigationTableReady();
  if (!tableReady) {
    return NextResponse.json({ tableReady: false, message: MIGRATION_MESSAGE });
  }

  const cms = await getSiteNavigationCmsConfig();
  return NextResponse.json({ tableReady: true, cms });
}

export async function PATCH(request: Request) {
  const permission = await requireCmsManagePermission();
  if (!permission.ok) return permission.response;

  const tableReady = await isSiteNavigationTableReady();
  if (!tableReady) {
    return NextResponse.json({ message: MIGRATION_MESSAGE }, { status: 503 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const panel = parseSiteNavigationPanel(body.panel);

    if (!panel) {
      return NextResponse.json({ message: "Panel không hợp lệ." }, { status: 400 });
    }

    if (panel === "settings") {
      const settings = body.settings as SiteNavigationSettingsConfig | undefined;
      if (!settings) {
        return NextResponse.json({ message: "Thiếu cấu hình chung." }, { status: 400 });
      }
      const result = await upsertSiteNavigationSettings(settings);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidatePublicNavigation();
      return NextResponse.json({ panel, settings: result.settings });
    }

    if (panel === "footer") {
      const items = body.items as SiteNavLinkConfig[] | undefined;
      if (!Array.isArray(items)) {
        return NextResponse.json({ message: "Thiếu dữ liệu footer." }, { status: 400 });
      }
      const settings = body.settings as SiteNavigationSettingsConfig | undefined;
      let savedSettings: SiteNavigationSettingsConfig | undefined;
      if (settings) {
        const settingsResult = await upsertSiteNavigationSettings(settings);
        if ("error" in settingsResult) {
          return NextResponse.json({ message: settingsResult.error }, { status: 400 });
        }
        savedSettings = settingsResult.settings;
      }
      const result = await upsertSiteNavigationFooterItems(items);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidatePublicNavigation();
      return NextResponse.json({
        panel,
        items: result.items,
        ...(savedSettings ? { settings: savedSettings } : {}),
      });
    }

    if (panel === "social") {
      const socialLinks = body.socialLinks as SiteSocialLinkConfig[] | undefined;
      if (!Array.isArray(socialLinks)) {
        return NextResponse.json({ message: "Thiếu dữ liệu mạng xã hội." }, { status: 400 });
      }
      const result = await upsertSiteNavigationSocialLinks(socialLinks);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidatePublicNavigation();
      return NextResponse.json({ panel, socialLinks: result.socialLinks });
    }

    if (panel === "ctas") {
      const ctas = body.ctas as SiteNavCtaConfig[] | undefined;
      if (!Array.isArray(ctas)) {
        return NextResponse.json({ message: "Thiếu dữ liệu CTA." }, { status: 400 });
      }
      const result = await upsertSiteNavigationCtas(ctas);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidatePublicNavigation();
      return NextResponse.json({ panel, ctas: result.ctas });
    }

    const placements = placementForPanel(panel);
    if (!placements || Array.isArray(placements)) {
      return NextResponse.json({ message: "Panel không hỗ trợ." }, { status: 400 });
    }

    const items = body.items as SiteNavLinkConfig[] | undefined;
    if (!Array.isArray(items)) {
      return NextResponse.json({ message: "Thiếu dữ liệu menu." }, { status: 400 });
    }

    const result = await upsertSiteNavigationItemsForPlacement(
      placements as SiteNavPlacement,
      items,
    );
    if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
    revalidatePublicNavigation();
    return NextResponse.json({ panel, items: result.items });
  } catch (error) {
    console.error("[site-navigation] PATCH failed", error);
    return NextResponse.json({ message: "Lưu thất bại." }, { status: 500 });
  }
}
