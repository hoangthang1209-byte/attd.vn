import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import type { StorageAdapter, StorageFolderKey, UploadResult } from "./types";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

export class LocalStorageAdapter implements StorageAdapter {
  async upload(
    folder: StorageFolderKey,
    filename: string,
    buffer: Buffer,
    _contentType: string
  ): Promise<UploadResult> {
    const safeName = `${Date.now()}-${sanitizeFilename(filename)}`;
    const relativeDir = path.join("public", "uploads", folder);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });

    const absolutePath = path.join(absoluteDir, safeName);
    await writeFile(absolutePath, buffer);

    const storageKey = `uploads/${folder}/${safeName}`;
    const url = `/${storageKey}`;
    return { url, storageKey };
  }

  async delete(_url: string, storageKey: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), "public", storageKey);
    await unlink(absolutePath).catch(() => undefined);
  }
}
