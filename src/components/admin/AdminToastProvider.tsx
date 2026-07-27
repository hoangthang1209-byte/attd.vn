"use client";

import { useMemo } from "react";
import { Toaster, toast } from "sonner";

export const ADMIN_TOAST_ERROR_FALLBACK = "Có lỗi xảy ra. Vui lòng thử lại.";

export function AdminToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: "admin-toast",
          title: "admin-toast__title",
          description: "admin-toast__description",
          success: "admin-toast--success",
          error: "admin-toast--error",
          info: "admin-toast--info",
          closeButton: "admin-toast__close",
        },
      }}
    />
  );
}

/**
 * Stable toast API identity across renders.
 * Unstable identity previously caused useCallback([toast]) + useEffect(load) loops
 * that kept CMS clients stuck on loading skeletons (Content Dashboard hotfix 13.1.1).
 */
export function useAdminToast() {
  return useMemo(
    () => ({
      success(message: string) {
        toast.success(message, { duration: 4000 });
      },
      error(message: string) {
        toast.error(message || ADMIN_TOAST_ERROR_FALLBACK, { duration: 6500 });
      },
      info(message: string) {
        toast(message, { duration: 4500, className: "admin-toast admin-toast--info" });
      },
    }),
    [],
  );
}
