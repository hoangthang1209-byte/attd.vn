/**
 * Customer testimonials — add only verified quotes with owner approval.
 * Public UI renders nothing until visible entries exist.
 */

export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  authorRole?: string;
  companyName?: string;
  isVisible: boolean;
};

export const TESTIMONIALS_SECTION = {
  title: "Khách hàng nói gì về ATTD",
  description: "Phản hồi thực tế từ đối tác và khách hàng doanh nghiệp.",
} as const;

/** Add verified testimonials here or via future CMS integration. */
export const TESTIMONIALS: Testimonial[] = [];

export function getVisibleTestimonials(): Testimonial[] {
  return TESTIMONIALS.filter(
    (item) =>
      item.isVisible &&
      Boolean(item.quote?.trim()) &&
      Boolean(item.authorName?.trim()),
  );
}

export function hasVisibleTestimonials(): boolean {
  return getVisibleTestimonials().length > 0;
}
