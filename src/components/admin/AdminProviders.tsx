"use client";

import type { ReactNode } from "react";
import { AdminPermissionsProvider } from "@/components/admin/AdminPermissionsContext";
import { AdminLoadingProvider } from "@/components/admin/AdminLoadingProvider";
import { AdminToastProvider } from "@/components/admin/AdminToastProvider";

/** Mount once in admin layout — global loading overlay + toast notifications. */
export default function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <AdminPermissionsProvider>
      <AdminLoadingProvider>
        {children}
        <AdminToastProvider />
      </AdminLoadingProvider>
    </AdminPermissionsProvider>
  );
}
