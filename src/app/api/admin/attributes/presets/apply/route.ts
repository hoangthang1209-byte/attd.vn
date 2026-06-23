import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import {
  applyAttributePreset,
  previewAttributePresetApply,
  type PresetMergeMode,
} from "@/features/products/product-attribute-preset.service";
import { ProductAttributeValidationError } from "@/features/products/product-attribute.service";

function jsonError(error: unknown) {
  if (error instanceof ProductAttributeValidationError) {
    return NextResponse.json(
      {
        message: error.message,
        fieldErrors: error.fieldErrors,
        existingAttributeId: error.fieldErrors.existingAttributeId,
        conflict: error.status === 409,
      },
      { status: error.status },
    );
  }
  console.error("[attributes/presets/apply]", error);
  return NextResponse.json({ message: "Không thể áp dụng bộ mặc định thuộc tính." }, { status: 500 });
}

type ApplyBody = {
  presetKey?: string;
  selectedValueKeys?: string[];
  mergeMode?: PresetMergeMode;
  valueNameEdits?: Record<string, string>;
  reactivateInactive?: boolean;
  previewOnly?: boolean;
};

export async function POST(req: NextRequest) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  try {
    const body = (await req.json()) as ApplyBody;
    const presetKey = String(body.presetKey ?? "");
    const selectedValueKeys = Array.isArray(body.selectedValueKeys) ? body.selectedValueKeys.map(String) : [];
    const mergeMode = body.mergeMode ?? "create";
    const valueNameEdits = body.valueNameEdits ?? undefined;
    const reactivateInactive = Boolean(body.reactivateInactive);

    if (body.previewOnly) {
      const preview = await previewAttributePresetApply(presetKey, selectedValueKeys, valueNameEdits);
      return NextResponse.json({ preview });
    }

    const result = await applyAttributePreset({
      presetKey,
      selectedValueKeys,
      mergeMode,
      valueNameEdits,
      reactivateInactive,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
