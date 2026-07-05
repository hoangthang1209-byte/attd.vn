import { NextRequest, NextResponse } from "next/server";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import {
  getVariantLifecyclePreview,
  performVariantLifecycleAction,
} from "@/features/products/product-variant-lifecycle.service";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type LifecycleMode = "delete" | "archive" | "restore";

function parseMode(value: unknown): LifecycleMode | null {
  if (value === "delete" || value === "archive" || value === "restore") {
    return value;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const authError = await requireAdminApiFromCookies();
  if (authError) {
    return NextResponse.json(
      { message: "Bạn không có quyền thực hiện thao tác này." },
      { status: 401 },
    );
  }

  const { id: productId, variantId } = await params;
  try {
    const preview = await getVariantLifecyclePreview(productId, variantId);
    return NextResponse.json(preview);
  } catch (err) {
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json(
      { ...formatted, message: formatted.error },
      { status: formatted.status },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: productId, variantId } = await params;
  let body: { mode?: unknown } = {};
  try {
    body = (await req.json()) as { mode?: unknown };
  } catch {
    body = {};
  }

  const mode = parseMode(body.mode);
  if (!mode) {
    return NextResponse.json(
      {
        message: "Thao tác biến thể không hợp lệ.",
        error: "Thao tác biến thể không hợp lệ.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await performVariantLifecycleAction(productId, variantId, mode);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      const formatted = formatProductAdminApiError(err);
      return NextResponse.json(
        {
          ...formatted,
          message: formatted.error,
          detail: formatted.detail,
        },
        { status: formatted.status },
      );
    }
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json(
      { ...formatted, message: formatted.error },
      { status: formatted.status },
    );
  }
}
