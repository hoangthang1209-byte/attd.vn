"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <button
      type="button"
      className="admin-btn admin-btn--secondary admin-btn--small admin-logout-btn"
      disabled={loading}
      onClick={() => void handleLogout()}
    >
      {loading ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
