import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listClientLogos,
  createClientLogo,
} from "@/features/client-logos/services/client-logo.service";

export async function GET() {
  const logos = await listClientLogos();
  return NextResponse.json(logos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : "";
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!companyName || !imageUrl) {
      return NextResponse.json(
        { message: "companyName và imageUrl là bắt buộc" },
        { status: 400 }
      );
    }

    const logo = await createClientLogo({
      companyName,
      imageUrl,
      website:
        typeof body.website === "string" ? body.website.trim() || undefined : undefined,
      isVisible: body.isVisible !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });

    revalidatePath("/", "layout");

    return NextResponse.json(logo, { status: 201 });
  } catch (err) {
    console.error("[api/client-logos] POST failed:", err);
    return NextResponse.json({ message: "Tạo logo thất bại" }, { status: 500 });
  }
}
