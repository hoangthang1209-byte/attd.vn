type Props = {
  value: string;
  label: string;
  className?: string;
};

export default function TrustStatisticCard({ value, label, className }: Props) {
  if (!value?.trim() || !label?.trim()) return null;

  const classes = ["social-proof-card", "trust-statistic-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="social-proof-value trust-statistic-card__value">{value}</div>
      <div className="social-proof-label trust-statistic-card__label">{label}</div>
    </div>
  );
}
