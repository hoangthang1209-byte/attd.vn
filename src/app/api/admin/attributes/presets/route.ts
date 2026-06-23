import { NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { listAttributePresetSummaries } from "@/features/products/product-attribute-preset.service";

export async function GET() {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  return NextResponse.json({ presets: listAttributePresetSummaries() });
}
