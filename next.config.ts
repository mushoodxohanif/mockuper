import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: [
    "sharp",
    "@google/genai",
    "@neondatabase/serverless",
    "@prisma/client",
    "@prisma/adapter-neon",
  ],
};

export default nextConfig;
