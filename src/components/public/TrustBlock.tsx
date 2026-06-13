import { TRUST_BLOCK } from "@/lib/siteContent";

type TrustBlockProps = {
  variant?: "block" | "strip";
  title?: string;
  items?: readonly string[];
};

export default function TrustBlock({
  variant = "block",
  title = TRUST_BLOCK.title,
  items = TRUST_BLOCK.items,
}: TrustBlockProps) {
  return (
    <div className={`trust-block trust-block--${variant}`}>
      <p className="trust-block-title">{title}</p>
      <ul className="trust-block-list">
        {items.map((item) => (
          <li key={item} className="trust-block-item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
