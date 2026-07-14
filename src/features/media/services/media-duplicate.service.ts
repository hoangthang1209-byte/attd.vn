import { createHash } from "node:crypto";
import type { MediaDuplicateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DuplicateAssetSummary = {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  contentHash: string | null;
  duplicateStatus: MediaDuplicateStatus;
  library: { id: string; code: string; name: string } | null;
  role: { id: string; code: string; name: string } | null;
  collections: Array<{ id: string; code: string | null; name: string }>;
};

/**
 * Exact duplicate detection via SHA-256 of file bytes.
 * Perceptual hashing is deferred: no safe lightweight dependency is available
 * for Vercel without risking native build failures.
 */
export function calculateMediaContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function findExactDuplicateByHash(
  hash: string,
): Promise<DuplicateAssetSummary | null> {
  if (!hash) return null;
  const asset = await prisma.mediaAsset.findFirst({
    where: { contentHash: hash },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      library: { select: { id: true, code: true, name: true } },
      role: { select: { id: true, code: true, name: true } },
      collections: {
        include: {
          mediaCollection: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
  if (!asset) return null;
  return {
    id: asset.id,
    filename: asset.filename,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    contentHash: asset.contentHash,
    duplicateStatus: asset.duplicateStatus,
    library: asset.library,
    role: asset.role,
    collections: asset.collections.map((row) => row.mediaCollection),
  };
}

export async function findPossibleDuplicates(_input: {
  perceptualHash?: string | null;
  excludeId?: string;
  limit?: number;
}): Promise<DuplicateAssetSummary[]> {
  // Perceptual hashing deferred — return empty candidates for this sprint.
  return [];
}

export async function markDuplicateStatus(input: {
  assetId: string;
  duplicateStatus: MediaDuplicateStatus;
  duplicateOfId?: string | null;
}): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: input.assetId },
    data: {
      duplicateStatus: input.duplicateStatus,
      duplicateOfId: input.duplicateOfId ?? null,
    },
  });
}

export async function clearDuplicateLinksReferencing(assetId: string): Promise<number> {
  const result = await prisma.mediaAsset.updateMany({
    where: { duplicateOfId: assetId },
    data: {
      duplicateOfId: null,
      duplicateStatus: "UNIQUE",
    },
  });
  return result.count;
}

export async function resolveDuplicateDecision(input: {
  decision: "reuse" | "upload_anyway" | "cancel";
  hash: string;
}): Promise<{ ok: true; existing?: DuplicateAssetSummary } | { ok: false; message: string }> {
  if (input.decision === "cancel") {
    return { ok: false, message: "Đã bỏ qua file trùng." };
  }
  const existing = await findExactDuplicateByHash(input.hash);
  if (!existing) return { ok: true };
  if (input.decision === "reuse") return { ok: true, existing };
  return { ok: true, existing };
}
