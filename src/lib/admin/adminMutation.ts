import type { useAdminLoading } from "@/components/admin/AdminLoadingProvider";

export const ADMIN_TOAST_ERROR_FALLBACK = "Có lỗi xảy ra. Vui lòng thử lại.";
export const ADMIN_SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
export const ADMIN_FORBIDDEN_FALLBACK = "Bạn không có quyền thực hiện thao tác này.";

type LoadingApi = Pick<ReturnType<typeof useAdminLoading>, "show" | "hide">;

export type AdminToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

export type AdminMutationContext = {
  loading: LoadingApi;
  toast: AdminToastApi;
};

type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message?: string };

export type RunAdminMutationOptions<T> = {
  loadingMessage: string;
  successMessage?: string;
  errorFallback?: string;
  action: () => Promise<MutationResult<T>>;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (message: string) => void;
};

/** Shared helper for admin mutations — loading overlay + toast feedback. */
export async function runAdminMutation<T>(
  ctx: AdminMutationContext,
  options: RunAdminMutationOptions<T>,
): Promise<T | null> {
  ctx.loading.show(options.loadingMessage);

  try {
    const result = await options.action();
    ctx.loading.hide();

    if (!result.ok) {
      const message =
        result.message ?? options.errorFallback ?? ADMIN_TOAST_ERROR_FALLBACK;
      ctx.toast.error(message);
      options.onError?.(message);
      return null;
    }

    if (options.successMessage) {
      ctx.toast.success(options.successMessage);
    }

    await options.onSuccess?.(result.data);
    return result.data;
  } catch (err) {
    ctx.loading.hide();
    const message = options.errorFallback ?? ADMIN_TOAST_ERROR_FALLBACK;
    ctx.toast.error(message);
    options.onError?.(message);
    if (process.env.NODE_ENV === "development") {
      console.error("[runAdminMutation]", err);
    }
    return null;
  }
}

/** Admin API fetch — always send same-origin session cookies. */
export function adminApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "same-origin",
    ...init,
  });
}

export function resolveAdminMutationErrorMessage(
  res: Response,
  body: Record<string, unknown>,
): string | undefined {
  if (res.status === 401) {
    return ADMIN_SESSION_EXPIRED_MESSAGE;
  }
  if (res.status === 403) {
    return (
      (typeof body.error === "string" && body.error) ||
      (typeof body.message === "string" && body.message) ||
      ADMIN_FORBIDDEN_FALLBACK
    );
  }
  return (
    (typeof body.message === "string" && body.message) ||
    (typeof body.error === "string" && body.error) ||
    undefined
  );
}

/** Parse a JSON API response into a mutation result. */
export async function parseAdminJsonResponse<T>(
  res: Response,
  pickData: (body: Record<string, unknown>) => T,
): Promise<MutationResult<T>> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    if (!res.ok) {
      return { ok: false, message: resolveAdminMutationErrorMessage(res, body) };
    }
    return { ok: false, message: "Phản hồi không hợp lệ từ máy chủ." };
  }

  if (!res.ok) {
    return { ok: false, message: resolveAdminMutationErrorMessage(res, body) };
  }
  return { ok: true, data: pickData(body) };
}
