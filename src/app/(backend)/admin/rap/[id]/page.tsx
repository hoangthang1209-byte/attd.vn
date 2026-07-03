import { redirect } from "next/navigation";
import { patternAdminDetailPath } from "@/features/patterns/pattern-admin-routes";

type PageProps = { params: Promise<{ id: string }> };

export default async function PatternLegacyDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(patternAdminDetailPath(id));
}
