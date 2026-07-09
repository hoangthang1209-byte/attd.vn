import { createAttdIconImageResponse } from "@/lib/branding/generate-attd-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return createAttdIconImageResponse(180);
}
