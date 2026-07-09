import { ImageResponse } from "next/og";
import { AttdIconMark } from "@/lib/branding/attd-icon-mark";

export function createAttdIconImageResponse(size: number) {
  return new ImageResponse(<AttdIconMark size={size} />, {
    width: size,
    height: size,
  });
}
