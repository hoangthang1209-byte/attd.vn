import { NextResponse } from "next/server";
import { CostLibraryValidationError } from "@/features/pricing/services/cost-library.service";
import { CostingSourcePriceValidationError } from "@/features/pricing/costing-source-price";

export function costingSourcePriceErrorResponse(err: unknown, fallback: string) {
  if (err instanceof CostingSourcePriceValidationError || err instanceof CostLibraryValidationError) {
    const status = err.code === "NOT_FOUND" || err.code === "SOURCE_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ message: err.message, code: err.code }, { status });
  }
  console.error("[costing-source-price]", err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}
