import { NextResponse } from "next/server";
import {
  formatProductAdminApiError,
  ProductAdminValidationError,
  ProductRelationOwnershipError,
} from "@/features/products/product-admin-input";
import {
  SeoPublishQualityGateError,
  formatSeoPublishQualityGateApiError,
} from "@/lib/seo/publish-quality-gate";

export function productMutationErrorResponse(err: unknown, fallbackMessage: string) {
  if (err instanceof SeoPublishQualityGateError) {
    const formatted = formatSeoPublishQualityGateApiError(err);
    return NextResponse.json(formatted, { status: formatted.status });
  }
  if (err instanceof ProductRelationOwnershipError) {
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json(
      { ...formatted, message: formatted.error },
      { status: formatted.status },
    );
  }
  if (err instanceof ProductAdminValidationError) {
    const formatted = formatProductAdminApiError(err);
    return NextResponse.json(
      { ...formatted, message: formatted.error },
      { status: formatted.status },
    );
  }
  console.error("[product-mutation-api]", err);
  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}

export function categoryMutationErrorResponse(err: unknown, fallbackMessage: string) {
  return productMutationErrorResponse(err, fallbackMessage);
}
