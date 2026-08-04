import { NextResponse } from "next/server";
import {
  ContentGenerationError,
  GENERATION_ERROR_MESSAGES_VI,
} from "@/features/content-generation/contracts/generation.types";

/**
 * Maps ContentGenerationError to a structured Vietnamese-message JSON
 * response. Never leaks provider response bodies, stack traces, or secrets.
 */
export function mapContentGenerationError(err: unknown): NextResponse {
  if (err instanceof ContentGenerationError) {
    return NextResponse.json(
      { message: GENERATION_ERROR_MESSAGES_VI[err.code] ?? err.message, code: err.code },
      { status: err.status },
    );
  }
  console.error("[content-generation]", err instanceof Error ? err.message : err);
  return NextResponse.json({ message: "Đã xảy ra lỗi khi xử lý đề xuất AI." }, { status: 500 });
}
