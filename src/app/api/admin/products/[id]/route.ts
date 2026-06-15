import { NextRequest, NextResponse } from "next/server";
import {
  getProductAdminById,
  updateProductAdmin,
  deleteProductAdmin,
} from "@/features/products/product-admin.service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductAdminById(id);
  if (!product) return NextResponse.json({ message: "Không tìm thấy sản phẩm." }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  try {
    const raw = body as Record<string, unknown>;
    const updated = await updateProductAdmin(id, {
      name: raw.name ? String(raw.name) : undefined,
      categoryId: raw.categoryId ? String(raw.categoryId) : undefined,
      productCode: raw.productCode !== undefined ? (raw.productCode ? String(raw.productCode) : undefined) : undefined,
      shortDescription: raw.shortDescription !== undefined ? String(raw.shortDescription) : undefined,
      description: raw.description !== undefined ? String(raw.description) : undefined,
      material: raw.material !== undefined ? String(raw.material) : undefined,
      form: raw.form !== undefined ? String(raw.form) : undefined,
      fit: raw.fit !== undefined ? String(raw.fit) : undefined,
      defaultMoq: raw.defaultMoq !== undefined ? Number(raw.defaultMoq) || null : undefined,
      leadTime: raw.leadTime !== undefined ? String(raw.leadTime) || null : undefined,
      useCases: Array.isArray(raw.useCases) ? raw.useCases as string[] : undefined,
      targetCustomers: Array.isArray(raw.targetCustomers) ? raw.targetCustomers as string[] : undefined,
      supportsPrinting: raw.supportsPrinting !== undefined ? Boolean(raw.supportsPrinting) : undefined,
      supportsEmbroidery: raw.supportsEmbroidery !== undefined ? Boolean(raw.supportsEmbroidery) : undefined,
      supportsOem: raw.supportsOem !== undefined ? Boolean(raw.supportsOem) : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : undefined,
      status: raw.status ? String(raw.status) as "ACTIVE" | "DRAFT" | "INACTIVE" | "ARCHIVED" : undefined,
      featuredImage: raw.featuredImage !== undefined ? (String(raw.featuredImage) || null) : undefined,
      gallery: Array.isArray(raw.gallery) ? raw.gallery as string[] : undefined,
      variants: Array.isArray(raw.variants) ? raw.variants as Parameters<typeof updateProductAdmin>[1]["variants"] : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/admin/products/:id]", err);
    return NextResponse.json({ message: "Không thể cập nhật sản phẩm." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteProductAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/products/:id]", err);
    return NextResponse.json({ message: "Không thể xóa sản phẩm." }, { status: 500 });
  }
}
