"use client";

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function AdminErrorRecovery({ message, onRetry }: Props) {
  return (
    <div className="admin-empty-state admin-empty-state--error">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="admin-btn" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
