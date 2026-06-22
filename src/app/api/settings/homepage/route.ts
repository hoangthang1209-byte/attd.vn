import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getHomepageHeroConfig,
  upsertHomepageHeroConfig,
} from "@/features/home/homepage.service";

export async function GET() {
  const hero = await getHomepageHeroConfig();
  return NextResponse.json({ hero });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const result = await upsertHomepageHeroConfig({
      eyebrow: String(body.eyebrow ?? body.heroEyebrow ?? "").trim(),
      heading: String(body.heading ?? body.heroHeading ?? "").trim(),
      description: String(body.description ?? body.heroDescription ?? "").trim(),
      primaryCtaLabel: String(body.primaryCtaLabel ?? body.heroPrimaryCtaLabel ?? "").trim(),
      primaryCtaUrl: String(body.primaryCtaUrl ?? body.heroPrimaryCtaUrl ?? "").trim(),
      secondaryCtaLabel: String(
        body.secondaryCtaLabel ?? body.heroSecondaryCtaLabel ?? "",
      ).trim(),
      secondaryCtaUrl: String(body.secondaryCtaUrl ?? body.heroSecondaryCtaUrl ?? "").trim(),
    });

    if ("error" in result) {
      return NextResponse.json({ message: result.error }, { status: 400 });
    }

    revalidatePath("/");

    return NextResponse.json({ hero: result.hero });
  } catch (err) {
    console.error("[api/settings/homepage] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}
