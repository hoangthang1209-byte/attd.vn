import { PatternStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PatternValidationError } from "@/features/patterns/pattern.service";

/**
 * Bump pattern version and reset approval — existing files remain linked.
 * Published Tech Packs retain their own pattern snapshots.
 */
export async function createPatternNewVersion(patternId: string, createdBy?: string | null) {
  const pattern = await prisma.pattern.findUnique({
    where: { id: patternId },
    include: { _count: { select: { files: true } } },
  });
  if (!pattern) throw new PatternValidationError("Không tìm thấy rập.");
  if (pattern.status === PatternStatus.ARCHIVED) {
    throw new PatternValidationError("Rập đã lưu trữ, không thể tạo phiên bản mới.");
  }

  const versionNote = `[v${pattern.version + 1}] Tạo phiên bản mới${
    createdBy ? ` bởi ${createdBy}` : ""
  } — ${new Date().toISOString()}`;

  return prisma.pattern.update({
    where: { id: patternId },
    data: {
      version: pattern.version + 1,
      status: PatternStatus.DRAFT,
      approvedBy: null,
      approvedAt: null,
      notes: pattern.notes ? `${pattern.notes}\n${versionNote}` : versionNote,
    },
    include: {
      productCategory: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, productCode: true } },
      files: { orderBy: { sortOrder: "asc" } },
      measurements: {
        orderBy: { sortOrder: "asc" },
        include: { values: { orderBy: { size: "asc" } } },
      },
      _count: { select: { techPacks: true } },
    },
  });
}
