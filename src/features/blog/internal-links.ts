type InternalLinkRule = {
  keywords: string[];
  href: string;
};

const INTERNAL_LINK_RULES: InternalLinkRule[] = [
  {
    keywords: ["nguồn hàng áo thun trơn", "nguon hang ao thun tron"],
    href: "/nguon-hang-ao-thun-tron",
  },
  {
    keywords: ["áo thun trơn sỉ", "ao thun tron si"],
    href: "/ao-thun-tron-si",
  },
  {
    keywords: ["kho áo thun trơn", "kho ao thun tron"],
    href: "/kho-ao-thun-tron",
  },
  {
    keywords: ["OEM", "oem"],
    href: "/oem",
  },
  {
    keywords: ["đại lý", "dai ly"],
    href: "/dai-ly",
  },
  {
    keywords: ["quà tặng doanh nghiệp", "qua tang doanh nghiep"],
    href: "/qua-tang-doanh-nghiep",
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function protectBlocks(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  const protectedHtml = html.replace(
    /<(h[1-6]|a|pre|code|script|style)[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const token = `___PROTECTED_${blocks.length}___`;
      blocks.push(match);
      return token;
    }
  );
  return { html: protectedHtml, blocks };
}

function restoreBlocks(html: string, blocks: string[]): string {
  return blocks.reduce(
    (result, block, index) => result.replace(`___PROTECTED_${index}___`, block),
    html
  );
}

export function applyInternalLinks(
  html: string,
  maxLinks = 5
): { html: string; count: number } {
  if (!html.trim()) return { html, count: 0 };

  const { html: protectedHtml, blocks } = protectBlocks(html);
  let working = protectedHtml;
  let linkCount = 0;

  for (const rule of INTERNAL_LINK_RULES) {
    if (linkCount >= maxLinks) break;

    for (const keyword of rule.keywords) {
      if (linkCount >= maxLinks) break;

      const pattern = new RegExp(`(?![^<]*>)\\b(${escapeRegex(keyword)})\\b`, "i");
      const replaced = working.replace(pattern, (match) => {
        if (linkCount >= maxLinks) return match;
        linkCount += 1;
        return `<a href="${rule.href}" class="blog-internal-link">${match}</a>`;
      });

      if (replaced !== working) {
        working = replaced;
        break;
      }
    }
  }

  return {
    html: restoreBlocks(working, blocks),
    count: linkCount,
  };
}

export function countPotentialInternalLinks(html: string): number {
  return applyInternalLinks(html, 5).count;
}
