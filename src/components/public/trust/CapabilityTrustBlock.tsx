type Props = {
  title?: string;
  items: readonly string[];
  className?: string;
};

export default function CapabilityTrustBlock({
  title = "ATTD có thể hỗ trợ",
  items,
  className,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className={["trust-capability", className].filter(Boolean).join(" ")}>
      <p className="trust-capability__title">{title}</p>
      <ul className="trust-capability__list">
        {items.map((item) => (
          <li key={item} className="trust-capability__item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
