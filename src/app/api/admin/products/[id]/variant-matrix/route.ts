import { NextRequest, NextResponse } from "next/server";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import {
  generateVariantMatrix,
  previewVariantMatrixGeneration,
} from "@/features/products/product-variant-matrix.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const preview = await previewVariantMatrixGeneration(id);
    return NextResponse.json(preview);
  } catch (err) {
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: { confirmLarge?: boolean } = {};
  try {
    body = (await req.json()) as { confirmLarge?: boolean };
  } catch {
    body = {};
  }

  try {
    const result = await generateVariantMatrix(id, { confirmLarge: Boolean(body.confirmLarge) });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      const formatted = formatProductAdminApiError(err);
      return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
    }
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json({ ...formatted, message: formatted.error }, { status: formatted.status });
  }
}
