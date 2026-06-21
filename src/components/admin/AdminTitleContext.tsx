"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AdminTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const AdminTitleContext = createContext<AdminTitleContextValue | null>(null);

export function AdminTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return (
    <AdminTitleContext.Provider value={value}>{children}</AdminTitleContext.Provider>
  );
}

export function useAdminTitle() {
  const ctx = useContext(AdminTitleContext);
  if (!ctx) {
    throw new Error("useAdminTitle must be used within AdminTitleProvider");
  }
  return ctx;
}
