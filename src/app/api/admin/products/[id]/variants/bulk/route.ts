import { NextRequest, NextResponse } from "next/server";
import type { StockStatus, VariantStatus } from "@prisma/client";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import {
  performBulkVariantOperation,
  preflightBulkDelete,
  type BulkOperationType,
  type BulkVariantInput,
} from "@/features/products/product-variant-bulk.service";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";

const VALID_OPERATIONS = new Set<BulkOperationType>([
  "archive",
  "restore",
  "delete",
  "status",
  "stock",
  "moq",
  "leadTime",
  "sku",
  "image",
]);

const VALID_STATUSES = new Set<VariantStatus>(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const VALID_STOCK_STATUSES = new Set<StockStatus>([
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PREORDER",
]);

function parseBody(raw: Record<string, unknown>): BulkVariantInput {
  const operation = raw.operation;
  if (typeof operation !== "string" || !VALID_OPERATIONS.has(operation as BulkOperationType)) {
    throw new ProductAdminValidationError(
      "Thao tác hàng loạt không hợp lệ.",
      { variants: "Thao tác không được hỗ trợ." },
    );
  }

  const variantIds = Array.isArray(raw.variantIds)
    ? raw.variantIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  const input: BulkVariantInput = {
    operation: operation as BulkOperationType,
    variantIds,
    previewOnly: Boolean(raw.previewOnly),
    confirmOverwriteSku: Boolean(raw.confirmOverwriteSku),
  };

  if (raw.status !== undefined && raw.status !== null && raw.status !== "") {
    const status = String(raw.status).toUpperCase() as VariantStatus;
    if (!VALID_STATUSES.has(status)) {
      throw new ProductAdminValidationError(
        "Trạng thái biến thể không hợp lệ.",
        { variants: "Trạng thái không hợp lệ." },
      );
    }
    input.status = status;
  }

  if (raw.stock && typeof raw.stock === "object") {
    const stock = raw.stock as Record<string, unknown>;
    const mode = stock.mode;
    if (mode !== "set" && mode !== "increase" && mode !== "decrease") {
      throw new ProductAdminValidationError(
        "Kiểu cập nhật tồn kho không hợp lệ.",
        { variants: "Tồn kho không hợp lệ." },
      );
    }
    const quantity = Number(stock.quantity);
    let stockStatus: StockStatus | undefined;
    if (stock.stockStatus) {
      const parsed = String(stock.stockStatus).toUpperCase() as StockStatus;
      if (!VALID_STOCK_STATUSES.has(parsed)) {
        throw new ProductAdminValidationError(
          "Trạng thái tồn kho không hợp lệ.",
          { variants: "Trạng thái tồn kho không hợp lệ." },
        );
      }
      stockStatus = parsed;
    }
    input.stock = { mode, quantity, stockStatus };
  }

  if (raw.moq && typeof raw.moq === "object") {
    const moq = raw.moq as Record<string, unknown>;
    if (moq.mode !== "set" && moq.mode !== "clear") {
      throw new ProductAdminValidationError("MOQ không hợp lệ.", { variants: "MOQ không hợp lệ." });
    }
    input.moq = {
      mode: moq.mode,
      value: moq.value == null || moq.value === "" ? null : Number(moq.value),
    };
  }

  if (raw.leadTime && typeof raw.leadTime === "object") {
    const leadTime = raw.leadTime as Record<string, unknown>;
    if (leadTime.mode !== "set" && leadTime.mode !== "clear") {
      throw new ProductAdminValidationError(
        "Thời gian sản xuất không hợp lệ.",
        { variants: "Lead time không hợp lệ." },
      );
    }
    input.leadTime = {
      mode: leadTime.mode,
      value: leadTime.value == null ? null : String(leadTime.value),
    };
  }

  if (raw.sku && typeof raw.sku === "object") {
    const sku = raw.sku as Record<string, unknown>;
    if (sku.mode !== "affix" && sku.mode !== "sequential") {
      throw new ProductAdminValidationError("SKU không hợp lệ.", { variants: "SKU không hợp lệ." });
    }
    input.sku = {
      mode: sku.mode,
      prefix: sku.prefix ? String(sku.prefix) : undefined,
      suffix: sku.suffix ? String(sku.suffix) : undefined,
      startNumber: sku.startNumber != null ? Number(sku.startNumber) : undefined,
      padding: sku.padding != null ? Number(sku.padding) : undefined,
      overwrite: Boolean(sku.overwrite),
    };
  }

  if (raw.image && typeof raw.image === "object") {
    const image = raw.image as Record<string, unknown>;
    if (image.mode !== "set" && image.mode !== "clear") {
      throw new ProductAdminValidationError("Ảnh không hợp lệ.", { variants: "Ảnh không hợp lệ." });
    }
    input.image = {
      mode: image.mode,
      imageUrl: image.imageUrl == null ? null : String(image.imageUrl),
    };
  }

  return input;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdminApiFromCookies();
  if (authError) {
    return NextResponse.json(
      { message: "Bạn không có quyền thực hiện thao tác này." },
      { status: 401 },
    );
  }

  const { id: productId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const input = parseBody(body);
    const result = await performBulkVariantOperation(productId, input);
    return NextResponse.json(result);
  } catch (err) {
    if (
      body?.operation === "delete" &&
      Array.isArray(body.variantIds) &&
      body.variantIds.length
    ) {
      try {
        const preflight = await preflightBulkDelete(
          productId,
          body.variantIds.map((id) => String(id)),
        );
        if (!preflight.canDeleteAll) {
          return NextResponse.json(
            {
              message:
                "Không thể xóa vĩnh viễn biến thể vì đã được sử dụng trong dữ liệu nghiệp vụ.",
              error:
                "Không thể xóa vĩnh viễn biến thể vì đã được sử dụng trong dữ liệu nghiệp vụ.",
              blocked: preflight.blocked,
              blockedCount: preflight.blocked.length,
              detail: `Có ${preflight.blocked.length} biến thể bị chặn xóa.`,
            },
            { status: 409 },
          );
        }
      } catch {
        /* fall through */
      }
    }
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
}
