import type { CmsHealthReport } from "@/features/admin/services/cms-health.service";

/** Plain Vietnamese status for team-facing admin surfaces. */
export function getCmsBusinessStatusLabel(health: Pick<CmsHealthReport, "ready" | "databaseConnected">): string {
  if (health.ready) return "Sẵn sàng";
  if (!health.databaseConnected) return "Lỗi kết nối";
  return "Cần kiểm tra";
}

/** Short hint when CMS is not ready — no migration commands or table names. */
export function getCmsBusinessStatusHint(health: Pick<CmsHealthReport, "ready" | "databaseConnected" | "blobConfigured">): string | null {
  if (health.ready) return null;
  if (!health.databaseConnected) {
    return "Không kết nối được cơ sở dữ liệu. Liên hệ kỹ thuật nếu vấn đề kéo dài.";
  }
  if (!health.blobConfigured) {
    return "Lưu trữ ảnh chưa sẵn sàng. Một số tính năng tải ảnh có thể bị giới hạn.";
  }
  return "Hệ thống CMS cần được kiểm tra. Liên hệ kỹ thuật nếu bạn không thể sử dụng bình thường.";
}
