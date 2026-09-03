import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const audioOrigin = (() => {
  try {
    return process.env.PUBLIC_AUDIO_BASE_URL ? new URL(process.env.PUBLIC_AUDIO_BASE_URL).origin : null;
  } catch {
    return null;
  }
})();

/**
 * Content-Security-Policy. Next.js hydration relies on inline scripts and Tailwind/Radix on inline
 * styles, so those keep 'unsafe-inline'; everything else is locked to this origin plus the audio bucket.
 * Dev needs 'unsafe-eval' for React refresh, so the policy is only sent in production.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `media-src 'self' blob: https://storage.googleapis.com${audioOrigin ? ` ${audioOrigin}` : ""}`,
  `connect-src 'self' https://storage.googleapis.com${audioOrigin ? ` ${audioOrigin}` : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ]
    : []),
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
