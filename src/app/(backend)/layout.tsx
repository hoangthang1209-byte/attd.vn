import type { Metadata } from "next";
import { buildPrivateNoindexMetadata } from "@/lib/seo/indexation-policy";

export const metadata: Metadata = buildPrivateNoindexMetadata();

export default function BackendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
