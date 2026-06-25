import { NextRequest, NextResponse } from "next/server";
import { isCategoryCodeTaken } from "@/features/products/product-sku-utils";
import {
  CATEGORY_CODE_DUPLICATE_ERROR,
  CATEGORY_CODE_FORMAT_ERROR,
  isValidFourLetterCategoryCode,
  normalizeFourLetterCategoryCode,
} from "@/features/categories/category-admin-constants";
import {
  CategoryCodeGenerationError,
  generateCategoryCodeCandidates,
  generateCategoryCodeFromEnglishName,
  generateUniqueCategoryCodeFromEnglishName,
} from "@/features/categories/category-code-generator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nameEn = (searchParams.get("nameEn") ?? searchParams.get("name") ?? "").trim();
  const excludeId = searchParams.get("excludeId") ?? undefined;
  const manualCode = searchParams.get("code") ?? "";

  if (!nameEn && !manualCode.trim()) {
    return NextResponse.json({ code: "", taken: false, suggested: false });
  }

  try {
    if (manualCode.trim()) {
      const code = normalizeFourLetterCategoryCode(manualCode);
      if (!isValidFourLetterCategoryCode(code)) {
        return NextResponse.json(
          {
            code: code || null,
            taken: false,
            suggested: false,
            formatError: CATEGORY_CODE_FORMAT_ERROR,
          },
          { status: 400 },
        );
      }

      const taken = await isCategoryCodeTaken(code, excludeId);
      return NextResponse.json({
        code,
        taken,
        suggested: false,
        duplicateError: taken ? CATEGORY_CODE_DUPLICATE_ERROR : null,
        formatError: null,
      });
    }

    const baseCode = generateCategoryCodeFromEnglishName(nameEn);
    const code = await generateUniqueCategoryCodeFromEnglishName(nameEn, async (candidate) =>
      isCategoryCodeTaken(candidate, excludeId),
    );
    const taken = await isCategoryCodeTaken(code, excludeId);
    const candidates = generateCategoryCodeCandidates(nameEn);
    const previewCandidate = candidates.find(
      (candidate) => candidate === code,
    );

    return NextResponse.json({
      code,
      baseCode,
      taken,
      suggested: true,
      duplicateError: taken ? CATEGORY_CODE_DUPLICATE_ERROR : null,
      formatError: null,
      available: !taken,
      previewCandidate,
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
