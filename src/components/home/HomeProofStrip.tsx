import type { HomepageProofItemConfig } from "@/features/home/homepage.types";
import { HOMEPAGE_PROOF_ICONS } from "@/features/home/homepage-proof-icons";

type Props = {
  items: HomepageProofItemConfig[];
};

export default function HomeProofStrip({ items }: Props) {
  const visible = items.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  if (visible.length === 0) return null;

  return (
    <section className="home-proof-strip" aria-label="Điểm mạnh nguồn hàng B2B">
      <div className="container">
        <ul className="home-proof-strip__list">
          {visible.map((item) => {
            const Icon = HOMEPAGE_PROOF_ICONS[item.iconKey];
            return (
              <li key={item.itemKey} className="home-proof-strip__item">
                <Icon size={16} className="home-proof-strip__icon" aria-hidden />
                <span className="home-proof-strip__text">
                  <span className="home-proof-strip__label">{item.title}</span>
                  {item.supportingText ? (
                    <span className="home-proof-strip__support">{item.supportingText}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
