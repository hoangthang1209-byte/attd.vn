"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createAdminTitleOwnerStore } from "@/components/admin/admin-title-ownership";

type AdminTitleContextValue = {
  title: string;
  /** Apply a shell title override owned by `owner`. */
  setTitle: (title: string, owner: symbol) => void;
  /** Clear the override only when `owner` still owns the active title. */
  clearTitle: (owner: symbol) => void;
};

const AdminTitleContext = createContext<AdminTitleContextValue | null>(null);

export function AdminTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState("");
  const storeRef = useRef(
    createAdminTitleOwnerStore((next) => {
      setTitleState(next);
    }),
  );

  const setTitle = useCallback((next: string, owner: symbol) => {
    storeRef.current.setTitle(next, owner);
  }, []);

  const clearTitle = useCallback((owner: symbol) => {
    storeRef.current.clearTitle(owner);
  }, []);

  const value = useMemo(
    () => ({ title, setTitle, clearTitle }),
    [title, setTitle, clearTitle],
  );

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
