"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminRoleRecord } from "@/features/admin-roles/admin-role.service";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/admin/AdminUi";

export default function AdminRolesManager() {
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json() as { roles?: AdminRoleRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải vai trò");
      setRoles(data.roles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminPageShell>
      <PageHeader
        description="Cấu hình vai trò và phạm vi quyền truy cập theo module."
        meta={<span>Tổng: {roles.length} vai trò</span>}
      />

      {error && <p className="admin-error">{error}</p>}
      {loading ? <AdminLoadingState label="Đang tải vai trò…" /> : roles.length === 0 ? (
        <EmptyState title="Chưa có vai trò" description="Chạy seed để khởi tạo vai trò hệ thống." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên vai trò</th>
                <th>Mã</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Số tài khoản</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td><code>{role.code}</code></td>
                  <td>{role.isSystem ? "Hệ thống" : "Tùy chỉnh"}</td>
                  <td>
                    <StatusBadge tone={role.isActive ? "success" : "neutral"}>
                      {role.isActive ? "Hoạt động" : "Ngừng"}
                    </StatusBadge>
                  </td>
                  <td>{role.userCount}</td>
                  <td>
                    <Link href={`/admin/settings/roles/${role.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                      Phân quyền
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
