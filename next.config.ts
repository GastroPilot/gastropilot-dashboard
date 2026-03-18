import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.gpilot.app',
      },
      {
        protocol: 'https',
        hostname: '*.gastropilot.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
  ],
};

export default withPWA(withNextIntl(nextConfig));
