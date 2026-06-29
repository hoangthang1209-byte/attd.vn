import { NextResponse } from "next/server";
import { DealerValidationError } from "@/features/dealer/dealer-validation";

export function dealerApiError(err: unknown, fallback: string): NextResponse {
  if (err instanceof DealerValidationError) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
  console.error(fallback, err);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
