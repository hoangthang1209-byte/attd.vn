import { NextRequest, NextResponse } from "next/server";
import type { BlogPostStatus } from "@prisma/client";
import {
  createBlogPost,
  isValidBlogPostStatus,
  listBlogPostsAdmin,
} from "@/features/blog/services/blog-admin.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;

  if (statusParam && !isValidBlogPostStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const posts = await listBlogPostsAdmin({
      search,
      status: statusParam as BlogPostStatus | undefined,
      categoryId,
    });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error("[GET /api/blog/posts]", err);
    return NextResponse.json(
      { message: "Không thể tải danh sách bài viết", posts: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";

  if (!title) {
    return NextResponse.json({ message: "Tiêu đề là bắt buộc" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ message: "Slug là bắt buộc" }, { status: 400 });
  }

  const status =
    typeof raw.status === "string" && isValidBlogPostStatus(raw.status)
      ? raw.status
      : undefined;

  const categoryIds = Array.isArray(raw.categoryIds)
    ? raw.categoryIds.filter((id): id is string => typeof id === "string")
    : undefined;

  try {
    const post = await createBlogPost({
      title,
      slug,
      excerpt: typeof raw.excerpt === "string" ? raw.excerpt : null,
      content: typeof raw.content === "string" ? raw.content : null,
      featuredImageUrl:
        typeof raw.featuredImageUrl === "string" ? raw.featuredImageUrl : null,
      metaTitle: typeof raw.metaTitle === "string" ? raw.metaTitle : null,
      metaDescription:
        typeof raw.metaDescription === "string" ? raw.metaDescription : null,
      canonicalUrl: typeof raw.canonicalUrl === "string" ? raw.canonicalUrl : null,
      ogImageUrl: typeof raw.ogImageUrl === "string" ? raw.ogImageUrl : null,
      status,
      categoryIds,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[POST /api/blog/posts]", err);
    return NextResponse.json({ message: "Không thể tạo bài viết" }, { status: 500 });
  }
}
