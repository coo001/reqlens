import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Recorded responses and sample texts are read from disk at request time,
  // so they have to be traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/api/**": ["./runs/**", "./samples/**"],
  },
};

export default nextConfig;
