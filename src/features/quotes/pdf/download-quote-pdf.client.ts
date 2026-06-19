"use client";

/** Fetch a quote PDF from an API route and trigger browser download. */
export async function downloadQuotePdfFromApi(
  apiUrl: string,
  filename: string,
): Promise<void> {
  const res = await fetch(apiUrl, { cache: "no-store" });

  if (!res.ok) {
    let detail = "";
    try {
      const data = (await res.json()) as { message?: string; error?: string; detail?: string };
      detail = data.detail ?? data.message ?? data.error ?? "";
    } catch {
      // Response may not be JSON.
    }

    console.error("[downloadQuotePdfFromApi] PDF request failed", {
      apiUrl,
      status: res.status,
      statusText: res.statusText,
      detail,
    });

    if (res.status === 404) {
      throw new Error(detail || "Không tìm thấy báo giá.");
    }
    throw new Error(detail || "Không thể tạo PDF báo giá. Vui lòng thử lại.");
  }

  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/pdf")) {
    console.error("[downloadQuotePdfFromApi] Invalid content type", {
      apiUrl,
      contentType,
    });
    throw new Error("Phản hồi không phải file PDF hợp lệ.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function quotePdfDownloadFilename(quoteNo: string): string {
  const safe = quoteNo.replace(/[^a-zA-Z0-9-]/g, "");
  return `bao-gia-${safe || "attd"}.pdf`;
}
