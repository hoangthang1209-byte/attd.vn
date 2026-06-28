import { NextRequest, NextResponse } from "next/server";
import { replaceTechPackBomItems, TechPackValidationError } from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import type { TechPackBomCategory } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const { listTechPackBomItems } = await import("@/features/tech-pack/tech-pack-bom.service");
  const items = await listTechPackBomItems(id);
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as { items?: Array<Record<string, unknown>> };
    const items = (body.items ?? []).map((row, index) => ({
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
      category: (typeof row.category === "string" ? row.category : "OTHER") as TechPackBomCategory,
      itemName: String(row.itemName ?? ""),
      specification: typeof row.specification === "string" ? row.specification : null,
      color: typeof row.color === "string" ? row.color : null,
      supplier: typeof row.supplier === "string" ? row.supplier : null,
      unit: typeof row.unit === "string" ? row.unit : null,
      consumption: typeof row.consumption === "string" ? row.consumption : null,
      wastePercent: typeof row.wastePercent === "string" ? row.wastePercent : null,
      notes: typeof row.notes === "string" ? row.notes : null,
      materialId: typeof row.materialId === "string" ? row.materialId : null,
      trimId: typeof row.trimId === "string" ? row.trimId : null,
      supplierId: typeof row.supplierId === "string" ? row.supplierId : null,
    }));
    const saved = await replaceTechPackBomItems(id, items);
    return NextResponse.json({ items: saved });
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PUT /api/tech-packs/[id]/bom]", err);
    return NextResponse.json({ message: "Không thể lưu BOM." }, { status: 500 });
  }
}
