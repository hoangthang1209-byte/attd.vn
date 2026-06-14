import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateCaseStudy,
  deleteCaseStudy,
  getCaseStudyById,
} from "@/features/case-studies/services/case-study.service";

function isVisibilityOnlyPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body);
  return keys.length === 1 && keys[0] === "isVisible" && typeof body.isVisible === "boolean";
}

function validateFullCaseStudy(input: {
  title: string;
  summary: string;
  imageUrl: string;
}): string | null {
  if (!input.title.trim()) return "Tiêu đề là bắt buộc";
  if (!input.imageUrl.trim()) return "Ảnh dự án là bắt buộc";
  if (input.summary.trim().length < 20) {
    return "Tóm tắt phải có ít nhất 20 ký tự";
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await getCaseStudyById(id);
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
    }

    if (!isVisibilityOnlyPatch(body)) {
      const merged = {
        title: typeof body.title === "string" ? body.title.trim() : existing.title,
        category:
          typeof body.category === "string" ? body.category.trim() : existing.category,
        quantity:
          typeof body.quantity === "string" ? body.quantity.trim() : existing.quantity,
        timeline:
          typeof body.timeline === "string" ? body.timeline.trim() : existing.timeline,
        summary:
          typeof body.summary === "string" ? body.summary.trim() : existing.summary,
        imageUrl:
          typeof body.imageUrl === "string" ? body.imageUrl.trim() : existing.imageUrl,
      };

      const validationError = validateFullCaseStudy(merged);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }
    }

    const study = await updateCaseStudy(id, {
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(typeof body.category === "string" ? { category: body.category.trim() } : {}),
      ...(typeof body.quantity === "string" ? { quantity: body.quantity.trim() } : {}),
      ...(typeof body.timeline === "string" ? { timeline: body.timeline.trim() } : {}),
      ...(typeof body.summary === "string" ? { summary: body.summary.trim() } : {}),
      ...(typeof body.imageUrl === "string" ? { imageUrl: body.imageUrl.trim() } : {}),
      ...(typeof body.isVisible === "boolean" ? { isVisible: body.isVisible } : {}),
      ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
    });

    revalidatePath("/", "layout");

    return NextResponse.json(study);
  } catch (err) {
    console.error("[api/case-studies/[id]] PATCH failed:", err);
    return NextResponse.json({ message: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteCaseStudy(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }
}
