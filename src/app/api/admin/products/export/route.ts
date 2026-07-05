import { NextRequest, NextResponse } from "next/server";
import {
  EXPORT_FORMATS,
  EXPORT_SCOPE_TYPES,
  type ExportEntityType,
  type ExportScopeType,
} from "@/features/products/product-export.constants";
import type { ProductExportOptions } from "@/features/products/product-export.types";
import { createProductExportResponse } from "@/features/products/product-export.service";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import type { ProductListParams } from "@/features/products/product-admin.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function parseExportOptions(body: Record<string, unknown>): ProductExportOptions {
  const scope = String(body.scope ?? "");
  if (!EXPORT_SCOPE_TYPES.includes(scope as ExportScopeType)) {
    throw new ProductAdminValidationError("Phạm vi xuất không hợp lệ.", { scope: "Phạm vi không hợp lệ." });
  }

  const format = String(body.format ?? "xlsx");
  if (!EXPORT_FORMATS.includes(format as ProductExportOptions["format"])) {
    throw new ProductAdminValidationError("Định dạng xuất không hợp lệ.", { format: "Định dạng không hợp lệ." });
  }

  const productIds = Array.isArray(body.productIds)
    ? body.productIds.map((id) => String(id).trim()).filter(Boolean)
    : undefined;

  const filters = body.filters && typeof body.filters === "object"
    ? (body.filters as ProductListParams)
    : undefined;

  let csvEntity: ExportEntityType | undefined;
  if (body.csvEntity) {
    const entity = String(body.csvEntity) as ExportEntityType;
    if (["product", "variant", "specification", "customization"].includes(entity)) {
      csvEntity = entity;
    }
  }

  return {
    scope: scope as ExportScopeType,
    format: format as ProductExportOptions["format"],
    productIds,
    filters,
    includeWholesalePrice: Boolean(body.includeWholesalePrice),
    includeDealerPrice: Boolean(body.includeDealerPrice),
    includeInactiveVariants: body.includeInactiveVariants !== false,
    includeSpecifications: body.includeSpecifications !== false,
    includeCustomizations: body.includeCustomizations !== false,
    csvEntity,
    cloneTemplate: Boolean(body.cloneTemplate),
  };
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const options = parseExportOptions(body);
    return await createProductExportResponse(options);
  } catch (err) {
    if (err instanceof ProductAdminValidationError) {
      const formatted = formatProductAdminApiError(err);
      return NextResponse.json(
        { message: formatted.error, error: formatted.error, detail: formatted.detail },
        { status: formatted.status },
      );
    }
    console.error("[POST /api/admin/products/export]", err);
    return NextResponse.json(
      { message: "Không thể tạo tệp xuất. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
