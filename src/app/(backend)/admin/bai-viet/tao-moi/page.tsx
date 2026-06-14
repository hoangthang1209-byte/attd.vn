import { redirect } from "next/navigation";

export default function LegacyCreatePostPage() {
  redirect("/admin/blog/new");
}
