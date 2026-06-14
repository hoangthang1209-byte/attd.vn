import { NextRequest, NextResponse } from "next/server";
import type { BlogPostStatus } from "@prisma/client";
import { tagMatchesFilter } from "@/features/blog/content-processor";
import { prisma } from "@/lib/prisma";
import {
  createBlogPost,
  isValidBlogPostStatus,
  listBlogPostsAdmin,
} from "@/features/blog/services/blog-admin.service";
import { parseBlogFaqInput, parseBlogTagsInput, sanitizeBlogFaq } from "@/features/blog/parse-input";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const publishedOnly = searchParams.get("published") === "1";

  if (statusParam && !isValidBlogPostStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    if (tag?.trim() && publishedOnly) {
      const posts = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED", slug: { not: "" } },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImageUrl: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          tags: true,
        },
      });

      const filtered = posts
        .filter((post) =>
          Array.isArray(post.tags) &&
          post.tags.some(
            (entry) => typeof entry === "string" && tagMatchesFilter(entry, tag)
          )
        )
        .map(({ tags: _tags, ...post }) => post);

      return NextResponse.json({ posts: filtered, tag });
    }

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

  const faqJson = parseBlogFaqInput(raw.faqJson);
  const tags = parseBlogTagsInput(raw.tags);

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
      faqJson: faqJson ? sanitizeBlogFaq(faqJson) : [],
      tags: tags ?? [],
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
