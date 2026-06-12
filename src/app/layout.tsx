import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATTD - Kho sỉ đồng phục và quà tặng doanh nghiệp",
  description:
    "Nguồn hàng B2B cho đại lý, xưởng in và doanh nghiệp trên toàn quốc. Hàng có sẵn, nhiều màu, nhiều size, giá sỉ tận kho.",
};

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
        {children}
      </body>
    </html>
  );
}
