import { createAttdIconImageResponse } from "@/lib/branding/generate-attd-icon";

export function generateImageMetadata() {
  return [
    {
      id: "32",
      contentType: "image/png",
      size: { width: 32, height: 32 },
    },
    {
      id: "192",
      contentType: "image/png",
      size: { width: 192, height: 192 },
    },
    {
      id: "512",
      contentType: "image/png",
      size: { width: 512, height: 512 },
    },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = await id;
  const size = Number(iconId) || 32;
  return createAttdIconImageResponse(size);
}
