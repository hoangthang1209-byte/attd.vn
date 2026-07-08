import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import {
  getSelectedManufacturingAssetsForQuotePdf,
  getSuggestedManufacturingAssetsForQuote,
  listAvailableManufacturingAssetsForQuotePicker,
  updateQuoteManufacturingEvidence,
  QuoteManufacturingEvidenceValidationError,
  type QuoteManufacturingEvidenceSelection,
} from "@/features/quotes/quote-manufacturing-evidence.service";

type RouteContext = { params: Promise<{ id: string }> };

function parseSelections(value: unknown): QuoteManufacturingEvidenceSelection[] {
  if (!Array.isArray(value)) return [];
  const selections: QuoteManufacturingEvidenceSelection[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const assetId = typeof record.assetId === "string" ? record.assetId : "";
    if (!assetId) return;
    const sortOrder =
      typeof record.sortOrder === "number" || typeof record.sortOrder === "string"
        ? Number(record.sortOrder)
        : index * 10;
    selections.push({ assetId, sortOrder });
  });
  return selections;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await context.params;
  try {
    const [selected, suggestions, available] = await Promise.all([
      getSelectedManufacturingAssetsForQuotePdf(id),
      getSuggestedManufacturingAssetsForQuote(id),
      listAvailableManufacturingAssetsForQuotePicker(),
    ]);

    return NextResponse.json({ selected, suggestions, available });
  } catch (error) {
    console.error("[GET /api/quotes/[id]/manufacturing-evidence]", error);
    return NextResponse.json(
      { message: "Không thể tải minh chứng sản xuất." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const selected = await updateQuoteManufacturingEvidence(
      id,
      parseSelections(body.selected),
    );
    return NextResponse.json({ selected });
  } catch (error) {
    if (error instanceof QuoteManufacturingEvidenceValidationError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error("[PUT /api/quotes/[id]/manufacturing-evidence]", error);
    return NextResponse.json(
      { message: "Không thể lưu minh chứng sản xuất." },
      { status: 500 },
    );
  }
}
