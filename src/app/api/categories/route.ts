import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !("slug" in body) ||
    typeof (body as Record<string, unknown>).name !== "string" ||
    typeof (body as Record<string, unknown>).slug !== "string"
  ) {
    return NextResponse.json({ message: "name and slug are required" }, { status: 400 });
  }

  const { name, slug } = body as Record<string, unknown>;
  const b = body as Record<string, unknown>;

  const trimmedName = (name as string).trim();
  const trimmedSlug = (slug as string).trim();

  if (!trimmedName || !trimmedSlug) {
    return NextResponse.json({ message: "name and slug must not be empty" }, { status: 400 });
  }

  const description =
    typeof b.description === "string" ? b.description.trim() || null : null;
  const imageUrl =
    typeof b.imageUrl === "string" ? b.imageUrl.trim() || null : null;
  const seoTitle =
    typeof b.seoTitle === "string" ? b.seoTitle.trim().slice(0, 255) || null : null;
  const seoDescription =
    typeof b.seoDescription === "string"
      ? b.seoDescription.trim().slice(0, 500) || null
      : null;

  try {
    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug: trimmedSlug,
        description,
        imageUrl,
        seoTitle,
        seoDescription,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[api/categories POST]", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
