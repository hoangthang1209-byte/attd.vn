import {
  buildProductSetupChecklist,
  type ProductSetupChecklistInput,
  type SetupChecklistStatus,
} from "@/features/products/product-setup-checklist";

const STATUS_META: Record<SetupChecklistStatus, { icon: string; label: string; className: string }> = {
  done: { icon: "✓", label: "Đã xong", className: "admin-setup-checklist-item--done" },
  todo: { icon: "○", label: "Cần bổ sung", className: "admin-setup-checklist-item--todo" },
  optional: { icon: "•", label: "Không bắt buộc", className: "admin-setup-checklist-item--optional" },
};

type Props = {
  input: ProductSetupChecklistInput;
  title?: string;
};

export default function ProductSetupChecklist({
  input,
  title = "Checklist thiết lập sản phẩm",
}: Props) {
  const groups = buildProductSetupChecklist(input);

  return (
    <section className="admin-setup-checklist" aria-label={title}>
      <p className="admin-subtitle" style={{ marginBottom: 8 }}>
        {title}
      </p>
      <div className="admin-setup-checklist-groups">
        {groups.map((group) => (
          <div key={group.key} className="admin-setup-checklist-group">
            <p className="admin-setup-checklist-group__title">{group.title}</p>
            <ul className="admin-setup-checklist-group__items">
              {group.items.map((item) => {
                const meta = STATUS_META[item.status];
                return (
                  <li key={item.key} className={meta.className}>
                    <span aria-hidden="true">{meta.icon}</span>
                    <span className="admin-setup-checklist-item__label">{item.label}</span>
                    <span className="admin-setup-checklist-item__status">{meta.label}</span>
                    {item.hint && (
                      <span className="admin-field-hint admin-field-hint--warning">{item.hint}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
