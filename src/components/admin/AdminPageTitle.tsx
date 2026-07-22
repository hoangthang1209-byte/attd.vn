"use client";

import { useLayoutEffect, useRef } from "react";
import { useAdminTitle } from "@/components/admin/AdminTitleContext";

/** Sets the persistent admin shell page heading for the current route. */
export default function AdminPageTitle({ title }: { title: string }) {
  const { setTitle, clearTitle } = useAdminTitle();
  const ownerRef = useRef(Symbol("admin-page-title"));

  useLayoutEffect(() => {
    const owner = ownerRef.current;
    setTitle(title, owner);
    return () => clearTitle(owner);
  }, [title, setTitle, clearTitle]);

  return null;
}
