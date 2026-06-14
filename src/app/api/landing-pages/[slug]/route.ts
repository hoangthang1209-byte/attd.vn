import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getLandingPageBySlug,
  isLandingPageTableReady,
  landingPageRoute,
  upsertLandingPage,
} from "@/features/landing-pages/services/landing-page.service";
import { parseFaqJson } from "@/features/landing-pages/landing-page-merge";
import { LANDING_PAGE_SLUGS } from "@/features/landing-pages/types";

function isValidWebsiteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tableReady = await isLandingPageTableReady();
  if (!tableReady) {
    return NextResponse.json(
      { message: "LandingPageContent table chưa tồn tại. Chạy prisma migrate deploy." },
      { status: 503 }
    );
  }

  const page = await getLandingPageBySlug(slug);
  if (!page) {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }
  return NextResponse.json(page);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!LANDING_PAGE_SLUGS.includes(slug as (typeof LANDING_PAGE_SLUGS)[number])) {
    return NextResponse.json({ message: "Slug không hợp lệ" }, { status: 400 });
  }

  const tableReady = await isLandingPageTableReady();
  if (!tableReady) {
    return NextResponse.json(
      { message: "LandingPageContent table chưa tồn tại. Chạy prisma migrate deploy." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const faqJson =
      body.faqJson !== undefined ? parseFaqJson(body.faqJson) : undefined;

    const primaryCtaHref = optionalString(body.primaryCtaHref)?.trim() ?? "";
    const secondaryCtaHref = optionalString(body.secondaryCtaHref)?.trim() ?? "";

    if (!isValidWebsiteUrl(primaryCtaHref) || !isValidWebsiteUrl(secondaryCtaHref)) {
      return NextResponse.json({ message: "CTA URL không hợp lệ" }, { status: 400 });
    }

    const page = await upsertLandingPage(slug, {
      ...(optionalString(body.title) !== undefined
        ? { title: optionalString(body.title)!.trim() }
        : {}),
      ...(optionalString(body.metaTitle) !== undefined
        ? { metaTitle: optionalString(body.metaTitle)!.trim() }
        : {}),
      ...(optionalString(body.metaDescription) !== undefined
        ? { metaDescription: optionalString(body.metaDescription)!.trim() }
        : {}),
      ...(optionalString(body.heroTitle) !== undefined
        ? { heroTitle: optionalString(body.heroTitle)!.trim() }
        : {}),
      ...(optionalString(body.heroDescription) !== undefined
        ? { heroDescription: optionalString(body.heroDescription)!.trim() }
        : {}),
      ...(optionalString(body.seoContent) !== undefined
        ? { seoContent: optionalString(body.seoContent)!.trim() }
        : {}),
      ...(faqJson !== undefined ? { faqJson } : {}),
      ...(optionalString(body.primaryCtaLabel) !== undefined
        ? { primaryCtaLabel: optionalString(body.primaryCtaLabel)!.trim() }
        : {}),
      ...(body.primaryCtaHref !== undefined ? { primaryCtaHref: primaryCtaHref || "" } : {}),
      ...(optionalString(body.secondaryCtaLabel) !== undefined
        ? { secondaryCtaLabel: optionalString(body.secondaryCtaLabel)!.trim() }
        : {}),
      ...(body.secondaryCtaHref !== undefined
        ? { secondaryCtaHref: secondaryCtaHref || "" }
        : {}),
      ...(typeof body.isPublished === "boolean" ? { isPublished: body.isPublished } : {}),
    });

    if (!page) {
      return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
    }

    revalidatePath(landingPageRoute(slug));

    return NextResponse.json(page);
  } catch (err) {
    console.error("[api/landing-pages/[slug]] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}
