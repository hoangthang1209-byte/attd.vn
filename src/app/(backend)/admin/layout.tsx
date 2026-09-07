// Force every admin page to render on every request so that new DB records
// always appear without a redeploy.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import AdminProviders from "@/components/admin/AdminProviders";
import AdminShell from "@/components/admin/AdminShell";
import {
  ADMIN_DOCUMENT_TITLE,
  ADMIN_TITLE_TEMPLATE,
} from "@/lib/admin/admin-metadata";
import { buildPrivateNoindexMetadata } from "@/lib/seo/indexation-policy";

export const metadata: Metadata = {
  ...buildPrivateNoindexMetadata(),
  title: {
    default: ADMIN_DOCUMENT_TITLE,
    template: ADMIN_TITLE_TEMPLATE,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}