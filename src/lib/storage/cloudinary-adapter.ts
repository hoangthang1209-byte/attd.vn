import "server-only";
import {
  getCloudinaryConfig,
  isCloudinaryConfigured,
} from "@/lib/storage/cloudinary-config";
import type { StorageAdapter, StorageFolderKey, UploadResult } from "./types";

export { isCloudinaryConfigured } from "@/lib/storage/cloudinary-config";

function cloudinaryFolder(folder: StorageFolderKey): string {
  const map: Record<StorageFolderKey, string> = {
    products: "attd/products",
    categories: "attd/categories",
    clients: "attd/clients",
    "case-studies": "attd/case-studies",
    branding: "attd/branding",
    blog: "attd/blog",
    general: "attd/general",
  };
  return map[folder] ?? "attd/general";
}

type CloudinaryUploadResponse = {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export class CloudinaryStorageAdapter implements StorageAdapter {
  async upload(
    folder: StorageFolderKey,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    // Import cloudinary lazily — only available server-side
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;
    const cloudFolder = cloudinaryFolder(folder);

    const isImage = contentType.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    const result = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        {
          folder: cloudFolder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          tags: ["attd-cms", folder],
        },
        (err, result) => {
          if (err || !result) reject(err ?? new Error("Cloudinary upload failed"));
          else resolve(result as CloudinaryUploadResponse);
        }
      );
    });

    const thumbnailUrl = isImage
      ? cloudinary.url(result.public_id, {
          width: 400,
          height: 400,
          crop: "fill",
          quality: "auto",
          fetch_format: "auto",
          secure: true,
        })
      : undefined;

    return {
      url: result.secure_url,
      storageKey: result.public_id,
      publicId: result.public_id,
      thumbnailUrl,
      width: result.width,
      height: result.height,
    };
  }

  async delete(_url: string, storageKey: string): Promise<void> {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    await cloudinary.uploader.destroy(storageKey, { resource_type: "image" }).catch(() => undefined);
    await cloudinary.uploader.destroy(storageKey, { resource_type: "raw" }).catch((err) => {
      console.warn("[cloudinary] destroy failed:", err);
    });
  }
}
