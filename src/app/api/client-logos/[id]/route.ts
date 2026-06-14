import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateClientLogo,
  deleteClientLogo,
  getClientLogoById,
} from "@/features/client-logos/services/client-logo.service";

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

    const logo = await updateClientLogo(id, {
      ...(typeof body.companyName === "string"
        ? { companyName: body.companyName.trim() }
        : {}),
      ...(typeof body.website === "string"
        ? { website: body.website.trim() || null }
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
