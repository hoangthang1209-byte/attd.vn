import { NextResponse } from "next/server";
import {
  listCaseStudies,
  createCaseStudy,
} from "@/features/case-studies/services/case-study.service";

export async function GET() {
  const studies = await listCaseStudies();
  return NextResponse.json(studies);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const quantity = typeof body.quantity === "string" ? body.quantity.trim() : "";
    const timeline = typeof body.timeline === "string" ? body.timeline.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!title || !category || !quantity || !timeline || !summary || !imageUrl) {
      return NextResponse.json(
        { message: "Tất cả trường bắt buộc phải được điền" },
        { status: 400 }
      );
    }

    const study = await createCaseStudy({
      title,
      category,
      quantity,
      timeline,
      summary,
      imageUrl,
      isVisible: body.isVisible === true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });

    return NextResponse.json(study, { status: 201 });
  } catch (err) {
    console.error("[api/case-studies] POST failed:", err);
    return NextResponse.json({ message: "Tạo dự án thất bại" }, { status: 500 });
  }
}
