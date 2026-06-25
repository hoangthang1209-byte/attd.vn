import type { CategoryCodePreviewState } from "@/components/admin/products/CategoryGeneratedCodeField";
import { CATEGORY_CODE_GENERATION_FAILED } from "@/features/categories/category-admin-constants";

type PreviewResponse = {
  code?: string | null;
  taken?: boolean;
  generationError?: string;
  formatError?: string;
  message?: string;
};

export async function fetchCategoryCodePreview(params: {
  nameEn: string;
  excludeId?: string;
}): Promise<CategoryCodePreviewState> {
  if (!params.nameEn.trim()) {
    return { code: "", status: "idle", message: "", isPreview: false };
  }

  const search = new URLSearchParams({ nameEn: params.nameEn.trim() });
  if (params.excludeId) search.set("excludeId", params.excludeId);

  const response = await fetch(`/api/admin/products/categories/code-preview?${search}`);
  const data = (await response.json()) as PreviewResponse;

  if (!response.ok || data.generationError || data.formatError) {
    return {
      code: "",
      status: "error",
      message: data.generationError ?? data.formatError ?? data.message ?? CATEGORY_CODE_GENERATION_FAILED,
      isPreview: true,
    };
  }

  if (!data.code) {
    return {
      code: "",
      status: "error",
      message: CATEGORY_CODE_GENERATION_FAILED,
      isPreview: true,
    };
  }

  return {
    code: data.code,
    status: "available",
    message: data.taken ? "Mã đã tồn tại" : "Mã khả dụng",
    isPreview: true,
  };
}
