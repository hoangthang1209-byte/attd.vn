import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: unknown = await request.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const title =
    typeof b.title === "string" ? b.title.trim() : undefined;
  const slug =
    typeof b.slug === "string" ? b.slug.trim() : undefined;

  if (title !== undefined && !title) {
    return NextResponse.json({ message: "title không được để trống" }, { status: 400 });
  }
  if (slug !== undefined && !slug) {
    return NextResponse.json({ message: "slug không được để trống" }, { status: 400 });
  }

  const excerpt =
    typeof b.excerpt === "string" ? b.excerpt.trim() || null : undefined;
  const content =
    typeof b.content === "string" ? b.content.trim() || null : undefined;
  const imageUrl =
    typeof b.imageUrl === "string" ? b.imageUrl.trim() || null : undefined;
  const status =
    b.status === "PUBLISHED" || b.status === "DRAFT"
      ? (b.status as "PUBLISHED" | "DRAFT")
      : undefined;
  const seoTitle =
    typeof b.seoTitle === "string"
      ? b.seoTitle.trim().slice(0, 255) || null
      : undefined;
  const seoDescription =
    typeof b.seoDescription === "string"
      ? b.seoDescription.trim().slice(0, 500) || null
      : undefined;

  try {
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(status !== undefined && { status }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
      },
    });

    return NextResponse.json(post);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
      }
      if (code === "P2002") {
        return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
      }
    }
    console.error("[api/posts PATCH]", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ message: "Đã xoá bài viết" });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
    }
    console.error("[api/posts DELETE]", err);
    return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}
