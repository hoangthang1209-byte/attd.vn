/**
 * Safe product image repair — preview-first.
 *
 * Usage:
 *   npx tsx scripts/products/repair-product-images.ts --all
 *   npx tsx scripts/products/repair-product-images.ts --all --check-remote
 *   npx tsx scripts/products/repair-product-images.ts --product=<slug> --confirm
 *
 * Rules:
 * - Default is preview only (no DB mutation).
 * - `--confirm` is required to apply repairs.
 * - Only exact MediaAsset URL / storage-key matches are safe.
 * - Never guess replacements for unknown dead Vercel Blob URLs.
 * - Never write placeholder URLs into the database.
 * - If preview reports 0 safe repairs, staff must re-pick images in admin
 *   (`/admin/products` → filter `Ảnh lỗi` → `Sửa ảnh`).
 */
import { PrismaClient } from "@prisma/client";
import { getPublicMediaUrl } from "../../src/features/media/get-public-media-url";
import { scanProductImageHealth } from "../../src/features/products/product-image-health";

const prisma = new PrismaClient();

type RepairCandidate = {
  productId: string;
  slug: string;
  fieldPath: string;
  oldUrl: string;
  newUrl: string;
  reason: string;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readArg(prefix: string): string | null {
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  if (!hit) return null;
  return hit.slice(prefix.length);
}

function extractStorageKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("res.cloudinary.com")) {
      const marker = "/image/upload/";
      const index = parsed.pathname.indexOf(marker);
      if (index < 0) return null;
      const tail = parsed.pathname.slice(index + marker.length);
      const noTransforms = tail
        .split("/")
        .filter(Boolean)
        .filter((segment, idx) => idx > 0 || /^v\d+$/.test(segment))
        .join("/");
      return noTransforms.replace(/^v\d+\//, "");
    }
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

async function resolveSafeReplacement(url: string): Promise<{ url: string; reason: string } | null> {
  const exact = await prisma.mediaAsset.findFirst({
    where: { OR: [{ url }, { thumbnailUrl: url }] },
    select: { url: true },
  });
  if (exact?.url) {
    const canonical = getPublicMediaUrl(exact.url);
    if (canonical) return { url: canonical, reason: "exact_url_match" };
  }

  const storageKey = extractStorageKeyFromUrl(url);
  if (!storageKey) return null;
  const byStorage = await prisma.mediaAsset.findFirst({
    where: { OR: [{ storageKey }, { publicId: storageKey }] },
    select: { url: true },
  });
  if (byStorage?.url) {
    const canonical = getPublicMediaUrl(byStorage.url);
    if (canonical) return { url: canonical, reason: "storage_key_match" };
  }

  return null;
}

async function applyRepair(candidate: RepairCandidate): Promise<void> {
  if (candidate.fieldPath === "featuredImage") {
    await prisma.product.update({
      where: { id: candidate.productId },
      data: { featuredImage: candidate.newUrl },
    });
    return;
  }

  const galleryMatch = candidate.fieldPath.match(/^gallery\[(\d+)\]$/);
  if (galleryMatch) {
    const index = Number(galleryMatch[1]);
    const product = await prisma.product.findUnique({
      where: { id: candidate.productId },
      select: { gallery: true },
    });
    if (!product) return;
    const next = [...product.gallery];
    if (index >= 0 && index < next.length) {
      next[index] = candidate.newUrl;
      await prisma.product.update({
        where: { id: candidate.productId },
        data: { gallery: next },
      });
    }
    return;
  }

  const variantMatch = candidate.fieldPath.match(/^variants\[(\d+)\]\.imageUrl$/);
  if (variantMatch) {
    const index = Number(variantMatch[1]);
    const variants = await prisma.productVariant.findMany({
      where: { productId: candidate.productId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const row = variants[index];
    if (row) {
      await prisma.productVariant.update({
        where: { id: row.id },
        data: { imageUrl: candidate.newUrl },
      });
    }
    return;
  }

  const optionMatch = candidate.fieldPath.match(/^optionValues\[(\d+)\]\.imageUrl$/);
  if (optionMatch) {
    const index = Number(optionMatch[1]);
    const values = await prisma.productOptionValue.findMany({
      where: { option: { productId: candidate.productId } },
      select: { id: true },
      orderBy: [{ option: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    const row = values[index];
    if (row) {
      await prisma.productOptionValue.update({
        where: { id: row.id },
        data: { imageUrl: candidate.newUrl },
      });
    }
  }
}

async function main() {
  const confirm = hasFlag("--confirm");
  const checkRemote = hasFlag("--check-remote");
  const all = hasFlag("--all");
  const oneSlug = readArg("--product=");

  const products = await prisma.product.findMany({
    where: oneSlug ? { slug: oneSlug } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      featuredImage: true,
      gallery: true,
      images: { select: { imageUrl: true } },
      variants: { select: { imageUrl: true } },
      options: { select: { values: { select: { imageUrl: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const candidates: RepairCandidate[] = [];
  const manual: Array<{ slug: string; fieldPath: string; originalUrl: string | null; reason: string }> = [];

  for (const product of products) {
    const findings = await scanProductImageHealth(
      {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        featuredImage: product.featuredImage,
        gallery: product.gallery,
        images: product.images,
        variants: product.variants,
        optionValues: product.options.flatMap((option) => option.values),
      },
      { checkRemote, timeoutMs: 4000 },
    );

    for (const finding of findings) {
      if (finding.status === "OK" || finding.status === "MISSING" || !finding.originalUrl) continue;
      const replacement = await resolveSafeReplacement(finding.originalUrl);
      if (!replacement) {
        manual.push({
          slug: product.slug,
          fieldPath: finding.fieldPath,
          originalUrl: finding.originalUrl,
          reason: finding.reason,
        });
        continue;
      }
      candidates.push({
        productId: product.id,
        slug: product.slug,
        fieldPath: finding.fieldPath,
        oldUrl: finding.originalUrl,
        newUrl: replacement.url,
        reason: replacement.reason,
      });
    }
  }

  const uniqueCandidates = [...new Map(candidates.map((row) => [`${row.productId}:${row.fieldPath}`, row])).values()];
  const preview = {
    mode: confirm ? "confirm" : "preview",
    scope: oneSlug ? `product:${oneSlug}` : all ? "all" : "safe-matches-only",
    checkRemote,
    productsScanned: products.length,
    repairsPlanned: uniqueCandidates.length,
    manualActionRequired: manual.length,
    repairs: uniqueCandidates,
    skipped: manual,
  };

  if (!confirm) {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  for (const candidate of uniqueCandidates) {
    await applyRepair(candidate);
  }

  const applied = {
    ...preview,
    repairsApplied: uniqueCandidates.length,
  };
  console.log(JSON.stringify(applied, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
