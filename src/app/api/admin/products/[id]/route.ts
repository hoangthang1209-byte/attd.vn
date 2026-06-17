import { NextRequest, NextResponse } from "next/server";
import {
  getProductAdminById,
  updateProductAdmin,
  deleteProductAdmin,
} from "@/features/products/product-admin.service";
import {
  formatProductAdminApiError,
  parseProductInput,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";

function logProductAdminError(action: "update" | "delete", err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "unknown";
  console.error(`[PATCH /api/admin/products/:id] action=${action} code=${code} message=${message}`);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductAdminById(id);
  if (!product) return NextResponse.json({ message: "Không tìm thấy sản phẩm." }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON", message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const input = parseProductInput(body as Record<string, unknown>, "update");
    const updated = await updateProductAdmin(id, input);
    return NextResponse.json(updated);
  } catch (err) {
    logProductAdminError("update", err);
    if (err instanceof ProductAdminValidationError) {
      const formatted = formatProductAdminApiError(err);
      return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
    }
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteProductAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logProductAdminError("delete", err);
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}
