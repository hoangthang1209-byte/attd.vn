import { redirect } from "next/navigation";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role = params.role ?? "SALES";
  redirect(`/admin/employees?role=${encodeURIComponent(role)}`);
}
