import { del, put } from "@vercel/blob";
import type { StorageAdapter, StorageFolderKey, UploadResult } from "./types";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

export class VercelBlobStorageAdapter implements StorageAdapter {
  async upload(
    folder: StorageFolderKey,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const blobPathname = `${folder}/${sanitizeFilename(filename)}`;
    const blob = await put(blobPathname, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return { url: blob.url, storageKey: blob.pathname };
  }

  async delete(url: string, _storageKey: string): Promise<void> {
    await del(url).catch(() => undefined);
  }
}
