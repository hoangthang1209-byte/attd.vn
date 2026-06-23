/** Human-readable applicability label for production pack file rows. */
export function formatProductionFileScopeLabel(file: {
  orderId: string | null;
  orderItemId: string | null;
  appliesToColorName: string | null;
  appliesToSize: string | null;
}): string {
  if (!file.orderItemId) {
    if (!file.appliesToColorName && !file.appliesToSize) {
      return "Toàn đơn hàng";
    }
    const parts: string[] = [];
    if (file.appliesToColorName) parts.push(`Màu ${file.appliesToColorName}`);
    if (file.appliesToSize) parts.push(`Size ${file.appliesToSize}`);
    return parts.join(" · ");
  }

  if (!file.appliesToColorName && !file.appliesToSize) {
    return "Tất cả màu / size";
  }

  const parts: string[] = [];
  if (file.appliesToColorName) parts.push(`Màu ${file.appliesToColorName}`);
  if (file.appliesToSize) parts.push(`Size ${file.appliesToSize}`);
  return parts.join(" · ");
}

export function formatFileExtension(
  format: string | null | undefined,
  filename: string,
): string {
  if (format?.trim()) {
    const normalized = format.trim();
    return normalized.startsWith(".")
      ? normalized.slice(1).toUpperCase()
      : normalized.toUpperCase();
  }
  const dot = filename.lastIndexOf(".");
  if (dot >= 0 && dot < filename.length - 1) {
    return filename.slice(dot + 1).toUpperCase();
  }
  return "FILE";
}

export function formatProductionFileUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
