import { COMPANY_TIMELINE } from "@/lib/company-trust";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export default function CompanyTimeline({
  title = "Hành trình phát triển",
  description = "Từ nền tảng kinh doanh thực tế đến nền tảng B2B cho đại lý và doanh nghiệp.",
  className,
}: Props) {
  if (COMPANY_TIMELINE.length === 0) return null;

  const classes = ["company-timeline", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        <div className="company-timeline__header">
          <h2 className="company-timeline__title">{title}</h2>
          {description ? <p className="company-timeline__description">{description}</p> : null}
        </div>

        <ol className="company-timeline__list">
          {COMPANY_TIMELINE.map((item, index) => (
            <li key={item.id} className="company-timeline__item">
              <span className="company-timeline__marker" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="company-timeline__content">
                {item.year ? (
                  <span className="company-timeline__year">{item.year}</span>
                ) : null}
                <h3 className="company-timeline__item-title">{item.title}</h3>
                <p className="company-timeline__item-desc">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
