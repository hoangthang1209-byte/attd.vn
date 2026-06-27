"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PermissionScope } from "@prisma/client";
import AdminBackLink from "@/components/admin/AdminBackLink";
import { AdminLoadingState, AdminPageShell, PageHeader } from "@/components/admin/AdminUi";

type PermissionRow = {
  id: string;
  code: string;
  module: string;
  action: string;
  name: string;
  sortOrder: number;
};

type RoleDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    permissionId: string;
    code: string;
    module: string;
    name: string;
    scope: PermissionScope;
  }>;
};

const SCOPE_OPTIONS: Array<{ value: PermissionScope; label: string }> = [
  { value: "NONE", label: "Không có quyền" },
  { value: "OWN", label: "Chỉ dữ liệu của tôi" },
  { value: "ASSIGNED", label: "Chỉ dữ liệu được phân công" },
  { value: "ALL", label: "Toàn bộ dữ liệu" },
];

export default function AdminRoleDetailManager({ roleId }: { roleId: string }) {
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [catalog, setCatalog] = useState<PermissionRow[]>([]);
  const [scopes, setScopes] = useState<Record<string, PermissionScope>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleRes, permRes] = await Promise.all([
        fetch(`/api/admin/roles/${roleId}`),
        fetch("/api/admin/permissions"),
      ]);
      const roleData = await roleRes.json() as { role?: RoleDetail; message?: string };
      const permData = await permRes.json() as { permissions?: PermissionRow[] };
      if (!roleRes.ok) throw new Error(roleData.message ?? "Không thể tải vai trò");
      setRole(roleData.role ?? null);
      setCatalog(permData.permissions ?? []);
      const nextScopes: Record<string, PermissionScope> = {};
      for (const grant of roleData.role?.permissions ?? []) {
        nextScopes[grant.permissionId] = grant.scope;
      }
      for (const perm of permData.permissions ?? []) {
        if (!nextScopes[perm.id]) nextScopes[perm.id] = "NONE";
      }
      setScopes(nextScopes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!role || role.code === "OWNER") return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const permissions = Object.entries(scopes).map(([permissionId, scope]) => ({
      permissionId,
      scope,
    }));
    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    const data = await res.json() as { message?: string };
    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Không thể lưu phân quyền");
      return;
    }
    setMessage("Đã lưu phân quyền.");
    void load();
  }

  const modules = [...new Set(catalog.map((p) => p.module))];

  if (loading) return <AdminLoadingState label="Đang tải vai trò…" />;
  if (!role) return <p className="admin-error">{error ?? "Không tìm thấy vai trò."}</p>;

  return (
    <AdminPageShell>
      <AdminBackLink href="/admin/settings/roles" />
      <PageHeader
        title={role.name}
        description={role.description ?? `Mã vai trò: ${role.code}`}
      />

      {role.code === "OWNER" && (
        <p className="admin-field-hint admin-message admin-message--info">
          Vai trò Chủ hệ thống có toàn quyền và không thể chỉnh sửa phân quyền.
        </p>
      )}
      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-message admin-message--success">{message}</p>}

      <form onSubmit={(e) => void handleSave(e)}>
        {modules.map((module) => (
          <fieldset key={module} className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
            <legend>{module}</legend>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Quyền</th>
                    <th>Phạm vi</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.filter((p) => p.module === module).map((perm) => (
                    <tr key={perm.id}>
                      <td>
                        <strong>{perm.name}</strong>
                        <div className="admin-field-hint"><code>{perm.code}</code></div>
                      </td>
                      <td>
                        <select
                          className="admin-input"
                          disabled={role.code === "OWNER" || saving}
                          value={scopes[perm.id] ?? "NONE"}
                          onChange={(e) =>
                            setScopes((prev) => ({
                              ...prev,
                              [perm.id]: e.target.value as PermissionScope,
                            }))
                          }
                        >
                          {SCOPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        ))}

        {role.code !== "OWNER" && (
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu phân quyền"}
            </button>
            <Link href="/admin/settings/roles" className="admin-btn admin-btn--secondary">Quay lại</Link>
          </div>
        )}
      </form>
    </AdminPageShell>
  );
}
