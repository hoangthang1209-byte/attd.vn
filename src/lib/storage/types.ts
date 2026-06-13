import type { MediaFolder } from "@prisma/client";

export type StorageFolderKey =
  | "products"
  | "categories"
  | "clients"
  | "case-studies";

export const STORAGE_FOLDER_TO_MEDIA: Record<StorageFolderKey, MediaFolder> = {
  products: "PRODUCTS",
  categories: "CATEGORIES",
  clients: "CLIENTS",
  "case-studies": "CASE_STUDIES",
};

export const MEDIA_TO_STORAGE_FOLDER: Record<MediaFolder, StorageFolderKey> = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  CLIENTS: "clients",
  CASE_STUDIES: "case-studies",
};

export type UploadResult = {
  url: string;
  storageKey: string;
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

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
