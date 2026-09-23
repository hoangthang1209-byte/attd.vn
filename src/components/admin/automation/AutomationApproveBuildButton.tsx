"use client";

import { useCallback, useState } from "react";
import { evaluateApproveBuildEligibility } from "@/features/automation/automation-approve-build.eligibility";
import type { ApproveBuildResponse } from "@/features/automation/automation-approve-build.service";
import type { AutomationTask } from "@/features/automation/automation-task.types";

type AutomationApproveBuildButtonProps = {
  task: AutomationTask | null;
  writeActionConfigured: boolean;
  writeActionConfigMessage: string | null;
  onApproved: () => void;
};

type ButtonState = "idle" | "pending" | "success" | "error";

export default function AutomationApproveBuildButton({
  task,
  writeActionConfigured,
  writeActionConfigMessage,
  onApproved,
}: AutomationApproveBuildButtonProps) {
  const [buttonState, setButtonState] = useState<ButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eligibility = evaluateApproveBuildEligibility(task);

  const handleClick = useCallback(async () => {
    if (!task || !eligibility.eligible || !writeActionConfigured || buttonState === "pending") {
      return;
    }

    setButtonState("pending");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/automation/issues/${task.issueNumber}/approve-build`,
        { method: "POST" },
      );
      const body = (await response.json()) as ApproveBuildResponse;

      if (body.result === "approved_now" || body.result === "already_approved") {
        setButtonState("success");
        onApproved();
        return;
      }

      setButtonState("error");
      setErrorMessage(body.message);
    } catch {
      setButtonState("error");
      setErrorMessage("Không thể gửi duyệt. Thử lại sau.");
    }
  }, [buttonState, eligibility.eligible, onApproved, task, writeActionConfigured]);

  if (!task) return <>—</>;

  if (!eligibility.eligible) {
    return <>—</>;
  }

  if (!writeActionConfigured) {
    return (
      <span className="automation-lane-board__approve-hint" title={writeActionConfigMessage ?? undefined}>
        <button type="button" className="admin-btn admin-btn--primary" disabled>
          Duyệt &amp; chạy
        </button>
        <span className="admin-muted automation-lane-board__approve-setup">
          {writeActionConfigMessage ?? "Cần GITHUB_AUTOMATION_WRITE_TOKEN"}
        </span>
      </span>
    );
  }

  const label =
    buttonState === "pending"
      ? "Đang duyệt…"
      : buttonState === "success"
        ? "Đã duyệt · chờ Builder"
        : "Duyệt & chạy";

  return (
    <span className="automation-lane-board__approve-action">
      <button
        type="button"
        className="admin-btn admin-btn--primary automation-lane-board__approve-btn"
        onClick={() => void handleClick()}
        disabled={buttonState === "pending" || buttonState === "success"}
      >
        {label}
      </button>
      {buttonState === "error" && errorMessage ? (
        <span className="admin-error automation-lane-board__approve-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}
