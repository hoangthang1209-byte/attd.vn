"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLoadingButton
      type="button"
      variant="secondary"
      size="small"
      className="admin-logout-btn"
      pending={loading}
      pendingLabel="Đang đăng xuất…"
      onClick={() => void handleLogout()}
    >
      Đăng xuất
    </AdminLoadingButton>
  );
}
