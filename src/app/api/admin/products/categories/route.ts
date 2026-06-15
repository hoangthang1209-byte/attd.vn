import { NextRequest, NextResponse } from "next/server";
import { listProductCategories, upsertProductCategory } from "@/features/products/product-admin.service";

export async function GET() {
  try {
    const categories = await listProductCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/admin/products/categories]", err);
    return NextResponse.json({ message: "Lỗi tải danh mục." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;
  if (!raw.name) return NextResponse.json({ message: "Tên danh mục là bắt buộc." }, { status: 400 });
  const name = String(raw.name).trim();
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  try {
    const cat = await upsertProductCategory({
      name,
      slug,
      skuCode: raw.skuCode ? String(raw.skuCode) : undefined,
      description: raw.description ? String(raw.description) : undefined,
      sortOrder: raw.sortOrder ? Number(raw.sortOrder) : undefined,
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/products/categories]", err);
    return NextResponse.json({ message: "Không thể tạo danh mục." }, { status: 500 });
  }
}
