import { redirect } from "next/navigation";

/** Fast create was removed — canonical entry is /admin/products/new. */
export default function FastCreateProductRedirectPage() {
  redirect("/admin/products/new");
}
