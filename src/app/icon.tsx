import { generateBrandingIconResponse } from "@/lib/branding/favicon-metadata";

export const revalidate = 3600;

export default function Icon() {
  return generateBrandingIconResponse();
}
