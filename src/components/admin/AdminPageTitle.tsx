"use client";

import { useLayoutEffect } from "react";
import { useAdminTitle } from "@/components/admin/AdminTitleContext";

/** Sets the persistent admin shell page heading for the current route. */
export default function AdminPageTitle({ title }: { title: string }) {
  const { setTitle } = useAdminTitle();

  useLayoutEffect(() => {
    setTitle(title);
  }, [title, setTitle]);

  return null;
}
