import { NextRequest, NextResponse } from "next/server";
import type { ProductStatus } from "@prisma/client";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
import {
  performBulkProductOperation,
  type ProductBulkCapabilityField,
  type ProductBulkInput,
  type ProductBulkOperation,
} from "@/features/products/product-bulk.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const VALID_OPERATIONS = new Set<ProductBulkOperation>([
  "archive",
  "status",
  "publish",
  "unpublish",
  "moq",
  "leadTime",
  "capabilities",
]);

const VALID_STATUSES = new Set<ProductStatus>(["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]);
const VALID_CAPABILITY_FIELDS = new Set<ProductBulkCapabilityField>([
  "supportsPrinting",
  "supportsEmbroidery",
  "supportsOem",
]);

function parseBody(raw: Record<string, unknown>): ProductBulkInput {
  const operation = raw.operation;
  if (typeof operation !== "string" || !VALID_OPERATIONS.has(operation as ProductBulkOperation)) {
    throw new ProductAdminValidationError("Thao tác hàng loạt không hợp lệ.", {
      products: "Thao tác không được hỗ trợ.",
    });
  }

  const productIds = Array.isArray(raw.productIds)
    ? raw.productIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  const input: ProductBulkInput = {
    operation: operation as ProductBulkOperation,
    productIds,
  };

  if (raw.status !== undefined && raw.status !== null && raw.status !== "") {
    const status = String(raw.status).toUpperCase() as ProductStatus;
    if (!VALID_STATUSES.has(status)) {
      throw new ProductAdminValidationError("Trạng thái sản phẩm không hợp lệ.", {
        status: "Trạng thái không hợp lệ.",
      });
    }
    input.status = status;
  }

  if (raw.moq && typeof raw.moq === "object") {
    const moq = raw.moq as Record<string, unknown>;
    if (moq.mode !== "set") {
      throw new ProductAdminValidationError("MOQ không hợp lệ.", { moq: "MOQ không hợp lệ." });
    }
    input.moq = {
      mode: "set",
      value: moq.value == null || moq.value === "" ? NaN : Number(moq.value),
    };
  }

  if (raw.leadTime && typeof raw.leadTime === "object") {
    const leadTime = raw.leadTime as Record<string, unknown>;
    if (leadTime.mode !== "set") {
      throw new ProductAdminValidationError("Lead-time không hợp lệ.", {
        leadTime: "Lead-time không hợp lệ.",
      });
    }
    input.leadTime = {
      mode: "set",
      value: leadTime.value == null ? "" : String(leadTime.value),
    };
  }

  if (raw.capabilities && typeof raw.capabilities === "object") {
    const capabilities = raw.capabilities as Record<string, unknown>;
    const field = String(capabilities.field ?? "") as ProductBulkCapabilityField;
    if (!VALID_CAPABILITY_FIELDS.has(field)) {
      throw new ProductAdminValidationError("Tính năng không hợp lệ.", {
        capabilities: "Tính năng không hợp lệ.",
      });
    }
    input.capabilities = {
      field,
      value: Boolean(capabilities.value),
    };
  }

  return input;
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "update",
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
    const input = parseBody(body);
    const result = await performBulkProductOperation(input);
    return NextResponse.json(result);
  } catch (err) {
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
