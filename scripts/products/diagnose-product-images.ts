/**
 * Read-only diagnostic for product image URL health.
 *
 * Usage:
 *   npx tsx scripts/products/diagnose-product-images.ts
 *
 * No mutations. Optionally probes HTTPS URLs with HEAD/GET (network).
 */
import { PrismaClient } from "@prisma/client";
import {
  getPublicMediaUrl,
  isBrokenPublicMediaReference,
} from "../../src/features/media/get-public-media-url";

const prisma = new PrismaClient();
const PROBE = process.env.DIAGNOSE_PROBE_HTTP !== "0";

type Finding = {
  slug: string;
  status: string;
  field: string;
  url: string;
  reason: string;
  http?: number;
};

function classifyDeterministic(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "empty";
  if (isBrokenPublicMediaReference(trimmed)) {
    if (/\/api\//i.test(trimmed) || /\/admin\//i.test(trimmed) || /\/quan-tri\//i.test(trimmed)) {
      return "admin-or-api-route";
    }
    if (!/^https:\/\//i.test(trimmed)) return "not-https-public";
    return "invalid-public-url";
  }
  return null;
}

async function probeHttp(url: string): Promise<number> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (head.status === 405 || head.status === 403) {
      const get = await fetch(url, { method: "GET", redirect: "follow" });
      await get.arrayBuffer().catch(() => null);
      return get.status;
    }
    return head.status;
  } catch {
    return 0;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      status: true,
      featuredImage: true,
      gallery: true,
      images: { select: { imageUrl: true } },
      variants: { select: { imageUrl: true }, where: { imageUrl: { not: null } } },
      options: { select: { values: { select: { imageUrl: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const findings: Finding[] = [];
  const toProbe: Finding[] = [];
  const referencedUrls = new Set<string>();

  for (const product of products) {
    const fields: Array<[string, string | null | undefined]> = [
      ["featuredImage", product.featuredImage],
      ...product.gallery.map((url, index): [string, string] => [`gallery[${index}]`, url]),
      ...product.images.map((image, index): [string, string] => [
        `images[${index}]`,
        image.imageUrl,
      ]),
      ...product.variants.map((variant, index): [string, string | null] => [
        `variant[${index}]`,
        variant.imageUrl,
      ]),
      ...product.options.flatMap((option, optionIndex) =>
        option.values.map(
          (value, valueIndex): [string, string | null] => [
            `option[${optionIndex}].values[${valueIndex}]`,
            value.imageUrl,
          ],
        ),
      ),
    ];

    for (const [field, url] of fields) {
      if (url == null) continue;
      const reason = classifyDeterministic(url);
      if (reason) {
        findings.push({ slug: product.slug, status: product.status, field, url, reason });
        continue;
      }
      const canonical = getPublicMediaUrl(url);
      if (!canonical) continue;
      referencedUrls.add(canonical);
      if (PROBE && /^https:\/\//i.test(canonical)) {
        toProbe.push({
          slug: product.slug,
          status: product.status,
          field,
          url: canonical,
          reason: "probe",
        });
      }
    }
  }

  const uniqueProbe = [...new Map(toProbe.map((row) => [row.url, row])).values()];
  const httpBroken: Finding[] = [];
  if (PROBE && uniqueProbe.length) {
    let cursor = 0;
    async function worker() {
      while (cursor < uniqueProbe.length) {
        const index = cursor++;
        const item = uniqueProbe[index]!;
        const code = await probeHttp(item.url);
        if (code !== 200) {
          httpBroken.push({
            ...item,
            reason:
              item.url.includes("blob.vercel-storage.com")
                ? `likely-broken-vercel-blob-http-${code}`
                : `http-${code}`,
            http: code,
          });
        }
      }
    }
    await Promise.all(Array.from({ length: 8 }, () => worker()));
  }

  const missingMediaAssets: Finding[] = [];
  if (referencedUrls.size) {
    const urls = [...referencedUrls];
    const assets = await prisma.mediaAsset.findMany({
      where: { OR: [{ url: { in: urls } }, { thumbnailUrl: { in: urls } }] },
      select: { url: true, thumbnailUrl: true },
    });
    const known = new Set<string>();
    for (const asset of assets) {
      if (asset.url) known.add(asset.url);
      if (asset.thumbnailUrl) known.add(asset.thumbnailUrl);
    }
    for (const product of products) {
      const check: Array<[string, string | null | undefined]> = [
        ["featuredImage", product.featuredImage],
        ...product.gallery.map((url, index): [string, string] => [`gallery[${index}]`, url]),
      ];
      for (const [field, url] of check) {
        const canonical = getPublicMediaUrl(url);
        if (!canonical) continue;
        if (!known.has(canonical)) {
          missingMediaAssets.push({
            slug: product.slug,
            status: product.status,
            field,
            url: canonical,
            reason: "no-matching-media-asset",
          });
        }
      }
    }
  }

  const report = {
    productCount: products.length,
    deterministicIssues: findings,
    httpBroken,
    mediaReferenceGaps: missingMediaAssets.slice(0, 100),
    mediaReferenceGapCount: missingMediaAssets.length,
    notes: [
      "Deterministic checks reject empty, non-HTTPS, admin/API, and unsafe URLs.",
      "HTTP probes detect deleted blob/CDN objects still referenced by products.",
      "no-matching-media-asset means product stores a URL snapshot with no MediaAsset row (not always an error).",
      "Set DIAGNOSE_PROBE_HTTP=0 to skip network probes.",
    ],
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
