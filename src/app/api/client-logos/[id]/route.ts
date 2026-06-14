import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateClientLogo,
  deleteClientLogo,
  getClientLogoById,
} from "@/features/client-logos/services/client-logo.service";

function isVisibilityOnlyPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === "isVisible" && typeof body.isVisible === "boolean";
}

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
  website: string | null;
}): string | null {
  if (!input.companyName.trim()) return "Tên công ty là bắt buộc";
  if (input.companyName.trim().length < 2) {
    return "Tên công ty phải có ít nhất 2 ký tự";
  }
  if (!input.imageUrl.trim()) return "Logo là bắt buộc";
  if (!isValidWebsiteUrl(input.website ?? "")) return "Website không hợp lệ";
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await getClientLogoById(id);
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
    }

    if (!isVisibilityOnlyPatch(body)) {
      const merged = {
        companyName:
          typeof body.companyName === "string"
            ? body.companyName.trim()
            : existing.companyName,
        imageUrl:
          typeof body.imageUrl === "string" ? body.imageUrl.trim() : existing.imageUrl,
        website:
          typeof body.website === "string"
            ? body.website.trim() || null
            : body.website === null
              ? null
              : existing.website,
      };

      const validationError = validateClientLogo(merged);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }
    }

    const logo = await updateClientLogo(id, {
      ...(typeof body.companyName === "string"
        ? { companyName: body.companyName.trim() }
        : {}),
      ...(typeof body.website === "string"
        ? { website: body.website.trim() || null }
        : body.website === null
          ? { website: null }
          : {}),
      ...(typeof body.imageUrl === "string"
        ? { imageUrl: body.imageUrl.trim() }
        : {}),
      ...(typeof body.isVisible === "boolean" ? { isVisible: body.isVisible } : {}),
      ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
    });

    revalidatePath("/", "layout");

    return NextResponse.json(logo);
  } catch (err) {
    console.error("[api/client-logos/[id]] PATCH failed:", err);
    return NextResponse.json({ message: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteClientLogo(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }
}
