import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

export type ProductImageHealthStatus =
  | "OK"
  | "MISSING"
  | "INVALID_URL"
  | "UNREACHABLE"
  | "STALE_BLOB"
  | "ADMIN_API_URL"
  | "NON_CANONICAL"
  | "UNKNOWN_UNCHECKED";

export type ProductImageHealthFinding = {
  productId: string;
  productName: string;
  slug: string;
  fieldPath: string;
  originalUrl: string | null;
  normalizedUrl: string | null;
  status: ProductImageHealthStatus;
  reason: string;
  suggestedAction: string;
  httpStatus?: number;
};

const ADMIN_OR_API_PATTERN = /\/(?:api|admin|quan-tri)\//i;
const VERCEL_BLOB_HOST_PATTERN = /(^|\.)blob\.vercel-storage\.com$/i;
const UNSAFE_PROTOCOL_PATTERN = /^(javascript|data|vbscript|file|blob):/i;

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function classifyImageUrlDeterministic(
  originalUrl: string | null | undefined,
): Omit<ProductImageHealthFinding, "productId" | "productName" | "slug" | "fieldPath"> {
  if (!originalUrl || !originalUrl.trim()) {
    return {
      originalUrl: originalUrl ?? null,
      normalizedUrl: null,
      status: "MISSING",
      reason: "empty_image_reference",
      suggestedAction: "Thêm ảnh từ Media Library.",
    };
  }

  const trimmed = originalUrl.trim();
  if (UNSAFE_PROTOCOL_PATTERN.test(trimmed)) {
    return {
      originalUrl: trimmed,
      normalizedUrl: null,
      status: "INVALID_URL",
      reason: "unsafe_protocol",
      suggestedAction: "Thay URL bằng ảnh HTTPS public hợp lệ.",
    };
  }

  if (ADMIN_OR_API_PATTERN.test(trimmed)) {
    return {
      originalUrl: trimmed,
      normalizedUrl: null,
      status: "ADMIN_API_URL",
      reason: "admin_or_api_path",
      suggestedAction: "Chọn lại ảnh từ Media Library (URL public).",
    };
  }

  const parsed = /^https?:\/\//i.test(trimmed) ? parseUrl(trimmed) : null;
  if (parsed && VERCEL_BLOB_HOST_PATTERN.test(parsed.hostname)) {
    return {
      originalUrl: trimmed,
      normalizedUrl: null,
      status: "STALE_BLOB",
      reason: "vercel_blob_not_canonical",
      suggestedAction: "Chọn lại ảnh từ Media Library (Cloudinary/public canonical).",
    };
  }

  const normalizedUrl = getPublicMediaUrl(trimmed);
  if (!normalizedUrl) {
    return {
      originalUrl: trimmed,
      normalizedUrl: null,
      status: "NON_CANONICAL",
      reason: "rejected_by_public_url_policy",
      suggestedAction: "Chuẩn hóa URL ảnh sang nguồn public hợp lệ.",
    };
  }

  return {
    originalUrl: trimmed,
    normalizedUrl,
    status: "UNKNOWN_UNCHECKED",
    reason: "deterministic_checks_passed",
    suggestedAction: "URL hợp lệ theo kiểm tra tĩnh; có thể kiểm tra reachability khi cần.",
  };
}

export async function probeImageReachability(
  url: string,
  timeoutMs = 4000,
): Promise<{ ok: boolean; httpStatus: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (head.status === 405 || head.status === 403) {
      const getRes = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
      await getRes.arrayBuffer().catch(() => null);
      return { ok: getRes.status === 200, httpStatus: getRes.status };
    }
    return { ok: head.status === 200, httpStatus: head.status };
  } catch {
    return { ok: false, httpStatus: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export type ProductImageScanInput = {
  productId: string;
  productName: string;
  slug: string;
  featuredImage?: string | null;
  gallery?: string[] | null;
  images?: Array<{ imageUrl?: string | null }> | null;
  variants?: Array<{ imageUrl?: string | null }> | null;
  optionValues?: Array<{ imageUrl?: string | null }> | null;
};

export async function scanProductImageHealth(
  input: ProductImageScanInput,
  options?: { checkRemote?: boolean; timeoutMs?: number },
): Promise<ProductImageHealthFinding[]> {
  const entries: Array<{ fieldPath: string; url: string | null | undefined }> = [
    { fieldPath: "featuredImage", url: input.featuredImage },
    ...(input.gallery ?? []).map((url, index) => ({ fieldPath: `gallery[${index}]`, url })),
    ...(input.images ?? []).map((row, index) => ({ fieldPath: `images[${index}].imageUrl`, url: row.imageUrl })),
    ...(input.variants ?? []).map((row, index) => ({ fieldPath: `variants[${index}].imageUrl`, url: row.imageUrl })),
    ...(input.optionValues ?? []).map((row, index) => ({
      fieldPath: `optionValues[${index}].imageUrl`,
      url: row.imageUrl,
    })),
  ];

  const findings = entries.map(({ fieldPath, url }) => {
    const deterministic = classifyImageUrlDeterministic(url);
    return {
      productId: input.productId,
      productName: input.productName,
      slug: input.slug,
      fieldPath,
      ...deterministic,
    };
  });

  if (!options?.checkRemote) {
    return findings.map((finding) =>
      finding.status === "UNKNOWN_UNCHECKED" ? { ...finding, status: "OK", reason: "canonical_url" } : finding,
    );
  }

  for (const finding of findings) {
    if (finding.status !== "UNKNOWN_UNCHECKED" || !finding.normalizedUrl) continue;
    const remote = await probeImageReachability(finding.normalizedUrl, options.timeoutMs ?? 4000);
    if (remote.ok) {
      finding.status = "OK";
      finding.reason = "reachable_http_200";
      finding.httpStatus = remote.httpStatus;
      continue;
    }
    finding.status = "UNREACHABLE";
    finding.reason = `http_${remote.httpStatus}`;
    finding.httpStatus = remote.httpStatus;
    finding.suggestedAction = "Xác minh ảnh tồn tại hoặc chọn lại từ Media Library.";
  }

  return findings;
}
