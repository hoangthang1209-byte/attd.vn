"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PortalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Không thể đăng nhập.");
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="portal-form" onSubmit={(e) => void onSubmit(e)}>
      <label className="portal-field">
        <span>Email B2B</span>
        <input
          type="email"
          className="portal-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label className="portal-field">
        <span>Mật khẩu</span>
        <input
          type="password"
          className="portal-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="portal-error">{error}</p>}
      <button type="submit" className="portal-btn portal-btn--primary" disabled={loading}>
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
