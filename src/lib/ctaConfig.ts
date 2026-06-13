/** Standardized CTA labels and destinations — UI only. */

export const CTA = {
  primary: {
    label: "Đăng ký đại lý",
    href: "/dai-ly",
    event: "dealer_registration_click" as const,
  },
  secondary: {
    label: "Liên hệ báo giá",
    href: "/lien-he",
    event: "contact_quote" as const,
  },
  tertiary: {
    label: "Xem nguồn hàng",
    href: "/nguon-hang",
  },
} as const;
