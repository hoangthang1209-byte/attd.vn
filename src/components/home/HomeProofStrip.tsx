import { Package, Settings, Users, Truck } from "lucide-react";

const PROOF_ITEMS = [
  { key: "stock", label: "Hàng sẵn kho", Icon: Package },
  { key: "oem", label: "OEM theo yêu cầu", Icon: Settings },
  { key: "dealer", label: "Dành cho đại lý", Icon: Users },
  { key: "delivery", label: "Giao hàng toàn quốc", Icon: Truck },
] as const;

export default function HomeProofStrip() {
  return (
    <section className="home-proof-strip" aria-label="Điểm mạnh nguồn hàng B2B">
      <div className="container">
        <ul className="home-proof-strip__list">
          {PROOF_ITEMS.map(({ key, label, Icon }) => (
            <li key={key} className="home-proof-strip__item">
              <Icon size={18} className="home-proof-strip__icon" aria-hidden />
              <span className="home-proof-strip__label">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
