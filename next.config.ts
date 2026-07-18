import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/downtown/party-chronicle",
        destination: "/neverworld",
        permanent: false,
      },
      {
        source: "/downtown/neverworld",
        destination: "/neverworld",
        permanent: false,
      },
      {
        source: "/downtown/dungeon-tester",
        destination: "/true-grit",
        permanent: false,
      },
      {
        source: "/downtown/code-school",
        destination: "/downtown",
        permanent: false,
      },
      {
        source: "/downtown/sims-real-life",
        destination: "/downtown",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
