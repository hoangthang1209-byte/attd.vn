import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getBrandingSettingsRecord,
  upsertBrandingSettings,
} from "@/features/settings/services/settings.service";

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

function optionalUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function validateBranding(input: {
  companyTagline: string;
  facebookUrl: string | null;
  zaloUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
}): string | null {
  if (input.companyTagline.length > 160) {
    return "Tagline tối đa 160 ký tự";
  }

  const socialFields: Array<[string, string | null]> = [
    ["Facebook", input.facebookUrl],
    ["Zalo", input.zaloUrl],
    ["Youtube", input.youtubeUrl],
    ["TikTok", input.tiktokUrl],
    ["LinkedIn", input.linkedinUrl],
  ];

  for (const [label, url] of socialFields) {
    if (url && !isValidWebsiteUrl(url)) {
      return `${label} URL không hợp lệ`;
    }
  }

  return null;
}

export async function GET() {
  const settings = await getBrandingSettingsRecord();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const companyTagline =
      typeof body.companyTagline === "string" ? body.companyTagline.trim() : "";

    const merged = {
      companyTagline,
      facebookUrl: optionalUrl(body.facebookUrl) ?? null,
      zaloUrl: optionalUrl(body.zaloUrl) ?? null,
      youtubeUrl: optionalUrl(body.youtubeUrl) ?? null,
      tiktokUrl: optionalUrl(body.tiktokUrl) ?? null,
      linkedinUrl: optionalUrl(body.linkedinUrl) ?? null,
    };

    const validationError = validateBranding(merged);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    await upsertBrandingSettings({
      ...(body.headerLogoUrl !== undefined
        ? { headerLogoUrl: optionalUrl(body.headerLogoUrl) ?? null }
        : {}),
      ...(body.footerLogoUrl !== undefined
        ? { footerLogoUrl: optionalUrl(body.footerLogoUrl) ?? null }
        : {}),
      ...(body.faviconUrl !== undefined
        ? { faviconUrl: optionalUrl(body.faviconUrl) ?? null }
        : {}),
      ...(body.defaultOgImageUrl !== undefined
        ? { defaultOgImageUrl: optionalUrl(body.defaultOgImageUrl) ?? null }
        : {}),
      companyTagline: merged.companyTagline,
      facebookUrl: merged.facebookUrl,
      zaloUrl: merged.zaloUrl,
      youtubeUrl: merged.youtubeUrl,
      tiktokUrl: merged.tiktokUrl,
      linkedinUrl: merged.linkedinUrl,
    });

    revalidatePath("/", "layout");
    revalidatePath("/");

    const settings = await getBrandingSettingsRecord();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[api/settings/branding] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}
