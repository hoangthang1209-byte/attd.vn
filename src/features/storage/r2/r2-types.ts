export const R2_PRIVATE_URL_SENTINEL = "r2-private://";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
  publicBaseUrl?: string;
};

export type R2UploadSessionPayload = {
  storageKey: string;
  orderId: string;
  orderItemId: string | null;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  expectedSize: number;
  format: string | null;
  productionFileType?: string;
  expiresAt: number;
};

export type R2UploadSessionResponse = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  sessionToken: string;
  storageKey: string;
  expiresAt: number;
};
