import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/generate-card": ["assets/fonts/**/*.ttf"],
  },
};

export default nextConfig;
