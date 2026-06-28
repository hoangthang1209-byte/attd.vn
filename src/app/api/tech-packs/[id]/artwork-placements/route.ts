import { NextRequest, NextResponse } from "next/server";
import {
  replaceTechPackArtworkPlacements,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import type { ArtworkPlacementType } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const { listTechPackArtworkPlacements } = await import(
    "@/features/tech-pack/tech-pack-artwork.service"
  );
  const items = await listTechPackArtworkPlacements(id);
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
      artworkAssetId: typeof row.artworkAssetId === "string" ? row.artworkAssetId : null,
      placementType: (typeof row.placementType === "string"
        ? row.placementType
        : "OTHER") as ArtworkPlacementType,
      title: typeof row.title === "string" ? row.title : null,
      bodyPart: typeof row.bodyPart === "string" ? row.bodyPart : null,
      width: typeof row.width === "string" ? row.width : null,
      height: typeof row.height === "string" ? row.height : null,
      measurementUnit: typeof row.measurementUnit === "string" ? row.measurementUnit : null,
      printMethod: typeof row.printMethod === "string" ? row.printMethod : null,
      printMethodId: typeof row.printMethodId === "string" ? row.printMethodId : null,
      embroideryMethod: typeof row.embroideryMethod === "string" ? row.embroideryMethod : null,
      inkColors: typeof row.inkColors === "string" ? row.inkColors : null,
      threadColors: typeof row.threadColors === "string" ? row.threadColors : null,
      notes: typeof row.notes === "string" ? row.notes : null,
    }));
    const saved = await replaceTechPackArtworkPlacements(id, items);
    return NextResponse.json({ items: saved });
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PUT /api/tech-packs/[id]/artwork-placements]", err);
    return NextResponse.json({ message: "Không thể lưu vị trí artwork." }, { status: 500 });
  }
}
