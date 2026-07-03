import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function TechPackDetailAliasPage({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/tech-pack/${id}`);
}
