import { WHY_CHOOSE_ATTD } from "@/lib/company-trust";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export default function WhyChooseAttd({
  title = "Vì sao chọn ATTD?",
  description = "Những lý do đối tác B2B thường cân nhắc khi tìm nguồn hàng và đối tác sản xuất đáng tin cậy.",
  className,
}: Props) {
  if (WHY_CHOOSE_ATTD.length === 0) return null;

  const classes = ["why-choose-attd", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        <div className="why-choose-attd__header">
          <h2 className="why-choose-attd__title">{title}</h2>
          {description ? <p className="why-choose-attd__description">{description}</p> : null}
        </div>

        <div className="why-choose-attd__grid">
          {WHY_CHOOSE_ATTD.map((item) => (
            <article key={item.id} className="why-choose-attd__card">
              <h3 className="why-choose-attd__card-title">{item.title}</h3>
              <p className="why-choose-attd__card-desc">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
