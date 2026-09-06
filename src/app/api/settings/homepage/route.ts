import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getHomepageCmsConfig,
  upsertHomepageCompanyRealityConfig,
  upsertHomepageHeroConfig,
  upsertHomepageOemConfig,
  upsertHomepagePathwaysConfig,
  upsertHomepageProofConfig,
  upsertHomepageSectionsConfig,
  upsertHomepageWorkshopGalleryConfig,
} from "@/features/home/homepage.service";
import type {
  HomepageCmsPanel,
  HomepageCompanyRealityConfig,
  HomepageOemBannerConfig,
  HomepageProofItemConfig,
  HomepageSourcingPathwayConfig,
  HomepageWorkshopGalleryConfig,
} from "@/features/home/homepage.types";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCacheTags,
} from "@/lib/public-cache-tags";

function revalidateHomepageSurfaces() {
  revalidatePublicCacheTags(PUBLIC_CACHE_TAGS.homepage);
  revalidatePath("/");
  revalidatePath("/admin/settings/homepage");
}

export async function GET() {
  const cms = await getHomepageCmsConfig();
  return NextResponse.json({ cms, hero: cms.hero });
}

function parsePanel(body: Record<string, unknown>): HomepageCmsPanel | null {
  const panel = body.panel;
  if (
    panel === "hero" ||
    panel === "proof" ||
    panel === "pathways" ||
    panel === "oem" ||
    panel === "companyReality" ||
    panel === "workshopGallery" ||
    panel === "sections"
  ) {
    return panel;
  }
  return null;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const panel = parsePanel(body);

    if (!panel) {
      const result = await upsertHomepageHeroConfig({
        eyebrow: String(body.eyebrow ?? body.heroEyebrow ?? "").trim(),
        heading: String(body.heading ?? body.heroHeading ?? "").trim(),
        description: String(body.description ?? body.heroDescription ?? "").trim(),
        primaryCtaLabel: String(body.primaryCtaLabel ?? body.heroPrimaryCtaLabel ?? "").trim(),
        primaryCtaUrl: String(body.primaryCtaUrl ?? body.heroPrimaryCtaUrl ?? "").trim(),
        secondaryCtaLabel: String(body.secondaryCtaLabel ?? body.heroSecondaryCtaLabel ?? "").trim(),
        secondaryCtaUrl: String(body.secondaryCtaUrl ?? body.heroSecondaryCtaUrl ?? "").trim(),
      });
      if ("error" in result) {
        return NextResponse.json({ message: result.error }, { status: 400 });
      }
      revalidateHomepageSurfaces();
      return NextResponse.json({ hero: result.hero, panel: "hero" });
    }

    if (panel === "hero") {
      const result = await upsertHomepageHeroConfig({
        eyebrow: String(body.eyebrow ?? "").trim(),
        heading: String(body.heading ?? "").trim(),
        description: String(body.description ?? "").trim(),
        primaryCtaLabel: String(body.primaryCtaLabel ?? "").trim(),
        primaryCtaUrl: String(body.primaryCtaUrl ?? "").trim(),
        secondaryCtaLabel: String(body.secondaryCtaLabel ?? "").trim(),
        secondaryCtaUrl: String(body.secondaryCtaUrl ?? "").trim(),
      });
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ hero: result.hero, panel });
    }

    if (panel === "proof") {
      const items = body.items as HomepageProofItemConfig[] | undefined;
      if (!Array.isArray(items)) {
        return NextResponse.json({ message: "Thiếu dữ liệu thanh lợi ích." }, { status: 400 });
      }
      const result = await upsertHomepageProofConfig(items);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ proofStrip: result.proofStrip, panel });
    }

    if (panel === "pathways") {
      const items = body.items as HomepageSourcingPathwayConfig[] | undefined;
      if (!Array.isArray(items)) {
        return NextResponse.json({ message: "Thiếu dữ liệu lộ trình nguồn hàng." }, { status: 400 });
      }
      const result = await upsertHomepagePathwaysConfig(items);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ sourcingPathways: result.sourcingPathways, panel });
    }

    if (panel === "oem") {
      const oem = body.oemBanner as HomepageOemBannerConfig | undefined;
      if (!oem) {
        return NextResponse.json({ message: "Thiếu dữ liệu banner OEM." }, { status: 400 });
      }
      const result = await upsertHomepageOemConfig(oem);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ oemBanner: result.oemBanner, panel });
    }

    if (panel === "companyReality") {
      const companyReality = body.companyReality as HomepageCompanyRealityConfig | undefined;
      if (!companyReality) {
        return NextResponse.json({ message: "Thiếu dữ liệu ATTD trong thực tế." }, { status: 400 });
      }
      const result = await upsertHomepageCompanyRealityConfig(companyReality);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ companyReality: result.companyReality, panel });
    }

    if (panel === "workshopGallery") {
      const workshopGallery = body.workshopGallery as HomepageWorkshopGalleryConfig | undefined;
      if (!workshopGallery) {
        return NextResponse.json({ message: "Thiếu dữ liệu Góc nhìn từ xưởng." }, { status: 400 });
      }
      const result = await upsertHomepageWorkshopGalleryConfig(workshopGallery);
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ workshopGallery: result.workshopGallery, panel });
    }

    if (panel === "sections") {
      const result = await upsertHomepageSectionsConfig({
        proofStripEnabled: Boolean(body.proofStripEnabled),
        proofStripOrder: Number(body.proofStripOrder),
        sourcingPathwaysEnabled: Boolean(body.sourcingPathwaysEnabled),
        sourcingPathwaysOrder: Number(body.sourcingPathwaysOrder),
        oemSectionOrder: Number(body.oemSectionOrder),
      });
      if ("error" in result) return NextResponse.json({ message: result.error }, { status: 400 });
      revalidateHomepageSurfaces();
      return NextResponse.json({ sections: result.sections, panel });
    }

    return NextResponse.json({ message: "Panel không hợp lệ." }, { status: 400 });
  } catch (err) {
    console.error("[api/settings/homepage] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}
