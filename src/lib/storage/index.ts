import "server-only";
import { LocalStorageAdapter } from "./local-adapter";
import { VercelBlobStorageAdapter } from "./blob-adapter";
import { CloudinaryStorageAdapter, isCloudinaryConfigured } from "./cloudinary-adapter";
import type { StorageAdapter } from "./types";

let adapter: StorageAdapter | null = null;

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

export function getStorageProviderName(): "cloudinary" | "vercel-blob" | "local" {
  if (isCloudinaryConfigured()) return "cloudinary";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

export * from "./types";
