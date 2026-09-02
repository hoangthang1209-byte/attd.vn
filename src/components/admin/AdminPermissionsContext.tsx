"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminPermissionFlags = {
  canViewFinancials: boolean;
  canAccessQuotes: boolean;
  canAccessPricing: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewOrders: boolean;
  canCreateOrders: boolean;
  canUpdateOrders: boolean;
  canViewProduction: boolean;
  canUpdateProduction: boolean;
  canViewItemProduction: boolean;
  canUpdateItemProduction: boolean;
  canViewDelivery: boolean;
  canManageEmployees: boolean;
  canManageProducts: boolean;
  canManageCms: boolean;
  canViewCrm: boolean;
  canCreateCustomers: boolean;
  canViewDashboard: boolean;
  canViewWarehouse: boolean;
  canViewReports: boolean;
  canManageManufacturingLibrary: boolean;
};

type AdminPermissionsContextValue = {
  loading: boolean;
  mode: string;
  username: string | null;
  employeeId: string | null;
  roleCode: string | null;
  permissions: AdminPermissionFlags;
};

const defaultFlags: AdminPermissionFlags = {
  canViewFinancials: true,
  canAccessQuotes: true,
  canAccessPricing: true,
  canManageUsers: true,
  canManageRoles: true,
  canViewOrders: true,
  canCreateOrders: true,
  canUpdateOrders: true,
  canViewProduction: true,
  canUpdateProduction: true,
  canViewItemProduction: true,
  canUpdateItemProduction: true,
  canViewDelivery: true,
  canManageEmployees: true,
  canManageProducts: true,
  canManageCms: true,
  canViewCrm: true,
  canCreateCustomers: true,
  canViewDashboard: true,
  canViewWarehouse: true,
  canViewReports: true,
  canManageManufacturingLibrary: true,
};

const AdminPermissionsContext = createContext<AdminPermissionsContextValue>({
  loading: true,
  mode: "owner",
  username: null,
  employeeId: null,
  roleCode: null,
  permissions: defaultFlags,
});

export function AdminPermissionsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("owner");
  const [username, setUsername] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissionFlags>(defaultFlags);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/auth/session")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          mode?: string;
          username?: string | null;
          employeeId?: string | null;
          roleCode?: string | null;
          flags?: Partial<AdminPermissionFlags>;
        }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setMode(data.mode ?? "owner");
        setUsername(data.username ?? null);
        setEmployeeId(data.employeeId ?? null);
        setRoleCode(data.roleCode ?? null);
        setPermissions({
          canViewFinancials: data.flags?.canViewFinancials ?? true,
          canAccessQuotes: data.flags?.canAccessQuotes ?? true,
          canAccessPricing: data.flags?.canAccessPricing ?? true,
          canManageUsers: data.flags?.canManageUsers ?? false,
          canManageRoles: data.flags?.canManageRoles ?? false,
          canViewOrders: data.flags?.canViewOrders ?? true,
          canCreateOrders: data.flags?.canCreateOrders ?? true,
          canUpdateOrders: data.flags?.canUpdateOrders ?? true,
          canViewProduction: data.flags?.canViewProduction ?? true,
          canUpdateProduction: data.flags?.canUpdateProduction ?? true,
          canViewItemProduction: data.flags?.canViewItemProduction ?? true,
          canUpdateItemProduction: data.flags?.canUpdateItemProduction ?? true,
          canViewDelivery: data.flags?.canViewDelivery ?? true,
          canManageEmployees: data.flags?.canManageEmployees ?? true,
          canManageProducts: data.flags?.canManageProducts ?? true,
          canManageCms: data.flags?.canManageCms ?? false,
          canViewCrm: data.flags?.canViewCrm ?? true,
          canCreateCustomers: data.flags?.canCreateCustomers ?? true,
          canViewDashboard: data.flags?.canViewDashboard ?? true,
          canViewWarehouse: data.flags?.canViewWarehouse ?? true,
          canViewReports: data.flags?.canViewReports ?? true,
          canManageManufacturingLibrary: data.flags?.canManageManufacturingLibrary ?? true,
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
    () => ({ loading, mode, username, employeeId, roleCode, permissions }),
    [loading, mode, username, employeeId, roleCode, permissions],
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
