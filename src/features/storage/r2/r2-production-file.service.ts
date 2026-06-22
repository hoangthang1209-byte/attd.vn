import "server-only";
import { HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ProductionFileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  classifyProductionFile,
  ERROR_R2_NOT_CONFIGURED,
} from "@/features/storage/file-classification";
import { getR2Client, isR2Configured } from "@/features/storage/r2/r2-client";
import {
  buildR2ProductionObjectKey,
  createUploadSessionToken,
  verifyUploadSessionToken,
} from "@/features/storage/r2/r2-signed-url.service";
import { R2_PRIVATE_URL_SENTINEL, type R2UploadSessionResponse } from "@/features/storage/r2/r2-types";

export class R2ProductionFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2ProductionFileError";
  }
}

export type CreateR2UploadSessionInput = {
  orderId: string;
  orderItemId?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  productionFileType: ProductionFileType;
};

export async function createR2ProductionUploadSession(
  input: CreateR2UploadSessionInput,
): Promise<R2UploadSessionResponse> {
  if (!isR2Configured()) {
    throw new R2ProductionFileError(ERROR_R2_NOT_CONFIGURED);
  }

  const classification = classifyProductionFile({
    filename: input.fileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSize,
    productionFileType: input.productionFileType,
  });

  if (!classification.allowed || classification.storageProvider !== "CLOUDFLARE_R2") {
    throw new R2ProductionFileError(
      classification.error ?? "Định dạng file này chưa được hỗ trợ.",
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, orderNo: true, items: { select: { id: true } } },
  });
  if (!order) throw new R2ProductionFileError("Không tìm thấy đơn hàng.");

  const hasOrderScope = !input.orderItemId;
  const hasItemScope = Boolean(input.orderItemId);
  if (hasOrderScope === hasItemScope) {
    throw new R2ProductionFileError(
      "File phải thuộc đơn hàng hoặc một dòng sản phẩm, không được cả hai hoặc không có.",
    );
  }

  if (input.orderItemId) {
    const belongs = order.items.some((i) => i.id === input.orderItemId);
    if (!belongs) throw new R2ProductionFileError("Dòng sản phẩm không thuộc đơn hàng này.");
  }

  const storageKey = buildR2ProductionObjectKey({
    orderNo: order.orderNo,
    orderItemId: input.orderItemId ?? null,
    fileName: input.fileName,
  });

  const { client, config } = await getR2Client();
  const mimeType = classification.mimeType!;

  const putCommand = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: input.fileSize,
  });

  const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 900 });

  const { sessionToken, expiresAt } = createUploadSessionToken({
    storageKey,
    orderId: input.orderId,
    orderItemId: input.orderItemId ?? null,
    fileName: input.fileName,
    originalFileName: input.fileName,
    mimeType,
    expectedSize: input.fileSize,
    format: classification.extension?.slice(1) ?? null,
    productionFileType: input.productionFileType,
  });

  return {
    uploadUrl,
    uploadHeaders: { "Content-Type": mimeType },
    sessionToken,
    storageKey,
    expiresAt,
  };
}

export async function completeR2ProductionUpload(sessionToken: string) {
  const payload = verifyUploadSessionToken(sessionToken);
  if (!payload) {
    throw new R2ProductionFileError("Phiên tải lên không hợp lệ hoặc đã hết hạn.");
  }

  if (!isR2Configured()) {
    throw new R2ProductionFileError(ERROR_R2_NOT_CONFIGURED);
  }

  const { client, config } = await getR2Client();
  const head = await client
    .send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: payload.storageKey,
      }),
    )
    .catch(() => null);

  if (!head) {
    throw new R2ProductionFileError("Không tìm thấy file trên kho lưu trữ. Vui lòng thử tải lên lại.");
  }

  const actualSize = head.ContentLength ?? payload.expectedSize;
  if (actualSize <= 0) {
    throw new R2ProductionFileError("File rỗng hoặc không đọc được.");
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      filename: payload.fileName,
      originalName: payload.originalFileName,
      url: `${R2_PRIVATE_URL_SENTINEL}${payload.storageKey}`,
      thumbnailUrl: null,
      storageKey: payload.storageKey,
      storageProvider: "CLOUDFLARE_R2",
      publicId: null,
      mimeType: payload.mimeType,
      format: payload.format,
      sizeBytes: actualSize,
      folder: "GENERAL",
      usageType: "GENERAL",
      title: payload.fileName,
    },
  });

  return { asset, orderId: payload.orderId, orderItemId: payload.orderItemId };
}

export async function deleteR2Object(storageKey: string): Promise<void> {
  if (!isR2Configured()) return;
  const { client, config } = await getR2Client();
  await client
    .send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    )
    .catch((err) => {
      console.warn("[r2] delete failed:", err);
    });
}

export async function getR2SignedAccessUrl(
  storageKey: string,
  options: { disposition: "inline" | "attachment"; fileName: string; mimeType: string },
): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { client, config } = await getR2Client();

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: storageKey,
    ResponseContentDisposition: `${options.disposition}; filename="${encodeURIComponent(options.fileName)}"`,
    ResponseContentType: options.mimeType,
  });

  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function headR2Object(storageKey: string) {
  if (!isR2Configured()) return null;
  const { client, config } = await getR2Client();
  return client
    .send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    )
    .catch(() => null);
}
