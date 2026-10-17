import type { NextConfig } from "next";

// Every screen depends on the request (language cookie, staff/admin session,
// live database rows), so this app uses plain per-request rendering instead of
// Cache Components.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // The yatri form can carry an ID photo, shrunk on the phone to under 0.9 MB (1.2 MB as text).
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Native canvas used to draw the token photo sent on WhatsApp (see src/lib/token-photo.ts).
  serverExternalPackages: ["@napi-rs/canvas"],
  // The photo's font files are read from disk at runtime, so ship them with every server route.
  outputFileTracingIncludes: {
    "/**": ["./assets/fonts/*.ttf"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
