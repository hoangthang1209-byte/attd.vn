import type { NextConfig } from "next";

const BLOB_HOSTNAME =
  process.env.BLOB_STORE_HOSTNAME ??
  "0iitstjrwqim8udr.public.blob.vercel-storage.com";

/** Chromium binary + PDFKit Unicode fonts must be present in serverless traces. */
const PDF_RUNTIME_TRACE_INCLUDES = [
  "./node_modules/@sparticuz/chromium/**/*",
  "./assets/fonts/quote-pdf/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdfkit",
    "puppeteer-core",
    "@sparticuz/chromium",
    "dejavu-fonts-ttf",
  ],
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/quotes/public/[token]/pdf": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/quotes/pdf-renderer-health": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/quotes/pdf-health": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/tech-packs/[id]/pdf": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/orders/[id]/documents/[docType]/pdf": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/orders/[id]/documents/production-sheet/pdf": PDF_RUNTIME_TRACE_INCLUDES,
    "/api/orders/[id]/documents/delivery-note/pdf": PDF_RUNTIME_TRACE_INCLUDES,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: BLOB_HOSTNAME,
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/quan-tri",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/quan-tri/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
      {
        source: "/dealer",
        destination: "/portal",
        permanent: false,
      },
      {
        source: "/dealer/login",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/dealer/rfq",
        destination: "/portal/rfq",
        permanent: false,
      },
      {
        source: "/dealer/rfq/:path*",
        destination: "/portal/rfq/:path*",
        permanent: false,
      },
      {
        source: "/dealer/quotes",
        destination: "/portal/quotes",
        permanent: false,
      },
      {
        source: "/dealer/resources",
        destination: "/portal/resources",
        permanent: false,
      },
      {
        source: "/dealer/:path*",
        destination: "/portal/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
