import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async redirects() {
    return [
      // Redirect root of custom domain to clinic public page
      {
        source: "/",
        destination: "/clinic/maali-neurology",
        permanent: false,
        has: [{ type: "host", value: "www.maalineurology.com" }],
      },
      {
        source: "/",
        destination: "/clinic/maali-neurology",
        permanent: false,
        has: [{ type: "host", value: "maalineurology.com" }],
      },
    ];
  },
};

export default nextConfig;
