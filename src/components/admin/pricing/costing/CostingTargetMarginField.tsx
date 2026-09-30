"use client";

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export default function CostingTargetMarginField({ value, disabled, onChange }: Props) {
  return (
    <div className="admin-field">
      <label className="admin-label">Biên lợi nhuận mục tiêu (%)</label>
      <input
        className="admin-input"
        type="number"
        min="0"
        max="99"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="admin-field-hint">
        Biên lợi nhuận gộp trên doanh thu (gross margin), không phải markup trên giá vốn.
      </p>
    </div>
  );
}
