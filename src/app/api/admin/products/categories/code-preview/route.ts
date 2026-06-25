import { NextRequest, NextResponse } from "next/server";
import { isCategoryCodeTaken } from "@/features/products/product-sku-utils";
import { CATEGORY_CODE_DUPLICATE_ERROR } from "@/features/categories/category-admin-constants";
import {
  CategoryCodeGenerationError,
  generateCategoryCodeFromEnglishName,
  generateUniqueCategoryCodeFromEnglishName,
} from "@/features/categories/category-code-generator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nameEn = searchParams.get("nameEn")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (!nameEn) {
    return NextResponse.json({ code: "", taken: false, suggested: false });
  }

  try {
    const baseCode = generateCategoryCodeFromEnglishName(nameEn);
    const code = await generateUniqueCategoryCodeFromEnglishName(nameEn, async (candidate) =>
      isCategoryCodeTaken(candidate, excludeId),
    );
    const taken = await isCategoryCodeTaken(code, excludeId);

    return NextResponse.json({
      code,
      baseCode,
      taken,
      suggested: true,
      duplicateError: taken ? CATEGORY_CODE_DUPLICATE_ERROR : null,
      formatError: null,
      available: !taken,
    });
  } catch (err) {
    if (err instanceof CategoryCodeGenerationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: null,
          taken: false,
          suggested: false,
          generationError: err.message,
        },
        { status: 400 },
      );
    }

    const message = err instanceof Error ? err.message : "Không thể tạo mã danh mục.";
    return NextResponse.json({ message, code: null }, { status: 400 });
  }
}
