import { NextRequest, NextResponse } from "next/server";
import {
  generateCategoryCodeFromName,
  ensureUniqueCategoryCode,
  isCategoryCodeTaken,
  normalizeCode,
  CATEGORY_CODE_DUPLICATE_ERROR,
} from "@/features/products/product-sku-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;
  const manualCode = searchParams.get("code") ?? "";

  if (!name.trim() && !manualCode.trim()) {
    return NextResponse.json({ code: "", taken: false });
  }

  try {
    const base = manualCode.trim()
      ? normalizeCode(manualCode)
      : generateCategoryCodeFromName(name);

    if (!base) {
      return NextResponse.json({ code: "", taken: false });
    }

    const code = manualCode.trim()
      ? base
      : await ensureUniqueCategoryCode(base, excludeId);

    const taken = await isCategoryCodeTaken(code, excludeId);

    return NextResponse.json({
      code,
      baseCode: generateCategoryCodeFromName(name),
      taken,
      duplicateError: taken ? CATEGORY_CODE_DUPLICATE_ERROR : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tạo mã danh mục.";
    return NextResponse.json({ message, code: null }, { status: 400 });
  }
}
