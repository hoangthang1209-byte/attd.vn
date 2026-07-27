/** Bounded client fetch helpers for Content Dashboard only. */

export const CONTENT_DASHBOARD_FETCH_TIMEOUT_MS = 12_000;

export type DashboardFetchFailureKind = "timeout" | "http" | "abort" | "parse" | "network";

export class DashboardFetchError extends Error {
  readonly kind: DashboardFetchFailureKind;
  readonly status: number | null;

  constructor(
    message: string,
    kind: DashboardFetchFailureKind,
    status: number | null = null,
  ) {
    super(message);
    this.name = "DashboardFetchError";
    this.kind = kind;
    this.status = status;
  }
}

export type DashboardFetchResult<T> =
  | { ok: true; data: T; durationMs: number }
  | { ok: false; error: DashboardFetchError; durationMs: number };

function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal && typeof AbortSignal.any === "function") {
    return AbortSignal.any([a, b]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (a.aborted || b.aborted) {
    abort();
    return controller.signal;
  }
  a.addEventListener("abort", abort, { once: true });
  b.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

/**
 * Fetch JSON with AbortController timeout. Distinguishes timeout / abort / HTTP / parse.
 * Scoped for Content Dashboard client requests — not a platform-wide fetch wrapper.
 */
export async function fetchDashboardJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    validate?: (json: unknown) => T;
  },
): Promise<DashboardFetchResult<T>> {
  const timeoutMs = options?.timeoutMs ?? CONTENT_DASHBOARD_FETCH_TIMEOUT_MS;
  const started = Date.now();
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = options?.signal
    ? combineSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    });

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new DashboardFetchError("Phản hồi không hợp lệ từ máy chủ.", "parse", res.status);
    }

    if (res.status === 401 || res.status === 403) {
      throw new DashboardFetchError(
        "Bạn không có quyền xem Content Dashboard.",
        "http",
        res.status,
      );
    }

    if (!res.ok) {
      const message =
        json && typeof json === "object" && "message" in json && typeof (json as { message: unknown }).message === "string"
          ? (json as { message: string }).message
          : "Không thể tải dữ liệu Content Dashboard.";
      throw new DashboardFetchError(message, "http", res.status);
    }

    let data: T;
    try {
      data = options?.validate ? options.validate(json) : (json as T);
    } catch (err) {
      throw new DashboardFetchError(
        err instanceof Error ? err.message : "Schema phản hồi không hợp lệ.",
        "parse",
        res.status,
      );
    }
    return { ok: true, data, durationMs: Date.now() - started };
  } catch (err) {
    const durationMs = Date.now() - started;
    if (err instanceof DashboardFetchError) {
      return { ok: false, error: err, durationMs };
    }
    if (options?.signal?.aborted) {
      return {
        ok: false,
        error: new DashboardFetchError("Đã hủy tải dữ liệu.", "abort"),
        durationMs,
      };
    }
    if (timeoutController.signal.aborted) {
      return {
        ok: false,
        error: new DashboardFetchError(
          "Hết thời gian chờ khi tải dữ liệu. Vui lòng thử lại.",
          "timeout",
        ),
        durationMs,
      };
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        ok: false,
        error: new DashboardFetchError("Đã hủy tải dữ liệu.", "abort"),
        durationMs,
      };
    }
    return {
      ok: false,
      error: new DashboardFetchError(
        err instanceof Error ? err.message : "Không thể kết nối máy chủ.",
        "network",
      ),
      durationMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

export type SectionLoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "error"; message: string; kind?: DashboardFetchFailureKind };

/** Apply a fetch result into a section state. Abort leaves previous non-loading state alone via caller. */
export function sectionFromFetchResult<T>(
  result: DashboardFetchResult<T>,
  isEmpty: (data: T) => boolean,
): SectionLoadState<T> {
  if (!result.ok) {
    if (result.error.kind === "abort") {
      return { status: "error", message: result.error.message, kind: "abort" };
    }
    return {
      status: "error",
      message: result.error.message,
      kind: result.error.kind,
    };
  }
  if (isEmpty(result.data)) return { status: "empty" };
  return { status: "ready", data: result.data };
}

export function isDashboardLoadingSettled(
  core: SectionLoadState<unknown>,
  reviews: SectionLoadState<unknown>,
  publishing: SectionLoadState<unknown>,
): boolean {
  return (
    core.status !== "loading" &&
    reviews.status !== "loading" &&
    publishing.status !== "loading"
  );
}
