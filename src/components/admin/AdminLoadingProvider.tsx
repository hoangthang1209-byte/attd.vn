"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";

export const ADMIN_LOADING_DEFAULT_MESSAGE = "Đang xử lý dữ liệu…";

const MIN_VISIBLE_MS = 280;

type AdminLoadingContextValue = {
  visible: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
};

const AdminLoadingContext = createContext<AdminLoadingContextValue | null>(null);

export function AdminLoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(ADMIN_LOADING_DEFAULT_MESSAGE);
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHideRef = useRef(false);

  const show = useCallback((nextMessage?: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    pendingHideRef.current = false;
    setMessage(nextMessage?.trim() || ADMIN_LOADING_DEFAULT_MESSAGE);
    shownAtRef.current = Date.now();
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    const finishHide = () => {
      pendingHideRef.current = false;
      shownAtRef.current = null;
      setVisible(false);
    };

    if (!shownAtRef.current) {
      finishHide();
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = MIN_VISIBLE_MS - elapsed;

    if (remaining <= 0) {
      finishHide();
      return;
    }

    pendingHideRef.current = true;
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      if (pendingHideRef.current) finishHide();
    }, remaining);
  }, []);

  const value = useMemo(
    () => ({ visible, message, show, hide }),
    [visible, message, show, hide],
  );

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <AdminLoadingContext.Provider value={value}>
      {children}
      {visible && (
        <div
          className="admin-global-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={message}
        >
          <div className="admin-global-loading__backdrop" aria-hidden />
          <div className="admin-global-loading__panel">
            <Loader2 className="admin-global-loading__spinner" aria-hidden />
            <p className="admin-global-loading__message">{message}</p>
          </div>
        </div>
      )}
    </AdminLoadingContext.Provider>
  );
}

export function useAdminLoading() {
  const ctx = useContext(AdminLoadingContext);
  if (!ctx) {
    throw new Error("useAdminLoading must be used within AdminLoadingProvider");
  }
  return ctx;
}
