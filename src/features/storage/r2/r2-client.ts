import "server-only";
import type { R2Config } from "@/features/storage/r2/r2-types";

export function getR2Config(): R2Config | null {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const region = process.env.CLOUDFLARE_R2_REGION ?? "auto";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    region,
    publicBaseUrl: process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

export async function getR2Client() {
  const config = getR2Config();
  if (!config) {
    throw new Error("Cloudflare R2 chưa được cấu hình.");
  }

  const { S3Client } = await import("@aws-sdk/client-s3");
  return {
    client: new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    }),
    config,
  };
}
