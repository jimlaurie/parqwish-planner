import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json") as { version: string };

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    // New SW takes over immediately without waiting for all tabs to close,
    // so users get updated bundles on the next page navigation after a deploy.
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // StaleWhileRevalidate: serve cached JS instantly, refresh in background.
        urlPattern: /\/_next\/static.+\.js$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-static-js-assets",
          expiration: { maxEntries: 64, maxAgeSeconds: 86400 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // WebLLM uses WebAssembly for tokenization
      config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    }
    return config;
  },
  env: {
    // Baked into the static build at compile time — bump package.json version
    // and this propagates to the version-check script and UpdateBanner.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    // Captured at build time so the footer can show exactly which deploy is
    // live — package.json version alone doesn't change on every deploy.
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default withPWA(nextConfig);
