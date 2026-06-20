"use client";

import type { ReactNode } from "react";
import { AdminLoadingProvider } from "@/components/admin/AdminLoadingProvider";
import { AdminToastProvider } from "@/components/admin/AdminToastProvider";

/** Mount once in admin layout — global loading overlay + toast notifications. */
export default function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <AdminLoadingProvider>
      {children}
      <AdminToastProvider />
    </AdminLoadingProvider>
  );
}
