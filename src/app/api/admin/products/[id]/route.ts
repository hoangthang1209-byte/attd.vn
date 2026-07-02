import { NextRequest, NextResponse } from "next/server";
import {
  archiveProductAdmin,
  restoreProductAdmin,
  getProductAdminById,
  updateProductAdmin,
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
    const archived = await archiveProductAdmin(id);
    return NextResponse.json({ ok: true, product: archived, message: "Đã lưu trữ sản phẩm" });
  } catch (err) {
    logProductAdminError("delete", err);
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const action = body && typeof body === "object" && "action" in body ? String((body as { action?: string }).action) : "";
  if (action !== "restore") {
    return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
  }

  try {
    const statusRaw =
      body && typeof body === "object" && "status" in body
        ? String((body as { status?: string }).status ?? "DRAFT")
        : "DRAFT";
    const restored = await restoreProductAdmin(
      id,
      statusRaw as "ACTIVE" | "DRAFT" | "INACTIVE" | "ARCHIVED",
    );
    return NextResponse.json({
      ok: true,
      product: restored,
      message: "Đã khôi phục sản phẩm ở trạng thái nháp.",
    });
  } catch (err) {
    logProductAdminError("update", err);
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}
