import { permanentRedirect } from "next/navigation";

export default function AdminHomepageRedirectPage() {
  permanentRedirect("/admin/settings/homepage");
}
