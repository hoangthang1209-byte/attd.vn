import { NextRequest, NextResponse } from "next/server";
import {
  deleteBlogPost,
  getBlogPostById,
  isValidBlogPostStatus,
  setBlogPostStatus,
  updateBlogPost,
} from "@/features/blog/services/blog-admin.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const post = await getBlogPostById(id);
  if (!post) {
    return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (raw.action === "publish") {
    const post = await setBlogPostStatus(id, "PUBLISHED");
    if (!post) {
      return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
    }
    return NextResponse.json({ post });
  }

  if (raw.action === "unpublish") {
    const post = await setBlogPostStatus(id, "DRAFT");
    if (!post) {
      return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
    }
    return NextResponse.json({ post });
  }

  const status =
    typeof raw.status === "string" && isValidBlogPostStatus(raw.status)
      ? raw.status
      : undefined;

  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.filter((cid): cid is string => typeof cid === "string")
    : undefined;

  try {
    const post = await updateBlogPost(id, {
      ...(typeof raw.title === "string" ? { title: raw.title } : {}),
      ...(typeof raw.slug === "string" ? { slug: raw.slug } : {}),
      ...(raw.excerpt !== undefined
        ? { excerpt: typeof raw.excerpt === "string" ? raw.excerpt : null }
        : {}),
      ...(raw.content !== undefined
        ? { content: typeof raw.content === "string" ? raw.content : null }
        : {}),
      ...(raw.featuredImageUrl !== undefined
        ? {
            featuredImageUrl:
              typeof raw.featuredImageUrl === "string" ? raw.featuredImageUrl : null,
          }
        : {}),
      ...(raw.metaTitle !== undefined
        ? { metaTitle: typeof raw.metaTitle === "string" ? raw.metaTitle : null }
        : {}),
      ...(raw.metaDescription !== undefined
        ? {
            metaDescription:
              typeof raw.metaDescription === "string" ? raw.metaDescription : null,
          }
        : {}),
      ...(raw.canonicalUrl !== undefined
        ? { canonicalUrl: typeof raw.canonicalUrl === "string" ? raw.canonicalUrl : null }
        : {}),
      ...(raw.ogImageUrl !== undefined
        ? { ogImageUrl: typeof raw.ogImageUrl === "string" ? raw.ogImageUrl : null }
        : {}),
      ...(status ? { status } : {}),
      ...(categoryIds !== undefined ? { categoryIds } : {}),
    });

    if (!post) {
      return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[PATCH /api/blog/posts/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật bài viết" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteBlogPost(id);
  if (!deleted) {
    return NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
