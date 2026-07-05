import {
  getVisibleTestimonials,
  TESTIMONIALS_SECTION,
} from "@/lib/testimonials";

type Props = {
  className?: string;
};

export default function TestimonialSection({ className }: Props) {
  const testimonials = getVisibleTestimonials();
  if (testimonials.length === 0) return null;

  const classes = ["testimonial-section", "section-compact", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={TESTIMONIALS_SECTION.title}>
      <div className="container">
        <h2 className="section-title section-title--center">{TESTIMONIALS_SECTION.title}</h2>
        <p className="section-description section-description--center">
          {TESTIMONIALS_SECTION.description}
        </p>

        <div className="testimonial-section__grid">
          {testimonials.map((item) => (
            <figure key={item.id} className="testimonial-card">
              <blockquote className="testimonial-card__quote">“{item.quote}”</blockquote>
              <figcaption className="testimonial-card__meta">
                <span className="testimonial-card__author">{item.authorName}</span>
                {item.authorRole ? (
                  <span className="testimonial-card__role">{item.authorRole}</span>
                ) : null}
                {item.companyName ? (
                  <span className="testimonial-card__company">{item.companyName}</span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
