import { redirect } from "next/navigation";

/** Legacy admin product list — canonical catalog lives at /admin/products. */
export default function LegacyProductsRedirectPage() {
  redirect("/admin/products");
}
