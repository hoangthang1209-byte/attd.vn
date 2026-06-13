import { NextResponse } from "next/server";
import {
  updateCaseStudy,
  deleteCaseStudy,
  getCaseStudyById,
} from "@/features/case-studies/services/case-study.service";

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
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Không tìm thấy" }, { status: 404 });
  }
}
