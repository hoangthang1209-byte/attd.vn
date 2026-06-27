"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EmployeeRole } from "@prisma/client";

export type AdminPermissions = {
  canViewFinancials: boolean;
  canAccessQuotes: boolean;
  canAccessPricing: boolean;
};

type AdminPermissionsContextValue = {
  loading: boolean;
  employeeId: string | null;
  role: EmployeeRole | null;
  permissions: AdminPermissions;
};

const defaultPermissions: AdminPermissions = {
  canViewFinancials: true,
  canAccessQuotes: true,
  canAccessPricing: true,
};

const AdminPermissionsContext = createContext<AdminPermissionsContextValue>({
  loading: true,
  employeeId: null,
  role: null,
  permissions: defaultPermissions,
});

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(defaultPermissions);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/auth/session")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          employeeId?: string | null;
          role?: EmployeeRole | null;
          permissions?: Partial<AdminPermissions>;
        }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setEmployeeId(data.employeeId ?? null);
        setRole(data.role ?? null);
        setPermissions({
          canViewFinancials: data.permissions?.canViewFinancials ?? true,
          canAccessQuotes: data.permissions?.canAccessQuotes ?? true,
          canAccessPricing: data.permissions?.canAccessPricing ?? true,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ loading, employeeId, role, permissions }),
    [loading, employeeId, role, permissions],
  );

  return (
    <AdminPermissionsContext.Provider value={value}>
      {children}
    </AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions() {
  return useContext(AdminPermissionsContext);
}
