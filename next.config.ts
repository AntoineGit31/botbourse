import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude heavy data directories from ALL serverless functions by default
  outputFileTracingExcludes: {
    '/*': ['./public/data/prices/**', './public/data/features/**'],
  },
  // Re-include them ONLY in the dedicated API routes
  outputFileTracingIncludes: {
    '/api/prices/[ticker]': ['./public/data/prices/*'],
    '/api/features/[ticker]': ['./public/data/features/*'],
  },
};

export default nextConfig;
