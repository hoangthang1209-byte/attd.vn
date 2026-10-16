import type { MediaFolder } from "@prisma/client";

export type StorageFolderKey =
  | "products"
  | "categories"
  | "clients"
  | "case-studies"
  | "branding"
  | "blog"
  | "general";

export const STORAGE_FOLDER_TO_MEDIA: Record<StorageFolderKey, MediaFolder> = {
  products: "PRODUCTS",
  categories: "CATEGORIES",
  clients: "CLIENTS",
  "case-studies": "CASE_STUDIES",
  branding: "BRANDING",
  blog: "BLOG",
  general: "GENERAL",
};

export const MEDIA_TO_STORAGE_FOLDER: Record<MediaFolder, StorageFolderKey> = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  CLIENTS: "clients",
  CASE_STUDIES: "case-studies",
  BRANDING: "branding",
  BLOG: "blog",
  GENERAL: "general",
};

export type UploadResult = {
  url: string;
  storageKey: string;
  /** Cloudinary publicId if using Cloudinary */
  publicId?: string;
  /** Thumbnail URL (Cloudinary transformation) */
  thumbnailUrl?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
};

export interface StorageAdapter {
  upload(
    folder: StorageFolderKey,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult>;
  delete(url: string, storageKey: string): Promise<void>;
}

export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
  validateImageUpload,
} from "@/lib/imageValidation";

/** Ingest cap for Media Library bulk/folder upload (original retained in storage). */
export const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
export const LARGE_IMAGE_WARNING_SIZE = 500 * 1024; // 500KB — web delivery optimized at render
