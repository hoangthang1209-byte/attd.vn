import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listClientLogos,
  createClientLogo,
} from "@/features/client-logos/services/client-logo.service";

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

function validateClientLogo(input: {
  companyName: string;
  imageUrl: string;
  website: string;
}): string | null {
  if (!input.companyName.trim()) return "Tên công ty là bắt buộc";
  if (input.companyName.trim().length < 2) {
    return "Tên công ty phải có ít nhất 2 ký tự";
  }
  if (!input.imageUrl.trim()) return "Logo là bắt buộc";
  if (!isValidWebsiteUrl(input.website)) return "Website không hợp lệ";
  return null;
}

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
    const website =
      typeof body.website === "string" ? body.website.trim() : "";

    const validationError = validateClientLogo({ companyName, imageUrl, website });
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const logo = await createClientLogo({
      companyName,
      imageUrl,
      website: website || undefined,
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
