import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",  // allow up to 5MB image uploads
    },
  },
};

export default nextConfig;
