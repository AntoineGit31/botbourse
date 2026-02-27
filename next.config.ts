import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./public/data/**/*', './public/data/prices/*', './public/data/features/*'],
  },
};

export default nextConfig;
