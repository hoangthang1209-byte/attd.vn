const UNSAFE_PROTOCOL = /^(javascript|data|vbscript):/i;

export function validateHeroCtaUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return "Vui lòng nhập liên kết.";
  }
  if (UNSAFE_PROTOCOL.test(trimmed)) {
    return "Liên kết không hợp lệ.";
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return null;
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return null;
  }
  return "Liên kết phải bắt đầu bằng /, # hoặc http(s)://";
}

export type HomepageHeroInput = {
  eyebrow: string;
  heading: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
};

export function validateHomepageHeroInput(input: HomepageHeroInput): string | null {
  if (!input.heading.trim()) {
    return "Vui lòng nhập tiêu đề chính.";
  }
  if (input.heading.length > 200) {
    return "Tiêu đề chính không được vượt quá 200 ký tự.";
  }
  if (input.eyebrow.length > 120) {
    return "Nhãn giới thiệu không được vượt quá 120 ký tự.";
  }
  if (input.description.length > 600) {
    return "Mô tả không được vượt quá 600 ký tự.";
  }
  if (input.primaryCtaLabel.length > 80 || input.secondaryCtaLabel.length > 80) {
    return "Nhãn nút không được vượt quá 80 ký tự.";
  }
  if (!input.primaryCtaLabel.trim() || !input.secondaryCtaLabel.trim()) {
    return "Vui lòng nhập nhãn cho cả hai nút.";
  }

  const primaryUrlError = validateHeroCtaUrl(input.primaryCtaUrl);
  if (primaryUrlError) return `Liên kết nút chính: ${primaryUrlError}`;

  const secondaryUrlError = validateHeroCtaUrl(input.secondaryCtaUrl);
  if (secondaryUrlError) return `Liên kết nút phụ: ${secondaryUrlError}`;

  return null;
}
