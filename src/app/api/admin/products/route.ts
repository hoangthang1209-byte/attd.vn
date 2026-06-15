import { NextRequest, NextResponse } from "next/server";
import {
  listProductsAdmin,
  createProductAdmin,
  getProductAdminKpis,
} from "@/features/products/product-admin.service";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const [list, kpis] = await Promise.all([
      listProductsAdmin({
        search: sp.get("search") ?? undefined,
        categoryId: sp.get("categoryId") ?? undefined,
        status: sp.get("status") ?? undefined,
        stockStatus: sp.get("stockStatus") ?? undefined,
        supportsPrinting: sp.get("supportsPrinting") === "1",
        supportsOem: sp.get("supportsOem") === "1",
        page: sp.has("page") ? Number(sp.get("page")) : 1,
        pageSize: sp.has("pageSize") ? Number(sp.get("pageSize")) : 40,
      }),
      getProductAdminKpis(),
    ]);
    return NextResponse.json({ ...list, kpis });
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return NextResponse.json({ message: "Lỗi tải sản phẩm." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;
  if (!raw.name || !raw.categoryId) {
    return NextResponse.json({ message: "Tên và danh mục là bắt buộc." }, { status: 400 });
  }
  try {
    const product = await createProductAdmin({
      name: String(raw.name),
      categoryId: String(raw.categoryId),
      productCode: raw.productCode ? String(raw.productCode) : undefined,
      shortDescription: raw.shortDescription ? String(raw.shortDescription) : undefined,
      description: raw.description ? String(raw.description) : undefined,
      material: raw.material ? String(raw.material) : undefined,
      form: raw.form ? String(raw.form) : undefined,
      fit: raw.fit ? String(raw.fit) : undefined,
      defaultMoq: raw.defaultMoq ? Number(raw.defaultMoq) : undefined,
      useCases: Array.isArray(raw.useCases) ? raw.useCases as string[] : [],
      targetCustomers: Array.isArray(raw.targetCustomers) ? raw.targetCustomers as string[] : [],
      supportsPrinting: Boolean(raw.supportsPrinting),
      supportsEmbroidery: Boolean(raw.supportsEmbroidery),
      supportsOem: Boolean(raw.supportsOem),
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : [],
      status: raw.status ? String(raw.status) as "ACTIVE" | "DRAFT" | "INACTIVE" | "ARCHIVED" : "DRAFT",
      variants: Array.isArray(raw.variants) ? raw.variants as Parameters<typeof createProductAdmin>[0]["variants"] : [],
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/products]", err);
    return NextResponse.json({ message: "Không thể tạo sản phẩm." }, { status: 500 });
  }
}
