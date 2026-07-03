import { redirect } from "next/navigation";
import { patternAdminDetailPath } from "@/features/patterns/pattern-admin-routes";

type Props = { params: Promise<{ id: string }> };

export default async function PatternDetailAliasPage({ params }: Props) {
  const { id } = await params;
  redirect(patternAdminDetailPath(id));
}
