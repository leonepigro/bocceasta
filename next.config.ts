import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx'],
  turbopack: {},
};

export default nextConfig;
