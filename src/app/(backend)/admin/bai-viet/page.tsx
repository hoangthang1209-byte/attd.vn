import { redirect } from "next/navigation";

export default function LegacyPostsAdminPage() {
  redirect("/admin/blog");
}
