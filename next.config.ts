import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Story files are read from disk at runtime; make sure they ship in the standalone bundle.
  outputFileTracingIncludes: { "/*": ["content/**/*"] },
  // Keep native/gRPC and worker-thread based packages out of the server bundle.
  serverExternalPackages: ["pino", "pino-pretty", "@google-cloud/text-to-speech", "@google-cloud/storage"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
