import type { MediaCollectionType } from "@prisma/client";

export const MEDIA_COLLECTION_TYPES: MediaCollectionType[] = [
  "PROJECT",
  "CAMPAIGN",
  "CUSTOMER",
  "PRODUCT_LINE",
  "CONTENT",
  "EVENT",
  "INTERNAL",
  "OTHER",
];

export const MEDIA_COLLECTION_TYPE_LABELS: Record<MediaCollectionType, string> = {
  PROJECT: "Dự án",
  CAMPAIGN: "Chiến dịch",
  CUSTOMER: "Khách hàng",
  PRODUCT_LINE: "Dòng sản phẩm",
  CONTENT: "Nội dung",
  EVENT: "Sự kiện",
  INTERNAL: "Nội bộ",
  OTHER: "Khác",
};

export function validateMediaCollectionType(value: unknown): MediaCollectionType | null {
  if (typeof value !== "string") return null;
  return MEDIA_COLLECTION_TYPES.includes(value as MediaCollectionType)
    ? (value as MediaCollectionType)
    : null;
}

export type MediaCollectionRecord = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  collectionType: MediaCollectionType;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaCollectionInput = {
  code?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  collectionType?: MediaCollectionType;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateMediaCollectionInput = {
  name?: string;
  description?: string | null;
  color?: string | null;
  collectionType?: MediaCollectionType;
  sortOrder?: number;
  isActive?: boolean;
};
