"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

type AdminLoginFormProps = {
  configWarning?: string | null;
};

function AdminLoginFormInner({ configWarning }: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Đăng nhập thất bại.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <h1 className="admin-login-title">ATTD CMS</h1>
        <p className="admin-field-hint">Đăng nhập quản trị</p>

        {configWarning && <p className="admin-kb-warning">{configWarning}</p>}

        <form className="admin-login-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-username">
              Tên đăng nhập
            </label>
            <input
              id="admin-username"
              type="text"
              className="admin-input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Để trống nếu đăng nhập quản trị"
            />
            <p className="admin-field-hint">
              Nhân viên dùng tài khoản cá nhân. Để trống tên đăng nhập và chỉ nhập mật khẩu quản trị để đăng nhập toàn quyền.
            </p>
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-password">
              Mật khẩu
            </label>
            <input
              id="admin-password"
              type="password"
              className="admin-input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="admin-error">{error}</p>}
          <AdminLoadingButton
            type="submit"
            variant="primary"
            className="admin-login-submit"
            pending={loading}
            pendingLabel="Đang đăng nhập…"
            disabled={loading}
          >
            Đăng nhập
          </AdminLoadingButton>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginForm(props: AdminLoginFormProps) {
  return (
    <Suspense fallback={<SectionLoading title="Đang tải…" tone="admin" />}>
      <AdminLoginFormInner {...props} />
    </Suspense>
  );
}
