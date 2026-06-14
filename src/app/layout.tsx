import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { buildFaviconMetadata } from "@/lib/branding/favicon-metadata";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import AttributionTracker from "@/components/analytics/AttributionTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_TITLE = "ATTD - Kho sỉ đồng phục và quà tặng doanh nghiệp";
const DEFAULT_DESCRIPTION =
  "Nguồn hàng B2B cho đại lý, xưởng in và doanh nghiệp trên toàn quốc. Hàng có sẵn, nhiều màu, nhiều size, giá sỉ tận kho.";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const ogImage =
    branding.defaultOgImageUrl ?? process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE ?? undefined;
  const faviconMeta = buildFaviconMetadata(branding);

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    ...(ogImage
      ? {
          openGraph: {
            images: [{ url: ogImage }],
          },
        }
      : {}),
    ...faviconMeta,
  };
}

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  telephone: "+84934337667",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+84934337667",
    contactType: "customer service",
    areaServed: "VN",
    availableLanguage: "Vietnamese",
  },
  sameAs: ["https://zalo.me/0934337667"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <GoogleAnalytics />
        <AttributionTracker />
        {children}
      </body>
    </html>
  );
}
