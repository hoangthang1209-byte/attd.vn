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
    ],
  },
};

export default nextConfig;
