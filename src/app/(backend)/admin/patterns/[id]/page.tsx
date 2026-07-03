import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function PatternDetailAliasPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/rap/${id}`);
}
