import { CONTENT_LAUNCH_QA_CHECKS } from "@/features/content/launch/content-launch.constants";

/**
 * Launch QA preset — mirrors existing deterministic QA surface.
 * Does not lower thresholds; documents required checks for the first article.
 */
export function getContentLaunchQaPreset() {
  return {
    id: "content-launch-v1",
    label: "Content Launch QA",
    description:
      "Preset dựa trên deterministic Writing QA hiện tại. Không hạ ngưỡng để launch.",
    checks: [...CONTENT_LAUNCH_QA_CHECKS],
    notes: [
      "Chạy QA qua Writing Draft workspace / existing QA API.",
      "Human Review vẫn bắt buộc sau QA.",
      "Không auto-approve sections.",
    ],
  };
}
