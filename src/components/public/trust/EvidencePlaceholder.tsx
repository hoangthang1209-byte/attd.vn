type Props = {
  label?: string;
  className?: string;
};

export default function EvidencePlaceholder({
  label = "Ảnh thực tế sẽ được cập nhật",
  className,
}: Props) {
  return (
    <div className={["trust-evidence-placeholder", className].filter(Boolean).join(" ")} aria-hidden>
      <span className="trust-evidence-placeholder__label">{label}</span>
    </div>
  );
}
