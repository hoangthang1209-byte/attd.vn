import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/quotes/public/"],
      disallow: ["/admin/", "/quan-tri/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
