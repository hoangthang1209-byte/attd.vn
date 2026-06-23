import "server-only";
import { del } from "@vercel/blob";
import { LocalStorageAdapter } from "./local-adapter";
import { VercelBlobStorageAdapter } from "./blob-adapter";
import { CloudinaryStorageAdapter, isCloudinaryConfigured } from "./cloudinary-adapter";
import {
  assertCloudinaryConfigured,
  CLOUDINARY_CONFIG_ERROR,
} from "./cloudinary-config";
import type { StorageAdapter } from "./types";

export { CLOUDINARY_CONFIG_ERROR };

let adapter: StorageAdapter | null = null;
let cloudinaryAdapter: CloudinaryStorageAdapter | null = null;

/**
 * Storage adapter selection (priority order):
 * 1. Cloudinary — when CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET are set
 * 2. Vercel Blob — when BLOB_READ_WRITE_TOKEN is set
 * 3. Local /public/uploads — development fallback
 */
export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;

  if (isCloudinaryConfigured()) {
    adapter = new CloudinaryStorageAdapter();
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    adapter = new VercelBlobStorageAdapter();
  } else if (process.env.VERCEL) {
    throw new Error(
      "No media storage configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET or BLOB_READ_WRITE_TOKEN in Vercel environment variables."
    );
  } else {
    adapter = new LocalStorageAdapter();
  }

  return adapter;
}

/**
 * CMS / admin image uploads must use Cloudinary — never silently fall back to Blob.
 * Throws CLOUDINARY_CONFIG_ERROR when credentials are missing.
 */
export function requireCloudinaryStorageAdapter(): CloudinaryStorageAdapter {
  assertCloudinaryConfigured();
  if (!cloudinaryAdapter) {
    cloudinaryAdapter = new CloudinaryStorageAdapter();
  }
  return cloudinaryAdapter;
}

function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("blob.vercel-storage.com") || host.includes("public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

/** Delete stored media — routes by URL/provider for legacy Blob + Cloudinary assets. */
export async function deleteStoredMediaObject(
  url: string,
  storageKey: string,
  storageProvider?: string | null,
): Promise<void> {
  if (storageProvider === "CLOUDFLARE_R2") {
    return;
  }

  if (isVercelBlobUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url).catch(() => undefined);
    return;
  }

  if (isCloudinaryConfigured() && (isCloudinaryUrl(url) || storageProvider === "CLOUDINARY")) {
    const cloudinary = requireCloudinaryStorageAdapter();
    await cloudinary.delete(url, storageKey);
    return;
  }

  const storage = getStorageAdapter();
  await storage.delete(url, storageKey);
}

export function getStorageProviderName(): "cloudinary" | "vercel-blob" | "local" {
  if (isCloudinaryConfigured()) return "cloudinary";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

export * from "./types";
