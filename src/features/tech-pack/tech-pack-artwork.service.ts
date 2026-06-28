import { ArtworkPlacementType, TechPackStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";

export type ArtworkPlacementInput = {
  id?: string;
  artworkAssetId?: string | null;
  placementType?: ArtworkPlacementType;
  title?: string | null;
  bodyPart?: string | null;
  width?: string | null;
  height?: string | null;
  measurementUnit?: string | null;
  printMethod?: string | null;
  embroideryMethod?: string | null;
  inkColors?: string | null;
  threadColors?: string | null;
  notes?: string | null;
  sortOrder?: number;
  printMethodId?: string | null;
};

async function assertDraftPack(techPackId: string) {
  const pack = await prisma.techPack.findUnique({ where: { id: techPackId } });
  if (!pack) throw new TechPackValidationError("Không tìm thấy Tech Pack.");
  if (pack.status !== TechPackStatus.DRAFT) {
    throw new TechPackValidationError("Chỉ Tech Pack bản nháp mới có thể chỉnh sửa.");
  }
}

export async function replaceTechPackArtworkPlacements(
  techPackId: string,
  items: ArtworkPlacementInput[],
) {
  await assertDraftPack(techPackId);

  const { resolvePrintMethodSnapshot } = await import("@/features/production-master/bom-snapshot");

  return prisma.$transaction(async (tx) => {
    await tx.techPackArtworkPlacement.deleteMany({ where: { techPackId } });
    for (const [index, row] of items.entries()) {
      const printMethodText = await resolvePrintMethodSnapshot(row.printMethodId, row.printMethod?.trim() || null);
      await tx.techPackArtworkPlacement.create({
        data: {
          techPackId,
          sortOrder: row.sortOrder ?? index,
          artworkAssetId: row.artworkAssetId || null,
          placementType: row.placementType ?? ArtworkPlacementType.OTHER,
          title: row.title?.trim() || null,
          bodyPart: row.bodyPart?.trim() || null,
          width: row.width?.trim() || null,
          height: row.height?.trim() || null,
          measurementUnit: row.measurementUnit?.trim() || null,
          printMethod: printMethodText,
          printMethodId: row.printMethodId || null,
          embroideryMethod: row.embroideryMethod?.trim() || null,
          inkColors: row.inkColors?.trim() || null,
          threadColors: row.threadColors?.trim() || null,
          notes: row.notes?.trim() || null,
        },
      });
    }
    return tx.techPackArtworkPlacement.findMany({
      where: { techPackId },
      include: { artworkAsset: true, printMethodRef: { select: { id: true, code: true, name: true } } },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function listTechPackArtworkPlacements(techPackId: string) {
  return prisma.techPackArtworkPlacement.findMany({
    where: { techPackId },
    include: { artworkAsset: true, printMethodRef: { select: { id: true, code: true, name: true } } },
    orderBy: { sortOrder: "asc" },
  });
}
