import "server-only";

export const CLOUDINARY_ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

export const CLOUDINARY_CONFIG_ERROR = "Cloudinary chưa được cấu hình đầy đủ.";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/** Safe boolean check — never logs or exposes secret values. */
export function isCloudinaryConfigured(): boolean {
  return CLOUDINARY_ENV_KEYS.every((key) => Boolean(process.env[key]?.trim()));
}

/** Returns missing env key names only (no values). */
export function getMissingCloudinaryEnvKeys(): string[] {
  return CLOUDINARY_ENV_KEYS.filter((key) => !process.env[key]?.trim());
}

/** Server-side validation before Cloudinary SDK use. */
export function assertCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error(CLOUDINARY_CONFIG_ERROR);
  }
}

export function getCloudinaryConfig(): CloudinaryConfig {
  assertCloudinaryConfigured();
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY!.trim(),
    apiSecret: process.env.CLOUDINARY_API_SECRET!.trim(),
  };
}
