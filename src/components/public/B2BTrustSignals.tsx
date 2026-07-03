type B2BTrustSignalsProps = {
  items: readonly string[];
  variant?: "inline" | "stack";
  ariaLabel?: string;
  className?: string;
};

export default function B2BTrustSignals({
  items,
  variant = "inline",
  ariaLabel = "Thông tin tạo niềm tin",
  className,
}: B2BTrustSignalsProps) {
  if (items.length === 0) return null;

  const classes = [
    "b2b-trust-signals",
    `b2b-trust-signals--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ul className={classes} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item} className="b2b-trust-signals__item">
          {item}
        </li>
      ))}
    </ul>
  );
}
