import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      seoTitle: true,
    },
  });

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("title" in body) ||
    !("slug" in body) ||
    typeof (body as Record<string, unknown>).title !== "string" ||
    typeof (body as Record<string, unknown>).slug !== "string"
  ) {
    return NextResponse.json(
      { message: "title và slug là bắt buộc" },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const title = (b.title as string).trim();
  const slug = (b.slug as string).trim();

  if (!title || !slug) {
    return NextResponse.json(
      { message: "title và slug không được để trống" },
      { status: 400 }
    );
  }

  const excerpt =
    typeof b.excerpt === "string" ? b.excerpt.trim() || null : null;
  const content =
    typeof b.content === "string" ? b.content.trim() || null : null;
  const imageUrl =
    typeof b.imageUrl === "string" ? b.imageUrl.trim() || null : null;
  const status =
    b.status === "PUBLISHED" || b.status === "DRAFT"
      ? (b.status as "PUBLISHED" | "DRAFT")
      : "DRAFT";
  const seoTitle =
    typeof b.seoTitle === "string"
      ? b.seoTitle.trim().slice(0, 255) || null
      : null;
  const seoDescription =
    typeof b.seoDescription === "string"
      ? b.seoDescription.trim().slice(0, 500) || null
      : null;

  try {
    const post = await prisma.post.create({
      data: { title, slug, excerpt, content, imageUrl, status, seoTitle, seoDescription },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[api/posts POST]", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
