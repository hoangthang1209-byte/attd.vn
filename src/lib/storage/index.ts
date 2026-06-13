import "server-only";
import { LocalStorageAdapter } from "./local-adapter";
import { VercelBlobStorageAdapter } from "./blob-adapter";
import type { StorageAdapter } from "./types";

let adapter: StorageAdapter | null = null;

/** Storage adapter — Vercel Blob when token exists, else local /public/uploads. */
export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    adapter = new VercelBlobStorageAdapter();
  } else {
    adapter = new LocalStorageAdapter();
  }

  return adapter;
}

export function getStorageProviderName(): "vercel-blob" | "local" {
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local";
}

export * from "./types";
