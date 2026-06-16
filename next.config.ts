import type { NextConfig } from "next";

const BLOB_HOSTNAME =
  process.env.BLOB_STORE_HOSTNAME ??
  "0iitstjrwqim8udr.public.blob.vercel-storage.com";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
