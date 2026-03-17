import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

const packageVersion = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8")
).version as string;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION ?? packageVersion,
  },
  // Docker Support: Standalone output für optimierte Builds
  output: 'standalone',

  // Erlaube Cross-Origin-Anfragen von der IP-Adresse für /_next/* Ressourcen
  // Die Warnung zeigt nur die IP ohne Port, daher verschiedene Formate testen
  allowedDevOrigins: [
    '192.168.178.24',  // IP ohne Port (wie in der Warnung angezeigt)
    '192.168.178.24:3001',
    'http://192.168.178.24:3001',
    'http://192.168.178.24',
    'localhost:3001',
    '127.0.0.1:3001',
  ],
  crossOrigin: 'anonymous',
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS, HEAD',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Accept, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
